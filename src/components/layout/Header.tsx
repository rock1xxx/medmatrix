import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { subscribeSyncStatus, SyncStatus } from '../../lib/syncEngine'
import { SyncModal } from '../modals/SyncModal'
import { InstallPwaModal } from '../modals/InstallPwaModal'
import { IntervalSettingsModal } from '../modals/IntervalSettingsModal'
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
} from 'lucide-react'

interface HeaderProps {
  onOpenShortcuts: () => void
}

export const Header: React.FC<HeaderProps> = ({ onOpenShortcuts }) => {
  const {
    stretchDrawerOpen,
    setStretchDrawerOpen,
    stretchTopicIds,
    exportDataJSON,
    importDataJSON,
    resetToInitialSeed,
  } = useMedMatrixStore()

  const [menuOpen, setMenuOpen] = useState(false)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [installModalOpen, setInstallModalOpen] = useState(false)
  const [intervalModalOpen, setIntervalModalOpen] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return subscribeSyncStatus((status) => setSyncStatus(status))
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
    a.download = `MedMatrix_Backup_${new Date().toISOString().slice(0, 10)}.json`
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
        {/* Brand & Offline Indicator */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" title="Offline ready for hospital basement" />
          <span className="font-bold text-base text-zinc-100 tracking-tight">MedMatrix</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Add Videos Button (Single clean plus icon) */}
          <button
            type="button"
            onClick={() => setStretchDrawerOpen(!stretchDrawerOpen)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-all active:scale-95 min-h-[36px]"
            title="Add extra videos to tonight's session"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Videos</span>
          </button>

          {/* More Menu (Backup, Restore, Reset, Shortcuts, PWA Install, Interval Settings) */}
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
  </>
  )
}
