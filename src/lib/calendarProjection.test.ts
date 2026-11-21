import test from 'node:test'
import assert from 'node:assert/strict'
import { generateCalendarProjection } from './calendarProjection'
import type { Subject, Topic } from '../types'

const subjects: Subject[] = [
  { id: 's1', name: 'Microbiology', shortCode: 'MIC', color: '#10b981', category: 'PARA', totalLectures: 4 },
  { id: 's2', name: 'Pathology', shortCode: 'PAT', color: '#f59e0b', category: 'PARA', totalLectures: 2 },
]

function makeTopics(): Topic[] {
  return [
    { id: 't1', subjectId: 's1', title: 'Micro 1', chapterNumber: 1, durationMinutes: 30, status: 'QUEUED', bookmarkCount: 0, highYield: true, updatedAt: '2026-05-01T00:00:00Z' },
    { id: 't2', subjectId: 's1', title: 'Micro 2', chapterNumber: 2, durationMinutes: 30, status: 'QUEUED', bookmarkCount: 0, highYield: true, updatedAt: '2026-05-01T00:00:00Z' },
    { id: 't3', subjectId: 's1', title: 'Micro 3', chapterNumber: 3, durationMinutes: 30, status: 'QUEUED', bookmarkCount: 0, highYield: false, updatedAt: '2026-05-01T00:00:00Z' },
    { id: 't4', subjectId: 's1', title: 'Micro 4', chapterNumber: 4, durationMinutes: 30, status: 'QUEUED', bookmarkCount: 0, highYield: false, updatedAt: '2026-05-01T00:00:00Z' },
    { id: 't5', subjectId: 's2', title: 'Path 1', chapterNumber: 1, durationMinutes: 40, status: 'QUEUED', bookmarkCount: 0, highYield: true, updatedAt: '2026-05-01T00:00:00Z' },
    { id: 't6', subjectId: 's2', title: 'Path 2', chapterNumber: 2, durationMinutes: 40, status: 'QUEUED', bookmarkCount: 0, highYield: true, updatedAt: '2026-05-01T00:00:00Z' },
  ]
}

test('generateCalendarProjection respects HIGH/LOW shifts and marks SWT days', () => {
  const result = generateCalendarProjection({
    topics: makeTopics(),
    subjects,
    subjectOrder: ['s1', 's2'],
    activeSubjectId: 's1',
    dailyPaceTopics: 2,
    gtSchedule: [],
    swtCompletedSubjects: [],
    startDate: new Date(2026, 4, 1, 12, 0, 0), // 2026-05-01
    dayOverrides: {
      '2026-05-01': { date: '2026-05-01', shiftType: 'HIGH' }, // 2 - 1 = 1 lecture
      '2026-05-02': { date: '2026-05-02', shiftType: 'LOW' }, // 2 + 1 = 3 lectures -> finishes s1
    },
  })

  assert.equal(result.projectedDays.length, 3)
  assert.equal(result.projectedDays[0].date, '2026-05-01')
  assert.equal(result.projectedDays[0].topicsToWatch.length, 1)
  assert.equal(result.projectedDays[0].isSWTDay, false)

  assert.equal(result.projectedDays[1].date, '2026-05-02')
  assert.equal(result.projectedDays[1].topicsToWatch.length, 3)
  assert.equal(result.projectedDays[1].isSWTDay, true)
  assert.equal(result.projectedDays[1].swtSubjectId, 's1')

  assert.equal(result.projectedDays[2].date, '2026-05-03')
  assert.equal(result.projectedDays[2].subjectId, 's2')
  assert.equal(result.projectedDays[2].topicsToWatch.length, 2)
  assert.equal(result.projectedDays[2].isSWTDay, true)
  assert.equal(result.swtDates.length, 2)
})

test('generateCalendarProjection enforces gtStartThreshold before scheduling GT days', () => {
  const result = generateCalendarProjection({
    topics: makeTopics(),
    subjects,
    subjectOrder: ['s1', 's2'],
    activeSubjectId: 's1',
    dailyPaceTopics: 2,
    gtStartThreshold: 1,
    gtSchedule: [
      { id: 'gt-early', date: '2026-05-01', title: 'Early GT (blocked)', completed: false },
      { id: 'gt-valid', date: '2026-05-03', title: 'GT #1 (allowed)', completed: false },
    ],
    swtCompletedSubjects: [],
    startDate: new Date(2026, 4, 1, 12, 0, 0),
  })

  // 2026-05-01 (s1: 2 lec), 2026-05-02 (s1: 2 lec -> completes 1 subject),
  // 2026-05-03 (GT allowed since completedSubjectCount === 1), 2026-05-04 (s2: 2 lec)
  assert.deepEqual(result.gtDates, ['2026-05-03'])
  assert.equal(result.projectedDays[2].isGTDay, true)
  assert.equal(result.projectedDays[2].topicsToWatch.length, 0)
  assert.equal(result.projectedDays[3].date, '2026-05-04')
  assert.equal(result.projectedDays[3].subjectId, 's2')
})
