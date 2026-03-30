'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useFinance } from '@/hooks/useFinance'
import { Expense, ExpenseCategory } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { format, isSameMonth, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  TrendingDown,
  RefreshCw,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import toast from 'react-hot-toast'

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'podatki', label: 'Podatki' },
  { value: 'ksiegowosc', label: 'Księgowość' },
  { value: 'narzedzia', label: 'Narzędzia' },
  { value: 'hosting', label: 'Hosting' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'licencje', label: 'Licencje' },
  { value: 'sprzet', label: 'Sprzęt' },
  { value: 'biuro', label: 'Biuro' },
  { value: 'podroze', label: 'Podróże' },
  { value: 'szkolenia', label: 'Szkolenia' },
  { value: 'inne', label: 'Inne' },
]

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

const FREQ_LABELS: Record<string, string> = {
  monthly: 'Co miesiąc',
  quarterly: 'Co kwartał',
  yearly: 'Co rok',
}

function catLabel(cat: ExpenseCategory) {
  return CATEGORIES.find((c) => c.value === cat)?.label ?? cat
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  positive,
}: {
  label: string
  value: string
  sub?: string
  positive?: boolean
}) {
  return (
    <Card>
      <div className="text-xs text-white/50 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && (
        <div className={`text-xs mt-1 ${positive === true ? 'text-green-400' : positive === false ? 'text-red-400' : 'text-white/40'}`}>
          {sub}
        </div>
      )}
    </Card>
  )
}

// ─── Quick Add Bar ────────────────────────────────────────────────────────────

interface QuickAddBarProps {
  onAdd: (data: Omit<Expense, 'id' | 'created_at'>) => Promise<void>
}

function QuickAddBar({ onAdd }: QuickAddBarProps) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('narzedzia')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [saving, setSaving] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    const num = parseFloat(amount.replace(',', '.'))
    if (!num || num <= 0) { toast.error('Podaj kwotę'); return }
    if (!description.trim()) { toast.error('Podaj opis'); return }
    setSaving(true)
    await onAdd({
      amount: num,
      currency: 'PLN',
      category,
      description: description.trim(),
      expense_date: date,
      is_recurring: isRecurring,
      recurring_frequency: isRecurring ? frequency : undefined,
    })
    setAmount('')
    setDescription('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setIsRecurring(false)
    setSaving(false)
    amountRef.current?.focus()
  }

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            ref={amountRef}
            type="text"
            inputMode="decimal"
            placeholder="Kwota (PLN)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-36 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} className="bg-[#1a1a2e]">{c.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Opis wydatku"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="flex-1 min-w-[160px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
          />
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Dodawanie...' : '+ Dodaj'}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="accent-primary"
            />
            <span className="text-xs text-white/60">Wydatek cykliczny</span>
          </label>
          {isRecurring && (
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as typeof frequency)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="monthly" className="bg-[#1a1a2e]">Co miesiąc</option>
              <option value="quarterly" className="bg-[#1a1a2e]">Co kwartał</option>
              <option value="yearly" className="bg-[#1a1a2e]">Co rok</option>
            </select>
          )}
        </div>
      </div>
    </Card>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  expense: Expense
  onSave: (id: string, updates: Partial<Expense>) => Promise<void>
  onClose: () => void
}

