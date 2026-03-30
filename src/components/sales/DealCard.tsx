'use client'

import { Deal } from '@/types'
import { PIPELINE_STAGES } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Calendar, DollarSign } from 'lucide-react'

interface DealCardProps {
  deal: Deal
  onClick?: () => void
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const stage = PIPELINE_STAGES.find((s) => s.value === deal.stage)

  return (
    <div
      onClick={onClick}
      className="bg-dark border border-white/5 rounded-xl p-4 mb-2 hover:border-primary/30 transition-all cursor-pointer group"
    >
      <p className="text-sm font-medium text-white group-hover:text-primary transition-colors mb-2 truncate">
        {deal.title}
      </p>
      {deal.lead && (
        <p className="text-xs text-white/50 mb-3">{deal.lead.company}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <DollarSign size={12} className="text-secondary" />
          <span className="text-sm font-semibold text-secondary">
            {deal.value != null ? formatCurrency(deal.value) : '—'}
          </span>
        </div>
        {stage && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium text-white/80`}
            style={{ background: stage.hex + '30', border: `1px solid ${stage.hex}40` }}>
            {stage.label}
          </span>
        )}
      </div>
      {deal.expected_close_date && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5">
          <Calendar size={11} className="text-white/30" />
          <span className="text-xs text-white/40">{formatDate(deal.expected_close_date)}</span>
        </div>
      )}
    </div>
  )
}
