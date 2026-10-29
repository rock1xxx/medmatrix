import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useMedMatrixStore } from '../store/useMedMatrixStore'
import { loadSyncConfigFromDevice, saveSyncConfigToDevice } from './widgetBridge'
import { toast } from 'sonner'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'not_configured'

interface SyncListener {
  (status: SyncStatus, lastSyncTime?: Date): void
}

let syncStatus: SyncStatus = 'idle'
let lastSyncTime: Date | null = null
const listeners = new Set<SyncListener>()

let supabaseClient: SupabaseClient | null = null
let currentUrl = ''
let currentKey = ''
let realtimeChannel: ReturnType<SupabaseClient['channel']> | null = null

// Never upload before we have seen the cloud copy at least once. A fresh install
// starts at lastModified 0; if the first pull fails (offline, bad key) and the user
// edits something, the bump would otherwise make the seed data out-rank the real
// progress sitting in Supabase.
let hasPulledOnce = false

function getClient(): SupabaseClient | null {
  const { syncConfig } = useMedMatrixStore.getState()
  if (!syncConfig.supabaseUrl || !syncConfig.supabaseAnonKey) {
    return null
  }

  if (
    supabaseClient &&
    currentUrl === syncConfig.supabaseUrl &&
    currentKey === syncConfig.supabaseAnonKey
  ) {
    return supabaseClient
  }

  try {
    currentUrl = syncConfig.supabaseUrl
    currentKey = syncConfig.supabaseAnonKey
    supabaseClient = createClient(currentUrl, currentKey, {
      auth: { persistSession: false },
    })
    setupRealtimeSubscription()
    return supabaseClient
  } catch (err) {
    console.warn('[SyncEngine] Failed to init Supabase client:', err)
    return null
  }
}

function setupRealtimeSubscription() {
  if (!supabaseClient) return
  const { syncConfig } = useMedMatrixStore.getState()
  const syncKey = syncConfig.syncKey || 'dr-med-sync'

  if (realtimeChannel) {
    try {
      supabaseClient.removeChannel(realtimeChannel)
    } catch {}
  }

  try {
    realtimeChannel = supabaseClient
      .channel(`sync-channel-${syncKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medmatrix_sync',
          filter: `id=eq.${syncKey}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).data) {
            const remoteData = (payload.new as any).data
            const remoteLastModified = Number((payload.new as any).last_modified || remoteData.lastModified)
            const localLastModified = useMedMatrixStore.getState().lastModified

            if (remoteLastModified > localLastModified) {
              const updated = useMedMatrixStore.getState().loadExternalSyncData(remoteData)
              if (updated) {
                setStatus('synced')
                toast.success('Live Sync: Study progress updated from your other device!')
              }
            }
          }
        }
      )
      .subscribe()
  } catch (e) {
    console.warn('[SyncEngine] Realtime subscription error:', e)
  }
}

function setStatus(status: SyncStatus) {
  syncStatus = status
  if (status === 'synced') {
    lastSyncTime = new Date()
  }
  listeners.forEach((fn) => fn(syncStatus, lastSyncTime || undefined))
}

export function subscribeSyncStatus(fn: SyncListener) {
  listeners.add(fn)
  fn(syncStatus, lastSyncTime || undefined)
  return () => {
    listeners.delete(fn)
  }
}

export function getSyncStatus() {
  return { status: syncStatus, lastSyncTime }
}

/**
 * Test user-entered credentials before saving
 */
export async function testSupabaseConnection(
  url: string,
  anonKey: string,
  syncKey: string = 'dr-med-sync'
): Promise<{ ok: boolean; message: string }> {
  try {
    const testClient = createClient(url.trim(), anonKey.trim(), {
      auth: { persistSession: false },
    })

    const { error } = await testClient
      .from('medmatrix_sync')
      .select('id')
      .eq('id', syncKey)
      .limit(1)

    if (error) {
      if (error.code === '42P01') {
        return {
          ok: false,
          message: 'Connected, but table "medmatrix_sync" does not exist yet. Run the SQL setup script in your Supabase dashboard.',
        }
      }
      return { ok: false, message: error.message }
    }

    return { ok: true, message: 'Successfully connected to Supabase cloud database!' }
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Invalid Supabase URL or Key' }
  }
}

/**
 * Pull latest state from Supabase
 */
export async function pullLatestState(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setStatus('offline')
    return false
  }

  const client = getClient()
  if (!client) {
    setStatus('not_configured')
    return false
  }

  setStatus('syncing')
  const store = useMedMatrixStore.getState()
  const syncKey = store.syncConfig.syncKey || 'dr-med-sync'

  try {
    const { data, error } = await client
      .from('medmatrix_sync')
      .select('data, last_modified')
      .eq('id', syncKey)
      .maybeSingle()

    if (error) {
      console.warn('[SyncEngine] Supabase select error:', error)
      setStatus('error')
      return false
    }

    hasPulledOnce = true

    if (data && data.data) {
      const remoteData = data.data
      const remoteLastModified = Number(data.last_modified || remoteData.lastModified)

      if (remoteLastModified > store.lastModified) {
        const didUpdate = store.loadExternalSyncData(remoteData)
        if (didUpdate) {
          toast.success('Synced progress from other device!', {
            duration: 2500,
          })
          setStatus('synced')
          return true
        }
      } else if (store.lastModified > remoteLastModified) {
        await pushLocalState()
        setStatus('synced')
        return true
      }
    }

    setStatus('synced')
    return false
  } catch (err) {
    console.warn('[SyncEngine] pull failed:', err)
    setStatus('error')
    return false
  }
}

