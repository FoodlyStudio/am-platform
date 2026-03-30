'use client'

import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface WinDealModalProps {
  onConfirm: (value: number, notes: string) => void
  onClose: () => void
}

export function WinDealModal({ onConfirm, onClose }: WinDealModalProps) {
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')

  const numValue = parseFloat(value.replace(/\s/g, '').replace(',', '.'))
  const valid = value.trim() !== '' && !isNaN(numValue) && numValue > 0

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#16213E] border border-white/10 rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#27AE60]/15 flex items-center justify-center flex-shrink-0">
            <Trophy size={20} className="text-[#27AE60]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Deal wygrany! 🏆</h2>
            <p className="text-xs text-white/40">Potwierdź finalną wartość kontraktu</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">
              Finalna wartość (PLN) <span className="text-accent">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="np. 8000"
              autoFocus
              className="w-full bg-[#1A1A2E] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#27AE60]/40 placeholder:text-white/25"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Notatki końcowe (opcjonalnie)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Co zadecydowało o wygranej?"
              rows={3}
              className="w-full bg-[#1A1A2E] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#27AE60]/40 resize-none placeholder:text-white/25"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Anuluj
          </Button>
          <button
            onClick={() => valid && onConfirm(numValue, notes)}
            disabled={!valid}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#27AE60] text-white hover:bg-[#2ECC71] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Potwierdź wygraną
          </button>
        </div>
      </div>
    </div>
  )
}
