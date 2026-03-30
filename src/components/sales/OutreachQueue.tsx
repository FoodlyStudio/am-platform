'use client'

import { Lead, leadFullName } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Mail, ExternalLink, Check } from 'lucide-react'

interface OutreachQueueProps {
  leads: Lead[]
  onMarkContacted: (leadId: string) => void
}

export function OutreachQueue({ leads, onMarkContacted }: OutreachQueueProps) {
  const queue = leads.filter((l) => l.status === 'new')

  if (queue.length === 0) {
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        Brak leadów w kolejce outreach
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {queue.map((lead) => (
        <div
          key={lead.id}
          className="flex items-center gap-4 p-3 bg-card rounded-xl border border-white/5 hover:border-white/10 transition-all"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{leadFullName(lead)}</p>
            <p className="text-xs text-white/40 truncate">{lead.company}</p>
          </div>
          {lead.segment && (
            <Badge variant="default">{String(lead.segment).replace(/_/g, ' ')}</Badge>
          )}
          <div className="flex items-center gap-1">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="text-white/30 hover:text-primary p-1.5 rounded-lg hover:bg-primary/10 transition-all">
                <Mail size={14} />
              </a>
            )}
            {lead.linkedin_url && (
              <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-primary p-1.5 rounded-lg hover:bg-primary/10 transition-all">
                <ExternalLink size={14} />
              </a>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkContacted(lead.id)}
            className="!p-1.5 text-white/30 hover:text-secondary"
          >
            <Check size={14} />
          </Button>
        </div>
      ))}
    </div>
  )
}
