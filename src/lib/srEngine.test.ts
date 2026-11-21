import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_EBBINGHAUS_INTERVALS,
  advanceTopicSR,
  createInitialSRData,
  getLevelDescription,
  getTopicSRStatus,
} from './srEngine'
import type { Topic } from '../types'

function makeLockedTopic(nextReviewDate: string, level: 0 | 1 | 2 | 3 | 4 = 0): Topic {
  return {
    id: 'topic-1',
    subjectId: 'anat',
    title: 'Brachial Plexus',
    chapterNumber: 1,
    durationMinutes: 45,
    status: 'LOCKED_IN_SR',
    bookmarkCount: 0,
    highYield: true,
    updatedAt: '2026-05-01T10:00:00.000Z',
    srData: {
      level,
      lockedAt: '2026-05-01T10:00:00.000Z',
      nextReviewDate,
      reviewCount: level,
      history: [],
    },
  }
}

test('createInitialSRData schedules first review using default or custom first interval', () => {
  const lockDate = new Date(2026, 4, 1, 12, 0, 0) // 2026-05-01 local noon

  const defaultSR = createInitialSRData(lockDate)
  assert.equal(defaultSR.level, 0)
  assert.equal(defaultSR.nextReviewDate, '2026-05-02')
  assert.equal(defaultSR.reviewCount, 0)

  const customSR = createInitialSRData(lockDate, 3)
  assert.equal(customSR.level, 0)
  assert.equal(customSR.nextReviewDate, '2026-05-04')

  const clampedSR = createInitialSRData(lockDate, 0)
  assert.equal(clampedSR.nextReviewDate, '2026-05-02')
})

test('advanceTopicSR uses all 4 Ebbinghaus intervals [d0, d1, d2, d3] without off-by-one skip', () => {
  const customIntervals: [number, number, number, number] = [2, 7, 18, 35]
  const day0 = new Date(2026, 4, 1, 12, 0, 0) // 2026-05-01

  // Lock -> Level 0 waits d0 (+2d -> 2026-05-03)
  const sr0 = createInitialSRData(day0, customIntervals[0])
  assert.equal(sr0.level, 0)
  assert.equal(sr0.nextReviewDate, '2026-05-03')

  // Review 1: L0 -> L1 waits d1 (+7d -> 2026-05-10)
  const rev1Date = new Date(2026, 4, 3, 12, 0, 0)
  const sr1 = advanceTopicSR(sr0, rev1Date, customIntervals)
  assert.equal(sr1.level, 1)
  assert.equal(sr1.nextReviewDate, '2026-05-10')
  assert.equal(sr1.reviewCount, 1)

  // Review 2: L1 -> L2 waits d2 (+18d -> 2026-05-28)
  const rev2Date = new Date(2026, 4, 10, 12, 0, 0)
  const sr2 = advanceTopicSR(sr1, rev2Date, customIntervals)
  assert.equal(sr2.level, 2)
  assert.equal(sr2.nextReviewDate, '2026-05-28')
  assert.equal(sr2.reviewCount, 2)

  // Review 3: L2 -> L3 waits d3 (+35d -> 2026-07-02)
  const rev3Date = new Date(2026, 4, 28, 12, 0, 0)
  const sr3 = advanceTopicSR(sr2, rev3Date, customIntervals)
  assert.equal(sr3.level, 3)
  assert.equal(sr3.nextReviewDate, '2026-07-02')
  assert.equal(sr3.reviewCount, 3)

  // Review 4: L3 -> L4 Mastered (keeps review date, no future interval)
  const rev4Date = new Date(2026, 6, 2, 12, 0, 0)
  const sr4 = advanceTopicSR(sr3, rev4Date, customIntervals)
  assert.equal(sr4.level, 4)
  assert.equal(sr4.nextReviewDate, '2026-07-02')
  assert.equal(sr4.reviewCount, 4)
  assert.equal(sr4.history.length, 4)
  assert.deepEqual(
    sr4.history.map((h) => [h.levelBefore, h.levelAfter]),
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ]
  )
})

test('advanceTopicSR works with default [1, 5, 12, 25] intervals', () => {
  const start = new Date(2026, 4, 1, 12, 0, 0)
  const sr0 = createInitialSRData(start, DEFAULT_EBBINGHAUS_INTERVALS[0])
  assert.equal(sr0.nextReviewDate, '2026-05-02')

  const sr1 = advanceTopicSR(sr0, new Date(2026, 4, 2, 12, 0, 0))
  assert.equal(sr1.level, 1)
  assert.equal(sr1.nextReviewDate, '2026-05-07') // +5d

  const sr2 = advanceTopicSR(sr1, new Date(2026, 4, 7, 12, 0, 0))
  assert.equal(sr2.level, 2)
  assert.equal(sr2.nextReviewDate, '2026-05-19') // +12d

  const sr3 = advanceTopicSR(sr2, new Date(2026, 4, 19, 12, 0, 0))
  assert.equal(sr3.level, 3)
  assert.equal(sr3.nextReviewDate, '2026-06-13') // +25d
})

test('getTopicSRStatus classifies SCHEDULED, DUE_TODAY, OVERDUE, MASTERED, and non-SR topics', () => {
  const ref = new Date(2026, 4, 10, 15, 0, 0) // 2026-05-10

  assert.equal(getTopicSRStatus(makeLockedTopic('2026-05-12', 1), ref), 'SCHEDULED')
  assert.equal(getTopicSRStatus(makeLockedTopic('2026-05-10', 1), ref), 'DUE_TODAY')
  assert.equal(getTopicSRStatus(makeLockedTopic('2026-05-09', 1), ref), 'OVERDUE')
  assert.equal(getTopicSRStatus(makeLockedTopic('2026-05-01', 4), ref), 'MASTERED')

  const queuedTopic: Topic = {
    ...makeLockedTopic('2026-05-10', 0),
    status: 'QUEUED',
    srData: undefined,
  }
  assert.equal(getTopicSRStatus(queuedTopic, ref), null)
})

test('getLevelDescription formats dynamic custom intervals accurately', () => {
  const custom: [number, number, number, number] = [2, 7, 18, 35]
  assert.equal(getLevelDescription(0, custom), 'Level 0 (+2d interval)')
  assert.equal(getLevelDescription(1, custom), 'Level 1 (+7d interval)')
  assert.equal(getLevelDescription(2, custom), 'Level 2 (+18d interval)')
  assert.equal(getLevelDescription(3, custom), 'Level 3 (+35d interval)')
  assert.match(getLevelDescription(4, custom), /Mastered/)
})
