'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useLeads } from '@/hooks/useLeads'
import { useDeals } from '@/hooks/useDeals'
import { useContent } from '@/hooks/useContent'
import { useFinance } from '@/hooks/useFinance'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Income, PipelineStage, OutreachMessage, OutreachMessageType } from '@/types'
import {
  format, isSameMonth, differenceInDays,
  isToday, isBefore, parseISO,
} from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  Send, FileText, DollarSign, TrendingUp, TrendingDown,
  AlertTriangle, AlertCircle, Calendar, Users, ArrowRight,
  Upload, PlusCircle, Sparkles, Clock, CheckCircle2, X,
  ChevronRight,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import toast from 'react-hot-toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const REVENUE_TARGET = 25000

const STAGE_LABELS: Partial<Record<PipelineStage, string>> = {
  nowy_lead: 'Nowy lead',
  dm_wyslany: 'DM wysłany',
  odpowiedz: 'Odpowiedź',
  rozmowa_umowiona: 'Rozmowa',
  diagnoza_zrobiona: 'Diagnoza',
  oferta_prezentowana: 'Oferta',
  negocjacje: 'Negocjacje',
}

const STAGE_COLORS: Partial<Record<PipelineStage, string>> = {
  nowy_lead: 'bg-slate-500',
  dm_wyslany: 'bg-blue-500',
  odpowiedz: 'bg-cyan-500',
  rozmowa_umowiona: 'bg-violet-500',
  diagnoza_zrobiona: 'bg-purple-500',
  oferta_prezentowana: 'bg-indigo-500',
  negocjacje: 'bg-amber-500',
}

const ACTIVE_STAGES: PipelineStage[] = [
  'nowy_lead', 'dm_wyslany', 'odpowiedz',
  'rozmowa_umowiona', 'diagnoza_zrobiona', 'oferta_prezentowana', 'negocjacje',
]

const OUTREACH_TYPE_GROUP: Record<OutreachMessageType, 'zaproszenie' | 'dm' | 'followup'> = {
  connection_request: 'zaproszenie',
  dm1_icebreaker: 'dm',
  fu1_case_study: 'followup',
  fu2_calendar: 'followup',
  post_offer_48h: 'followup',
  post_offer_5d: 'followup',
  post_offer_14d: 'followup',
  reengagement_90d: 'followup',
  custom: 'dm',
}

// ─── Add Income Modal ─────────────────────────────────────────────────────────

