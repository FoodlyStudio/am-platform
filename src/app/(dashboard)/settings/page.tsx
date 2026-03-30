'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import { User, Sun, Moon, Bell, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [notifEmail, setNotifEmail] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setEmail(user.email ?? '')

      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setFirstName(data.first_name ?? '')
        setLastName(data.last_name ?? '')
        setNotifEmail(data.notification_email ?? true)
        if (data.theme) setTheme(data.theme)
      }

      setLoading(false)
    }
    load()
  }, [setTheme])

  const save = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          theme: theme ?? 'dark',
          notification_email: notifEmail,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error
      toast.success('Zapisano zmiany')
    } catch (err) {
      console.error(err)
      toast.error('Błąd zapisu')
    } finally {
      setSaving(false)
    }
  }

  const handleThemeChange = async (newTheme: 'dark' | 'light') => {
    setTheme(newTheme)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('user_profiles').upsert({ id: user.id, theme: newTheme })
    } catch { /* silent */ }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Ustawienia</h1>
        <p className="text-sm text-white/40 mt-0.5">Zarządzaj swoim kontem</p>
      </div>

      {/* Profile */}
      <div className="bg-card border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User size={15} className="text-primary" />
          <h2 className="text-sm font-semibold text-white">Profil</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Imię</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Adrian"
              className="w-full bg-[#1A1A2E] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Nazwisko</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Kowalski"
              className="w-full bg-[#1A1A2E] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1 block">Email</label>
          <input
            value={email}
            disabled
            className="w-full bg-[#1A1A2E] border border-white/5 rounded-xl px-3 py-2 text-sm text-white/40 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-card border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Sun size={15} className="text-primary" />
          <h2 className="text-sm font-semibold text-white">Wygląd</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleThemeChange(t)}
              className={`
                flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all
                ${theme === t
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/80'}
              `}
            >
              {t === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
              {t === 'dark' ? 'Ciemny' : 'Jasny'}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={15} className="text-primary" />
          <h2 className="text-sm font-semibold text-white">Powiadomienia</h2>
        </div>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm text-white">Powiadomienia email</p>
            <p className="text-xs text-white/35 mt-0.5">Ważne alerty wysyłane na email</p>
          </div>
          <button
            onClick={() => setNotifEmail((v) => !v)}
            className={`relative w-10 h-5.5 rounded-full transition-colors ${notifEmail ? 'bg-primary' : 'bg-white/10'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifEmail ? 'translate-x-4.5' : 'translate-x-0'}`}
            />
          </button>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-sm font-medium transition-all"
        >
          {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Zapisz zmiany'}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/50 hover:text-red-400 hover:border-red-400/20 hover:bg-red-400/5 transition-all"
        >
          <LogOut size={14} />
          Wyloguj
        </button>
      </div>
    </div>
  )
}
