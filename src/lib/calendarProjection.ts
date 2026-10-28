import { Topic, Subject, GTScheduleItem, ProjectedDayItem, DayOverride, DayShiftTag } from '../types'
import { addDays, format, differenceInDays } from 'date-fns'

export interface SubjectDaySpan {
  subjectId: string
  subjectName: string
  subjectColor: string
  startDate: string
  endDate: string
  totalDays: number
  totalLectures: number
}

export interface CalendarProjectionResult {
  projectedDays: ProjectedDayItem[]
  estimatedFinishDate: Date
  daysRemaining: number
  subjectSpans: SubjectDaySpan[]
  gtDates: string[]
  swtDates: { date: string; subjectId: string; subjectName: string }[]
}

interface GenerateProjectionParams {
  topics: Topic[]
  subjects: Subject[]
  subjectOrder: string[]
  activeSubjectId: string
  dailyPaceTopics: number
  gtSchedule: GTScheduleItem[]
  swtCompletedSubjects: string[]
  gtStartThreshold?: number // defaults to 7 subjects
  dayOverrides?: Record<string, DayOverride>
  startDate?: Date
}

export function generateCalendarProjection({
  topics,
  subjects,
  subjectOrder,
  dailyPaceTopics,
  gtSchedule,
  gtStartThreshold = 7,
  dayOverrides = {},
  startDate = new Date(),
}: GenerateProjectionParams): CalendarProjectionResult {
  // 1. Build ordered list of subject IDs ensuring all subjects are covered
  const validSubjectIds = subjects.map((s) => s.id)
  const orderedIds = [
    ...subjectOrder.filter((id) => validSubjectIds.includes(id)),
    ...validSubjectIds.filter((id) => !subjectOrder.includes(id)),
  ]

  // Map for quick subject lookup
  const subjectMap = new Map<string, Subject>()
  subjects.forEach((s) => subjectMap.set(s.id, s))

  // 2. Extract remaining (uncompleted) topics per subject
  const subjectRemainingLectures = new Map<string, Topic[]>()
  let initialCompletedSubjectsCount = 0

  orderedIds.forEach((subId) => {
    const subTopics = topics
      .filter((t) => t.subjectId === subId)
      .sort((a, b) => (a.chapterNumber || 0) - (b.chapterNumber || 0))
    const uncompleted = subTopics.filter((t) => t.status !== 'LOCKED_IN_SR')
    
    if (uncompleted.length === 0 && subTopics.length > 0) {
      initialCompletedSubjectsCount++
    }
    subjectRemainingLectures.set(subId, [...uncompleted])
  })

  // Map of scheduled GT dates for quick check
  const gtDateMap = new Map<string, GTScheduleItem>()
  gtSchedule.forEach((gt) => gtDateMap.set(gt.date, gt))

  const projectedDays: ProjectedDayItem[] = []
  const subjectSpansMap = new Map<string, SubjectDaySpan>()
  const swtDates: { date: string; subjectId: string; subjectName: string }[] = []
  const gtDates: string[] = []

  let currentDate = startDate
  let dayNumber = 1
  let currentSubjectIdx = 0
  let completedSubjectCount = initialCompletedSubjectsCount

  // Find first subject in order that has uncompleted lectures
  while (
    currentSubjectIdx < orderedIds.length &&
    (subjectRemainingLectures.get(orderedIds[currentSubjectIdx])?.length || 0) === 0
  ) {
    currentSubjectIdx++
  }

  const MAX_DAYS = 450 // Cap to prevent infinite loops

  while (
    currentSubjectIdx < orderedIds.length &&
    projectedDays.length < MAX_DAYS
  ) {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    const dayOfWeek = format(currentDate, 'EEE')
    const override = dayOverrides[dateStr]
    const shiftType: DayShiftTag = override?.shiftType || 'MEDIUM'

    // Determine pace for this day
    let effectivePace = dailyPaceTopics || 2
    if (override?.customPace !== undefined) {
      effectivePace = override.customPace
    } else if (shiftType === 'HIGH') {
      // High work shift (e.g. casualty/heavy ward duty) -> reduced pace
      effectivePace = Math.max(1, dailyPaceTopics - 1)
    } else if (shiftType === 'LOW') {
      // Low work / light day -> sprint pace
      effectivePace = dailyPaceTopics + 1
    }

    // Check: Is today a GT Day?
    // GTs only begin after completedSubjectCount >= gtStartThreshold
    const isScheduledGT = gtDateMap.has(dateStr)
    const canTakeGT = completedSubjectCount >= gtStartThreshold

    if (isScheduledGT && canTakeGT) {
      const gtItem = gtDateMap.get(dateStr)!
      gtDates.push(dateStr)

      projectedDays.push({
        date: dateStr,
        dayNumber,
        dayOfWeek,
        shiftType,
        topicsToWatch: [],
        isGTDay: true,
        gtId: gtItem.id,
        gtTitle: gtItem.title,
        customNote: override?.customNote || 'Dedicated Grand Test (200 MCQs) & Test Analysis (0 new videos)',
      })

      currentDate = addDays(currentDate, 1)
      dayNumber++
      continue
    }

    // Regular lecture day
    if (currentSubjectIdx < orderedIds.length) {
      const currentSubId = orderedIds[currentSubjectIdx]
      const currentSub = subjectMap.get(currentSubId)
      const remainingList = subjectRemainingLectures.get(currentSubId) || []

      const topicsToday = remainingList.splice(0, effectivePace)
      subjectRemainingLectures.set(currentSubId, remainingList)
      const isFinishingToday = remainingList.length === 0

      // Update subject span
      if (!subjectSpansMap.has(currentSubId)) {
        const totalSubTopics = topics.filter((t) => t.subjectId === currentSubId).length
        subjectSpansMap.set(currentSubId, {
          subjectId: currentSubId,
          subjectName: currentSub?.name || currentSubId,
          subjectColor: currentSub?.color || '#10b981',
          startDate: dateStr,
          endDate: dateStr,
          totalDays: 1,
          totalLectures: totalSubTopics,
        })
      } else {
        const span = subjectSpansMap.get(currentSubId)!
        span.endDate = dateStr
        span.totalDays += 1
      }

      if (isFinishingToday) {
        swtDates.push({
          date: dateStr,
          subjectId: currentSubId,
          subjectName: currentSub?.name || 'Subject',
        })
        completedSubjectCount++
      }

      projectedDays.push({
        date: dateStr,
        dayNumber,
        dayOfWeek,
        shiftType,
        subjectId: currentSubId,
        subjectName: currentSub?.name,
        subjectColor: currentSub?.color,
        topicsToWatch: topicsToday,
        isSWTDay: isFinishingToday,
        swtSubjectId: isFinishingToday ? currentSubId : undefined,
        swtSubjectName: isFinishingToday ? currentSub?.name : undefined,
        customNote:
          override?.customNote ||
          (isFinishingToday
            ? `🏁 Last lectures of ${currentSub?.name} finished! Take SWT tonight for quick revision.`
            : undefined),
      })

      if (isFinishingToday) {
        currentSubjectIdx++
        while (
          currentSubjectIdx < orderedIds.length &&
          (subjectRemainingLectures.get(orderedIds[currentSubjectIdx])?.length || 0) === 0
        ) {
          currentSubjectIdx++
        }
      }

      currentDate = addDays(currentDate, 1)
      dayNumber++
    } else {
      break
    }
  }

  const estimatedFinishDate = currentDate
  const daysRemaining = Math.max(0, differenceInDays(estimatedFinishDate, startDate))

  return {
    projectedDays,
    estimatedFinishDate,
    daysRemaining,
    subjectSpans: Array.from(subjectSpansMap.values()),
    gtDates,
    swtDates,
  }
}
