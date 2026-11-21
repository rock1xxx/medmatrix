import { format, subDays } from 'date-fns'
import type { ActivityLogItem, CustomModule, DayOverride, Subject, Topic } from '../types'
import { toLocalDateKey } from './dateUtils'

export interface HistoryVideoEntry {
  subject: string
  title: string
  status: string
}

export interface HistoryModuleEntry {
  code: string
  title: string
  notAnnotated: boolean
}

export interface HistoryRevisionEntry {
  title: string
}

export interface DaywiseHistoryItem {
  id: string
  dateStr: string
  dateLabel: string
  relativeLabel: string
  isToday: boolean
  isYesterday: boolean
  videos: HistoryVideoEntry[]
  modules: HistoryModuleEntry[]
  revisions: HistoryRevisionEntry[]
  note: string
}

interface BuildDaywiseHistoryParams {
  topics: Topic[]
  customModules: CustomModule[]
  subjects: Subject[]
  dayOverrides: Record<string, DayOverride>
  activityLog: ActivityLogItem[]
  historyPeriod: string // 'last14' | 'all' | 'yyyy-MM'
  today?: Date
}

/**
 * Pre-indexes topics, custom modules, and activity log entries by local yyyy-MM-dd
 * key in a single O(N) pass so scanning 180–365 days is instantaneous instead of
 * running nested O(days * topics) filters on every render.
 */
export function buildDaywiseHistory({
  topics,
  customModules,
  subjects,
  dayOverrides,
  activityLog,
  historyPeriod,
  today = new Date(),
}: BuildDaywiseHistoryParams): DaywiseHistoryItem[] {
  const subjectNameById = new Map<string, string>()
  for (const s of subjects) {
    subjectNameById.set(s.id, s.name)
  }

  const videosByDay = new Map<string, Map<string, HistoryVideoEntry>>()
  const modulesByDay = new Map<string, Map<string, HistoryModuleEntry>>()
  const revisionsByDay = new Map<string, Map<string, HistoryRevisionEntry>>()

  const addVideo = (dateStr: string | null, entry: HistoryVideoEntry) => {
    if (!dateStr) return
    let bucket = videosByDay.get(dateStr)
    if (!bucket) {
      bucket = new Map()
      videosByDay.set(dateStr, bucket)
    }
    if (!bucket.has(entry.title)) {
      bucket.set(entry.title, entry)
    }
  }

  const addModule = (dateStr: string | null, entry: HistoryModuleEntry) => {
    if (!dateStr) return
    let bucket = modulesByDay.get(dateStr)
    if (!bucket) {
      bucket = new Map()
      modulesByDay.set(dateStr, bucket)
    }
    const key = entry.code + entry.title
    if (!bucket.has(key)) {
      bucket.set(key, entry)
    }
  }

  const addRevision = (dateStr: string | null, entry: HistoryRevisionEntry) => {
    if (!dateStr) return
    let bucket = revisionsByDay.get(dateStr)
    if (!bucket) {
      bucket = new Map()
      revisionsByDay.set(dateStr, bucket)
    }
    if (!bucket.has(entry.title)) {
      bucket.set(entry.title, entry)
    }
  }

  // 1. Index topics once
  for (const t of topics) {
    const subName = subjectNameById.get(t.subjectId) || t.subjectId
    if (t.watchedAt) {
      addVideo(toLocalDateKey(t.watchedAt), {
        subject: subName,
        title: t.title,
        status: 'Watched → Ward MCQ',
      })
    }
    if (t.srData?.lockedAt) {
      addRevision(toLocalDateKey(t.srData.lockedAt), { title: t.title })
    }
    if (t.srData?.history) {
      for (const h of t.srData.history) {
        addRevision(toLocalDateKey(h.reviewedAt), { title: t.title })
      }
    }
  }

  // 2. Index custom modules once
  for (const m of customModules || []) {
    const entry: HistoryModuleEntry = {
      code: m.code || 'DONE',
      title: m.topicTitle,
      notAnnotated: m.annotationStatus === 'not_annotated',
    }
    if (m.solvedAt) {
      addModule(toLocalDateKey(m.solvedAt), entry)
    }
    if (m.solveStatus === 'done' && m.createdAt) {
      addModule(toLocalDateKey(m.createdAt), entry)
    }
  }

  // 3. Index activity log once (backfills anything not present on live topic/module state)
  for (const a of activityLog || []) {
    const dateStr = a.dateStr || toLocalDateKey(a.timestamp)
    if (!dateStr) continue

    if (a.type === 'VIDEO_WATCHED') {
      addVideo(dateStr, {
        subject: a.subjectName || (a.subjectId ? subjectNameById.get(a.subjectId) : undefined) || 'Medical',
        title: a.title,
        status: 'Watched → Ward MCQ',
      })
    } else if (a.type === 'MODULE_SOLVED') {
      addModule(dateStr, {
        code: a.code || 'DONE',
        title: a.title,
        notAnnotated: a.metadata?.annotationStatus === 'not_annotated',
      })
    } else if (a.type === 'REVIEW_COMPLETED' || a.type === 'TOPIC_LOCKED') {
      addRevision(dateStr, { title: a.title })
    }
  }

  let daysToScan = 14
  if (historyPeriod === 'all') {
    daysToScan = 180
  } else if (historyPeriod.includes('-')) {
    daysToScan = 365
  }

  const list: DaywiseHistoryItem[] = []
  for (let i = 0; i < daysToScan; i++) {
    const d = subDays(today, i)
    const dateStr = format(d, 'yyyy-MM-dd')

    if (historyPeriod.includes('-') && !dateStr.startsWith(historyPeriod)) {
      continue
    }

    const isTodayDate = i === 0
    const isYesterdayDate = i === 1
    const relativeLabel = isTodayDate ? 'Today' : isYesterdayDate ? 'Yesterday' : `${i} days ago`
    const dateLabel = format(d, 'EEEE, d MMM yyyy')

    const dayVideos = videosByDay.has(dateStr) ? Array.from(videosByDay.get(dateStr)!.values()) : []
    const dayModules = modulesByDay.has(dateStr) ? Array.from(modulesByDay.get(dateStr)!.values()) : []
    const dayRevisions = revisionsByDay.has(dateStr)
      ? Array.from(revisionsByDay.get(dateStr)!.values())
      : []
    const note = dayOverrides[dateStr]?.customNote || ''

    list.push({
      id: `day-${dateStr}`,
      dateStr,
      dateLabel,
      relativeLabel,
      isToday: isTodayDate,
      isYesterday: isYesterdayDate,
      videos: dayVideos,
      modules: dayModules,
      revisions: dayRevisions,
      note,
    })
  }

  return list
}
