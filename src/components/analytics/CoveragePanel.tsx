import React from 'react'
import { format, parseISO } from 'date-fns'
import { Target } from 'lucide-react'
import { AnalyticsSnapshot } from '../../lib/analytics'
import { Panel, PanelHeader, SegmentedBar } from './Panel'
import { ProgressRing } from './ProgressRing'

const MicroStat: React.FC<{ label: string; value: string; hint?: string; tone?: string }> = ({
  label,
  value,
  hint,
  tone = 'text-zinc-100',
}) => (
  <div>
    <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-600">{label}</div>
    <div className={`mt-0.5 text-[17px] font-semibold leading-none tracking-tight tabular-nums ${tone}`}>
      {value}
      {hint ? <span className="ml-1 text-[10px] font-normal text-zinc-500">{hint}</span> : null}
    </div>
  </div>
)

/**
 * The answer to "am I on track": coverage ring, the size of what is left, and a
 * finish date derived from the pace the engine has actually observed — not a
 * marketing number. Everything else on the page supports this card.
 */
export const CoveragePanel: React.FC<{ snapshot: AnalyticsSnapshot; className?: string }> = ({
  snapshot,
  className = '',
}) => {
  const { coverage, totals, retention, pace, pipeline } = snapshot
  const remaining = pipeline.filter((stage) => stage.key !== 'LOCKED_IN_SR')

  return (
    <Panel className={className}>
      <PanelHeader
        icon={<Target className="h-3.5 w-3.5" />}
        title="Syllabus coverage"
        caption={`${totals.chapters - pace.remainingChapters} of ${totals.chapters} chapters in retention`}
        right={
          <span className="rounded-full border border-[#2a2a32] bg-[#17171c] px-2 py-0.5 text-[10px] font-medium text-zinc-400">
            {pace.source === 'observed' ? 'observed pace' : 'planned pace'}
          </span>
        }
      />

      <div className="flex items-center gap-4 px-4 pt-3 lg:gap-6">
        <ProgressRing
          value={coverage}
          label={`${Math.round(coverage * 100)}%`}
          caption="in retention"
          size={124}
          stroke={8}
        />

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-4 sm:gap-x-3">
          <MicroStat value={String(retention.mastered)} label="Mastered" hint="L4" tone="text-emerald-300" />
          <MicroStat
            value={`${Math.round(totals.hoursRemaining)}h`}
            label="Hours left"
            hint={`/${Math.round(totals.hoursTotal)}h`}
          />
          <MicroStat value={String(pace.remainingChapters)} label="Chapters" hint="left" />
          <MicroStat value={retention.averageLevel.toFixed(1)} label="Avg level" hint="/4" />
        </div>
      </div>

      <div className="mt-3.5 border-t border-[#1c1c22] px-4 pb-3.5 pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-600">
            Projected finish
          </span>
          <span className="text-[12.5px] font-semibold text-zinc-100 tabular-nums">
            {pace.finishDate ? format(parseISO(pace.finishDate), 'd MMM yyyy') : '—'}
            <span className="ml-1.5 text-[10px] font-normal text-zinc-500">
              {pace.daysToFinish === null ? '' : `in ${pace.daysToFinish} days`}
            </span>
          </span>
        </div>

        <SegmentedBar
          className="mt-2"
          height={7}
          segments={remaining.map((stage) => ({
            key: stage.key,
            value: stage.count,
            color: stage.color,
          }))}
        />

        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
          <span className="truncate">
            <span className="font-semibold text-zinc-300 tabular-nums">
              {pace.perDay.toFixed(1)}
            </span>{' '}
            chapters/day{' '}
            {pace.source === 'observed' ? `over the last ${pace.windowDays} days` : 'planned'}
          </span>
          <span className="shrink-0">
            <span className="font-semibold text-zinc-300 tabular-nums">{pace.remainingChapters}</span>{' '}
            left
          </span>
        </div>

        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {remaining.map((stage) => (
            <li key={stage.key} className="flex items-center gap-1 text-[9.5px] text-zinc-500">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              {stage.short}
              <span className="font-semibold text-zinc-300 tabular-nums">{stage.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}
