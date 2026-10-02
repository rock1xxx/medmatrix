import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { SubjectIcon } from '../common/SubjectIcon'
import { Subject } from '../../types'
import {
  X,
  RotateCcw,
  ListOrdered,
  GripVertical,
  ArrowUpToLine,
} from 'lucide-react'
import { INITIAL_SUBJECTS } from '../../data/initialSubjects'

interface SubjectFlowModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SortableSubjectItemProps {
  id: string
  index: number
  sub: Subject
  isActive: boolean
  isCompleted: boolean
  remainingCount: number
  estimatedDays: number
  onSetActive: () => void
  onMoveToTop: () => void
}

const SortableSubjectItem: React.FC<SortableSubjectItemProps> = ({
  id,
  index,
  sub,
  isActive,
  isCompleted,
  remainingCount,
  estimatedDays,
  onSetActive,
  onMoveToTop,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.35 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition-all select-none ${
        isDragging
          ? 'bg-[#181822] border-dashed border-emerald-500 shadow-2xl'
          : isActive
          ? 'bg-[#181822] border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20'
          : isCompleted
          ? 'bg-[#121215]/60 border-zinc-800/60 opacity-70'
          : 'bg-[#16161c] border-zinc-800/80 hover:border-zinc-700'
      }`}
    >
      {/* Left: Drag Handle, Number, Icon, & Subject Title */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Grab Handle: Optimized for touch hold & laptop drag */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-2 -ml-1 text-zinc-500 hover:text-emerald-400 active:text-emerald-400 cursor-grab active:cursor-grabbing touch-none rounded-xl hover:bg-zinc-800/80 transition-colors shrink-0 flex items-center justify-center min-w-[36px] min-h-[36px]"
          title="Hold & drag to reorder"
          aria-label={`Drag handle for ${sub.name}`}
        >
          <GripVertical size={18} />
        </button>

        <span className="text-xs font-mono font-bold text-zinc-400 w-5 shrink-0 text-center">
          #{index + 1}
        </span>

        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            backgroundColor: `${sub.color}20`,
            color: sub.color,
          }}
        >
          <SubjectIcon name={sub.iconName} size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-semibold text-xs text-white truncate">
              {sub.name}
            </h4>
            {isActive && (
              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                Active
              </span>
            )}
            {isCompleted && (
              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-medium">
                Done ✓
              </span>
            )}
          </div>

          <div className="text-[10.5px] text-zinc-400 mt-0.5 flex items-center gap-1.5">
            <span>{sub.category}</span>
            <span>•</span>
            <span>
              {remainingCount > 0 ? `${remainingCount} lecs (~${estimatedDays}d)` : 'Completed'}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Quick Actions (Focus & Jump to Top) */}
      <div className="flex items-center gap-1.5 shrink-0">
        {!isActive && !isCompleted && (
          <button
            type="button"
            onClick={onSetActive}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-medium transition-all active:scale-95 min-h-[32px]"
          >
            Focus
          </button>
        )}

        {index > 0 && (
          <button
            type="button"
            onClick={onMoveToTop}
            className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-emerald-400 text-[10.5px] font-mono transition-colors active:scale-90 min-h-[32px] flex items-center gap-1"
            title={`Move ${sub.name} directly to #1`}
          >
            <ArrowUpToLine size={13} />
            <span className="hidden sm:inline">Top</span>
          </button>
        )}
      </div>
    </div>
  )
}

