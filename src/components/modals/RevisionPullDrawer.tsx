import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { SubjectIcon } from '../common/SubjectIcon'
import {
  X,
  Search,
  Plus,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  BookOpen,
  ChevronDown,
  Check,
} from 'lucide-react'
import { getTopicSRStatus } from '../../lib/srEngine'

interface RevisionPullDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export const RevisionPullDrawer: React.FC<RevisionPullDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { topics, subjects, activeSubjectId, pullPastTopicToSR } = useMedMatrixStore()

  // Default to first non-active subject or Anatomy
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    const firstOther = subjects.find((s) => s.id !== activeSubjectId)
    return firstOther ? firstOther.id : subjects[0]?.id || ''
  })
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [subjectFilter, setSubjectFilter] = useState('')

  if (!isOpen) return null

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0]

  // Filter topics for the selected subject
  const subjectTopics = topics
    .filter((t) => t.subjectId === selectedSubjectId)
    .filter((t) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const titleMatch = t.title.toLowerCase().includes(q)
      const tagMatch = t.highYieldTags.some((tag) => tag.toLowerCase().includes(q))
      return titleMatch || tagMatch
    })
    .sort((a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0))

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-[#121216] border-l border-[#222228] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 safe-bottom">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#222228] flex items-center justify-between bg-[#101014]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
                <RotateCcw size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Pull Topics for Revision
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Select any subject to pull into Tonight&apos;s Ebbinghaus desk
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>

          {/* Subject Dropdown Selector */}
          <div className="p-3 border-b border-[#222228] bg-[#0c0c0e] relative z-20">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Select Subject
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                19 Clinical Subjects
              </span>
            </div>

            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#16161c] hover:bg-[#1c1c24] border border-zinc-800 hover:border-teal-500/50 rounded-xl text-left transition-all active:scale-[0.99] min-h-[46px] group"
              aria-expanded={dropdownOpen}
              aria-haspopup="listbox"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                  <SubjectIcon name={selectedSubject.iconName} size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-100 truncate">
                      {selectedSubject.name}
                    </span>
                    {selectedSubject.id === activeSubjectId && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/40 shrink-0 font-medium">
                        Active Focus
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {topics.filter((t) => t.subjectId === selectedSubject.id).length} lectures available
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200 shrink-0 ml-2">
                <span className="text-xs text-teal-400 font-medium hidden sm:inline">Change</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180 text-teal-400' : ''
                  }`}
                />
              </div>
            </button>

            {/* Dropdown Popover */}
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => {
                    setDropdownOpen(false)
                    setSubjectFilter('')
                  }}
                />
                <div className="absolute left-3 right-3 top-[calc(100%-4px)] z-40 bg-[#16161c] border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Subject Filter Input */}
                  <div className="p-2 border-b border-zinc-800 bg-[#121216]">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        autoFocus
                        value={subjectFilter}
                        onChange={(e) => setSubjectFilter(e.target.value)}
                        placeholder="Filter 19 subjects..."
                        className="w-full bg-[#1c1c24] border border-zinc-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* List of Subjects */}
                  <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-zinc-800/30">
                    {subjects
                      .filter((s) => s.name.toLowerCase().includes(subjectFilter.toLowerCase()))
                      .map((sub) => {
                        const isSelected = sub.id === selectedSubjectId
                        const isActiveFocus = sub.id === activeSubjectId
                        const count = topics.filter((t) => t.subjectId === sub.id).length

                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              setSelectedSubjectId(sub.id)
                              setDropdownOpen(false)
                              setSubjectFilter('')
                              setSearch('')
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors min-h-[40px] text-left ${
                              isSelected
                                ? 'bg-teal-500/15 text-teal-300 font-semibold border border-teal-500/30'
                                : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <SubjectIcon name={sub.iconName} size={15} />
                              <span className="truncate">{sub.name}</span>
                              {isActiveFocus && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/40 shrink-0">
                                  Active Focus
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-[11px] font-mono text-zinc-500">
                                {count} lecs
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                            </div>
                          </button>
                        )
                      })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-[#222228] bg-[#121216]">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${selectedSubject.name} topics...`}
                className="w-full bg-[#18181f] border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Topics List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
              <span>
                {selectedSubject.name} Lectures ({subjectTopics.length})
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                Tap + to add to tonight&apos;s reviews
              </span>
            </div>

            {subjectTopics.length === 0 ? (
              <div className="bg-[#141418] border border-[#202026] rounded-2xl p-8 text-center space-y-2">
                <BookOpen className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-sm font-semibold text-zinc-300">No matching topics found</p>
                <p className="text-xs text-zinc-500">Try a different search term or subject.</p>
              </div>
            ) : (
              subjectTopics.map((topic) => {
                const srStatus = getTopicSRStatus(topic)
                const isInSR = topic.status === 'LOCKED_IN_SR' && Boolean(topic.srData)
                const isDueTonight = srStatus === 'DUE_TODAY' || srStatus === 'OVERDUE'

                return (
                  <div
                    key={topic.id}
                    className="bg-[#16161c] border border-[#222228] hover:border-zinc-700 rounded-2xl p-3.5 space-y-2.5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-zinc-400">
                          Lec {topic.chapterNumber} • {topic.durationMinutes}m
                        </span>
                        {topic.highYield && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40 inline-flex items-center gap-0.5">
                            <Sparkles size={9} /> High-Yield
                          </span>
                        )}
                      </div>

                      {isInSR && (
                        <span className="text-[10.5px] font-mono font-medium px-2 py-0.5 rounded-full bg-teal-950/60 text-teal-300 border border-teal-800/40">
                          Level {topic.srData?.level ?? 0}
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-sm text-zinc-100 leading-snug">
                      {topic.title}
                    </h3>

                    {/* High-yield Tags */}
                    {topic.highYieldTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {topic.highYieldTags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[#101014] text-zinc-400 border border-zinc-800"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-1">
                      {isDueTonight ? (
                        <div className="w-full py-2 rounded-xl text-xs font-semibold bg-teal-950/40 border border-teal-800/40 text-teal-300 flex items-center justify-center gap-1.5">
                          <CheckCircle2 size={13} className="text-teal-400" />
                          <span>Already in Tonight&apos;s Reviews</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => pullPastTopicToSR(topic.id)}
                          className="w-full py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 active:scale-98 text-black transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-teal-950/40"
                        >
                          <Plus size={13} className="stroke-[3]" />
                          <span>
                            {isInSR
                              ? 'Pull for Revision Tonight'
                              : "Add to Tonight's Reviews"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[#222228] bg-[#101014]">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold transition-colors"
            >
              Done Adding Revisions
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
