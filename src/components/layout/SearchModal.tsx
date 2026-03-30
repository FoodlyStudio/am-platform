'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  KanbanSquare,
  Users,
  CalendarDays,
  Sparkles,
  BookOpen,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Settings,
  ArrowRight,
  Hash,
} from 'lucide-react'

// ─── Search index ─────────────────────────────────────────────────────────────

const SEARCH_ITEMS = [
  { label: 'Pipeline',         href: '/sales',               icon: KanbanSquare,  section: 'Sprzedaż' },
  { label: 'Leady',            href: '/sales/leads',          icon: Users,         section: 'Sprzedaż' },
  { label: 'Import CSV',       href: '/sales/leads/import',   icon: Users,         section: 'Sprzedaż' },
  { label: 'Kalendarz',        href: '/content',              icon: CalendarDays,  section: 'Content' },
  { label: 'Generator AI',     href: '/content/generator',    icon: Sparkles,      section: 'Content' },
  { label: 'Bank szablonów',   href: '/content/bank',         icon: BookOpen,      section: 'Content' },
  { label: 'Dashboard P&L',    href: '/finance',              icon: BarChart3,     section: 'Finanse' },
  { label: 'Przychody',        href: '/finance/income',       icon: TrendingUp,    section: 'Finanse' },
  { label: 'Wydatki',          href: '/finance/expenses',     icon: TrendingDown,  section: 'Finanse' },
  { label: 'Ustawienia',       href: '/settings',             icon: Settings,      section: 'System' },
]

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const results = query.trim()
    ? SEARCH_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.section.toLowerCase().includes(query.toLowerCase()),
      )
    : SEARCH_ITEMS

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (results[activeIdx]) {
          router.push(results[activeIdx].href)
          onClose()
        }
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, results, activeIdx, router, onClose])

  // Reset activeIdx when results change
  useEffect(() => { setActiveIdx(0) }, [query])

  if (!open) return null

  // Group by section for display
  const grouped = results.reduce<Record<string, typeof results>>((acc, item) => {
    acc[item.section] = acc[item.section] ?? []
    acc[item.section].push(item)
    return acc
  }, {})

  let globalIdx = 0

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[560px] bg-[#0F0F1A] border border-white/10 rounded-[16px] shadow-2xl shadow-black/60 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07]">
          <Search size={16} className="text-white/35 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj strony, funkcji..."
            className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/30 outline-none"
          />
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[10px] text-white/35 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-white/30">
              <Hash size={28} strokeWidth={1.5} />
              <p className="text-sm">Brak wyników dla &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            Object.entries(grouped).map(([section, items]) => (
              <div key={section} className="mb-1">
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold tracking-widest uppercase text-white/25">
                  {section}
                </p>
                {items.map((item) => {
                  const Icon = item.icon
                  const idx = globalIdx++
                  const isActive = idx === activeIdx
                  return (
                    <button
                      key={item.href}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => { router.push(item.href); onClose() }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2.5 text-left
                        transition-colors duration-75
                        ${isActive ? 'bg-primary/10' : 'hover:bg-white/[0.04]'}
                      `}
                    >
                      <div className={`
                        w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0
                        ${isActive ? 'bg-primary/20' : 'bg-white/[0.05]'}
                      `}>
                        <Icon size={14} className={isActive ? 'text-primary' : 'text-white/50'} />
                      </div>
                      <span className={`flex-1 text-sm ${isActive ? 'text-white' : 'text-white/70'}`}>
                        {item.label}
                      </span>
                      {isActive && (
                        <ArrowRight size={13} className="text-primary flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-white/[0.07] text-[11px] text-white/25">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono text-[10px]">↑↓</kbd>
            nawigacja
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono text-[10px]">↵</kbd>
            otwórz
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono text-[10px]">ESC</kbd>
            zamknij
          </span>
        </div>
      </div>
    </div>
  )
}
