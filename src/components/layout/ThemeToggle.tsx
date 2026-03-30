'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="w-8 h-8" />
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-[8px] text-white/45 hover:text-white hover:bg-white/[0.06] dark:text-white/45 dark:hover:text-white dark:hover:bg-white/[0.06] light:text-gray-500 light:hover:text-gray-900 light:hover:bg-gray-100 transition-all"
      title={isDark ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
