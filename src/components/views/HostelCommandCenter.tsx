import React, { useState } from 'react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { SubjectIcon } from '../common/SubjectIcon'
import { getTopicSRStatus } from '../../lib/srEngine'
import { RevisionPullDrawer } from '../modals/RevisionPullDrawer'
import {
  Lock,
  CheckCircle2,
  PlayCircle,
  Plus,
  ArrowRight,
  Trophy,
  Moon,
} from 'lucide-react'
import { toast } from 'sonner'

export const HostelCommandCenter: React.FC = () => {
  const {
    topics,
    subjects,
    activeSubjectId,
    setActiveSubjectId,
    updateTopicStatus,
    lockTopicIntoSR,
    advanceSRLevel,
    snoozeTopicSR,
    setStretchDrawerOpen,
    setSelectedTopicForDetail,
    refreshDailyBaseline,
    swtCompletedSubjects,
    markSWTCompleted,
    ebbinghausIntervals,
    postponeIntervalDays,
  } = useMedMatrixStore()

  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(3) // Default to step 3 (Tonight's Videos) if annotations are empty
  const [speed, setSpeed] = useState<'1x' | '1.5x' | '2x'>('1.5x')
  const [revisionDrawerOpen, setRevisionDrawerOpen] = useState(false)

  const activeSubject = subjects.find((s) => s.id === activeSubjectId) || subjects[0]

  // Step 1: Pending Annotations (filter by active subject, but allow seeing other subjects if needed)
  const activeSubjectAnnotations = topics.filter(
    (t) => t.status === 'STEP_3_ANNOTATING' && t.subjectId === activeSubjectId
  )

  // Step 2: 15-Min Spaced Reviews (Global across all locked subjects)
  const srTopics = topics.filter((t) => t.status === 'LOCKED_IN_SR' && t.srData)
  const reviewsDue = srTopics.filter((t) => {
    const s = getTopicSRStatus(t)
    return s === 'DUE_TODAY' || s === 'OVERDUE'
  })

  // Step 3: Tonight's Video Queue for the Active Subject
  const activeSubjectVideos = topics.filter(
    (t) => t.status === 'STEP_1_WATCHING' && t.subjectId === activeSubjectId
  )
  const totalMins = activeSubjectVideos.reduce((acc, t) => acc + t.durationMinutes, 0)
  const mult = speed === '1x' ? 1 : speed === '1.5x' ? 1.5 : 2
  const adjustedMins = Math.round(totalMins / mult)

  // Check if active subject is complete
  const allActiveTopics = topics.filter((t) => t.subjectId === activeSubjectId)
  const isSubjectAllLocked =
    allActiveTopics.length > 0 && allActiveTopics.every((t) => t.status === 'LOCKED_IN_SR')
  const isSWTDone = swtCompletedSubjects.includes(activeSubjectId)

  return (
    <div className="max-w-xl mx-auto space-y-5 px-4 pb-28">
      {/* Header with Evening Moon */}
      <div className="pt-2 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight leading-none">Tonight&apos;s Session</h1>
              <span className="text-[11px] text-zinc-400 font-medium">Hostel Desk Deep Study</span>
            </div>
          </div>
          <span className="text-xs text-zinc-400 font-mono">Hostel Desk</span>
        </div>
      </div>

      {/* 3 Step Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-[#141418] p-1 rounded-xl border border-[#222228]">
        <button
          type="button"
          onClick={() => setActiveStep(1)}
          className={`py-2 px-1 text-[11px] sm:text-xs font-semibold rounded-lg transition-all text-center min-h-[40px] active:scale-95 flex items-center justify-center ${
            activeStep === 1
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          1. Annotate ({activeSubjectAnnotations.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveStep(2)}
          className={`py-2 px-1 text-[11px] sm:text-xs font-semibold rounded-lg transition-all text-center min-h-[40px] active:scale-95 flex items-center justify-center ${
            activeStep === 2
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          2. Reviews ({reviewsDue.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveStep(3)}
          className={`py-2 px-1 text-[11px] sm:text-xs font-semibold rounded-lg transition-all text-center min-h-[40px] active:scale-95 flex items-center justify-center ${
            activeStep === 3
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          3. Videos ({activeSubjectVideos.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: PENDING ANNOTATIONS (ACTIVE SUBJECT) */}
      {/* ========================================================================= */}
      {activeStep === 1 && (
        <div className="space-y-3">
          <div className="text-xs text-zinc-400">
            {activeSubject.name} topics finished in today&apos;s ward. Mark physical book notes and lock into Spaced Repetition:
          </div>

          {activeSubjectAnnotations.length === 0 ? (
            <div className="bg-[#141418] border border-[#202026] rounded-2xl p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-zinc-200">No {activeSubject.name} Annotations Pending</p>
              <p className="text-xs text-zinc-500">
                Topics appear here after you tap &quot;Done with MCQs&quot; in the Ward tab.
              </p>
            </div>
          ) : (
            activeSubjectAnnotations.map((topic) => (
              <div
                key={topic.id}
                className="bg-[#141418] border border-[#222228] hover:border-zinc-700 rounded-2xl p-4 space-y-3 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-400">
                    Lec {topic.chapterNumber} • {topic.durationMinutes}m video
                  </span>
                </div>

                <h3
                  onClick={() => setSelectedTopicForDetail(topic)}
                  className="font-bold text-base text-zinc-100 hover:text-emerald-400 cursor-pointer transition-colors"
                >
                  {topic.title}
                </h3>

                <button
                  type="button"
                  onClick={() => lockTopicIntoSR(topic.id)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Annotated &rarr; Lock into Spaced Repetition</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: 15-MIN SPACED REVIEWS DUE (GLOBAL ACROSS ALL SUBJECTS) */}
      {/* ========================================================================= */}
      {activeStep === 2 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Ebbinghaus intervals (+{ebbinghausIntervals.join('d, +')}d):</span>
            <button
              type="button"
              onClick={() => setRevisionDrawerOpen(true)}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 hover:text-teal-200 transition-all flex items-center gap-1 shrink-0 active:scale-95"
            >
              <Plus size={13} className="stroke-[3]" />
              <span>Pull Past Topics</span>
            </button>
          </div>

          {reviewsDue.length === 0 ? (
            <div className="bg-[#141418] border border-[#202026] rounded-2xl p-8 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-teal-400 mx-auto" />
              <p className="text-sm font-semibold text-zinc-200">Reviews All Clear!</p>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                No cards due today. You are completely on schedule with memory intervals.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setRevisionDrawerOpen(true)}
                  className="text-xs font-bold px-4 py-2.5 rounded-xl bg-teal-500 text-black hover:bg-teal-400 active:scale-95 transition-all inline-flex items-center gap-1.5 shadow-md shadow-teal-950/40"
                >
                  <Plus size={14} className="stroke-[3]" />
                  <span>Pull Past Subject for Revision</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {reviewsDue.map((topic) => {
                const subject = subjects.find((s) => s.id === topic.subjectId)
                const srStatus = getTopicSRStatus(topic)

                return (
                  <div
                    key={topic.id}
                    className="bg-[#141418] border border-[#222228] hover:border-zinc-700 rounded-2xl p-4 space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <SubjectIcon name={subject?.iconName || 'BookOpen'} size={13} className="text-teal-400" />
                        {subject?.name} • Level {topic.srData?.level ?? 0}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          srStatus === 'OVERDUE'
                            ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                            : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                        }`}
                      >
                        {srStatus === 'OVERDUE' ? 'Overdue' : 'Due Today'}
                      </span>
                    </div>

                    <h3
                      onClick={() => setSelectedTopicForDetail(topic)}
                      className="font-bold text-base text-zinc-100 hover:text-teal-400 cursor-pointer transition-colors"
                    >
                      {topic.title}
                    </h3>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => advanceSRLevel(topic.id)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/30"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Reviewed Today &rarr; Advance Interval</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => snoozeTopicSR(topic.id)}
                        title={`Postpone this review for ${postponeIntervalDays} days`}
                        className="px-3 py-2.5 rounded-xl text-xs font-medium bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50 transition-all shrink-0 active:scale-95"
                      >
                        Revise Later (+{postponeIntervalDays}d)
                      </button>
                    </div>
                  </div>
                )
              })}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setRevisionDrawerOpen(true)}
                  className="w-full py-2.5 rounded-xl border border-dashed border-zinc-700 hover:border-teal-500/50 bg-[#141418]/60 hover:bg-[#16161e] text-xs font-semibold text-zinc-300 hover:text-teal-300 inline-flex items-center justify-center gap-1.5 transition-all active:scale-98"
                >
                  <Plus className="w-4 h-4 text-teal-400" />
                  <span>Pull another past topic to revise tonight</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: TONIGHT'S VIDEOS FOR ACTIVE SUBJECT & SWT CHECKPOINT */}
      {/* ========================================================================= */}
      {activeStep === 3 && (
        <div className="space-y-3">
          {/* Subject-Wise Test (SWT) Milestone Banner if subject is all locked */}
          {isSubjectAllLocked ? (
            <div className="bg-[#141418] border border-amber-500/40 rounded-2xl p-5 space-y-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Trophy size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  {activeSubject.name} Completed! 🏆
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  All chapters of {activeSubject.name} are finished! Time to test retention with a Subject-Wise Test (SWT).
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                {!isSWTDone ? (
                  <button
                    type="button"
                    onClick={() => markSWTCompleted(activeSubjectId)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-all"
                  >
                    ✓ Mark Subject-Wise Test (SWT) Completed
                  </button>
                ) : (
                  <div className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5 py-1">
                    <CheckCircle2 size={15} />
                    <span>SWT Completed &amp; Recorded!</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = subjects.findIndex((s) => s.id === activeSubjectId)
                    const nextSubject = subjects[(currentIndex + 1) % subjects.length]
                    setActiveSubjectId(nextSubject.id)
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Select Next Subject</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <span>Watch <span className="font-semibold text-zinc-200">{activeSubject.name}</span> videos tonight:</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 text-[11px] font-mono font-medium">
                    ~{adjustedMins}m total
                  </span>
                </div>

                <div className="inline-flex items-center p-0.5 bg-[#141418] border border-[#26262e] rounded-xl shadow-inner self-start sm:self-auto">
                  {(['1x', '1.5x', '2x'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      className={`px-3 py-1 text-xs font-mono font-semibold rounded-lg transition-all min-h-[28px] flex items-center justify-center ${
                        speed === s
                          ? 'bg-emerald-500 text-black shadow-sm font-bold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {activeSubjectVideos.length === 0 ? (
                <div className="bg-[#141418] border border-[#202026] rounded-2xl p-8 text-center space-y-3">
                  <PlayCircle className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-sm font-semibold text-zinc-300">
                    No {activeSubject.name} Videos in Tonight&apos;s Queue
                  </p>
                  <button
                    type="button"
                    onClick={() => refreshDailyBaseline()}
                    className="text-xs font-bold px-4 py-2 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 transition-colors"
                  >
                    Queue Next 2 {activeSubject.name} Videos
                  </button>
                </div>
              ) : (
                activeSubjectVideos.map((topic) => (
                  <div
                    key={topic.id}
                    className="bg-[#141418] border border-[#222228] hover:border-zinc-700 rounded-2xl p-4 space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-400">
                        Lec {topic.chapterNumber} • {topic.durationMinutes}m video
                      </span>

                      <span className="text-[11px] font-mono text-emerald-400">
                        ~{Math.round(topic.durationMinutes / mult)}m @ {speed}
                      </span>
                    </div>

                    <h3
                      onClick={() => setSelectedTopicForDetail(topic)}
                      className="font-bold text-base text-zinc-100 hover:text-emerald-400 cursor-pointer transition-colors"
                    >
                      {topic.title}
                    </h3>

                    <button
                      type="button"
                      onClick={() => {
                        updateTopicStatus(topic.id, 'STEP_2_WARD_MCQ')
                        toast.success(
                          `Watched! Sent "${topic.title.slice(0, 24)}..." to Ward MCQs`
                        )
                      }}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/30"
                    >
                      <span>Watched &rarr; Ward MCQs</span>
                    </button>
                  </div>
                ))
              )}

              {/* Quick Add More Videos Option */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setStretchDrawerOpen(true)}
                  className="w-full py-2.5 rounded-xl border border-dashed border-zinc-700 hover:border-emerald-500/50 bg-[#141418]/60 hover:bg-[#16161e] text-xs font-semibold text-zinc-300 hover:text-emerald-400 inline-flex items-center justify-center gap-1.5 transition-all active:scale-98"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Add more {activeSubject.name} videos tonight</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Pull Past Topics for Revision Drawer */}
      <RevisionPullDrawer
        isOpen={revisionDrawerOpen}
        onClose={() => setRevisionDrawerOpen(false)}
      />
    </div>
  )
}
