'use client'

import { useState } from 'react'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const LOSS_REASONS = [
  { value: 'za_drogo',       label: 'Za drogo' },
  { value: 'nie_teraz',      label: 'Nie teraz / brak budżetu' },
  { value: 'wybrali_kogos',  label: 'Wybrali konkurencję' },
  { value: 'brak_budzetu',   label: 'Brak budżetu w ogóle' },
  { value: 'ghosting',       label: 'Ghosting / brak odpowiedzi' },
  { value: 'inne',           label: 'Inne' },
]

interface LossDealModalProps {
  onConfirm: (reason: string, details: string) => void
  onClose: () => void
}

export function LossDealModal({ onConfirm, onClose }: LossDealModalProps) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#16213E] border border-white/10 rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#636E72]/15 flex items-center justify-center flex-shrink-0">
            <XCircle size={20} className="text-[#636E72]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Deal przegrany</h2>
            <p className="text-xs text-white/40">Podaj powód — pomoże to analizować wyniki</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50 mb-2 block">
              Powód przegranej <span className="text-accent">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LOSS_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`px-3 py-2 rounded-xl text-xs text-left transition-all ${
                    reason === r.value
                      ? 'bg-[#636E72]/20 border border-[#636E72]/50 text-white'
                      : 'bg-[#1A1A2E] border border-white/5 text-white/50 hover:border-white/20 hover:text-white/70'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Szczegóły (opcjonalnie)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Co dokładnie powiedział klient?"
              rows={3}
              className="w-full bg-[#1A1A2E] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/10 resize-none placeholder:text-white/25"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Anuluj
          </Button>
          <button
            onClick={() => reason && onConfirm(reason, details)}
            disabled={!reason}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#636E72] text-white hover:bg-[#747D8C] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Potwierdź przegraną
          </button>
        </div>
      </div>
    </div>
  )
}
