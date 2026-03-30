'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useFinance } from '@/hooks/useFinance'
import { Income, IncomeStatus, PaymentType, Deal } from '@/types'
import {
  Plus,
  TrendingUp,
  Clock,
  AlertTriangle,
  DollarSign,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
  Loader2,
  Trash2,
  Link2,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, subMonths, isSameMonth, differenceInDays } from 'date-fns'
import { pl } from 'date-fns/locale'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<IncomeStatus, { label: string; color: string; bg: string }> = {
  oczekujaca: { label: 'Oczekująca', color: '#74B9FF', bg: 'rgba(116,185,255,0.15)' },
  oplacona:   { label: 'Opłacona',   color: '#00B894', bg: 'rgba(0,184,148,0.15)' },
  czesciowa:  { label: 'Częściowa',  color: '#FDCB6E', bg: 'rgba(253,203,110,0.15)' },
  zalegla:    { label: 'Zaległa',    color: '#FD7272', bg: 'rgba(253,114,114,0.15)' },
  anulowana:  { label: 'Anulowana',  color: '#636E72', bg: 'rgba(99,110,114,0.15)' },
}

const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: 'zaliczka',          label: 'Zaliczka' },
  { value: 'rata',              label: 'Rata' },
  { value: 'platnosc_koncowa',  label: 'Płatność końcowa' },
  { value: 'jednorazowa',       label: 'Jednorazowa' },
  { value: 'abonament',         label: 'Abonament' },
]

const PROJECT_TYPES = [
  'landing', 'strona', 'aplikacja', 'chatbot', 'system', 'automatyzacja', 'inne',
]

type SortKey = 'invoice_date' | 'client_name' | 'amount' | 'status' | 'payment_type' | 'due_date'
type SortDir = 'asc' | 'desc'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysOverdue(item: Income): number {
  if (item.status === 'oplacona' || item.status === 'anulowana') return 0
  if (!item.due_date) return 0
  return Math.max(0, differenceInDays(new Date(), new Date(item.due_date)))
}

function StatusBadge({ status, daysOverdue = 0 }: { status: IncomeStatus; daysOverdue?: number }) {
  const meta = STATUS_META[status] ?? STATUS_META.oczekujaca
  const isAlert = daysOverdue > 14
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
      style={{ background: isAlert ? 'rgba(253,114,114,0.2)' : meta.bg, color: isAlert ? '#FD7272' : meta.color }}
    >
      {isAlert && <AlertTriangle size={9} />}
      {isAlert ? `Zaległe ${daysOverdue}d` : meta.label}
    </span>
  )
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={11} className="text-white/20" />
  return sortDir === 'asc'
    ? <ChevronUp size={11} className="text-primary" />
    : <ChevronDown size={11} className="text-primary" />
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  alert,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  color: string
  alert?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        alert ? 'border-accent/30 bg-accent/5' : 'border-white/8 bg-card'
      }`}
    >
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}20` }}
      >
        <Icon size={17} style={{ color }} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-white/40">{label}</p>
        <p className="text-lg font-bold text-white leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-white/30">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Income Bar Chart ─────────────────────────────────────────────────────────

