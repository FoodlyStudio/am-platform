'use client'

import { useEffect, useState, useMemo } from 'react'
import { addDays } from 'date-fns'
import { useDeals } from '@/hooks/useDeals'
import { Deal, PipelineStage } from '@/types'
import { PIPELINE_STAGES, LEAD_SEGMENTS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { KanbanBoard } from '@/components/sales/KanbanBoard'
import { DealSlideOver, SlideOverTab } from '@/components/sales/DealSlideOver'
import { WinDealModal } from '@/components/sales/WinDealModal'
import { LossDealModal } from '@/components/sales/LossDealModal'
import { TrendingUp, DollarSign, Target, BarChart3, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

const ACTIVE_STAGES: PipelineStage[] = [
  'nowy_lead', 'dm_wyslany', 'odpowiedz', 'rozmowa_umowiona',
  'diagnoza_zrobiona', 'oferta_prezentowana', 'negocjacje',
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SalesPage() {
  const { deals, loading, fetch, moveStage, update } = useDeals()

  // Selection state
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [selectedTab, setSelectedTab] = useState<SlideOverTab>('Szczegóły')

  // Modals
  const [winModal, setWinModal] = useState<string | null>(null)   // dealId
  const [lossModal, setLossModal] = useState<string | null>(null) // dealId

  // Filters
  const [segmentFilter, setSegmentFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  useEffect(() => { fetch() }, [fetch])

  // Keep slide-over in sync with latest deal data after updates
  const currentDeal = useMemo(
    () => (selectedDeal ? (deals.find((d) => d.id === selectedDeal.id) ?? selectedDeal) : null),
    [deals, selectedDeal],
  )

  // ── Metrics ──────────────────────────────────────────────────────────────────
  const activeDeals = useMemo(() => deals.filter((d) => ACTIVE_STAGES.includes(d.stage)), [deals])
  const wonDeals    = useMemo(() => deals.filter((d) => d.stage === 'wygrana'), [deals])

  const pipelineValue = useMemo(
    () => activeDeals.reduce((s, d) => s + (d.value ?? 0), 0),
    [activeDeals],
  )
  const avgTicket = wonDeals.length
    ? wonDeals.reduce((s, d) => s + (d.value ?? 0), 0) / wonDeals.length
    : 0
  const conversionRate = deals.length
    ? Math.round((wonDeals.length / deals.length) * 100)
    : 0

  // ── Filtered deals ───────────────────────────────────────────────────────────
  const filteredDeals = useMemo(
    () =>
      deals.filter((d) => {
        if (segmentFilter && d.lead?.segment !== segmentFilter) return false
        if (priorityFilter && d.lead?.priority !== priorityFilter) return false
        return true
      }),
    [deals, segmentFilter, priorityFilter],
  )

  // ── Drag & drop handler ──────────────────────────────────────────────────────
  const handleMove = async (dealId: string, stage: PipelineStage) => {
    if (stage === 'wygrana') {
      setWinModal(dealId)
      return
    }
    if (stage === 'przegrana') {
      setLossModal(dealId)
      return
    }
    if (stage === 'nie_teraz') {
      const reengagement_date = addDays(new Date(), 90).toISOString().split('T')[0]
      await moveStage(dealId, stage, { reengagement_date })
      toast('📅 Reengagement ustawiony za 90 dni', { icon: '🔔' })
      return
    }
    await moveStage(dealId, stage)
  }

  const handleWinConfirm = async (value: number, notes: string) => {
    if (!winModal) return
    await moveStage(winModal, 'wygrana', {
      value,
      won_at: new Date().toISOString(),
      ...(notes ? { notes } : {}),
    })
    setWinModal(null)
    toast.success('🏆 Deal wygrany!')
  }

  const handleLossConfirm = async (reason: string, details: string) => {
    if (!lossModal) return
    await moveStage(lossModal, 'przegrana', {
      lost_reason: reason,
      ...(details ? { lost_details: details } : {}),
      lost_at: new Date().toISOString(),
    })
    setLossModal(null)
    toast('Deal przeniesiony do Przegrane', { icon: '📋' })
  }

  const handleDealClick = (deal: Deal, tab?: string) => {
    setSelectedDeal(deal)
    setSelectedTab((tab as SlideOverTab) ?? 'Szczegóły')
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-0">

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <MetricCard
          icon={<TrendingUp size={13} />}
          label="Aktywne deale"
          value={String(activeDeals.length)}
          color="text-primary"
          bg="bg-primary/10"
        />
        <MetricCard
          icon={<DollarSign size={13} />}
          label="Wartość pipeline"
          value={formatCurrency(pipelineValue)}
          color="text-secondary"
          bg="bg-secondary/10"
        />
        <MetricCard
          icon={<Target size={13} />}
          label="Średni ticket"
          value={avgTicket > 0 ? formatCurrency(avgTicket) : '—'}
          color="text-yellow-400"
          bg="bg-yellow-400/10"
        />
        <MetricCard
          icon={<BarChart3 size={13} />}
          label="Conversion rate"
          value={`${conversionRate}%`}
          color="text-accent"
          bg="bg-accent/10"
        />
      </div>

      {/* Filter + action bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select
          value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value)}
          className="text-xs bg-card border border-white/10 rounded-lg px-3 py-1.5 text-white/70 focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="">Wszystkie segmenty</option>
          {LEAD_SEGMENTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="text-xs bg-card border border-white/10 rounded-lg px-3 py-1.5 text-white/70 focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="">Wszystkie priorytety</option>
          <option value="critical">🔴 Krytyczny</option>
          <option value="high">🟡 Wysoki</option>
          <option value="standard">🔵 Standard</option>
          <option value="low">⚪ Niski</option>
        </select>

        <div className="ml-auto">
          <Button size="sm">
            <Plus size={14} />
            Nowy deal
          </Button>
        </div>
      </div>

      {/* Stage colour legend */}
      <div className="flex items-center gap-x-4 gap-y-1 mb-4 flex-wrap">
        {PIPELINE_STAGES.map((s) => (
          <div key={s.value} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.hex }} />
            <span className="text-[10px] text-white/30 whitespace-nowrap">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <KanbanBoard
          deals={filteredDeals}
          onMove={handleMove}
          onDealClick={handleDealClick}
        />
      )}

      {/* Slide-over */}
      {currentDeal && (
        <DealSlideOver
          deal={currentDeal}
          initialTab={selectedTab}
          onClose={() => setSelectedDeal(null)}
          onUpdate={update}
        />
      )}

      {/* Win modal */}
      {winModal && (
        <WinDealModal
          onConfirm={handleWinConfirm}
          onClose={() => setWinModal(null)}
        />
      )}

      {/* Loss modal */}
      {lossModal && (
        <LossDealModal
          onConfirm={handleLossConfirm}
          onClose={() => setLossModal(null)}
        />
      )}
    </div>
  )
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  icon, label, value, color, bg,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
  bg: string
}) {
  return (
    <div className="bg-card border border-white/5 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded-md ${bg} flex items-center justify-center ${color} flex-shrink-0`}>
          {icon}
        </div>
        <span className="text-xs text-white/50 truncate">{label}</span>
      </div>
      <p className="text-lg font-bold text-white tabular-nums">{value}</p>
    </div>
  )
}
