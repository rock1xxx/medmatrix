import { addDays, format, isAfter, isBefore, isToday, parseISO, startOfDay } from 'date-fns'
import { SRData, SRLevel, SRStatus, Topic } from '../types'

/**
 * Custom Ebbinghaus spaced repetition intervals (days to add after completing level)
 * Level 0 -> 1 day
 * Level 1 -> 5 days
 * Level 2 -> 12 days
 * Level 3 -> 25 days
 * Level 4 -> Mastered
 */
export const DEFAULT_EBBINGHAUS_INTERVALS: [number, number, number, number] = [1, 5, 12, 25]
export const DEFAULT_POSTPONE_DAYS = 3

export const SR_INTERVALS: Record<SRLevel, number | null> = {
  0: 1,
  1: 5,
  2: 12,
  3: 25,
  4: null, // Mastered
}

/**
 * Initializes a topic into the Spaced Repetition engine at Level 0
 * Scheduled for LockDate + 1 day (or custom interval)
 */
export function createInitialSRData(
  lockDate: Date = new Date(),
  firstIntervalDays: number = 1
): SRData {
  const lockedAtStr = lockDate.toISOString()
  const nextDate = addDays(lockDate, firstIntervalDays)
  const nextReviewDateStr = format(nextDate, 'yyyy-MM-dd')

  return {
    level: 0,
    lockedAt: lockedAtStr,
    nextReviewDate: nextReviewDateStr,
    reviewCount: 0,
    history: [],
  }
}

/**
 * Advances a topic to the next Spaced Repetition level
 */
export function advanceTopicSR(
  currentSR: SRData,
  reviewDate: Date = new Date(),
  customIntervals: [number, number, number, number] = DEFAULT_EBBINGHAUS_INTERVALS
): SRData {
  const currentLevel = currentSR.level
  const nextLevel = Math.min(4, currentLevel + 1) as SRLevel
  const reviewDateStr = reviewDate.toISOString()
  
  let nextReviewDateStr = currentSR.nextReviewDate

  // Intervals map: Level 0 -> Level 1 uses customIntervals[0], Level 1 -> 2 uses [1], etc.
  let intervalDays: number | null = null
  if (nextLevel >= 1 && nextLevel <= 3) {
    intervalDays = customIntervals[nextLevel - 1] ?? 5
  } else if (nextLevel === 4) {
    intervalDays = null // Mastered
  }

  if (intervalDays !== null) {
    const nextDate = addDays(reviewDate, intervalDays)
    nextReviewDateStr = format(nextDate, 'yyyy-MM-dd')
  } else {
    // Mastered: keep last review date
    nextReviewDateStr = format(reviewDate, 'yyyy-MM-dd')
  }

  return {
    level: nextLevel,
    lockedAt: currentSR.lockedAt,
    lastReviewedAt: reviewDateStr,
    nextReviewDate: nextReviewDateStr,
    reviewCount: currentSR.reviewCount + 1,
    history: [
      ...currentSR.history,
      {
        reviewedAt: reviewDateStr,
        levelBefore: currentLevel,
        levelAfter: nextLevel,
      },
    ],
  }
}

/**
 * Dynamic evaluation of SR status relative to current date using date-fns
 */
export function getTopicSRStatus(topic: Topic, referenceDate: Date = new Date()): SRStatus | null {
  if (topic.status !== 'LOCKED_IN_SR' || !topic.srData) {
    return null
  }

  if (topic.srData.level >= 4) {
    return 'MASTERED'
  }

  const reviewDate = parseISO(topic.srData.nextReviewDate)
  const today = startOfDay(referenceDate)
  const targetDay = startOfDay(reviewDate)

  if (isToday(targetDay)) {
    return 'DUE_TODAY'
  }

  if (isBefore(targetDay, today)) {
    return 'OVERDUE'
  }

  if (isAfter(targetDay, today)) {
    return 'SCHEDULED'
  }

  return 'DUE_TODAY'
}

/**
 * Formats a friendly label and badge styling for SR status
 */
export function getSRStatusMetadata(status: SRStatus | null) {
  switch (status) {
    case 'DUE_TODAY':
      return {
        label: '🔥 DUE TODAY',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        dotColor: 'bg-amber-400',
        glow: true,
      }
    case 'OVERDUE':
      return {
        label: '🔴 OVERDUE',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        dotColor: 'bg-rose-500',
        glow: true,
      }
    case 'SCHEDULED':
      return {
        label: '🟢 SCHEDULED',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        dotColor: 'bg-emerald-400',
        glow: false,
      }
    case 'MASTERED':
      return {
        label: '⭐ MASTERED',
        badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
        dotColor: 'bg-yellow-400',
        glow: false,
      }
    default:
      return null
  }
}

/**
 * Gets human description of current SR level interval
 */
export function getLevelDescription(level: SRLevel): string {
  switch (level) {
    case 0:
      return 'Level 0 (+1d interval)'
    case 1:
      return 'Level 1 (+5d interval)'
    case 2:
      return 'Level 2 (+12d interval)'
    case 3:
      return 'Level 3 (+25d interval)'
    case 4:
      return 'Level 4 (Mastered ⭐)'
  }
}
