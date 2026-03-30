'use client'

import { useEffect, useMemo } from 'react'
import { useLeads } from '@/hooks/useLeads'
import { useDeals } from '@/hooks/useDeals'
import { formatCurrency } from '@/lib/utils'
import { LeadSegment } from '@/types'
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Users, TrendingUp, Target, Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'

// ─── Constants ────────────────────────────────────────────────────────────────

const SEGMENT_LABELS: Record<LeadSegment, string> = {
  gabinety_med: 'Gabinety med.',
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

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 },
  itemStyle: { color: '#fff' },
  labelStyle: { color: 'rgba(255,255,255,0.6)' },
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, iconBg, iconColor, label, value, sub }: {
  icon: React.ElementType; iconBg: string; iconColor: string
  label: string; value: string; sub?: string
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon size={15} className={iconColor} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/40 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-white/25 mt-1">{sub}</div>}
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SegmentsPage() {
  const { leads, fetch: fetchLeads } = useLeads()
  const { deals, fetch: fetchDeals } = useDeals()

  useEffect(() => { fetchLeads(); fetchDeals() }, [fetchLeads, fetchDeals])

  // ── Per-segment stats ─────────────────────────────────────────────────────
  const segmentStats = useMemo(() => {
    const allSegments = Object.keys(SEGMENT_LABELS) as LeadSegment[]
    return allSegments.map((seg) => {
      const segLeads = leads.filter((l) => l.segment === seg)
      const segDeals = deals.filter((d) => {
        const lead = d.lead
        return lead && (lead as { segment?: string }).segment === seg
      })
      const wonDeals = segDeals.filter((d) => d.stage === 'wygrana')
      const lostDeals = segDeals.filter((d) => d.stage === 'przegrana')
      const conversionRate = segLeads.length > 0 ? Math.round((wonDeals.length / segLeads.length) * 100) : 0
      const avgScore = segLeads.length > 0
        ? Math.round(segLeads.reduce((s, l) => s + (l.ai_score ?? 0), 0) / segLeads.filter((l) => l.ai_score).length || 0)
        : 0
      const totalRevenue = wonDeals.reduce((s, d) => s + (d.value ?? 0), 0)
      const avgDealValue = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0

      return {
        seg,
        label: SEGMENT_LABELS[seg],
        color: SEGMENT_COLORS[seg],
        leadCount: segLeads.length,
        dealCount: segDeals.length,
        wonCount: wonDeals.length,
        lostCount: lostDeals.length,
        conversionRate,
        avgScore,
        totalRevenue,
        avgDealValue,
      }
    }).filter((s) => s.leadCount > 0).sort((a, b) => b.leadCount - a.leadCount)
  }, [leads, deals])

  const totalLeads = leads.length
  const totalWon = deals.filter((d) => d.stage === 'wygrana').length
  const totalRevenue = deals.filter((d) => d.stage === 'wygrana').reduce((s, d) => s + (d.value ?? 0), 0)
  const avgScore = leads.filter((l) => l.ai_score).length > 0
    ? Math.round(leads.filter((l) => l.ai_score).reduce((s, l) => s + (l.ai_score ?? 0), 0) / leads.filter((l) => l.ai_score).length)
    : 0

  // ── Pie data ──────────────────────────────────────────────────────────────
  const pieData = segmentStats.map((s) => ({ name: s.label, value: s.leadCount, color: s.color }))

  // ── Conversion bar data ───────────────────────────────────────────────────
  const convData = [...segmentStats]
    .filter((s) => s.conversionRate > 0)
    .sort((a, b) => b.conversionRate - a.conversionRate)

  // ── Revenue bar data ──────────────────────────────────────────────────────
  const revData = [...segmentStats]
    .filter((s) => s.totalRevenue > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Segmenty klientów</h1>
        <p className="text-sm text-white/50 mt-0.5">Analiza leadów i konwersji per segment branżowy</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Users} iconBg="bg-blue-500/15" iconColor="text-blue-400"
          label="Leadów łącznie" value={String(totalLeads)} sub={`${segmentStats.length} aktywnych segmentów`} />
        <MetricCard icon={Target} iconBg="bg-green-500/15" iconColor="text-green-400"
          label="Wygranych dealów" value={String(totalWon)} sub="ze wszystkich segmentów" />
        <MetricCard icon={TrendingUp} iconBg="bg-violet-500/15" iconColor="text-violet-400"
          label="Revenue total" value={formatCurrency(totalRevenue)} sub="won deals" />
        <MetricCard icon={Star} iconBg="bg-amber-500/15" iconColor="text-amber-400"
          label="Avg AI score" value={avgScore > 0 ? `${avgScore}/10` : '—'} sub="kwalifikacja leadów" />
      </div>

      {/* Pie + Conversion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <h2 className="text-sm font-semibold text-white mb-4">Rozkład leadów wg segmentu</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} leadów`, 'Liczba']} />
              <Legend formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-white mb-1">Konwersja lead → deal (wygrany)</h2>
          <p className="text-xs text-white/40 mb-4">% leadów z segmentu, które stały się wygraną</p>
          {convData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-white/30 text-sm">Brak wygranych dealów</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={convData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="label" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Konwersja']} />
                <Bar dataKey="conversionRate" name="Konwersja %" radius={[0, 4, 4, 0]}>
                  {convData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Revenue by segment */}
      {revData.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-white mb-4">Revenue per segment</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="totalRevenue" name="Revenue" radius={[4, 4, 0, 0]}>
                {revData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Table */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Szczegóły per segment</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Segment', 'Leady', 'Deale', 'Wygrane', 'Konwersja', 'Avg score', 'Revenue', 'Avg deal'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-white/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {segmentStats.map((s) => (
                <tr key={s.seg} className="hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-white font-medium">{s.label}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-white/70">{s.leadCount}</td>
                  <td className="px-5 py-3 text-white/70">{s.dealCount}</td>
                  <td className="px-5 py-3 text-green-400 font-medium">{s.wonCount}</td>
                  <td className="px-5 py-3">
                    <span className={`font-medium ${s.conversionRate >= 20 ? 'text-green-400' : s.conversionRate >= 10 ? 'text-amber-400' : 'text-white/50'}`}>
                      {s.conversionRate}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-white/70">{s.avgScore > 0 ? `${s.avgScore}/10` : '—'}</td>
                  <td className="px-5 py-3 text-white/70">{s.totalRevenue > 0 ? formatCurrency(s.totalRevenue) : '—'}</td>
                  <td className="px-5 py-3 text-white/70">{s.avgDealValue > 0 ? formatCurrency(s.avgDealValue) : '—'}</td>
                </tr>
              ))}
              {segmentStats.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-white/30">Brak danych</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
