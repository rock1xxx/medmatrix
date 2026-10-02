import React, { useState } from 'react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { Subject, Topic, TopicStatus } from '../../types'
import { SubjectIcon } from '../common/SubjectIcon'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { toast } from 'sonner'

export const MasterMatrix: React.FC = () => {
  const {
    subjects,
    topics,
    activeSubjectId,
    setActiveSubjectId,
    updateTopicStatus,
    lockTopicIntoSR,
    setSelectedTopicForDetail,
  } = useMedMatrixStore()

  const [expandedSubjectIds, setExpandedSubjectIds] = useState<string[]>(['anat', 'biochem'])
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'Pre-Clinical' | 'Para-Clinical' | 'Clinical'>('ALL')
  const [search, setSearch] = useState('')

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjectIds((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    )
  }

  const filteredSubjects = subjects.filter((s) => {
    if (selectedCategory !== 'ALL' && s.category !== selectedCategory) return false
    return true
  })

  // Global counts
  const totalCount = topics.length
  const lockedCount = topics.filter((t) => t.status === 'LOCKED_IN_SR').length

  return (
    <div className="max-w-xl mx-auto space-y-4 px-4 pb-28">
      {/* Header */}
      <div className="pt-2 pb-1">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Syllabus</h1>
          <span className="text-xs font-mono text-zinc-400">
            {lockedCount} / {totalCount} in SR
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-0.5">
          19 Medical Subjects • 271 Chapters • Complete NEET PG / INI-CET curriculum.
        </p>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chapters, topics, or keywords..."
            className="w-full bg-[#141418] border border-[#222228] rounded-xl pl-9 pr-3 py-2 text-base sm:text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 min-h-[38px]"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(['ALL', 'Pre-Clinical', 'Para-Clinical', 'Clinical'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all active:scale-95 min-h-[32px] ${
                selectedCategory === cat
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {cat === 'ALL' ? 'All Subjects' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Subjects Accordion List */}
      <div className="space-y-2.5">
        {filteredSubjects.map((subject) => {
          let subjectTopics = topics.filter((t) => t.subjectId === subject.id)
          if (search.trim()) {
            const q = search.toLowerCase()
            subjectTopics = subjectTopics.filter(
              (t) =>
                t.title.toLowerCase().includes(q) ||
                t.highYieldTags.some((tag) => tag.toLowerCase().includes(q))
            )
            // If search is active and subject has no matching topics, hide subject
            if (subjectTopics.length === 0) return null
          }

          const isExpanded = search.trim() ? true : expandedSubjectIds.includes(subject.id)
          const subLocked = subjectTopics.filter((t) => t.status === 'LOCKED_IN_SR').length

          return (
            <div
              key={subject.id}
              className="bg-[#141418] border border-[#222228] rounded-xl overflow-hidden transition-all"
            >
              {/* Subject Row Header */}
              <div
                onClick={() => toggleSubject(subject.id)}
                className="p-3.5 cursor-pointer hover:bg-zinc-800/40 flex items-center justify-between gap-3 select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#1a1a20] flex items-center justify-center text-zinc-300 shrink-0">
                    <SubjectIcon name={subject.iconName} size={15} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-zinc-100 truncate">
                      {subject.name}
                    </h3>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      {subjectTopics.length} lectures • {subLocked} in SR
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {subject.id === activeSubjectId ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      Active Focus
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveSubjectId(subject.id)
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      Set Focus
                    </button>
                  )}
                  <div className="text-zinc-500">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>
              </div>

              {/* Chapters Content */}
              {isExpanded && (
                <div className="border-t border-[#202026] bg-[#101014] divide-y divide-[#1c1c22]">
                  {subjectTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-[#16161c] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                          <span>Lec {topic.chapterNumber}</span>
                          <span>•</span>
                          <span>{topic.durationMinutes}m</span>
                          {topic.highYield && (
                            <span className="text-amber-400 font-semibold">• High-Yield</span>
                          )}
                        </div>

                        <h4
                          onClick={() => setSelectedTopicForDetail(topic)}
                          className="font-medium text-xs text-zinc-200 hover:text-emerald-400 cursor-pointer transition-colors truncate mt-0.5"
                        >
                          {topic.title}
                        </h4>
                      </div>

                      {/* Status Selector */}
                      <select
                        value={topic.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as TopicStatus
                          if (newStatus === 'LOCKED_IN_SR') {
                            lockTopicIntoSR(topic.id)
                          } else {
                            updateTopicStatus(topic.id, newStatus)
                            toast.info(`Updated status for Lec ${topic.chapterNumber}`)
                          }
                        }}
                        className={`text-base sm:text-[11px] font-semibold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none min-h-[34px] ${
                          topic.status === 'LOCKED_IN_SR'
                            ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/40'
                            : topic.status === 'STEP_3_ANNOTATING'
                            ? 'bg-sky-950/50 text-sky-300 border-sky-800/40'
                            : topic.status === 'STEP_2_WARD_MCQ'
                            ? 'bg-amber-950/50 text-amber-300 border-amber-800/40'
                            : topic.status === 'STEP_1_WATCHING'
                            ? 'bg-violet-950/50 text-violet-300 border-violet-800/40'
                            : 'bg-[#18181e] text-zinc-400 border-[#262630]'
                        }`}
                      >
                        <option value="QUEUED">Queued</option>
                        <option value="STEP_1_WATCHING">Watching</option>
                        <option value="STEP_2_WARD_MCQ">Ward MCQ</option>
                        <option value="STEP_3_ANNOTATING">Annotating</option>
                        <option value="LOCKED_IN_SR">Locked in SR</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