export const SubjectFlowModal: React.FC<SubjectFlowModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    subjects,
    topics,
    subjectOrder,
    reorderSubjects,
    activeSubjectId,
    setActiveSubjectId,
    dailyPaceTopics,
  } = useMedMatrixStore()

  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  // Sensors configured for mobile touch & laptop pointer
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4, // 4px mouse/pointer movement to start drag on laptops
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120, // 120ms touch hold on mobile
        tolerance: 6, // allows vertical swipe scrolling if moved before delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  if (!isOpen) return null

  // Ensure all 19 subjects are present in the list
  const validSubjectIds = subjects.map((s) => s.id)
  const orderedIds = [
    ...subjectOrder.filter((id) => validSubjectIds.includes(id)),
    ...validSubjectIds.filter((id) => !subjectOrder.includes(id)),
  ]

  const subjectMap = new Map(subjects.map((s) => [s.id, s]))

  const handleResetToDefault = () => {
    const defaultOrder = [...INITIAL_SUBJECTS]
      .sort((a, b) => a.order - b.order)
      .map((s) => s.id)
    reorderSubjects(defaultOrder)
  }

  const handleMoveToTop = (subId: string) => {
    const currentIndex = orderedIds.indexOf(subId)
    if (currentIndex > 0) {
      const newOrder = arrayMove(orderedIds, currentIndex, 0)
      reorderSubjects(newOrder)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = orderedIds.indexOf(String(active.id))
      const newIndex = orderedIds.indexOf(String(over.id))
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(orderedIds, oldIndex, newIndex)
        reorderSubjects(newOrder)
      }
    }
    setActiveDragId(null)
  }

  const activeDragSubject = activeDragId ? subjectMap.get(activeDragId) : null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
      />

      {/* Modal Bottom Sheet Content */}
      <div className="relative bg-[#141418] border-t sm:border border-[#26262e] rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 safe-bottom">
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:p-4 border-b border-[#222228]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <ListOrdered size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 tracking-tight">
                Subject Study Sequence (19)
              </h2>
              <p className="text-[11px] text-zinc-400">
                Hold <span className="font-mono text-emerald-400">⠿</span> and drag to rearrange subjects.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info & Reset Toolbar */}
        <div className="px-4 py-2 bg-[#101014] border-b border-[#202026] flex items-center justify-between text-xs">
          <span className="text-zinc-400 text-[11px] flex items-center gap-1">
            <span>💡</span>
            <span>Drag items or tap &quot;Top&quot; to jump instantly</span>
          </span>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors py-1 px-1.5 rounded"
          >
            <RotateCcw size={12} />
            <span>Reset Default</span>
          </button>
        </div>

        {/* Sortable Subject List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedIds}
              strategy={verticalListSortingStrategy}
            >
              {orderedIds.map((subId, index) => {
                const sub = subjectMap.get(subId)
                if (!sub) return null

                const subTopics = topics.filter((t) => t.subjectId === subId)
                const lockedCount = subTopics.filter((t) => t.status === 'LOCKED_IN_SR').length
                const remainingCount = subTopics.length - lockedCount
                const isCompleted = remainingCount === 0 && subTopics.length > 0
                const isActive = subId === activeSubjectId
                const estimatedDays = Math.ceil(remainingCount / (dailyPaceTopics || 2))

                return (
                  <SortableSubjectItem
                    key={subId}
                    id={subId}
                    index={index}
                    sub={sub}
                    isActive={isActive}
                    isCompleted={isCompleted}
                    remainingCount={remainingCount}
                    estimatedDays={estimatedDays}
                    onSetActive={() => setActiveSubjectId(subId)}
                    onMoveToTop={() => handleMoveToTop(subId)}
                  />
                )
              })}
            </SortableContext>

            {/* Drag Overlay: Floating card during active drag */}
            <DragOverlay>
              {activeDragSubject ? (
                <div className="p-3 rounded-2xl border border-emerald-500 bg-[#1e1e28] shadow-2xl ring-2 ring-emerald-500 flex items-center gap-2.5 opacity-95 scale-102">
                  <div className="p-2 text-emerald-400 shrink-0">
                    <GripVertical size={18} />
                  </div>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${activeDragSubject.color}20`,
                      color: activeDragSubject.color,
                    }}
                  >
                    <SubjectIcon name={activeDragSubject.iconName} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-white">
                      {activeDragSubject.name}
                    </h4>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      Moving in study sequence...
                    </span>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#222228] bg-[#101014]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all active:scale-95 min-h-[42px]"
          >
            Apply & View Calendar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
