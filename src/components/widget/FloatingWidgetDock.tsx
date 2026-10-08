import React, { useState, useEffect } from 'react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { getTopicSRStatus } from '../../lib/srEngine'
import { TodayTodoWidget } from './TodayTodoWidget'
import { CheckCircle2, PlayCircle, Layers, X, ExternalLink } from 'lucide-react'

interface FloatingWidgetDockProps {
  onOpenIosGuide?: () => void
}

export const FloatingWidgetDock: React.FC<FloatingWidgetDockProps> = ({ onOpenIosGuide }) => {
  const [isOpen, setIsOpen] = useState(false)
  const { topics, activeSubjectId, activeTab } = useMedMatrixStore()

  // Don't show in widget standalone mode
  const isWidgetPage =
    typeof window !== 'undefined' &&
    (window.location.search.includes('view=widget') || window.location.search.includes('widget=true'))

  if (isWidgetPage) return null

  // Calculate live counts
  const wardMCQCount = topics.filter((t) => t.status === 'STEP_2_WARD_MCQ').length
  const srDueCount = topics.filter((t) => {
    const s = getTopicSRStatus(t)
    return s === 'DUE_TODAY' || s === 'OVERDUE'
  }).length
  const totalMCQs = wardMCQCount + srDueCount

  const watchingCount = topics.filter(
    (t) => t.status === 'STEP_1_WATCHING' && t.subjectId === activeSubjectId
  ).length

  return (
    <aside aria-label="Today tasks quick dock" className="fixed bottom-20 right-4 z-40 sm:bottom-6 sm:right-6 select-none">
      {isOpen ? (
        <div className="animate-in fade-in zoom-in-95 duration-150">
          <TodayTodoWidget
            isStandalone={false}
            initialSize="medium"
            onClose={() => setIsOpen(false)}
            onOpenIosGuide={onOpenIosGuide}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#141418]/90 hover:bg-[#1a1a22] border border-zinc-800 hover:border-emerald-500/50 text-zinc-200 shadow-2xl backdrop-blur-md transition-all active:scale-95 group"
          title="Open Today's MCQs & Videos To-Do Widget"
        >
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-emerald-400 group-hover:animate-ping" />
            <div className="w-2 h-2 rounded-full bg-emerald-400 absolute inset-0" />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-zinc-100 flex items-center gap-1">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>{totalMCQs} MCQs</span>
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300 flex items-center gap-1">
              <PlayCircle size={13} className="text-cyan-400" />
              <span>{watchingCount} Videos</span>
            </span>
          </div>

          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded-md ml-1">
            Widget
          </span>
        </button>
      )}
    </aside>
  )
}
