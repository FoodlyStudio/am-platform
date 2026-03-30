'use client'

import { ContentItem } from '@/types'
import { format, isAfter, isBefore, addDays, startOfDay, endOfDay } from 'date-fns'
import { pl } from 'date-fns/locale'
import { GripVertical, Mail, Clock } from 'lucide-react'

type SidebarTab = 'scheduled' | 'drafts' | 'ideas'

interface ContentSidebarProps {
  items: ContentItem[]
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  onItemClick: (item: ContentItem) => void
  onDragStart: (item: ContentItem) => void
  onDragEnd: () => void
}

// ─── Channel icon ──────────────────────────────────────────────────────────

const CHANNEL_COLOR: Record<string, string> = {
  instagram: '#cc2366',
  linkedin_company: '#0077B5',
  linkedin_personal: '#0077B5',
  facebook: '#1877F2',
  newsletter: '#636E72',
}

const CHANNEL_ABBR: Record<string, string> = {
  instagram: 'IG',
  linkedin_company: 'LI',
  linkedin_personal: 'LI',
  facebook: 'FB',
  newsletter: 'NL',
}

function ChannelIcon({ channel }: { channel?: string }) {
  if (channel === 'newsletter') return <Mail size={13} style={{ color: '#636E72' }} />
  const color = CHANNEL_COLOR[channel ?? ''] ?? '#636E72'
  const abbr = CHANNEL_ABBR[channel ?? ''] ?? '??'
  return (
    <span
      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm text-[8px] font-bold"
      style={{ background: `${color}30`, color }}
    >
      {abbr}
    </span>
  )
}

const STATUS_COLOR: Record<string, string> = {
  idea: 'text-white/40 bg-white/10',
  draft: 'text-blue-300 bg-blue-500/15',
  ready: 'text-yellow-300 bg-yellow-500/15',
  scheduled: 'text-purple-300 bg-primary/20',
  published: 'text-green-300 bg-secondary/15',
  archived: 'text-white/30 bg-white/5',
}

const STATUS_LABEL: Record<string, string> = {
  idea: 'Pomysł',
  draft: 'Draft',
  ready: 'Gotowy',
  scheduled: 'Zaplanowany',
  published: 'Opublikowany',
  archived: 'Archiwum',
}

// ─── Sidebar item card ─────────────────────────────────────────────────────

function SidebarItem({
  item,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  item: ContentItem
  onClick: () => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="group flex items-start gap-2 p-2.5 rounded-lg bg-card border border-white/8 hover:border-white/20 cursor-pointer transition-all hover:bg-white/[0.03]"
    >
      <GripVertical
        size={13}
        className="text-white/20 group-hover:text-white/40 mt-0.5 flex-shrink-0 cursor-grab"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <ChannelIcon channel={item.channel} />
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
              STATUS_COLOR[item.status] ?? 'text-white/40 bg-white/10'
            }`}
          >
            {STATUS_LABEL[item.status] ?? item.status}
          </span>
        </div>
        <p className="text-xs text-white/80 font-medium truncate">{item.title}</p>
        {item.scheduled_date && (
          <div className="flex items-center gap-1 mt-1">
            <Clock size={10} className="text-white/30" />
            <span className="text-[10px] text-white/40">
              {format(new Date(item.scheduled_date), 'd MMM', { locale: pl })}
              {item.scheduled_time && ` · ${item.scheduled_time}`}
            </span>
          </div>
        )}
        {item.hook && (
          <p className="text-[10px] text-white/30 truncate mt-0.5 italic">"{item.hook}"</p>
        )}
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function ContentSidebar({
  items,
  activeTab,
  onTabChange,
  onItemClick,
  onDragStart,
  onDragEnd,
}: ContentSidebarProps) {
  const now = new Date()
  const weekEnd = endOfDay(addDays(now, 7))

  const scheduled = items
    .filter(
      (i) =>
        (i.status === 'scheduled' || i.status === 'ready') &&
        i.scheduled_date &&
        isAfter(new Date(i.scheduled_date), startOfDay(now)) &&
        isBefore(new Date(i.scheduled_date), weekEnd),
    )
    .sort((a, b) =>
      new Date(a.scheduled_date!).getTime() - new Date(b.scheduled_date!).getTime(),
    )

  const drafts = items.filter((i) => i.status === 'draft')
  const ideas = items.filter((i) => i.status === 'idea')

  const tabs: { key: SidebarTab; label: string; count: number }[] = [
    { key: 'scheduled', label: 'Zaplanowane', count: scheduled.length },
    { key: 'drafts', label: 'Drafty', count: drafts.length },
    { key: 'ideas', label: 'Pomysły', count: ideas.length },
  ]

  const currentItems =
    activeTab === 'scheduled' ? scheduled : activeTab === 'drafts' ? drafts : ideas

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={`flex-1 flex flex-col items-center py-2 px-1 rounded-lg text-xs transition-colors ${
              activeTab === t.key
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            <span className="font-medium text-[11px]">{t.label}</span>
            <span className={`text-base font-bold leading-tight ${activeTab === t.key ? 'text-primary' : 'text-white/30'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Drag hint */}
      {currentItems.length > 0 && (
        <p className="text-[10px] text-white/25 text-center mb-2">
          Przeciągnij post na kalendarz
        </p>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {currentItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-white/25">
              {activeTab === 'scheduled' && 'Brak zaplanowanych postów na najbliższy tydzień'}
              {activeTab === 'drafts' && 'Brak draftów'}
              {activeTab === 'ideas' && 'Brak pomysłów'}
            </p>
          </div>
        ) : (
          currentItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              onClick={() => onItemClick(item)}
              onDragStart={() => onDragStart(item)}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>

      {/* Channel legend */}
      <div className="mt-4 pt-3 border-t border-white/8">
        <p className="text-[10px] text-white/25 font-medium mb-2 uppercase tracking-wide">Kanały</p>
        <div className="space-y-1">
          {[
            { label: 'Instagram', color: '#cc2366', gradient: 'linear-gradient(90deg, #f09433, #cc2366)' },
            { label: 'LinkedIn', color: '#0077B5', gradient: undefined },
            { label: 'Facebook', color: '#1877F2', gradient: undefined },
            { label: 'Newsletter', color: '#636E72', gradient: undefined },
          ].map(({ label, color, gradient }) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ background: gradient ?? color }}
              />
              <span className="text-[11px] text-white/40">{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-[10px] text-white/25 font-medium uppercase tracking-wide mb-1">Status</p>
          {[
            { label: 'Pomysł', color: 'rgba(255,255,255,0.35)' },
            { label: 'Draft', color: '#74B9FF' },
            { label: 'Gotowy', color: '#FDCB6E' },
            { label: 'Zaplanowany', color: '#6C5CE7' },
            { label: 'Opublikowany', color: '#00B894' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-[11px] text-white/40">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
