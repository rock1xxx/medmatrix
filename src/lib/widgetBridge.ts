import { Capacitor, registerPlugin } from '@capacitor/core'
import { format } from 'date-fns'
import type { Topic, Subject } from '../types'

export type WidgetBackgroundStyle = 'frosted' | 'transparent' | 'opaque'

export interface WidgetPayload {
  todayDate: string
  subject: string
  mcqCh1: string
  mcqCh2: string
  mcqCh3?: string
  videoCh1: string
  videoCh2: string
  videoCh3?: string
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

export interface DeviceSyncConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  syncKey: string
}

export interface DeviceDataSnapshot {
  /** Dated file name, `yyyy-MM-dd.json`. */
  name: string
  savedAt: number
  bytes: number
}

interface WidgetBridgePluginInterface {
  updateWidgetData(options: WidgetPayload): Promise<{ success: boolean; widgetsUpdated: number }>
  getWidgetSettings(): Promise<WidgetPayload>
  checkLaunchIntent(): Promise<{ isWidgetConfig: boolean }>
  getAppVersion(): Promise<{ versionName: string; versionCode: number }>
  downloadAndInstallApk(options?: { apkUrl?: string }): Promise<{ success: boolean; downloadId?: number; fallback?: boolean }>
  saveSyncConfig(options: DeviceSyncConfig): Promise<{ success: boolean }>
  loadSyncConfig(): Promise<DeviceSyncConfig>
  saveDataSnapshot(options: { json: string }): Promise<{ success: boolean; bytes?: number }>
  loadDataSnapshot(): Promise<{ json: string; savedAt: number }>
  listDataSnapshots(): Promise<{ snapshots: DeviceDataSnapshot[] }>
  loadDataSnapshotFile(options: { name: string }): Promise<{ json: string }>
}

// Mirrors the Android SharedPreferences file so the browser build behaves the same.
const DEVICE_SYNC_KEY = 'medmatrix_sync_config_device'

// Second copy of the whole study database, kept outside the state the store persists
// through Zustand, so a corrupt or cleared `medmatrix-storage-v2` is recoverable.
const DEVICE_DATA_KEY = 'medmatrix_data_snapshot_v1'
const DEVICE_DATA_AT_KEY = 'medmatrix_data_snapshot_v1_at'

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
    saveSyncConfig: async (options: DeviceSyncConfig) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(DEVICE_SYNC_KEY, JSON.stringify(options))
      }
      return { success: true }
    },
    loadSyncConfig: async () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(DEVICE_SYNC_KEY)
        if (saved) {
          try {
            return JSON.parse(saved) as DeviceSyncConfig
          } catch {
            // Corrupt mirror; fall through to empty config.
          }
        }
      }
      return { supabaseUrl: '', supabaseAnonKey: '', syncKey: 'dr-med-sync' }
    },
    saveDataSnapshot: async (options: { json: string }) => {
      if (typeof window !== 'undefined') {
        // Keep the previous copy so a bad write never replaces the only backup.
        const previous = localStorage.getItem(DEVICE_DATA_KEY)
        if (previous) localStorage.setItem(`${DEVICE_DATA_KEY}_prev`, previous)
        localStorage.setItem(DEVICE_DATA_KEY, options.json)
        localStorage.setItem(DEVICE_DATA_AT_KEY, String(Date.now()))
      }
      return { success: true, bytes: options.json.length }
    },
    loadDataSnapshot: async () => {
      if (typeof window !== 'undefined') {
        const json =
          localStorage.getItem(DEVICE_DATA_KEY) ||
          localStorage.getItem(`${DEVICE_DATA_KEY}_prev`)
        if (json) {
          return {
            json,
            savedAt: Number(localStorage.getItem(DEVICE_DATA_AT_KEY) || 0),
          }
        }
      }
      return { json: '', savedAt: 0 }
    },
    // Dated history lives in the Android app's files dir; a browser has no private
    // storage of its own, and mirroring 14 copies into localStorage would blow the
    // quota, so the browser reports an empty history and relies on the cloud copy.
    listDataSnapshots: async () => ({ snapshots: [] }),
    loadDataSnapshotFile: async () => ({ json: '' }),
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
  /** True inside the Android APK. The startup banner is Android-only. */
  isNativeApp: boolean
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
    // Only the Android APK can install an APK, so the in-app update prompt is
    // meaningless (and misleading) in the browser build.
    const isNativeApp = Capacitor.isNativePlatform()

    let currentVersion = '1.0'
    let currentVersionCode = 0
    try {
      const ver = await WidgetBridge.getAppVersion()
      if (ver?.versionName) currentVersion = ver.versionName
      if (ver?.versionCode) currentVersionCode = ver.versionCode
    } catch {
      // web fallback
    }

    let isPrivateRepo404 = false
    let res: Response | null = null
    try {
      res = await fetch(
        'https://api.github.com/repos/rock1xxx/medmatrix/releases/tags/android-latest',
        {
          headers: { Accept: 'application/vnd.github.v3+json' },
        }
      )
    } catch (e) {
      console.warn('[WidgetBridge] GitHub fetch network error:', e)
    }

    let data: any
    if (res && res.ok) {
      data = await res.json()
    } else {
      if (res && res.status === 404) {
        isPrivateRepo404 = true
      }
      try {
        const fallbackRes = await fetch(
          'https://api.github.com/repos/rock1xxx/medmatrix/releases/latest',
          {
            headers: { Accept: 'application/vnd.github.v3+json' },
          }
        )
        if (fallbackRes.ok) {
          data = await fallbackRes.json()
          isPrivateRepo404 = false
        } else if (fallbackRes.status === 404) {
          isPrivateRepo404 = true
        }
      } catch (e) {
        console.warn('[WidgetBridge] GitHub fallback fetch error:', e)
      }
    }

    if (!data) {
      if (isPrivateRepo404) {
        throw new Error('PRIVATE_REPO_404')
      }
      return null
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

    // The rolling android-latest release keeps its original published_at forever, so a
    // rebuilt APK would never look newer. The asset's updated_at moves on every
    // --clobber upload, which is what actually identifies a fresh build.
    const publishedAt =
      apkAsset?.updated_at || data.published_at || new Date().toISOString()
    const releaseNotes = data.body || 'Performance improvements and widget enhancements.'

    // CI puts the build number in the rolling release title ("… — build 42"),
    // because release *assets* are served without CORS headers and a WebView cannot
    // read version.json directly. The API response itself is CORS-friendly.
    let remoteVersionCode: number | null = null
    let remoteVersionName = ''
    const buildFromTitle = /build\s+#?(\d+)/i.exec(data.name || '')
    const buildFromTag = /^v1\.0\.(\d+)$/.exec(data.tag_name || '')
    const buildFromNotes = /build\s+#?(\d+)/i.exec(data.body || '')
    const parsedBuild = Number(
      buildFromTitle?.[1] || buildFromTag?.[1] || buildFromNotes?.[1] || 0
    )
    if (Number.isFinite(parsedBuild) && parsedBuild > 0) {
      remoteVersionCode = parsedBuild
      remoteVersionName = `1.0.${parsedBuild}`
    } else {
      // Older releases have no build number in the metadata; version.json is the
      // only source, and it may be blocked by CORS. Best effort only.
      const versionAsset = data.assets?.find((a: any) => a.name === 'version.json')
      if (versionAsset?.browser_download_url) {
        try {
          const versionRes = await fetch(versionAsset.browser_download_url, { cache: 'no-store' })
          if (versionRes.ok) {
            const meta = await versionRes.json()
            const code = Number(meta?.versionCode)
            if (Number.isFinite(code) && code > 0) remoteVersionCode = code
            if (typeof meta?.versionName === 'string') remoteVersionName = meta.versionName
          }
        } catch (e) {
          console.warn('[WidgetBridge] Could not read published build info:', e)
        }
      }
    }

    const latestVersion = remoteVersionName || data.name || data.tag_name || 'Latest'
    // Kept platform-agnostic so the browser checker can still report an APK build.
    const isUpdateAvailable =
      currentVersionCode > 0 &&
      remoteVersionCode !== null &&
      remoteVersionCode > currentVersionCode

    return {
      currentVersion,
      currentVersionCode,
      latestVersion,
      publishedAt,
      releaseNotes,
      apkUrl,
      apkSizeMb,
      isUpdateAvailable,
      isNativeApp,
    }
  } catch (err: any) {
    if (err?.message === 'PRIVATE_REPO_404') {
      throw err
    }
    console.warn('[WidgetBridge] Failed to fetch update info:', err)
    return null
  }
}