/**
 * Push local state to Supabase
 */
export async function pushLocalState(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setStatus('offline')
    return false
  }

  const client = getClient()
  if (!client) {
    setStatus('not_configured')
    return false
  }

  if (!hasPulledOnce) {
    // The debounced auto-push must wait until the cloud copy has been read once.
    // Manual sync and the post-pull push path still work (they pull first).
    return false
  }

  setStatus('syncing')
  const store = useMedMatrixStore.getState()
  const syncKey = store.syncConfig.syncKey || 'dr-med-sync'
  const payload = store.getSyncPayload()

  try {
    const { error } = await client.from('medmatrix_sync').upsert({
      id: syncKey,
      data: payload,
      last_modified: payload.lastModified,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.warn('[SyncEngine] Supabase upsert error:', error)
      setStatus('error')
      return false
    }

    setStatus('synced')
    return true
  } catch (err) {
    console.warn('[SyncEngine] push failed:', err)
    setStatus('error')
    return false
  }
}

/**
 * Immediate bidirectional manual sync
 */
export async function triggerManualSync(showToast = true) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setStatus('offline')
    if (showToast) toast.error('Device is offline. Connect to internet to sync.')
    return
  }

  const client = getClient()
  if (!client) {
    setStatus('not_configured')
    if (showToast) toast.info('Supabase cloud credentials not set yet. Enter your URL & Key below.')
    return
  }

  setStatus('syncing')
  const store = useMedMatrixStore.getState()
  const syncKey = store.syncConfig.syncKey || 'dr-med-sync'

  try {
    const { data, error } = await client
      .from('medmatrix_sync')
      .select('data, last_modified')
      .eq('id', syncKey)
      .maybeSingle()

    if (error) {
      setStatus('error')
      if (showToast) toast.error(`Supabase error: ${error.message}`)
      return
    }

    // A successful read means it is safe to write from now on.
    hasPulledOnce = true

    if (data && data.data) {
      const remote = data.data
      const remoteLastModified = Number(data.last_modified || remote.lastModified)

      if (remoteLastModified > store.lastModified) {
        store.loadExternalSyncData(remote)
        if (showToast) toast.success('Pulled latest study progress from Supabase!')
        setStatus('synced')
        return
      } else if (store.lastModified > remoteLastModified) {
        await pushLocalState()
        if (showToast) toast.success('Pushed latest local progress to Supabase!')
        setStatus('synced')
        return
      } else {
        if (showToast) toast.success('All devices in sync!')
        setStatus('synced')
        return
      }
    }

    // No record exists in Supabase yet -> upload initial study database
    await pushLocalState()
    if (showToast) toast.success('Initial study progress saved to Supabase cloud!')
    setStatus('synced')
  } catch (e: any) {
    setStatus('error')
    if (showToast) toast.error(`Sync failed: ${e?.message || 'Check network'}`)
  }
}

/**
 * Background auto-sync listener
 */
let isInitialized = false

/**
 * Finds Supabase credentials for this install. Order of preference:
 *   1. what the user already saved in this install (localStorage)
 *   2. values compiled into the APK by CI from repository secrets
 *   3. the copy mirrored in Android SharedPreferences / the browser mirror
 * Must finish before initSyncEngine() so the very first pull already has a client.
 */
export async function bootstrapSyncConfig(): Promise<void> {
  const state = useMedMatrixStore.getState()
  if (state.syncConfig.supabaseUrl && state.syncConfig.supabaseAnonKey) {
    // Already configured (user-entered or compiled in). Keep the device mirror in
    // sync without rewriting SharedPreferences on every single launch.
    const current = {
      supabaseUrl: state.syncConfig.supabaseUrl,
      supabaseAnonKey: state.syncConfig.supabaseAnonKey,
      syncKey: state.syncConfig.syncKey || 'dr-med-sync',
    }
    void loadSyncConfigFromDevice().then((saved) => {
      if (
        !saved ||
        saved.supabaseUrl !== current.supabaseUrl ||
        saved.supabaseAnonKey !== current.supabaseAnonKey ||
        saved.syncKey !== current.syncKey
      ) {
        void saveSyncConfigToDevice(current)
      }
    })
    return
  }

  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || ''
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || ''
  let url = envUrl
  let key = envKey
  let syncKey = state.syncConfig.syncKey || 'dr-med-sync'

  if (!url || !key) {
    const saved = await loadSyncConfigFromDevice()
    if (saved) {
      url = saved.supabaseUrl
      key = saved.supabaseAnonKey
      syncKey = saved.syncKey || syncKey
    }
  }

  if (url && key) {
    useMedMatrixStore.getState().restoreSyncConfig(url, key, syncKey)
  }
}

export function initSyncEngine() {
  if (isInitialized || typeof window === 'undefined') return
  isInitialized = true

  // Initial pull if configured
  pullLatestState()

  // 1. Online / Offline listeners
  window.addEventListener('online', () => {
    setStatus('syncing')
    pullLatestState()
  })

  window.addEventListener('offline', () => {
    setStatus('offline')
  })

  // 2. Visibility change: whenever user switches to MedMatrix PWA on Phone/iPad/Mac
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pullLatestState()
    }
  })

  // 3. Debounced push on local state updates
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null
  let prevLastModified = useMedMatrixStore.getState().lastModified

  useMedMatrixStore.subscribe((state) => {
    if (state.lastModified !== prevLastModified) {
      prevLastModified = state.lastModified
      if (debounceTimeout) clearTimeout(debounceTimeout)
      debounceTimeout = setTimeout(() => {
        pushLocalState()
      }, 1500)
    }
  })
}
