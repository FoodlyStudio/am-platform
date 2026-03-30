'use client'

import { useEffect, useMemo } from 'react'
import { useDeals } from '@/hooks/useDeals'
import { useFinance } from '@/hooks/useFinance'
import { formatCurrency } from '@/lib/utils'
import { PipelineStage } from '@/types'
import {
  ComposedChart, Area, Bar, BarChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  format, addMonths, subMonths, isSameMonth,
  startOfMonth, endOfMonth, isWithinInterval, parseISO,
} from 'date-fns'
import { pl } from 'date-fns/locale'
import { TrendingUp, Target, AlertTriangle, DollarSign } from 'lucide-react'
import { Card } from '@/components/ui/Card'

// ─── Stage probabilities ───────────────────────────────────────────────────────

const STAGE_PROB: Record<PipelineStage, number> = {
  nowy_lead: 0.05,
  dm_wyslany: 0.10,
  odpowiedz: 0.20,
  rozmowa_umowiona: 0.35,
  diagnoza_zrobiona: 0.50,
  oferta_prezentowana: 0.65,
  negocjacje: 0.80,
  wygrana: 1.0,
  przegrana: 0,
  nie_teraz: 0.05,
}

const STAGE_LABELS: Partial<Record<PipelineStage, string>> = {
  nowy_lead: 'Nowy lead',
  dm_wyslany: 'DM wysłany',
  odpowiedz: 'Odpowiedź',
  rozmowa_umowiona: 'Rozmowa',
  diagnoza_zrobiona: 'Diagnoza',
  oferta_prezentowana: 'Oferta',
  negocjacje: 'Negocjacje',
}

