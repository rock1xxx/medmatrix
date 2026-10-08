import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Smartphone, Copy, Check, ExternalLink, Sparkles, Monitor, AppWindow } from 'lucide-react'
import { toast } from 'sonner'

interface IosWidgetGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

const SCRIPTABLE_SNIPPET = `// MedMatrix iOS Scriptable Home Screen Widget
// 1. Download "Scriptable" from the App Store (Free)
// 2. Create a new script, paste this code, and add a Scriptable widget to your Home Screen!

const APP_URL = "https://medmatrix.vercel.app/?view=widget";

let widget = new ListWidget();
widget.backgroundColor = new Color("#121216");

// Header
let header = widget.addStack();
header.layoutHorizontally();

let title = header.addText("MEDMATRIX TODAY");
title.font = Font.boldSystemFont(11);
title.textColor = new Color("#10b981");

header.addSpacer();

let dot = header.addText("●");
dot.font = Font.systemFont(9);
dot.textColor = new Color("#10b981");

widget.addSpacer(8);

// Content
let mcqLabel = widget.addText("🩺 Ward MCQs to Solve");
mcqLabel.font = Font.semiboldSystemFont(12);
mcqLabel.textColor = new Color("#f4f4f5");

let mcqSub = widget.addText("Tap to review & advance");
mcqSub.font = Font.systemFont(10);
mcqSub.textColor = new Color("#71717a");

widget.addSpacer(6);

let vidLabel = widget.addText("🌙 Tonight Videos to Watch");
vidLabel.font = Font.semiboldSystemFont(12);
vidLabel.textColor = new Color("#22d3ee");

let vidSub = widget.addText("Daily baseline quota");
vidSub.font = Font.systemFont(10);
vidSub.textColor = new Color("#71717a");

widget.url = APP_URL;
Script.setWidget(widget);
Script.complete();`

export const IosWidgetGuideModal: React.FC<IosWidgetGuideModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopyScript = () => {
    navigator.clipboard.writeText(SCRIPTABLE_SNIPPET)
    setCopied(true)
    toast.success('Scriptable widget code copied to clipboard!')
    setTimeout(() => setCopied(false), 2500)
  }

  const handleOpenWidgetView = () => {
    window.location.href = '/?view=widget'
  }

  const handlePopout = () => {
    window.open(
      '/?view=widget',
      'MedMatrixWidget',
      'width=420,height=580,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="widget-modal-title"
        className="w-full max-w-lg bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-surface-raised shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 id="widget-modal-title" className="text-base sm:text-lg font-bold text-text-primary leading-tight">
                Phone & Laptop Widget Guide
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Keep today&apos;s MCQs & Videos always on top
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            aria-label="Close widget guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto text-sm text-text-secondary">
          {/* Method 1: Dedicated Home Screen Icon */}
          <div className="p-4 rounded-2xl bg-surface-sunken border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} /> Option 1: 1-Tap Home Screen Companion
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-semibold">
                Easiest (No Apps Needed)
              </span>
            </div>

            <p className="text-xs text-text-muted">
              Add the dedicated widget URL directly to your phone&apos;s home screen. Tapping it opens straight into your minimal to-do list without any surrounding navigation bars.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenWidgetView}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/30 active:scale-98"
              >
                <span>Launch Widget Screen</span>
                <ExternalLink size={13} />
              </button>
            </div>

            <div className="text-[11px] text-zinc-400 bg-surface/80 p-2.5 rounded-xl border border-border space-y-1">
              <div>1. Tap <strong>Launch Widget Screen</strong> (or visit <code>/?view=widget</code>).</div>
              <div>2. In Safari, tap <strong>Share</strong> (box with arrow) &rarr; <strong>&quot;Add to Home Screen&quot;</strong>.</div>
              <div>3. Name it <strong>&quot;MedMatrix Today&quot;</strong>. It now lives as a standalone widget card!</div>
            </div>
          </div>

          {/* Method 2: Laptop Desktop Popout */}
          <div className="p-4 rounded-2xl bg-surface-sunken border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Monitor size={13} /> Option 2: Laptop Desktop Pop-Out Window
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/40 font-semibold">
                For Mac / Windows
              </span>
            </div>

            <p className="text-xs text-text-muted">
              Keep a compact, floating to-do checklist on your screen alongside your PDF reader, Marrow, or First Aid notes.
            </p>

            <button
              type="button"
              onClick={handlePopout}
              className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-98"
            >
              <AppWindow size={14} className="text-cyan-400" />
              <span>Open Floating Desktop Window</span>
            </button>
          </div>

          {/* Method 3: Scriptable Native iOS Home Screen Widget */}
          <div className="p-4 rounded-2xl bg-surface-sunken border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone size={13} /> Option 3: Native iOS Home Screen Widget
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800/40 font-semibold">
                Via Scriptable
              </span>
            </div>

            <p className="text-xs text-text-muted">
              Want a literal iOS widget on your iPhone home screen grid? Use the free app <strong>Scriptable</strong> on the App Store:
            </p>

            <button
              type="button"
              onClick={handleCopyScript}
              className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-98"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied Scriptable Code!' : 'Copy Scriptable Code Snippet'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-border bg-surface-raised flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