function AddIncomeModal({ onSave, onClose }: {
  onSave: (data: Omit<Income, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onClose: () => void
}) {
  const [clientName, setClientName] = useState('')
  const [amount, setAmount] = useState('')
  const [projectName, setProjectName] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const num = parseFloat(amount.replace(',', '.'))
    if (!clientName.trim()) { toast.error('Podaj nazwę klienta'); return }
    if (!num || num <= 0) { toast.error('Podaj kwotę'); return }
    setSaving(true)
    await onSave({
      client_name: clientName.trim(),
      project_name: projectName.trim() || undefined,
      amount: num,
      currency: 'PLN',
      paid_amount: 0,
      status: 'oczekujaca',
      invoice_date: invoiceDate,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-base font-semibold text-white">Dodaj przychód</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Nazwa klienta"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary"
          />
          <input
            type="text"
            placeholder="Nazwa projektu (opcjonalnie)"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary"
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Kwota (PLN)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary"
          />
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2 mt-5 justify-end">
          <Button size="sm" variant="ghost" onClick={onClose}>Anuluj</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Zapisywanie...' : 'Dodaj'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Today Bar ────────────────────────────────────────────────────────────────

function TodayBar({
  zaproszenia, dms, followups,
  nextPost,
  revenueMtd, revenueTarget,
}: {
  zaproszenia: number; dms: number; followups: number
  nextPost: { title: string; daysUntil: number } | null
  revenueMtd: number; revenueTarget: number
}) {
  const pct = Math.min(100, Math.round((revenueMtd / revenueTarget) * 100))
  const totalOutreach = zaproszenia + dms + followups
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Outreach */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border border-white/5 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
          <Send size={15} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white/50 mb-1">Outreach dzisiaj</div>
          {totalOutreach === 0 ? (
            <div className="text-sm text-white/30">Brak zaległości</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {zaproszenia > 0 && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{zaproszenia} zaproszeń</span>}
              {dms > 0 && <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">{dms} DM-ów</span>}
              {followups > 0 && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">{followups} follow-upów</span>}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border border-white/5 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
          <Calendar size={15} className="text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white/50 mb-1">Najbliższy post</div>
          {nextPost ? (
            <div>
              <div className="text-sm text-white truncate">{nextPost.title}</div>
              <div className="text-xs text-white/40 mt-0.5">
                {nextPost.daysUntil === 0 ? 'Dzisiaj' : nextPost.daysUntil === 1 ? 'Jutro' : `Za ${nextPost.daysUntil} dni`}
              </div>
            </div>
          ) : (
            <div className="text-sm text-white/30">Brak zaplanowanych</div>
          )}
        </div>
      </div>

      {/* Revenue MTD */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border border-white/5 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0">
          <TrendingUp size={15} className="text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white/50 mb-1">Przychód MTD</div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-white">{formatCurrency(revenueMtd)}</span>
            <span className="text-xs text-white/40">/ {formatCurrency(revenueTarget)}</span>
          </div>
          <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-400' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[10px] text-white/30 mt-0.5">{pct}% targetu</div>
        </div>
      </div>
    </div>
  )
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon, iconBg, iconColor, label, value, valueColor, sub, href,
}: {
  icon: React.ElementType
  iconBg: string; iconColor: string
  label: string; value: string
  valueColor?: string; sub?: string; href?: string
}) {
  const inner = (
    <Card className={href ? 'hover:border-white/15 transition-colors cursor-pointer' : ''}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon size={15} className={iconColor} />
        </div>
        {href && <ChevronRight size={14} className="text-white/20" />}
      </div>
      <div className={`text-2xl font-bold ${valueColor ?? 'text-white'}`}>{value}</div>
      <div className="text-xs text-white/40 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-white/30 mt-1">{sub}</div>}
    </Card>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

// ─── Pipeline Mini View ───────────────────────────────────────────────────────

function PipelineMiniView({ counts }: { counts: Partial<Record<PipelineStage, number>> }) {
  const total = ACTIVE_STAGES.reduce((s, st) => s + (counts[st] ?? 0), 0)
  if (total === 0) {
    return <div className="text-sm text-white/30 text-center py-4">Brak aktywnych dealów</div>
  }
  return (
    <div className="space-y-2">
      {ACTIVE_STAGES.map((stage) => {
        const count = counts[stage] ?? 0
        if (count === 0) return null
        const pct = Math.round((count / total) * 100)
        return (
          <div key={stage} className="flex items-center gap-3">
            <div className="w-28 text-xs text-white/50 text-right flex-shrink-0">{STAGE_LABELS[stage]}</div>
            <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full ${STAGE_COLORS[stage] ?? 'bg-slate-500'} rounded-full transition-all flex items-center pl-2`}
                style={{ width: `${Math.max(pct, 4)}%` }}
              >
                <span className="text-[10px] text-white/90 font-medium whitespace-nowrap">{count}</span>
              </div>
            </div>
            <div className="w-8 text-xs text-white/30 text-right flex-shrink-0">{pct}%</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Activity Timeline ────────────────────────────────────────────────────────

interface ActivityEvent {
  id: string
  type: 'lead' | 'deal' | 'content' | 'payment'
  text: string
  sub?: string
  date: Date
}

function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  const iconMap = {
    lead: { Icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/15' },
    deal: { Icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/15' },
    content: { Icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/15' },
    payment: { Icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/15' },
  }

  if (events.length === 0) {
    return <div className="text-sm text-white/30 text-center py-4">Brak aktywności</div>
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const { Icon, color, bg } = iconMap[event.type]
        const isLast = i === events.length - 1
        return (
          <div key={event.id} className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center z-10`}>
                <Icon size={13} className={color} />
              </div>
              {!isLast && <div className="w-px flex-1 bg-white/5 my-1" />}
            </div>
            <div className={`flex-1 ${!isLast ? 'pb-4' : 'pb-0'}`}>
              <div className="text-sm text-white leading-snug">{event.text}</div>
              {event.sub && <div className="text-xs text-white/40 mt-0.5">{event.sub}</div>}
              <div className="text-[10px] text-white/25 mt-1">
                {isToday(event.date)
                  ? `dziś ${format(event.date, 'HH:mm')}`
                  : format(event.date, 'd MMM, HH:mm', { locale: pl })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Alert Item ───────────────────────────────────────────────────────────────

function AlertItem({ type, message, action, href }: {
  type: 'error' | 'warning' | 'info'
  message: string
  action?: string
  href?: string
}) {
  const styles = {
    error: { bg: 'bg-red-500/8 border-red-500/20', text: 'text-red-400', Icon: AlertCircle },
    warning: { bg: 'bg-yellow-500/8 border-yellow-500/20', text: 'text-yellow-400', Icon: AlertTriangle },
    info: { bg: 'bg-blue-500/8 border-blue-500/20', text: 'text-blue-400', Icon: Clock },
  }
  const { bg, text, Icon } = styles[type]
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${bg}`}>
      <Icon size={14} className={`${text} flex-shrink-0`} />
      <span className="text-xs text-white/70 flex-1">{message}</span>
      {action && href && (
        <Link href={href} className={`text-xs font-medium ${text} hover:opacity-80 flex-shrink-0`}>
          {action} →
        </Link>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { leads, fetch: fetchLeads } = useLeads()
  const { deals, fetch: fetchDeals } = useDeals()
  const { items: contentItems, fetch: fetchContent } = useContent()
  const { income, expenses, fetch: fetchFinance, createIncome } = useFinance()
  const [outreach, setOutreach] = useState<OutreachMessage[]>([])
  const [showAddIncome, setShowAddIncome] = useState(false)

  useEffect(() => {
    fetchLeads()
    fetchDeals()
    fetchContent()
    fetchFinance()
    const loadOutreach = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('outreach_messages')
        .select('id, message_type, status, scheduled_for, sent_at')
        .eq('status', 'draft')
        .order('scheduled_for', { ascending: true })
      setOutreach((data as OutreachMessage[]) ?? [])
    }
    loadOutreach()
  }, [fetchLeads, fetchDeals, fetchContent, fetchFinance])

  const now = new Date()

  // ── Outreach queue (today + overdue) ─────────────────────────────────────
  const outreachDue = useMemo(
    () => outreach.filter((m) => m.scheduled_for && !isToday(parseISO(m.scheduled_for))
      ? isBefore(parseISO(m.scheduled_for), now)
      : true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outreach],
  )

  const outreachCounts = useMemo(() => {
    let zaproszenia = 0, dms = 0, followups = 0
    for (const m of outreachDue) {
      const group = OUTREACH_TYPE_GROUP[m.message_type]
      if (group === 'zaproszenie') zaproszenia++
      else if (group === 'dm') dms++
      else followups++
    }
    return { zaproszenia, dms, followups }
  }, [outreachDue])

  // ── Next scheduled content ────────────────────────────────────────────────
  const nextPost = useMemo(() => {
    const upcoming = contentItems
      .filter((c) => c.scheduled_date && (c.status === 'scheduled' || c.status === 'ready'))
      .sort((a, b) => a.scheduled_date!.localeCompare(b.scheduled_date!))
    const first = upcoming[0]
    if (!first) return null
    const daysUntil = differenceInDays(parseISO(first.scheduled_date!), now)
    return { title: first.title, daysUntil: Math.max(0, daysUntil) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentItems])

  // ── Revenue MTD ───────────────────────────────────────────────────────────
  const revenueMtd = useMemo(
    () => income
      .filter((i) => isSameMonth(new Date(i.invoice_date ?? i.created_at), now))
      .reduce((s, i) => s + i.paid_amount, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [income],
  )

  // ── 4 Metric cards ────────────────────────────────────────────────────────
  const pipelineValue = useMemo(
    () => deals.filter((d) => ACTIVE_STAGES.includes(d.stage as PipelineStage))
      .reduce((s, d) => s + (d.value ?? 0), 0),
    [deals],
  )

  const costsMtd = useMemo(
    () => expenses
      .filter((e) => isSameMonth(new Date(e.expense_date), now))
      .reduce((s, e) => s + e.amount, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses],
  )

  const contentPublishedMtd = useMemo(
    () => contentItems.filter(
      (c) => c.status === 'published' && isSameMonth(new Date(c.updated_at), now),
    ).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentItems],
  )

  const netProfitMtd = revenueMtd - costsMtd

  // ── Pipeline stage counts ─────────────────────────────────────────────────
  const stageCounts = useMemo(() => {
    const map: Partial<Record<PipelineStage, number>> = {}
    for (const d of deals) {
      if (ACTIVE_STAGES.includes(d.stage as PipelineStage)) {
        map[d.stage] = (map[d.stage] ?? 0) + 1
      }
    }
    return map
  }, [deals])

  // ── Activity timeline ─────────────────────────────────────────────────────
  const activityEvents = useMemo((): ActivityEvent[] => {
    const events: ActivityEvent[] = []

    // New leads (last 10)
    for (const l of leads.slice(0, 10)) {
      events.push({
        id: `lead-${l.id}`,
        type: 'lead',
        text: `Nowy lead: ${l.first_name} ${l.last_name} z ${l.company}`,
        sub: l.ai_score ? `Score: ${l.ai_score}/10` : undefined,
        date: new Date(l.created_at),
      })
    }

    // Deals with stage changes
    for (const d of deals.slice(0, 10)) {
      if (d.stage_changed_at) {
        events.push({
          id: `deal-${d.id}`,
          type: 'deal',
          text: `Deal: ${d.title} → ${STAGE_LABELS[d.stage as PipelineStage] ?? d.stage}`,
          sub: d.value ? formatCurrency(d.value) : undefined,
          date: new Date(d.stage_changed_at),
        })
      }
    }

    // Published content
    for (const c of contentItems.filter((c) => c.status === 'published').slice(0, 5)) {
      events.push({
        id: `content-${c.id}`,
        type: 'content',
        text: `Opublikowano: „${c.title}"`,
        sub: c.channel ?? undefined,
        date: new Date(c.updated_at),
      })
    }

    // Received payments
    for (const i of income.filter((i) => i.status === 'oplacona' && i.paid_date).slice(0, 5)) {
      events.push({
        id: `income-${i.id}`,
        type: 'payment',
        text: `Płatność: ${formatCurrency(i.paid_amount)} od ${i.client_name}`,
        sub: i.project_name ?? undefined,
        date: new Date(i.paid_date!),
      })
    }

    return events
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 8)
  }, [leads, deals, contentItems, income])

  // ── Alerts ────────────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const list: { type: 'error' | 'warning' | 'info'; message: string; action?: string; href?: string }[] = []

    const overdueIncome = income.filter((i) => {
      if (i.status === 'zalegla') return true
      if (i.status === 'oczekujaca' && i.due_date && differenceInDays(now, new Date(i.due_date)) > 0) return true
      return false
    })
    if (overdueIncome.length > 0) {
      const total = overdueIncome.reduce((s, i) => s + i.amount, 0)
      list.push({
        type: 'error',
        message: `${overdueIncome.length} zaległe faktury — ${formatCurrency(total)}`,
        action: 'Zarządzaj',
        href: '/finance/income',
      })
    }

    const followupsToday = outreachDue.filter(
      (m) => ['fu1_case_study', 'fu2_calendar', 'post_offer_48h', 'post_offer_5d', 'post_offer_14d'].includes(m.message_type),
    )
    if (followupsToday.length > 0) {
      list.push({
        type: 'warning',
        message: `${followupsToday.length} follow-upów do wysłania`,
        action: 'Outreach',
        href: '/sales/outreach',
      })
    }

    const reengagementLeads = leads.filter((l) => {
      const daysSince = differenceInDays(now, new Date(l.created_at))
      return daysSince >= 90 && l.status !== 'disqualified' && l.status !== 'archived'
    })
    if (reengagementLeads.length > 0) {
      list.push({
        type: 'warning',
        message: `${reengagementLeads.length} leadów nieaktywnych 90+ dni — rozważ re-engagement`,
        action: 'Leady',
        href: '/sales/leads',
      })
    }

    const readyContent = contentItems.filter((c) => c.status === 'ready')
    if (readyContent.length > 0) {
      list.push({
        type: 'info',
        message: `${readyContent.length} postów gotowych do publikacji`,
        action: 'Kalendarz',
        href: '/content',
      })
    }

    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [income, outreachDue, leads, contentItems])

  const handleAddIncome = async (data: Omit<Income, 'id' | 'created_at' | 'updated_at'>) => {
    await createIncome(data)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">
          Dzień dobry — {format(now, 'EEEE, d MMMM', { locale: pl })}
        </h1>
        <p className="text-sm text-white/40 mt-0.5">AM Automations · przegląd dnia</p>
      </div>

      {/* ── Sekcja "Dziś" ────────────────────────────────────────────────── */}
      <TodayBar
        zaproszenia={outreachCounts.zaproszenia}
        dms={outreachCounts.dms}
        followups={outreachCounts.followups}
        nextPost={nextPost}
        revenueMtd={revenueMtd}
        revenueTarget={REVENUE_TARGET}
      />

      {/* ── 4 Metric Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={TrendingUp}
          iconBg="bg-violet-500/15"
          iconColor="text-violet-400"
          label="Pipeline value"
          value={formatCurrency(pipelineValue)}
          sub={`${deals.filter((d) => ACTIVE_STAGES.includes(d.stage as PipelineStage)).length} aktywnych dealów`}
          href="/sales"
        />
        <MetricCard
          icon={DollarSign}
          iconBg="bg-green-500/15"
          iconColor="text-green-400"
          label="Revenue MTD"
          value={formatCurrency(revenueMtd)}
          sub={`${Math.round((revenueMtd / REVENUE_TARGET) * 100)}% targetu ${formatCurrency(REVENUE_TARGET)}`}
          href="/finance/income"
        />
        <MetricCard
          icon={FileText}
          iconBg="bg-blue-500/15"
          iconColor="text-blue-400"
          label="Content opublikowany"
          value={String(contentPublishedMtd)}
          sub={`${format(now, 'LLLL', { locale: pl })}`}
          href="/content"
        />
        <MetricCard
          icon={netProfitMtd >= 0 ? TrendingUp : TrendingDown}
          iconBg={netProfitMtd >= 0 ? 'bg-green-500/15' : 'bg-red-500/15'}
          iconColor={netProfitMtd >= 0 ? 'text-green-400' : 'text-red-400'}
          label="Zysk netto MTD"
          value={formatCurrency(netProfitMtd)}
          valueColor={netProfitMtd >= 0 ? 'text-green-400' : 'text-red-400'}
          href="/finance"
        />
      </div>

      {/* ── Middle Row: Pipeline + Activity ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Pipeline mini view */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Pipeline</h2>
              <p className="text-xs text-white/40 mt-0.5">{deals.filter((d) => ACTIVE_STAGES.includes(d.stage as PipelineStage)).length} aktywnych dealów</p>
            </div>
            <Link
              href="/sales"
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            >
              Pełny widok <ArrowRight size={12} />
            </Link>
          </div>
          <PipelineMiniView counts={stageCounts} />
          {pipelineValue > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-xs">
              <span className="text-white/40">Łączna wartość pipeline</span>
              <span className="font-semibold text-white">{formatCurrency(pipelineValue)}</span>
            </div>
          )}
        </Card>

        {/* Activity timeline */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Ostatnia aktywność</h2>
            <Badge variant="default">{activityEvents.length}</Badge>
          </div>
          <ActivityTimeline events={activityEvents} />
        </Card>
      </div>

      {/* ── Bottom Row: Alerts + Quick Actions ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Alerts */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Alerty i przypomnienia</h2>
            {alerts.length > 0 && (
              <Badge variant="danger">{alerts.length}</Badge>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3 bg-green-500/8 border border-green-500/20 rounded-xl">
              <CheckCircle2 size={14} className="text-green-400" />
              <span className="text-sm text-green-400">Wszystko w porządku — brak alertów</span>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <AlertItem key={i} {...a} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Quick actions</h2>
          <div className="space-y-2">
            <Link href="/sales/leads/import">
              <div className="flex items-center gap-3 px-4 py-3 bg-card border border-white/5 hover:border-primary/30 hover:bg-primary/5 rounded-xl transition-all group cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                  <Upload size={15} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white group-hover:text-primary transition-colors">Importuj leady</div>
                  <div className="text-xs text-white/40">CSV z Sales Navigatora</div>
                </div>
                <ArrowRight size={13} className="text-white/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            <button
              onClick={() => setShowAddIncome(true)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-card border border-white/5 hover:border-green-500/30 hover:bg-green-500/5 rounded-xl transition-all group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0">
                <PlusCircle size={15} className="text-green-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-white group-hover:text-green-400 transition-colors">Dodaj przychód</div>
                <div className="text-xs text-white/40">Nowa faktura / płatność</div>
              </div>
              <ArrowRight size={13} className="text-white/20 group-hover:text-green-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            <Link href="/content/generator">
              <div className="flex items-center gap-3 px-4 py-3 bg-card border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/5 rounded-xl transition-all group cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={15} className="text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors">Wygeneruj post</div>
                  <div className="text-xs text-white/40">AI Generator contentu</div>
                </div>
                <ArrowRight size={13} className="text-white/20 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Add Income Modal */}
      {showAddIncome && (
        <AddIncomeModal
          onSave={handleAddIncome}
          onClose={() => setShowAddIncome(false)}
        />
      )}
    </div>
  )
}
