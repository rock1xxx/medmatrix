import React, { useState, useEffect } from 'react'
import {
  X,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Smartphone,
  ShieldCheck,
} from 'lucide-react'
import {
  fetchLatestAppUpdate,
  triggerInAppApkUpdate,
  AppUpdateInfo,
} from '../../lib/widgetBridge'
import { toast } from 'sonner'
import { formatDistanceToNow, parseISO } from 'date-fns'

interface UpdateModalProps {
  isOpen: boolean
  onClose: () => void
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkForUpdates = async () => {
    setLoading(true)
    setError(null)
    try {
      const info = await fetchLatestAppUpdate()
      if (info) {
        setUpdateInfo(info)
      } else {
        setError('Could not reach GitHub Releases. Please check your internet connection.')
      }
    } catch {
      setError('Failed to check for updates.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      checkForUpdates()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleInstall = async () => {
    if (!updateInfo) return
    setDownloading(true)
    toast.loading('Starting update download...', { id: 'app-update' })

    try {
      const success = await triggerInAppApkUpdate(updateInfo.apkUrl)
      if (success) {
        localStorage.setItem('medmatrix_installed_release_date', updateInfo.publishedAt)
        toast.success('Download complete! Please tap "Update" on the system prompt.', {
          id: 'app-update',
          duration: 6000,
        })
      } else {
        toast.info('Opening direct APK download...', { id: 'app-update' })
      }
    } catch {
      toast.error('Failed to trigger in-app installer.', { id: 'app-update' })
    } finally {
      setDownloading(false)
    }
  }

  const formatReleaseTime = (isoString?: string) => {
    if (!isoString) return ''
    try {
      return formatDistanceToNow(parseISO(isoString), { addSuffix: true })
    } catch {
      return isoString
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#121217] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Check for Updates
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                  v{updateInfo?.currentVersion || '1.0'}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Direct on-the-fly APK and layout updates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scroll">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-xs text-zinc-300 font-medium">
                Checking GitHub repository for latest build...
              </p>
              <span className="text-[11px] text-zinc-500 font-mono">
                rock1xxx/medmatrix &bull; branch: main
              </span>
            </div>
          )}

          {!loading && error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Update Check Error</span>
              </div>
              <p className="text-[11px] text-rose-300/90">{error}</p>
              <button
                type="button"
                onClick={checkForUpdates}
                className="mt-2 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && updateInfo && (
            <>
              {/* Status Banner */}
              {updateInfo.isUpdateAvailable ? (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      New Update Available!
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {updateInfo.apkSizeMb} MB
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    Published {formatReleaseTime(updateInfo.publishedAt)} on GitHub Releases.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>You&apos;re on the Latest Build!</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Latest commit deployed {formatReleaseTime(updateInfo.publishedAt)}.
                  </p>
                </div>
              )}

              {/* Version & Keystore Guarantee */}
              <div className="bg-[#171720] p-3 rounded-xl border border-zinc-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-400">Release Tag:</span>
                  <span className="font-mono text-zinc-200 font-semibold">android-latest</span>
                </div>
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-400">Package:</span>
                  <span className="font-mono text-zinc-200">com.medmatrix.app</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60 text-[11px] text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Permanent Keystore Signed &bull; Installs in-place without deleting app!</span>
                </div>
              </div>

              {/* Release Notes */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-zinc-300 block">
                  What&apos;s in this build:
                </span>
                <div className="bg-[#0e0e13] p-3 rounded-xl border border-zinc-800/60 text-[11px] text-zinc-300 max-h-36 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed custom-scroll">
                  {updateInfo.releaseNotes}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleInstall}
                  disabled={downloading}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {downloading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Downloading &amp; Preparing Installer...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>
                        {updateInfo.isUpdateAvailable
                          ? 'Download & Install Update'
                          : 'Re-download Latest APK'}
                      </span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between px-1">
                  <a
                    href="https://github.com/rock1xxx/medmatrix/releases"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-zinc-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
                  >
                    <span>View GitHub Releases</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    type="button"
                    onClick={checkForUpdates}
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Check again</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
