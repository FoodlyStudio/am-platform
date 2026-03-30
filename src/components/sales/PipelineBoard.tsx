'use client'

import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { Deal, PipelineStage } from '@/types'
import { PIPELINE_STAGES } from '@/lib/constants'
import { DealCard } from './DealCard'
import { formatCurrency } from '@/lib/utils'

interface PipelineBoardProps {
  deals: Deal[]
  onDragEnd: (dealId: string, newStage: PipelineStage) => void
  onDealClick?: (deal: Deal) => void
}

export function PipelineBoard({ deals, onDragEnd, onDealClick }: PipelineBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    onDragEnd(result.draggableId, result.destination.droppableId as PipelineStage)
  }

  const dealsByStage = (stage: PipelineStage) => deals.filter((d) => d.stage === stage)

  const stageTotal = (stage: PipelineStage) =>
    dealsByStage(stage).reduce((sum, d) => sum + (d.value ?? 0), 0)

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageDeals = dealsByStage(stage.value)
          return (
            <div key={stage.value} className="flex-shrink-0 w-64">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${stage.color}`} />
                  <span className="text-xs font-medium text-white/70">{stage.label}</span>
                  <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">
                    {stageDeals.length}
                  </span>
                </div>
                <span className="text-xs text-white/40">{formatCurrency(stageTotal(stage.value))}</span>
              </div>
              <Droppable droppableId={stage.value}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-24 rounded-xl p-2 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-primary/5 border border-primary/20' : 'bg-white/2'
                    }`}
                  >
                    {stageDeals.map((deal, index) => (
                      <Draggable key={deal.id} draggableId={deal.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.8 : 1,
                            }}
                          >
                            <DealCard deal={deal} onClick={() => onDealClick?.(deal)} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