export async function saveSyncConfigToDevice(config: DeviceSyncConfig): Promise<void> {
  try {
    await WidgetBridge.saveSyncConfig(config)
  } catch (err) {
    console.warn('[WidgetBridge] Could not mirror sync config to device storage:', err)
  }
}

export async function loadSyncConfigFromDevice(): Promise<DeviceSyncConfig | null> {
  try {
    const cfg = await WidgetBridge.loadSyncConfig()
    if (cfg?.supabaseUrl && cfg?.supabaseAnonKey) {
      return {
        supabaseUrl: cfg.supabaseUrl,
        supabaseAnonKey: cfg.supabaseAnonKey,
        syncKey: cfg.syncKey || 'dr-med-sync',
      }
    }
    return null
  } catch (err) {
    console.warn('[WidgetBridge] Could not read sync config from device storage:', err)
    return null
  }
}

export async function saveDataSnapshotToDevice(json: string): Promise<boolean> {
  try {
    const res = await WidgetBridge.saveDataSnapshot({ json })
    return !!res?.success
  } catch (err) {
    console.warn('[WidgetBridge] Could not write the device data snapshot:', err)
    return false
  }
}

/**
 * The last full study database written to the device, if any. On Android this is a
 * file in the app's private storage; in the browser it is a second localStorage slot.
 */
export async function loadDataSnapshotFromDevice(): Promise<{ json: string; savedAt: number } | null> {
  try {
    const res = await WidgetBridge.loadDataSnapshot()
    if (res?.json) return { json: res.json, savedAt: Number(res.savedAt) || 0 }
    return null
  } catch (err) {
    console.warn('[WidgetBridge] Could not read the device data snapshot:', err)
    return null
  }
}

export async function listDeviceSnapshots(): Promise<DeviceDataSnapshot[]> {
  try {
    const res = await WidgetBridge.listDataSnapshots()
    return Array.isArray(res?.snapshots) ? res.snapshots : []
  } catch (err) {
    console.warn('[WidgetBridge] Could not list device snapshots:', err)
    return []
  }
}

export async function loadDeviceSnapshotByName(name: string): Promise<string | null> {
  try {
    const res = await WidgetBridge.loadDataSnapshotFile({ name })
    return res?.json ? res.json : null
  } catch (err) {
    console.warn('[WidgetBridge] Could not read that device snapshot:', err)
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
    const mcqCh3 = wardTopics[2]?.title || 'Staphylococci & Streptococci'

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
    const videoCh3 = videoTopics[2]
      ? `${videoTopics[2].title}${showDuration ? ` (${videoTopics[2].durationMinutes}m)` : ''}`
      : (showDuration ? 'Antimicrobial Therapy (18m)' : 'Antimicrobial Therapy')

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
      mcqCh3,
      videoCh1,
      videoCh2,
      videoCh3,
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
