import React, { useState, useEffect } from 'react'
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
  const [scope, setScope] = useState<'active' | 'other'>('active')
  const [selectedOtherSubject, setSelectedOtherSubject] = useState('ALL')

  useEffect(() => {
    if (!stretchDrawerOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStretchDrawerOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [stretchDrawerOpen, setStretchDrawerOpen])

  if (!stretchDrawerOpen) return null

  const activeSubject = subjects.find((s) => s.id === activeSubjectId) || subjects[0]
  const watchingCount = topics.filter((t) => t.status === 'STEP_1_WATCHING').length

  const matchesSearch = (title: string, tags: string[], subjectName?: string) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      title.toLowerCase().includes(q) ||
      tags.some((tag) => tag.toLowerCase().includes(q)) ||
      (subjectName ? subjectName.toLowerCase().includes(q) : false)
    )
  }

  // 1. ALL REMAINING VIDEOS FROM ACTIVE FOCUS SUBJECT
  const activeQueuedTopics = topics
    .filter((t) => t.subjectId === activeSubjectId && t.status === 'QUEUED')
    .sort((a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0))

  const filteredActiveTopics = activeQueuedTopics.filter((t) =>
    matchesSearch(t.title, t.highYieldTags, activeSubject.name)
  )

  // 2. ALL REMAINING VIDEOS FROM OTHER SUBJECTS
  const allOtherQueuedTopics = topics.filter(
    (t) => t.status === 'QUEUED' && t.subjectId !== activeSubjectId
  )

  const filteredOtherTopics = allOtherQueuedTopics
    .filter((t) => {
      if (selectedOtherSubject !== 'ALL' && t.subjectId !== selectedOtherSubject) return false
      const subName = subjects.find((s) => s.id === t.subjectId)?.name
      return matchesSearch(t.title, t.highYieldTags, subName)
    })
    .sort((a, b) => {
      if (a.highYield && !b.highYield) return -1
      if (!a.highYield && b.highYield) return 1
      return a.durationMinutes - b.durationMinutes
    })

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setStretchDrawerOpen(false)}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add videos to tonight's queue"
          className="w-screen max-w-md bg-[#121216] border-l border-[#222228] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 safe-bottom"
        >
          {/* Clean Drawer Header */}
          <div className="p-4 border-b border-[#222228] flex items-center justify-between bg-[#101014]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                <SubjectIcon name={activeSubject.iconName} size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-white tracking-tight truncate">
                    Add Videos
                  </h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 shrink-0">
                    {watchingCount} in tonight&apos;s queue
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  Active Focus: {activeSubject.name} ({activeQueuedTopics.length} left)
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Close add videos drawer"
              onClick={() => setStretchDrawerOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pinned Search & Scope Controls */}
          <div className="p-3.5 border-b border-[#202028] bg-[#101014]/95 space-y-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search lecture, subject, or tag..."
                className="w-full bg-[#18181e] border border-zinc-800 rounded-xl pl-9 pr-8 py-2 text-base sm:text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Scope Toggle */}
            <div className="grid grid-cols-2 gap-1 bg-[#18181e] p-1 rounded-xl border border-zinc-800/80">
              <button
                type="button"
                onClick={() => setScope('active')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all truncate ${
                  scope === 'active'
                    ? 'bg-emerald-500 text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {activeSubject.name} ({filteredActiveTopics.length})
              </button>
              <button
                type="button"
                onClick={() => setScope('other')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all truncate ${
                  scope === 'other'
                    ? 'bg-emerald-500 text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Other Subjects ({filteredOtherTopics.length})
              </button>
            </div>

            {/* Subject Filter Dropdown (shown when browsing Other Subjects) */}
            {scope === 'other' && (
              <div className="relative">
                <select
                  value={selectedOtherSubject}
                  onChange={(e) => setSelectedOtherSubject(e.target.value)}
                  aria-label="Filter other subjects"
                  className="w-full bg-[#18181e] border border-zinc-800 rounded-xl px-3 py-1.5 text-base sm:text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 appearance-none pr-8 cursor-pointer min-h-[36px]"
                >
                  <option value="ALL">All Other Subjects ({allOtherQueuedTopics.length})</option>
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
            )}
          </div>

          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {scope === 'active' ? (
              filteredActiveTopics.length === 0 ? (
                <div className="bg-[#16161c] border border-[#24242e] rounded-2xl p-6 text-center space-y-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs font-semibold text-zinc-200">
                    {search.trim()
                      ? `No ${activeSubject.name} lectures match "${search}"`
                      : `All ${activeSubject.name} lectures are already watched or in tonight's queue!`}
                  </p>
                  {filteredOtherTopics.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setScope('other')}
                      className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-300 transition-colors"
                    >
                      View {filteredOtherTopics.length} matching in Other Subjects &rarr;
                    </button>
                  )}
                </div>
              ) : (
                filteredActiveTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="bg-[#16161c] border border-[#26262e] hover:border-emerald-500/40 rounded-2xl p-3.5 space-y-2.5 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-zinc-400">
                        Lec {topic.chapterNumber} • {topic.durationMinutes}m (~{Math.round(topic.durationMinutes / 1.5)}m @ 1.5x)
                      </span>

                      {topic.highYield && (
                        <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-md shrink-0">
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
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0e0e12] text-zinc-400 border border-[#202026]"
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
                ))
              )
            ) : filteredOtherTopics.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500 bg-[#16161c] border border-[#222228] rounded-xl">
                No matching queued topics found in other subjects.
              </div>
            ) : (
              filteredOtherTopics.slice(0, 40).map((topic) => {
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

                      <div className="flex items-center gap-1.5">
                        {topic.highYield && (
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded-md">
                            High-Yield
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-zinc-400">
                          {topic.durationMinutes}m (~{Math.round(topic.durationMinutes / 1.5)}m @ 1.5x)
                        </span>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-zinc-100 leading-snug">
                      {topic.title}
                    </h4>

                    {topic.highYieldTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {topic.highYieldTags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0e0e12] text-zinc-400 border border-[#202026]"
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
  )
}
