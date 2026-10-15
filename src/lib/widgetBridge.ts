import { registerPlugin } from '@capacitor/core'
import { format } from 'date-fns'
import type { Topic, Subject } from '../types'

export type WidgetBackgroundStyle = 'frosted' | 'transparent' | 'opaque'

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
  cornerRadius: number
  opacity?: number
  blur?: number
  designVariant?: string
}

export interface WidgetSliderSettings {
  opacity: number // 0 - 100
  blur: number // 0 - 32px
  cornerRadius: number // 0 - 40dp
  design2x2: string
  design4x2: string
  design4x4: string
}

interface WidgetBridgePluginInterface {
  updateWidgetData(options: WidgetPayload): Promise<{ success: boolean; widgetsUpdated: number }>
  getWidgetSettings(): Promise<WidgetPayload>
  checkLaunchIntent(): Promise<{ isWidgetConfig: boolean }>
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
            // Ignore error
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
        opacity: 85,
        blur: 18,
      }
    },
    checkLaunchIntent: async () => {
      if (typeof window !== 'undefined') {
        const search = window.location.search
        const hash = window.location.hash
        const isConfig = search.includes('widget') || hash.includes('widget')
        return { isWidgetConfig: isConfig }
      }
      return { isWidgetConfig: false }
    },
  },
})

export async function checkIsWidgetConfigLaunch(): Promise<boolean> {
  try {
    const res = await WidgetBridge.checkLaunchIntent()
    return !!res?.isWidgetConfig
  } catch {
    return false
  }
}

export const getSavedSliderSettings = (): WidgetSliderSettings => {
  if (typeof window === 'undefined') {
    return {
      opacity: 85,
      blur: 18,
      cornerRadius: 24,
      design2x2: 'hero',
      design4x2: 'desk',
      design4x4: 'three-tier',
    }
  }
  try {
    const opacity = Number(localStorage.getItem('medmatrix_widget_opacity') ?? 85)
    const blur = Number(localStorage.getItem('medmatrix_widget_blur') ?? 18)
    const radius = Number(localStorage.getItem('medmatrix_widget_radius') ?? 24)
    const design2x2 = localStorage.getItem('medmatrix_widget_design_2x2') || 'hero'
    const design4x2 = localStorage.getItem('medmatrix_widget_design_4x2') || 'desk'
    const design4x4 = localStorage.getItem('medmatrix_widget_design_4x4') || 'three-tier'
    return {
      opacity: isNaN(opacity) ? 85 : opacity,
      blur: isNaN(blur) ? 18 : blur,
      cornerRadius: isNaN(radius) ? 24 : radius,
      design2x2,
      design4x2,
      design4x4,
    }
  } catch {
    return {
      opacity: 85,
      blur: 18,
      cornerRadius: 24,
      design2x2: 'hero',
      design4x2: 'desk',
      design4x4: 'three-tier',
    }
  }
}

export const saveSliderSettings = (settings: Partial<WidgetSliderSettings>) => {
  if (typeof window === 'undefined') return
  if (settings.opacity !== undefined) {
    localStorage.setItem('medmatrix_widget_opacity', String(settings.opacity))
  }
  if (settings.blur !== undefined) {
    localStorage.setItem('medmatrix_widget_blur', String(settings.blur))
  }
  if (settings.cornerRadius !== undefined) {
    localStorage.setItem('medmatrix_widget_radius', String(settings.cornerRadius))
  }
  if (settings.design2x2) {
    localStorage.setItem('medmatrix_widget_design_2x2', settings.design2x2)
  }
  if (settings.design4x2) {
    localStorage.setItem('medmatrix_widget_design_4x2', settings.design4x2)
  }
  if (settings.design4x4) {
    localStorage.setItem('medmatrix_widget_design_4x4', settings.design4x4)
  }
}

/**
 * Extracts live user study data and pushes it to Android SharedPreferences / AppWidgetManager
 */
export async function syncActiveStudyDataToWidget(
  topics: Topic[],
  subjects: Subject[],
  activeSubjectId: string,
  overrides?: Partial<WidgetSliderSettings>
): Promise<boolean> {
  try {
    const activeSubject = subjects.find((s) => s.id === activeSubjectId) || subjects[0]
    const subjectName = activeSubject ? activeSubject.name : 'Microbiology'

    // 1. Ward MCQs for active subject (chapters watched last night)
    const wardTopics = topics.filter(
      (t) => t.status === 'STEP_2_WARD_MCQ' && t.subjectId === activeSubjectId
    )
    const mcqCh1 = wardTopics[0]?.title || 'Sterilization & Disinfection'
    const mcqCh2 = wardTopics[1]?.title || 'Bacterial Culture Media'

    // 2. Tonight's video queue for active subject
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

    // Slider settings
    const saved = getSavedSliderSettings()
    const opacity = overrides?.opacity ?? saved.opacity
    const blur = overrides?.blur ?? saved.blur
    const cornerRadius = overrides?.cornerRadius ?? saved.cornerRadius

    // Map opacity to category for Android drawables
    let bgStyle: WidgetBackgroundStyle = 'frosted'
    if (opacity <= 35) {
      bgStyle = 'transparent'
    } else if (opacity >= 95) {
      bgStyle = 'opaque'
    }

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
      opacity,
      blur,
    }

    await WidgetBridge.updateWidgetData(payload)
    return true
  } catch (err) {
    console.warn('[WidgetBridge] Failed to sync data to native widget:', err)
    return false
  }
}
