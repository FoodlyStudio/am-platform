import { type ClassValue, clsx } from 'clsx'
import { format, formatDistanceToNow } from 'date-fns'

// ─── Class merging ────────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  // Simple merge — install clsx if needed, otherwise just join
  return inputs
    .flat()
    .filter(Boolean)
    .join(' ')
}

// ─── Currency ─────────────────────────────────────────────────────────────────
export function formatCurrency(
  amount: number,
  currency = 'PLN',
  locale = 'pl-PL',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// ─── Dates ────────────────────────────────────────────────────────────────────
export function formatDate(date: string | Date, pattern = 'dd MMM yyyy'): string {
  return format(new Date(date), pattern)
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

// ─── String helpers ───────────────────────────────────────────────────────────
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '…'
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// ─── Numbers ──────────────────────────────────────────────────────────────────
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('pl-PL').format(n)
}

export function calcMargin(revenue: number, expenses: number): number {
  if (revenue === 0) return 0
  return Math.round(((revenue - expenses) / revenue) * 100)
}

// ─── Arrays ───────────────────────────────────────────────────────────────────
export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const group = String(item[key])
      acc[group] = acc[group] ?? []
      acc[group].push(item)
      return acc
    },
    {} as Record<string, T[]>,
  )
}
