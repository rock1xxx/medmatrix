import React, { useState, useEffect } from 'react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { SubjectIcon } from '../common/SubjectIcon'
import { getTopicSRStatus, getSRStatusMetadata, getLevelDescription } from '../../lib/srEngine'
import { X, Lock, CheckCircle2, FileEdit } from 'lucide-react'
import { toast } from 'sonner'

export const TopicDetailsModal: React.FC = () => {
  const {
    selectedTopicForDetail,
    setSelectedTopicForDetail,
    subjects,
    lockTopicIntoSR,
    advanceSRLevel,
    updateMarginNotes,
  } = useMedMatrixStore()

  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (selectedTopicForDetail) {
      setNotes(selectedTopicForDetail.marginNotes || '')
    }
  }, [selectedTopicForDetail])

  if (!selectedTopicForDetail) return null

  const topic = selectedTopicForDetail
  const subject = subjects.find((s) => s.id === topic.subjectId)
  const srStatus = getTopicSRStatus(topic)
  const meta = getSRStatusMetadata(srStatus)

  const handleSaveNotes = () => {
    updateMarginNotes(topic.id, notes)
    setSelectedTopicForDetail({ ...topic, marginNotes: notes })
    toast.success('Margin note saved!')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={() => setSelectedTopicForDetail(null)}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
      />

      {/* Modal Bottom Sheet Dialog */}
      <div className="relative bg-[#141418] border-t sm:border border-[#26262e] rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl p-5 z-10 space-y-4 max-h-[88vh] sm:max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 safe-bottom">
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#222228] pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <SubjectIcon name={subject?.iconName || 'BookOpen'} size={13} className="text-emerald-400" />
                {subject?.name}
              </span>
              <span className="text-xs font-mono text-zinc-500">• Lec {topic.chapterNumber}</span>
            </div>
            <h2 className="text-base font-bold text-zinc-100 leading-snug">{topic.title}</h2>
          </div>

          <button
            type="button"
            onClick={() => setSelectedTopicForDetail(null)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Speeds */}
        <div className="bg-[#0c0c0e] border border-[#202026] rounded-xl p-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="text-[10px] text-zinc-500">1.0x Normal</div>
            <div className="font-mono font-semibold text-zinc-300">{topic.durationMinutes}m</div>
          </div>
          <div className="border-x border-[#202026]">
            <div className="text-[10px] text-emerald-400">1.5x Speed</div>
            <div className="font-mono font-semibold text-emerald-300">
              {Math.round(topic.durationMinutes / 1.5)}m
            </div>
          </div>
          <div>
            <div className="text-[10px] text-violet-400">2.0x Rapid</div>
            <div className="font-mono font-semibold text-violet-300">
              {Math.round(topic.durationMinutes / 2.0)}m
            </div>
          </div>
        </div>

        {/* High-yield Tags */}
        {topic.highYieldTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topic.highYieldTags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-md bg-[#0c0c0e] text-zinc-400 border border-[#202026]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Margin Notes (<= 10 words) */}
        <div className="space-y-2 bg-[#0c0c0e] border border-[#202026] rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium flex items-center gap-1.5">
              <FileEdit size={13} />
              <span>Margin Note (&le;10 words):</span>
            </span>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Brief margin annotation for physical notes..."
            className="w-full bg-[#141418] border border-[#26262e] rounded-xl p-2.5 text-base sm:text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveNotes}
              className="px-3.5 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors active:scale-95"
            >
              Save Note
            </button>
          </div>
        </div>

        {/* Spaced Repetition Action */}
        {topic.status === 'LOCKED_IN_SR' && topic.srData ? (
          <div className="bg-[#0c0c0e] border border-emerald-900/40 rounded-xl p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Lock size={13} />
                <span>Active in Spaced Repetition</span>
              </span>
              {meta && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
                  {meta.label}
                </span>
              )}
            </div>

            <div className="text-zinc-400 space-y-1">
              <div className="flex justify-between">
                <span>Current Interval:</span>
                <span className="text-zinc-200 font-mono font-medium">
                  {getLevelDescription(topic.srData.level)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Next Review:</span>
                <span className="text-zinc-200 font-mono font-medium">
                  {topic.srData.nextReviewDate}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                advanceSRLevel(topic.id)
                setSelectedTopicForDetail(null)
              }}
              className="w-full mt-2 py-3 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-all active:scale-95 flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <CheckCircle2 size={15} />
              <span>Mark Reviewed Today</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              lockTopicIntoSR(topic.id)
              setSelectedTopicForDetail(null)
            }}
            className="w-full py-3 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-all active:scale-95 flex items-center justify-center gap-2 min-h-[46px]"
          >
            <Lock size={15} />
            <span>Annotated &rarr; Lock into Spaced Repetition</span>
          </button>
        )}
      </div>
    </div>
  )
}
