import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns'
import { Subject, Topic, TopicStatus } from '../types'
import { getTopicSRStatus } from './srEngine'

/**
 * Everything the Stats tab shows, derived from the study database that already
 * exists — no new persisted fields, no schema change, nothing that has to be
 * carried through sync or backup.
 *
 * The page answers five questions, in this order:
 *   1. Am I on track?        → coverage, pace, projected finish
 *   2. What needs me now?    → due / overdue / high-yield gaps
 *   3. Is retention working?  → Ebbinghaus ladder, mastered count
 *   4. Am I consistent?       → review heatmap, streak, weekly cadence
 *   5. Where am I weakest?    → per-subject coverage and due load
 */

export const HEATMAP_WEEKS = 26
export const REVIEW_FORECAST_DAYS = 14
export const PACE_WINDOW_DAYS = 28

export interface StatusMeta {
  key: TopicStatus
  label: string
  short: string
  color: string
  /** Softer tint for track backgrounds and dots. */
  tint: string
  hint: string
}

/** Pipeline order, earliest first. Colours are tuned for the app's charcoal. */
export const PIPELINE: StatusMeta[] = [
  {
    key: 'QUEUED',
    label: 'Backlog',
    short: 'Backlog',
    color: '#52525b',
    tint: 'rgba(82,82,91,0.18)',
    hint: 'Not opened yet',
  },
  {
    key: 'STEP_1_WATCHING',
    label: 'Tonight videos',
    short: 'Watching',
    color: '#38bdf8',
    tint: 'rgba(56,189,248,0.16)',
    hint: 'Watching at the hostel',
  },
  {
    key: 'STEP_2_WARD_MCQ',
    label: 'Ward MCQs',
    short: 'Ward MCQ',
    color: '#fbbf24',
    tint: 'rgba(251,191,36,0.16)',
    hint: 'Solving on shift',
  },
  {
    key: 'STEP_3_ANNOTATING',
    label: 'Annotations',
    short: 'Annotating',
    color: '#a78bfa',
    tint: 'rgba(167,139,250,0.16)',
    hint: 'Notes + revision pull',
  },
  {
    key: 'LOCKED_IN_SR',
    label: 'Locked in SR',
    short: 'In SR',
    color: '#34d399',
    tint: 'rgba(52,211,153,0.16)',
    hint: 'In the Ebbinghaus engine',
  },
]

export const SR_RUNGS = [
  { level: 0, label: 'L0', interval: '+1d', color: '#38bdf8' },
  { level: 1, label: 'L1', interval: '+5d', color: '#818cf8' },
  { level: 2, label: 'L2', interval: '+12d', color: '#c084fc' },
  { level: 3, label: 'L3', interval: '+25d', color: '#fbbf24' },
  { level: 4, label: 'L4', interval: 'mastered', color: '#34d399' },
] as const

export interface DayActivity {
  /** yyyy-MM-dd in local time. */
  date: string
  reviews: number
  /** Chapters that entered the SR engine on this day. */
  locks: number
}

export interface HeatCell extends DayActivity {
  /** 0 keeps the cell empty (before the window or in the future). */
  intensity: 0 | 1 | 2 | 3 | 4
  weekday: number
  future: boolean
}

export interface HeatWeek {
  /** Monday of the week. */
  start: string
  monthLabel: string | null
  cells: HeatCell[]
}

export interface SubjectRow {
  id: string
  name: string
  shortCode: string
  color: string
  category: Subject['category']
  total: number
  locked: number
  due: number
  overdue: number
  highYieldTotal: number
  highYieldLocked: number
  hoursTotal: number
  hoursLocked: number
  coverage: number
  /** yyyy-MM-dd of the last status change or review, or null when untouched. */
  lastTouched: string | null
  daysSinceTouched: number | null
}

export interface AnalyticsSnapshot {
  totals: {
    chapters: number
    subjects: number
    hoursTotal: number
    hoursLocked: number
    hoursRemaining: number
  }
  coverage: number
  pipeline: Array<StatusMeta & { count: number; share: number }>
  counts: Record<TopicStatus, number>
  retention: {
    inEngine: number
    mastered: number
    onFinalRung: number
    dueToday: number
    overdue: number
    scheduled: number
    levels: Array<{ level: number; label: string; interval: string; color: string; count: number }>
    averageLevel: number
    /** Share of the engine that is at L3/L4 — a proxy for durable recall. */
    durability: number
  }
  activity: {
    reviewsByDay: Map<string, number>
    locksByDay: Map<string, number>
    totalReviews: number
    last14Reviews: number
    prev14Reviews: number
    reviewDelta: number
    thisWeekReviews: number
    lastWeekReviews: number
    activeDays: number
    streak: number
    bestStreak: number
    weeks: HeatWeek[]
    monthLabels: Array<{ index: number; label: string }>
    peakDay: DayActivity | null
  }
  forecast: Array<{ date: string; label: string; weekday: string; due: number; isToday: boolean }>
  pace: {
    /** Chapters locked per day, averaged over the observed window. */
    perDay: number
    windowDays: number
    source: 'observed' | 'planned'
    remainingChapters: number
    daysToFinish: number | null
    finishDate: string | null
  }
  subjects: SubjectRow[]
  highYield: { total: number; covered: number; share: number; missing: number }
  bookmarks: { total: number; flaggedChapters: number }
}

