import { toast } from 'sonner'
import {
  useMedMatrixStore,
  isUsableStudyData,
  markLocalHistoryRecovered,
} from '../store/useMedMatrixStore'
import { loadDataSnapshotFromDevice, saveDataSnapshotToDevice } from './widgetBridge'

/**
 * Safety net under the Zustand `localStorage` state.
 *
 * On Android the snapshot is a file in the app's private storage, so it survives
 * "clear cache", a WebView storage reset and an in-place APK update; with
 * `allowBackup` enabled it is also part of Android Auto Backup. In the browser it is
 * a second localStorage slot, which at least protects against a corrupted state key.
 *
 * Nothing here ever writes to the network or to the repository.
 */

const WRITE_DEBOUNCE_MS = 1200

let isRestoring = false
let writeTimer: ReturnType<typeof setTimeout> | null = null
let unsubscribe: (() => void) | null = null

/** Snapshot the current database immediately, skipping the debounce. */
export function writeDeviceSnapshotNow(): void {
  if (isRestoring) return
  try {
    const state = useMedMatrixStore.getState()
    // A fresh install starts at 0 and has nothing worth saving. `getSyncPayload()`
    // would stamp `Date.now()` there, which would then beat the cloud on the next
    // read, so the raw clock is checked instead.
    if (!state.lastModified) return
    const payload = { ...state.getSyncPayload(), lastModified: state.lastModified }
    void saveDataSnapshotToDevice(JSON.stringify(payload))
  } catch (err) {
    console.warn('[DeviceBackup] Could not snapshot study data:', err)
  }
}

/**
 * Restores the device snapshot when it is newer than whatever the store rehydrated.
 * On a wiped install the store starts at `lastModified: 0`, so any real snapshot wins.
 * Returns true when the database on screen was replaced.
 */
export async function restoreDeviceSnapshotIfNewer(): Promise<boolean> {
  try {
    const snapshot = await loadDataSnapshotFromDevice()
    if (!snapshot?.json) return false

    const parsed = JSON.parse(snapshot.json)
    if (!isUsableStudyData(parsed)) return false

    const current = useMedMatrixStore.getState()
    const snapshotAt = Number(parsed.lastModified) || snapshot.savedAt || 0
    if (snapshotAt <= current.lastModified) return false

    isRestoring = true
    const restored = current.loadExternalSyncData(parsed, { force: true, preserveUndo: true })
    isRestoring = false

    if (restored) {
      markLocalHistoryRecovered()
      toast.success('Recovered your study progress from the device backup.', { duration: 4000 })
    }
    return restored
  } catch (err) {
    isRestoring = false
    console.warn('[DeviceBackup] Could not restore the device snapshot:', err)
    return false
  }
}

/**
 * Mirrors every study-data change into the device snapshot. Returns a stop function.
 */
export function startDeviceSnapshotMirror(): () => void {
  if (unsubscribe) return unsubscribe

  let previousLastModified = useMedMatrixStore.getState().lastModified
  writeDeviceSnapshotNow()

  unsubscribe = useMedMatrixStore.subscribe((state) => {
    if (state.lastModified === previousLastModified) return
    previousLastModified = state.lastModified
    if (isRestoring) return

    if (writeTimer) clearTimeout(writeTimer)
    writeTimer = setTimeout(() => {
      writeTimer = null
      writeDeviceSnapshotNow()
    }, WRITE_DEBOUNCE_MS)
  })

  return () => {
    if (writeTimer) {
      clearTimeout(writeTimer)
      writeTimer = null
    }
    unsubscribe?.()
    unsubscribe = null
  }
}
