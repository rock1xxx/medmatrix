import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Share,
  PlusSquare,
  Smartphone,
  CheckCircle2,
  Download,
  Check,
} from 'lucide-react'

interface InstallPwaModalProps {
  isOpen: boolean
  onClose: () => void
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({ isOpen, onClose }) => {
  const [deviceTab, setDeviceTab] = useState<'ios' | 'android' | 'desktop'>('ios')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Detect OS
    if (typeof navigator !== 'undefined') {
      const userAgent = navigator.userAgent || navigator.vendor
      if (/iPad|iPhone|iPod/.test(userAgent)) {
        setDeviceTab('ios')
      } else if (/android/i.test(userAgent)) {
        setDeviceTab('android')
      } else {
        setDeviceTab('desktop')
      }
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  if (!isOpen) return null

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setInstalled(true)
    }
    setDeferredPrompt(null)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm p-3 sm:p-4 flex animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="m-auto w-full max-w-md bg-[#101014] border border-[#222228] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Pinned at top */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-[#101014]">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-zinc-100">Install MedMatrix PWA</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* Device Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-[#141418] p-1 rounded-xl border border-[#222228]">
          <button
            type="button"
            onClick={() => setDeviceTab('ios')}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all text-center ${
              deviceTab === 'ios'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            iPhone / iPad
          </button>
          <button
            type="button"
            onClick={() => setDeviceTab('android')}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all text-center ${
              deviceTab === 'android'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Android
          </button>
          <button
            type="button"
            onClick={() => setDeviceTab('desktop')}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all text-center ${
              deviceTab === 'desktop'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Mac / PC
          </button>
        </div>

        {/* Tab 1: iOS Instructions */}
        {deviceTab === 'ios' && (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Apple Safari does not allow 1-tap popups. Follow these 2 quick steps:
            </p>

            <div className="space-y-2.5">
              <div className="flex items-start gap-3 bg-[#141418] border border-[#222228] p-3 rounded-2xl">
                <div className="w-7 h-7 rounded-xl bg-zinc-800 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <span>Tap the Safari Share Button</span>
                    <Share size={13} className="text-blue-400" />
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    At the bottom bar of Safari on iPhone (or top bar on iPad).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#141418] border border-[#222228] p-3 rounded-2xl">
                <div className="w-7 h-7 rounded-xl bg-zinc-800 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <span>Scroll &amp; tap &quot;Add to Home Screen&quot;</span>
                    <PlusSquare size={13} className="text-emerald-400" />
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Tap &quot;Add&quot; in the top-right corner. MedMatrix is now installed on your home screen!
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-emerald-300">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>Full screen without browser URL bars, safe-area padded, and works offline in hospital basements!</span>
            </div>
          </div>
        )}

        {/* Tab 2: Android Instructions */}
        {deviceTab === 'android' && (
          <div className="space-y-3 pt-1">
            {installed ? (
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-2xl p-4 text-center space-y-1">
                <Check className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-emerald-300">MedMatrix is Installed!</p>
                <p className="text-[11px] text-zinc-400">Launch from your app drawer anytime.</p>
              </div>
            ) : deferredPrompt ? (
              <div className="space-y-2">
                <p className="text-xs text-zinc-400">
                  Ready to install directly to your device:
                </p>
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
                >
                  <Download size={16} />
                  <span>Install MedMatrix Now</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <p className="text-zinc-400">
                  In Chrome on Android:
                </p>
                <div className="bg-[#141418] border border-[#222228] p-3 rounded-xl space-y-1.5 text-[11px]">
                  <p className="text-zinc-200">1. Tap the three dots menu (⋮) in the top-right corner.</p>
                  <p className="text-zinc-200">2. Tap &quot;Install app&quot; or &quot;Add to Home screen&quot;.</p>
                  <p className="text-zinc-200">3. Confirm installation.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Desktop Mac / PC */}
        {deviceTab === 'desktop' && (
          <div className="space-y-3 pt-1 text-xs">
            <p className="text-zinc-400">
              Run MedMatrix as a native desktop window:
            </p>
            <div className="space-y-2">
              <div className="bg-[#141418] border border-[#222228] p-3 rounded-xl space-y-1 text-[11px]">
                <div className="font-semibold text-zinc-200">macOS Safari:</div>
                <p className="text-zinc-400">Click &quot;File&quot; in the menu bar ➔ &quot;Add to Dock...&quot;</p>
              </div>
              <div className="bg-[#141418] border border-[#222228] p-3 rounded-xl space-y-1 text-[11px]">
                <div className="font-semibold text-zinc-200">Google Chrome / Brave / Edge:</div>
                <p className="text-zinc-400">Click the Install icon in the address bar (next to the star icon).</p>
              </div>
            </div>
          </div>
        )}

        {/* Done Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </div>,
  document.body
)
}
