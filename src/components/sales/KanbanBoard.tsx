'use client'

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Deal, PipelineStage } from '@/types'
import { PIPELINE_STAGES } from '@/lib/constants'
import { DealKanbanCard } from './DealKanbanCard'
import { formatCurrency } from '@/lib/utils'

const ACTIVE_STAGES: PipelineStage[] = [
  'nowy_lead', 'dm_wyslany', 'odpowiedz', 'rozmowa_umowiona',
  'diagnoza_zrobiona', 'oferta_prezentowana', 'negocjacje',
]
const CLOSED_STAGES: PipelineStage[] = ['wygrana', 'przegrana', 'nie_teraz']

interface KanbanBoardProps {
  deals: Deal[]
  onMove: (dealId: string, stage: PipelineStage) => void
  onDealClick: (deal: Deal, tab?: string) => void
}

export function KanbanBoard({ deals, onMove, onDealClick }: KanbanBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    onMove(draggableId, destination.droppableId as PipelineStage)
  }

  const dealsByStage = (stage: PipelineStage) => deals.filter((d) => d.stage === stage)

  const activeConfigs = PIPELINE_STAGES.filter((s) => ACTIVE_STAGES.includes(s.value))
  const closedConfigs = PIPELINE_STAGES.filter((s) => CLOSED_STAGES.includes(s.value))

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* ── Active stages ─────────────────────────────────────────── */}
      <div className="flex gap-3 overflow-x-auto pb-2 min-h-0">
        {activeConfigs.map((stage) => (
          <KanbanColumn
            key={stage.value}
            stage={stage}
            deals={dealsByStage(stage.value)}
            onDealClick={onDealClick}
          />
        ))}
      </div>

      {/* ── Closed stages ─────────────────────────────────────────── */}
      <div className="flex gap-3 overflow-x-auto pt-4 pb-2 border-t border-white/5 mt-1">
        {closedConfigs.map((stage) => (
          <KanbanColumn
            key={stage.value}
            stage={stage}
            deals={dealsByStage(stage.value)}
            onDealClick={onDealClick}
            muted
          />
        ))}
      </div>
    </DragDropContext>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  stage: (typeof PIPELINE_STAGES)[number]
  deals: Deal[]
  onDealClick: (deal: Deal, tab?: string) => void
  muted?: boolean
}

function KanbanColumn({ stage, deals, onDealClick, muted }: KanbanColumnProps) {
  const total = deals.reduce((s, d) => s + (d.value ?? 0), 0)

  return (
    <div className={`flex-shrink-0 w-[220px] ${muted ? 'opacity-70' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: stage.hex }}
          />
          <span className="text-xs font-medium text-white/60 truncate">{stage.label}</span>
          <span className="text-[10px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded-full flex-shrink-0">
            {deals.length}
          </span>
        </div>
        {total > 0 && (
          <span className="text-[10px] text-white/25 flex-shrink-0 ml-1">
            {formatCurrency(total)}
          </span>
        )}
      </div>

      {/* Droppable */}
      <Droppable droppableId={stage.value}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[72px] rounded-xl p-1.5 transition-colors ${
              snapshot.isDraggingOver
                ? 'bg-primary/5 border border-primary/20'
                : 'bg-white/[0.02] border border-white/5'
            }`}
          >
            {deals.map((deal, index) => (
              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      ...provided.draggableProps.style,
                      opacity: snapshot.isDragging ? 0.85 : 1,
                    }}
                  >
                    <DealKanbanCard
                      deal={deal}
                      onClick={() => onDealClick(deal)}
                      onMessageClick={() => onDealClick(deal, 'Wiadomości')}
                      onPhoneClick={() => onDealClick(deal, 'Rozmowa')}
                      onOfferClick={() => onDealClick(deal, 'Oferta')}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {deals.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-[10px] text-white/15 text-center py-4">Puste</p>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}