function dateKey(value: Date | string): string {
  const date = typeof value === 'string' ? parseISO(value) : value
  return format(date, 'yyyy-MM-dd')
}

function safeParse(value: string | undefined | null): Date | null {
  if (!value) return null
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Consecutive days with at least one review, counting back from today. A day with
 * no reviews yet does not break the streak — it only breaks once yesterday is also
 * empty, so the number does not collapse every midnight before the evening session.
 */
function computeStreak(reviewsByDay: Map<string, number>, today: Date): { current: number; best: number } {
  let current = 0
  let cursor = startOfDay(today)
  if (!reviewsByDay.get(dateKey(cursor))) {
    cursor = addDays(cursor, -1)
  }
  while (reviewsByDay.get(dateKey(cursor))) {
    current++
    cursor = addDays(cursor, -1)
  }

  const days = [...reviewsByDay.keys()].filter((k) => (reviewsByDay.get(k) ?? 0) > 0).sort()
  let best = 0
  let run = 0
  let previous: string | null = null
  for (const day of days) {
    if (previous && differenceInCalendarDays(parseISO(day), parseISO(previous)) === 1) {
      run++
    } else {
      run = 1
    }
    best = Math.max(best, run)
    previous = day
  }

  return { current, best: Math.max(best, current) }
}

function buildHeatmap(
  reviewsByDay: Map<string, number>,
  locksByDay: Map<string, number>,
  today: Date
): { weeks: HeatWeek[]; monthLabels: Array<{ index: number; label: string }>; peakDay: DayActivity | null } {
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 })
  const firstWeekStart = addDays(thisWeekStart, -7 * (HEATMAP_WEEKS - 1))
  const todayKey = dateKey(today)

  // Quantile-ish thresholds so a quiet week still shows contrast.
  const values = [...reviewsByDay.values()].sort((a, b) => a - b)
  const q = (p: number) => values[Math.min(values.length - 1, Math.floor(values.length * p))] ?? 0
  const t1 = Math.max(1, q(0.4))
  const t2 = Math.max(t1 + 1, q(0.7))
  const t3 = Math.max(t2 + 1, q(0.9))

  const intensityOf = (count: number): 0 | 1 | 2 | 3 | 4 => {
    if (count <= 0) return 0
    if (count <= t1) return 1
    if (count <= t2) return 2
    if (count <= t3) return 3
    return 4
  }

  const weeks: HeatWeek[] = []
  const monthLabels: Array<{ index: number; label: string }> = []
  let peak: DayActivity | null = null

  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    const weekStart = addDays(firstWeekStart, w * 7)
    const cells: HeatCell[] = []

    for (let d = 0; d < 7; d++) {
      const day = addDays(weekStart, d)
      const key = dateKey(day)
      const reviews = reviewsByDay.get(key) ?? 0
      const locks = locksByDay.get(key) ?? 0
      const future = key > todayKey

      if (!future && reviews > (peak?.reviews ?? 0)) {
        peak = { date: key, reviews, locks }
      }

      cells.push({
        date: key,
        reviews,
        locks,
        intensity: future ? 0 : intensityOf(reviews),
        weekday: d,
        future,
      })
    }

    // Label a column when the week contains the 1st..7th of a month.
    const first = cells[0]
    const label = first && !first.future && parseISO(first.date).getDate() <= 7
      ? format(parseISO(first.date), 'MMM')
      : null
    if (label) monthLabels.push({ index: w, label })

    weeks.push({ start: dateKey(weekStart), monthLabel: label, cells })
  }

  return { weeks, monthLabels, peakDay: peak }
}

