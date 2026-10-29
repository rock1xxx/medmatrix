import React from 'react'
import { Repeat } from 'lucide-react'
import { Panel, PanelHeader } from './Panel'
import { AnalyticsSnapshot } from '../../lib/analytics'

/**
 * The Ebbinghaus ladder as it actually behaves: a pyramid that gets narrower as
 * chapters climb L0 → L4. Bar widths are relative to the tallest rung, so the shape
 * itself tells you whether recall is spreading out or piling up at the bottom.
 */
export const RetentionLadder: React.FC<{
  retention: AnalyticsSnapshot['retention']
  className?: string
}> = ({ retention, className = '' }) => {
  const max = Math.max(1, ...retention.levels.map((rung) => rung.count))
  const durabilityPct = Math.round(retention.durability * 100)

  return (
    <Panel className={className}>
      <PanelHeader
        icon={<Repeat className="h-3.5 w-3.5" />}
        title="Ebbinghaus ladder"
        caption={`${retention.inEngine} chapters in the engine`}
        right={
          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 tabular-nums">
            {durabilityPct}% durable
          </span>
        }
      />

      <div className="px-4 pb-3">
        <ul className="space-y-1.5">
          {retention.levels.map((rung) => {
            const width = (rung.count / max) * 100
            return (
              <li key={rung.level} className="flex items-center gap-2">
                <span className="w-[26px] shrink-0 text-[10px] font-semibold text-zinc-400">
                  {rung.label}
                </span>
                <span className="w-[46px] shrink-0 text-[9.5px] text-zinc-600">{rung.interval}</span>
                <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-[#1b1b21]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(rung.count > 0 ? 3 : 0, width)}%`,
                      backgroundColor: rung.color,
                      opacity: 0.85,
                    }}
                  />
                </div>
                <span className="w-7 shrink-0 text-right text-[11px] font-semibold text-zinc-200 tabular-nums">
                  {rung.count}
                </span>
              </li>
            )
          })}
        </ul>

        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[#1c1c22] pt-2.5">
          <div>
            <dt className="text-[9px] uppercase tracking-[0.1em] text-zinc-600">Avg level</dt>
            <dd className="mt-0.5 text-[15px] font-semibold leading-none text-zinc-100 tabular-nums">
              {retention.averageLevel.toFixed(1)}
              <span className="text-[10px] font-normal text-zinc-500"> / 4</span>
            </dd>
          </div>
          <div>
            <dt className="text-[9px] uppercase tracking-[0.1em] text-zinc-600">L3 + L4</dt>
            <dd className="mt-0.5 text-[15px] font-semibold leading-none text-zinc-100 tabular-nums">
              {retention.onFinalRung}
            </dd>
          </div>
          <div>
            <dt className="text-[9px] uppercase tracking-[0.1em] text-zinc-600">Mastered</dt>
            <dd className="mt-0.5 text-[15px] font-semibold leading-none text-emerald-300 tabular-nums">
              {retention.mastered}
            </dd>
          </div>
        </dl>
      </div>
    </Panel>
  )
}
