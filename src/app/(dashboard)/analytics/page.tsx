'use client'

import { useEffect, useState, useMemo } from 'react'
import { useLeads } from '@/hooks/useLeads'
import { useDeals } from '@/hooks/useDeals'
import { useFinance } from '@/hooks/useFinance'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { LeadSegment, PipelineStage } from '@/types'
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  format, subMonths, isSameMonth, differenceInDays, addDays,
} from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  ChevronUp, ChevronDown, Sparkles, Trophy,
  AlertTriangle, DollarSign, Target,
  Users, Zap, CheckCircle2,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const SEGMENT_LABELS: Record<LeadSegment, string> = {
  gabinety_med: 'Gabinety Med.',
  budowlanka: 'Budowlanka',
  kancelarie: 'Kancelarie',
  beauty: 'Beauty',
  szkolenia: 'Szkolenia',
  nieruchomosci: 'Nieruchomości',
  it_male: 'IT (małe)',
  transport: 'Transport',
}

const SEGMENT_COLORS: Record<LeadSegment, string> = {
  gabinety_med: '#60a5fa',
  budowlanka: '#fb923c',
  kancelarie: '#a78bfa',
  beauty: '#f472b6',
  szkolenia: '#4ade80',
  nieruchomosci: '#facc15',
  it_male: '#38bdf8',
  transport: '#94a3b8',
}

const ACTIVE_STAGES: PipelineStage[] = [
  'nowy_lead', 'dm_wyslany', 'odpowiedz',
  'rozmowa_umowiona', 'diagnoza_zrobiona', 'oferta_prezentowana', 'negocjacje',
]

const STAGE_LABELS: Partial<Record<PipelineStage, string>> = {
  nowy_lead: 'Nowy lead',
  dm_wyslany: 'DM wysłany',
  odpowiedz: 'Odpowiedź',
  rozmowa_umowiona: 'Rozmowa',
  diagnoza_zrobiona: 'Diagnoza',
  oferta_prezentowana: 'Oferta',
  negocjacje: 'Negocjacje',
}

const STAGE_PROB: Record<PipelineStage, number> = {
  nowy_lead: 0.05, dm_wyslany: 0.10, odpowiedz: 0.20,
  rozmowa_umowiona: 0.35, diagnoza_zrobiona: 0.50,
  oferta_prezentowana: 0.65, negocjacje: 0.80,
  wygrana: 1.0, przegrana: 0, nie_teraz: 0.05,
}

const REPLY_STAGES: PipelineStage[] = [
  'odpowiedz', 'rozmowa_umowiona', 'diagnoza_zrobiona',
  'oferta_prezentowana', 'negocjacje', 'wygrana',
]

const LOST_REASON_MAP: Record<string, string> = {
  'za drogo': 'Za drogo',
  'nie teraz': 'Nie teraz',
  'wybrali kogos': 'Wybrali kogoś',
  'brak budzetu': 'Brak budżetu',
  'brak odpowiedzi': 'Brak odpowiedzi',
}

const LOST_COLORS = ['#f87171', '#fbbf24', '#60a5fa', '#a78bfa', '#94a3b8']

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 },
  itemStyle: { color: '#fff' },
  labelStyle: { color: 'rgba(255,255,255,0.6)' },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SegmentStat {
  seg: LeadSegment
  label: string
  color: string
  leadCount: number
  dealCount: number
  replyRate: number
  closeRate: number
  avgTicket: number
  revenue: number
}

type SortKey = keyof Omit<SegmentStat, 'seg' | 'label' | 'color'>
type SortDir = 'asc' | 'desc'

