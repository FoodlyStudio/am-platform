'use client'

import { useLayout } from './LayoutContext'

export function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useLayout()

  return (
    <div
      className={`
        flex flex-col min-h-screen sidebar-transition
        ${collapsed ? 'md:ml-[64px]' : 'md:ml-[260px]'}
      `}
    >
      {children}
    </div>
  )
}
