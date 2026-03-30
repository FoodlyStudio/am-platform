'use client'

import { useEffect, useMemo } from 'react'
import { useDeals } from '@/hooks/useDeals'
import { formatCurrency } from '@/lib/utils'
import { PipelineStage } from '@/types'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { format, subMonths, isSameMonth } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Trophy, TrendingDown, DollarSign, Percent } from 'lucide-react'
import { Card } from '@/components/ui/Card'

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_LABELS: Partial<Record<PipelineStage, string>> = {
  nowy_lead: 'Nowy lead',
  dm_wyslany: 'DM wysłany',
  odpowiedz: 'Odpowiedź',
  rozmowa_umowiona: 'Rozmowa',
  diagnoza_zrobiona: 'Diagnoza',
  oferta_prezentowana: 'Oferta',
  negocjacje: 'Negocjacje',
  wygrana: 'Wygrana',
  przegrana: 'Przegrana',
}

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

// ─── Win Rate Gauge ───────────────────────────────────────────────────────────

function WinRateGauge({ rate }: { rate: number }) {
  const color = rate >= 50 ? '#4ade80' : rate >= 30 ? '#fbbf24' : '#f87171'
  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${(rate / 100) * 251.2} 251.2`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{rate}%</span>
          <span className="text-xs text-white/40">win rate</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WinLossPage() {
  const { deals, fetch: fetchDeals } = useDeals()

  useEffect(() => { fetchDeals() }, [fetchDeals])

  const now = new Date()

  const wonDeals = useMemo(() => deals.filter((d) => d.stage === 'wygrana'), [deals])
  const lostDeals = useMemo(() => deals.filter((d) => d.stage === 'przegrana'), [deals])
  const closedDeals = wonDeals.length + lostDeals.length

  const winRate = closedDeals > 0 ? Math.round((wonDeals.length / closedDeals) * 100) : 0
  const wonRevenue = wonDeals.reduce((s, d) => s + (d.value ?? 0), 0)
  const avgWonValue = wonDeals.length > 0 ? wonRevenue / wonDeals.length : 0
  const avgLostValue = lostDeals.length > 0
    ? lostDeals.reduce((s, d) => s + (d.value ?? 0), 0) / lostDeals.length
    : 0

  // ── Lost reasons ─────────────────────────────────────────────────────────
  const lostReasons = useMemo(() => {
    const map: Record<string, number> = {}
    for (const d of lostDeals) {
      const reason = d.lost_reason ?? 'Nie podano'
      map[reason] = (map[reason] ?? 0) + 1
    }
    return Object.entries(map)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
  }, [lostDeals])

  const lostReasonColors = ['#f87171', '#fb923c', '#fbbf24', '#94a3b8', '#60a5fa', '#a78bfa']

  // ── Win/loss by month (last 6) ────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(now, 5 - i)
      const won = wonDeals.filter((d) => d.won_at && isSameMonth(new Date(d.won_at), m)).length
      const lost = lostDeals.filter((d) => d.lost_at && isSameMonth(new Date(d.lost_at), m)).length
      return {
        month: format(m, 'MMM', { locale: pl }),
        won,
        lost,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wonDeals, lostDeals])

  // ── Funnel drop-off ───────────────────────────────────────────────────────
  const FUNNEL_STAGES: PipelineStage[] = [
    'dm_wyslany', 'odpowiedz', 'rozmowa_umowiona',
    'diagnoza_zrobiona', 'oferta_prezentowana', 'negocjacje', 'wygrana',
  ]
  const funnelData = useMemo(() => {
    return FUNNEL_STAGES.map((stage) => ({
      stage: STAGE_LABELS[stage] ?? stage,
      count: deals.filter((d) => {
        const order = FUNNEL_STAGES.indexOf(d.stage as PipelineStage)
        const stageOrder = FUNNEL_STAGES.indexOf(stage)
        return order >= stageOrder || d.stage === 'wygrana'
      }).length,
    })).reverse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Win / Loss</h1>
        <p className="text-sm text-white/50 mt-0.5">Analiza wygranych i przegranych dealów</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Percent} iconBg="bg-green-500/15" iconColor="text-green-400"
          label="Win rate" value={`${winRate}%`}
          valueColor={winRate >= 50 ? 'text-green-400' : winRate >= 30 ? 'text-amber-400' : 'text-red-400'}
          sub={`${wonDeals.length} wygranych z ${closedDeals} zamkniętych`} />
        <MetricCard icon={Trophy} iconBg="bg-amber-500/15" iconColor="text-amber-400"
          label="Revenue wygrany" value={formatCurrency(wonRevenue)} sub={`${wonDeals.length} dealów`} />
        <MetricCard icon={DollarSign} iconBg="bg-blue-500/15" iconColor="text-blue-400"
          label="Avg wartość (won)" value={avgWonValue > 0 ? formatCurrency(avgWonValue) : '—'}
          sub={avgLostValue > 0 ? `Lost: avg ${formatCurrency(avgLostValue)}` : undefined} />
        <MetricCard icon={TrendingDown} iconBg="bg-red-500/15" iconColor="text-red-400"
          label="Przegrane deale" value={String(lostDeals.length)}
          sub={closedDeals > 0 ? `${100 - winRate}% zamkniętych` : undefined} />
      </div>

      {/* Win Rate Gauge + Monthly chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="flex flex-col items-center justify-center">
          <h2 className="text-sm font-semibold text-white text-center mb-2">Win Rate łącznie</h2>
          <WinRateGauge rate={winRate} />
          <div className="flex gap-6 mt-2">
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">{wonDeals.length}</div>
              <div className="text-xs text-white/40">Wygrane</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-400">{lostDeals.length}</div>
              <div className="text-xs text-white/40">Przegrane</div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-4">Wygrane vs Przegrane — ostatnie 6 miesięcy</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{v}</span>} />
              <Bar dataKey="won" name="Wygrane" fill="#4ade80" radius={[3, 3, 0, 0]} />
              <Bar dataKey="lost" name="Przegrane" fill="#f87171" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Lost Reasons + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <h2 className="text-sm font-semibold text-white mb-1">Powody przegranych</h2>
          <p className="text-xs text-white/40 mb-4">Pole &ldquo;lost_reason&rdquo; ze zamkniętych dealów</p>
          {lostReasons.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-white/30 text-sm">Brak przegranych dealów</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={lostReasons} dataKey="count" nameKey="reason" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {lostReasons.map((_, i) => <Cell key={i} fill={lostReasonColors[i % lostReasonColors.length]} />)}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} dealów`, 'Liczba']} />
                <Legend formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-white mb-1">Lejek sprzedażowy</h2>
          <p className="text-xs text-white/40 mb-4">Liczba dealów docierających do każdego etapu</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="stage" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} dealów`, 'Liczba']} />
              <Bar dataKey="count" name="Deale" fill="#818cf8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Lost deals table */}
      {lostDeals.length > 0 && (
        <Card padding="none">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Przegrane deale</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['Deal', 'Wartość', 'Etap przegrania', 'Powód', 'Data'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-white/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {lostDeals.slice(0, 15).map((d) => (
                  <tr key={d.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3 text-white font-medium">{d.title}</td>
                    <td className="px-5 py-3 text-white/60">{d.value ? formatCurrency(d.value) : '—'}</td>
                    <td className="px-5 py-3 text-white/60">Przegrana</td>
                    <td className="px-5 py-3">
                      <span className="text-xs bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full">
                        {d.lost_reason ?? 'Nie podano'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white/40 text-xs">
                      {d.lost_at ? format(new Date(d.lost_at), 'd MMM yyyy', { locale: pl }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
