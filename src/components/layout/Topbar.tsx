'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Menu,
  Search,
  Bell,
  ChevronRight,
} from 'lucide-react'
import { useLayout } from './LayoutContext'
import { SearchModal } from './SearchModal'
import { NotificationsDropdown, useNotifications } from './NotificationsDropdown'
import { ThemeToggle } from './ThemeToggle'
import { useAppUser } from '@/contexts/UserContext'
import { USERS } from '@/lib/userStore'
import { useRouter } from 'next/navigation'

// ─── Breadcrumb map ───────────────────────────────────────────────────────────

const BREADCRUMB_MAP: Record<string, { label: string; parent?: string }> = {
  '/':                      { label: 'Dashboard' },
  '/sales':                 { label: 'Pipeline',         parent: 'Sprzedaż' },
  '/sales/leads':           { label: 'Leady',            parent: 'Sprzedaż' },
  '/sales/leads/import':    { label: 'Import CSV',       parent: 'Leady' },
  '/sales/outreach':        { label: 'Outreach Queue',   parent: 'Sprzedaż' },
  '/content':               { label: 'Kalendarz',        parent: 'Content' },
  '/content/generator':     { label: 'Generator AI',     parent: 'Content' },
  '/content/bank':          { label: 'Bank szablonów',   parent: 'Content' },
  '/finance':               { label: 'Dashboard P&L',    parent: 'Finanse' },
  '/finance/income':        { label: 'Przychody',        parent: 'Finanse' },
  '/finance/expenses':      { label: 'Wydatki',          parent: 'Finanse' },
  '/analytics/segments':    { label: 'Segmenty',         parent: 'Analityka' },
  '/analytics/win-loss':    { label: 'Win / Loss',       parent: 'Analityka' },
  '/analytics/forecast':    { label: 'Revenue Forecast', parent: 'Analityka' },
  '/settings':              { label: 'Ustawienia' },
  '/notifications':         { label: 'Powiadomienia' },
}

function useBreadcrumbs() {
  const pathname = usePathname()

  // Strip dynamic segments like /sales/[dealId]
  const crumbs: { label: string; href: string }[] = []
  const entry = BREADCRUMB_MAP[pathname]

  if (!entry) {
    // Dynamic route — try parent
    const parts = pathname.split('/').filter(Boolean)
    if (parts.length >= 2) {
      const parentPath = '/' + parts.slice(0, -1).join('/')
      const parentEntry = BREADCRUMB_MAP[parentPath]
      if (parentEntry?.parent) crumbs.push({ label: parentEntry.parent, href: '#' })
      if (parentEntry) crumbs.push({ label: parentEntry.label, href: parentPath })
    }
    crumbs.push({ label: 'Detail', href: pathname })
    return crumbs
  }

  if (entry.parent) crumbs.push({ label: entry.parent, href: '#' })
  crumbs.push({ label: entry.label, href: pathname })
  return crumbs
}

// ─── Avatar dropdown ──────────────────────────────────────────────────────────

