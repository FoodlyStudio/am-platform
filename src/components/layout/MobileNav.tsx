'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, TrendingUp, FileText, DollarSign, Settings } from 'lucide-react'

const NAV = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/sales', label: 'Sales', icon: TrendingUp },
  { href: '/content', label: 'Content', icon: FileText },
  { href: '/finance', label: 'Finance', icon: DollarSign },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-dark border-t border-white/10 flex md:hidden">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
              active ? 'text-primary' : 'text-white/40'
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