export function buildAnalytics(
  topics: Topic[],
  subjects: Subject[],
  options: { today?: Date; plannedPace?: number } = {}
): AnalyticsSnapshot {
  const today = startOfDay(options.today ?? new Date())
  const todayKey = dateKey(today)

  const counts: Record<TopicStatus, number> = {
    QUEUED: 0,
    STEP_1_WATCHING: 0,
    STEP_2_WARD_MCQ: 0,
    STEP_3_ANNOTATING: 0,
    LOCKED_IN_SR: 0,
  }

  const reviewsByDay = new Map<string, number>()
  const locksByDay = new Map<string, number>()
  const srInEngine: Topic[] = []
  const levelCounts = [0, 0, 0, 0, 0]
  let dueToday = 0
  let overdue = 0
  let scheduled = 0
  let mastered = 0
  let totalReviews = 0
  let flags = 0
  let flaggedChapters = 0
  let hoursTotal = 0
  let hoursLocked = 0
  let highYieldTotal = 0
  let highYieldCovered = 0

  for (const topic of topics) {
    counts[topic.status] = (counts[topic.status] ?? 0) + 1
    const hours = (topic.durationMinutes || 0) / 60
    hoursTotal += hours

    if (topic.highYield) highYieldTotal++
    if (topic.bookmarkCount > 0) {
      flags += topic.bookmarkCount
      flaggedChapters++
    }

    if (topic.status === 'LOCKED_IN_SR' && topic.srData) {
      const sr = topic.srData
      hoursLocked += hours
      srInEngine.push(topic)
      if (topic.highYield) highYieldCovered++

      const level = Math.max(0, Math.min(4, sr.level))
      levelCounts[level]++

      if (level >= 4) mastered++

      const status = getTopicSRStatus(topic, today)
      if (status === 'DUE_TODAY') dueToday++
      else if (status === 'OVERDUE') overdue++
      else if (status === 'SCHEDULED') scheduled++

      const locked = safeParse(sr.lockedAt)
      if (locked) {
        const key = dateKey(locked)
        if (key <= todayKey) locksByDay.set(key, (locksByDay.get(key) ?? 0) + 1)
      }

      for (const entry of sr.history ?? []) {
        const reviewed = safeParse(entry.reviewedAt)
        if (!reviewed) continue
        const key = dateKey(reviewed)
        if (key > todayKey) continue
        reviewsByDay.set(key, (reviewsByDay.get(key) ?? 0) + 1)
        totalReviews++
      }
    }
  }

  // ---- activity windows -----------------------------------------------------
  const sumWindow = (days: Map<string, number>, endOffset: number, length: number) => {
    let total = 0
    for (let i = endOffset; i < endOffset + length; i++) {
      total += days.get(dateKey(addDays(today, -i))) ?? 0
    }
    return total
  }

  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 })
  const thisWeekReviews = sumWindow(reviewsByDay, 0, differenceInCalendarDays(today, thisWeekStart) + 1)
  const lastWeekReviews = sumWindow(reviewsByDay, differenceInCalendarDays(today, thisWeekStart) + 1, 7)
  const last14Reviews = sumWindow(reviewsByDay, 0, 14)
  const prev14Reviews = sumWindow(reviewsByDay, 14, 14)
  const streak = computeStreak(reviewsByDay, today)
  const heatmap = buildHeatmap(reviewsByDay, locksByDay, today)

  const activeDays = [...reviewsByDay.values()].filter((n) => n > 0).length

  // ---- review forecast ------------------------------------------------------
  const forecast = Array.from({ length: REVIEW_FORECAST_DAYS }, (_, offset) => {
    const day = addDays(today, offset)
    const key = dateKey(day)
    const due = srInEngine.filter((t) => {
      if (!t.srData || t.srData.level >= 4) return false
      return t.srData.nextReviewDate === key
    }).length
    return {
      date: key,
      label: offset === 0 ? 'Today' : format(day, 'd MMM'),
      weekday: format(day, 'EEEEE'),
      due,
      isToday: offset === 0,
    }
  })

  // ---- pace + projection ----------------------------------------------------
  // Locking a chapter into the SR engine is the completion event, and lockedAt is
  // the only honest timestamp for it, so pace is measured from those.
  const observedWindow = PACE_WINDOW_DAYS
  let observedLocks = 0
  for (let i = 0; i < observedWindow; i++) {
    observedLocks += locksByDay.get(dateKey(addDays(today, -i))) ?? 0
  }
  const observedPace = observedLocks / observedWindow
  const plannedPace = Math.max(0.1, options.plannedPace ?? 2)
  // A handful of locks is noise; fall back to the pace the user set for the plan.
  const pacePerDay = observedLocks >= 6 ? observedPace : plannedPace
  const paceSource: 'observed' | 'planned' = observedLocks >= 6 ? 'observed' : 'planned'
  const remainingChapters = topics.filter((t) => t.status !== 'LOCKED_IN_SR').length
  const daysToFinish = pacePerDay > 0 ? Math.ceil(remainingChapters / pacePerDay) : null
  const finishDate = daysToFinish === null ? null : dateKey(addDays(today, daysToFinish))

  // ---- per-subject ----------------------------------------------------------
  const subjectRows: SubjectRow[] = subjects.map((subject) => {
    const list = topics.filter((t) => t.subjectId === subject.id)
    let locked = 0
    let due = 0
    let overdueCount = 0
    let hyTotal = 0
    let hyLocked = 0
    let hours = 0
    let lockedHours = 0
    let lastTouched: string | null = null

    for (const topic of list) {
      hours += (topic.durationMinutes || 0) / 60
      if (topic.highYield) hyTotal++
      const candidates = [safeParse(topic.updatedAt), safeParse(topic.srData?.lastReviewedAt)]
      for (const candidate of candidates) {
        if (!candidate) continue
        const key = dateKey(candidate)
        if (key <= todayKey && (!lastTouched || key > lastTouched)) lastTouched = key
      }

      if (topic.status === 'LOCKED_IN_SR' && topic.srData) {
        locked++
        lockedHours += (topic.durationMinutes || 0) / 60
        if (topic.highYield) hyLocked++
        const status = getTopicSRStatus(topic, today)
        if (status === 'DUE_TODAY') due++
        if (status === 'OVERDUE') {
          due++
          overdueCount++
        }
      }
    }

    return {
      id: subject.id,
      name: subject.name,
      shortCode: subject.shortCode,
      color: subject.color,
      category: subject.category,
      total: list.length,
      locked,
      due,
      overdue: overdueCount,
      highYieldTotal: hyTotal,
      highYieldLocked: hyLocked,
      hoursTotal: hours,
      hoursLocked: lockedHours,
      coverage: list.length ? locked / list.length : 0,
      lastTouched,
      daysSinceTouched: lastTouched ? differenceInCalendarDays(today, parseISO(lastTouched)) : null,
    }
  })

  const chapters = topics.length
  const inEngine = srInEngine.length
  const coverage = chapters ? inEngine / chapters : 0
  const averageLevel = inEngine
    ? srInEngine.reduce((acc, t) => acc + Math.min(4, t.srData?.level ?? 0), 0) / inEngine
    : 0
  const durability = inEngine ? (levelCounts[3] + levelCounts[4]) / inEngine : 0

  return {
    totals: {
      chapters,
      subjects: subjects.length,
      hoursTotal,
      hoursLocked,
      hoursRemaining: Math.max(0, hoursTotal - hoursLocked),
    },
    coverage,
    pipeline: PIPELINE.map((meta) => ({
      ...meta,
      count: counts[meta.key] ?? 0,
      share: chapters ? (counts[meta.key] ?? 0) / chapters : 0,
    })),
    counts,
    retention: {
      inEngine,
      mastered,
      onFinalRung: levelCounts[3] + levelCounts[4],
      dueToday,
      overdue,
      scheduled,
      levels: SR_RUNGS.map((rung) => ({
        level: rung.level,
        label: rung.label,
        interval: rung.interval,
        color: rung.color,
        count: levelCounts[rung.level] ?? 0,
      })),
      averageLevel,
      durability,
    },
    activity: {
      reviewsByDay,
      locksByDay,
      totalReviews,
      last14Reviews,
      prev14Reviews,
      reviewDelta: last14Reviews - prev14Reviews,
      thisWeekReviews,
      lastWeekReviews,
      activeDays,
      streak: streak.current,
      bestStreak: streak.best,
      weeks: heatmap.weeks,
      monthLabels: heatmap.monthLabels,
      peakDay: heatmap.peakDay,
    },
    forecast,
    pace: {
      perDay: pacePerDay,
      windowDays: observedWindow,
      source: paceSource,
      remainingChapters,
      daysToFinish,
      finishDate,
    },
    subjects: subjectRows,
    highYield: {
      total: highYieldTotal,
      covered: highYieldCovered,
      missing: Math.max(0, highYieldTotal - highYieldCovered),
      share: highYieldTotal ? highYieldCovered / highYieldTotal : 0,
    },
    bookmarks: { total: flags, flaggedChapters },
  }
}

/** Reviews per weekday, used by the cadence strip. */
export function weekdayCadence(reviewsByDay: Map<string, number>, today: Date): number[] {
  const totals = [0, 0, 0, 0, 0, 0, 0] // Mon..Sun
  for (let i = 0; i < 56; i++) {
    const day = addDays(today, -i)
    const index = (day.getDay() + 6) % 7
    totals[index] += reviewsByDay.get(dateKey(day)) ?? 0
  }
  return totals
}
