'use client'

import { Expense } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ExpenseTrackerProps {
  expenses: Expense[]
}

const categoryColors: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger' | 'purple'> = {
  podatki:    'danger',
  ksiegowosc: 'warning',
  narzedzia:  'info',
  hosting:    'info',
  marketing:  'purple',
  licencje:   'default',
  sprzet:     'default',
  biuro:      'default',
  podroze:    'default',
  szkolenia:  'success',
  inne:       'default',
}

export function ExpenseTracker({ expenses }: ExpenseTrackerProps) {
  return (
    <div className="flex flex-col gap-2">
      {expenses.length === 0 && (
        <p className="text-sm text-white/30 text-center py-8">Brak wydatków</p>
      )}
      {expenses.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center gap-4 p-3 bg-card rounded-xl border border-white/5"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{tx.description}</p>
            <p className="text-xs text-white/40">{formatDate(tx.expense_date)}</p>
          </div>
          <Badge variant={categoryColors[tx.category] ?? 'default'}>{tx.category}</Badge>
          <span className="text-sm font-semibold text-accent whitespace-nowrap">
            -{formatCurrency(tx.amount, tx.currency)}
          </span>
        </div>
      ))}
    </div>
  )
}
