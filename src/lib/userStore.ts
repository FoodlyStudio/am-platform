// Simple user store — no Supabase Auth, just localStorage
// Two fixed users: Adrian and Maciek

export interface AppUser {
  id: string
  name: string
  initials: string
  color: string
}

export const USERS: AppUser[] = [
  { id: 'adrian', name: 'Adrian', initials: 'AK', color: '#6C5CE7' },
  { id: 'maciek', name: 'Maciek', initials: 'MK', color: '#00B894' },
]

const KEY = 'am_current_user'

export function getCurrentUser(): AppUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return USERS.find((u) => u.id === raw) ?? null
  } catch {
    return null
  }
}

export function setCurrentUser(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, id)
}

export function clearCurrentUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}
