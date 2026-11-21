import React, { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { Topic, TopicStatus } from '../../types'
import { SubjectIcon } from '../common/SubjectIcon'
import { getTopicSRStatus, getSRStatusMetadata } from '../../lib/srEngine'
import {
  Search,
  Filter,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  GripVertical,
} from 'lucide-react'
import { toast } from 'sonner'

interface KanbanColumnDef {
  id: string
  status: TopicStatus
  title: string
  subtitle: string
  color: string
  bgLight: string
  borderColor: string
}

const COLUMNS: KanbanColumnDef[] = [
  {
    id: 'col-queued',
    status: 'QUEUED',
    title: 'Backlog',
    subtitle: 'Not started yet',
    color: '#71717a',
    bgLight: 'bg-[#121216]',
    borderColor: 'border-[#222228]',
  },
  {
    id: 'col-watching',
    status: 'STEP_1_WATCHING',
    title: 'Watching',
    subtitle: "Tonight's videos",
    color: '#a78bfa',
    bgLight: 'bg-[#121216]',
    borderColor: 'border-[#222228]',
  },
  {
    id: 'col-ward',
    status: 'STEP_2_WARD_MCQ',
    title: 'Ward MCQs',
    subtitle: 'Solve on shift',
    color: '#fbbf24',
    bgLight: 'bg-[#121216]',
    borderColor: 'border-[#222228]',
  },
  {
    id: 'col-annotate',
    status: 'STEP_3_ANNOTATING',
    title: 'Annotations',
    subtitle: 'Hostel book notes',
    color: '#38bdf8',
    bgLight: 'bg-[#121216]',
    borderColor: 'border-[#222228]',
  },
  {
    id: 'col-sr',
    status: 'LOCKED_IN_SR',
    title: 'Spaced Repetition',
    subtitle: 'Active intervals',
    color: '#34d399',
    bgLight: 'bg-[#121216]',
    borderColor: 'border-[#222228]',
  },
]

const PIPELINE_ORDER: TopicStatus[] = [
  'QUEUED',
  'STEP_1_WATCHING',
  'STEP_2_WARD_MCQ',
  'STEP_3_ANNOTATING',
  'LOCKED_IN_SR',
]

export const MasterKanban: React.FC = () => {
  const {
    topics,
    subjects,
    updateTopicStatus,
    lockTopicIntoSR,
    setSelectedTopicForDetail,
    searchQuery,
    setSearchQuery,
    selectedSubjectFilter,
    setSelectedSubjectFilter,
    highYieldOnlyFilter,
    setHighYieldOnlyFilter,
  } = useMedMatrixStore()

  const [activeDragTopic, setActiveDragTopic] = useState<Topic | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  )

  const filteredTopics = topics.filter((t) => {
    if (selectedSubjectFilter !== 'ALL' && t.subjectId !== selectedSubjectFilter) return false
    if (highYieldOnlyFilter && !t.highYield) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const titleMatch = t.title.toLowerCase().includes(q)
      const tagMatch = t.highYieldTags.some((tag) => tag.toLowerCase().includes(q))
      return titleMatch || tagMatch
    }
    return true
  })

  const handleDragStart = (event: DragStartEvent) => {
    const topicId = String(event.active.id)
    const topic = topics.find((t) => t.id === topicId)
    if (topic) {
      setActiveDragTopic(topic)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragTopic(null)
    if (!over) return

    const topicId = String(active.id)
    const targetColId = String(over.id)
    const targetColumn = COLUMNS.find((c) => c.id === targetColId)
    const topic = topics.find((t) => t.id === topicId)

    if (targetColumn && topic && topic.status !== targetColumn.status) {
      if (targetColumn.status === 'LOCKED_IN_SR') {
        lockTopicIntoSR(topicId)
      } else {
        updateTopicStatus(topicId, targetColumn.status)
        toast.info(`Moved to "${targetColumn.title}"`)
      }
    }
  }

  const handleMoveStep = (topic: Topic, direction: 'forward' | 'backward') => {
    const currentIndex = PIPELINE_ORDER.indexOf(topic.status)
    if (currentIndex === -1) return

    if (direction === 'forward') {
      const nextIndex = Math.min(PIPELINE_ORDER.length - 1, currentIndex + 1)
      if (nextIndex === currentIndex) return
      const nextStatus = PIPELINE_ORDER[nextIndex]
      if (nextStatus === 'LOCKED_IN_SR') {
        lockTopicIntoSR(topic.id)
      } else {
        updateTopicStatus(topic.id, nextStatus)
      }
    } else {
      const prevIndex = Math.max(0, currentIndex - 1)
      if (prevIndex === currentIndex) return
      updateTopicStatus(topic.id, PIPELINE_ORDER[prevIndex])
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto space-y-4 pb-24 px-3 sm:px-6 pt-2">
      {/* Header & Filter Controls */}
      <div className="bg-[#141418] border border-[#222228] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
              Master Kanban Board
            </h1>
            <p className="text-xs text-zinc-400">
              Drag and drop topics across all 5 clinical revision stages.
            </p>
          </div>

          {/* High Yield Toggle */}
          <button
            type="button"
            onClick={() => setHighYieldOnlyFilter(!highYieldOnlyFilter)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all self-start md:self-auto ${
              highYieldOnlyFilter
                ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-950/40'
                : 'bg-[#0e0e12] text-zinc-400 border-[#26262e] hover:text-zinc-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>High-Yield Only</span>
          </button>
        </div>

        {/* Search & Subject Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-[#202026]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic title, chapter, or tags..."
              className="w-full bg-[#0e0e12] border border-[#26262e] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              aria-label="Filter Kanban topics by subject"
              className="w-full sm:w-auto bg-[#0e0e12] border border-[#26262e] rounded-xl px-3 py-2 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/60 appearance-none pr-8 cursor-pointer"
            >
              <option value="ALL">All {subjects.length} Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* DND Kanban Context */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-start">
          {COLUMNS.map((col) => {
            const colTopics = filteredTopics.filter((t) => t.status === col.status)

            return (
              <KanbanColumn
                key={col.id}
                column={col}
                topics={colTopics}
                subjects={subjects}
                onSelectTopic={(topic) => setSelectedTopicForDetail(topic)}
                onMoveStep={handleMoveStep}
              />
            )
          })}
        </div>

        {/* Drag Overlay Preview */}
        <DragOverlay>
          {activeDragTopic && (
            <div className="bg-[#18181f] border-2 border-emerald-400 rounded-xl p-3 shadow-2xl opacity-95 scale-105 pointer-events-none w-64">
              <span className="text-[10px] font-mono text-emerald-400">
                Lec {activeDragTopic.chapterNumber}
              </span>
              <h4 className="text-xs font-bold text-white line-clamp-1">{activeDragTopic.title}</h4>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

interface KanbanColumnProps {
  column: KanbanColumnDef
  topics: Topic[]
  subjects: { id: string; name: string; shortCode: string; color: string; iconName: string }[]
  onSelectTopic: (topic: Topic) => void
  onMoveStep: (topic: Topic, direction: 'forward' | 'backward') => void
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  topics,
  subjects,
  onSelectTopic,
  onMoveStep,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-col-${column.status}`}
      className={`rounded-2xl border ${column.borderColor} ${column.bgLight} p-3 flex flex-col min-h-[520px] max-h-[750px] transition-colors ${
        isOver ? 'ring-2 ring-emerald-400 bg-[#17171f]' : ''
      }`}
    >
      {/* Column Header */}
      <div className="pb-2.5 border-b border-[#202026] mb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: column.color }}
            />
            <h3 className="font-bold text-sm text-zinc-100 tracking-tight">{column.title}</h3>
            <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[#0e0e12] text-zinc-300 border border-[#26262e]">
              {topics.length}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">{column.subtitle}</p>
        </div>
      </div>

      {/* Cards List (Scrollable) */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
        {topics.length === 0 ? (
          <div className="h-28 flex items-center justify-center border border-dashed border-zinc-800 rounded-xl text-center p-3">
            <span className="text-xs text-zinc-600 font-medium">Drop topics here</span>
          </div>
        ) : (
          topics.map((topic) => (
            <KanbanCard
              key={topic.id}
              topic={topic}
              subject={subjects.find((s) => s.id === topic.subjectId)}
              onSelectTopic={onSelectTopic}
              onMoveStep={onMoveStep}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface KanbanCardProps {
  topic: Topic
  subject?: { id: string; name: string; shortCode: string; color: string; iconName: string }
  onSelectTopic: (topic: Topic) => void
  onMoveStep: (topic: Topic, direction: 'forward' | 'backward') => void
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  topic,
  subject,
  onSelectTopic,
  onMoveStep,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: topic.id,
  })

  const srStatus = getTopicSRStatus(topic)
  const meta = getSRStatusMetadata(srStatus)
  const canStepBack = topic.status !== 'QUEUED'
  const canStepForward = topic.status !== 'LOCKED_IN_SR'

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group bg-[#16161c] border border-[#24242c] hover:border-zinc-700 rounded-xl p-3 shadow-sm transition-colors space-y-2 cursor-grab active:cursor-grabbing touch-none ${
        isDragging ? 'opacity-40 ring-1 ring-emerald-400/60' : ''
      }`}
    >
      {/* Card Meta Row */}
      <div className="flex items-center justify-between gap-1.5">
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 truncate max-w-[120px]"
          style={{
            backgroundColor: `${subject?.color || '#94a3b8'}15`,
            borderColor: `${subject?.color || '#94a3b8'}30`,
            color: subject?.color || '#94a3b8',
          }}
        >
          <SubjectIcon name={subject?.iconName || 'BookOpen'} size={10} />
          <span className="truncate">{subject?.shortCode || subject?.name}</span>
        </span>

        <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
          <span>L{topic.chapterNumber}</span>
          <span>•</span>
          <span>{topic.durationMinutes}m</span>
        </div>
      </div>

      {/* Title */}
      <button
        type="button"
        onClick={() => onSelectTopic(topic)}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full text-left font-semibold text-xs text-zinc-200 hover:text-emerald-400 cursor-pointer transition-colors line-clamp-2"
      >
        {topic.title}
      </button>

      {/* High Yield Badges / SR Level */}
      <div className="flex items-center justify-between gap-1 text-[10px]">
        {meta ? (
          <span className={`font-bold px-1.5 py-0.5 rounded-full border ${meta.badgeClass}`}>
            {meta.label}
          </span>
        ) : topic.highYield ? (
          <span className="text-amber-400 font-semibold">High-Yield</span>
        ) : (
          <span className="text-zinc-500 font-mono">Core</span>
        )}

        {topic.srData && (
          <span className="font-mono text-emerald-400 font-bold">L{topic.srData.level}</span>
        )}
      </div>

      {/* Card Quick-Move Buttons */}
      <div className="pt-1.5 border-t border-[#202028] flex items-center justify-between text-zinc-500 opacity-70 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          disabled={!canStepBack}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onMoveStep(topic, 'backward')}
          aria-label={`Move ${topic.title} backward`}
          className={`p-1 rounded transition-colors ${
            canStepBack
              ? 'hover:text-white hover:bg-zinc-800'
              : 'opacity-25 cursor-not-allowed'
          }`}
          title="Step backward in pipeline"
        >
          <ArrowLeft className="w-3 h-3" />
        </button>

        <GripVertical className="w-3 h-3 text-zinc-600" aria-hidden="true" />

        <button
          type="button"
          disabled={!canStepForward}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onMoveStep(topic, 'forward')}
          aria-label={`Move ${topic.title} forward`}
          className={`p-1 rounded transition-colors ${
            canStepForward
              ? 'hover:text-emerald-300 hover:bg-zinc-800'
              : 'opacity-25 cursor-not-allowed'
          }`}
          title="Advance to next step in pipeline"
        >
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

