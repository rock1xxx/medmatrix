import React, { useMemo, useState } from 'react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { TopicStatus } from '../../types'
import { SubjectIcon } from '../common/SubjectIcon'
import { ChevronDown, ChevronRight, Search, Check } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_OPTIONS: { value: TopicStatus; label: string }[] = [
  { value: 'QUEUED', label: 'Queued' },
  { value: 'STEP_1_WATCHING', label: 'Watching' },
  { value: 'STEP_2_WARD_MCQ', label: 'Ward MCQ' },
  { value: 'STEP_3_ANNOTATING', label: 'Annotating' },
  { value: 'LOCKED_IN_SR', label: 'Locked in SR' },
]

const statusChipClass = (status: TopicStatus) =>
  status === 'LOCKED_IN_SR'
    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/40'
    : status === 'STEP_3_ANNOTATING'
    ? 'bg-sky-950/50 text-sky-300 border-sky-800/40'
    : status === 'STEP_2_WARD_MCQ'
    ? 'bg-amber-950/50 text-amber-300 border-amber-800/40'
    : status === 'STEP_1_WATCHING'
    ? 'bg-violet-950/50 text-violet-300 border-violet-800/40'
    : 'bg-[#18181e] text-zinc-400 border-[#262630]'

export const MasterMatrix: React.FC = () => {
  const {
    subjects,
    topics,
    activeSubjectId,
    setActiveSubjectId,
    updateTopicStatus,
    bulkUpdateTopicStatus,
    lockTopicIntoSR,
    setSelectedTopicForDetail,
  } = useMedMatrixStore()

  const [expandedSubjectIds, setExpandedSubjectIds] = useState<string[]>(['anat', 'biochem'])
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'Pre-Clinical' | 'Para-Clinical' | 'Clinical'>('ALL')
  const [search, setSearch] = useState('')

  // Desktop-only workspace state. The phone layout above ignores all of it.
  const [desktopSubject, setDesktopSubject] = useState<string | 'ALL'>('ALL')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

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

  const visibleDesktopTopics = useMemo(() => {
    const q = search.trim().toLowerCase()
    const subjectCategory = new Map(subjects.map((s) => [s.id, s.category]))

    return topics.filter((t) => {
      if (desktopSubject !== 'ALL' && t.subjectId !== desktopSubject) return false
      if (selectedCategory !== 'ALL' && subjectCategory.get(t.subjectId) !== selectedCategory) return false
      if (!q) return true
      return (
        t.title.toLowerCase().includes(q) ||
        t.highYieldTags.some((tag) => tag.toLowerCase().includes(q))
      )
    })
  }, [topics, subjects, desktopSubject, selectedCategory, search])

  const selectedSet = new Set(selectedIds)
  const allVisibleSelected =
    visibleDesktopTopics.length > 0 && visibleDesktopTopics.every((t) => selectedSet.has(t.id))

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const applyBulkStatus = (status: TopicStatus) => {
    if (selectedIds.length === 0) return
    const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
    if (
      selectedIds.length > 3 &&
      !confirm(`Set ${selectedIds.length} chapters to "${label}"?`)
    ) {
      return
    }
    bulkUpdateTopicStatus(selectedIds, status)
    setSelectedIds([])
  }

  return (
    <>
      {/* ── Phone layout (unchanged) ─────────────────────────────────────── */}
      <div className="max-w-xl mx-auto space-y-4 px-4 pb-28 lg:hidden">
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

      {/* ── Desktop layout: one wide table built for bulk edits ──────────── */}
      <div className="hidden lg:block mx-auto w-full max-w-[1400px] px-6 pb-28">
        <div className="flex items-end justify-between pt-3 pb-4 border-b border-[#1f1f25]">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Syllabus</h1>
            <p className="text-xs text-zinc-500 mt-1">
              19 subjects · 271 chapters · tick chapters and set a status in one go
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-400 font-mono">{lockedCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">in SR</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-zinc-200 font-mono">
                {totalCount - lockedCount}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">remaining</div>
            </div>
            <div className="w-40">
              <div className="h-2 rounded-full bg-[#1c1c22] overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${Math.round((lockedCount / Math.max(1, totalCount)) * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-zinc-500 mt-1 text-right font-mono">
                {Math.round((lockedCount / Math.max(1, totalCount)) * 100)}% locked
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[240px_1fr] gap-5 items-start">
          {/* Subject rail */}
          <aside className="rounded-xl border border-[#222228] bg-[#121216] overflow-hidden sticky top-24">
            <button
              type="button"
              onClick={() => {
                setDesktopSubject('ALL')
                setSelectedIds([])
              }}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold border-b border-[#1e1e24] transition-colors ${
                desktopSubject === 'ALL'
                  ? 'bg-zinc-800/60 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800/40'
              }`}
            >
              All subjects
              <span className="float-right font-mono text-[10px] text-zinc-500">{totalCount}</span>
            </button>

            <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
              {filteredSubjects.map((subject) => {
                const subjectTopics = topics.filter((t) => t.subjectId === subject.id)
                const done = subjectTopics.filter((t) => t.status === 'LOCKED_IN_SR').length
                const pct = Math.round((done / Math.max(1, subjectTopics.length)) * 100)
                const isActive = desktopSubject === subject.id

                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => {
                      setDesktopSubject(subject.id)
                      setActiveSubjectId(subject.id)
                      setSelectedIds([])
                    }}
                    className={`w-full text-left px-3.5 py-2 border-b border-[#191920] transition-colors ${
                      isActive ? 'bg-emerald-500/10' : 'hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[12px] truncate ${
                          isActive ? 'text-emerald-300 font-semibold' : 'text-zinc-300'
                        }`}
                      >
                        {subject.name}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                        {done}/{subjectTopics.length}
                      </span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-[#1c1c22] overflow-hidden">
                      <div className="h-full bg-emerald-500/70" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Table */}
          <section className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search chapters or high-yield tags…"
                  className="w-full bg-[#141418] border border-[#222228] rounded-xl pl-10 pr-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                />
              </div>
              {(['ALL', 'Pre-Clinical', 'Para-Clinical', 'Clinical'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  {cat === 'ALL' ? 'All' : cat}
                </button>
              ))}
            </div>

            {/* Bulk bar */}
            <div
              className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${
                selectedIds.length > 0
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-[#202026] bg-[#101014]'
              }`}
            >
              <span className="text-[11px] text-zinc-400">
                {selectedIds.length > 0 ? (
                  <span className="font-semibold text-emerald-300">
                    {selectedIds.length} selected
                  </span>
                ) : (
                  'Tick chapters to change their status in bulk'
                )}
              </span>

              <div className="ml-auto flex items-center gap-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={selectedIds.length === 0}
                    onClick={() => applyBulkStatus(opt.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${statusChipClass(
                      opt.value
                    )} ${
                      selectedIds.length === 0
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:brightness-125'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-[#222228] overflow-hidden">
              <div className="grid grid-cols-[36px_64px_1fr_78px_100px_150px] items-center gap-3 px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500 bg-[#15151a] border-b border-[#222228]">
                <button
                  type="button"
                  aria-label="Select all visible chapters"
                  onClick={() =>
                    setSelectedIds(allVisibleSelected ? [] : visibleDesktopTopics.map((t) => t.id))
                  }
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    allVisibleSelected
                      ? 'bg-emerald-500 border-emerald-500 text-black'
                      : 'border-zinc-600 text-transparent hover:border-zinc-400'
                  }`}
                >
                  <Check size={11} strokeWidth={3} />
                </button>
                <span>Lec</span>
                <span>Chapter</span>
                <span className="text-right">Mins</span>
                <span>Tags</span>
                <span>Status</span>
              </div>

              <div className="max-h-[calc(100vh-340px)] overflow-y-auto divide-y divide-[#1b1b21]">
                {visibleDesktopTopics.length === 0 && (
                  <div className="px-4 py-10 text-center text-xs text-zinc-500">
                    No chapters match this filter.
                  </div>
                )}

                {visibleDesktopTopics.map((topic) => {
                  const isChecked = selectedSet.has(topic.id)
                  return (
                    <div
                      key={topic.id}
                      className={`grid grid-cols-[36px_64px_1fr_78px_100px_150px] items-center gap-3 px-3 py-2 text-xs transition-colors ${
                        isChecked ? 'bg-emerald-500/5' : 'hover:bg-[#16161c]'
                      }`}
                    >
                      <button
                        type="button"
                        aria-label={`Select ${topic.title}`}
                        onClick={() => toggleSelected(topic.id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-emerald-500 border-emerald-500 text-black'
                            : 'border-zinc-600 text-transparent hover:border-zinc-400'
                        }`}
                      >
                        <Check size={11} strokeWidth={3} />
                      </button>

                      <span className="font-mono text-[11px] text-zinc-500">
                        {topic.chapterNumber}
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedTopicForDetail(topic)}
                        className="text-left text-zinc-200 hover:text-emerald-400 transition-colors truncate"
                        title={topic.title}
                      >
                        {topic.title}
                        {topic.highYield && (
                          <span className="ml-2 text-[9px] font-bold text-amber-400 align-middle">
                            HY
                          </span>
                        )}
                      </button>

                      <span className="text-right font-mono text-[11px] text-zinc-500">
                        {topic.durationMinutes}
                      </span>

                      <span className="text-[10px] text-zinc-500 truncate">
                        {topic.highYieldTags.slice(0, 2).join(', ') || '—'}
                      </span>

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
                        className={`w-full text-[11px] font-semibold px-2 py-1.5 rounded-lg border cursor-pointer focus:outline-none ${statusChipClass(
                          topic.status
                        )}`}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>

            <p className="mt-2 text-[10px] text-zinc-600">
              Showing {visibleDesktopTopics.length} chapters.
              {activeSubjectId && (
                <span className="ml-1">
                  Active focus: {subjects.find((s) => s.id === activeSubjectId)?.name}
                </span>
              )}
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
