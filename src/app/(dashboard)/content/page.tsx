'use client'

import { useEffect, useState, useMemo } from 'react'
import { useContent } from '@/hooks/useContent'
import { ContentCalendar, CalendarViewMode } from '@/components/content/ContentCalendar'
import { ContentSidebar } from '@/components/content/ContentSidebar'
import { PostModal } from '@/components/content/PostModal'
import { ContentItem } from '@/types'
import {
  CalendarDays,
  CalendarRange,
  Plus,
  Sparkles,
  Loader2,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { startOfWeek, format, isSameMonth } from 'date-fns'

type SidebarTab = 'scheduled' | 'drafts' | 'ideas'

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-white/8">
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}22` }}
      >
        <Icon size={16} style={{ color }} />
      </span>
      <div>
        <p className="text-[11px] text-white/40">{label}</p>
        <p className="text-lg font-bold text-white leading-tight">{value}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const { items, loading, fetch: fetchItems, create, update, remove } = useContent()

  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('scheduled')
  const [draggedItem, setDraggedItem] = useState<ContentItem | null>(null)
  const [planningWeek, setPlanningWeek] = useState(false)

  const [modal, setModal] = useState<{
    open: boolean
    date?: Date
    item?: ContentItem | null
  }>({ open: false })

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // ─── Month metrics ──────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const monthItems = items.filter(
      (i) => i.scheduled_date && isSameMonth(new Date(i.scheduled_date), currentDate),
    )
    const scheduled = monthItems.filter(
      (i) => i.status === 'scheduled' || i.status === 'ready',
    ).length
    const published = monthItems.filter((i) => i.status === 'published').length
    const withReach = monthItems.filter((i) => (i.reach ?? 0) > 0)
    const engRate =
      withReach.length > 0
        ? (
            (withReach.reduce(
              (s, i) => s + (i.likes ?? 0) + (i.comments ?? 0) + (i.shares ?? 0),
              0,
            ) /
              withReach.reduce((s, i) => s + (i.reach ?? 1), 0)) *
            100
          ).toFixed(1)
        : '—'
    return { scheduled, published, engRate }
  }, [items, currentDate])

  // ─── Plan week ──────────────────────────────────────────────────────────────

  const handlePlanWeek = async () => {
    setPlanningWeek(true)
    try {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const res = await fetch('/api/ai/plan-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: format(weekStart, 'yyyy-MM-dd') }),
      })
      const { posts, error } = await res.json()
      if (error) throw new Error(error as string)
      if (!posts?.length) throw new Error('No posts returned')

      let created = 0
      for (const post of posts as Partial<ContentItem>[]) {
        const result = await create({
          channel: post.channel,
          content_type: post.content_type ?? 'single_post',
          scheduled_date: post.scheduled_date,
          scheduled_time: post.scheduled_time,
          title: post.title ?? 'Post bez tytułu',
          content_body: post.content_body,
          hook: post.hook,
          cta: post.cta,
          hashtags: post.hashtags ?? [],
          status: post.status ?? 'ready',
        })
        if (result) created++
      }
      toast.success(`Zaplanowano ${created} postów na ten tydzień`)
    } catch (err) {
      console.error(err)
      toast.error('Błąd planowania tygodnia')
    } finally {
      setPlanningWeek(false)
    }
  }

  // ─── Modal helpers ──────────────────────────────────────────────────────────

  const openAddModal = (date: Date) => setModal({ open: true, date, item: null })
  const openEditModal = (item: ContentItem) => setModal({ open: true, item })

  const handleSave = async (data: Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>) => {
    if (modal.item) {
      await update(modal.item.id, data)
    } else {
      await create(data)
    }
  }

  // ─── Drag & drop ────────────────────────────────────────────────────────────

  const handleDrop = async (date: Date) => {
    if (!draggedItem) return
    await update(draggedItem.id, {
      scheduled_date: format(date, 'yyyy-MM-dd'),
      status:
        draggedItem.status === 'idea' || draggedItem.status === 'draft'
          ? 'ready'
          : draggedItem.status,
    })
    setDraggedItem(null)
    toast.success('Post przesunięty na ' + format(date, 'd MMM'))
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Kalendarz contentu</h1>
          <p className="text-sm text-white/40 mt-0.5">{items.length} postów łącznie</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-white/10 p-0.5 gap-0.5">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-primary/20 text-primary'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <CalendarDays size={13} />
              Miesiąc
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-primary/20 text-primary'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <CalendarRange size={13} />
              Tydzień
            </button>
          </div>

          <button
            onClick={handlePlanWeek}
            disabled={planningWeek}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {planningWeek ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Zaplanuj tydzień z AI
          </button>

          <button
            onClick={() => openAddModal(new Date())}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            Nowy post
          </button>
        </div>
      </div>

      {/* ── Metrics ── */}
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        <MetricCard
          icon={CalendarDays}
          label="Zaplanowane (miesiąc)"
          value={metrics.scheduled}
          color="#6C5CE7"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Opublikowane (miesiąc)"
          value={metrics.published}
          color="#00B894"
        />
        <MetricCard
          icon={TrendingUp}
          label="Engagement rate"
          value={metrics.engRate === '—' ? '—' : `${metrics.engRate}%`}
          color="#FDCB6E"
        />
      </div>

      {/* ── Main layout ── */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Calendar */}
        <div className="flex-1 min-w-0 bg-card border border-white/8 rounded-2xl p-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ContentCalendar
              items={items}
              viewMode={viewMode}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onDayClick={openAddModal}
              onItemClick={openEditModal}
              onDrop={handleDrop}
              draggedItem={draggedItem}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="w-[300px] flex-shrink-0 bg-card border border-white/8 rounded-2xl p-4 overflow-y-auto">
          <ContentSidebar
            items={items}
            activeTab={sidebarTab}
            onTabChange={(t) => setSidebarTab(t as SidebarTab)}
            onItemClick={openEditModal}
            onDragStart={setDraggedItem}
            onDragEnd={() => setDraggedItem(null)}
          />
        </div>
      </div>

      {/* ── Modal ── */}
      <PostModal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        initialDate={modal.date}
        item={modal.item}
        onSave={handleSave}
        onDelete={remove}
      />
    </div>
  )
}