function AvatarDropdown({ onClose }: { onClose: () => void }) {
  const { user, switchUser, logout } = useAppUser()
  const router = useRouter()
  const otherUsers = USERS.filter((u) => u.id !== user?.id)

  const handleLogout = () => {
    logout()
    onClose()
    router.push('/login')
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-[220px] bg-[#0F0F1A] border border-white/10 rounded-[12px] shadow-2xl shadow-black/50 overflow-hidden z-50 py-1">
      <div className="px-3 py-2.5 border-b border-white/[0.07] mb-1">
        <p className="text-[13px] font-medium text-white">{user?.name}</p>
        <p className="text-[11px] text-white/35">AM Automations</p>
      </div>

      {otherUsers.map((u) => (
        <button
          key={u.id}
          onClick={() => { switchUser(u.id); onClose() }}
          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
            style={{ background: u.color + '30', color: u.color }}>
            {u.initials[0]}
          </span>
          Przełącz na {u.name}
        </button>
      ))}

      <Link
        href="/settings"
        onClick={onClose}
        className="flex items-center px-3 py-2 text-[13px] text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors"
      >
        Ustawienia
      </Link>
      <div className="border-t border-white/[0.07] mt-1 pt-1">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-[13px] text-red-400/80 hover:text-red-400 hover:bg-red-400/[0.08] transition-colors"
        >
          Zmień użytkownika
        </button>
      </div>
    </div>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

export function Topbar() {
  const { collapsed, openMobile } = useLayout()
  const crumbs = useBreadcrumbs()
  const pathname = usePathname()

  const [searchOpen, setSearchOpen]   = useState(false)
  const [notifOpen, setNotifOpen]     = useState(false)
  const [avatarOpen, setAvatarOpen]   = useState(false)

  const { unreadCount } = useNotifications()
  const { user: appUser } = useAppUser()

  const notifRef  = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)

  // Cmd+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close dropdowns on route change
  useEffect(() => {
    setNotifOpen(false)
    setAvatarOpen(false)
  }, [pathname])

  return (
    <>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      <header
        className={`
          h-14 sticky top-0 z-30 flex items-center justify-between px-5
          bg-[#1A1A2E]/90 backdrop-blur-md border-b border-white/[0.06]
          transition-all duration-200
        `}
      >
        {/* ── Left: hamburger + breadcrumbs ── */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger */}
          <button
            onClick={openMobile}
            className="md:hidden p-2 rounded-[8px] text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <Menu size={18} />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-sm min-w-0" aria-label="Breadcrumb">
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1
              return (
                <span key={crumb.href + i} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <ChevronRight size={12} className="text-white/20 flex-shrink-0" />}
                  {isLast ? (
                    <span className="font-semibold text-white truncate">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href === '#' ? '#' : crumb.href}
                      className="text-white/40 hover:text-white/70 transition-colors truncate"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </span>
              )
            })}
          </nav>
        </div>

        {/* ── Right: search + bell + avatar ── */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="
              hidden md:flex items-center gap-2.5
              pl-3 pr-2.5 py-1.5 rounded-[8px]
              bg-white/[0.05] border border-white/[0.08]
              text-white/35 hover:text-white/55 hover:border-white/15
              transition-all duration-150 text-[13px]
            "
          >
            <Search size={13} />
            <span>Szukaj...</span>
            <span className="flex items-center gap-0.5 ml-2">
              <kbd className="px-1.5 py-0.5 rounded-[4px] bg-white/[0.07] border border-white/[0.1] text-[10px] font-mono text-white/30">
                ⌘K
              </kbd>
            </span>
          </button>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Mobile search icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2 rounded-[8px] text-white/45 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <Search size={17} />
          </button>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => { setNotifOpen((v) => !v); setAvatarOpen(false) }}
              className={`
                relative p-2 rounded-[8px] transition-all
                ${notifOpen
                  ? 'bg-primary/15 text-primary'
                  : 'text-white/45 hover:text-white hover:bg-white/[0.06]'}
              `}
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent ring-2 ring-[#1A1A2E]" />
              )}
            </button>
            {notifOpen && <NotificationsDropdown onClose={() => setNotifOpen(false)} />}
          </div>

          {/* Avatar */}
          <div ref={avatarRef} className="relative">
            <button
              onClick={() => { setAvatarOpen((v) => !v); setNotifOpen(false) }}
              className={`
                flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-[8px]
                transition-all hover:bg-white/[0.05]
                ${avatarOpen ? 'bg-white/[0.06]' : ''}
              `}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{
                  background: (appUser?.color ?? '#6C5CE7') + '30',
                  border: `1px solid ${appUser?.color ?? '#6C5CE7'}50`,
                  color: appUser?.color ?? '#6C5CE7',
                }}
              >
                {appUser?.initials ?? 'AM'}
              </div>
              <span className="hidden sm:block text-[13px] text-white/60 font-medium max-w-[100px] truncate">
                {appUser?.name ?? 'AM'}
              </span>
            </button>
            {avatarOpen && <AvatarDropdown onClose={() => setAvatarOpen(false)} />}
          </div>
        </div>
      </header>
    </>
  )
}
