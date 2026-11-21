import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import {
  triggerManualSync,
  subscribeSyncStatus,
  testSupabaseConnection,
  SyncStatus,
} from '../../lib/syncEngine'
import {
  listDeviceSnapshots,
  loadDeviceSnapshotByName,
  DeviceDataSnapshot,
} from '../../lib/widgetBridge'
import {
  X,
  RefreshCw,
  Database,
  Download,
  Upload,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  HardDriveDownload,
  History,
  RotateCcw,
  Loader2,
  Cloud,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'

interface SyncModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'cloud' | 'backups'
}

const SQL_SNIPPET = `-- Run this in your Supabase SQL Editor:
create table if not exists medmatrix_sync (
  id text primary key,
  data jsonb not null,
  last_modified bigint not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table medmatrix_sync enable row level security;

create policy "Anon full access" on medmatrix_sync
  for all using (true) with check (true);

alter publication supabase_realtime add table medmatrix_sync;`

const formatSnapshotDay = (name: string) => {
  const [year, month, day] = name.replace('.json', '').split('-')
  if (!year || !month || !day) return name
  try {
    return new Date(`${year}-${month}-${day}T00:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return name
  }
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'cloud',
}) => {
  const {
    syncConfig,
    setSupabaseConfig,
    clearSupabaseConfig,
    exportDataJSON,
    importDataJSON,
    restoreLastGoodState,
    hasLastGoodState,
    resetToInitialSeed,
    adoptBackup,
    lastModified,
  } = useMedMatrixStore()

  const [activeTab, setActiveTab] = useState<'cloud' | 'backups'>(initialTab)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>(undefined)
  const [urlInput, setUrlInput] = useState(syncConfig.supabaseUrl || '')
  const [keyInput, setKeyInput] = useState(syncConfig.supabaseAnonKey || '')
  const [syncKeyInput, setSyncKeyInput] = useState(syncConfig.syncKey || 'dr-med-sync')
  const [isTesting, setIsTesting] = useState(false)
  const [showSqlGuide, setShowSqlGuide] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)

  // Backups & recovery states
  const [snapshots, setSnapshots] = useState<DeviceDataSnapshot[]>([])
  const [loadingSnapshots, setLoadingSnapshots] = useState(false)
  const [restoringName, setRestoringName] = useState<string | null>(null)
  const [pendingSnapshotName, setPendingSnapshotName] = useState<string | null>(null)
  const [confirmResetSeed, setConfirmResetSeed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadSnapshots = async () => {
    setLoadingSnapshots(true)
    const list = await listDeviceSnapshots()
    setSnapshots(list)
    setLoadingSnapshots(false)
  }

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      setPendingSnapshotName(null)
      setConfirmResetSeed(false)
    }
  }, [isOpen, initialTab])

  useEffect(() => {
    if (isOpen && activeTab === 'backups') {
      void loadSnapshots()
    }
  }, [isOpen, activeTab])

  useEffect(() => {
    setUrlInput(syncConfig.supabaseUrl || '')
    setKeyInput(syncConfig.supabaseAnonKey || '')
    setSyncKeyInput(syncConfig.syncKey || 'dr-med-sync')
  }, [syncConfig])

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((status, time) => {
      setSyncStatus(status)
      setLastSyncTime(time)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isConfigured = Boolean(syncConfig.supabaseUrl && syncConfig.supabaseAnonKey)
  const canUndoOverwrite = hasLastGoodState()

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!urlInput.trim() || !keyInput.trim()) {
      toast.error('Please enter both Supabase Project URL and Anon Key')
      return
    }

    setIsTesting(true)
    const result = await testSupabaseConnection(urlInput, keyInput, syncKeyInput)
    setIsTesting(false)

    if (result.ok) {
      setSupabaseConfig(urlInput, keyInput, syncKeyInput)
      toast.success(result.message)
      setTimeout(() => triggerManualSync(false), 500)
    } else {
      toast.error(result.message)
    }
  }

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SNIPPET)
    setCopiedSql(true)
    toast.success('SQL setup script copied to clipboard!')
    setTimeout(() => setCopiedSql(false), 2000)
  }

  const handleExport = () => {
    const json = exportDataJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '')
    a.download = `MedMatrix_Backup_${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup JSON downloaded')
  }

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        importDataJSON(content)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleRestoreSnapshot = async (snapshot: DeviceDataSnapshot) => {
    const when = formatSnapshotDay(snapshot.name)
    setRestoringName(snapshot.name)
    setPendingSnapshotName(null)
    try {
      const raw = await loadDeviceSnapshotByName(snapshot.name)
      if (!raw) {
        toast.error('That backup file could not be read.')
        return
      }
      adoptBackup(JSON.parse(raw), `the copy from ${when}`)
    } catch {
      toast.error('That backup file is not valid JSON.')
    } finally {
      setRestoringName(null)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm p-3 sm:p-4 flex animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sync and Backups"
        className="m-auto w-full max-w-sm sm:max-w-md bg-[#121216] border border-[#26262e] rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-800 bg-[#121216]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Sync &amp; Backups</h2>
              <p className="text-[10.5px] text-zinc-400">
                Cloud sync, JSON backups &amp; 14-day device snapshots
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close sync and backups"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 2-Tab Switcher */}
        <div className="shrink-0 px-4 sm:px-5 pt-3 pb-2 bg-[#101014] border-b border-zinc-800/80">
          <div className="grid grid-cols-2 gap-1 bg-[#18181e] p-1 rounded-xl border border-zinc-800/80">
            <button
              type="button"
              onClick={() => setActiveTab('cloud')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'cloud'
                  ? 'bg-emerald-500 text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Cloud size={13} />
              <span>Cloud Sync</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('backups')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'backups'
                  ? 'bg-emerald-500 text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <HardDriveDownload size={13} />
              <span>Backups &amp; Recovery</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'cloud' ? (
            <>
              {/* Live Status Card */}
              {isConfigured ? (
                <div className="bg-[#181822] border border-emerald-500/30 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                      <div>
                        <div className="text-xs font-bold text-emerald-300">
                          {syncStatus === 'syncing' ? 'Syncing...' : 'Connected to Supabase'}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          Room: {syncConfig.syncKey || 'dr-med-sync'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => triggerManualSync(true)}
                      disabled={syncStatus === 'syncing'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black active:scale-95 transition-all disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                      <span>Sync Now</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2 flex items-center justify-between">
                    <span>
                      {lastSyncTime
                        ? `Last synced: ${lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                        : `Last change: ${new Date(lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                    <button
                      type="button"
                      onClick={clearSupabaseConfig}
                      className="text-[10.5px] text-zinc-400 hover:text-rose-400 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-3 flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-zinc-300 space-y-0.5">
                    <p className="font-semibold text-amber-300">Local Mode (Not Connected)</p>
                    <p className="text-zinc-400">
                      Your progress is saved on this device. Connect Supabase below to sync across phone, tablet, and laptop.
                    </p>
                  </div>
                </div>
              )}

              {/* Configuration Form */}
              <form onSubmit={handleConnect} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-300">Supabase Project URL</label>
                  <input
                    type="url"
                    required
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full bg-[#18181e] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-300">Supabase Anon Key</label>
                  <input
                    type="password"
                    required
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-[#18181e] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-300">Sync Identifier / Room Key</label>
                  <input
                    type="text"
                    value={syncKeyInput}
                    onChange={(e) => setSyncKeyInput(e.target.value)}
                    placeholder="dr-roshan-2026"
                    className="w-full bg-[#18181e] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isTesting}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-black active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 disabled:opacity-50"
                >
                  <RefreshCw size={13} className={isTesting ? 'animate-spin' : ''} />
                  <span>
                    {isTesting
                      ? 'Testing Connection...'
                      : isConfigured
                      ? 'Update Supabase Settings'
                      : 'Connect to Supabase'}
                  </span>
                </button>
              </form>

              {/* 1-Minute SQL Setup Guide */}
              <div className="border-t border-zinc-800/80 pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowSqlGuide(!showSqlGuide)}
                  className="w-full flex items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors py-1"
                >
                  <span className="font-semibold text-emerald-400">
                    1-Minute Supabase Table Setup SQL
                  </span>
                  {showSqlGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showSqlGuide && (
                  <div className="bg-[#101014] border border-[#222228] rounded-xl p-3 space-y-2 text-[11px] text-zinc-300">
                    <p className="text-zinc-400">
                      1. Open your project on{' '}
                      <a
                        href="https://supabase.com/dashboard"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 underline inline-flex items-center gap-0.5"
                      >
                        supabase.com <ExternalLink size={10} />
                      </a>
                    </p>
                    <p className="text-zinc-400">
                      2. Go to <strong>SQL Editor</strong>, paste this snippet, and click <strong>Run</strong>:
                    </p>

                    <div className="relative">
                      <pre className="p-2.5 rounded-lg bg-[#0a0a0d] border border-zinc-800 text-[10px] font-mono text-zinc-300 overflow-x-auto select-all">
                        {SQL_SNIPPET}
                      </pre>
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="absolute top-2 right-2 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-semibold flex items-center gap-1 border border-zinc-700"
                      >
                        {copiedSql ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
                      </button>
                    </div>

                    <p className="text-zinc-400">
                      3. Go to <strong>Project Settings ➔ API</strong>, copy your <strong>Project URL</strong> and <strong>anon public key</strong>, and paste them above.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {/* 1. JSON File Export / Import */}
              <div className="bg-[#16161c] border border-[#24242c] rounded-xl p-3.5 space-y-2.5">
                <div>
                  <h3 className="text-xs font-bold text-zinc-100">JSON File Backup</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Save a portable copy of all progress, QBank modules, notes, and intervals.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download size={13} />
                    <span>Export JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Upload size={13} />
                    <span>Restore JSON</span>
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileImport}
                />
              </div>

              {/* 2. Quick Recovery — Restore Previous State */}
              <div className="bg-[#16161c] border border-[#24242c] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <History size={13} />
                      <span>Undo Last Overwrite</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Reverts the last cloud pull, JSON restore, snapshot load, or seed reset.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => restoreLastGoodState()}
                  disabled={!canUndoOverwrite}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <History size={13} />
                  <span>
                    {canUndoOverwrite ? 'Restore Previous State' : 'No Previous Overwrite Recorded'}
                  </span>
                </button>
              </div>

              {/* 3. On-Device Daily Snapshots (14-Day History) */}
              <div className="bg-[#16161c] border border-[#24242c] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                      <HardDriveDownload size={13} className="text-emerald-400" />
                      <span>Device Daily Snapshots (14 Days)</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Stored outside WebView on Android so cache clears leave them intact.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadSnapshots()}
                    aria-label="Refresh device snapshots"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  >
                    <RefreshCw size={13} className={loadingSnapshots ? 'animate-spin' : ''} />
                  </button>
                </div>

                {loadingSnapshots ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-zinc-500">
                    <Loader2 size={13} className="animate-spin" />
                    <span>Reading device backups…</span>
                  </div>
                ) : snapshots.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 py-2">
                    No dated Android snapshots found on this device. Browser builds keep your latest state locally plus JSON exports above.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                    {snapshots.map((snapshot) => {
                      const isPending = pendingSnapshotName === snapshot.name
                      const isRestoring = restoringName === snapshot.name
                      return (
                        <div
                          key={snapshot.name}
                          className="flex items-center justify-between gap-2 rounded-lg border border-[#232329] bg-[#0f0f13] px-2.5 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-zinc-200 truncate">
                              {formatSnapshotDay(snapshot.name)}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              {(snapshot.bytes / 1024).toFixed(0)} KB
                            </div>
                          </div>

                          {isPending ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => void handleRestoreSnapshot(snapshot)}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-black transition-colors"
                              >
                                Confirm?
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingSnapshotName(null)}
                                className="px-2 py-1.5 rounded-lg text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-800"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={restoringName !== null}
                              onClick={() => setPendingSnapshotName(snapshot.name)}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors disabled:opacity-50 shrink-0"
                            >
                              {isRestoring ? 'Restoring…' : 'Restore'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 4. Danger Zone — Reset Seed Data (2-Tap Confirmation) */}
              <div className="bg-rose-950/15 border border-rose-900/40 rounded-xl p-3.5 space-y-2.5">
                <div>
                  <h3 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <ShieldAlert size={13} />
                    <span>Danger Zone</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Reset all chapters and schedules back to the initial prescribed curriculum.
                  </p>
                </div>

                {confirmResetSeed ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetToInitialSeed()
                        setConfirmResetSeed(false)
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw size={13} />
                      <span>Confirm Reset Seed Data</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetSeed(false)}
                      className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmResetSeed(true)}
                    className="w-full py-2 px-3 rounded-xl bg-rose-950/50 hover:bg-rose-950/80 border border-rose-800/50 text-rose-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw size={13} />
                    <span>Reset Seed Data</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
