'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Deal, leadFullName } from '@/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PIPELINE_STAGES } from '@/lib/constants'
import { ArrowLeft, DollarSign, Calendar, User } from 'lucide-react'
import Link from 'next/link'

export default function DealPage() {
  const { dealId } = useParams<{ dealId: string }>()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('deals')
        .select('*, lead:leads(*)')
        .eq('id', dealId)
        .single()
      setDeal(data)
      setLoading(false)
    }
    load()
  }, [dealId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="text-center py-16 text-white/30">
        <p>Deal not found</p>
        <Link href="/sales" className="text-primary text-sm mt-2 block hover:underline">
          Back to Pipeline
        </Link>
      </div>
    )
  }

  const stage = PIPELINE_STAGES.find((s) => s.value === deal.stage)

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/sales">
          <Button variant="ghost" size="sm" className="!p-1.5">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">{deal.title}</h1>
          {deal.lead && (
            <p className="text-sm text-white/50 mt-0.5">{deal.lead.company}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-secondary" />
            <span className="text-xs text-white/50">Value</span>
          </div>
          <p className="text-lg font-bold text-secondary">
            {deal.value != null ? formatCurrency(deal.value) : '—'}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-2">
            {stage && (
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: stage.hex }}
              />
            )}
            <span className="text-xs text-white/50">Stage</span>
          </div>
          <p className="text-lg font-bold text-white">{stage?.label ?? deal.stage}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-white/40" />
            <span className="text-xs text-white/50">Close date</span>
          </div>
          <p className="text-sm font-medium text-white">
            {deal.expected_close_date ? formatDate(deal.expected_close_date) : '—'}
          </p>
        </Card>
      </div>

      {deal.lead && (
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User size={14} className="text-white/30" />
              <span className="text-white">{leadFullName(deal.lead)}</span>
            </div>
            {deal.lead.email && (
              <div className="flex items-center gap-2">
                <span className="text-white/30 text-xs w-4">@</span>
                <a href={`mailto:${deal.lead.email}`} className="text-primary hover:underline">
                  {deal.lead.email}
                </a>
              </div>
            )}
          </div>
        </Card>
      )}

      {deal.client_problem && (
        <Card>
          <CardHeader>
            <CardTitle>Client Problem</CardTitle>
          </CardHeader>
          <p className="text-sm text-white/70 whitespace-pre-wrap">{deal.client_problem}</p>
        </Card>
      )}

      {deal.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <p className="text-sm text-white/70 whitespace-pre-wrap">{deal.notes}</p>
        </Card>
      )}
    </div>
  )
}
