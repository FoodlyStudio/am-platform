'use client'

import { Deal, LeadPriority, leadFullName } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { differenceInCalendarDays } from 'date-fns'
import { MessageSquare, Phone, FileText } from 'lucide-react'

const PRIORITY_COLOR: Record<LeadPriority, string> = {
  critical: '#FD7272',
  high:     '#FDCB6E',
  standard: '#74B9FF',
  low:      '#636E72',
}

interface DealKanbanCardProps {
  deal: Deal
  onClick: () => void
  onMessageClick: () => void
  onPhoneClick: () => void
  onOfferClick: () => void
}

export function DealKanbanCard({
  deal,
  onClick,
  onMessageClick,
  onPhoneClick,
  onOfferClick,
}: DealKanbanCardProps) {
  const daysInStage = differenceInCalendarDays(
    new Date(),
    new Date(deal.stage_changed_at ?? deal.created_at),
  )

  const priority = (deal.lead?.priority ?? 'standard') as LeadPriority
  const dotColor = PRIORITY_COLOR[priority]

  return (
    <div
      onClick={onClick}
      className="group bg-[#1A1A2E] border border-white/5 rounded-xl p-3 mb-2 last:mb-0 hover:border-primary/30 hover:bg-primary/[0.03] transition-all cursor-pointer select-none"
    >
      {/* Priority dot + days */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: dotColor }}
          title={`Priorytet: ${priority}`}
        />
        {daysInStage > 0 && (
          <span className="text-[10px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded-full">
            {daysInStage}d
          </span>
        )}
      </div>

      {/* Company */}
      <p className="text-xs font-semibold text-white truncate leading-snug">
        {deal.lead?.company ?? deal.title}
      </p>

      {/* Lead name */}
      {deal.lead && (
        <p className="text-[11px] text-white/40 truncate mt-0.5">
          {leadFullName(deal.lead)}
        </p>
      )}

      {/* Value */}
      {deal.value != null && (
        <p className="text-sm font-bold text-secondary mt-2 tabular-nums">
          {formatCurrency(deal.value)}
        </p>
      )}

      {/* Quick actions — visible on hover */}
      <div className="flex gap-0.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          title="Wiadomości"
          onClick={(e) => { e.stopPropagation(); onMessageClick() }}
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
        >
          <MessageSquare size={11} className="text-white/30" />
        </button>
        <button
          title="Pre-call brief"
          onClick={(e) => { e.stopPropagation(); onPhoneClick() }}
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
        >
          <Phone size={11} className="text-white/30" />
        </button>
        <button
          title="Generuj ofertę"
          onClick={(e) => { e.stopPropagation(); onOfferClick() }}
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
        >
          <FileText size={11} className="text-white/30" />
        </button>
      </div>
    </div>
  )
}
