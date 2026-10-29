import React from 'react'

/**
 * Coverage ring. Hand-built SVG rather than a library: it is four arcs of
 * trigonometry and gives exact control over the gradient, cap and typography,
 * which no charting dependency would match without more code.
 */
export const ProgressRing: React.FC<{
  value: number
  label: string
  caption: string
  size?: number
  stroke?: number
}> = ({ value, label, caption, size = 132, stroke = 9 }) => {
  const clamped = Math.max(0, Math.min(1, value))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dash = circumference * clamped
  const center = size / 2

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="55%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1e1e24"
          strokeWidth={stroke}
        />
        {clamped > 0.002 ? (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#ringGradient)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            style={{ transition: 'stroke-dasharray 700ms cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-semibold leading-none tracking-tight text-zinc-100 tabular-nums">
          {label}
        </span>
        <span className="mt-1 max-w-[86px] text-center text-[9.5px] font-medium uppercase leading-tight tracking-[0.1em] text-zinc-500">
          {caption}
        </span>
      </div>
    </div>
  )
}

/** Micro line chart for KPI cards. */
export const Sparkline: React.FC<{
  values: number[]
  color?: string
  className?: string
  height?: number
}> = ({ values, color = '#34d399', className = '', height = 26 }) => {
  const width = 100
  const max = Math.max(1, ...values)
  const step = values.length > 1 ? width / (values.length - 1) : width
  const points = values.map((value, index) => {
    const x = index * step
    const y = height - 2 - (value / max) * (height - 4)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  const line = points.length ? `M${points.join(' L')}` : ''
  const area = points.length ? `${line} L${width},${height} L0,${height} Z` : ''
  const gradientId = React.useId()

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area ? <path d={area} fill={`url(#${gradientId})`} /> : null}
      {line ? (
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  )
}