interface ABVariant {
  variant: string
  sent: number
  replied: number
  replyRate: number
  isDefault: boolean
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, iconColor, title, sub }: {
  icon: React.ElementType; iconColor: string; title: string; sub?: string
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-8 h-8 rounded-lg ${iconColor} flex items-center justify-center`}>
        <Icon size={15} className="text-white" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Sort Header ──────────────────────────────────────────────────────────────

function SortHeader({ label, col, sortKey, sortDir, onSort }: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir
  onSort: (col: SortKey) => void
}) {
  const active = sortKey === col
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-white/40 cursor-pointer hover:text-white/70 transition-colors select-none whitespace-nowrap"
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="flex flex-col ml-0.5">
          <ChevronUp size={9} className={active && sortDir === 'asc' ? 'text-primary' : 'text-white/20'} />
          <ChevronDown size={9} className={active && sortDir === 'desc' ? 'text-primary' : 'text-white/20'} />
        </span>
      </div>
    </th>
  )
}

// ─── AI Recommendation ────────────────────────────────────────────────────────

function AIRecommendation({ stats }: { stats: SegmentStat[] }) {
  const eligible = stats.filter((s) => s.leadCount >= 2 && s.closeRate > 0)
  if (eligible.length === 0) return null

  // Best EV: closeRate × avgTicket
  const best = eligible.reduce((a, b) =>
    (a.closeRate * a.avgTicket) > (b.closeRate * b.avgTicket) ? a : b,
  )
  // Weakest: lowest closeRate with at least 2 leads
  const worst = eligible.reduce((a, b) => a.closeRate < b.closeRate ? a : b)

  return (
    <div className="mt-4 p-4 bg-primary/8 border border-primary/20 rounded-xl space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={14} className="text-primary" />
        <span className="text-xs font-semibold text-primary">Rekomendacja AI</span>
      </div>
      <p className="text-sm text-white/80">
        Podwój czas na segment{' '}
        <span className="font-semibold text-white">{best.label}</span>
        {' '}(close rate{' '}
        <span className="text-green-400">{best.closeRate}%</span>
        {best.avgTicket > 0 && <>, avg ticket{' '}<span className="text-green-400">{formatCurrency(best.avgTicket)}</span></>}
        ) — najwyższy oczekiwany przychód per lead.
      </p>
      {worst.seg !== best.seg && worst.closeRate < 10 && (
        <p className="text-sm text-white/50">
          Segment <span className="font-medium text-white">{worst.label}</span> ma najniższy close rate ({worst.closeRate}%) — rozważ zmianę strategii lub zmniejszenie nakładów.
        </p>
      )}
    </div>
  )
}

// ─── Section 1: Segment Performance ──────────────────────────────────────────

function SegmentPerformance({ stats }: { stats: SegmentStat[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('leadCount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (col: SortKey) => {
    if (sortKey === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(col); setSortDir('desc') }
  }

  const sorted = useMemo(() => {
    return [...stats].sort((a, b) => {
      const va = a[sortKey] as number
      const vb = b[sortKey] as number
      return sortDir === 'asc' ? va - vb : vb - va
    })
  }, [stats, sortKey, sortDir])

  // Best = highest closeRate (min 2 leads), Worst = lowest (min 2 leads)
  const eligible = stats.filter((s) => s.leadCount >= 2)
  const bestSeg = eligible.length > 0 ? eligible.reduce((a, b) => a.closeRate > b.closeRate ? a : b).seg : null
  const worstSeg = eligible.length > 1 ? eligible.reduce((a, b) => a.closeRate < b.closeRate ? a : b).seg : null

  const cols: { label: string; key: SortKey }[] = [
    { label: 'Leady', key: 'leadCount' },
    { label: 'Deale', key: 'dealCount' },
    { label: 'Reply Rate', key: 'replyRate' },
    { label: 'Close Rate', key: 'closeRate' },
    { label: 'Avg Ticket', key: 'avgTicket' },
    { label: 'Revenue', key: 'revenue' },
  ]

  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-white/5">
        <SectionHeader icon={Users} iconColor="bg-blue-500/80" title="Segment Performance" sub="Analiza efektywności per branża" />
        <AIRecommendation stats={stats} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Segment</th>
              {cols.map((c) => (
                <SortHeader key={c.key} label={c.label} col={c.key} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((s) => {
              const isBest = s.seg === bestSeg
              const isWorst = s.seg === worstSeg && !isBest
              return (
                <tr
                  key={s.seg}
                  className={`transition-colors ${isBest ? 'bg-green-500/5 hover:bg-green-500/8' : isWorst ? 'bg-red-500/5 hover:bg-red-500/8' : 'hover:bg-white/3'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="font-medium text-white">{s.label}</span>
                      {isBest && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">★ Najlepszy</span>}
                      {isWorst && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">Najsłabszy</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/70">{s.leadCount}</td>
                  <td className="px-4 py-3 text-white/70">{s.dealCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(s.replyRate, 100)}%` }} />
                      </div>
                      <span className={`text-xs ${s.replyRate >= 30 ? 'text-green-400' : s.replyRate >= 15 ? 'text-amber-400' : 'text-white/50'}`}>
                        {s.replyRate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${s.closeRate >= 30 ? 'text-green-400' : s.closeRate >= 15 ? 'text-amber-400' : 'text-white/50'}`}>
                      {s.closeRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/70">{s.avgTicket > 0 ? formatCurrency(s.avgTicket) : '—'}</td>
                  <td className="px-4 py-3 font-medium text-white">{s.revenue > 0 ? formatCurrency(s.revenue) : '—'}</td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-white/30">Brak danych segmentów</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ─── Section 2: Win/Loss Analysis ────────────────────────────────────────────

function WinLossSection({ deals }: { deals: ReturnType<typeof useDeals>['deals'] }) {
  const now = new Date()

  const wonDeals = deals.filter((d) => d.stage === 'wygrana')
  const lostDeals = deals.filter((d) => d.stage === 'przegrana')

  // Lost reason pie
  const lostReasonData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const d of lostDeals) {
      const raw = (d.lost_reason ?? 'inne').toLowerCase().trim()
      const label = Object.entries(LOST_REASON_MAP).find(([k]) => raw.includes(k))?.[1] ?? 'Inne'
      map[label] = (map[label] ?? 0) + 1
    }
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [lostDeals])

  // Close rate per month (last 6)
  const closeRateTrend = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(now, 5 - i)
      const won = wonDeals.filter((d) => d.won_at && isSameMonth(new Date(d.won_at), m)).length
      const lost = lostDeals.filter((d) => d.lost_at && isSameMonth(new Date(d.lost_at), m)).length
      const total = won + lost
      return {
        month: format(m, 'MMM', { locale: pl }),
        closeRate: total > 0 ? Math.round((won / total) * 100) : 0,
        won, lost,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wonDeals, lostDeals])

  // Avg time to close
  const avgDaysToClose = useMemo(() => {
    const closed = wonDeals.filter((d) => d.won_at)
    if (closed.length === 0) return null
    const total = closed.reduce((s, d) => s + differenceInDays(new Date(d.won_at!), new Date(d.created_at)), 0)
    return Math.round(total / closed.length)
  }, [wonDeals])

  // Speed per stage (avg days in current stage for active deals)
  const speedPerStage = useMemo(() => {
    return ACTIVE_STAGES.map((stage) => {
      const stageDeals = deals.filter((d) => d.stage === stage)
      if (stageDeals.length === 0) return null
      const avgDays = stageDeals.reduce((s, d) => {
        const since = d.stage_changed_at ? new Date(d.stage_changed_at) : new Date(d.created_at)
        return s + differenceInDays(now, since)
      }, 0) / stageDeals.length
      return { stage: STAGE_LABELS[stage] ?? stage, avgDays: Math.round(avgDays), count: stageDeals.length }
    }).filter(Boolean) as { stage: string; avgDays: number; count: number }[]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals])

  return (
    <div className="space-y-4">
      <SectionHeader icon={Target} iconColor="bg-violet-500/80" title="Win / Loss Analysis" sub="Analiza zamkniętych dealów" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stat pills */}
        <div className="flex flex-col gap-3">
          <Card>
            <div className="text-xs text-white/40 mb-1">Avg czas zamknięcia</div>
            <div className="text-2xl font-bold text-white">{avgDaysToClose !== null ? `${avgDaysToClose} dni` : '—'}</div>
            <div className="text-xs text-white/30 mt-0.5">od nowy_lead → wygrana</div>
          </Card>
          <Card>
            <div className="text-xs text-white/40 mb-1">Win Rate</div>
            <div className="text-2xl font-bold text-white">
              {(wonDeals.length + lostDeals.length) > 0
                ? `${Math.round(wonDeals.length / (wonDeals.length + lostDeals.length) * 100)}%`
                : '—'}
            </div>
            <div className="text-xs text-white/30 mt-0.5">{wonDeals.length}W / {lostDeals.length}L</div>
          </Card>
        </div>

        {/* Lost reason pie */}
        <Card>
          <div className="text-sm font-medium text-white mb-3">Powody przegranej</div>
          {lostReasonData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-white/30 text-sm">Brak przegranych</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={lostReasonData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                  {lostReasonData.map((_, i) => <Cell key={i} fill={LOST_COLORS[i % LOST_COLORS.length]} />)}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} dealów`, 'Liczba']} />
                <Legend formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Close rate trend */}
        <Card>
          <div className="text-sm font-medium text-white mb-3">Close rate / miesiąc</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={closeRateTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Close rate']} />
              <Line type="monotone" dataKey="closeRate" stroke="#4ade80" strokeWidth={2} dot={{ fill: '#4ade80', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Speed per stage */}
      {speedPerStage.length > 0 && (
        <Card>
          <div className="text-sm font-medium text-white mb-1">Speed-to-close per etap</div>
          <p className="text-xs text-white/40 mb-4">Avg dni spędzonych w etapie przez aktywne deale (im więcej, tym dłużej tu utknęły)</p>
          <ResponsiveContainer width="100%" height={Math.max(120, speedPerStage.length * 36)}>
            <BarChart data={speedPerStage} layout="vertical" margin={{ left: 10, right: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" dni" />
              <YAxis type="category" dataKey="stage" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} width={76} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} dni avg`, 'Czas']} />
              <Bar dataKey="avgDays" name="Avg dni" radius={[0, 4, 4, 0]}
                fill="url(#speedGrad)"
                label={{ position: 'right', fill: 'rgba(255,255,255,0.4)', fontSize: 11, formatter: (v: unknown) => `${v}d` }}
              >
                {speedPerStage.map((entry, i) => (
                  <Cell key={i} fill={entry.avgDays > 14 ? '#f87171' : entry.avgDays > 7 ? '#fbbf24' : '#4ade80'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" />≤ 7 dni</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />8–14 dni</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />&gt; 14 dni (utknięte)</span>
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Section 3: Message A/B Testing ──────────────────────────────────────────

function ABTestingSection() {
  const [variants, setVariants] = useState<ABVariant[]>([])
  const [defaultVariant, setDefaultVariant] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('outreach_messages')
        .select('message_variant, status')
        .eq('message_type', 'dm1_icebreaker')
        .not('status', 'eq', 'draft')
      setLoading(false)
      if (!data || data.length === 0) {
        setVariants([])
        return
      }
      const map: Record<string, { sent: number; replied: number }> = {}
      for (const row of data as { message_variant?: string; status: string }[]) {
        const v = row.message_variant ?? 'Wariant A'
        if (!map[v]) map[v] = { sent: 0, replied: 0 }
        map[v].sent++
        if (row.status === 'replied_positive') map[v].replied++
      }
      const result: ABVariant[] = Object.entries(map).map(([variant, { sent, replied }]) => ({
        variant,
        sent,
        replied,
        replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
        isDefault: false,
      })).sort((a, b) => b.replyRate - a.replyRate)
      setVariants(result)
      if (result.length > 0) setDefaultVariant(result[0].variant)
    }
    load()
  }, [])

  const handleSetDefault = (variant: string) => {
    setDefaultVariant(variant)
    toast.success(`Wariant „${variant}" ustawiony jako domyślny`)
  }

  const best = variants.length > 0 ? variants[0] : null

  return (
    <div className="space-y-4">
      <SectionHeader icon={Zap} iconColor="bg-amber-500/80" title="Message A/B Testing" sub="Warianty DM1 — skuteczność wiadomości pierwszego kontaktu" />

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : variants.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-white/30 text-sm">
            Brak danych testów A/B — wyślij wiadomości z polem <code className="text-white/50">message_variant</code>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          {best && (
            <div className="px-5 py-3 bg-green-500/8 border-b border-green-500/20 flex items-center gap-3">
              <CheckCircle2 size={14} className="text-green-400" />
              <span className="text-sm text-white/80">
                Najlepszy wariant: <span className="font-semibold text-white">{best.variant}</span>
                {' '}— reply rate <span className="text-green-400 font-bold">{best.replyRate}%</span>
                {' '}({best.replied} z {best.sent})
              </span>
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Wariant', 'Wysłane', 'Odpowiedzi', 'Reply Rate', 'Status', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-white/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {variants.map((v) => {
                const isTop = v.variant === best?.variant
                const isDefault = v.variant === defaultVariant
                return (
                  <tr key={v.variant} className={`transition-colors ${isTop ? 'bg-green-500/5' : 'hover:bg-white/3'}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{v.variant}</span>
                        {isTop && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">★ Top</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-white/60">{v.sent}</td>
                    <td className="px-5 py-3 text-white/60">{v.replied}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${v.replyRate >= 30 ? 'bg-green-400' : v.replyRate >= 15 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(v.replyRate, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-semibold ${v.replyRate >= 30 ? 'text-green-400' : v.replyRate >= 15 ? 'text-amber-400' : 'text-red-400'}`}>
                          {v.replyRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {isDefault
                        ? <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Domyślny</span>
                        : <span className="text-xs text-white/30">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {!isDefault && (
                        <Button size="sm" variant="ghost" onClick={() => handleSetDefault(v.variant)}>
                          Ustaw domyślny
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

// ─── Section 4: Revenue Intelligence ─────────────────────────────────────────

function RevenueIntelligence({
  deals, income, expenses,
}: {
  deals: ReturnType<typeof useDeals>['deals']
  income: ReturnType<typeof useFinance>['income']
  expenses: ReturnType<typeof useFinance>['expenses']
}) {
  const now = new Date()

  // Forecast 30/60/90
  const recurringMonthly = useMemo(() => expenses.filter((e) => e.is_recurring).reduce((s, e) => {
    const m = e.recurring_frequency === 'quarterly' ? 1 / 3 : e.recurring_frequency === 'yearly' ? 1 / 12 : 1
    return s + e.amount * m
  }, 0), [expenses])

  const activePipelineWeighted = useMemo(
    () => deals.filter((d) => ACTIVE_STAGES.includes(d.stage as PipelineStage))
      .reduce((s, d) => s + (d.value ?? 0) * (STAGE_PROB[d.stage] ?? 0), 0),
    [deals],
  )

  const forecastRows = useMemo(() => {
    return [30, 60, 90].map((days) => {
      const limit = addDays(now, days)
      const pendingInflow = income
        .filter((i) => i.status === 'oczekujaca' && i.due_date && new Date(i.due_date) <= limit)
        .reduce((s, i) => s + i.amount, 0)
      const pipelineInflow = activePipelineWeighted * (days / 30)
      const inflow = pendingInflow + pipelineInflow
      const outflow = recurringMonthly * (days / 30)
      return {
        label: `${days} dni`,
        inflow: Math.round(inflow),
        outflow: Math.round(outflow),
        net: Math.round(inflow - outflow),
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [income, activePipelineWeighted, recurringMonthly])

  // Dynamic pricing insight
  const pricingInsight = useMemo(() => {
    const closed = deals.filter((d) => (d.stage === 'wygrana' || d.stage === 'przegrana') && d.value)
    if (closed.length < 3) return null

    const brackets = [
      { label: '< 2 000 zł', min: 0, max: 2000 },
      { label: '2 000–4 000 zł', min: 2000, max: 4000 },
      { label: '4 000–6 000 zł', min: 4000, max: 6000 },
      { label: '6 000–10 000 zł', min: 6000, max: 10000 },
      { label: '> 10 000 zł', min: 10000, max: Infinity },
    ]

    const stats = brackets.map((b) => {
      const inBracket = closed.filter((d) => (d.value ?? 0) >= b.min && (d.value ?? 0) < b.max)
      const won = inBracket.filter((d) => d.stage === 'wygrana')
      const closeRate = inBracket.length > 0 ? Math.round((won.length / inBracket.length) * 100) : 0
      const avgValue = won.length > 0 ? won.reduce((s, d) => s + (d.value ?? 0), 0) / won.length : (b.min + Math.min(b.max, 10000)) / 2
      return { ...b, count: inBracket.length, closeRate, avgValue, ev: closeRate * avgValue / 100 }
    }).filter((s) => s.count >= 2)

    if (stats.length < 2) return null
    const best = stats.reduce((a, b) => a.ev > b.ev ? a : b)
    const higher = stats.filter((s) => s.min >= best.max).sort((a, b) => a.min - b.min)[0]

    if (!higher) return null

    return {
      best,
      higher,
      revenueGain: Math.round((higher.avgValue / best.avgValue - 1) * 100),
      rateDrop: best.closeRate - higher.closeRate,
    }
  }, [deals])

  // Referral tracking
  const referralStats = useMemo(() => {
    const REFERRAL_KEYWORDS = ['poleceni', 'polecony', 'polecona', 'referral', 'ref', 'polecenie']
    const isReferral = (lead: { source?: string; notes?: string }) => {
      const text = `${lead.source ?? ''} ${lead.notes ?? ''}`.toLowerCase()
      return REFERRAL_KEYWORDS.some((k) => text.includes(k))
    }
    const referralDeals = deals.filter((d) => d.lead && isReferral(d.lead as { source?: string; notes?: string }))
    const coldDeals = deals.filter((d) => !d.lead || !isReferral(d.lead as { source?: string; notes?: string }))
    const refWon = referralDeals.filter((d) => d.stage === 'wygrana')
    const coldWon = coldDeals.filter((d) => d.stage === 'wygrana')
    const refRevenue = refWon.reduce((s, d) => s + (d.value ?? 0), 0)
    const coldRevenue = coldWon.reduce((s, d) => s + (d.value ?? 0), 0)
    const refRate = referralDeals.length > 0 ? Math.round((refWon.length / referralDeals.length) * 100) : 0
    const coldRate = coldDeals.length > 0 ? Math.round((coldWon.length / coldDeals.length) * 100) : 0
    return { referralDeals: referralDeals.length, coldDeals: coldDeals.length, refRevenue, coldRevenue, refRate, coldRate }
  }, [deals])

  const barForecastData = forecastRows.map((r) => ({
    label: r.label,
    Wpływy: r.inflow,
    Koszty: r.outflow,
    Bilans: r.net,
  }))

  return (
    <div className="space-y-4">
      <SectionHeader icon={DollarSign} iconColor="bg-green-500/80" title="Revenue Intelligence" sub="Prognoza, pricing i źródła leadów" />

      {/* Forecast bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="text-sm font-medium text-white mb-1">Prognoza cashflow</div>
          <p className="text-xs text-white/40 mb-4">Oczekujące płatności + pipeline × prob. − koszty stałe</p>
          <div className="space-y-3">
            {forecastRows.map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <div className="w-12 text-xs font-semibold text-white/50">{r.label}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-green-400">+{formatCurrency(r.inflow)}</span>
                    <span className="text-red-400">−{formatCurrency(r.outflow)}</span>
                  </div>
                  <div className="h-4 bg-white/5 rounded-full overflow-hidden flex">
                    <div className="h-full bg-green-500/50 transition-all" style={{ width: `${Math.min(60, (r.inflow / (r.inflow + r.outflow + 1)) * 100)}%` }} />
                  </div>
                </div>
                <div className={`text-sm font-bold w-24 text-right ${r.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {r.net >= 0 ? '+' : ''}{formatCurrency(r.net)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-medium text-white mb-3">Wpływy vs Koszty (prognoza)</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={barForecastData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={32} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v))} />
              <Legend formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{v}</span>} />
              <Bar dataKey="Wpływy" fill="#4ade80" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Koszty" fill="#f87171" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Dynamic pricing + Referral */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dynamic pricing */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-400" />
            <span className="text-sm font-medium text-white">Dynamic Pricing</span>
          </div>
          {pricingInsight ? (
            <div className="space-y-3">
              <div className="p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl text-sm text-white/80">
                W przedziale{' '}
                <span className="font-semibold text-white">{pricingInsight.best.label}</span>
                {' '}close rate = <span className="text-green-400 font-bold">{pricingInsight.best.closeRate}%</span>.
                {' '}Rozważ test{' '}
                <span className="font-semibold text-white">{pricingInsight.higher.label}</span>
                {' '}(est. close rate: <span className="text-amber-400 font-bold">{pricingInsight.higher.closeRate}%</span>,
                {' '}ale <span className="text-green-400 font-bold">+{pricingInsight.revenueGain}%</span> revenue per deal).
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white/5 rounded-lg">
                  <div className="text-white/40">Bieżący bracket</div>
                  <div className="font-semibold text-white mt-0.5">{pricingInsight.best.label}</div>
                  <div className="text-green-400">{pricingInsight.best.closeRate}% close rate</div>
                </div>
                <div className="p-2 bg-white/5 rounded-lg">
                  <div className="text-white/40">Testuj wyżej</div>
                  <div className="font-semibold text-white mt-0.5">{pricingInsight.higher.label}</div>
                  <div className="text-amber-400">{pricingInsight.higher.closeRate}% close rate</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-white/30 py-4 text-center">Potrzeba minimum 3 zamkniętych dealów z wartością</div>
          )}
        </Card>

        {/* Referral tracking */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={14} className="text-amber-400" />
            <span className="text-sm font-medium text-white">Referral vs Cold Outreach</span>
          </div>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 p-3 bg-green-500/8 border border-green-500/20 rounded-xl">
                <div className="text-xs text-white/40 mb-1">Z polecenia</div>
                <div className="text-xl font-bold text-white">{referralStats.referralDeals}</div>
                <div className="text-xs text-green-400 mt-0.5">{referralStats.refRate}% close rate</div>
                <div className="text-xs text-white/30 mt-1">{formatCurrency(referralStats.refRevenue)}</div>
              </div>
              <div className="flex-1 p-3 bg-blue-500/8 border border-blue-500/20 rounded-xl">
                <div className="text-xs text-white/40 mb-1">Cold outreach</div>
                <div className="text-xl font-bold text-white">{referralStats.coldDeals}</div>
                <div className="text-xs text-blue-400 mt-0.5">{referralStats.coldRate}% close rate</div>
                <div className="text-xs text-white/30 mt-1">{formatCurrency(referralStats.coldRevenue)}</div>
              </div>
            </div>
            {referralStats.referralDeals === 0 && (
              <p className="text-xs text-white/30">
                Oznacz leady z polecenia przez pole &ldquo;source&rdquo; = &ldquo;polecenie&rdquo;
              </p>
            )}
            {referralStats.refRate > referralStats.coldRate && referralStats.referralDeals > 0 && (
              <div className="p-2 bg-green-500/8 border border-green-500/20 rounded-lg text-xs text-green-400">
                Leady z polecenia zamykają się {referralStats.refRate - referralStats.coldRate}pp lepiej — warto inwestować w program poleceń.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { leads, fetch: fetchLeads } = useLeads()
  const { deals, fetch: fetchDeals } = useDeals()
  const { income, expenses, fetch: fetchFinance } = useFinance()

  useEffect(() => {
    fetchLeads()
    fetchDeals()
    fetchFinance()
  }, [fetchLeads, fetchDeals, fetchFinance])

  // Build segment stats
  const segmentStats = useMemo((): SegmentStat[] => {
    return (Object.keys(SEGMENT_LABELS) as LeadSegment[]).map((seg) => {
      const segLeads = leads.filter((l) => l.segment === seg)
      const segDeals = deals.filter((d) => {
        const lead = d.lead as { segment?: string } | undefined
        return lead && lead.segment === seg
      })
      const wonDeals = segDeals.filter((d) => d.stage === 'wygrana')
      const replyDeals = segDeals.filter((d) => REPLY_STAGES.includes(d.stage as PipelineStage))

      const replyRate = segLeads.length > 0 ? Math.round((replyDeals.length / segLeads.length) * 100) : 0
      const closeRate = segLeads.length > 0 ? Math.round((wonDeals.length / segLeads.length) * 100) : 0
      const revenue = wonDeals.reduce((s, d) => s + (d.value ?? 0), 0)
      const avgTicket = wonDeals.length > 0 ? revenue / wonDeals.length : 0

      return {
        seg,
        label: SEGMENT_LABELS[seg],
        color: SEGMENT_COLORS[seg],
        leadCount: segLeads.length,
        dealCount: segDeals.length,
        replyRate,
        closeRate,
        avgTicket,
        revenue,
      }
    }).filter((s) => s.leadCount > 0)
  }, [leads, deals])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">Analityka</h1>
        <p className="text-sm text-white/50 mt-0.5">
          Segmenty · Win/Loss · A/B testing · Revenue intelligence
        </p>
      </div>

      <SegmentPerformance stats={segmentStats} />
      <WinLossSection deals={deals} />
      <ABTestingSection />
      <RevenueIntelligence deals={deals} income={income} expenses={expenses} />
    </div>
  )
}
