import React from 'react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { Check, ArrowRight, CheckCircle2, Sun } from 'lucide-react'
import { toast } from 'sonner'

export const WardFastTrack: React.FC = () => {
  const {
    topics,
    subjects,
    activeSubjectId,
    updateTopicStatus,
    setSelectedTopicForDetail,
    setActiveTab,
  } = useMedMatrixStore()

  const activeSubject = subjects.find((s) => s.id === activeSubjectId) || subjects[0]

  // Show ONLY topics for the activeSubjectId in STEP_2_WARD_MCQ
  const activeWardTopics = topics.filter(
    (t) => t.status === 'STEP_2_WARD_MCQ' && t.subjectId === activeSubjectId
  )

  const handleMarkDone = (topicId: string, title: string) => {
    updateTopicStatus(topicId, 'STEP_3_ANNOTATING')
    toast.success(`MCQs done for "${title.slice(0, 24)}..."`, {
      description: 'Sent to tonight\'s hostel annotations.',
    })
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 px-4 pb-28">
      {/* Header with Morning Sun */}
      <div className="pt-2 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight leading-none">Ward MCQs</h1>
              <span className="text-[11px] text-zinc-400 font-medium">Morning Shift Sprint</span>
            </div>
          </div>
          <span className="text-xs font-mono font-medium text-zinc-400 bg-[#16161a] border border-[#26262c] px-2.5 py-1 rounded-lg">
            {activeWardTopics.length} pending
          </span>
        </div>
      </div>

      {/* MCQs List */}
      {activeWardTopics.length === 0 ? (
        <div className="bg-[#141418] border border-[#202026] rounded-2xl p-8 text-center space-y-3 mt-4">
          <div className="w-10 h-10 rounded-full bg-[#181820] text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-200">
              No {activeSubject.name} MCQs Pending
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Watch tonight&apos;s {activeSubject.name} videos at the hostel to generate tomorrow&apos;s ward MCQs!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveTab('hostel')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 transition-colors"
            >
              <span>Go to Tonight&apos;s Videos</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {activeWardTopics.map((topic) => (
            <div
              key={topic.id}
              className="bg-[#141418] border border-[#222228] hover:border-zinc-700 rounded-2xl p-4 space-y-3 transition-all"
            >
              {/* Lecture info */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400">
                  Lec {topic.chapterNumber} • {topic.durationMinutes}m video
                </span>

                {topic.highYield && (
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-md">
                    High-Yield
                  </span>
                )}
              </div>

              {/* Title */}
              <h3
                onClick={() => setSelectedTopicForDetail(topic)}
                className="font-bold text-base text-zinc-100 hover:text-emerald-400 cursor-pointer transition-colors leading-snug"
              >
                {topic.title}
              </h3>

              {/* High Yield Tags */}
              {topic.highYieldTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {topic.highYieldTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-[#0c0c0e] text-zinc-400 border border-[#202026]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Single Clean 1-Tap Action */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handleMarkDone(topic.id, topic.title)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black transition-all shadow-md shadow-emerald-950/30"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Done with MCQs</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
