'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  Bell, Check, Flame, TrendingUp, FileText, DollarSign,
  Users, AlertCircle, ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string | null
  priority: 'normal' | 'high' | 'urgent'
  is_read: boolean
  created_at: string
  deal_id: string | null
  lead_id: string | null
}

// ─── Icon/color config per type ───────────────────────────────────────────────

function notifStyle(type: string) {
  switch (type) {
    case 'hot_lead':      return { Icon: Flame,      color: 'text-red-400',     bg: 'bg-red-500/15' }
    case 'offer_accepted':return { Icon: DollarSign,  color: 'text-emerald-400', bg: 'bg-emerald-500/15' }
    case 'offer_viewed':  return { Icon: FileText,    color: 'text-blue-400',    bg: 'bg-blue-500/15' }
    case 'deal_won':      return { Icon: TrendingUp,  color: 'text-primary',     bg: 'bg-primary/15' }
    case 'new_lead':      return { Icon: Users,       color: 'text-secondary',   bg: 'bg-secondary/15' }
    default:              return { Icon: AlertCircle, color: 'text-white/40',    bg: 'bg-white/5' }
  }
}

// ─── Hook: fetch + realtime ───────────────────────────────────────────────────

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications((data as AppNotification[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()

    const supabase = createClient()
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new as AppNotification, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => n.id === payload.new.id ? payload.new as AppNotification : n)
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [load])

  const markRead = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
  }, [])

  const markAllRead = useCallback(async () => {
    const supabase = createClient()
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }, [notifications])

  return {
    notifications,
    loading,
    unreadCount: notifications.filter((n) => !n.is_read).length,
    markRead,
    markAllRead,
    reload: load,
  }
}

// ─── Dropdown panel ───────────────────────────────────────────────────────────

export function NotificationsDropdown({ onClose }: { onClose: () => void }) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()

  return (
    <div className="absolute right-0 top-full mt-2 w-[360px] bg-[#0F0F1A] border border-white/10 rounded-[14px] shadow-2xl shadow-black/50 overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Powiadomienia</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
          >
            <Check size={11} />
            Oznacz wszystkie
          </button>
        )}
      </div>

      {/* Items */}
      <div className="py-1 max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Bell size={24} className="text-white/15" />
            <p className="text-xs text-white/30">Brak powiadomień</p>
          </div>
        ) : (
          notifications.slice(0, 15).map((n) => {
            const { Icon, color, bg } = notifStyle(n.type)
            const href = n.deal_id ? `/sales/${n.deal_id}` : n.lead_id ? `/sales/leads` : '/notifications'
            return (
              <Link
                key={n.id}
                href={href}
                onClick={() => { markRead(n.id); onClose() }}
                className={`
                  flex items-start gap-3 px-4 py-3
                  hover:bg-white/[0.04] transition-colors
                  ${!n.is_read ? 'bg-primary/[0.04]' : ''}
                `}
              >
                {/* Priority accent */}
                {n.priority === 'urgent' && (
                  <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500 rounded-full" />
                )}

                <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 mt-0.5 ${bg}`}>
                  <Icon size={14} className={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] leading-snug ${n.is_read ? 'text-white/55' : 'text-white/90'}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-[11px] text-white/35 mt-0.5 line-clamp-1">{n.body}</p>
                  )}
                  <p className="text-[11px] text-white/25 mt-0.5">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: pl })}
                  </p>
                </div>
                {!n.is_read && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-2" />
                )}
              </Link>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-white/[0.07]">
        <Link
          href="/notifications"
          onClick={onClose}
          className="w-full flex items-center justify-center gap-1.5 text-[12px] text-white/35 hover:text-white/60 transition-colors"
        >
          Zobacz wszystkie
          <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  )
}

// ─── Bell button with badge ───────────────────────────────────────────────────

export function NotificationsBell({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { unreadCount } = useNotifications()

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={`
          relative p-2 rounded-[8px] transition-all
          ${open
            ? 'bg-primary/15 text-primary'
            : 'text-white/45 hover:text-white hover:bg-white/[0.06]'}
        `}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent ring-2 ring-[#1A1A2E]" />
        )}
      </button>
    </div>
  )
}
