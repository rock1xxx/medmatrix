import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns'
import { Topic } from '../types'

/**
 * How old the ward-MCQ backlog is.
 *
 * A chapter enters the MCQ stage when its video is done, so the gap between that
 * moment and today is exactly the "watched it, still haven't consolidated it" debt.
 * Anything sitting here for weeks means the video has started to fade and the MCQ
 * pass is about to turn into a re-watch.
 *
 * The reference date is the `watchedAt` stamp written by the store. Chapters that
 * reached this stage before the stamp existed fall back to `updatedAt`, which for a
 * chapter that has not been touched since is the same moment.
 */
export function watchedDaysAgo(topic: Topic, today: Date = new Date()): number | null {
  const raw = topic.watchedAt ?? topic.updatedAt
  if (!raw) return null
  const parsed = parseISO(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return Math.max(0, differenceInCalendarDays(startOfDay(today), startOfDay(parsed)))
}

export type AgeTone = 'quiet' | 'warm' | 'hot'

/** Only past a week is it worth mentioning at all; a fresh backlog is normal. */
export const AGE_VISIBLE_FROM_DAYS = 7
export const AGE_WARM_FROM_DAYS = 21
export const AGE_HOT_FROM_DAYS = 35

export function ageTone(days: number): AgeTone {
  if (days >= AGE_HOT_FROM_DAYS) return 'hot'
  if (days >= AGE_WARM_FROM_DAYS) return 'warm'
  return 'quiet'
}

const TONE_CLASS: Record<AgeTone, string> = {
  quiet: 'border-[#2a2a32] bg-[#17171c] text-zinc-400',
  warm: 'border-amber-800/40 bg-amber-950/30 text-amber-300',
  hot: 'border-rose-800/40 bg-rose-950/30 text-rose-300',
}

export function ageClass(days: number): string {
  return TONE_CLASS[ageTone(days)]
}

/** "watched 32d ago" */
export function ageLabel(days: number): string {
  return days >= 1 ? `watched ${days}d ago` : 'watched today'
}
