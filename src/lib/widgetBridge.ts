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
  showBorder?: boolean
  showDuration?: boolean
  edgeToEdge?: boolean
  fontScale?: number
  design4x1?: string
}

export interface WidgetSliderSettings {
  opacity: number // 0 - 100
  blur: number // 0 - 32px
  cornerRadius: number // 0 - 40dp
  design2x2: string
  design4x1: string
  design4x2: string
  design4x4: string
  showBorder: boolean
  showDuration: boolean
  edgeToEdge: boolean
  fontScale: number
}

interface WidgetBridgePluginInterface {
  updateWidgetData(options: WidgetPayload): Promise<{ success: boolean; widgetsUpdated: number }>
  getWidgetSettings(): Promise<WidgetPayload>
  checkLaunchIntent(): Promise<{ isWidgetConfig: boolean }>
  getAppVersion(): Promise<{ versionName: string; versionCode: number }>
  downloadAndInstallApk(options?: { apkUrl?: string }): Promise<{ success: boolean; downloadId?: number; fallback?: boolean }>
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
    getAppVersion: async () => {
      return { versionName: '1.0', versionCode: 1 }
    },
    downloadAndInstallApk: async (options?: { apkUrl?: string }) => {
      const url = options?.apkUrl || 'https://github.com/rock1xxx/medmatrix/releases/download/android-latest/MedMatrix.apk'
      if (typeof window !== 'undefined') {
        window.open(url, '_blank')
      }
      return { success: true, fallback: true }
    },
  },
})

export interface AppUpdateInfo {
  currentVersion: string
  currentVersionCode?: number
  latestVersion: string
  publishedAt: string
  releaseNotes: string
  apkUrl: string
  apkSizeMb: number
  isUpdateAvailable: boolean
}

export async function checkIsWidgetConfigLaunch(): Promise<boolean> {
  try {
    const res = await WidgetBridge.checkLaunchIntent()
    return !!res?.isWidgetConfig
  } catch {
    return false
  }
}

export async function fetchLatestAppUpdate(): Promise<AppUpdateInfo | null> {
  try {
    let currentVersion = '1.0'
    let currentVersionCode = 1
    try {
      const ver = await WidgetBridge.getAppVersion()
      if (ver?.versionName) currentVersion = ver.versionName
      if (ver?.versionCode) currentVersionCode = ver.versionCode
    } catch {
      // web fallback
    }

    const res = await fetch(
      'https://api.github.com/repos/rock1xxx/medmatrix/releases/tags/android-latest',
      {
        headers: { Accept: 'application/vnd.github.v3+json' },
      }
    )

    let data: any
    if (res.ok) {
      data = await res.json()
    } else {
      const fallbackRes = await fetch(
        'https://api.github.com/repos/rock1xxx/medmatrix/releases/latest'
      )
      if (!fallbackRes.ok) return null
      data = await fallbackRes.json()
    }

    const apkAsset = data.assets?.find((a: any) =>
      a.name.toLowerCase().endsWith('.apk')
    )
    const apkUrl =
      apkAsset?.browser_download_url ||
      'https://github.com/rock1xxx/medmatrix/releases/download/android-latest/MedMatrix.apk'
    const apkSizeMb = apkAsset?.size
      ? Math.round((apkAsset.size / (1024 * 1024)) * 10) / 10
      : 15.5

    const publishedAt = data.published_at || new Date().toISOString()
    const latestVersion = data.name || data.tag_name || 'Latest'
    const releaseNotes = data.body || 'Performance improvements and widget enhancements.'

    const lastKnownRelease = localStorage.getItem('medmatrix_installed_release_date')
    const isNewer = !lastKnownRelease || new Date(publishedAt).getTime() > new Date(lastKnownRelease).getTime()

    return {
      currentVersion,
      currentVersionCode,
      latestVersion,
      publishedAt,
      releaseNotes,
      apkUrl,
      apkSizeMb,
      isUpdateAvailable: isNewer,
    }
  } catch (err) {
    console.warn('[WidgetBridge] Failed to fetch update info:', err)
    return null
  }
}

