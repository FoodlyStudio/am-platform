'use client'

import { useEffect, useState, useMemo } from 'react'
import { useFinance } from '@/hooks/useFinance'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Income, Expense, Deal, PipelineStage, ExpenseCategory } from '@/types'
import {
  format, subMonths, isSameMonth, startOfMonth, endOfMonth,
  isWithinInterval, addDays, differenceInDays,
} from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  ComposedChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Target,
  AlertTriangle, AlertCircle, Trophy, RefreshCw,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'

// ─── Stage conversion rates ───────────────────────────────────────────────────

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

// ─── Project type labels ──────────────────────────────────────────────────────

const PROJECT_TYPE_LABELS: Record<string, string> = {
  strona: 'Strona',
  system: 'System',
  aplikacja: 'Aplikacja',
  chatbot: 'Chatbot',
  landing: 'Landing',
  inne: 'Inne',
}

// ─── Category colors ──────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  podatki: '#f87171',
  ksiegowosc: '#fb923c',
  narzedzia: '#facc15',
  hosting: '#4ade80',
  marketing: '#34d399',
  licencje: '#60a5fa',
  sprzet: '#a78bfa',
  biuro: '#f472b6',
  podroze: '#38bdf8',
  szkolenia: '#fbbf24',
  inne: '#94a3b8',
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  podatki: 'Podatki',
  ksiegowosc: 'Księgowość',
  narzedzia: 'Narzędzia',
  hosting: 'Hosting',
  marketing: 'Marketing',
  licencje: 'Licencje',
  sprzet: 'Sprzęt',
  biuro: 'Biuro',
  podroze: 'Podróże',
  szkolenia: 'Szkolenia',
  inne: 'Inne',
}

// ─── Shared tooltip style ─────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    fontSize: 12,
  },
  itemStyle: { color: '#fff' },
  labelStyle: { color: 'rgba(255,255,255,0.6)' },
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  subPositive,
  valueColor,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  subPositive?: boolean
  valueColor?: string
}) {
  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-white/50">{label}</span>
        <Icon size={14} className="text-white/30 mt-0.5" />
      </div>
      <div className={`text-2xl font-bold ${valueColor ?? 'text-white'}`}>{value}</div>
      {sub && (
        <div className={`text-xs mt-1.5 ${subPositive === true ? 'text-green-400' : subPositive === false ? 'text-red-400' : 'text-white/40'}`}>
          {sub}
        </div>
      )}
    </Card>
  )
}

// ─── P&L Area Chart ───────────────────────────────────────────────────────────

interface PLMonthData {
  month: string
  revenue: number
  expenses: number
  profit: number
}

function PLChart({ data }: { data: PLMonthData[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f87171" stopOpacity={0.20} />
            <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          width={36}
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value) => formatCurrency(Number(value))}
        />
        <Legend formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{v}</span>} />
        <ReferenceLine y={15000} stroke="rgba(251,191,36,0.5)" strokeDasharray="4 4" label={{ value: 'Min 15k', fill: 'rgba(251,191,36,0.7)', fontSize: 10 }} />
        <ReferenceLine y={25000} stroke="rgba(74,222,128,0.5)" strokeDasharray="4 4" label={{ value: 'Cel 25k', fill: 'rgba(74,222,128,0.7)', fontSize: 10 }} />
        <Area type="monotone" dataKey="revenue" name="Przychód" stroke="#4ade80" strokeWidth={2} fill="url(#gradRevenue)" />
        <Area type="monotone" dataKey="expenses" name="Koszty" stroke="#f87171" strokeWidth={2} fill="url(#gradExpenses)" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ─── Cost Pie Chart ───────────────────────────────────────────────────────────

function CostPieChart({ expenses }: { expenses: Expense[] }) {
  const data = useMemo(() => {
    const map: Partial<Record<ExpenseCategory, number>> = {}
    for (const e of expenses) {
      map[e.category] = (map[e.category] ?? 0) + e.amount
    }
    return Object.entries(map)
      .map(([cat, val]) => ({
        name: CATEGORY_LABELS[cat as ExpenseCategory] ?? cat,
        value: val as number,
        cat: cat as ExpenseCategory,
      }))
      .sort((a, b) => b.value - a.value)
  }, [expenses])

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-white/30 text-sm">Brak kosztów w tym miesiącu</div>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
          {data.map((entry) => (
            <Cell key={entry.cat} fill={CATEGORY_COLORS[entry.cat] ?? '#94a3b8'} />
          ))}
        </Pie>
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value) => formatCurrency(Number(value))}
        />
        <Legend formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Revenue by Project Type ──────────────────────────────────────────────────

