import React, { useState } from 'react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { SubjectIcon } from '../common/SubjectIcon'
import { Check, ArrowRight, CheckCircle2, Sun, Clock3, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Subject, Topic } from '../../types'
import {
  AGE_VISIBLE_FROM_DAYS,
  ageClass,
  ageLabel,
  watchedDaysAgo,
} from '../../lib/topicAge'

/** Quiet aging marker: only appears once the MCQ backlog is a week old. */
const AgeChip: React.FC<{ topic: Topic }> = ({ topic }) => {
  const days = watchedDaysAgo(topic)
  if (days === null || days < AGE_VISIBLE_FROM_DAYS) return null

  return (
    <span
      title={`Video watched ${days} days ago — the MCQs are still pending, so this is starting to fade.`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-[1px] text-[10px] font-semibold ${ageClass(days)}`}
    >
      <Clock3 className="h-2.5 w-2.5" />
      {ageLabel(days)}
    </span>
  )
}

export const WardFastTrack: React.FC = () => {
  const {
    topics,
    subjects,
    activeSubjectId,
    updateTopicStatus,
    restoreTopicSnapshot,
    setSelectedTopicForDetail,
    setActiveTab,
  } = useMedMatrixStore()

  const [otherExpandedOverride, setOtherExpandedOverride] = useState<boolean | null>(null)

  const activeSubject = subjects.find((s) => s.id === activeSubjectId) || subjects[0]

  const allWardTopics = topics.filter((t) => t.status === 'STEP_2_WARD_MCQ')
  const activeWardTopics = allWardTopics.filter((t) => t.subjectId === activeSubjectId)
  const otherWardTopics = allWardTopics.filter((t) => t.subjectId !== activeSubjectId)

  const isOtherExpanded = otherExpandedOverride ?? activeWardTopics.length === 0

  const waits = allWardTopics.map((topic) => ({
    id: topic.id,
    days: watchedDaysAgo(topic) ?? 0,
  }))
  const oldestWait = waits.reduce((max, item) => Math.max(max, item.days), 0)

  const handleMarkDone = (topic: Topic) => {
    const previousSnapshot: Topic = { ...topic }
    updateTopicStatus(topic.id, 'STEP_3_ANNOTATING')
    toast.success(`MCQs done for "${topic.title.slice(0, 24)}..."`, {
      description: 'Sent to tonight\'s hostel annotations.',
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => restoreTopicSnapshot(previousSnapshot),
      },
    })
  }

  const renderWardCard = (topic: Topic, subjectBadge?: Subject) => (
    <div
      key={topic.id}
      className="bg-[#141418] border border-[#222228] hover:border-zinc-700 rounded-2xl p-4 space-y-3 transition-all"
    >
      {/* Lecture info */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex min-w-0 items-center gap-2 flex-wrap">
          {subjectBadge && (
            <span
              className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold shrink-0"
              style={{
                backgroundColor: `${subjectBadge.color}15`,
                borderColor: `${subjectBadge.color}35`,
                color: subjectBadge.color,
              }}
            >
              <SubjectIcon name={subjectBadge.iconName} size={11} />
              <span>{subjectBadge.name}</span>
            </span>
          )}
          <span className="shrink-0 text-xs font-mono text-zinc-400">
            Lec {topic.chapterNumber} • {topic.durationMinutes}m video
          </span>

          <AgeChip topic={topic} />
        </div>

        {topic.highYield && (
          <span className="shrink-0 whitespace-nowrap rounded-md border border-amber-800/40 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
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
          onClick={() => handleMarkDone(topic)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black transition-all shadow-md shadow-emerald-950/30"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Done with MCQs</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto space-y-4 px-4 pb-28">
      {/* Header with Morning Sun */}
      <div className="pt-2 pb-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight leading-none">Ward MCQs</h1>
              <span className="text-[11px] text-zinc-400 font-medium">Morning Shift Sprint</span>
            </div>
          </div>
          <span className="text-xs font-mono font-medium text-zinc-400 bg-[#16161a] border border-[#26262c] px-2.5 py-1 rounded-lg shrink-0">
            {allWardTopics.length} pending
            {oldestWait >= AGE_VISIBLE_FROM_DAYS ? (
              <span className="ml-1.5 text-zinc-500">· oldest {oldestWait}d</span>
            ) : null}
          </span>
        </div>
      </div>

      {/* MCQs List */}
      {allWardTopics.length === 0 ? (
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
        <div className="space-y-4">
          {/* Active Focus Subject MCQs */}
          {activeWardTopics.length > 0 && (
            <div className="space-y-3">
              {otherWardTopics.length > 0 && (
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: activeSubject.color }}
                    />
                    {activeSubject.name} (Active Focus)
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">{activeWardTopics.length}</span>
                </div>
              )}
              {activeWardTopics.map((topic) => renderWardCard(topic))}
            </div>
          )}

          {/* Cross-Subject Pending MCQs */}
          {otherWardTopics.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => setOtherExpandedOverride(!isOtherExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#141418] border border-[#24242c] hover:border-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  {isOtherExpanded ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                  <span>Other Subjects ({otherWardTopics.length})</span>
                </span>
                <span className="text-[11px] text-zinc-500 font-normal">
                  {isOtherExpanded ? 'Hide' : 'Show pending MCQs'}
                </span>
              </button>

              {isOtherExpanded && (
                <div className="space-y-3">
                  {otherWardTopics.map((topic) => {
                    const sub = subjects.find((s) => s.id === topic.subjectId)
                    return renderWardCard(topic, sub)
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