export async function triggerInAppApkUpdate(apkUrl?: string): Promise<boolean> {
  try {
    const url = apkUrl || 'https://github.com/rock1xxx/medmatrix/releases/download/android-latest/MedMatrix.apk'
    const res = await WidgetBridge.downloadAndInstallApk({ apkUrl: url })
    return !!res.success
  } catch (err) {
    console.warn('[WidgetBridge] Failed to trigger update:', err)
    if (typeof window !== 'undefined') {
      window.open(apkUrl || 'https://github.com/rock1xxx/medmatrix/releases/download/android-latest/MedMatrix.apk', '_blank')
    }
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
      design4x1: 'pill-multi',
      design4x2: 'desk',
      design4x4: 'three-tier',
      showBorder: true,
      showDuration: true,
      edgeToEdge: false,
      fontScale: 100,
    }
  }
  try {
    const opacity = Number(localStorage.getItem('medmatrix_widget_opacity') ?? 85)
    const blur = Number(localStorage.getItem('medmatrix_widget_blur') ?? 18)
    const radius = Number(localStorage.getItem('medmatrix_widget_radius') ?? 24)
    const design2x2 = localStorage.getItem('medmatrix_widget_design_2x2') || 'hero'
    const design4x1 = localStorage.getItem('medmatrix_widget_design_4x1') || 'pill-multi'
    const design4x2 = localStorage.getItem('medmatrix_widget_design_4x2') || 'desk'
    const design4x4 = localStorage.getItem('medmatrix_widget_design_4x4') || 'three-tier'
    const showBorder = localStorage.getItem('medmatrix_widget_show_border') !== 'false'
    const showDuration = localStorage.getItem('medmatrix_widget_show_duration') !== 'false'
    const edgeToEdge = localStorage.getItem('medmatrix_widget_edge_to_edge') === 'true'
    const fontScale = Number(localStorage.getItem('medmatrix_widget_font_scale') ?? 100)

    return {
      opacity: isNaN(opacity) ? 85 : opacity,
      blur: isNaN(blur) ? 18 : blur,
      cornerRadius: isNaN(radius) ? 24 : radius,
      design2x2,
      design4x1,
      design4x2,
      design4x4,
      showBorder,
      showDuration,
      edgeToEdge,
      fontScale: isNaN(fontScale) ? 100 : fontScale,
    }
  } catch {
    return {
      opacity: 85,
      blur: 18,
      cornerRadius: 24,
      design2x2: 'hero',
      design4x1: 'pill-multi',
      design4x2: 'desk',
      design4x4: 'three-tier',
      showBorder: true,
      showDuration: true,
      edgeToEdge: false,
      fontScale: 100,
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
  if (settings.design4x1) {
    localStorage.setItem('medmatrix_widget_design_4x1', settings.design4x1)
  }
  if (settings.design4x2) {
    localStorage.setItem('medmatrix_widget_design_4x2', settings.design4x2)
  }
  if (settings.design4x4) {
    localStorage.setItem('medmatrix_widget_design_4x4', settings.design4x4)
  }
  if (settings.showBorder !== undefined) {
    localStorage.setItem('medmatrix_widget_show_border', String(settings.showBorder))
  }
  if (settings.showDuration !== undefined) {
    localStorage.setItem('medmatrix_widget_show_duration', String(settings.showDuration))
  }
  if (settings.edgeToEdge !== undefined) {
    localStorage.setItem('medmatrix_widget_edge_to_edge', String(settings.edgeToEdge))
  }
  if (settings.fontScale !== undefined) {
    localStorage.setItem('medmatrix_widget_font_scale', String(settings.fontScale))
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

    // Slider settings
    const saved = getSavedSliderSettings()
    const opacity = overrides?.opacity ?? saved.opacity
    const blur = overrides?.blur ?? saved.blur
    const cornerRadius = overrides?.cornerRadius ?? saved.cornerRadius
    const showBorder = overrides?.showBorder ?? saved.showBorder
    const showDuration = overrides?.showDuration ?? saved.showDuration
    const edgeToEdge = overrides?.edgeToEdge ?? saved.edgeToEdge
    const fontScale = overrides?.fontScale ?? saved.fontScale
    const design4x1 = overrides?.design4x1 ?? saved.design4x1

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
    let videoCh1 = videoTopics[0]
      ? `${videoTopics[0].title}${showDuration ? ` (${videoTopics[0].durationMinutes}m)` : ''}`
      : (showDuration ? 'Bacterial Genetics (34m)' : 'Bacterial Genetics')
    let videoCh2 = videoTopics[1]
      ? `${videoTopics[1].title}${showDuration ? ` (${videoTopics[1].durationMinutes}m)` : ''}`
      : (showDuration ? 'Drug Resistance (21m)' : 'Drug Resistance')

    // 3. Spaced revision topics
    const srTopics = topics.filter((t) => t.status === 'LOCKED_IN_SR')
    const revisionCh1 = srTopics[0]?.title || 'General Pathology (Anki)'
    const revisionCh2 = srTopics[1]?.title || 'Autonomic Pharmacology'

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
      showBorder,
      showDuration,
      edgeToEdge,
      fontScale,
      design4x1,
    }

    await WidgetBridge.updateWidgetData(payload)
    return true
  } catch (err) {
    console.warn('[WidgetBridge] Failed to sync data to native widget:', err)
    return false
  }
}
