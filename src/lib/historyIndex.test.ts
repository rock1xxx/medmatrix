import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDaywiseHistory } from './historyIndex'
import type { ActivityLogItem, CustomModule, Subject, Topic } from '../types'

const subjects: Subject[] = [
  {
    id: 'micro',
    name: 'Microbiology',
    shortCode: 'MIC',
    category: 'Para-Clinical',
    order: 1,
    iconName: 'Bug',
    color: '#10b981',
    targetHours: 20,
  },
]

test('buildDaywiseHistory indexes watched videos, solved modules, revisions, and notes in O(N) and deduplicates', () => {
  const today = new Date(2026, 4, 15, 14, 0, 0) // 2026-05-15 local
  const todayIso = new Date(2026, 4, 15, 9, 0, 0).toISOString()
  const yesterdayIso = new Date(2026, 4, 14, 21, 0, 0).toISOString()

  const topics: Topic[] = [
    {
      id: 't1',
      subjectId: 'micro',
      title: 'General Microbiology',
      chapterNumber: 1,
      durationMinutes: 40,
      highYield: true,
      highYieldTags: [],
      status: 'LOCKED_IN_SR',
      bookmarkCount: 0,
      watchedAt: todayIso,
      updatedAt: todayIso,
      srData: {
        level: 1,
        lockedAt: yesterdayIso,
        nextReviewDate: '2026-05-20',
        reviewCount: 1,
        history: [{ reviewedAt: todayIso, levelBefore: 0, levelAfter: 1 }],
      },
    },
  ]

  const customModules: CustomModule[] = [
    {
      id: 'cm1',
      subjectId: 'micro',
      topicTitle: 'Bacteriology PYQs',
      selectedTopics: ['Bacteriology'],
      code: 'ABC123',
      tags: ['Only PYQ'],
      solveStatus: 'done',
      annotationStatus: 'not_annotated',
      notes: '',
      createdAt: todayIso,
      solvedAt: todayIso,
    },
  ]

  const activityLog: ActivityLogItem[] = [
    // Duplicate of t1 watched today — should deduplicate
    {
      id: 'a1',
      timestamp: todayIso,
      dateStr: '2026-05-15',
      type: 'VIDEO_WATCHED',
      title: 'General Microbiology',
      subjectId: 'micro',
      subjectName: 'Microbiology',
    },
    // Unique activity log entry
    {
      id: 'a2',
      timestamp: yesterdayIso,
      dateStr: '2026-05-14',
      type: 'MODULE_SOLVED',
      title: 'Virology PYQs',
      code: 'XYZ999',
      metadata: { annotationStatus: 'annotated' },
    },
  ]

  const result = buildDaywiseHistory({
    topics,
    customModules,
    subjects,
    dayOverrides: { '2026-05-15': { customNote: 'Heavy OPD shift' } },
    activityLog,
    historyPeriod: 'last14',
    today,
  })

  assert.equal(result.length, 14)
  assert.equal(result[0].dateStr, '2026-05-15')
  assert.equal(result[0].isToday, true)
  assert.equal(result[0].videos.length, 1) // Deduplicated
  assert.equal(result[0].videos[0].subject, 'Microbiology')
  assert.equal(result[0].modules.length, 1)
  assert.equal(result[0].modules[0].code, 'ABC123')
  assert.equal(result[0].revisions.length, 1)
  assert.equal(result[0].note, 'Heavy OPD shift')

  assert.equal(result[1].dateStr, '2026-05-14')
  assert.equal(result[1].isYesterday, true)
  assert.equal(result[1].revisions.length, 1) // lockedAt yesterday
  assert.equal(result[1].modules.length, 1) // from activityLog
  assert.equal(result[1].modules[0].code, 'XYZ999')
})

test('buildDaywiseHistory filters cleanly by yyyy-MM period', () => {
  const today = new Date(2026, 4, 15, 12, 0, 0) // May 2026
  const result = buildDaywiseHistory({
    topics: [],
    customModules: [],
    subjects,
    dayOverrides: {},
    activityLog: [],
    historyPeriod: '2026-04',
    today,
  })

  assert.equal(result.length, 30)
  assert.ok(result.every((d) => d.dateStr.startsWith('2026-04')))
})
