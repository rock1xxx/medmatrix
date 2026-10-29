import React, { useEffect, useState } from 'react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { listDeviceSnapshots, loadDeviceSnapshotByName, DeviceDataSnapshot } from '../../lib/widgetBridge'
import { X, HardDriveDownload, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface DeviceBackupsModalProps {
  isOpen: boolean
  onClose: () => void
}

const formatDay = (name: string) => {
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

/**
 * The Android app keeps one copy of the whole database per day for the last two
 * weeks, independent of Supabase and of WebView storage. This lists them so a bad
 * edit, a wrong bulk change or a bad cloud pull can be undone days later.
 */
export const DeviceBackupsModal: React.FC<DeviceBackupsModalProps> = ({ isOpen, onClose }) => {
  const adoptBackup = useMedMatrixStore((s) => s.adoptBackup)
  const [snapshots, setSnapshots] = useState<DeviceDataSnapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const list = await listDeviceSnapshots()
    setSnapshots(list)
    setLoading(false)
  }

  useEffect(() => {
    if (isOpen) void load()
  }, [isOpen])

  if (!isOpen) return null

  const handleRestore = async (snapshot: DeviceDataSnapshot) => {
    const when = formatDay(snapshot.name)
    if (!confirm(`Replace the current database with the copy from ${when}?`)) return

    setRestoring(snapshot.name)
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
      setRestoring(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/75 backdrop-blur-sm" />

      <div className="relative bg-[#141418] border-t sm:border border-[#26262e] rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl p-5 z-10 space-y-4 max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 safe-bottom">
        <div className="flex items-start justify-between gap-3 border-b border-[#222228] pb-3">
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <HardDriveDownload size={16} className="text-emerald-400" />
              Device Backups
            </h2>
            <p className="text-[11px] text-zinc-500 mt-1">
              One copy per day, last 14 days, stored outside the WebView so a clear-cache or
              reinstall leaves it alone.
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void load()}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              aria-label="Refresh device backups"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-zinc-500">
            <Loader2 size={14} className="animate-spin" />
            Reading device backups…
          </div>
        )}

        {!loading && snapshots.length === 0 && (
          <div className="py-8 text-center space-y-1">
            <p className="text-xs text-zinc-400">No dated backups on this device yet.</p>
            <p className="text-[11px] text-zinc-600">
              They appear after a day of use in the Android app. The browser build keeps only the
              latest copy, plus the cloud row.
            </p>
          </div>
        )}

        {!loading && snapshots.length > 0 && (
          <div className="space-y-1.5">
            {snapshots.map((snapshot) => (
              <div
                key={snapshot.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#232329] bg-[#0f0f13] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-200">
                    {formatDay(snapshot.name)}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {(snapshot.bytes / 1024).toFixed(0)} KB
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleRestore(snapshot)}
                  disabled={restoring !== null}
                  className="px-3 py-2 rounded-lg text-[11px] font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors active:scale-95 disabled:opacity-50 min-h-[36px]"
                >
                  {restoring === snapshot.name ? 'Restoring…' : 'Restore'}
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-zinc-600">
          Restoring keeps the copy you are replacing, so ⋮ → Restore Previous State can put it
          back.
        </p>
      </div>
    </div>
  )
}
