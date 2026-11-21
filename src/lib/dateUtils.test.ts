import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_DAILY_PACE,
  isSameLocalDateKey,
  resolveEffectiveDailyPace,
  toLocalDateKey,
} from './dateUtils'

test('toLocalDateKey preserves plain calendar keys and formats local Dates without UTC drift', () => {
  assert.equal(toLocalDateKey('2026-05-15'), '2026-05-15')
  assert.equal(toLocalDateKey(null), null)
  assert.equal(toLocalDateKey(undefined), null)
  assert.equal(toLocalDateKey('not-a-date'), null)

  // Construct local 00:30 AM and serialize to ISO; toLocalDateKey must return the local calendar day
  const earlyLocal = new Date(2026, 4, 15, 0, 30, 0)
  assert.equal(toLocalDateKey(earlyLocal), '2026-05-15')
  assert.equal(toLocalDateKey(earlyLocal.toISOString()), '2026-05-15')
  assert.equal(isSameLocalDateKey(earlyLocal.toISOString(), '2026-05-15'), true)
  assert.equal(isSameLocalDateKey(earlyLocal.toISOString(), '2026-05-14'), false)
})

test('resolveEffectiveDailyPace applies shift deltas, floor at 1, customPace, and default fallback', () => {
  // Default fallback when pace is undefined or invalid
  assert.equal(resolveEffectiveDailyPace(undefined), DEFAULT_DAILY_PACE)
  assert.equal(resolveEffectiveDailyPace(0), DEFAULT_DAILY_PACE)

  // Shift multipliers around base pace 3
  assert.equal(resolveEffectiveDailyPace(3, { shiftType: 'MEDIUM' }), 3)
  assert.equal(resolveEffectiveDailyPace(3, { shiftType: 'HIGH' }), 2)
  assert.equal(resolveEffectiveDailyPace(3, { shiftType: 'LOW' }), 4)

  // HIGH shift never drops below 1 video/day
  assert.equal(resolveEffectiveDailyPace(1, { shiftType: 'HIGH' }), 1)

  // Explicit customPace overrides shiftType
  assert.equal(resolveEffectiveDailyPace(3, { shiftType: 'HIGH', customPace: 5 }), 5)
})
