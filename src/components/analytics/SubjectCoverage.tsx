import React, { useMemo, useState } from 'react'
import { BookOpen, ChevronRight } from 'lucide-react'
import { Panel, PanelHeader } from './Panel'
import { SubjectRow } from '../../lib/analytics'

type SortKey = 'coverage' | 'due' | 'stale'

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'due', label: 'Due' },
  { key: 'coverage', label: 'Weakest' },
  { key: 'stale', label: 'Stale' },
]

/**
 * Per-subject coverage. On a phone each row is two lines; on a laptop it gains the
 * chapter count, hours and how long ago the subject was touched, so a full revision
 * sweep can be planned without opening the syllabus tab.
 */
export const SubjectCoverage: React.FC<{
  subjects: SubjectRow[]
  onSelectSubject?: (subjectId: string) => void
  className?: string
}> = ({ subjects, onSelectSubject, className = '' }) => {
  const [sort, setSort] = useState<SortKey>('due')
  const [expanded, setExpanded] = useState(false)

  const ordered = useMemo(() => {
    const list = [...subjects]
    if (sort === 'coverage') {
      list.sort((a, b) => a.coverage - b.coverage || b.due - a.due)
    } else if (sort === 'due') {
      list.sort((a, b) => b.due - a.due || a.coverage - b.coverage)
    } else {
      list.sort((a, b) => (b.daysSinceTouched ?? 9999) - (a.daysSinceTouched ?? 9999))
    }
    return list
  }, [subjects, sort])

  const untouched = subjects.filter((s) => s.locked === 0).length
  // Phones show the top eight and a toggle; a laptop shows the whole list.
  const MOBILE_PREVIEW = 8

  return (
    <Panel className={className}>
      <PanelHeader
        icon={<BookOpen className="h-3.5 w-3.5" />}
        title="Subject coverage"
        caption={`${subjects.length} subjects · ${untouched} untouched`}
        right={
          <div className="flex items-center gap-0.5 rounded-lg border border-[#26262c] bg-[#16161a] p-0.5">
            {SORTS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSort(option.key)}
                className={`rounded-md px-1.5 py-[3px] text-[10px] font-semibold transition-colors ${
                  sort === option.key
                    ? 'bg-[#26262c] text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      />

      <ul className="mt-1 lg:columns-2 lg:gap-0 lg:[column-rule:1px_solid_#1c1c22]">
        {ordered.map((subject, index) => {
          const pct = Math.round(subject.coverage * 100)
          const collapsed = !expanded && index >= MOBILE_PREVIEW
          return (
            <li
              key={subject.id}
              className={`break-inside-avoid ${collapsed ? 'hidden lg:block' : ''}`}
            >
              <button
                type="button"
                onClick={() => onSelectSubject?.(subject.id)}
                className="group w-full px-4 py-[7px] text-left transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                  <span
                    data-testid="subject-name"
                    className="min-w-0 flex-1 truncate text-[12px] font-medium text-zinc-200"
                  >
                    {subject.name}
                  </span>
                  {subject.due > 0 ? (
                    <span className="shrink-0 rounded-full bg-rose-500/10 px-1.5 py-[1px] text-[9px] font-semibold text-rose-300 tabular-nums">
                      {subject.due} due
                    </span>
                  ) : null}
                  <span className="w-8 shrink-0 text-right text-[11.5px] font-semibold text-zinc-300 tabular-nums">
                    {pct}%
                  </span>
                  <ChevronRight className="hidden h-3 w-3 shrink-0 text-zinc-700 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500 sm:block" />
                </div>

                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-[#1b1b21]">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${Math.max(subject.locked > 0 ? 2 : 0, pct)}%`,
                        backgroundColor: subject.color,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-[9.5px] text-zinc-500 tabular-nums">
                    {subject.locked}/{subject.total}
                  </span>
                  <span className="hidden w-[74px] shrink-0 text-right text-[9.5px] text-zinc-600 tabular-nums sm:block">
                    {subject.hoursTotal.toFixed(1)}h
                  </span>
                  <span className="hidden w-[86px] shrink-0 text-right text-[9.5px] text-zinc-600 sm:block">
                    {subject.daysSinceTouched === null
                      ? 'untouched'
                      : subject.daysSinceTouched === 0
                        ? 'today'
                        : `${subject.daysSinceTouched}d ago`}
                  </span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      {ordered.length > 8 ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="w-full border-t border-[#1c1c22] px-4 py-2.5 text-[11px] font-semibold text-zinc-400 transition-colors hover:bg-white/[0.03] hover:text-zinc-200 lg:hidden"
        >
          {expanded ? 'Show less' : `Show all ${ordered.length} subjects`}
        </button>
      ) : null}
    </Panel>
  )
}
