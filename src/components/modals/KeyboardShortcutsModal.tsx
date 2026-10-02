import React from 'react'
import { createPortal } from 'react-dom'
import { X, Command } from 'lucide-react'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null

  const shortcuts = [
    { key: '1', description: 'Ward MCQs (Watched Yesterday)' },
    { key: '2', description: "Tonight's Hostel Session" },
    { key: '3', description: 'Timeline Roadmap & GT Schedule' },
    { key: '4', description: '19-Subject Syllabus Directory' },
    { key: '5', description: 'Master Kanban Board' },
    { key: 'S', description: 'Toggle Stretch Queue Drawer' },
    { key: '?', description: 'Open / Close Shortcuts Help' },
    { key: 'Esc', description: 'Close any open modal or drawer' },
  ]

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm p-4 flex"
      onClick={onClose}
    >
      <div
        className="m-auto relative bg-[#141418] border border-[#26262e] rounded-2xl w-full max-w-sm shadow-2xl p-5 z-10 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#222228] pb-3">
          <div className="flex items-center gap-2">
            <Command className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-zinc-100 tracking-tight">
              Keyboard Shortcuts
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-1.5">
          {shortcuts.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#0c0c0e] border border-[#202026] text-xs"
            >
              <span className="text-zinc-300">{item.description}</span>
              <kbd className="font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 text-xs">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
