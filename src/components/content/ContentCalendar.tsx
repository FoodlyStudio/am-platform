'use client'

import { ContentItem } from '@/types'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from 'date-fns'
import { pl } from 'date-fns/locale'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type CalendarViewMode = 'month' | 'week'

interface ContentCalendarProps {
  items: ContentItem[]
  viewMode: CalendarViewMode
  currentDate: Date
  onDateChange: (date: Date) => void
  onDayClick: (date: Date) => void
  onItemClick: (item: ContentItem) => void
  onDrop: (date: Date) => void
  draggedItem: ContentItem | null
}

// ─── Channel visual config ──────────────────────────────────────────────────

const CHANNEL_STYLE: Record<string, { bg: string; border: string; label: string }> = {
  instagram: {
    bg: 'linear-gradient(135deg, rgba(240,148,51,0.22) 0%, rgba(188,24,136,0.22) 100%)',
    border: '#cc2366',
    label: 'IG',
  },
  linkedin_company: { bg: 'rgba(0,119,181,0.18)', border: '#0077B5', label: 'LI' },
  linkedin_personal: { bg: 'rgba(0,119,181,0.18)', border: '#0077B5', label: 'LI' },
  facebook: { bg: 'rgba(24,119,242,0.18)', border: '#1877F2', label: 'FB' },
  newsletter: { bg: 'rgba(99,110,114,0.18)', border: '#636E72', label: 'NL' },
}

const STATUS_DOT: Record<string, string> = {
  idea: 'rgba(255,255,255,0.35)',
  draft: '#74B9FF',
  ready: '#FDCB6E',
  scheduled: '#6C5CE7',
  published: '#00B894',
  archived: '#636E72',
}

const DAYS_PL = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']

// ─── Post Card ───────────────────────────────────────────────────────────────