function EditModal({ expense, onSave, onClose }: EditModalProps) {
  const [amount, setAmount] = useState(String(expense.amount))
  const [category, setCategory] = useState<ExpenseCategory>(expense.category)
  const [description, setDescription] = useState(expense.description)
  const [date, setDate] = useState(expense.expense_date)
  const [isRecurring, setIsRecurring] = useState(expense.is_recurring ?? false)
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'yearly'>(
    expense.recurring_frequency ?? 'monthly',
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const num = parseFloat(amount.replace(',', '.'))
    if (!num || num <= 0) { toast.error('Podaj kwotę'); return }
    setSaving(true)
    await onSave(expense.id, {
      amount: num,
      category,
      description,
      expense_date: date,
      is_recurring: isRecurring,
      recurring_frequency: isRecurring ? frequency : undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-base font-semibold text-white">Edytuj wydatek</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Kwota (PLN)</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Kategoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-[#1a1a2e]">{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Opis</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="accent-primary"
            />
            <span className="text-xs text-white/60">Wydatek cykliczny</span>
          </label>
          {isRecurring && (
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as typeof frequency)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            >
              <option value="monthly" className="bg-[#1a1a2e]">Co miesiąc</option>
              <option value="quarterly" className="bg-[#1a1a2e]">Co kwartał</option>
              <option value="yearly" className="bg-[#1a1a2e]">Co rok</option>
            </select>
          )}
        </div>
        <div className="flex gap-2 mt-5 justify-end">
          <Button size="sm" variant="ghost" onClick={onClose}>Anuluj</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Expenses Month Group ─────────────────────────────────────────────────────

interface MonthGroupProps {
  label: string
  items: Expense[]
  onEdit: (e: Expense) => void
  onDelete: (id: string) => void
}

function MonthGroup({ label, items, onEdit, onDelete }: MonthGroupProps) {
  const [open, setOpen] = useState(true)
  const total = items.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/8 transition-colors"
      >
        <span className="text-sm font-medium text-white capitalize">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white/70">{formatCurrency(total)}</span>
          {open ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
        </div>
      </button>
      {open && (
        <div className="divide-y divide-white/5">
          {items.map((exp) => (
            <div key={exp.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 group">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[exp.category] }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white truncate">{exp.description}</span>
                  {exp.is_recurring && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {FREQ_LABELS[exp.recurring_frequency ?? 'monthly']}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-white/40">{catLabel(exp.category)}</span>
                  <span className="text-[11px] text-white/30">
                    {format(new Date(exp.expense_date), 'd MMM', { locale: pl })}
                  </span>
                </div>
              </div>
              <span className="text-sm font-semibold text-white">{formatCurrency(exp.amount)}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(exp)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => onDelete(exp.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Pie Chart ────────────────────────────────────────────────────────────────

function ExpensePieChart({ expenses }: { expenses: Expense[] }) {
  const data = useMemo(() => {
    const map: Partial<Record<ExpenseCategory, number>> = {}
    for (const e of expenses) {
      map[e.category] = (map[e.category] ?? 0) + e.amount
    }
    return Object.entries(map)
      .map(([cat, value]) => ({ name: catLabel(cat as ExpenseCategory), value: value as number, cat: cat as ExpenseCategory }))
      .sort((a, b) => b.value - a.value)
  }, [expenses])

  if (data.length === 0) return null

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.cat} fill={CATEGORY_COLORS[entry.cat]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
            itemStyle={{ color: '#fff' }}
            labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
          />
          <Legend
            formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Recurring Section ────────────────────────────────────────────────────────

interface RecurringSectionProps {
  recurring: Expense[]
  onEdit: (e: Expense) => void
  onDelete: (id: string) => void
}

function RecurringSection({ recurring, onEdit, onDelete }: RecurringSectionProps) {
  const monthlyEquivalent = useMemo(() => {
    return recurring.reduce((s, e) => {
      const mult = e.recurring_frequency === 'quarterly' ? 1 / 3 : e.recurring_frequency === 'yearly' ? 1 / 12 : 1
      return s + e.amount * mult
    }, 0)
  }, [recurring])

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Koszty stałe</h2>
          <p className="text-xs text-white/40 mt-0.5">Wydatki cykliczne — automatycznie powtarzane</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/40">Miesięcznie ~</div>
          <div className="text-lg font-bold text-white">{formatCurrency(monthlyEquivalent)}</div>
        </div>
      </div>
      {recurring.length === 0 ? (
        <p className="text-sm text-white/30 text-center py-6">Brak wydatków cyklicznych</p>
      ) : (
        <div className="space-y-2">
          {recurring.map((exp) => (
            <div
              key={exp.id}
              className="flex items-center gap-3 px-3 py-2.5 bg-white/5 rounded-lg hover:bg-white/8 group transition-colors"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[exp.category] }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{exp.description}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-white/40">{catLabel(exp.category)}</span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">
                    {FREQ_LABELS[exp.recurring_frequency ?? 'monthly']}
                  </span>
                </div>
              </div>
              <span className="text-sm font-semibold text-white">{formatCurrency(exp.amount)}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(exp)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => onDelete(exp.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const { expenses, loading, fetch, createExpense, updateExpense, deleteExpense } = useFinance()
  const [filterMonth, setFilterMonth] = useState<string>(format(new Date(), 'yyyy-MM'))
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all')
  const [editExpense, setEditExpense] = useState<Expense | null>(null)

  useEffect(() => { fetch() }, [fetch])

  // Metrics
  const now = new Date()
  const prevMonth = subMonths(now, 1)

  const thisMonthExpenses = useMemo(
    () => expenses.filter((e) => isSameMonth(new Date(e.expense_date), now)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses],
  )

  const prevMonthExpenses = useMemo(
    () => expenses.filter((e) => isSameMonth(new Date(e.expense_date), prevMonth)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses],
  )

  const thisMonthTotal = thisMonthExpenses.reduce((s, e) => s + e.amount, 0)
  const prevMonthTotal = prevMonthExpenses.reduce((s, e) => s + e.amount, 0)
  const delta = prevMonthTotal > 0 ? ((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0

  const recurring = useMemo(() => expenses.filter((e) => e.is_recurring), [expenses])
  const recurringThisMonth = recurring.reduce((s, e) => s + e.amount, 0)
  const variableThisMonth = thisMonthTotal - thisMonthExpenses.filter((e) => e.is_recurring).reduce((s, e) => s + e.amount, 0)

  // Filtered list
  const filtered = useMemo(() => {
    const [year, month] = filterMonth.split('-').map(Number)
    const start = startOfMonth(new Date(year, month - 1))
    const end = endOfMonth(new Date(year, month - 1))
    return expenses.filter((e) => {
      const inRange = isWithinInterval(new Date(e.expense_date), { start, end })
      const inCat = filterCategory === 'all' || e.category === filterCategory
      return inRange && inCat
    })
  }, [expenses, filterMonth, filterCategory])

  // Group by month
  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>()
    for (const e of filtered) {
      const key = format(new Date(e.expense_date), 'LLLL yyyy', { locale: pl })
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return Array.from(map.entries())
  }, [filtered])

  // Month options for filter
  const monthOptions = useMemo(() => {
    const opts: string[] = []
    for (let i = 0; i < 12; i++) {
      opts.push(format(subMonths(now, i), 'yyyy-MM'))
    }
    return opts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAdd = async (data: Omit<Expense, 'id' | 'created_at'>) => {
    await createExpense(data)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Usunąć wydatek?')) return
    await deleteExpense(id)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Tracker wydatków</h1>
          <p className="text-sm text-white/50 mt-0.5">{expenses.length} wydatków łącznie</p>
        </div>
        <button
          onClick={fetch}
          className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          title="Odśwież"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Wydatki ten miesiąc"
          value={formatCurrency(thisMonthTotal)}
          sub={delta !== 0 ? `${delta > 0 ? '+' : ''}${delta.toFixed(0)}% vs poprzedni` : undefined}
          positive={delta < 0}
        />
        <MetricCard label="Koszty stałe" value={formatCurrency(recurringThisMonth)} />
        <MetricCard label="Koszty zmienne" value={formatCurrency(variableThisMonth)} />
        <MetricCard
          label="vs poprzedni miesiąc"
          value={formatCurrency(prevMonthTotal)}
          sub={prevMonthTotal > 0 ? format(prevMonth, 'LLLL', { locale: pl }) : '—'}
        />
      </div>

      {/* Quick Add */}
      <QuickAddBar onAdd={handleAdd} />

      {/* Recurring */}
      <RecurringSection recurring={recurring} onEdit={setEditExpense} onDelete={handleDelete} />

      {/* List + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <TrendingDown size={14} className="text-white/40" />
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m} className="bg-[#1a1a2e]">
                  {format(new Date(m + '-01'), 'LLLL yyyy', { locale: pl })}
                </option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory | 'all')}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="all" className="bg-[#1a1a2e]">Wszystkie kategorie</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-[#1a1a2e]">{c.label}</option>
              ))}
            </select>
            <span className="text-xs text-white/40">{filtered.length} pozycji · {formatCurrency(filtered.reduce((s, e) => s + e.amount, 0))}</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-sm">Brak wydatków w tym okresie</div>
          ) : (
            <div className="space-y-3">
              {grouped.map(([label, items]) => (
                <MonthGroup
                  key={label}
                  label={label}
                  items={items}
                  onEdit={setEditExpense}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pie Chart */}
        <div>
          <Card>
            <div className="text-sm font-semibold text-white mb-1">Podział wg kategorii</div>
            <div className="text-xs text-white/40 mb-4">
              {format(new Date(filterMonth + '-01'), 'LLLL yyyy', { locale: pl })}
            </div>
            <ExpensePieChart expenses={filtered} />
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      {editExpense && (
        <EditModal
          expense={editExpense}
          onSave={updateExpense}
          onClose={() => setEditExpense(null)}
        />
      )}
    </div>
  )
}
