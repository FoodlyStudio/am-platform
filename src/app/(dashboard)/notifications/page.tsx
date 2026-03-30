'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  Bell, Check, Flame, TrendingUp, FileText, DollarSign,
  Users, AlertCircle, Filter, CheckCheck,
} from 'lucide-react'
import { useNotifications, type AppNotification } from '@/components/layout/NotificationsDropdown'

// ─── Config ───────────────────────────────────────────────────────────────────

function notifStyle(type: string) {
  switch (type) {
    case 'hot_lead':      return { Icon: Flame,      color: 'text-red-400',     bg: 'bg-red-500/15',     label: 'Gorący lead' }
    case 'offer_accepted':return { Icon: DollarSign,  color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Oferta zaakceptowana' }
    case 'offer_viewed':  return { Icon: FileText,    color: 'text-blue-400',    bg: 'bg-blue-500/15',    label: 'Oferta wyświetlona' }
    case 'deal_won':      return { Icon: TrendingUp,  color: 'text-primary',     bg: 'bg-primary/15',     label: 'Deal wygrany' }
    case 'new_lead':      return { Icon: Users,       color: 'text-secondary',   bg: 'bg-secondary/15',   label: 'Nowy lead' }
    default:              return { Icon: AlertCircle, color: 'text-white/40',    bg: 'bg-white/5',        label: 'Powiadomienie' }
  }
}

const PRIORITY_CONFIG = {
  urgent: { label: 'Pilne',    color: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/30' },
  high:   { label: 'Ważne',    color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/20' },
  normal: { label: 'Normalne', color: 'text-white/40',   bg: 'bg-white/5',       border: 'border-white/5' },
}

type FilterType = 'all' | 'unread' | 'hot_lead' | 'offer_accepted' | 'offer_viewed' | 'deal_won' | 'urgent'

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',            label: 'Wszystkie' },
  { key: 'unread',         label: 'Nieprzeczytane' },
  { key: 'urgent',         label: 'Pilne' },
  { key: 'hot_lead',       label: 'Gorące leady' },
  { key: 'offer_accepted', label: 'Oferty' },
  { key: 'deal_won',       label: 'Wygrane' },
]

// ─── Notification row ─────────────────────────────────────────────────────────

function NotifRow({ notif, onMarkRead }: { notif: AppNotification; onMarkRead: (id: string) => void }) {
  const { Icon, color, bg } = notifStyle(notif.type)
  const pCfg = PRIORITY_CONFIG[notif.priority]
  const href = notif.deal_id ? `/sales/${notif.deal_id}` : notif.lead_id ? `/sales/leads` : '#'

  return (
    <div
      className={`
        relative flex items-start gap-4 p-4 rounded-xl border transition-all
        ${!notif.is_read ? 'bg-primary/[0.04] border-primary/10' : 'bg-card border-white/5'}
        hover:border-white/10 group
      `}
    >
      {/* Urgent bar */}
      {notif.priority === 'urgent' && (
        <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-red-500 rounded-full" />
      )}

      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon size={16} className={color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={`text-sm leading-snug ${notif.is_read ? 'text-white/55' : 'text-white/90 font-medium'}`}>
              {notif.title}
            </p>
            {notif.body && (
              <p className="text-xs text-white/35 mt-1 leading-relaxed">{notif.body}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${pCfg.bg} ${pCfg.color}`}>
              {pCfg.label}
            </span>
            <span className="text-[11px] text-white/25">
              {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: pl })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-white/20">
            {format(new Date(notif.created_at), 'd MMM, HH:mm', { locale: pl })}
          </span>

          <div className="flex items-center gap-1.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            {!notif.is_read && (
              <button
                onClick={() => onMarkRead(notif.id)}
                className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
              >
                <Check size={11} />
                Przeczytane
              </button>
            )}
            {(notif.deal_id || notif.lead_id) && (
              <Link
                href={href}
                className="text-[11px] text-white/35 hover:text-white/60 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
              >
                Otwórz →
              </Link>
            )}
          </div>
        </div>
      </div>

      {!notif.is_read && (
        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { notifications, loading, unreadCount, markRead, markAllRead } = useNotifications()
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.is_read
    if (filter === 'urgent') return n.priority === 'urgent'
    return n.type === filter
  })

  return (
    <div className="max-w-2xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            Powiadomienia
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary text-white">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} nieprzeczytanych` : 'Wszystko przeczytane'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs font-medium text-primary hover:bg-primary/20 transition-all"
          >
            <CheckCheck size={13} />
            Oznacz wszystkie
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Filter size={13} className="text-white/30 flex-shrink-0" />
        {FILTERS.map((f) => {
          const count = f.key === 'all'
            ? notifications.length
            : f.key === 'unread'
            ? notifications.filter((n) => !n.is_read).length
            : f.key === 'urgent'
            ? notifications.filter((n) => n.priority === 'urgent').length
            : notifications.filter((n) => n.type === f.key).length

          if (count === 0 && f.key !== 'all') return null

          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                whitespace-nowrap flex-shrink-0 transition-all
                ${filter === f.key
                  ? 'bg-primary text-white'
                  : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70'}
              `}
            >
              {f.label}
              <span className={`text-[10px] ${filter === f.key ? 'text-white/70' : 'text-white/25'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Bell size={36} className="text-white/10" />
          <p className="text-sm text-white/30">Brak powiadomień w tej kategorii</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <NotifRow key={n.id} notif={n} onMarkRead={markRead} />
          ))}
        </div>
      )}
    </div>
  )
}
