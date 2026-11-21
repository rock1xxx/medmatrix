import { format, parseISO } from 'date-fns'
import type { DayOverride } from '../types'

export const DEFAULT_DAILY_PACE = 2

/**
 * Formats a Date or ISO timestamp / yyyy-MM-dd string into a local yyyy-MM-dd key.
 * Prevents UTC-vs-local midnight drift (e.g., 12:00 AM–5:30 AM IST getting logged on yesterday).
 */
export function toLocalDateKey(value: Date | string | undefined | null): string | null {
  if (!value) return null
  if (typeof value === 'string') {
    // Already a plain calendar date key
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value
    }
    const parsed = parseISO(value)
    if (Number.isNaN(parsed.getTime())) return null
    return format(parsed, 'yyyy-MM-dd')
  }
  if (Number.isNaN(value.getTime())) return null
  return format(value, 'yyyy-MM-dd')
}

/**
 * Returns true if a Date or ISO timestamp falls on the given local yyyy-MM-dd date key.
 */
export function isSameLocalDateKey(
  value: Date | string | undefined | null,
  targetDateKey: string
): boolean {
  const key = toLocalDateKey(value)
  return key !== null && key === targetDateKey
}

/**
 * Single source of truth for calculating a day's effective video pace from the
 * user's global daily pace and any shift/custom override for that date.
 */
export function resolveEffectiveDailyPace(
  dailyPaceTopics: number | undefined,
  override?: Pick<DayOverride, 'shiftType' | 'customPace'>
): number {
  const basePace =
    typeof dailyPaceTopics === 'number' && dailyPaceTopics > 0
      ? dailyPaceTopics
      : DEFAULT_DAILY_PACE

  if (typeof override?.customPace === 'number' && override.customPace > 0) {
    return override.customPace
  }
  if (override?.shiftType === 'HIGH') {
    return Math.max(1, basePace - 1)
  }
  if (override?.shiftType === 'LOW') {
    return basePace + 1
  }
  return basePace
}
