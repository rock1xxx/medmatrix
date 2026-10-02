import React, { useState } from 'react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { SubjectIcon } from '../common/SubjectIcon'
import {
  X,
  Search,
  Filter,
  Plus,
  CheckCircle2,
} from 'lucide-react'

export const StretchQueueDrawer: React.FC = () => {
  const {
    stretchDrawerOpen,
    setStretchDrawerOpen,
    topics,
    subjects,
    activeSubjectId,
    pullToStretchQueue,
  } = useMedMatrixStore()

  const [search, setSearch] = useState('')
  const [selectedOtherSubject, setSelectedOtherSubject] = useState('ALL')

  if (!stretchDrawerOpen) return null

  const activeSubject = subjects.find((s) => s.id === activeSubjectId) || subjects[0]

  // 1. ALL REMAINING VIDEOS FROM ACTIVE FOCUS SUBJECT (Shown first!)
  const activeQueuedTopics = topics
    .filter((t) => t.subjectId === activeSubjectId && t.status === 'QUEUED')
    .sort((a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0))

  // 2. OTHER SUBJECTS TOPICS (At the end of scroll)
  const otherQueuedTopics = topics
    .filter((t) => {
      if (t.status !== 'QUEUED') return false
      // Exclude active subject from the "other" section to prevent duplicates
      if (t.subjectId === activeSubjectId) return false
      if (selectedOtherSubject !== 'ALL' && t.subjectId !== selectedOtherSubject) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const titleMatch = t.title.toLowerCase().includes(q)
        const tagMatch = t.highYieldTags.some((tag) => tag.toLowerCase().includes(q))
        return titleMatch || tagMatch
      }
      return true
    })
    .sort((a, b) => {
      if (a.highYield && !b.highYield) return -1
      if (!a.highYield && b.highYield) return 1
      return a.durationMinutes - b.durationMinutes
    })

  // Filter active list if user typed in search
  const filteredActiveTopics = search.trim()
    ? activeQueuedTopics.filter((t) => {
        const q = search.toLowerCase()
        return (
          t.title.toLowerCase().includes(q) ||
          t.highYieldTags.some((tag) => tag.toLowerCase().includes(q))
        )
      })
    : activeQueuedTopics

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setStretchDrawerOpen(false)}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-[#121216] border-l border-[#222228] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 safe-bottom">
          {/* Clean Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-[#222228] flex items-center justify-between bg-[#101014]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                <SubjectIcon name={activeSubject.iconName} size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Add {activeSubject.name} Videos
                  </h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                    Active Focus
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {activeQueuedTopics.length} remaining lecture{activeQueuedTopics.length === 1 ? '' : 's'} available
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStretchDrawerOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* ========================================================================= */}
            {/* 1. FIRST THING ON SCREEN: ACTIVE FOCUS SUBJECT REMAINING VIDEOS */}
            {/* ========================================================================= */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  {activeSubject.name} Next Lectures
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {filteredActiveTopics.length} available
                </span>
              </div>

              {filteredActiveTopics.length === 0 ? (
                <div className="bg-[#16161c] border border-[#24242e] rounded-2xl p-6 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs font-semibold text-zinc-200">
                    {search.trim()
                      ? `No ${activeSubject.name} lectures match "${search}"`
                      : `All ${activeSubject.name} lectures are already watched or in tonight's queue!`}
                  </p>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                    Scroll down below to browse or pull lectures from other subjects.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredActiveTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className="bg-[#16161c] border border-[#26262e] hover:border-emerald-500/40 rounded-2xl p-3.5 space-y-2.5 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-zinc-400">
                          Lec {topic.chapterNumber} • {topic.durationMinutes}m (~{Math.round(topic.durationMinutes / 1.5)}m @ 1.5x)
                        </span>

                        {topic.highYield && (
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.2 rounded-md">
                            High-Yield
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-zinc-100 leading-snug">
                        {topic.title}
                      </h4>

                      {topic.highYieldTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {topic.highYieldTags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0e0e12] text-zinc-400 border border-[#202026]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => pullToStretchQueue(topic.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black transition-all shadow-md shadow-emerald-950/30"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span>Add to Tonight&apos;s Videos</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* 2. AT THE END OF THE SCROLL: SEARCH & BROWSE ALL OTHER SUBJECTS */}
            {/* ========================================================================= */}
            <div className="pt-6 border-t border-zinc-800/80 mt-6 space-y-3">
              <div>
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Browse Other Subjects / Search
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Looking for a topic from another subject? Search or pick below:
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search any subject, lecture, tag..."
                  className="w-full bg-[#18181e] border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-base sm:text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Subject Filter Dropdown */}
              <div className="relative">
                <select
                  value={selectedOtherSubject}
                  onChange={(e) => setSelectedOtherSubject(e.target.value)}
                  aria-label="Filter other subjects"
                  className="w-full bg-[#18181e] border border-zinc-800 rounded-xl px-3 py-2 text-base sm:text-xs text-zinc-300 focus:outline-none appearance-none pr-8 cursor-pointer min-h-[38px]"
                >
                  <option value="ALL">All Other Subjects ({otherQueuedTopics.length})</option>
                  {subjects
                    .filter((s) => s.id !== activeSubjectId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              </div>

              {/* Other Candidates List */}
              <div className="space-y-2.5 pt-1">
                {otherQueuedTopics.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500 bg-[#16161c] border border-[#222228] rounded-xl">
                    No matching queued topics found in other subjects.
                  </div>
                ) : (
                  otherQueuedTopics.slice(0, 30).map((topic) => {
                    const subject = subjects.find((s) => s.id === topic.subjectId)

                    return (
                      <div
                        key={topic.id}
                        className="bg-[#16161c] border border-[#26262e] hover:border-zinc-600 rounded-xl p-3 space-y-2 transition-all"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1"
                            style={{
                              backgroundColor: `${subject?.color || '#10b981'}15`,
                              borderColor: `${subject?.color || '#10b981'}30`,
                              color: subject?.color || '#10b981',
                            }}
                          >
                            <SubjectIcon name={subject?.iconName || 'BookOpen'} size={11} />
                            <span>{subject?.name}</span>
                          </span>

                          <span className="text-[11px] font-mono text-zinc-400">
                            {topic.durationMinutes}m (~{Math.round(topic.durationMinutes / 1.5)}m @ 1.5x)
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-zinc-100 leading-snug">
                          {topic.title}
                        </h4>

                        {topic.highYieldTags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {topic.highYieldTags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0e0e12] text-zinc-400 border border-[#202026]"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => pullToStretchQueue(topic.id)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Add to Tonight&apos;s Videos</span>
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