function RevenueByTypeChart({ income }: { income: Income[] }) {
  const data = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of income) {
      const key = item.project_type ?? 'inne'
      const normalised = Object.keys(PROJECT_TYPE_LABELS).includes(key) ? key : 'inne'
      map[normalised] = (map[normalised] ?? 0) + item.paid_amount
    }
    return Object.entries(map)
      .map(([type, revenue]) => ({ type: PROJECT_TYPE_LABELS[type] ?? type, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [income])

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-white/30 text-sm">Brak danych</div>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="type" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          width={36}
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value) => formatCurrency(Number(value))}
        />
        <Bar dataKey="revenue" name="Przychód" fill="#818cf8" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Cashflow Forecast Row ────────────────────────────────────────────────────

function CashflowRow({
  label,
  inflow,
  recurring,
  balance,
}: {
  label: string
  inflow: number
  recurring: number
  balance: number
}) {
  const positive = balance >= 0
  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
      <div className="w-16 text-xs font-semibold text-white/60">{label}</div>
      <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-[10px] text-white/40 mb-0.5">Wpływy</div>
          <div className="text-green-400 font-medium">{formatCurrency(inflow)}</div>
        </div>
        <div>
          <div className="text-[10px] text-white/40 mb-0.5">Koszty stałe</div>
          <div className="text-red-400 font-medium">−{formatCurrency(recurring)}</div>
        </div>
        <div>
          <div className="text-[10px] text-white/40 mb-0.5">Bilans</div>
          <div className={`font-bold ${positive ? 'text-green-400' : 'text-red-400'}`}>
            {positive ? '+' : ''}{formatCurrency(balance)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────

function AlertBanner({
  type,
  message,
}: {
  type: 'error' | 'warning' | 'success'
  message: string
}) {
  const styles = {
    error: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', Icon: AlertCircle },
    warning: { bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400', Icon: AlertTriangle },
    success: { bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-400', Icon: Trophy },
  }
  const { bg, text, Icon } = styles[type]
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${bg}`}>
      <Icon size={15} className={text} />
      <span className={`text-sm ${text}`}>{message}</span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const { income, expenses, loading, fetch: fetchFinance } = useFinance()
  const [deals, setDeals] = useState<Deal[]>([])
  const [dealsLoading, setDealsLoading] = useState(false)

  useEffect(() => {
    fetchFinance()
    const loadDeals = async () => {
      setDealsLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('deals')
        .select('id, stage, value, currency, expected_close_date, project_type')
        .not('stage', 'in', '("wygrana","przegrana")')
      setDeals((data as Deal[]) ?? [])
      setDealsLoading(false)
    }
    loadDeals()
  }, [fetchFinance])

  const now = new Date()
  const prevMonth = subMonths(now, 1)

  // ── This month vs last month ──────────────────────────────────────────────
  const thisMonthIncome = useMemo(
    () => income.filter((i) => isSameMonth(new Date(i.invoice_date ?? i.created_at), now)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [income],
  )
  const prevMonthIncome = useMemo(
    () => income.filter((i) => isSameMonth(new Date(i.invoice_date ?? i.created_at), prevMonth)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [income],
  )
  const thisMonthExpenses = useMemo(
    () => expenses.filter((e) => isSameMonth(new Date(e.expense_date), now)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses],
  )

  const thisRevenue = thisMonthIncome.reduce((s, i) => s + i.paid_amount, 0)
  const prevRevenue = prevMonthIncome.reduce((s, i) => s + i.paid_amount, 0)
  const thisCosts = thisMonthExpenses.reduce((s, e) => s + e.amount, 0)
  const thisProfit = thisRevenue - thisCosts
  const revDelta = prevRevenue > 0 ? ((thisRevenue - prevRevenue) / prevRevenue) * 100 : 0

  // ── Pipeline forecast for next month ─────────────────────────────────────
  const pipelineForecast = useMemo(() => {
    return deals.reduce((s, d) => {
      const prob = STAGE_PROB[d.stage] ?? 0
      return s + (d.value ?? 0) * prob
    }, 0)
  }, [deals])

  // ── 12-month P&L chart data ───────────────────────────────────────────────
  const plChartData = useMemo((): PLMonthData[] => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthDate = subMonths(now, 11 - i)
      const monthStart = startOfMonth(monthDate)
      const monthEnd = endOfMonth(monthDate)
      const inRange = (d: Date) => isWithinInterval(d, { start: monthStart, end: monthEnd })

      const revenue = income
        .filter((item) => inRange(new Date(item.invoice_date ?? item.created_at)))
        .reduce((s, item) => s + item.paid_amount, 0)

      const expTotal = expenses
        .filter((item) => inRange(new Date(item.expense_date)))
        .reduce((s, item) => s + item.amount, 0)

      return {
        month: format(monthDate, 'MMM', { locale: pl }),
        revenue,
        expenses: expTotal,
        profit: revenue - expTotal,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [income, expenses])

  // ── 12-month max revenue (for record detection) ───────────────────────────
  const maxHistoricRevenue = useMemo(() => {
    const prev11 = plChartData.slice(0, 11).map((d) => d.revenue)
    return prev11.length > 0 ? Math.max(...prev11) : 0
  }, [plChartData])

  // ── Cashflow forecast 30/60/90 days ──────────────────────────────────────
  const cashflowForecast = useMemo(() => {
    const today = now
    const recurringMonthly = expenses
      .filter((e) => e.is_recurring && e.recurring_frequency === 'monthly')
      .reduce((s, e) => s + e.amount, 0)
    const recurringQuarterly = expenses
      .filter((e) => e.is_recurring && e.recurring_frequency === 'quarterly')
      .reduce((s, e) => s + e.amount / 3, 0)
    const recurringYearly = expenses
      .filter((e) => e.is_recurring && e.recurring_frequency === 'yearly')
      .reduce((s, e) => s + e.amount / 12, 0)
    const monthlyFixed = recurringMonthly + recurringQuarterly + recurringYearly

    const pendingIncome = income.filter((i) => i.status === 'oczekujaca')

    const inflowWithin = (days: number) => {
      const limit = addDays(today, days)
      const fromPending = pendingIncome
        .filter((i) => i.due_date && new Date(i.due_date) <= limit)
        .reduce((s, i) => s + i.amount, 0)
      const pipelineMonths = days / 30
      const fromPipeline = pipelineForecast * pipelineMonths
      return fromPending + fromPipeline
    }

    const periods = [
      { label: '30 dni', days: 30 },
      { label: '60 dni', days: 60 },
      { label: '90 dni', days: 90 },
    ]

    return periods.map(({ label, days }) => {
      const inflow = inflowWithin(days)
      const recurring = monthlyFixed * (days / 30)
      return { label, inflow, recurring, balance: inflow - recurring }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [income, expenses, pipelineForecast])

  // ── Alerts ────────────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const list: { type: 'error' | 'warning' | 'success'; message: string }[] = []

    if (thisProfit < 15000 && (thisRevenue > 0 || thisCosts > 0)) {
      list.push({
        type: 'error',
        message: `Cashflow poniżej progu minimalnego 15 000 zł — zysk netto ten miesiąc: ${formatCurrency(thisProfit)}`,
      })
    }

    const today = now
    const overdue = income.filter((i) => {
      if (i.status === 'zalegla') return true
      if (i.status === 'oczekujaca' && i.due_date) {
        return differenceInDays(today, new Date(i.due_date)) > 0
      }
      return false
    })
    if (overdue.length > 0) {
      const total = overdue.reduce((s, i) => s + i.amount, 0)
      list.push({
        type: 'warning',
        message: `${overdue.length} zaległ${overdue.length === 1 ? 'a faktura' : 'e faktury'} — łącznie ${formatCurrency(total)} do odzyskania`,
      })
    }

    if (thisRevenue > 0 && thisRevenue > maxHistoricRevenue && maxHistoricRevenue > 0) {
      list.push({
        type: 'success',
        message: `Rekordowy miesiąc! Przychód ${formatCurrency(thisRevenue)} przekroczył poprzednie maksimum (${formatCurrency(maxHistoricRevenue)})`,
      })
    }

    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thisRevenue, thisCosts, thisProfit, income, maxHistoricRevenue])

  const isLoading = loading || dealsLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard P&amp;L</h1>
          <p className="text-sm text-white/50 mt-0.5">
            {format(now, 'LLLL yyyy', { locale: pl })} · {income.length} przychodów · {expenses.length} wydatków
          </p>
        </div>
        <button
          onClick={() => { fetchFinance() }}
          className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          title="Odśwież"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── 4 Metric Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={TrendingUp}
          label="Przychód (ten miesiąc)"
          value={formatCurrency(thisRevenue)}
          sub={
            prevRevenue > 0
              ? `${revDelta >= 0 ? '+' : ''}${revDelta.toFixed(0)}% vs ${format(prevMonth, 'MMM', { locale: pl })}`
              : undefined
          }
          subPositive={revDelta >= 0}
        />
        <MetricCard
          icon={TrendingDown}
          label="Koszty (ten miesiąc)"
          value={formatCurrency(thisCosts)}
          sub={`${thisMonthExpenses.length} pozycji`}
        />
        <MetricCard
          icon={DollarSign}
          label="Zysk netto"
          value={formatCurrency(thisProfit)}
          valueColor={thisProfit >= 0 ? 'text-green-400' : 'text-red-400'}
          sub={thisRevenue > 0 ? `Marża ${Math.round(((thisProfit) / thisRevenue) * 100)}%` : undefined}
          subPositive={thisProfit >= 0}
        />
        <MetricCard
          icon={Target}
          label="Prognoza (następny mc)"
          value={formatCurrency(pipelineForecast)}
          sub={`${deals.length} dealów w pipeline`}
          subPositive={pipelineForecast >= 15000}
        />
      </div>

      {/* ── P&L Chart ──────────────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Przychód vs Koszty — ostatnie 12 miesięcy</h2>
            <p className="text-xs text-white/40 mt-0.5">Linia docelowa 15k (min) · 25k (cel)</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />Przychód</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Koszty</span>
          </div>
        </div>
        <PLChart data={plChartData} />
      </Card>

      {/* ── Cost Breakdown + Revenue by Type ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-white">Podział kosztów</h2>
            <p className="text-xs text-white/40 mt-0.5">{format(now, 'LLLL yyyy', { locale: pl })}</p>
          </div>
          <CostPieChart expenses={thisMonthExpenses} />
        </Card>

        <Card>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-white">Przychód wg typu projektu</h2>
            <p className="text-xs text-white/40 mt-0.5">Wszystkie faktury</p>
          </div>
          <RevenueByTypeChart income={income} />
        </Card>
      </div>

      {/* ── Cashflow Forecast ───────────────────────────────────────────────── */}
      <Card>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-white">Prognoza cashflow</h2>
          <p className="text-xs text-white/40 mt-0.5">
            Oczekujące płatności + pipeline × prawdopodobieństwo − koszty stałe
          </p>
        </div>
        <div className="space-y-2">
          {cashflowForecast.map((row) => (
            <CashflowRow key={row.label} {...row} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            {
              label: 'Oczekujące faktury',
              value: income.filter((i) => i.status === 'oczekujaca').reduce((s, i) => s + i.amount, 0),
              count: income.filter((i) => i.status === 'oczekujaca').length,
              color: 'text-yellow-400',
            },
            {
              label: 'Pipeline (ważony)',
              value: pipelineForecast,
              count: deals.length,
              color: 'text-blue-400',
            },
            {
              label: 'Koszty stałe / mc',
              value: expenses.filter((e) => e.is_recurring).reduce((s, e) => {
                const m = e.recurring_frequency === 'quarterly' ? 1 / 3 : e.recurring_frequency === 'yearly' ? 1 / 12 : 1
                return s + e.amount * m
              }, 0),
              count: expenses.filter((e) => e.is_recurring).length,
              color: 'text-red-400',
            },
          ].map((item) => (
            <div key={item.label} className="bg-white/5 rounded-xl p-3">
              <div className="text-[10px] text-white/40 mb-1">{item.label}</div>
              <div className={`text-base font-bold ${item.color}`}>{formatCurrency(item.value)}</div>
              <div className="text-[10px] text-white/30 mt-0.5">{item.count} pozycji</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Alerts ─────────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Alerty</h2>
          {alerts.map((a, i) => (
            <AlertBanner key={i} type={a.type} message={a.message} />
          ))}
        </div>
      )}
    </div>
  )
}
