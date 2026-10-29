import React, { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { MessageSquareQuote, TrendingUp } from 'lucide-react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { buildAnalytics, weekdayCadence } from '../../lib/analytics'
import { ActivityHeatmap } from '../analytics/ActivityHeatmap'
import { CoveragePanel } from '../analytics/CoveragePanel'
import { KpiCards } from '../analytics/KpiCards'
import { Panel, PanelHeader } from '../analytics/Panel'
import { PipelinePanel } from '../analytics/PipelinePanel'
import { RetentionLadder } from '../analytics/RetentionLadder'
import { ReviewLoadChart } from '../analytics/ReviewLoadChart'
import { SubjectCoverage } from '../analytics/SubjectCoverage'

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/**
 * Stats — the app's diagnosis layer.
 *
 * Everything is derived from the study database that already exists (topic status,
 * SR level, lockedAt, review history, durations). No new persisted fields, so this
 * page cannot drift out of sync with the data model, and nothing here needs a
 * migration or a backup change.
 *
 * Visual system: recharts only where a library earns its place (the 14-day dated
 * bar chart); the ring, heatmap, ladders and composition bars are hand-built SVG
 * and CSS because they encode this app's specific semantics and because adding a
 * second charting dependency to a phone APK is not worth it for four shapes.
 */
export const AnalyticsView: React.FC = () => {
  const { topics, subjects, dailyPaceTopics, setActiveSubjectId, setSelectedSubjectFilter, setActiveTab } =
    useMedMatrixStore()

  const snapshot = useMemo(
    () => buildAnalytics(topics, subjects, { plannedPace: dailyPaceTopics }),
    [topics, subjects, dailyPaceTopics]
  )

  const cadence = useMemo(() => weekdayCadence(snapshot.activity.reviewsByDay, new Date()), [
    snapshot.activity.reviewsByDay,
  ])
  const bestWeekdayIndex = cadence.indexOf(Math.max(...cadence))
  const bestWeekday = WEEKDAY_NAMES[bestWeekdayIndex] ?? 'Monday'

  const rangeLabel = snapshot.forecast.length
    ? `${format(parseISO(snapshot.forecast[0].date), 'd MMM')} – ${format(
        parseISO(snapshot.forecast[snapshot.forecast.length - 1].date),
        'd MMM'
      )}`
    : ''

  const openSubject = (subjectId: string) => {
    setActiveSubjectId(subjectId)
    setSelectedSubjectFilter(subjectId)
    setActiveTab('matrix')
  }

  const empty = snapshot.totals.chapters === 0

  return (
    <div
      data-testid="stats-view"
      className="mx-auto w-full max-w-xl px-4 pb-28 pt-1 lg:max-w-[1400px] lg:px-6"
    >
      <header className="flex items-center justify-between gap-3 pb-3 pt-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-emerald-400">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-none tracking-tight text-zinc-100">Stats</h1>
            <p className="mt-1 truncate text-[11px] text-zinc-500">
              {snapshot.totals.chapters} chapters · {snapshot.totals.subjects} subjects
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
            As of
          </div>
          <div className="text-[12px] font-medium text-zinc-300 tabular-nums">
            {format(new Date(), 'd MMM yyyy')}
          </div>
        </div>
      </header>

      {empty ? (
        <Panel className="p-6 text-center">
          <p className="text-[13px] font-semibold text-zinc-200">No study data yet</p>
          <p className="mx-auto mt-1 max-w-[260px] text-[11px] leading-snug text-zinc-500">
            Lock your first chapter into the retention engine and this page fills up on its own.
          </p>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12 lg:gap-3">
          <CoveragePanel snapshot={snapshot} className="lg:col-span-7" />

          <KpiCards snapshot={snapshot} className="lg:col-span-5" />

          <Panel className="lg:col-span-7">
            <PanelHeader
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              title="Retention work"
              caption={`${snapshot.activity.totalReviews} reviews over the last 6 months`}
              right={
                <span className="hidden text-[10px] text-zinc-500 sm:block">
                  best day · {snapshot.activity.peakDay?.reviews ?? 0} reviews
                </span>
              }
            />
            <ActivityHeatmap
              weeks={snapshot.activity.weeks}
              monthLabels={snapshot.activity.monthLabels}
              peakDay={snapshot.activity.peakDay}
              totalReviews={snapshot.activity.totalReviews}
              activeDays={snapshot.activity.activeDays}
            />
          </Panel>

          <ReviewLoadChart
            className="lg:col-span-5"
            forecast={snapshot.forecast}
            overdue={snapshot.retention.overdue}
            rangeLabel={rangeLabel}
          />

          <PipelinePanel
            className="lg:col-span-5"
            pipeline={snapshot.pipeline}
            chapters={snapshot.totals.chapters}
          />

          <RetentionLadder className="lg:col-span-7" retention={snapshot.retention} />

          <SubjectCoverage
            className="lg:col-span-12"
            subjects={snapshot.subjects}
            onSelectSubject={openSubject}
          />

          <p className="col-span-1 flex items-start gap-1.5 px-1 pt-1 text-[10px] leading-snug text-zinc-600 lg:col-span-12">
            <MessageSquareQuote className="mt-[1px] h-3 w-3 shrink-0" />
            <span>
              Derived from this device&apos;s database — {snapshot.activity.totalReviews} review
              events and {snapshot.retention.inEngine} locked chapters. Most consistent on{' '}
              <span className="text-zinc-400">{bestWeekday}</span>; {snapshot.bookmarks.total} ward MCQ
              flags across {snapshot.bookmarks.flaggedChapters} chapters.
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
