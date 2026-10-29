import React, { ReactNode } from 'react'

/**
 * Card shell for the Stats tab. Flat charcoal with a hairline border and no heavy
 * shadow, matching the rest of the app (the old analytics page used a navy
 * `slate-900` palette that read as a different product).
 */
export const Panel: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <section className={`overflow-hidden rounded-2xl border border-[#232329] bg-[#111114] ${className}`}>
    {children}
  </section>
)

export const PanelHeader: React.FC<{
  icon?: ReactNode
  title: string
  caption?: string
  right?: ReactNode
  className?: string
}> = ({ icon, title, caption, right, className = '' }) => (
  <header className={`flex items-start justify-between gap-3 px-4 pt-3.5 ${className}`}>
    <div className="flex min-w-0 items-center gap-2">
      {icon ? <span className="shrink-0 text-zinc-500">{icon}</span> : null}
      <div className="min-w-0">
        <h2 className="truncate text-[13px] font-semibold leading-tight text-zinc-200">{title}</h2>
        {caption ? (
          <p className="mt-0.5 truncate text-[11px] leading-tight text-zinc-500">{caption}</p>
        ) : null}
      </div>
    </div>
    {right ? <div className="shrink-0">{right}</div> : null}
  </header>
)

/** Small uppercase label used above every metric. */
export const MetricLabel: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <span
    className={`text-[9.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500 ${className}`}
  >
    {children}
  </span>
)

/** Thin segmented progress track used for composition bars. */
export const SegmentedBar: React.FC<{
  segments: Array<{ key: string; value: number; color: string }>
  height?: number
  className?: string
}> = ({ segments, height = 6, className = '' }) => {
  const total = segments.reduce((acc, s) => acc + s.value, 0)
  if (total <= 0) {
    return (
      <div
        className={`w-full overflow-hidden rounded-full bg-[#1b1b21] ${className}`}
        style={{ height }}
      />
    )
  }

  return (
    <div
      className={`flex w-full overflow-hidden rounded-full bg-[#1b1b21] ${className}`}
      style={{ height }}
    >
      {segments
        .filter((s) => s.value > 0)
        .map((segment) => (
          <div
            key={segment.key}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(segment.value / total) * 100}%`, backgroundColor: segment.color }}
            title={`${segment.value}`}
          />
        ))}
    </div>
  )
}