function IncomeBarChart({ data }: { data: { month: string; amount: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#16213E',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#fff',
          }}
          formatter={(v) => [formatCurrency(Number(v)), 'Przychód']}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
        />
        <Bar dataKey="amount" fill="#6C5CE7" radius={[3, 3, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Income Modal ─────────────────────────────────────────────────────────────

interface IncomeForm {
  client_name: string
  project_name: string
  project_type: string
  amount: string
  currency: string
  payment_type: PaymentType
  invoice_date: string
  due_date: string
  invoice_number: string
  status: IncomeStatus
  paid_date: string
  paid_amount: string
  notes: string
  deal_id: string
}

function IncomeModal({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item?: Income | null
  onClose: () => void
  onSave: (data: Omit<Income, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}) {
  const isEdit = !!item
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [wonDeals, setWonDeals] = useState<Deal[]>([])

  const empty: IncomeForm = {
    client_name: '', project_name: '', project_type: '',
    amount: '', currency: 'PLN', payment_type: 'jednorazowa',
    invoice_date: format(new Date(), 'yyyy-MM-dd'), due_date: '',
    invoice_number: '', status: 'oczekujaca',
    paid_date: '', paid_amount: '', notes: '', deal_id: '',
  }

  const [form, setForm] = useState<IncomeForm>(
    item
      ? {
          client_name: item.client_name,
          project_name: item.project_name ?? '',
          project_type: item.project_type ?? '',
          amount: String(item.amount),
          currency: item.currency,
          payment_type: item.payment_type ?? 'jednorazowa',
          invoice_date: item.invoice_date ?? '',
          due_date: item.due_date ?? '',
          invoice_number: item.invoice_number ?? '',
          status: item.status,
          paid_date: item.paid_date ?? '',
          paid_amount: String(item.paid_amount ?? ''),
          notes: item.notes ?? '',
          deal_id: item.deal_id ?? '',
        }
      : empty,
  )

  // Fetch won deals for linking
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('deals')
        .select('id, title, value, lead:leads(first_name, last_name, company)')
        .eq('stage', 'wygrana')
        .order('won_at', { ascending: false })
        .limit(50)
      setWonDeals((data as unknown as Deal[]) ?? [])
    }
    load()
  }, [])

  const set = <K extends keyof IncomeForm>(k: K, v: IncomeForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleDealSelect = (dealId: string) => {
    const deal = wonDeals.find((d) => d.id === dealId)
    if (!deal) { set('deal_id', ''); return }
    set('deal_id', dealId)
    const lead = deal.lead as { first_name?: string; last_name?: string; company?: string } | undefined
    if (lead) {
      const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.company || ''
      if (name) set('client_name', name)
    }
    if (deal.value) set('amount', String(deal.value))
    if (deal.title) set('project_name', deal.title)
  }

  const handleSave = async () => {
    if (!form.client_name.trim()) return toast.error('Podaj nazwę klienta')
    if (!form.amount || isNaN(Number(form.amount))) return toast.error('Podaj kwotę')
    setSaving(true)
    try {
      const amt = Number(form.amount)
      await onSave({
        client_name: form.client_name.trim(),
        project_name: form.project_name || undefined,
        project_type: form.project_type || undefined,
        amount: amt,
        currency: form.currency,
        payment_type: form.payment_type,
        invoice_date: form.invoice_date || undefined,
        due_date: form.due_date || undefined,
        invoice_number: form.invoice_number || undefined,
        status: form.status,
        paid_date: form.paid_date || undefined,
        paid_amount: form.paid_amount ? Number(form.paid_amount) : (form.status === 'oplacona' ? amt : 0),
        notes: form.notes || undefined,
        deal_id: form.deal_id || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!item || !onDelete) return
    setDeleting(true)
    try { await onDelete(item.id); onClose() }
    finally { setDeleting(false) }
  }

  const field = (label: string, children: React.ReactNode, half = false) => (
    <div className={half ? '' : 'col-span-2'}>
      <label className="text-xs font-medium text-white/50 block mb-1">{label}</label>
      {children}
    </div>
  )

  const inp = ({ value, onVal, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & { onVal: (v: string) => void; value: string }) => (
    <input
      {...rest}
      value={value}
      onChange={(e) => onVal(e.target.value)}
      className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
    />
  )

  const sel = <T extends string>(
    value: T,
    onChange: (v: T) => void,
    options: { value: T; label: string }[],
  ) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-primary/40"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-card border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-sm font-semibold text-white">
            {isEdit ? 'Edytuj przychód' : 'Dodaj przychód'}
          </h2>
          <div className="flex items-center gap-2">
            {isEdit && onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 text-accent/60 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">
          <div className="grid grid-cols-2 gap-3">

            {/* Link to deal */}
            {wonDeals.length > 0 && (
              <div className="col-span-2">
                <label className="text-xs font-medium text-white/50 block mb-1 flex items-center gap-1.5">
                  <Link2 size={11} />
                  Połącz z dealem (opcjonalnie)
                </label>
                <select
                  value={form.deal_id}
                  onChange={(e) => handleDealSelect(e.target.value)}
                  className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  <option value="">— wybierz wygrany deal —</option>
                  {wonDeals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}{d.value ? ` · ${formatCurrency(d.value)}` : ''}
                    </option>
                  ))}
                </select>
                {form.deal_id && (
                  <p className="text-[10px] text-secondary mt-1">✓ Auto-wypełniono dane z deala</p>
                )}
              </div>
            )}

            {field('Klient *', inp({ value: form.client_name, onVal: (v) => set('client_name', v), placeholder: 'Nazwa klienta lub firmy' }))}
            {field('Projekt', inp({ value: form.project_name, onVal: (v) => set('project_name', v), placeholder: 'Nazwa projektu' }))}

            {field('Kwota *', inp({ type: 'number', value: form.amount, onVal: (v) => set('amount', v), placeholder: '0', min: '0' }), true)}
            {field('Waluta', inp({ value: form.currency, onVal: (v) => set('currency', v), placeholder: 'PLN' }), true)}

            {field('Typ projektu',
              <select value={form.project_type} onChange={(e) => set('project_type', e.target.value)} className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-primary/40">
                <option value="">— wybierz —</option>
                {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>,
              true
            )}
            {field('Typ płatności', sel(form.payment_type, (v) => set('payment_type', v), PAYMENT_TYPES), true)}

            {field('Data faktury', inp({ type: 'date', value: form.invoice_date, onVal: (v) => set('invoice_date', v) }), true)}
            {field('Termin płatności', inp({ type: 'date', value: form.due_date, onVal: (v) => set('due_date', v) }), true)}

            {field('Numer faktury', inp({ value: form.invoice_number, onVal: (v) => set('invoice_number', v), placeholder: 'FV/2025/01' }), true)}
            {field('Status', sel(form.status, (v) => set('status', v), Object.entries(STATUS_META).map(([k, m]) => ({ value: k as IncomeStatus, label: m.label }))), true)}

            {form.status === 'oplacona' || form.status === 'czesciowa' ? (
              <>
                {field('Data płatności', inp({ type: 'date', value: form.paid_date, onVal: (v) => set('paid_date', v) }), true)}
                {field('Kwota opłacona', inp({ type: 'number', value: form.paid_amount, onVal: (v) => set('paid_amount', v), placeholder: form.amount }), true)}
              </>
            ) : null}

            <div className="col-span-2">
              <label className="text-xs font-medium text-white/50 block mb-1">Notatki</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={2}
                placeholder="Opcjonalne notatki..."
                className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-white/10 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-colors">Anuluj</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            {isEdit ? 'Zapisz zmiany' : 'Dodaj przychód'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IncomePage() {
  const { income, loading, fetch, createIncome, updateIncome, deleteIncome } = useFinance()

  const [modal, setModal] = useState<{ open: boolean; item?: Income | null }>({ open: false })
  const [monthFilter, setMonthFilter] = useState<string>('') // 'yyyy-MM' or ''
  const [statusFilter, setStatusFilter] = useState<IncomeStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('invoice_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => { fetch() }, [fetch])

  // ─── Month options (last 12 months) ────────────────────────────────────────
  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), i)
      return { value: format(d, 'yyyy-MM'), label: format(d, 'LLLL yyyy', { locale: pl }) }
    })
  }, [])

  // ─── Overdue detection ──────────────────────────────────────────────────────
  const today = new Date()
  const overdueItems = income.filter((i) => getDaysOverdue(i) > 0)
  const overdue14 = overdueItems.filter((i) => getDaysOverdue(i) >= 14)
  const overdue30 = overdueItems.filter((i) => getDaysOverdue(i) >= 30)

  // ─── Metrics ────────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const thisMonth = income.filter(
      (i) => i.invoice_date && isSameMonth(new Date(i.invoice_date), today),
    )
    const revenueThisMonth = thisMonth.reduce((s, i) => s + i.paid_amount, 0)

    const pending = income.filter((i) => i.status === 'oczekujaca' || i.status === 'czesciowa')
    const pendingAmount = pending.reduce((s, i) => s + (i.amount - (i.paid_amount ?? 0)), 0)

    const overdueAmount = overdue14.reduce((s, i) => s + (i.amount - (i.paid_amount ?? 0)), 0)

    const paid = income.filter((i) => i.status === 'oplacona')
    const avgTicket = paid.length > 0
      ? paid.reduce((s, i) => s + i.amount, 0) / paid.length
      : 0

    return { revenueThisMonth, pendingAmount, overdueAmount, avgTicket }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [income])

  // ─── Chart data (last 6 months) ─────────────────────────────────────────────
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(today, 5 - i)
      const monthIncome = income.filter(
        (item) => item.invoice_date && isSameMonth(new Date(item.invoice_date), d),
      )
      return {
        month: format(d, 'MMM', { locale: pl }),
        amount: monthIncome.reduce((s, item) => s + item.paid_amount, 0),
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [income])

  // ─── Filtered + sorted ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...income]

    if (monthFilter) {
      list = list.filter(
        (i) => i.invoice_date && format(new Date(i.invoice_date), 'yyyy-MM') === monthFilter,
      )
    }
    if (statusFilter !== 'all') list = list.filter((i) => i.status === statusFilter)
    if (typeFilter !== 'all') list = list.filter((i) => i.project_type === typeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (i) =>
          i.client_name.toLowerCase().includes(q) ||
          (i.project_name ?? '').toLowerCase().includes(q) ||
          (i.invoice_number ?? '').toLowerCase().includes(q),
      )
    }

    list.sort((a, b) => {
      let av: string | number = 0
      let bv: string | number = 0
      if (sortKey === 'invoice_date') { av = a.invoice_date ?? ''; bv = b.invoice_date ?? '' }
      if (sortKey === 'client_name') { av = a.client_name; bv = b.client_name }
      if (sortKey === 'amount') { av = a.amount; bv = b.amount }
      if (sortKey === 'status') { av = a.status; bv = b.status }
      if (sortKey === 'payment_type') { av = a.payment_type ?? ''; bv = b.payment_type ?? '' }
      if (sortKey === 'due_date') { av = a.due_date ?? ''; bv = b.due_date ?? '' }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [income, monthFilter, statusFilter, typeFilter, search, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const handleSave = useCallback(
    async (data: Omit<Income, 'id' | 'created_at' | 'updated_at'>) => {
      if (modal.item) await updateIncome(modal.item.id, data)
      else await createIncome(data)
    },
    [modal.item, createIncome, updateIncome],
  )

  const TH = ({ col, label }: { col: SortKey; label: string }) => (
    <th
      onClick={() => handleSort(col)}
      className="text-left px-3 py-2.5 text-[11px] text-white/40 font-medium cursor-pointer hover:text-white/70 transition-colors select-none whitespace-nowrap"
    >
      <span className="flex items-center gap-1">
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  )

  const projectTypes = useMemo(
    () => [...new Set(income.map((i) => i.project_type).filter(Boolean))],
    [income],
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Przychody</h1>
          <p className="text-sm text-white/40 mt-0.5">{income.length} faktur łącznie</p>
        </div>
        <button
          onClick={() => setModal({ open: true, item: null })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} />
          Dodaj przychód
        </button>
      </div>

      {/* Overdue banner */}
      {overdue30.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/10 border border-accent/30">
          <AlertTriangle size={15} className="text-accent flex-shrink-0" />
          <p className="text-sm text-accent font-medium">
            {overdue30.length} {overdue30.length === 1 ? 'faktura zaległa' : 'faktury zaległe'} powyżej 30 dni —{' '}
            <span className="font-bold">
              {formatCurrency(overdue30.reduce((s, i) => s + i.amount - i.paid_amount, 0))}
            </span>
            {' '}niezapłacone
          </p>
          <button
            onClick={() => setStatusFilter('zalegla')}
            className="ml-auto text-xs text-accent hover:text-white border border-accent/40 hover:border-white/30 px-3 py-1 rounded-lg transition-colors"
          >
            Pokaż
          </button>
        </div>
      )}

      {/* Metrics + Chart */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 grid grid-cols-2 gap-3">
          <MetricCard
            icon={TrendingUp}
            label="Przychód ten miesiąc"
            value={formatCurrency(metrics.revenueThisMonth)}
            color="#00B894"
          />
          <MetricCard
            icon={Clock}
            label="Oczekujące płatności"
            value={formatCurrency(metrics.pendingAmount)}
            sub={`${income.filter((i) => i.status === 'oczekujaca').length} faktur`}
            color="#74B9FF"
          />
          <MetricCard
            icon={AlertTriangle}
            label="Zaległości"
            value={metrics.overdueAmount > 0 ? formatCurrency(metrics.overdueAmount) : '—'}
            sub={overdue14.length > 0 ? `${overdue14.length} faktur >14 dni` : undefined}
            color="#FD7272"
            alert={metrics.overdueAmount > 0}
          />
          <MetricCard
            icon={DollarSign}
            label="Średni ticket"
            value={metrics.avgTicket > 0 ? formatCurrency(metrics.avgTicket) : '—'}
            color="#6C5CE7"
          />
        </div>
        <div className="col-span-2 bg-card border border-white/8 rounded-xl px-4 pt-3 pb-2">
          <p className="text-[11px] text-white/40 mb-1">Przychód — ostatnie 6 miesięcy</p>
          <IncomeBarChart data={chartData} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Search */}
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj klienta, projektu..."
            className="pl-3 pr-10 py-2 bg-card border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary/40 w-52"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Month */}
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="px-3 py-2 bg-card border border-white/10 rounded-xl text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value="">Wszystkie miesiące</option>
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {/* Status */}
        <div className="flex gap-1">
          {(['all', ...Object.keys(STATUS_META)] as (IncomeStatus | 'all')[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-white/40 hover:text-white/70 bg-card border border-white/8'
              }`}
            >
              {s === 'all' ? 'Wszystkie' : STATUS_META[s as IncomeStatus].label}
            </button>
          ))}
        </div>

        {/* Project type */}
        {projectTypes.length > 0 && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-card border border-white/10 rounded-xl text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            <option value="all">Wszystkie typy</option>
            {projectTypes.map((t) => <option key={t} value={t!}>{t}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-white/8 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={20} className="animate-spin text-white/30" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-sm text-white/25">
              {income.length === 0 ? 'Brak przychodów — dodaj pierwszy' : 'Brak wyników'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/8">
                <tr>
                  <TH col="invoice_date" label="Data" />
                  <TH col="client_name" label="Klient" />
                  <th className="text-left px-3 py-2.5 text-[11px] text-white/40 font-medium whitespace-nowrap">Projekt</th>
                  <th className="text-left px-3 py-2.5 text-[11px] text-white/40 font-medium whitespace-nowrap">Typ</th>
                  <TH col="amount" label="Kwota" />
                  <TH col="status" label="Status" />
                  <TH col="payment_type" label="Płatność" />
                  <TH col="due_date" label="Termin" />
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((item) => {
                  const daysOver = getDaysOverdue(item)
                  const pmMeta = PAYMENT_TYPES.find((p) => p.value === item.payment_type)
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setModal({ open: true, item })}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                    >
                      <td className="px-3 py-3 text-xs text-white/60 whitespace-nowrap">
                        {item.invoice_date ? formatDate(item.invoice_date, 'dd MMM yyyy') : '—'}
                        {item.invoice_number && (
                          <p className="text-[10px] text-white/25">#{item.invoice_number}</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-sm text-white font-medium">{item.client_name}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-white/60 max-w-[160px] truncate">
                        {item.project_name ?? '—'}
                      </td>
                      <td className="px-3 py-3">
                        {item.project_type ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-white/50">
                            {item.project_type}
                          </span>
                        ) : <span className="text-white/20 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p className="text-sm font-bold text-secondary">
                          {formatCurrency(item.amount, item.currency)}
                        </p>
                        {item.paid_amount !== item.amount && item.paid_amount > 0 && (
                          <p className="text-[10px] text-white/30">
                            opłacono {formatCurrency(item.paid_amount)}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={item.status} daysOverdue={daysOver} />
                      </td>
                      <td className="px-3 py-3 text-xs text-white/50 whitespace-nowrap">
                        {pmMeta?.label ?? item.payment_type ?? '—'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {item.due_date ? (
                          <span className={`text-xs ${daysOver > 0 ? 'text-accent font-medium' : 'text-white/40'}`}>
                            {formatDate(item.due_date, 'dd MMM')}
                          </span>
                        ) : <span className="text-white/20 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-[10px] text-white/20 group-hover:text-white/50 transition-colors">
                          Edytuj
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Table footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 text-xs text-white/30">
              <span>{filtered.length} rekordów</span>
              <span className="font-medium text-white/50">
                Suma: {formatCurrency(filtered.reduce((s, i) => s + i.amount, 0))}
                {' '}·{' '}
                Opłacono: {formatCurrency(filtered.reduce((s, i) => s + i.paid_amount, 0))}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <IncomeModal
          item={modal.item}
          onClose={() => setModal({ open: false })}
          onSave={handleSave}
          onDelete={modal.item ? deleteIncome : undefined}
        />
      )}
    </div>
  )
}
