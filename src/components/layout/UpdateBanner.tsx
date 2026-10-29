import React, { useRef } from 'react'
import { Download, X } from 'lucide-react'

interface UpdateBannerProps {
  version: string
  onUpdate: () => void
  onDismiss: () => void
}

/**
 * Slim, always-dismissible "new APK" strip.
 *
 * This replaced a sonner toast. The toast lived for its full duration no matter
 * what and sat over the bottom navigation, so it felt stuck. Here the user can
 * tap ✕ or swipe up and it is gone immediately.
 */
export const UpdateBanner: React.FC<UpdateBannerProps> = ({ version, onUpdate, onDismiss }) => {
  const touchStartY = useRef<number | null>(null)

  return (
    <div
      role="status"
      aria-live="polite"
      onTouchStart={(e) => {
        touchStartY.current = e.touches[0]?.clientY ?? null
      }}
      onTouchEnd={(e) => {
        const start = touchStartY.current
        touchStartY.current = null
        const end = e.changedTouches[0]?.clientY
        if (start !== null && end !== undefined && start - end > 24) {
          onDismiss()
        }
      }}
      className="relative z-40 mx-3 mt-2 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2"
    >
      <Download size={15} className="shrink-0 text-emerald-400" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold text-emerald-300">
          New APK available · v{version}
        </p>
        <p className="text-[10px] text-emerald-200/60">Installs in place — your progress stays</p>
      </div>

      <button
        type="button"
        onClick={onUpdate}
        className="min-h-[36px] shrink-0 rounded-lg bg-emerald-500 px-3 text-[11px] font-bold text-black transition-colors hover:bg-emerald-400 active:scale-95"
      >
        Update
      </button>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss update banner"
        className="flex min-h-[36px] min-w-[32px] shrink-0 items-center justify-center rounded-lg text-emerald-300/70 transition-colors hover:bg-emerald-500/10 hover:text-emerald-200"
      >
        <X size={15} />
      </button>
    </div>
  )
}