const REVENUE_TARGET = 25000
const ACTIVE_STAGES: PipelineStage[] = [
  'nowy_lead', 'dm_wyslany', 'odpowiedz',
  'rozmowa_umowiona', 'diagnoza_zrobiona', 'oferta_prezentowana', 'negocjacje',
]

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 },
  itemStyle: { color: '#fff' },
  labelStyle: { color: 'rgba(255,255,255,0.6)' },
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, iconBg, iconColor, label, value, valueColor, sub }: {
  icon: React.ElementType; iconBg: string; iconColor: string
  label: string; value: string; valueColor?: string; sub?: string
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon size={15} className={iconColor} />
        </div>
      </div>
      <div className={`text-2xl font-bold ${valueColor ?? 'text-white'}`}>{value}</div>
      <div className="text-xs text-white/40 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-white/25 mt-1">{sub}</div>}
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ForecastPage() {
  const { deals, fetch: fetchDeals } = useDeals()
  const { income, expenses, fetch: fetchFinance } = useFinance()

  useEffect(() => { fetchDeals(); fetchFinance() }, [fetchDeals, fetchFinance])

  const now = new Date()

  const activeDeals = useMemo(
    () => deals.filter((d) => ACTIVE_STAGES.includes(d.stage as PipelineStage)),
    [deals],
  )

  // ── Weighted pipeline value ───────────────────────────────────────────────
  const pipelineWeighted = useMemo(
    () => activeDeals.reduce((s, d) => s + (d.value ?? 0) * (STAGE_PROB[d.stage] ?? 0), 0),
    [activeDeals],
  )
  const pipelineTotal = useMemo(
    () => activeDeals.reduce((s, d) => s + (d.value ?? 0), 0),
    [activeDeals],
  )

  // ── Best / worst case (weighted ± 30%) ───────────────────────────────────
  const bestCase = pipelineWeighted * 1.3
  const worstCase = pipelineWeighted * 0.7

  // ── Combined historical + forecast 12-month chart ─────────────────────────
  const chartData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => subMonths(now, 5 - i + 0))
    // Replace: 6 past + 6 future
    return Array.from({ length: 12 }, (_, i) => {
      const m = subMonths(now, 5 - i)
      const isPast = m < startOfMonth(now)
      const isCurrent = isSameMonth(m, now)

      // Historical actual revenue
      let actual = 0
      if (isPast || isCurrent) {
        const start = startOfMonth(m)
        const end = endOfMonth(m)
        actual = income
          .filter((item) => isWithinInterval(new Date(item.invoice_date ?? item.created_at), { start, end }))
          .reduce((s, item) => s + item.paid_amount, 0)
      }

      // Forecast: deals with expected_close_date in this month
      let forecast = 0
      if (!isPast || isCurrent) {
        const monthStart = startOfMonth(m)
        const monthEnd = endOfMonth(m)
        forecast = activeDeals
          .filter((d) => {
            if (!d.expected_close_date) return false
            const closeDate = parseISO(d.expected_close_date)
            return closeDate >= monthStart && closeDate <= monthEnd
          })
          .reduce((s, d) => s + (d.value ?? 0) * (STAGE_PROB[d.stage] ?? 0), 0)

        // If no specific close dates, distribute pipeline evenly over next 3 months
        if (forecast === 0 && !isPast) {
          const dealsWithoutDate = activeDeals.filter((d) => !d.expected_close_date)
          forecast = dealsWithoutDate.reduce((s, d) => s + (d.value ?? 0) * (STAGE_PROB[d.stage] ?? 0), 0) / 3
        }
      }

      return {
        month: format(m, 'MMM yy', { locale: pl }),
        actual: isPast || isCurrent ? actual : undefined,
        forecast: !isPast ? Math.round(forecast) : undefined,
        target: REVENUE_TARGET,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [income, activeDeals])

  // ── Pipeline by stage (weighted bar) ─────────────────────────────────────
  const stagePipelineData = useMemo(() => {
    return ACTIVE_STAGES.map((stage) => {
      const stageDeals = activeDeals.filter((d) => d.stage === stage)
      const total = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0)
      const weighted = stageDeals.reduce((s, d) => s + (d.value ?? 0) * (STAGE_PROB[stage] ?? 0), 0)
      return {
        stage: STAGE_LABELS[stage] ?? stage,
        total: Math.round(total),
        weighted: Math.round(weighted),
        count: stageDeals.length,
        probability: Math.round((STAGE_PROB[stage] ?? 0) * 100),
      }
    }).filter((s) => s.count > 0)
  }, [activeDeals])

  // ── Monthly cost run-rate ─────────────────────────────────────────────────
  const monthlyCostRunrate = useMemo(() => {
    return expenses.filter((e) => e.is_recurring).reduce((s, e) => {
      const mult = e.recurring_frequency === 'quarterly' ? 1 / 3 : e.recurring_frequency === 'yearly' ? 1 / 12 : 1
      return s + e.amount * mult
    }, 0)
  }, [expenses])

  // ── This month revenue MTD ────────────────────────────────────────────────
  const revenueMtd = useMemo(
    () => income
      .filter((i) => isSameMonth(new Date(i.invoice_date ?? i.created_at), now))
      .reduce((s, i) => s + i.paid_amount, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [income],
  )

  const remainingTarget = Math.max(0, REVENUE_TARGET - revenueMtd)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Revenue Forecast</h1>
        <p className="text-sm text-white/50 mt-0.5">Prognoza przychodów na podstawie pipeline i historii</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={TrendingUp} iconBg="bg-violet-500/15" iconColor="text-violet-400"
          label="Pipeline (ważony)" value={formatCurrency(pipelineWeighted)}
          sub={`z ${formatCurrency(pipelineTotal)} łącznie`} />
        <MetricCard icon={Target} iconBg="bg-green-500/15" iconColor="text-green-400"
          label="Best case" value={formatCurrency(bestCase)}
          valueColor="text-green-400" sub="+30% od ważonego" />
        <MetricCard icon={AlertTriangle} iconBg="bg-amber-500/15" iconColor="text-amber-400"
          label="Worst case" value={formatCurrency(worstCase)}
          valueColor="text-amber-400" sub="-30% od ważonego" />
        <MetricCard icon={DollarSign} iconBg="bg-blue-500/15" iconColor="text-blue-400"
          label="Do celu miesięcznie" value={formatCurrency(remainingTarget)}
          sub={`MTD: ${formatCurrency(revenueMtd)} / ${formatCurrency(REVENUE_TARGET)}`} />
      </div>

      {/* 12-month area chart */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Historia + prognoza — 12 miesięcy</h2>
            <p className="text-xs text-white/40 mt-0.5">Zielony: faktyczny · Fioletowy: prognoza pipeline · Linia: target 25k</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.20} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              width={36}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(v) => formatCurrency(Number(v))}
            />
            <Legend formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{v}</span>} />
            <ReferenceLine y={REVENUE_TARGET} stroke="rgba(251,191,36,0.5)" strokeDasharray="4 4"
              label={{ value: 'Target 25k', fill: 'rgba(251,191,36,0.6)', fontSize: 10 }} />
            <Area type="monotone" dataKey="actual" name="Przychód" stroke="#4ade80" strokeWidth={2} fill="url(#gradActual)" connectNulls={false} />
            <Area type="monotone" dataKey="forecast" name="Prognoza" stroke="#a78bfa" strokeWidth={2} fill="url(#gradForecast)" strokeDasharray="5 3" connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Stage pipeline breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <h2 className="text-sm font-semibold text-white mb-1">Wartość pipeline per etap</h2>
          <p className="text-xs text-white/40 mb-4">Nominalna vs ważona (× prawdopodobieństwo)</p>
          {stagePipelineData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-white/30 text-sm">Brak aktywnych dealów</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stagePipelineData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="stage" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v))} />
                <Legend formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{v}</span>} />
                <Bar dataKey="total" name="Nominalna" fill="rgba(129,140,248,0.3)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="weighted" name="Ważona" fill="#818cf8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Summary table */}
        <Card>
          <h2 className="text-sm font-semibold text-white mb-4">Zestawienie pipeline</h2>
          <div className="space-y-2">
            {stagePipelineData.map((s) => (
              <div key={s.stage} className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm text-white font-medium">{s.stage}</div>
                  <div className="text-xs text-white/40">{s.count} deal{s.count !== 1 ? 'e' : ''} · {s.probability}% prob.</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">{formatCurrency(s.weighted)}</div>
                  <div className="text-xs text-white/30">{formatCurrency(s.total)}</div>
                </div>
              </div>
            ))}
            {stagePipelineData.length === 0 && (
              <div className="text-center py-8 text-white/30 text-sm">Brak aktywnych dealów w pipeline</div>
            )}
            {stagePipelineData.length > 0 && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 mt-2 pt-3">
                <span className="text-xs font-semibold text-white/60">SUMA WAŻONA</span>
                <span className="text-base font-bold text-violet-400">{formatCurrency(pipelineWeighted)}</span>
              </div>
            )}
          </div>

          {/* Cost run-rate warning */}
          {monthlyCostRunrate > 0 && (
            <div className="mt-4 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
              <div className="text-xs text-amber-400 font-medium mb-1">Koszty stałe / miesiąc</div>
              <div className="text-base font-bold text-white">{formatCurrency(monthlyCostRunrate)}</div>
              <div className="text-xs text-white/40 mt-0.5">
                Prognoza netto: {formatCurrency(pipelineWeighted / 3 - monthlyCostRunrate)} / mc
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
