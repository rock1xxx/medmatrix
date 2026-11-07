import React, { useState, useMemo } from 'react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { CustomModule } from '../../types'
import {
  Layers,
  Plus,
  Search,
  Check,
  AlertTriangle,
  Copy,
  Edit3,
  X,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Trash2,
  ExternalLink,
  BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'

export const QBankView: React.FC = () => {
  const {
    customModules,
    subjects,
    topics: allTopics,
    addCustomModule,
    updateCustomModule,
    deleteCustomModule,
    cycleCustomModuleAnnotation,
    cycleCustomModuleSolve,
  } = useMedMatrixStore()

  // View state
  const [qbankView, setQbankView] = useState<'wall' | 'syllabus'>('wall')
  const [activeFilter, setActiveFilter] = useState<'all' | 'not_annotated' | 'annotated'>('all')
  const [searchFilter, setSearchFilter] = useState('')
  const [syllabusSearch, setSyllabusSearch] = useState('')
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({
    physio: true,
    path: true,
    biochem: true,
    micro: true,
    surg: true,
    obg: true,
  })

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newSubjectId, setNewSubjectId] = useState('obg')
  const [newSelectedTopics, setNewSelectedTopics] = useState<string[]>([])
  const [newTags, setNewTags] = useState<string[]>(['Only PYQ', 'NEET', 'AIIMS'])
  const [newCode, setNewCode] = useState('')
  const [newCustomTag, setNewCustomTag] = useState('')
  const [newSolveStatus, setNewSolveStatus] = useState<CustomModule['solveStatus']>('done')
  const [newAnnotationStatus, setNewAnnotationStatus] = useState<CustomModule['annotationStatus']>('not_annotated')
  const [newNotes, setNewNotes] = useState('')

  // Edit Sheet State
  const [editModuleId, setEditModuleId] = useState<string | null>(null)
  const [editCode, setEditCode] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editAnnotation, setEditAnnotation] = useState<CustomModule['annotationStatus']>('not_annotated')
  const [editSolve, setEditSolve] = useState<CustomModule['solveStatus']>('done')

  // Subject quick map
  const subjectMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string; order: number }>()
    subjects.forEach((s) => {
      map.set(s.id, { name: s.name, color: s.color, order: s.order })
    })
    return map
  }, [subjects])

  // Topics grouped by subject for the 19-subject checklist
  const curriculumBySubject = useMemo(() => {
    const map = new Map<string, string[]>()
    allTopics.forEach((t) => {
      const list = map.get(t.subjectId) || []
      if (!list.includes(t.title)) {
        list.push(t.title)
      }
      map.set(t.subjectId, list)
    })
    return map
  }, [allTopics])

  // Summary counts
  const totalCount = customModules.length
  const notAnnotCount = customModules.filter((m) => m.annotationStatus === 'not_annotated').length
  const annotCount = customModules.filter((m) => m.annotationStatus === 'annotated').length

  // Filtered wall items
  const filteredModules = useMemo(() => {
    return customModules.filter((item) => {
      if (activeFilter === 'not_annotated' && item.annotationStatus !== 'not_annotated') return false
      if (activeFilter === 'annotated' && item.annotationStatus !== 'annotated') return false

      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase()
        const matchTitle = item.topicTitle.toLowerCase().includes(q)
        const matchCode = (item.code || '').toLowerCase().includes(q)
        const matchNotes = (item.notes || '').toLowerCase().includes(q)
        const matchTags = (item.tags || []).some((t) => t.toLowerCase().includes(q))
        const subName = (subjectMap.get(item.subjectId)?.name || '').toLowerCase()
        return matchTitle || matchCode || matchNotes || matchTags || subName.includes(q)
      }
      return true
    })
  }, [customModules, activeFilter, searchFilter, subjectMap])

  // Grouped by subject for the Wall
  const groupedWall = useMemo(() => {
    const groups: { subjectId: string; name: string; color: string; items: CustomModule[] }[] = []
    const subjectBuckets = new Map<string, CustomModule[]>()

    filteredModules.forEach((item) => {
      const list = subjectBuckets.get(item.subjectId) || []
      list.push(item)
      subjectBuckets.set(item.subjectId, list)
    })

    // Sort by official subject order
    const sortedSubIds = Array.from(subjectBuckets.keys()).sort((a, b) => {
      const orderA = subjectMap.get(a)?.order ?? 999
      const orderB = subjectMap.get(b)?.order ?? 999
      return orderA - orderB
    })

    sortedSubIds.forEach((sid) => {
      const sub = subjectMap.get(sid) || { name: sid, color: '#3b82f6', order: 999 }
      groups.push({
        subjectId: sid,
        name: sub.name,
        color: sub.color,
        items: subjectBuckets.get(sid) || [],
      })
    })

    return groups
  }, [filteredModules, subjectMap])

  // Copy code helper
  const handleCopyCode = (code: string) => {
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      toast.success(`Copied Marrow Code: ${code}`)
    }).catch(() => {
      toast.success(`Copied: ${code}`)
    })
  }

  // Open Edit Sheet
  const handleOpenEdit = (item: CustomModule) => {
    setEditModuleId(item.id)
    setEditCode(item.code || '')
    setEditTags((item.tags || []).join(', '))
    setEditNotes(item.notes || '')
    setEditAnnotation(item.annotationStatus)
    setEditSolve(item.solveStatus)
  }

  // Save Edit Sheet
  const handleSaveEdit = () => {
    if (!editModuleId) return
    const tagsArr = editTags.split(',').map((t) => t.trim()).filter(Boolean)
    updateCustomModule(editModuleId, {
      code: editCode.trim().toUpperCase(),
      tags: tagsArr,
      notes: editNotes.trim(),
      annotationStatus: editAnnotation,
      solveStatus: editSolve,
    })
    setEditModuleId(null)
  }

  // Delete module confirmation
  const handleDeleteModule = (id: string) => {
    if (window.confirm('Delete this custom module?')) {
      deleteCustomModule(id)
      setEditModuleId(null)
    }
  }

  // Open Add Modal
  const handleOpenAddModal = (prefillSubId?: string, prefillTopic?: string) => {
    const subId = prefillSubId || newSubjectId || 'obg'
    setNewSubjectId(subId)
    setNewSelectedTopics(prefillTopic ? [prefillTopic] : [])
    setNewCode('')
    setNewCustomTag('')
    setNewNotes('')
    setNewSolveStatus('done')
    setNewAnnotationStatus('not_annotated')
    setIsAddModalOpen(true)
  }

  // Save New Custom Module
  const handleSaveNewModule = () => {
    if (newSelectedTopics.length === 0) {
      toast.error('Please tick at least 1 topic from the checklist!')
      return
    }

    const topicTitle = newSelectedTopics.join(' + ')
    addCustomModule({
      subjectId: newSubjectId,
      topicTitle,
      selectedTopics: [...newSelectedTopics],
      code: newCode.trim().toUpperCase(),
      tags: [...newTags],
      solveStatus: newSolveStatus,
      annotationStatus: newAnnotationStatus,
      notes: newNotes.trim(),
      solvedAt: newSolveStatus === 'done' ? new Date().toISOString() : undefined,
    })

    setIsAddModalOpen(false)
  }

  // Paste code helper
  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setNewCode(text.trim().toUpperCase())
        toast.success(`Pasted code: ${text.trim().toUpperCase()}`)
      }
    } catch {
      toast.info('Could not auto-read clipboard. Please type or paste manually.')
    }
  }

  return (
    <div className="max-w-xl mx-auto px-3.5 sm:px-4 pt-1 pb-12 space-y-3.5 select-none">
      {/* Top Header & Sub-Nav Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
        <div>
          <h1 className="text-base font-extrabold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
            <span>QBank Modules &amp; Notes</span>
          </h1>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Marrow Custom Modules &bull; Verbatim Notes &bull; 19 Subjects
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenAddModal()}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Module</span>
        </button>
      </div>

      {/* View Switcher: Modules Wall vs 19 Subjects Syllabus */}
      <div className="p-1 rounded-xl bg-[#121217] border border-zinc-800 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setQbankView('wall')}
          className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
            qbankView === 'wall'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Modules Wall</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-700/60">
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setQbankView('syllabus')}
          className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
            qbankView === 'syllabus'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
          <span>19 Subjects &amp; Topics</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: MODULES WALL */}
      {/* ========================================================================= */}
      {qbankView === 'wall' && (
        <div className="space-y-3.5">
          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all active:scale-95 ${
                activeFilter === 'all'
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'bg-[#14141c] text-zinc-400 border border-zinc-800'
              }`}
            >
              All Modules ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('not_annotated')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all flex items-center gap-1 active:scale-95 ${
                activeFilter === 'not_annotated'
                  ? 'bg-rose-500 text-black shadow-sm'
                  : 'bg-[#14141c] text-rose-300 border border-rose-900/40'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Not Annotated ({notAnnotCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('annotated')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all flex items-center gap-1 active:scale-95 ${
                activeFilter === 'annotated'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-[#14141c] text-emerald-400 border border-emerald-900/40'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Annotated ({annotCount})</span>
            </button>
          </div>

          {/* Search Wall */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search module code, topic, PYQ tag, or note..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-[#121217] border border-zinc-800 pl-8 pr-3 py-2 min-h-[38px] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Subject Groups Feed */}
          {groupedWall.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-xs">
              <Layers className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p>No modules match your current filter or search.</p>
            </div>
          ) : (
            groupedWall.map((group) => (
              <div key={group.subjectId} className="space-y-2">
                {/* Subject Group Header */}
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5 pt-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-white">
                      {group.name}
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {group.items.length} {group.items.length === 1 ? 'module' : 'modules'}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2.5">
                  {group.items.map((item) => {
                    const hasCode = !!(item.code && item.code.trim())
                    const hasNote = !!(item.notes && item.notes.trim())

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl p-3 sm:p-3.5 space-y-2 bg-[#111116] border border-zinc-800/80 hover:border-zinc-700/80 transition-all"
                      >
                        {/* Row 1: Title + Code Pill + Edit Button */}
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            onClick={() => handleOpenEdit(item)}
                            className="text-sm font-bold text-white tracking-tight leading-snug flex-1 cursor-pointer hover:text-emerald-300 transition-colors"
                          >
                            {item.topicTitle}
                          </h3>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {hasCode && (
                              <button
                                type="button"
                                onClick={() => handleCopyCode(item.code)}
                                title="Tap to copy Marrow code"
                                className="px-2.5 py-1 min-h-[28px] rounded-lg bg-[#161622] border border-[#272738] hover:border-emerald-500 font-mono text-[11px] font-bold text-emerald-400 flex items-center gap-1 transition-all active:scale-95 shrink-0"
                              >
                                <span>{item.code}</span>
                                <Copy className="w-3 h-3 text-emerald-500" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit this module & notes"
                              className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-90 transition-all"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Row 2: Tags + Dual Status Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                          <div className="flex flex-wrap items-center gap-1">
                            {(item.tags || []).map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-[#161622] border border-[#232334] text-[10px] font-semibold text-zinc-400"
                              >
                                {t}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Solve Status Cycle */}
                            <button
                              type="button"
                              onClick={() => cycleCustomModuleSolve(item.id)}
                              title="Tap to toggle solve status"
                              className={`px-2.5 py-1 min-h-[28px] rounded-lg text-[10.5px] font-bold uppercase shrink-0 active:scale-95 transition-transform flex items-center gap-1 ${
                                item.solveStatus === 'done'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : item.solveStatus === 'solving'
                                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              }`}
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>{item.solveStatus === 'done' ? '✓ Solved' : item.solveStatus === 'solving' ? '⏳ Solving' : '⚪ Unsolved'}</span>
                            </button>

                            {/* Annotation Status Cycle */}
                            <button
                              type="button"
                              onClick={() => cycleCustomModuleAnnotation(item.id)}
                              title="Tap to toggle annotation status"
                              className={`px-2.5 py-1 min-h-[28px] rounded-lg text-[10.5px] font-bold uppercase shrink-0 active:scale-95 transition-transform flex items-center gap-1 ${
                                item.annotationStatus === 'not_annotated'
                                  ? 'bg-rose-950/70 text-rose-300 border border-rose-800'
                                  : item.annotationStatus === 'partial'
                                  ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                                  : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              {item.annotationStatus === 'not_annotated' && <AlertTriangle className="w-3 h-3 text-rose-400 stroke-[2.5]" />}
                              {item.annotationStatus === 'annotated' && <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />}
                              <span>
                                {item.annotationStatus === 'not_annotated'
                                  ? '⚠️ NOT ANNOTATED'
                                  : item.annotationStatus === 'partial'
                                  ? '⏳ PARTIAL NOTE'
                                  : '✓ ANNOTATED'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Row 3: Dynamic Verbatim Note Box */}
                        {hasNote && (
                          <div
                            onClick={() => handleOpenEdit(item)}
                            className="border-l-2 border-emerald-500/70 bg-[#161622]/80 rounded-r-lg px-2.5 py-1.5 text-xs text-zinc-200 font-sans leading-relaxed cursor-pointer select-text whitespace-pre-wrap mt-1"
                          >
                            {item.notes}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: 19 SUBJECTS & TOPICS CHECKLIST */}
      {/* ========================================================================= */}
      {qbankView === 'syllabus' && (
        <div className="space-y-3.5">
          {/* Top Bar with Search & Expand All */}
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search subject or topic in syllabus..."
                value={syllabusSearch}
                onChange={(e) => setSyllabusSearch(e.target.value)}
                className="w-full bg-[#121217] border border-zinc-800 pl-8 pr-3 py-1.5 min-h-[36px] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const allExpanded: Record<string, boolean> = {}
                  subjects.forEach((s) => (allExpanded[s.id] = true))
                  setExpandedSubjects(allExpanded)
                }}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-[11px] font-semibold text-zinc-300 hover:text-white"
              >
                Expand
              </button>
              <button
                type="button"
                onClick={() => setExpandedSubjects({})}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-[11px] font-semibold text-zinc-300 hover:text-white"
              >
                Collapse
              </button>
            </div>
          </div>

          {/* Subjects List */}
          <div className="space-y-2.5">
            {subjects.map((sub) => {
              const topics = curriculumBySubject.get(sub.id) || []
              if (syllabusSearch.trim()) {
                const q = syllabusSearch.toLowerCase()
                const matchSub = sub.name.toLowerCase().includes(q)
                const hasMatchingTopics = topics.some((t) => t.toLowerCase().includes(q))
                if (!matchSub && !hasMatchingTopics) return null
              }

              const isExpanded = !!expandedSubjects[sub.id]
              const attachedModules = customModules.filter((m) => m.subjectId === sub.id)

              return (
                <div
                  key={sub.id}
                  className="rounded-2xl bg-[#111116] border border-zinc-800/80 overflow-hidden"
                >
                  {/* Subject Accordion Header */}
                  <div
                    onClick={() =>
                      setExpandedSubjects((prev) => ({ ...prev, [sub.id]: !prev[sub.id] }))
                    }
                    className="p-3 sm:p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: sub.color }}
                      />
                      <h3 className="text-sm font-bold text-white tracking-tight">{sub.name}</h3>
                      <span className="text-[10.5px] font-mono text-zinc-400">
                        ({topics.length} topics)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          attachedModules.length > 0
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {attachedModules.length} {attachedModules.length === 1 ? 'module' : 'modules'}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Topics Checklist */}
                  {isExpanded && (
                    <div className="p-3 pt-0 border-t border-zinc-800/60 divide-y divide-zinc-800/40">
                      {topics.map((tTitle, tIdx) => {
                        const modulesForTopic = customModules.filter(
                          (m) =>
                            m.subjectId === sub.id &&
                            (m.topicTitle.toLowerCase().includes(tTitle.toLowerCase()) ||
                              (m.selectedTopics || []).includes(tTitle))
                        )
                        const isDone = modulesForTopic.length > 0

                        return (
                          <div
                            key={tIdx}
                            className="py-2 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isDone ? 'bg-emerald-400' : 'bg-zinc-700'
                                }`}
                              />
                              <span
                                className={`truncate font-medium ${
                                  isDone ? 'text-zinc-200' : 'text-zinc-500'
                                }`}
                              >
                                {tTitle}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isDone ? (
                                modulesForTopic.map((m) => (
                                  <span
                                    key={m.id}
                                    onClick={() => handleOpenEdit(m)}
                                    className="font-mono text-[10.5px] font-bold text-emerald-400 bg-zinc-900 border border-zinc-700/80 px-2 py-0.5 rounded cursor-pointer hover:border-emerald-500 transition-colors"
                                  >
                                    {m.code || 'DONE'}
                                  </span>
                                ))
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddModal(sub.id, tTitle)}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 hover:bg-emerald-500 hover:text-black text-zinc-400 transition-all flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Module</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD CUSTOM MODULE */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-[#121217] border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 space-y-4 shadow-2xl max-h-[88dvh] overflow-y-auto no-scrollbar flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-black">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Add Custom Module</h3>
                  <p className="text-[11px] text-zinc-400">
                    Tick topics &bull; Enter Marrow code &bull; Save verbatim note
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subject Selector & Quick Chips */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                1. Select Subject:
              </label>
              <select
                value={newSubjectId}
                onChange={(e) => {
                  setNewSubjectId(e.target.value)
                  setNewSelectedTopics([])
                }}
                className="w-full bg-[#181822] border border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({curriculumBySubject.get(s.id)?.length || 0} topics)
                  </option>
                ))}
              </select>

              {/* Quick Chips */}
              <div className="flex flex-wrap gap-1 pt-1">
                {subjects.slice(0, 7).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setNewSubjectId(s.id)
                      setNewSelectedTopics([])
                    }}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                      newSubjectId === s.id
                        ? 'bg-emerald-500 text-black shadow-sm'
                        : 'bg-[#181824] text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Topics Multi-Select Checklist */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  2. Choose Topics (Tick 1 or more to bundle):
                </label>
                <span className="text-[10px] font-mono font-bold text-emerald-400">
                  {newSelectedTopics.length} selected
                </span>
              </div>

              <div className="max-h-36 overflow-y-auto rounded-xl bg-[#161622] border border-zinc-800/80 p-2 space-y-1 divide-y divide-zinc-800/50">
                {(curriculumBySubject.get(newSubjectId) || []).map((t, idx) => {
                  const isChecked = newSelectedTopics.includes(t)
                  return (
                    <label
                      key={idx}
                      className="flex items-center gap-2.5 py-1.5 px-1 cursor-pointer hover:bg-zinc-800/40 rounded transition-colors text-xs text-zinc-200"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setNewSelectedTopics(newSelectedTopics.filter((x) => x !== t))
                          } else {
                            setNewSelectedTopics([...newSelectedTopics, t])
                          }
                        }}
                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0"
                      />
                      <span className={`truncate ${isChecked ? 'text-white font-bold' : ''}`}>
                        {t}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Marrow Code Input with Paste */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                3. Marrow Module Code:
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. 5LE50LC9"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-[#181822] border border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500 uppercase"
                />
                <button
                  type="button"
                  onClick={handlePasteCode}
                  className="px-3 py-2 min-h-[38px] rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-bold text-zinc-200 flex items-center gap-1 shrink-0"
                >
                  <Clipboard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Paste</span>
                </button>
              </div>
            </div>

            {/* PYQ Tag Chips */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                4. Tags:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['Only PYQ', 'NEET', 'AIIMS', 'INI-CET', 'Clinical', 'Image-Based', 'Slides'].map(
                  (tag) => {
                    const isSelected = newTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setNewTags(newTags.filter((t) => t !== tag))
                          } else {
                            setNewTags([...newTags, tag])
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-emerald-500 text-black shadow-sm font-bold'
                            : 'bg-[#181824] text-zinc-400 border border-zinc-800'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  }
                )}
              </div>
            </div>

            {/* Dual Status Selectors */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Solve Status:
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setNewSolveStatus('done')}
                    className={`py-1.5 rounded-lg text-[10.5px] font-bold ${
                      newSolveStatus === 'done'
                        ? 'bg-emerald-500 text-black'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSolveStatus('solving')}
                    className={`py-1.5 rounded-lg text-[10.5px] font-bold ${
                      newSolveStatus === 'solving'
                        ? 'bg-sky-500 text-black'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    Solving
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSolveStatus('not_done')}
                    className={`py-1.5 rounded-lg text-[10.5px] font-bold ${
                      newSolveStatus === 'not_done'
                        ? 'bg-zinc-300 text-black'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    Unsolved
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Annotation Status:
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setNewAnnotationStatus('not_annotated')}
                    className={`py-1.5 rounded-lg text-[10.5px] font-bold ${
                      newAnnotationStatus === 'not_annotated'
                        ? 'bg-rose-500 text-black'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    ⚠️ Not
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAnnotationStatus('partial')}
                    className={`py-1.5 rounded-lg text-[10.5px] font-bold ${
                      newAnnotationStatus === 'partial'
                        ? 'bg-amber-500 text-black'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    Partial
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAnnotationStatus('annotated')}
                    className={`py-1.5 rounded-lg text-[10.5px] font-bold ${
                      newAnnotationStatus === 'annotated'
                        ? 'bg-emerald-500 text-black'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    ✓ Done
                  </button>
                </div>
              </div>
            </div>

            {/* Verbatim Notes */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                5. Verbatim Notes:
              </label>
              <textarea
                rows={2}
                placeholder="e.g. 5LE50LC9 - only PYQ, till Q28 not annotated..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full bg-[#181822] border border-zinc-700/80 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewModule}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20"
              >
                Save Custom Module
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT CUSTOM MODULE SHEET */}
      {/* ========================================================================= */}
      {editModuleId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-[#13131b] border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 space-y-4 shadow-2xl max-h-[88dvh] overflow-y-auto no-scrollbar flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                  Edit Custom Module
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {customModules.find((m) => m.id === editModuleId)?.topicTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModuleId(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Code */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Marrow Code:
              </label>
              <input
                type="text"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                className="w-full bg-[#181822] border border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white uppercase focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Tags (comma separated):
              </label>
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                className="w-full bg-[#181822] border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Annotation Status */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Annotation Status:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditAnnotation('not_annotated')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    editAnnotation === 'not_annotated'
                      ? 'bg-rose-500 text-black'
                      : 'bg-[#181822] text-rose-300 border border-zinc-800'
                  }`}
                >
                  ⚠️ Not Annot
                </button>
                <button
                  type="button"
                  onClick={() => setEditAnnotation('partial')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    editAnnotation === 'partial'
                      ? 'bg-amber-500 text-black'
                      : 'bg-[#181822] text-amber-300 border border-zinc-800'
                  }`}
                >
                  Partial
                </button>
                <button
                  type="button"
                  onClick={() => setEditAnnotation('annotated')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    editAnnotation === 'annotated'
                      ? 'bg-emerald-500 text-black'
                      : 'bg-[#181822] text-emerald-400 border border-zinc-800'
                  }`}
                >
                  ✓ Annotated
                </button>
              </div>
            </div>

            {/* Solve Status */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Solve Status:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditSolve('not_done')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    editSolve === 'not_done'
                      ? 'bg-zinc-300 text-black'
                      : 'bg-[#181822] text-zinc-400 border border-zinc-800'
                  }`}
                >
                  Unsolved
                </button>
                <button
                  type="button"
                  onClick={() => setEditSolve('solving')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    editSolve === 'solving'
                      ? 'bg-sky-500 text-black'
                      : 'bg-[#181822] text-sky-400 border border-zinc-800'
                  }`}
                >
                  Solving
                </button>
                <button
                  type="button"
                  onClick={() => setEditSolve('done')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    editSolve === 'done'
                      ? 'bg-emerald-500 text-black'
                      : 'bg-[#181822] text-emerald-400 border border-zinc-800'
                  }`}
                >
                  ✓ Solved
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Verbatim Notes:
              </label>
              <textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full bg-[#181822] border border-zinc-700/80 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteModule(editModuleId)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/40 border border-rose-900/40 flex items-center gap-1 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditModuleId(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-extrabold text-xs shadow-md shadow-emerald-500/20"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
