'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import {
  Zap,
  KanbanSquare,
  Users,
  Upload,
  Send,
  CalendarDays,
  Sparkles,
  BookOpen,
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  Target,
  LineChart,
  Settings,
  ChevronLeft,
  X,
} from 'lucide-react'
import { useLayout } from './LayoutContext'

// ─── Nav definition ──────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    id: 'sales',
    section: 'Sprzedaż',
    items: [
      { href: '/sales',              label: 'Pipeline',       icon: KanbanSquare },
      { href: '/sales/leads',        label: 'Leady',          icon: Users },
      { href: '/sales/leads/import', label: 'Import CSV',     icon: Upload },
      { href: '/sales/outreach',     label: 'Outreach Queue', icon: Send },
    ],
  },
  {
    id: 'content',
    section: 'Content',
    items: [
      { href: '/content',            label: 'Kalendarz',       icon: CalendarDays },
      { href: '/content/generator',  label: 'Generator AI',    icon: Sparkles },
      { href: '/content/bank',       label: 'Bank szablonów',  icon: BookOpen },
    ],
  },
  {
    id: 'finance',
    section: 'Finanse',
    items: [
      { href: '/finance',            label: 'Dashboard P&L',  icon: BarChart3 },
      { href: '/finance/income',     label: 'Przychody',       icon: TrendingUp },
      { href: '/finance/expenses',   label: 'Wydatki',         icon: TrendingDown },
    ],
  },
  {
    id: 'analytics',
    section: 'Analityka',
    items: [
      { href: '/analytics/segments', label: 'Segmenty',          icon: PieChart },
      { href: '/analytics/win-loss', label: 'Win / Loss',        icon: Target },
      { href: '/analytics/forecast', label: 'Revenue Forecast',  icon: LineChart },
    ],
  },
] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isItemActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

// ─── NavItem ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  href: string
  label: string
  icon: React.ElementType
  collapsed: boolean
  onClick?: () => void
}

function NavItem({ href, label, icon: Icon, collapsed, onClick }: NavItemProps) {
  const pathname = usePathname()
  const active = isItemActive(pathname, href)

  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`
        relative flex items-center gap-3 px-3 py-2 rounded-[8px] text-[13px] font-medium
        transition-all duration-150 group select-none
        ${active
          ? 'nav-active bg-primary/12 text-primary'
          : 'text-white/50 hover:text-white/90 hover:bg-white/[0.04]'
        }
        ${collapsed ? 'justify-center px-2' : ''}
      `}
    >
      <Icon
        size={16}
        className={`flex-shrink-0 transition-colors ${active ? 'text-primary' : 'text-white/40 group-hover:text-white/70'}`}
      />
      {!collapsed && (
        <span className="truncate">{label}</span>
      )}
      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div className="
          pointer-events-none absolute left-full ml-3 z-50
          px-2.5 py-1.5 rounded-[8px] text-xs font-medium
          bg-[#1E2A45] border border-white/10 text-white whitespace-nowrap
          opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0
          transition-all duration-150 shadow-xl
        ">
          {label}
        </div>
      )}
    </Link>
  )
}

// ─── SidebarContent ───────────────────────────────────────────────────────────

interface SidebarContentProps {
  collapsed: boolean
  onNavClick?: () => void
  showCloseButton?: boolean
  onClose?: () => void
}

function SidebarContent({ collapsed, onNavClick, showCloseButton, onClose }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">

      {/* ── Logo ── */}
      <div className={`
        flex items-center border-b border-white/[0.06] flex-shrink-0
        ${collapsed ? 'justify-center px-3 py-4' : 'gap-3 px-4 py-4'}
      `}>
        <div className="
          w-8 h-8 rounded-[10px] flex-shrink-0
          bg-gradient-to-br from-primary to-primary/70
          flex items-center justify-center shadow-lg shadow-primary/25
        ">
          <Zap size={15} className="text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white tracking-tight leading-none">AM Automations</p>
            <p className="text-[10px] text-white/35 mt-0.5 tracking-wide uppercase">Platform</p>
          </div>
        )}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-all"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.id}>
            {/* Section label */}
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest uppercase text-white/25 select-none">
                {section.section}
              </p>
            )}
            {collapsed && (
              <div className="mx-auto w-4 h-px bg-white/10 mb-2" />
            )}
            {/* Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  collapsed={collapsed}
                  onClick={onNavClick}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom: Settings ── */}
      <div className="flex-shrink-0 border-t border-white/[0.06] p-2">
        <NavItem
          href="/settings"
          label="Ustawienia"
          icon={Settings}
          collapsed={collapsed}
          onClick={onNavClick}
        />
      </div>
    </div>
  )
}

// ─── Sidebar (exported) ───────────────────────────────────────────────────────

export function Sidebar() {
  const { collapsed, toggleCollapsed, mobileOpen, closeMobile } = useLayout()
  const pathname = usePathname()

  // Close mobile sidebar on route change
  useEffect(() => { closeMobile() }, [pathname, closeMobile])

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside
        className={`
          hidden md:flex flex-col fixed left-0 top-0 h-screen z-40
          bg-[#0F0F1A] border-r border-white/[0.06] sidebar-transition
          ${collapsed ? 'w-[64px]' : 'w-[260px]'}
        `}
      >
        <SidebarContent collapsed={collapsed} />

        {/* Collapse toggle button */}
        <button
          onClick={toggleCollapsed}
          className={`
            absolute -right-3 top-[72px] z-10
            w-6 h-6 rounded-full
            bg-[#0F0F1A] border border-white/10
            flex items-center justify-center
            text-white/40 hover:text-white hover:border-primary/50
            transition-all duration-200 shadow-md
          `}
          title={collapsed ? 'Rozwiń sidebar' : 'Zwiń sidebar'}
        >
          <ChevronLeft
            size={12}
            className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </aside>

      {/* ── Mobile: Overlay backdrop ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={closeMobile}
        />
      )}

      {/* ── Mobile: Drawer ── */}
      <aside
        className={`
          md:hidden fixed left-0 top-0 h-screen z-50 w-[280px]
          bg-[#0F0F1A] border-r border-white/[0.06]
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <SidebarContent
          collapsed={false}
          onNavClick={closeMobile}
          showCloseButton
          onClose={closeMobile}
        />
      </aside>
    </>
  )
}
