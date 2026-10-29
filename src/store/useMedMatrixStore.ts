import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { DutyShift, GTScheduleItem, Subject, Topic, TopicStatus, ViewMode, DayOverride, SRData } from '../types'
import { INITIAL_SUBJECTS, INITIAL_TOPICS, seedSampleSRCards } from '../data/initialSubjects'
import { advanceTopicSR, createInitialSRData, DEFAULT_EBBINGHAUS_INTERVALS, DEFAULT_POSTPONE_DAYS } from '../lib/srEngine'
import { triggerLockCelebration, triggerMasteredCelebration } from '../lib/confetti'
import { saveSyncConfigToDevice } from '../lib/widgetBridge'
import { toast } from 'sonner'
import { addDays, format } from 'date-fns'

const STORAGE_KEY = 'medmatrix-storage-v2'

/**
 * A brand new install has no local state, so its "last modified" clock must not
 * out-rank the copy already sitting in the cloud. Starting the clock at 0 lets the
 * first sync pull existing progress down instead of overwriting it with seed data.
 */
const HAS_PERSISTED_STATE = (() => {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return true
  }
})()

// Generate initial bi-weekly GTs on alternate Sundays
const now = new Date()
const INITIAL_GTS: GTScheduleItem[] = Array.from({ length: 8 }).map((_, i) => {
  const gtDate = addDays(now, 7 + i * 14)
  return {
    id: `gt-${i + 1}`,
    date: format(gtDate, 'yyyy-MM-dd'),
    title: `Grand Test ${i + 1} (Full Syllabus)`,
    completed: false,
  }
})

interface MedMatrixState {
  // Data
  topics: Topic[]
  subjects: Subject[]
  
  // Active Subject Focus
  activeSubjectId: string
  dailyPaceTopics: number
  swtCompletedSubjects: string[]
  gtSchedule: GTScheduleItem[]
  subjectOrder: string[]
  gtStartThreshold: number
  dayOverrides: Record<string, DayOverride>

  // Navigation & View
  activeTab: ViewMode
  currentShift: DutyShift
  searchQuery: string
  selectedSubjectFilter: string | 'ALL'
  highYieldOnlyFilter: boolean
  stretchDrawerOpen: boolean
  selectedTopicForDetail: Topic | null

  // Baseline 2 Quota & Elastic Stretch
  mandatoryTopicIds: string[]
  stretchTopicIds: string[]

  // Spaced Repetition Custom Intervals
  ebbinghausIntervals: [number, number, number, number]
  postponeIntervalDays: number

  // Actions
  setActiveTab: (tab: ViewMode) => void
  setCurrentShift: (shift: DutyShift) => void
  setActiveSubjectId: (id: string) => void
  setDailyPaceTopics: (pace: number) => void
  setSearchQuery: (query: string) => void
  setSelectedSubjectFilter: (filter: string | 'ALL') => void
  setHighYieldOnlyFilter: (val: boolean) => void
  setStretchDrawerOpen: (open: boolean) => void
  setSelectedTopicForDetail: (topic: Topic | null) => void

  // Topic Pipeline Actions
  updateTopicStatus: (id: string, status: TopicStatus) => void
  cycleTopicStatusNext: (id: string) => void
  lockTopicIntoSR: (id: string) => void
  advanceSRLevel: (id: string) => void
  pullPastTopicToSR: (id: string) => void
  snoozeTopicSR: (id: string, days?: number) => void
  removeTopicFromSR: (id: string) => void
  setEbbinghausIntervals: (intervals: [number, number, number, number]) => void
  setPostponeIntervalDays: (days: number) => void
  resetIntervalsToDefault: () => void
  updateBookmarkCount: (id: string, delta: number) => void
  updateMarginNotes: (id: string, notes: string) => void

  // Elastic Stretch Queue Actions
  pullToStretchQueue: (id: string) => void
  removeFromStretchQueue: (id: string) => void
  refreshDailyBaseline: () => void

