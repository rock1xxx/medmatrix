import React, { useState, useRef, useEffect } from 'react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { subscribeSyncStatus, SyncStatus } from '../../lib/syncEngine'
import { SyncModal } from '../modals/SyncModal'
import { InstallPwaModal } from '../modals/InstallPwaModal'
import { IntervalSettingsModal } from '../modals/IntervalSettingsModal'
import { UpdateModal } from '../modals/UpdateModal'
import {
  Download,
  Upload,
  RotateCcw,
  Command,
  MoreVertical,
  Plus,
  Radio,
  Smartphone,
  Sliders,
  Layers,
  RefreshCw,
  History,
} from 'lucide-react'

interface HeaderProps {
  onOpenShortcuts: () => void
  onOpenWidgetSettings: () => void
}

const SYNC_META: Record<
  SyncStatus,
  { label: string; dot: string; text: string; title: string }
> = {
  idle: {
    label: 'Local',
    dot: 'bg-zinc-500',
    text: 'text-zinc-500',
    title: 'Saved on this device',
  },
  syncing: {
    label: 'Syncing',
    dot: 'bg-sky-400',
    text: 'text-sky-300',
    title: 'Pushing your study progress to the cloud',
  },
  synced: {
    label: 'Synced',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
    title: 'All devices in sync',
  },
  offline: {
    label: 'Offline',
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    title: 'Offline — changes sync once you reconnect',
  },
  error: {
    label: 'Sync error',
    dot: 'bg-rose-500',
    text: 'text-rose-400',
    title: 'Last sync failed — check your Supabase settings',
  },
  not_configured: {
    label: 'Local',
    dot: 'bg-zinc-500',
    text: 'text-zinc-500',
    title: 'No cloud sync configured — progress stays on this device',
  },
}

export const Header: React.FC<HeaderProps> = ({ onOpenShortcuts, onOpenWidgetSettings }) => {
  const {
    stretchDrawerOpen,
    setStretchDrawerOpen,
    exportDataJSON,
    importDataJSON,
    resetToInitialSeed,
    restoreLastGoodState,
  } = useMedMatrixStore()

  const [menuOpen, setMenuOpen] = useState(false)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [installModalOpen, setInstallModalOpen] = useState(false)
  const [intervalModalOpen, setIntervalModalOpen] = useState(false)
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return subscribeSyncStatus((status) => setSyncStatus(status))
  }, [])

  // The startup "update available" toast can open this modal directly.
  useEffect(() => {
    const openUpdateModal = () => setUpdateModalOpen(true)
    window.addEventListener('medmatrix:openUpdateModal', openUpdateModal)
    return () => window.removeEventListener('medmatrix:openUpdateModal', openUpdateModal)
  }, [])

  // Close menu on click/touch outside or Escape key
  useEffect(() => {
    if (!menuOpen) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

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
    setMenuOpen(false)
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
    setMenuOpen(false)
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#0c0c0e]/95 backdrop-blur-md border-b border-[#1c1c20] safe-top select-none">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* Brand & Live Sync Indicator */}
        <div className="flex items-center gap-2" title={SYNC_META[syncStatus].title}>
          <div
            className={`w-2 h-2 rounded-full ${SYNC_META[syncStatus].dot} ${
              syncStatus === 'syncing' ? 'animate-pulse' : ''
            }`}
          />
          <span className="font-bold text-base text-zinc-100 tracking-tight">MedMatrix</span>
          <span className={`text-[10px] font-medium ${SYNC_META[syncStatus].text}`}>
            {SYNC_META[syncStatus].label}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Add Videos Button */}
          <button
            type="button"
            onClick={() => setStretchDrawerOpen(!stretchDrawerOpen)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-all active:scale-95 min-h-[36px]"
            title="Add extra videos to tonight's session"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Videos</span>
          </button>

          {/* More Menu (Backup, Restore, Reset, Shortcuts, PWA Install, Interval Settings, Widgets) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all active:scale-95 min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Settings & Backup"
              aria-label="Settings and options menu"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                {/* Backdrop to capture clicks/taps outside the menu */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-60 bg-[#18181b] border border-zinc-800 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenWidgetSettings()
                      setMenuOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-cyan-300 hover:bg-zinc-800 flex items-center gap-2 font-medium"
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Widgets</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUpdateModalOpen(true)
                      setMenuOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-emerald-300 hover:bg-zinc-800 flex items-center justify-between font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Check for Updates</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      GitHub
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIntervalModalOpen(true)
                      setMenuOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-primary hover:bg-zinc-800 flex items-center gap-2 font-medium"
                  >
                    <Sliders className="w-3.5 h-3.5 text-primary" />
                    <span>Interval & Revision Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSyncModalOpen(true)
                      setMenuOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-emerald-300 hover:bg-zinc-800 flex items-center gap-2 font-medium"
                  >
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Multi-Device Sync</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInstallModalOpen(true)
                      setMenuOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Install App on Phone</span>
                  </button>
                  <div className="border-t border-zinc-800/80 my-1" />
                  <button
                    type="button"
                    onClick={handleExport}
                    className="w-full text-left px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Export Backup (JSON)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-left px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Restore from JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      restoreLastGoodState()
                      setMenuOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-amber-300 hover:bg-zinc-800 flex items-center gap-2"
                    title="Undo the last cloud pull, JSON restore or seed reset"
                  >
                    <History className="w-3.5 h-3.5 text-amber-400" />
                    <span>Restore Previous State</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenShortcuts()
                      setMenuOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Command className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Keyboard Shortcuts</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileImport}
                  />
                  <div className="border-t border-zinc-800/80 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Reset to initial prescribed state?')) {
                        resetToInitialSeed()
                        setMenuOpen(false)
                      }
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-950/30 flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                    <span>Reset Seed Data</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>

    {/* Interval Settings Modal */}
    <IntervalSettingsModal isOpen={intervalModalOpen} onClose={() => setIntervalModalOpen(false)} />

    {/* Sync Cockpit Modal */}
    <SyncModal isOpen={syncModalOpen} onClose={() => setSyncModalOpen(false)} />

    {/* PWA Install Modal */}
    <InstallPwaModal isOpen={installModalOpen} onClose={() => setInstallModalOpen(false)} />

    {/* In-App GitHub Update Modal */}
    <UpdateModal isOpen={updateModalOpen} onClose={() => setUpdateModalOpen(false)} />
  </>
  )
}
