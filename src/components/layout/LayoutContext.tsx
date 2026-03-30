'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface LayoutContextValue {
  /** desktop: full ↔ icon-only */
  collapsed: boolean
  toggleCollapsed: () => void
  /** mobile: overlay open/closed */
  mobileOpen: boolean
  openMobile: () => void
  closeMobile: () => void
}

const LayoutContext = createContext<LayoutContextValue>({
  collapsed: false,
  toggleCollapsed: () => {},
  mobileOpen: false,
  openMobile: () => {},
  closeMobile: () => {},
})

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), [])
  const openMobile      = useCallback(() => setMobileOpen(true), [])
  const closeMobile     = useCallback(() => setMobileOpen(false), [])

  return (
    <LayoutContext.Provider value={{ collapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile }}>
      {children}
    </LayoutContext.Provider>
  )
}

export const useLayout = () => useContext(LayoutContext)
