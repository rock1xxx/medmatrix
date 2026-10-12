import { registerPlugin } from '@capacitor/core'
import { format } from 'date-fns'
import type { Topic, Subject } from '../types'

export type WidgetBackgroundStyle = 'frosted' | 'transparent' | 'opaque'
export type WidgetCornerRadius = 16 | 24 | 32

export interface WidgetPayload {
  todayDate: string
  subject: string
  mcqCh1: string
  mcqCh2: string
  videoCh1: string
  videoCh2: string
  revisionCh1: string
  revisionCh2: string
  bgStyle: WidgetBackgroundStyle
  cornerRadius: WidgetCornerRadius
}

interface WidgetBridgePluginInterface {
  updateWidgetData(options: WidgetPayload): Promise<{ success: boolean; widgetsUpdated: number }>
  getWidgetSettings(): Promise<WidgetPayload>
}

// Register Capacitor plugin (falls back gracefully in browser / web environments)
export const WidgetBridge = registerPlugin<WidgetBridgePluginInterface>('WidgetBridge', {
  web: {
    updateWidgetData: async (options: WidgetPayload) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('medmatrix_widget_prefs', JSON.stringify(options))
      }
      return { success: true, widgetsUpdated: 0 }
    },
    getWidgetSettings: async () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('medmatrix_widget_prefs')
        if (saved) {
          try {
            return JSON.parse(saved)
          } catch {
            // Ignore JSON parse error and use default
          }
        }
      }
      return {
        todayDate: format(new Date(), 'EEE, MMM d'),
        subject: 'Microbiology',
        mcqCh1: 'Sterilization & Disinfection',
        mcqCh2: 'Bacterial Culture Media',
        videoCh1: 'Bacterial Genetics (34m)',
        videoCh2: 'Drug Resistance (21m)',
        revisionCh1: 'General Pathology (Anki)',
        revisionCh2: 'Autonomic Pharmacology',
        bgStyle: 'frosted',
        cornerRadius: 24,
      }
    },
  },
})

export const getSavedWidgetStyles = (): { bgStyle: WidgetBackgroundStyle; cornerRadius: WidgetCornerRadius } => {
  if (typeof window === 'undefined') return { bgStyle: 'frosted', cornerRadius: 24 }
  try {
    const bg = (localStorage.getItem('medmatrix_widget_bg_style') as WidgetBackgroundStyle) || 'frosted'
    const radius = Number(localStorage.getItem('medmatrix_widget_corner_radius') || 24) as WidgetCornerRadius
    return { bgStyle: bg, cornerRadius: radius }
  } catch {
    return { bgStyle: 'frosted', cornerRadius: 24 }
  }
}

export const saveWidgetStyles = (bgStyle: WidgetBackgroundStyle, cornerRadius: WidgetCornerRadius) => {
  if (typeof window === 'undefined') return
  localStorage.setItem('medmatrix_widget_bg_style', bgStyle)
  localStorage.setItem('medmatrix_widget_corner_radius', String(cornerRadius))
}

/**
 * Extracts live user study data and pushes it to Android SharedPreferences / AppWidgetManager
 */
export async function syncActiveStudyDataToWidget(
  topics: Topic[],
  subjects: Subject[],
  activeSubjectId: string,
  overrides?: { bgStyle?: WidgetBackgroundStyle; cornerRadius?: WidgetCornerRadius }
): Promise<boolean> {
  try {
    const activeSubject = subjects.find((s) => s.id === activeSubjectId) || subjects[0]
    const subjectName = activeSubject ? activeSubject.name : 'Microbiology'

    // 1. Ward MCQs for the active subject (chapters watched last night, ready to solve)
    const wardTopics = topics.filter(
      (t) => t.status === 'STEP_2_WARD_MCQ' && t.subjectId === activeSubjectId
    )
    const mcqCh1 = wardTopics[0]?.title || 'Sterilization & Disinfection'
    const mcqCh2 = wardTopics[1]?.title || 'Bacterial Culture Media'

    // 2. Tonight's video queue for the active subject
    const videoTopics = topics.filter(
      (t) => t.status === 'STEP_1_WATCHING' && t.subjectId === activeSubjectId
    )
    const videoCh1 = videoTopics[0]
      ? `${videoTopics[0].title} (${videoTopics[0].durationMinutes}m)`
      : 'Bacterial Genetics (34m)'
    const videoCh2 = videoTopics[1]
      ? `${videoTopics[1].title} (${videoTopics[1].durationMinutes}m)`
      : 'Drug Resistance (21m)'

    // 3. Spaced revision topics
    const srTopics = topics.filter((t) => t.status === 'LOCKED_IN_SR')
    const revisionCh1 = srTopics[0]?.title || 'General Pathology (Anki)'
    const revisionCh2 = srTopics[1]?.title || 'Autonomic Pharmacology'

    // Style preferences
    const savedStyles = getSavedWidgetStyles()
    const bgStyle = overrides?.bgStyle || savedStyles.bgStyle
    const cornerRadius = overrides?.cornerRadius || savedStyles.cornerRadius

    const payload: WidgetPayload = {
      todayDate: format(new Date(), 'EEE, MMM d'),
      subject: subjectName,
      mcqCh1,
      mcqCh2,
      videoCh1,
      videoCh2,
      revisionCh1,
      revisionCh2,
      bgStyle,
      cornerRadius,
    }

    await WidgetBridge.updateWidgetData(payload)
    return true
  } catch (err) {
    console.warn('[WidgetBridge] Failed to sync data to native widget:', err)
    return false
  }
}
