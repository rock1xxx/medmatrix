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
} from '@dnd-kit/core'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { Topic, TopicStatus } from '../../types'
import { SubjectIcon } from '../common/SubjectIcon'
import { getTopicSRStatus, getSRStatusMetadata } from '../../lib/srEngine'
import {
  Search,
  Filter,
  Bookmark,
  Sparkles,
  Lock,
  ArrowRight,
  ArrowLeft,
  GripVertical,
  Plus,
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
    subtitle: 'Queue',
    color: '#71717a',
    bgLight: 'bg-[#121214]',
    borderColor: 'border-[#202024]',
  },
  {
    id: 'col-ward',
    status: 'STEP_2_WARD_MCQ',
    title: 'Ward MCQs',
    subtitle: 'Watched yesterday',
    color: '#10b981',
    bgLight: 'bg-[#121214]',
    borderColor: 'border-[#202024]',
  },
  {
    id: 'col-annotate',
    status: 'STEP_3_ANNOTATING',
    title: 'Annotations',
    subtitle: 'Hostel book notes',
    color: '#38bdf8',
    bgLight: 'bg-[#121214]',
    borderColor: 'border-[#202024]',
  },
  {
    id: 'col-sr',
    status: 'LOCKED_IN_SR',
    title: 'Spaced Repetition',
    subtitle: 'Active memory intervals',
    color: '#818cf8',
    bgLight: 'bg-[#121214]',
    borderColor: 'border-[#202024]',
  },
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
        distance: 5,
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

    if (targetColumn) {
      if (targetColumn.status === 'LOCKED_IN_SR') {
        lockTopicIntoSR(topicId)
      } else {
        updateTopicStatus(topicId, targetColumn.status)
        toast.info(`Moved to "${targetColumn.title}"`)
      }
    }
  }

  const handleMoveStep = (topic: Topic, direction: 'forward' | 'backward') => {
    const pipeline: TopicStatus[] = [
      'QUEUED',
      'STEP_2_WARD_MCQ',
      'STEP_3_ANNOTATING',
      'LOCKED_IN_SR',
    ]
    // Map STEP_1_WATCHING to index 0 or 1
    const currentStatus = topic.status === 'STEP_1_WATCHING' ? 'STEP_2_WARD_MCQ' : topic.status
    const currentIndex = pipeline.indexOf(currentStatus)

    if (direction === 'forward') {
      const nextIndex = Math.min(pipeline.length - 1, currentIndex + 1)
      const nextStatus = pipeline[nextIndex]
      if (nextStatus === 'LOCKED_IN_SR') {
        lockTopicIntoSR(topic.id)
      } else {
        updateTopicStatus(topic.id, nextStatus)
      }
    } else {
      const prevIndex = Math.max(0, currentIndex - 1)
      updateTopicStatus(topic.id, pipeline[prevIndex])
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-24 px-3 sm:px-6 pt-2">
      {/* Header & Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Master Kanban Board
            </h1>
            <p className="text-xs text-slate-400">
              Drag and drop topics across the asynchronous clinical revision pipeline.
            </p>
          </div>

          {/* High Yield Toggle */}
          <button
            type="button"
            onClick={() => setHighYieldOnlyFilter(!highYieldOnlyFilter)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all self-start md:self-auto ${
              highYieldOnlyFilter
                ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-950/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>High-Yield Only</span>
          </button>
        </div>

        {/* Search & Subject Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-slate-800/80">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic title, chapter, or tags..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              aria-label="Filter Kanban topics by subject"
              className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 appearance-none pr-8 cursor-pointer"
            >
              <option value="ALL">All 19 Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* DND Kanban Context */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((col) => {
            // In column 2 (MCQs Due in Ward), we include both STEP_2_WARD_MCQ and STEP_1_WATCHING
            const colTopics = filteredTopics.filter((t) => {
              if (col.status === 'STEP_2_WARD_MCQ') {
                return t.status === 'STEP_2_WARD_MCQ' || t.status === 'STEP_1_WATCHING'
              }
              return t.status === col.status
            })

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
            <div className="bg-slate-900 border-2 border-cyan-400 rounded-xl p-3 shadow-2xl opacity-90 scale-105 pointer-events-none w-72">
              <span className="text-[10px] font-mono text-cyan-400">
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
      className={`rounded-2xl border ${column.borderColor} ${column.bgLight} backdrop-blur-sm p-3.5 flex flex-col min-h-[580px] max-h-[750px] transition-colors ${
        isOver ? 'ring-2 ring-cyan-400 bg-slate-900/90' : ''
      }`}
    >
      {/* Column Header */}
      <div className="pb-3 border-b border-slate-800/80 mb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: column.color }}
            />
            <h3 className="font-extrabold text-sm text-slate-100 tracking-tight">{column.title}</h3>
            <span className="text-[11px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-slate-950 text-slate-300 border border-slate-800">
              {topics.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">{column.subtitle}</p>
        </div>
      </div>

      {/* Cards List (Scrollable) */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {topics.length === 0 ? (
          <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-800/60 rounded-xl text-center p-3">
            <span className="text-xs text-slate-500 font-medium">Drop topics here</span>
          </div>
        ) : (
          topics.map((topic) => {
            const subject = subjects.find((s) => s.id === topic.subjectId)
            const srStatus = getTopicSRStatus(topic)
            const meta = getSRStatusMetadata(srStatus)

            return (
              <div
                key={topic.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', topic.id)
                }}
                className="group bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3 shadow-md hover:shadow-xl transition-all space-y-2 cursor-grab active:cursor-grabbing"
              >
                {/* Card Meta Row */}
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 truncate max-w-[140px]"
                    style={{
                      backgroundColor: `${subject?.color || '#94a3b8'}15`,
                      borderColor: `${subject?.color || '#94a3b8'}30`,
                      color: subject?.color || '#94a3b8',
                    }}
                  >
                    <SubjectIcon name={subject?.iconName || 'BookOpen'} size={10} />
                    <span className="truncate">{subject?.shortCode || subject?.name}</span>
                  </span>

                  <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                    <span>Lec {topic.chapterNumber}</span>
                    <span>•</span>
                    <span>{topic.durationMinutes}m</span>
                  </div>
                </div>

                {/* Title */}
                <h4
                  onClick={() => onSelectTopic(topic)}
                  className="font-bold text-xs sm:text-sm text-slate-200 hover:text-cyan-300 cursor-pointer transition-colors line-clamp-2"
                >
                  {topic.title}
                </h4>

                {/* High Yield Badges / SR Level */}
                <div className="flex items-center justify-between gap-1 text-[10px]">
                  {meta ? (
                    <span
                      className={`font-bold px-1.5 py-0.2 rounded-full border ${meta.badgeClass}`}
                    >
                      {meta.label}
                    </span>
                  ) : topic.highYield ? (
                    <span className="text-amber-400 font-semibold">
                      High-Yield
                    </span>
                  ) : (
                    <span className="text-zinc-500 font-mono">
                      Core
                    </span>
                  )}

                  {topic.srData && (
                    <span className="font-mono text-emerald-400 font-bold">
                      L{topic.srData.level}
                    </span>
                  )}
                </div>

                {/* Card Quick-Move Buttons */}
                <div className="pt-1.5 border-t border-slate-900 flex items-center justify-between text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => onMoveStep(topic, 'backward')}
                    className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    title="Step backward in pipeline"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>

                  <div className="flex items-center gap-1">
                    <GripVertical className="w-3 h-3 text-slate-600" />
                  </div>

                  <button
                    type="button"
                    onClick={() => onMoveStep(topic, 'forward')}
                    className="p-1 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors"
                    title="Advance to next step in pipeline"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

