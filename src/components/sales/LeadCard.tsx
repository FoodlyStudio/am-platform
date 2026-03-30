'use client'

import { Lead, leadFullName } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Building2, Mail, ExternalLink } from 'lucide-react'

interface LeadCardProps {
  lead: Lead
  onClick?: () => void
}

const statusVariant: Record<string, 'default' | 'info' | 'success' | 'danger' | 'warning'> = {
  new:          'default',
  qualified:    'success',
  disqualified: 'danger',
  archived:     'default',
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 7 ? 'bg-green-400' : score >= 5 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className="text-[10px] text-white/40">{score}/10</span>
    </div>
  )
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-card border border-white/5 rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate">
            {leadFullName(lead)}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Building2 size={12} className="text-white/40 flex-shrink-0" />
            <span className="text-xs text-white/50 truncate">{lead.company}</span>
          </div>
          {lead.position && (
            <p className="text-[11px] text-white/30 truncate mt-0.5">{lead.position}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 items-end ml-2 flex-shrink-0">
          {lead.segment && (
            <Badge variant="purple">{String(lead.segment).replace(/_/g, ' ')}</Badge>
          )}
          <Badge variant={statusVariant[lead.status] ?? 'default'}>{lead.status}</Badge>
        </div>
      </div>

      {lead.ai_score !== undefined && lead.ai_score !== null && (
        <div className="mb-3">
          <ScoreBar score={lead.ai_score} />
        </div>
      )}

      {lead.ai_icebreaker && (
        <p className="text-[11px] text-white/40 italic mb-3 line-clamp-2">&ldquo;{lead.ai_icebreaker}&rdquo;</p>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-white/5">
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            onClick={(e) => e.stopPropagation()}
            className="text-white/30 hover:text-primary transition-colors p-1 rounded"
          >
            <Mail size={13} />
          </a>
        )}
        {lead.linkedin_url && (
          <a
            href={lead.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-white/30 hover:text-primary transition-colors p-1 rounded"
          >
            <ExternalLink size={13} />
          </a>
        )}
        {lead.buying_signal && (
          <span className="text-[11px] text-yellow-400/70 truncate ml-auto">{lead.buying_signal}</span>
        )}
      </div>
    </div>
  )
}
