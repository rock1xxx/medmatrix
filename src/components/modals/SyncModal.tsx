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
} from 'lucide-react'
import { toast } from 'sonner'

interface SyncModalProps {
  isOpen: boolean
  onClose: () => void
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

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose }) => {
  const {
    syncConfig,
    setSupabaseConfig,
    clearSupabaseConfig,
    exportDataJSON,
    importDataJSON,
    lastModified,
  } = useMedMatrixStore()

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>(undefined)
  const [urlInput, setUrlInput] = useState(syncConfig.supabaseUrl || '')
  const [keyInput, setKeyInput] = useState(syncConfig.supabaseAnonKey || '')
  const [syncKeyInput, setSyncKeyInput] = useState(syncConfig.syncKey || 'dr-med-sync')
  const [isTesting, setIsTesting] = useState(false)
  const [showSqlGuide, setShowSqlGuide] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  if (!isOpen) return null

  const isConfigured = Boolean(syncConfig.supabaseUrl && syncConfig.supabaseAnonKey)

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
      // Trigger initial sync
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
    a.download = `MedMatrix_Backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
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
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm p-3 sm:p-4 flex animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="m-auto w-full max-w-sm sm:max-w-md bg-[#121216] border border-[#26262e] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed/Pinned at Top of Modal */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-800 bg-[#121216]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Supabase Cloud Sync</h2>
              <p className="text-[10.5px] text-zinc-400">Phone • iPad • MacBook Asynchronous Sync</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

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
              <p className="font-semibold text-amber-300">Not Connected to Cloud Sync Yet</p>
              <p className="text-zinc-400">
                Your data is safe locally on this device. Enter your free Supabase credentials below to sync across all your devices anywhere.
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
            <span>{isTesting ? 'Testing Connection...' : isConfigured ? 'Update Supabase Settings' : 'Connect to Supabase'}</span>
          </button>
        </form>

        {/* 1-Minute SQL Setup Guide */}
        <div className="border-t border-zinc-800/80 pt-2 space-y-2">
          <button
            type="button"
            onClick={() => setShowSqlGuide(!showSqlGuide)}
            className="w-full flex items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors py-1"
          >
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <span>📖</span>
              <span>1-Minute Supabase Table Setup SQL</span>
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
              <p className="text-zinc-400">2. Go to <strong>SQL Editor</strong>, paste this snippet, and click <strong>Run</strong>:</p>

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

        {/* Local JSON Backup / Restore */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
          <span className="text-zinc-500 text-[10.5px]">Local JSON File Backup</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExport}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors flex items-center gap-1 text-[11px]"
            >
              <Download size={11} />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors flex items-center gap-1 text-[11px]"
            >
              <Upload size={11} />
              <span>Restore</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileImport}
            />
          </div>
        </div>
      </div>
    </div>
  </div>,
  document.body
)
}