function PostCard({
  item,
  onClick,
  compact = false,
}: {
  item: ContentItem
  onClick: () => void
  compact?: boolean
}) {
  const ch = CHANNEL_STYLE[item.channel ?? 'newsletter'] ?? CHANNEL_STYLE.newsletter
  const dot = STATUS_DOT[item.status] ?? '#636E72'

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      style={{ background: ch.bg, borderLeft: `2px solid ${ch.border}` }}
      className="px-1.5 py-0.5 rounded-sm cursor-pointer hover:brightness-125 transition-all mb-px"
    >
      <div className="flex items-center gap-1">
        <span className="text-[9px] font-bold" style={{ color: ch.border }}>
          {ch.label}
        </span>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
        {item.scheduled_time && !compact && (
          <span className="text-[9px] text-white/40 ml-auto">{item.scheduled_time}</span>
        )}
      </div>
      <p className="text-[10px] text-white/80 truncate leading-tight">{item.title}</p>
    </div>
  )
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  currentDate,
  items,
  onDayClick,
  onItemClick,
  onDrop,
  draggedItem,
}: {
  currentDate: Date
  items: ContentItem[]
  onDayClick: (date: Date) => void
  onItemClick: (item: ContentItem) => void
  onDrop: (date: Date) => void
  draggedItem: ContentItem | null
}) {
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd })

  const getDayItems = (date: Date) =>
    items.filter((i) => i.scheduled_date && isSameDay(new Date(i.scheduled_date), date))

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS_PL.map((d) => (
          <div key={d} className="text-center text-[11px] text-white/30 py-1.5 font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-white/5 rounded-xl overflow-hidden">
        {allDays.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd')
          const dayItems = getDayItems(day)
          const outside = !isSameMonth(day, currentDate)
          const todayDay = isToday(day)
          const dragOver = !!draggedItem && dragOverKey === dayKey

          return (
            <div
              key={dayKey}
              onClick={() => !outside && onDayClick(day)}
              onDragOver={(e) => {
                if (!draggedItem) return
                e.preventDefault()
                setDragOverKey(dayKey)
              }}
              onDragLeave={() => setDragOverKey(null)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverKey(null)
                onDrop(day)
              }}
              className={`min-h-[90px] p-1.5 bg-card transition-colors ${
                outside ? 'opacity-25 cursor-default' : 'cursor-pointer hover:bg-white/[0.03]'
              } ${todayDay ? 'ring-1 ring-inset ring-primary/40' : ''} ${
                dragOver ? 'bg-primary/10 ring-1 ring-inset ring-primary/50' : ''
              }`}
            >
              <span
                className={`text-xs leading-none inline-flex items-center justify-center w-5 h-5 rounded-full mb-1 ${
                  todayDay ? 'bg-primary text-white font-bold' : 'text-white/50'
                }`}
              >
                {format(day, 'd')}
              </span>
              <div className="space-y-px">
                {dayItems.slice(0, 3).map((item) => (
                  <PostCard key={item.id} item={item} onClick={() => onItemClick(item)} compact />
                ))}
                {dayItems.length > 3 && (
                  <p className="text-[9px] text-white/30 pl-1">+{dayItems.length - 3} więcej</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  currentDate,
  items,
  onDayClick,
  onItemClick,
  onDrop,
  draggedItem,
}: {
  currentDate: Date
  items: ContentItem[]
  onDayClick: (date: Date) => void
  onItemClick: (item: ContentItem) => void
  onDrop: (date: Date) => void
  draggedItem: ContentItem | null
}) {
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const getDayItems = (date: Date) =>
    items.filter((i) => i.scheduled_date && isSameDay(new Date(i.scheduled_date), date))

  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDays.map((day) => {
        const dayKey = format(day, 'yyyy-MM-dd')
        const dayItems = getDayItems(day)
        const todayDay = isToday(day)
        const dragOver = !!draggedItem && dragOverKey === dayKey

        return (
          <div
            key={dayKey}
            onDragOver={(e) => {
              if (!draggedItem) return
              e.preventDefault()
              setDragOverKey(dayKey)
            }}
            onDragLeave={() => setDragOverKey(null)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOverKey(null)
              onDrop(day)
            }}
            className={`rounded-xl border min-h-[200px] transition-colors ${
              todayDay ? 'border-primary/40 bg-primary/5' : 'border-white/8 bg-card'
            } ${dragOver ? 'border-primary/60 bg-primary/10' : ''}`}
          >
            <div
              onClick={() => onDayClick(day)}
              className="p-2.5 border-b border-white/8 cursor-pointer hover:bg-white/5 transition-colors rounded-t-xl"
            >
              <p className="text-[10px] text-white/40 font-medium uppercase tracking-wide">
                {format(day, 'EEE', { locale: pl })}
              </p>
              <span
                className={`text-lg font-bold leading-tight block ${
                  todayDay ? 'text-primary' : 'text-white/80'
                }`}
              >
                {format(day, 'd')}
              </span>
              {dayItems.length > 0 && (
                <span className="text-[9px] text-white/30">{dayItems.length} postów</span>
              )}
            </div>
            <div className="p-1.5 space-y-1">
              {dayItems.length === 0 ? (
                <p className="text-[10px] text-white/15 text-center py-6">Brak postów</p>
              ) : (
                dayItems.map((item) => (
                  <PostCard key={item.id} item={item} onClick={() => onItemClick(item)} />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function ContentCalendar({
  items,
  viewMode,
  currentDate,
  onDateChange,
  onDayClick,
  onItemClick,
  onDrop,
  draggedItem,
}: ContentCalendarProps) {
  const navigatePrev = () => {
    if (viewMode === 'month') onDateChange(subMonths(currentDate, 1))
    else onDateChange(subWeeks(currentDate, 1))
  }
  const navigateNext = () => {
    if (viewMode === 'month') onDateChange(addMonths(currentDate, 1))
    else onDateChange(addWeeks(currentDate, 1))
  }

  const label =
    viewMode === 'month'
      ? format(currentDate, 'LLLL yyyy', { locale: pl })
      : `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: pl })} — ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: pl })}`

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white capitalize">{label}</h3>
        <div className="flex gap-1">
          <button
            onClick={navigatePrev}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => onDateChange(new Date())}
            className="px-2 py-1 text-xs text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            Dziś
          </button>
          <button
            onClick={navigateNext}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <MonthView
          currentDate={currentDate}
          items={items}
          onDayClick={onDayClick}
          onItemClick={onItemClick}
          onDrop={onDrop}
          draggedItem={draggedItem}
        />
      ) : (
        <WeekView
          currentDate={currentDate}
          items={items}
          onDayClick={onDayClick}
          onItemClick={onItemClick}
          onDrop={onDrop}
          draggedItem={draggedItem}
        />
      )}
    </div>
  )
}
