import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAnalytics } from './analytics'
import type { Subject, Topic } from '../types'

const subjects: Subject[] = [
  { id: 'anat', name: 'Anatomy', shortCode: 'ANA', color: '#38bdf8', category: 'PRE', totalLectures: 3 },
]

const topics: Topic[] = [
  {
    id: 'a1',
    subjectId: 'anat',
    title: 'Upper Limb',
    chapterNumber: 1,
    durationMinutes: 60,
    status: 'LOCKED_IN_SR',
    bookmarkCount: 1,
    highYield: true,
    updatedAt: '2026-05-01T10:00:00Z',
    srData: {
      level: 0,
      lockedAt: '2026-05-09T10:00:00Z',
      nextReviewDate: '2026-05-10', // DUE_TODAY
      reviewCount: 0,
      history: [],
    },
  },
  {
    id: 'a2',
    subjectId: 'anat',
    title: 'Thorax',
    chapterNumber: 2,
    durationMinutes: 60,
    status: 'LOCKED_IN_SR',
    bookmarkCount: 0,
    highYield: true,
    updatedAt: '2026-05-01T10:00:00Z',
    srData: {
      level: 4,
      lockedAt: '2026-04-01T10:00:00Z',
      nextReviewDate: '2026-05-01', // MASTERED
      reviewCount: 4,
      history: [{ reviewedAt: '2026-05-10T09:00:00Z', levelBefore: 3, levelAfter: 4 }],
    },
  },
  {
    id: 'a3',
    subjectId: 'anat',
    title: 'Abdomen',
    chapterNumber: 3,
    durationMinutes: 60,
    status: 'QUEUED',
    bookmarkCount: 0,
    highYield: false,
    updatedAt: '2026-05-01T10:00:00Z',
  },
]

test('buildAnalytics reflects custom ebbinghausIntervals on retention ladder and computes status totals', () => {
  const snapshot = buildAnalytics(topics, subjects, {
    today: new Date(2026, 4, 10, 12, 0, 0), // 2026-05-10
    plannedPace: 3,
    ebbinghausIntervals: [2, 7, 18, 35],
  })

  assert.deepEqual(
    snapshot.retention.levels.map((l) => [l.label, l.interval, l.count]),
    [
      ['L0', '+2d', 1],
      ['L1', '+7d', 0],
      ['L2', '+18d', 0],
      ['L3', '+35d', 0],
      ['L4', 'mastered', 1],
    ]
  )
  assert.equal(snapshot.retention.dueToday, 1)
  assert.equal(snapshot.retention.overdue, 0)
  assert.equal(snapshot.retention.mastered, 1)
  assert.equal(snapshot.pace.source, 'planned')
  assert.equal(snapshot.pace.perDay, 3)
  assert.equal(snapshot.pace.remainingChapters, 1)
})