  // Milestones: SWT and GT actions
  markSWTCompleted: (subjectId: string) => void
  logGTScore: (id: string, score: number, percentile?: number) => void
  reorderSubjects: (newOrder: string[]) => void
  moveSubject: (fromIndex: number, toIndex: number) => void
  setDayOverride: (dateStr: string, override: Partial<DayOverride>) => void
  setGTStartThreshold: (threshold: number) => void

  // Decentralized Multi-Device Sync (Supabase)
  lastModified: number
  syncConfig: {
    supabaseUrl: string
    supabaseAnonKey: string
    syncKey: string
    autoSync: boolean
    isConnected: boolean
  }
  setSupabaseConfig: (url: string, key: string, syncKey?: string) => void
  /** Silent variant used when the credentials come from the build or from device storage. */
  restoreSyncConfig: (url: string, key: string, syncKey?: string) => void
  clearSupabaseConfig: () => void
  setSyncKey: (syncKey: string) => void
  touchLastModified: () => void
  loadExternalSyncData: (data: Partial<MedMatrixState>) => boolean
  getSyncPayload: () => Record<string, unknown>

  // Persistence & Data Management
  resetToInitialSeed: () => void
  exportDataJSON: () => string
  importDataJSON: (jsonStr: string) => boolean
}

export const useMedMatrixStore = create<MedMatrixState>()(
  persist(
    (set, get) => ({
      topics: seedSampleSRCards(INITIAL_TOPICS),
      subjects: INITIAL_SUBJECTS,
      
      // Default to Microbiology as the active focus subject
      activeSubjectId: 'micro',
      dailyPaceTopics: 2,
      swtCompletedSubjects: [],
      gtSchedule: INITIAL_GTS,
      subjectOrder: ['micro', ...INITIAL_SUBJECTS.map((s) => s.id).filter((id) => id !== 'micro')],
      gtStartThreshold: 7, // GTs start after completing 7 subjects as per topper strategy
      dayOverrides: {},

      activeTab: 'ward',
      currentShift: 'WARD_DAY',
      searchQuery: '',
      selectedSubjectFilter: 'ALL',
      highYieldOnlyFilter: false,
      stretchDrawerOpen: false,
      selectedTopicForDetail: null,

      mandatoryTopicIds: ['lec-54', 'lec-55'], // Microbiology General Micro 1 & 2
      stretchTopicIds: [],

      ebbinghausIntervals: DEFAULT_EBBINGHAUS_INTERVALS,
      postponeIntervalDays: DEFAULT_POSTPONE_DAYS,

      lastModified: HAS_PERSISTED_STATE ? Date.now() : 0,
      syncConfig: {
        supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string) || '',
        supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',
        syncKey: 'dr-med-sync',
        autoSync: true,
        isConnected: Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
      },

      setActiveTab: (tab) => set({ activeTab: tab }),

      setCurrentShift: (shift) => {
        set({ currentShift: shift })
        toast.info(`Duty shifted to: ${shift.replace('_', ' ')}`)
      },

      setActiveSubjectId: (activeSubjectId) => {
        const { subjects, topics } = get()
        const sub = subjects.find((s) => s.id === activeSubjectId)
        
        // Auto-refresh daily baseline for the new subject if needed
        const subTopics = topics.filter((t) => t.subjectId === activeSubjectId)
        const queued = subTopics.filter((t) => t.status === 'QUEUED')
        const watching = subTopics.filter((t) => t.status === 'STEP_1_WATCHING')

        let updatedTopics = topics
        let newMandatory = watching.map((w) => w.id)

        if (watching.length < 2 && queued.length > 0) {
          const needed = 2 - watching.length
          const nextTwo = queued.slice(0, needed)
          const nextIds = nextTwo.map((n) => n.id)
          newMandatory = [...newMandatory, ...nextIds]

          updatedTopics = topics.map((t) =>
            nextIds.includes(t.id)
              ? { ...t, status: 'STEP_1_WATCHING' as TopicStatus, updatedAt: new Date().toISOString() }
              : t
          )
        }

        set({
          activeSubjectId,
          topics: updatedTopics,
          mandatoryTopicIds: newMandatory,
          lastModified: Date.now(),
        })

        toast.success(`Active Focus set to: ${sub?.name || activeSubjectId}`, {
          description: 'Ward MCQs & Tonight Videos now adjust around this subject.',
        })
      },

      setDailyPaceTopics: (dailyPaceTopics) => {
        set({ dailyPaceTopics, lastModified: Date.now() })
        toast.info(`Pace updated to ${dailyPaceTopics} topics/day`)
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),

      setSelectedSubjectFilter: (selectedSubjectFilter) => set({ selectedSubjectFilter }),

      setHighYieldOnlyFilter: (highYieldOnlyFilter) => set({ highYieldOnlyFilter }),

      setStretchDrawerOpen: (stretchDrawerOpen) => set({ stretchDrawerOpen }),

      setSelectedTopicForDetail: (selectedTopicForDetail) => set({ selectedTopicForDetail }),

      updateTopicStatus: (id, status) => {
        const { topics } = get()
        const topic = topics.find((t) => t.id === id)
        if (!topic) return

        let srData = topic.srData
        if (status === 'LOCKED_IN_SR' && !srData) {
          srData = createInitialSRData()
          triggerLockCelebration()
          toast.success(`Locked "${topic.title.slice(0, 30)}..." into Spaced Repetition!`)
        }

        const updated = topics.map((t) =>
          t.id === id ? { ...t, status, srData, updatedAt: new Date().toISOString() } : t
        )

        set({ topics: updated, lastModified: Date.now() })
      },

      cycleTopicStatusNext: (id) => {
        const { topics, updateTopicStatus } = get()
        const topic = topics.find((t) => t.id === id)
        if (!topic) return

        const order: TopicStatus[] = [
          'QUEUED',
          'STEP_1_WATCHING',
          'STEP_2_WARD_MCQ',
          'STEP_3_ANNOTATING',
          'LOCKED_IN_SR',
        ]
        const currentIndex = order.indexOf(topic.status)
        const nextStatus = order[(currentIndex + 1) % order.length]
        updateTopicStatus(id, nextStatus)
        toast.info(`Moved to ${nextStatus.replace(/_/g, ' ')}`)
      },

      lockTopicIntoSR: (id) => {
        const { topics, subjects } = get()
        const topic = topics.find((t) => t.id === id)
        if (!topic) return

        const srData = createInitialSRData()
        triggerLockCelebration()

        const updated = topics.map((t) =>
          t.id === id
            ? {
                ...t,
                status: 'LOCKED_IN_SR' as TopicStatus,
                srData,
                updatedAt: new Date().toISOString(),
              }
            : t
        )

        set({ topics: updated, lastModified: Date.now() })
        toast.success(`🎉 Locked into Spaced Repetition! First review tomorrow.`)

        // Check if all topics of active subject are now locked!
        const activeSubTopics = updated.filter((t) => t.subjectId === topic.subjectId)
        const allLocked = activeSubTopics.every((t) => t.status === 'LOCKED_IN_SR')

        if (allLocked && activeSubTopics.length > 0) {
          const subObj = subjects.find((s) => s.id === topic.subjectId)
          triggerMasteredCelebration()
          toast.success(
            `🏆 ${subObj?.name || 'Subject'} FINISHED! Schedule your Subject-Wise Test (SWT)!`,
            { duration: 6000 }
          )
        }
      },

      advanceSRLevel: (id) => {
        const { topics, ebbinghausIntervals } = get()
        const topic = topics.find((t) => t.id === id)
        if (!topic || !topic.srData) return

        const updatedSR = advanceTopicSR(topic.srData, new Date(), ebbinghausIntervals)
        const isMastered = updatedSR.level >= 4

        if (isMastered) {
          triggerMasteredCelebration()
          toast.success(`⭐ MASTERED! "${topic.title.slice(0, 30)}..." permanently retained!`, {
            duration: 4000,
          })
        } else {
          toast.success(`Advanced to Level ${updatedSR.level}! Next review on ${updatedSR.nextReviewDate}`)
        }

        const updated = topics.map((t) =>
          t.id === id
            ? {
                ...t,
                srData: updatedSR,
                updatedAt: new Date().toISOString(),
              }
            : t
        )

        set({ topics: updated, lastModified: Date.now() })
      },

      pullPastTopicToSR: (id) => {
        const { topics } = get()
        const topic = topics.find((t) => t.id === id)
        if (!topic) return

        const now = new Date()
        const todayStr = format(now, 'yyyy-MM-dd')

        // If already has srData, bring nextReviewDate to today; otherwise initialize Level 0
        const srData: SRData = topic.srData
          ? { ...topic.srData, nextReviewDate: todayStr }
          : {
              level: 0,
              lockedAt: now.toISOString(),
              nextReviewDate: todayStr, // Due today!
              reviewCount: 0,
              history: [],
            }

        const updated = topics.map((t) =>
          t.id === id
            ? {
                ...t,
                status: 'LOCKED_IN_SR' as TopicStatus,
                srData,
                updatedAt: now.toISOString(),
              }
            : t
        )

        set({ topics: updated, lastModified: Date.now() })
        toast.success(`📖 Added "${topic.title.slice(0, 26)}..." to Tonight's Reviews!`)
      },

      snoozeTopicSR: (id, days) => {
        const { topics, postponeIntervalDays } = get()
        const topic = topics.find((t) => t.id === id)
        if (!topic || !topic.srData) return

        const effectiveDays = days ?? postponeIntervalDays
        const newDate = addDays(new Date(), effectiveDays)
        const newDateStr = format(newDate, 'yyyy-MM-dd')

        const updatedSR = {
          ...topic.srData,
          nextReviewDate: newDateStr,
        }

        const updated = topics.map((t) =>
          t.id === id
            ? {
                ...t,
                srData: updatedSR,
                updatedAt: new Date().toISOString(),
              }
            : t
        )

        set({ topics: updated, lastModified: Date.now() })
        toast.info(`💤 Postponed "${topic.title.slice(0, 24)}..." by ${effectiveDays} days`)
      },

      setEbbinghausIntervals: (intervals) => {
        set({ ebbinghausIntervals: intervals, lastModified: Date.now() })
        toast.success(`Ebbinghaus intervals updated: +${intervals.join('d, +')}d`)
      },

      setPostponeIntervalDays: (days) => {
        set({ postponeIntervalDays: days, lastModified: Date.now() })
        toast.success(`Postpone duration set to ${days} days`)
      },

      resetIntervalsToDefault: () => {
        set({
          ebbinghausIntervals: DEFAULT_EBBINGHAUS_INTERVALS,
          postponeIntervalDays: DEFAULT_POSTPONE_DAYS,
          lastModified: Date.now(),
        })
        toast.info('Intervals reset to clinical defaults (+1d, +5d, +12d, +25d; Postpone: 3d)')
      },

      removeTopicFromSR: (id) => {
        const { topics } = get()
        const topic = topics.find((t) => t.id === id)
        if (!topic) return

        const updated = topics.map((t) =>
          t.id === id
            ? {
                ...t,
                status: 'QUEUED' as TopicStatus,
                srData: undefined,
                updatedAt: new Date().toISOString(),
              }
            : t
        )

        set({ topics: updated, lastModified: Date.now() })
        toast.info(`Removed "${topic.title.slice(0, 24)}..." from active reviews`)
      },

      updateBookmarkCount: (id, delta) => {
        const { topics } = get()
        const updated = topics.map((t) => {
          if (t.id !== id) return t
          const newCount = Math.max(0, (t.bookmarkCount || 0) + delta)
          return { ...t, bookmarkCount: newCount, updatedAt: new Date().toISOString() }
        })
        set({ topics: updated, lastModified: Date.now() })
      },

      updateMarginNotes: (id, notes) => {
        const { topics } = get()
        const updated = topics.map((t) =>
          t.id === id ? { ...t, marginNotes: notes, updatedAt: new Date().toISOString() } : t
        )
        set({ topics: updated, lastModified: Date.now() })
      },

      pullToStretchQueue: (id) => {
        const { topics, stretchTopicIds } = get()
        const topic = topics.find((t) => t.id === id)
        if (!topic) return

        const newStretchIds = Array.from(new Set([...stretchTopicIds, id]))
        const updated = topics.map((t) =>
          t.id === id
            ? {
                ...t,
                inStretchQueue: true,
                status: 'STEP_1_WATCHING' as TopicStatus,
                updatedAt: new Date().toISOString(),
              }
            : t
        )

        set({
          stretchTopicIds: newStretchIds,
          topics: updated,
          stretchDrawerOpen: false,
          lastModified: Date.now(),
        })

        toast.success(`Added "${topic.title.slice(0, 30)}..." to tonight's video queue!`)
      },

      removeFromStretchQueue: (id) => {
        const { topics, stretchTopicIds } = get()
        const newStretchIds = stretchTopicIds.filter((tid) => tid !== id)
        const updated = topics.map((t) =>
          t.id === id ? { ...t, inStretchQueue: false, updatedAt: new Date().toISOString() } : t
        )
        set({ stretchTopicIds: newStretchIds, topics: updated, lastModified: Date.now() })
        toast.info('Removed topic from stretch queue')
      },

      refreshDailyBaseline: () => {
        const { topics, activeSubjectId, subjects } = get()
        // Prioritize the activeSubjectId
        const activeTopics = topics.filter((t) => t.subjectId === activeSubjectId)
        const watching = activeTopics.filter((t) => t.status === 'STEP_1_WATCHING')

        if (watching.length < 2) {
          const needed = 2 - watching.length
          const queued = activeTopics.filter((t) => t.status === 'QUEUED')
          const selected = queued.slice(0, needed)

          if (selected.length > 0) {
            const selectedIds = selected.map((s) => s.id)
            const updated = topics.map((t) =>
              selectedIds.includes(t.id)
                ? { ...t, status: 'STEP_1_WATCHING' as TopicStatus, updatedAt: new Date().toISOString() }
                : t
            )
            set({
              topics: updated,
              mandatoryTopicIds: selectedIds,
              lastModified: Date.now(),
            })
            const subName = subjects.find((s) => s.id === activeSubjectId)?.name || 'Subject'
            toast.info(`Assigned ${selected.length} video(s) for ${subName} tonight!`)
          } else {
            toast.info('All chapters in active subject are completed or in progress!')
          }
        }
      },

      markSWTCompleted: (subjectId) => {
        const { swtCompletedSubjects, subjects } = get()
        if (swtCompletedSubjects.includes(subjectId)) return

        const updated = [...swtCompletedSubjects, subjectId]
        set({ swtCompletedSubjects: updated, lastModified: Date.now() })
        const subName = subjects.find((s) => s.id === subjectId)?.name || 'Subject'
        triggerLockCelebration()
        toast.success(`🎉 Subject-Wise Test (SWT) completed for ${subName}!`)
      },

      logGTScore: (id, score, percentile) => {
        const { gtSchedule } = get()
        const updated = gtSchedule.map((gt) =>
          gt.id === id ? { ...gt, completed: true, score, percentile } : gt
        )
        set({ gtSchedule: updated, lastModified: Date.now() })
        toast.success(`Logged GT score: ${score}/800`)
      },

      reorderSubjects: (newOrder) => {
        set({ subjectOrder: newOrder, lastModified: Date.now() })
        toast.success('Subject study sequence updated!')
      },

      moveSubject: (fromIndex, toIndex) => {
        const { subjectOrder } = get()
        if (
          fromIndex < 0 ||
          fromIndex >= subjectOrder.length ||
          toIndex < 0 ||
          toIndex >= subjectOrder.length
        )
          return
        const updated = [...subjectOrder]
        const [moved] = updated.splice(fromIndex, 1)
        updated.splice(toIndex, 0, moved)
        set({ subjectOrder: updated, lastModified: Date.now() })
      },

      setDayOverride: (dateStr, override) => {
        const { dayOverrides } = get()
        const current = dayOverrides[dateStr] || {}
        const updated = {
          ...dayOverrides,
          [dateStr]: { ...current, ...override },
        }
        set({ dayOverrides: updated, lastModified: Date.now() })
        toast.info(`Updated schedule for ${dateStr}`)
      },

      setGTStartThreshold: (gtStartThreshold) => {
        set({ gtStartThreshold, lastModified: Date.now() })
        toast.info(`GTs scheduled to begin after ${gtStartThreshold} subjects completed`)
      },

      resetToInitialSeed: () => {
        set({
          topics: seedSampleSRCards(INITIAL_TOPICS),
          subjects: INITIAL_SUBJECTS,
          activeSubjectId: 'micro',
          dailyPaceTopics: 2,
          swtCompletedSubjects: [],
          gtSchedule: INITIAL_GTS,
          mandatoryTopicIds: ['lec-54', 'lec-55'],
          stretchTopicIds: [],
          lastModified: Date.now(),
        })
        toast.info('Database reset to initial prescribed seed state.')
      },

      setSupabaseConfig: (supabaseUrl, supabaseAnonKey, syncKey) => {
        const next = {
          supabaseUrl: supabaseUrl.trim(),
          supabaseAnonKey: supabaseAnonKey.trim(),
          syncKey: syncKey ? syncKey.trim() : get().syncConfig.syncKey,
        }
        set((state) => ({
          syncConfig: {
            ...state.syncConfig,
            ...next,
            isConnected: Boolean(next.supabaseUrl && next.supabaseAnonKey),
          },
          // Deliberately no lastModified bump: connecting is not a study edit.
          // Bumping here made a fresh install look "newer" than the cloud row, so
          // the very first sync pushed seed curriculum over the user's real progress.
        }))
        // Mirror to the device store so a reinstall / storage wipe can recover it.
        void saveSyncConfigToDevice({ ...next, syncKey: next.syncKey || 'dr-med-sync' })
        toast.success('Supabase cloud credentials saved on this device!')
      },

      restoreSyncConfig: (supabaseUrl, supabaseAnonKey, syncKey) => {
        const next = {
          supabaseUrl: supabaseUrl.trim(),
          supabaseAnonKey: supabaseAnonKey.trim(),
          syncKey: (syncKey || get().syncConfig.syncKey || 'dr-med-sync').trim(),
        }
        if (!next.supabaseUrl || !next.supabaseAnonKey) return
        set((state) => ({
          syncConfig: {
            ...state.syncConfig,
            ...next,
            isConnected: true,
          },
        }))
        void saveSyncConfigToDevice(next)
      },

      clearSupabaseConfig: () => {
        set((state) => ({
          syncConfig: {
            ...state.syncConfig,
            supabaseUrl: '',
            supabaseAnonKey: '',
            isConnected: false,
          },
          lastModified: Date.now(),
        }))
        void saveSyncConfigToDevice({
          supabaseUrl: '',
          supabaseAnonKey: '',
          syncKey: get().syncConfig.syncKey,
        })
        toast.info('Disconnected from Supabase cloud sync.')
      },

      setSyncKey: (syncKey) => {
        set((state) => ({
          syncConfig: { ...state.syncConfig, syncKey },
          lastModified: Date.now(),
        }))
        toast.success(`Sync Key updated: ${syncKey}`)
      },

      touchLastModified: () => {
        set({ lastModified: Date.now() })
      },

      loadExternalSyncData: (incoming) => {
        const current = get()
        if (!incoming.topics || !incoming.subjects) return false

        // Only accept if remote is newer
        if (incoming.lastModified && current.lastModified && incoming.lastModified <= current.lastModified) {
          return false
        }

        set({
          topics: incoming.topics,
          subjects: incoming.subjects,
          activeSubjectId: incoming.activeSubjectId || current.activeSubjectId,
          dailyPaceTopics: incoming.dailyPaceTopics ?? current.dailyPaceTopics,
          swtCompletedSubjects: incoming.swtCompletedSubjects || current.swtCompletedSubjects,
          gtSchedule: incoming.gtSchedule || current.gtSchedule,
          subjectOrder: incoming.subjectOrder || current.subjectOrder,
          gtStartThreshold: incoming.gtStartThreshold ?? current.gtStartThreshold,
          dayOverrides: incoming.dayOverrides || current.dayOverrides,
          mandatoryTopicIds: incoming.mandatoryTopicIds || current.mandatoryTopicIds,
          stretchTopicIds: incoming.stretchTopicIds || current.stretchTopicIds,
          ebbinghausIntervals: incoming.ebbinghausIntervals || current.ebbinghausIntervals,
          postponeIntervalDays: incoming.postponeIntervalDays ?? current.postponeIntervalDays,
          lastModified: incoming.lastModified || Date.now(),
        })
        return true
      },

      getSyncPayload: () => {
        const s = get()
        return {
          version: '2.1.0',
          lastModified: s.lastModified || Date.now(),
          activeSubjectId: s.activeSubjectId,
          dailyPaceTopics: s.dailyPaceTopics,
          swtCompletedSubjects: s.swtCompletedSubjects,
          gtSchedule: s.gtSchedule,
          subjectOrder: s.subjectOrder,
          gtStartThreshold: s.gtStartThreshold,
          dayOverrides: s.dayOverrides,
          mandatoryTopicIds: s.mandatoryTopicIds,
          stretchTopicIds: s.stretchTopicIds,
          ebbinghausIntervals: s.ebbinghausIntervals,
          postponeIntervalDays: s.postponeIntervalDays,
          topics: s.topics,
          subjects: s.subjects,
        }
      },

      exportDataJSON: () => {
        const payload = get().getSyncPayload()
        return JSON.stringify(payload, null, 2)
      },

      importDataJSON: (jsonStr) => {
        try {
          const parsed = JSON.parse(jsonStr)
          if (!Array.isArray(parsed.topics) || !Array.isArray(parsed.subjects)) {
            toast.error('Invalid JSON structure: missing topics or subjects array.')
            return false
          }
          set({
            topics: parsed.topics,
            subjects: parsed.subjects,
            activeSubjectId: parsed.activeSubjectId || 'micro',
            dailyPaceTopics: parsed.dailyPaceTopics || 2,
            swtCompletedSubjects: parsed.swtCompletedSubjects || [],
            gtSchedule: parsed.gtSchedule || INITIAL_GTS,
            subjectOrder: parsed.subjectOrder || get().subjectOrder,
            gtStartThreshold: parsed.gtStartThreshold ?? get().gtStartThreshold,
            dayOverrides: parsed.dayOverrides || {},
            mandatoryTopicIds: parsed.mandatoryTopicIds || [],
            stretchTopicIds: parsed.stretchTopicIds || [],
            ebbinghausIntervals: parsed.ebbinghausIntervals || DEFAULT_EBBINGHAUS_INTERVALS,
            postponeIntervalDays: parsed.postponeIntervalDays ?? DEFAULT_POSTPONE_DAYS,
            lastModified: parsed.lastModified || Date.now(),
          })
          toast.success('Successfully imported MedMatrix study database!')
          return true
        } catch {
          toast.error('Failed to parse JSON file.')
          return false
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Credentials (build-time env, device mirror, or user-entered) are
          // resolved by bootstrapSyncConfig() so they go through a real state
          // update and get persisted, rather than mutating the rehydrated object.
          if (Array.isArray(state.topics)) {
            // Clean up dummy seed cards (lec-14, lec-16, lec-24) from previous seed
            state.topics = state.topics.map((t) => {
              if (
                (t.id === 'lec-14' || t.id === 'lec-16' || t.id === 'lec-24') &&
                (!t.srData?.history || t.srData.history.length <= 1)
              ) {
                return { ...t, status: 'QUEUED' as TopicStatus, srData: undefined }
              }
              return t
            })
          }
        }
      },
    }
  )
)
