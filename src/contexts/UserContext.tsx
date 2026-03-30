'use client'

import {
  createContext, useContext, useEffect, useState, useCallback,
  type ReactNode,
} from 'react'
import { getCurrentUser, setCurrentUser, clearCurrentUser, type AppUser } from '@/lib/userStore'

interface UserContextValue {
  user: AppUser | null
  loading: boolean
  switchUser: (id: string) => void
  logout: () => void
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  switchUser: () => {},
  logout: () => {},
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUser(getCurrentUser())
    setLoading(false)
  }, [])

  const switchUser = useCallback((id: string) => {
    setCurrentUser(id)
    setUser(getCurrentUser())
  }, [])

  const logout = useCallback(() => {
    clearCurrentUser()
    setUser(null)
  }, [])

  return (
    <UserContext.Provider value={{ user, loading, switchUser, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useAppUser() {
  return useContext(UserContext)
}
