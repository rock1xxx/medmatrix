import React from 'react'

/**
 * One tooltip treatment for every recharts surface: dark card, hairline border,
 * tabular numbers. Recharts' default white bubble is the main reason stock charts
 * look unpolished on a dark dashboard.
 *
 * The prop shape is declared locally instead of importing recharts' tooltip props:
 * recharts v3 hands a custom `content` element `active`, `payload` and `label`, and
 * its exported type does not describe those fields.
 */
export interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ value?: number | string }>
  label?: string | number
  unit?: string
}

export function ChartTooltip({ active, payload, label, unit = '' }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const value = payload[0]?.value ?? 0

  return (
    <div className="pointer-events-none rounded-lg border border-[#2b2b33] bg-[#15151a]/95 px-2.5 py-1.5 shadow-xl backdrop-blur">
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-[15px] font-semibold leading-none text-zinc-100 tabular-nums">
          {value}
        </span>
        <span className="text-[10px] text-zinc-500">{unit}</span>
      </div>
    </div>
  )
}

