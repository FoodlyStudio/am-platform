'use client'

import { useEffect, useState } from 'react'
import { useLeads } from '@/hooks/useLeads'
import { LeadCard } from '@/components/sales/LeadCard'
import { Button } from '@/components/ui/Button'
import { Plus, Upload, Search } from 'lucide-react'
import Link from 'next/link'
import { leadFullName } from '@/types'

export default function LeadsPage() {
  const { leads, loading, fetch } = useLeads()
  const [search, setSearch] = useState('')

  useEffect(() => { fetch() }, [fetch])

  const filtered = leads.filter(
    (l) =>
      leadFullName(l).toLowerCase().includes(search.toLowerCase()) ||
      l.company.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Leads</h1>
          <p className="text-sm text-white/50 mt-0.5">{leads.length} leads in database</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales/leads/import">
            <Button variant="outline" size="sm">
              <Upload size={14} />
              Import CSV
            </Button>
          </Link>
          <Button size="sm">
            <Plus size={14} />
            Add Lead
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search leads..."
          className="w-full pl-9 pr-4 py-2 bg-card border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-white/30 text-sm">
              No leads found
            </div>
          )}
        </div>
      )}
    </div>
  )
}
