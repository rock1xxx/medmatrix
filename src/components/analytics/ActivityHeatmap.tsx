import React, { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { HeatCell, HeatWeek } from '../../lib/analytics'

/** Emerald ramp; 0 is the empty track colour. */
const LEVEL_FILL = [
  '#17171c',
  'rgba(52, 211, 153, 0.22)',
  'rgba(52, 211, 153, 0.42)',
  'rgba(52, 211, 153, 0.66)',
  '#34d399',
] as const

const WEEKDAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

/**
 * Consistency grid: one square per day for the last six months, shaded by how many
 * spaced reviews were completed. Hand-built because the bespoke behaviour here —
 * tap any day to read it out, emerald ramp, month rail — is exactly what a generic
 * calendar heatmap library would fight.
 */
export const ActivityHeatmap: React.FC<{
  weeks: HeatWeek[]
  monthLabels: Array<{ index: number; label: string }>
  peakDay: HeatCell | { date: string; reviews: number; locks: number } | null
  totalReviews: number
  activeDays: number
}> = ({ weeks, monthLabels, peakDay, totalReviews, activeDays }) => {
  const [picked, setPicked] = useState<HeatCell | { date: string; reviews: number; locks: number } | null>(
    peakDay
  )

  const readout = useMemo(() => {
    if (!picked) return null
    return {
      day: format(parseISO(picked.date), 'EEE d MMM'),
      reviews: picked.reviews,
      locks: picked.locks,
    }
  }, [picked])

  const perActiveDay = activeDays > 0 ? totalReviews / activeDays : 0
  // One label every four columns at most: at 9px cells three-letter months would
  // otherwise run into each other on a phone.
  const monthLabelSet = useMemo(() => {
    const kept = new Set<number>()
    let lastIndex = -99
    for (const month of monthLabels) {
      if (month.index - lastIndex < 4) continue
      kept.add(month.index)
      lastIndex = month.index
    }
    return kept
  }, [monthLabels])

  return (
    <div className="px-4 pb-4">
      <div className="flex justify-center">
        <div className="flex gap-1.5 sm:gap-2">
          <div className="flex flex-col gap-[3px] pt-[17px]">
            {WEEKDAY_LABELS.map((label, index) => (
              <div
                key={index}
                className="h-[9px] w-[16px] text-[8px] leading-[9px] text-zinc-600 sm:h-4 sm:leading-4"
              >
                {label}
              </div>
            ))}
          </div>

          <div>
            <div className="flex gap-[3px]">
              {weeks.map((week, index) => (
                <div key={week.start} className="relative h-[14px] w-[9px] sm:w-4">
                  {monthLabelSet.has(index) ? (
                    <span className="absolute left-0 top-0 whitespace-nowrap text-[8.5px] leading-[14px] text-zinc-600">
                      {week.monthLabel}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week) => (
                <div key={week.start} className="flex flex-col gap-[3px]">
                  {week.cells.map((cell) => {
                    const isPicked = picked?.date === cell.date
                    return (
                      <button
                        key={cell.date}
                        type="button"
                        disabled={cell.future}
                        onMouseEnter={() => setPicked(cell)}
                        onFocus={() => setPicked(cell)}
                        onClick={() => setPicked(cell)}
                        aria-label={`${cell.date}: ${cell.reviews} reviews`}
                        className={`h-[9px] w-[9px] rounded-[2px] transition-[transform,box-shadow] duration-150 sm:h-4 sm:w-4 sm:rounded-[3px] ${
                          cell.future
                            ? 'cursor-default bg-transparent'
                            : 'hover:scale-125 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.18)]'
                        } ${isPicked ? 'ring-1 ring-white/45' : ''}`}
                        style={{
                          backgroundColor: cell.future ? 'transparent' : LEVEL_FILL[cell.intensity],
                        }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#1c1c22] pt-2.5">
        <div data-testid="heat-readout" className="min-w-0 text-[11px] leading-tight text-zinc-400">
          {readout ? (
            <>
              <span className="font-medium text-zinc-200">{readout.day}</span>
              <span className="mx-1.5 text-zinc-700">·</span>
              <span className="tabular-nums">{readout.reviews}</span> reviews
              {readout.locks > 0 ? (
                <>
                  <span className="mx-1.5 text-zinc-700">·</span>
                  <span className="tabular-nums">{readout.locks}</span> locked
                </>
              ) : null}
            </>
          ) : (
            <span className="text-zinc-500">No reviews logged yet</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[9px] text-zinc-600">
          <span>Less</span>
          {LEVEL_FILL.map((fill, index) => (
            <span
              key={index}
              className="h-[8px] w-[8px] rounded-[2px] sm:h-2.5 sm:w-2.5"
              style={{ backgroundColor: fill }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
        <span>
          <span className="font-semibold text-zinc-300 tabular-nums">{totalReviews}</span> reviews
          logged
        </span>
        <span>
          <span className="font-semibold text-zinc-300 tabular-nums">{activeDays}</span> active days
        </span>
        <span>
          <span className="font-semibold text-zinc-300 tabular-nums">
            {perActiveDay.toFixed(1)}
          </span>{' '}
          / active day
        </span>
      </div>
    </div>
  )
}
