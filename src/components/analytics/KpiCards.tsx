import React from 'react'
import { addDays, format, startOfWeek } from 'date-fns'
import { Activity, AlarmClock, Flame, Target } from 'lucide-react'
import { AnalyticsSnapshot } from '../../lib/analytics'
import { MetricLabel } from './Panel'
import { Sparkline } from './ProgressRing'

const CARD = 'rounded-xl border border-[#232329] bg-[#111114] p-3'

const KpiCard: React.FC<{
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}> = ({ label, icon, children }) => (
  <div className={`${CARD} flex h-full flex-col`}>
    <div className="flex items-start justify-between">
      <MetricLabel>{label}</MetricLabel>
      <span className="text-zinc-600">{icon}</span>
    </div>
    <div className="mt-auto flex flex-col justify-end">{children}</div>
  </div>
)

export const KpiCards: React.FC<{ snapshot: AnalyticsSnapshot; className?: string }> = ({
  snapshot,
  className = '',
}) => {
  const { retention, activity, highYield } = snapshot
  const today = new Date()

  const daily = Array.from({ length: 14 }, (_, index) =>
    activity.reviewsByDay.get(format(addDays(today, -(13 - index)), 'yyyy-MM-dd')) ?? 0
  )

  const dueNow = retention.dueToday + retention.overdue
  const deltaPct =
    activity.prev14Reviews > 0
      ? Math.round(((activity.last14Reviews - activity.prev14Reviews) / activity.prev14Reviews) * 100)
      : null

  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStart, index)
    const key = format(day, 'yyyy-MM-dd')
    return {
      key,
      label: format(day, 'EEEEE'),
      reviews: activity.reviewsByDay.get(key) ?? 0,
      isToday: key === format(today, 'yyyy-MM-dd'),
      isFuture: day > today,
    }
  })

  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      <KpiCard label="Due now" icon={<AlarmClock className="h-3.5 w-3.5" />}>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span
            className={`text-[26px] font-semibold leading-none tracking-tight tabular-nums ${
              retention.overdue > 0 ? 'text-rose-300' : 'text-zinc-100'
            }`}
          >
            {dueNow}
          </span>
          <span className="text-[10px] text-zinc-500">
            {retention.overdue > 0 ? 'need review' : 'due today'}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[10px] tabular-nums">
          <span className={retention.overdue > 0 ? 'text-rose-300' : 'text-zinc-500'}>
            {retention.overdue} overdue
          </span>
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-500">{retention.dueToday} due today</span>
        </div>
      </KpiCard>

      <KpiCard label="Reviews · 14d" icon={<Activity className="h-3.5 w-3.5" />}>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[26px] font-semibold leading-none tracking-tight text-zinc-100 tabular-nums">
            {activity.last14Reviews}
          </span>
          {activity.last14Reviews > 0 || activity.prev14Reviews > 0 ? (
            <span
              className={`text-[10px] font-semibold tabular-nums ${
                activity.reviewDelta > 0
                  ? 'text-emerald-400'
                  : activity.reviewDelta < 0
                    ? 'text-rose-300'
                    : 'text-zinc-500'
              }`}
            >
              {activity.reviewDelta > 0 ? '+' : ''}
              {activity.reviewDelta}
              {deltaPct !== null ? ` · ${deltaPct > 0 ? '+' : ''}${deltaPct}%` : ''}
            </span>
          ) : null}
        </div>
        <div className="-mx-0.5 mt-1">
          {daily.some((value) => value > 0) ? (
            <Sparkline values={daily} height={24} />
          ) : (
            <div className="h-[24px] border-b border-[#232329]" />
          )}
        </div>
      </KpiCard>

      <KpiCard label="Streak" icon={<Flame className="h-3.5 w-3.5" />}>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[26px] font-semibold leading-none tracking-tight text-zinc-100 tabular-nums">
            {activity.streak}
          </span>
          <span className="text-[10px] text-zinc-500">days · best {activity.bestStreak}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-[3px]">
          {weekDays.map((day) => (
            <span
              key={day.key}
              title={`${day.label}: ${day.reviews} reviews`}
              className={`h-[14px] flex-1 rounded-[3px] ${
                day.reviews > 0
                  ? 'bg-emerald-400/80'
                  : day.isFuture
                    ? 'bg-[#1b1b21]'
                    : 'bg-[#232329]'
              } ${day.isToday ? 'ring-1 ring-white/25' : ''}`}
            />
          ))}
        </div>
      </KpiCard>

      <KpiCard label="High-yield" icon={<Target className="h-3.5 w-3.5" />}>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[26px] font-semibold leading-none tracking-tight text-zinc-100 tabular-nums">
            {highYield.covered}
          </span>
          <span className="text-[10px] text-zinc-500">/ {highYield.total} covered</span>
        </div>
        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-[#1b1b21]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400/80 to-amber-300"
            style={{ width: `${Math.round(highYield.share * 100)}%` }}
          />
        </div>
        <div className="mt-1.5 text-[10px] text-zinc-500 tabular-nums">
          {highYield.missing} left · {Math.round(highYield.share * 100)}%
        </div>
      </KpiCard>
    </div>
  )
}
