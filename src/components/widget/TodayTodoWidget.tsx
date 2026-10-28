import React, { useState } from 'react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { getTopicSRStatus } from '../../lib/srEngine'
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
  ChevronDown,
  Check,
  Smartphone,
  SlidersHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'

export type WidgetSize = 'compact' | 'medium' | 'expanded'

interface TodayTodoWidgetProps {
  isStandalone?: boolean
  initialSize?: WidgetSize
  onClose?: () => void
  onOpenFullApp?: () => void
  onOpenIosGuide?: () => void
}

export const TodayTodoWidget: React.FC<TodayTodoWidgetProps> = ({
  isStandalone = false,
  initialSize = 'medium',
  onClose,
  onOpenFullApp,
  onOpenIosGuide,
}) => {
  const {
    topics,
    subjects,
    activeSubjectId,
    updateTopicStatus,
    advanceSRLevel,
    mandatoryTopicIds,
    stretchTopicIds,
  } = useMedMatrixStore()

  const [size, setSize] = useState<WidgetSize>(initialSize)
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'mcqs' | 'videos'>('all')
  const [bgStyle, setBgStyle] = useState<'frosted' | 'transparent' | 'opaque'>('frosted')
  const [cornerRadius, setCornerRadius] = useState<'rounded' | 'sharp' | 'pebble'>('rounded')
  const [showBranding, setShowBranding] = useState<boolean>(false) // Default false: clean "Today" as requested
  const [showAppearanceMenu, setShowAppearanceMenu] = useState<boolean>(false)

  const activeSubject = subjects.find((s) => s.id === activeSubjectId) || subjects[0]

  // =========================================================================
  // 1. MCQS TO SOLVE TODAY
  // Topics in STEP_2_WARD_MCQ + Locked SR reviews due today/overdue
  // =========================================================================
  const wardMCQTopics = topics.filter((t) => t.status === 'STEP_2_WARD_MCQ')

  const spacedReviewTopics = topics.filter((t) => {
    const srStatus = getTopicSRStatus(t)
    return srStatus === 'DUE_TODAY' || srStatus === 'OVERDUE'
  })

  // Combined list of MCQs/reviews to tick off today
  const allMCQsToSolve = [...wardMCQTopics, ...spacedReviewTopics]

  // =========================================================================
  // 2. VIDEOS LEFT TO WATCH TONIGHT
  // Topics in STEP_1_WATCHING or queued in tonight's mandatory session
  // =========================================================================
  const tonightWatching = topics.filter(
    (t) => t.status === 'STEP_1_WATCHING' && t.subjectId === activeSubjectId
  )

  const tonightQueued = topics.filter(
    (t) =>
      t.status === 'QUEUED' &&
      t.subjectId === activeSubjectId &&
      (mandatoryTopicIds.includes(t.id) || stretchTopicIds.includes(t.id))
  )

  // Fallback to next 2 queued if watching is empty
  const activeQueuedFallback =
    tonightWatching.length === 0 && tonightQueued.length === 0
      ? topics
          .filter((t) => t.status === 'QUEUED' && t.subjectId === activeSubjectId)
          .slice(0, 2)
      : []

  const allVideosToWatch = [
    ...tonightWatching,
    ...tonightQueued,
    ...activeQueuedFallback,
  ]

  const totalVideoMinutes = allVideosToWatch.reduce(
    (sum, t) => sum + (t.durationMinutes || 0),
    0
  )

  // Total tasks
  const totalTasks = allMCQsToSolve.length + allVideosToWatch.length

  // Handlers for ticking off tasks directly from widget
  const handleCompleteMCQ = (topicId: string, isSR: boolean) => {
    if (isSR) {
      advanceSRLevel(topicId)
      toast.success('🎉 Review completed! Spaced interval advanced.')
    } else {
      updateTopicStatus(topicId, 'STEP_3_ANNOTATING')
      toast.success('✅ Ward MCQs marked done! Queued for evening notes.')
    }
  }

  const handleCompleteVideo = (topicId: string) => {
    updateTopicStatus(topicId, 'STEP_2_WARD_MCQ')
    toast.success('🎬 Video watched! Moved to Ward MCQs to solve tomorrow.')
  }

  const handleOpenFull = () => {
    if (onOpenFullApp) {
      onOpenFullApp()
    } else if (isStandalone) {
      window.location.href = '/'
    }
  }

  const handlePopout = () => {
    window.open(
      '/?view=widget',
      'MedMatrixWidget',
      'width=420,height=580,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
    )
  }

  const bgClasses = {
    frosted: 'bg-[#121216]/90 backdrop-blur-xl border border-zinc-800/80',
    transparent: 'bg-black/30 backdrop-blur-sm border border-white/10 shadow-lg',
    opaque: 'bg-black border border-zinc-800 shadow-2xl',
  }[bgStyle]

  const radiusClasses = {
    sharp: 'rounded-xl',
    rounded: 'rounded-3xl',
    pebble: 'rounded-[36px]',
  }[cornerRadius]

  return (
    <div
      className={`relative flex flex-col ${bgClasses} ${radiusClasses} shadow-2xl overflow-hidden transition-all duration-200 select-none ${
        isStandalone
          ? 'w-full max-w-md mx-auto my-auto p-4 sm:p-5 min-h-[500px]'
          : size === 'compact'
          ? 'w-80 p-3.5'
          : size === 'medium'
          ? 'w-96 p-4.5'
          : 'w-[440px] max-w-[95vw] p-5'
      }`}
    >
      {/* Top Ambient Glow Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-80" />

      {/* Widget Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/70">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
            {showBranding ? 'M' : 'T'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-zinc-100 tracking-tight">
                {showBranding ? 'MedMatrix Today' : 'Today'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[10px] text-zinc-400 leading-none mt-0.5">
              {activeSubject?.name || 'Active Focus'} • {totalTasks} left
            </p>
          </div>
        </div>

        {/* Resizable Size Controls & Actions */}
        <div className="flex items-center gap-1">
          {/* Appearance Menu Toggle */}
          <button
            type="button"
            onClick={() => setShowAppearanceMenu(!showAppearanceMenu)}
            className={`p-1 rounded-lg transition-colors ${
              showAppearanceMenu
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Widget Appearance (Background, Corners, Header)"
          >
            <SlidersHorizontal size={13} />
          </button>

          {/* S | M | L Size Segmented Control */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-[10px] font-semibold">
            {(['compact', 'medium', 'expanded'] as WidgetSize[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`px-2 py-0.5 rounded transition-all ${
                  size === s
                    ? 'bg-emerald-500 text-black font-bold shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title={`Switch to ${s} view`}
              >
                {s[0].toUpperCase()}
              </button>
            ))}
          </div>

          {!isStandalone && (
            <button
              type="button"
              onClick={handlePopout}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Pop out widget into floating desktop mini window"
            >
              <ExternalLink size={13} />
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Minimize widget"
            >
              <ChevronDown size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Widget Appearance Settings Drawer/Popover */}
      {showAppearanceMenu && (
        <div className="p-2.5 my-2 rounded-2xl bg-zinc-950/90 border border-zinc-800 text-[11px] space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-medium">Header Title:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setShowBranding(false)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  !showBranding ? 'bg-emerald-500 text-black font-bold' : 'bg-zinc-900 text-zinc-400'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setShowBranding(true)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  showBranding ? 'bg-emerald-500 text-black font-bold' : 'bg-zinc-900 text-zinc-400'
                }`}
              >
                MedMatrix
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-medium">Background:</span>
            <div className="flex gap-1">
              {(['transparent', 'frosted', 'opaque'] as const).map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setBgStyle(bg)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                    bgStyle === bg ? 'bg-emerald-500 text-black font-bold' : 'bg-zinc-900 text-zinc-400'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-medium">Corners:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setCornerRadius('sharp')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  cornerRadius === 'sharp' ? 'bg-emerald-500 text-black font-bold' : 'bg-zinc-900 text-zinc-400'
                }`}
              >
                12px
              </button>
              <button
                type="button"
                onClick={() => setCornerRadius('rounded')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  cornerRadius === 'rounded' ? 'bg-emerald-500 text-black font-bold' : 'bg-zinc-900 text-zinc-400'
                }`}
              >
                24px (One UI)
              </button>
              <button
                type="button"
                onClick={() => setCornerRadius('pebble')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  cornerRadius === 'pebble' ? 'bg-emerald-500 text-black font-bold' : 'bg-zinc-900 text-zinc-400'
                }`}
              >
                36px
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* COMPACT MODE (Small 2x2 Glanceable View) */}
      {/* ========================================================================= */}
      {size === 'compact' ? (
        <div className="py-2.5 space-y-2.5">
          {/* Active Focus Hero Card */}
          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-emerald-500/20 flex flex-col justify-between min-h-[105px]">
            <div className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 size={11} /> Current Ward MCQ
            </div>
            
            <div className="my-1">
              <div className="text-[13px] font-bold text-zinc-100 truncate" title={allMCQsToSolve[0]?.title || 'Sterilization & Disinfection'}>
                {allMCQsToSolve[0]?.title || 'Sterilization & Disinfection'}
              </div>
              <div className="text-[11px] font-medium text-zinc-400 truncate mt-0.5" title={allMCQsToSolve[1]?.title || 'Bacterial Culture Media'}>
                {allMCQsToSolve[1]?.title || 'Bacterial Culture Media'}
              </div>
            </div>

            {/* Bottom Next Video Pill */}
            <div className="mt-1 px-2.5 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-between text-[10px]">
              <span className="font-semibold text-cyan-300 truncate max-w-[150px]">
                🌙 Next: {allVideosToWatch[0]?.title || 'Bacterial Genetics'}
              </span>
              <span className="font-mono font-bold text-zinc-200 bg-white/10 px-1.5 py-0.5 rounded">
                {allVideosToWatch[0]?.durationMinutes || 34}m
              </span>
            </div>
          </div>

          {/* Quick 1-tap open button */}
          <button
            type="button"
            onClick={handleOpenFull}
            className="w-full py-1 px-3 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 text-[10px] font-semibold flex items-center justify-center gap-1 transition-all active:scale-98"
          >
            <span>Open Study Desk</span>
            <ArrowUpRight size={11} />
          </button>
        </div>
      ) : (
        /* ========================================================================= */
        /* MEDIUM & EXPANDED MODES (Full Interactive To-Do List) */
        /* ========================================================================= */
        <div className="flex-1 overflow-y-auto py-3 space-y-4 max-h-[460px] pr-0.5">
          {/* Quick Segment Filter Pill (All | MCQs | Videos) */}
          {size === 'expanded' && (
            <div className="flex items-center justify-center gap-1 bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTabFilter('all')}
                className={`flex-1 py-1 rounded-lg font-medium transition-all ${
                  activeTabFilter === 'all'
                    ? 'bg-zinc-800 text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All ({totalTasks})
              </button>
              <button
                type="button"
                onClick={() => setActiveTabFilter('mcqs')}
                className={`flex-1 py-1 rounded-lg font-medium transition-all ${
                  activeTabFilter === 'mcqs'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                MCQs ({allMCQsToSolve.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTabFilter('videos')}
                className={`flex-1 py-1 rounded-lg font-medium transition-all ${
                  activeTabFilter === 'videos'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Videos ({allVideosToWatch.length})
              </button>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* SECTION 1: WARD MCQS LEFT (Checklist) */}
          {/* ------------------------------------------------------------- */}
          {(activeTabFilter === 'all' || activeTabFilter === 'mcqs') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 px-0.5">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={13} />
                  <span>Ward MCQs to Solve</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/40 text-emerald-300">
                  {allMCQsToSolve.length} pending
                </span>
              </div>

              {allMCQsToSolve.length === 0 ? (
                <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                  <Check size={14} className="text-emerald-400" />
                  <span>All MCQs and reviews clear for today!</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {allMCQsToSolve.map((topic) => {
                    const isSR = topic.status === 'LOCKED_IN_SR'
                    const sub = subjects.find((s) => s.id === topic.subjectId)

                    return (
                      <div
                        key={topic.id}
                        className="group flex items-start gap-2.5 p-2.5 rounded-2xl bg-[#16161c] border border-zinc-800/80 hover:border-emerald-500/40 transition-all"
                      >
                        {/* Interactive Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleCompleteMCQ(topic.id, isSR)}
                          className="mt-0.5 text-zinc-500 group-hover:text-emerald-400 hover:scale-110 active:scale-95 transition-all shrink-0"
                          title="Click to mark solved!"
                        >
                          <Circle size={16} />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                            <span className="font-semibold text-zinc-300 truncate">
                              {sub?.name || 'Subject'}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-zinc-500">
                              {isSR ? `SR Lvl ${topic.srData?.level ?? 0}` : `Lec ${topic.chapterNumber}`}
                            </span>
                            {topic.highYield && (
                              <span className="text-[9px] px-1 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 inline-flex items-center gap-0.5 shrink-0">
                                <Sparkles size={8} /> HY
                              </span>
                            )}
                          </div>

                          <div className="font-medium text-xs text-zinc-100 group-hover:text-emerald-300 transition-colors line-clamp-1 leading-snug mt-0.5">
                            {topic.title}
                          </div>

                          {size === 'expanded' && (
                            <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-2">
                              <span>Duration: {topic.durationMinutes}m</span>
                              {topic.bookmarkCount ? (
                                <span>• {topic.bookmarkCount} pearls</span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* SECTION 2: TONIGHT'S VIDEOS LEFT (Checklist) */}
          {/* ------------------------------------------------------------- */}
          {(activeTabFilter === 'all' || activeTabFilter === 'videos') && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 px-0.5">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <PlayCircle size={13} />
                  <span>Tonight&apos;s Videos to Watch</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/40 text-cyan-300">
                  {allVideosToWatch.length} left (~{totalVideoMinutes}m)
                </span>
              </div>

              {allVideosToWatch.length === 0 ? (
                <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                  <Check size={14} className="text-cyan-400" />
                  <span>Tonight&apos;s video quota fully watched!</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {allVideosToWatch.map((topic) => {
                    const sub = subjects.find((s) => s.id === topic.subjectId)
                    const isWatching = topic.status === 'STEP_1_WATCHING'

                    return (
                      <div
                        key={topic.id}
                        className="group flex items-start gap-2.5 p-2.5 rounded-2xl bg-[#16161c] border border-zinc-800/80 hover:border-cyan-500/40 transition-all"
                      >
                        {/* Interactive Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleCompleteVideo(topic.id)}
                          className="mt-0.5 text-zinc-500 group-hover:text-cyan-400 hover:scale-110 active:scale-95 transition-all shrink-0"
                          title="Click to mark watched!"
                        >
                          <Circle size={16} />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                            <span className="font-semibold text-zinc-300 truncate">
                              {sub?.name || 'Subject'}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-zinc-500">
                              Lec {topic.chapterNumber}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-cyan-400">
                              {topic.durationMinutes}m
                            </span>
                            {isWatching && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/40 shrink-0">
                                Watching
                              </span>
                            )}
                          </div>

                          <div className="font-medium text-xs text-zinc-100 group-hover:text-cyan-300 transition-colors line-clamp-1 leading-snug mt-0.5">
                            {topic.title}
                          </div>

                          {size === 'expanded' && topic.highYieldTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {topic.highYieldTags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[9px] px-1 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Widget Footer (Actions) */}
      <div className="pt-2 border-t border-zinc-800/70 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={handleOpenFull}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-emerald-400 font-medium text-[11px] transition-colors"
        >
          <span>Open Full MedMatrix</span>
          <ArrowUpRight size={13} />
        </button>

        {onOpenIosGuide ? (
          <button
            type="button"
            onClick={onOpenIosGuide}
            className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Smartphone size={12} />
            <span>Add to Phone Home Screen</span>
          </button>
        ) : (
          <span className="text-[10px] text-zinc-600 font-mono">
            Auto-Sync • Offline Ready
          </span>
        )}
      </div>
    </div>
  )
}
