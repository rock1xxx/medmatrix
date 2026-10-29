import React from 'react'
import { format, parseISO } from 'date-fns'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarClock } from 'lucide-react'
import { Panel, PanelHeader } from './Panel'
import { ChartTooltip } from './ChartTooltip'

/**
 * The only chart here that a library genuinely earns: fourteen dated categories,
 * responsive sizing, hover and label placement. Recharts is already a lazily
 * loaded dependency, so this adds nothing to the app shell.
 */
export const ReviewLoadChart: React.FC<{
  forecast: Array<{ date: string; label: string; weekday: string; due: number; isToday: boolean }>
  overdue: number
  rangeLabel: string
  className?: string
}> = ({ forecast, overdue, rangeLabel, className = '' }) => {
  const data = forecast.map((day) => ({
    ...day,
    dayOfMonth: format(parseISO(day.date), 'd'),
    fullLabel: format(parseISO(day.date), 'EEE d MMM'),
  }))
  const total = data.reduce((acc, day) => acc + day.due, 0)
  const todayCount = data.find((day) => day.isToday)?.due ?? 0

  return (
    <Panel className={`flex flex-col ${className}`}>
      <PanelHeader
        icon={<CalendarClock className="h-3.5 w-3.5" />}
        title="Review load"
        caption={`${rangeLabel} · ${total} due`}
        right={
          overdue > 0 ? (
            <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
              {overdue} overdue
            </span>
          ) : (
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              Clear
            </span>
          )
        }
      />

      <div className="px-2 pb-2 pt-1">
        <div className="h-[196px] w-full">
          {total === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
              <p className="text-[12px] font-medium text-zinc-300">Nothing scheduled</p>
              <p className="max-w-[220px] text-[10.5px] leading-snug text-zinc-500">
                Your Ebbinghaus queue is caught up for the next two weeks.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 16, right: 4, left: 4, bottom: 0 }} barCategoryGap={5}>
                <XAxis
                  dataKey="fullLabel"
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                  tickFormatter={(value: string) => value.split(' ')[1] ?? value}
                  tick={{ fill: '#71717a', fontSize: 9 }}
                  height={16}
                />
                <YAxis hide domain={[0, 'dataMax']} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.035)', radius: 4 }}
                  content={<ChartTooltip unit="reviews" />}
                />
                <Bar dataKey="due" radius={[4, 4, 2, 2]} maxBarSize={26} isAnimationActive={false}>
                  <LabelList
                    dataKey="due"
                    position="top"
                    offset={5}
                    formatter={(value) => (Number(value) > 0 ? String(value) : '')}
                    style={{ fill: '#a1a1aa', fontSize: 9, fontWeight: 600 }}
                  />
                  {data.map((day) => (
                    <Cell
                      key={day.date}
                      fill={day.isToday ? '#fbbf24' : '#34d399'}
                      fillOpacity={day.isToday ? 0.95 : 0.5}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-[#1c1c22] pt-2 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Today
            <span className="font-semibold text-zinc-300 tabular-nums">{todayCount}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
            Rest of the fortnight
            <span className="font-semibold text-zinc-300 tabular-nums">
              {Math.max(0, total - todayCount)}
            </span>
          </span>
        </div>
      </div>
    </Panel>
  )
}
