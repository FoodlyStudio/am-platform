'use client'

import { useRouter } from 'next/navigation'
import { useAppUser } from '@/contexts/UserContext'
import { USERS } from '@/lib/userStore'
import { Zap } from 'lucide-react'

export default function UserPickerPage() {
  const { switchUser } = useAppUser()
  const router = useRouter()

  const handleSelect = (id: string) => {
    switchUser(id)
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center p-4">
      <div className="w-full max-w-xs text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white">AM Platform</span>
        </div>

        <p className="text-sm text-white/40 mb-6">Wybierz swoje konto</p>

        <div className="flex flex-col gap-3">
          {USERS.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelect(user.id)}
              className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-[#16213E] hover:border-white/25 hover:bg-[#1E2A45] transition-all group"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ background: user.color + '30', border: `1px solid ${user.color}50` }}
              >
                <span style={{ color: user.color }}>{user.initials}</span>
              </div>
              <div className="text-left">
                <p className="text-base font-semibold text-white">{user.name}</p>
                <p className="text-xs text-white/35">AM Automations</p>
              </div>
              <div className="ml-auto text-white/20 group-hover:text-white/50 transition-colors text-lg">
                →
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-white/20 mt-8">AM Automations © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
