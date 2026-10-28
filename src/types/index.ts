export type TopicStatus =
  | 'QUEUED'
  | 'STEP_1_WATCHING'
  | 'STEP_2_WARD_MCQ'
  | 'STEP_3_ANNOTATING'
  | 'LOCKED_IN_SR'

export type SRLevel = 0 | 1 | 2 | 3 | 4

export type SRStatus = 'DUE_TODAY' | 'OVERDUE' | 'SCHEDULED' | 'MASTERED'

export interface SRReviewLog {
  reviewedAt: string
  levelBefore: SRLevel
  levelAfter: SRLevel
}

export interface SRData {
  level: SRLevel
  lockedAt: string
  lastReviewedAt?: string
  nextReviewDate: string
  reviewCount: number
  history: SRReviewLog[]
}

export interface Topic {
  id: string
  subjectId: string
  title: string
  chapterNumber?: number
  durationMinutes: number
  highYield: boolean
  highYieldTags: string[]
  status: TopicStatus
  bookmarkCount: number
  marginNotes?: string
  inStretchQueue?: boolean
  srData?: SRData
  updatedAt: string
}

export interface Subject {
  id: string
  name: string
  shortCode: string
  category: 'Pre-Clinical' | 'Para-Clinical' | 'Clinical'
  order: number
  iconName: string
  color: string
  targetHours: number
}

export type ViewMode = 'ward' | 'hostel' | 'timeline' | 'matrix' | 'kanban' | 'analytics'

export type DutyShift = 'WARD_DAY' | 'CASUALTY' | 'ICU_ROTATION' | 'POST_DUTY_OFF' | 'NIGHT_SHIFT'

export interface GTScheduleItem {
  id: string
  date: string
  title: string
  completed: boolean
  score?: number
  percentile?: number
}

export interface SubjectMilestone {
  subjectId: string
  subjectName: string
  remainingTopics: number
  projectedFinishDate: string
  swtDate: string
  isCurrentActive: boolean
  isCompleted: boolean
}

export type DayShiftTag = 'LOW' | 'MEDIUM' | 'HIGH'

export interface DayOverride {
  shiftType?: DayShiftTag
  customPace?: number
  customNote?: string
}

export interface ProjectedDayItem {
  date: string // yyyy-MM-dd
  dayNumber: number
  dayOfWeek: string
  shiftType: DayShiftTag
  subjectId?: string
  subjectName?: string
  subjectColor?: string
  topicsToWatch: Topic[]
  isSWTDay?: boolean
  swtSubjectId?: string
  swtSubjectName?: string
  isGTDay?: boolean
  gtId?: string
  gtTitle?: string
  customNote?: string
}
