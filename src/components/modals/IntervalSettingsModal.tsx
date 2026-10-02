import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { X, Clock, Brain, RotateCcw, Check, Sparkles, AlertCircle, ArrowRight } from 'lucide-react'
import { DEFAULT_EBBINGHAUS_INTERVALS, DEFAULT_POSTPONE_DAYS } from '../../lib/srEngine'

interface IntervalSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const PRESETS = [
  {
    name: 'Clinical Ebbinghaus (Standard)',
    intervals: [1, 5, 12, 25] as [number, number, number, number],
    postpone: 3,
    description: 'Gold standard memory curve calibrated for NEET PG / USMLE high-yield retention.',
  },
  {
    name: 'High-Yield Sprint (Fast Cycle)',
    intervals: [1, 3, 7, 15] as [number, number, number, number],
    postpone: 2,
    description: 'Tighter intervals for rapid recall before upcoming exams or grand tests.',
  },
  {
    name: 'Internship Gentle (Duty-Friendly)',
    intervals: [2, 7, 18, 35] as [number, number, number, number],
    postpone: 5,
    description: 'Spaced out intervals designed to accommodate heavy 36-hour ward duty shifts.',
  },
]

export const IntervalSettingsModal: React.FC<IntervalSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    ebbinghausIntervals,
    postponeIntervalDays,
    setEbbinghausIntervals,
    setPostponeIntervalDays,
    resetIntervalsToDefault,
  } = useMedMatrixStore()

  const [lvl1, setLvl1] = useState(ebbinghausIntervals[0])
  const [lvl2, setLvl2] = useState(ebbinghausIntervals[1])
  const [lvl3, setLvl3] = useState(ebbinghausIntervals[2])
  const [lvl4, setLvl4] = useState(ebbinghausIntervals[3])
  const [postpone, setPostpone] = useState(postponeIntervalDays)
  const [error, setError] = useState<string | null>(null)

  // Reset inputs when modal opens or store changes
  useEffect(() => {
    if (isOpen) {
      setLvl1(ebbinghausIntervals[0])
      setLvl2(ebbinghausIntervals[1])
      setLvl3(ebbinghausIntervals[2])
      setLvl4(ebbinghausIntervals[3])
      setPostpone(postponeIntervalDays)
      setError(null)
    }
  }, [isOpen, ebbinghausIntervals, postponeIntervalDays])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setLvl1(preset.intervals[0])
    setLvl2(preset.intervals[1])
    setLvl3(preset.intervals[2])
    setLvl4(preset.intervals[3])
    setPostpone(preset.postpone)
    setError(null)
  }

  const handleSave = () => {
    const v1 = Number(lvl1)
    const v2 = Number(lvl2)
    const v3 = Number(lvl3)
    const v4 = Number(lvl4)
    const p = Number(postpone)

    if ([v1, v2, v3, v4, p].some((v) => isNaN(v) || v <= 0)) {
      setError('All intervals and postpone days must be positive integers.')
      return
    }

    if (v1 >= v2 || v2 >= v3 || v3 >= v4) {
      setError('Spaced intervals should strictly increase (Level 1 < Level 2 < Level 3 < Level 4).')
      return
    }

    setEbbinghausIntervals([v1, v2, v3, v4])
    setPostponeIntervalDays(p)
    onClose()
  }

  const handleReset = () => {
    resetIntervalsToDefault()
    setLvl1(DEFAULT_EBBINGHAUS_INTERVALS[0])
    setLvl2(DEFAULT_EBBINGHAUS_INTERVALS[1])
    setLvl3(DEFAULT_EBBINGHAUS_INTERVALS[2])
    setLvl4(DEFAULT_EBBINGHAUS_INTERVALS[3])
    setPostpone(DEFAULT_POSTPONE_DAYS)
    setError(null)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="interval-modal-title"
        className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-surface-raised shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 id="interval-modal-title" className="text-base sm:text-lg font-bold text-text-primary leading-tight">
                Interval & Revision Settings
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Configure Ebbinghaus intervals & postpone snooze
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            aria-label="Close interval settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-6 overflow-y-auto text-sm text-text-secondary">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Preset Buttons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Quick Presets
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESETS.map((preset) => {
                const isActive =
                  lvl1 === preset.intervals[0] &&
                  lvl2 === preset.intervals[1] &&
                  lvl3 === preset.intervals[2] &&
                  lvl4 === preset.intervals[3] &&
                  postpone === preset.postpone
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isActive
                        ? 'bg-primary/10 border-primary text-primary font-medium shadow-sm'
                        : 'bg-surface-sunken border-border hover:border-text-muted/40 text-text-secondary'
                    }`}
                  >
                    <div className="text-xs font-semibold leading-tight line-clamp-1">
                      {preset.name.split(' (')[0]}
                    </div>
                    <div className="text-[11px] font-mono opacity-80 mt-1">
                      +{preset.intervals.join('d, +')}d
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section 1: Postpone / Revise Later Interval */}
          <div className="p-4 bg-surface-sunken border border-border rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Postpone Interval ("Revise Later")
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Delay tonight's review by this many days when busy or on emergency duty.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex gap-1.5 flex-wrap">
                {[1, 2, 3, 5, 7].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setPostpone(days)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      postpone === days
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold'
                        : 'bg-surface border-border hover:border-text-muted/40 text-text-secondary'
                    }`}
                  >
                    {days} {days === 1 ? 'day' : 'days'}
                    {days === 3 && ' (Default)'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={postpone}
                  onChange={(e) => setPostpone(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2.5 py-1.5 bg-surface border border-border rounded-lg text-sm text-center font-mono text-text-primary focus:outline-none focus:border-amber-400"
                />
                <span className="text-xs text-text-muted">days</span>
              </div>
            </div>
          </div>

          {/* Section 2: Spaced Repetition Levels */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-primary" />
                Ebbinghaus Review Intervals
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Days added to the review schedule after completing each mastery level.
              </p>
            </div>

            {/* Visual 4-Step Chain */}
            <div className="p-3 bg-surface-sunken border border-border rounded-xl">
              <div className="flex items-center justify-between text-xs font-mono text-center">
                <div className="flex-1">
                  <div className="text-[10px] text-text-muted uppercase">Lock</div>
                  <div className="text-xs font-semibold text-emerald-400 mt-0.5">Day 0</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <div className="flex-1">
                  <div className="text-[10px] text-text-muted uppercase">Level 1</div>
                  <div className="text-xs font-bold text-primary mt-0.5">+{lvl1}d</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <div className="flex-1">
                  <div className="text-[10px] text-text-muted uppercase">Level 2</div>
                  <div className="text-xs font-bold text-primary mt-0.5">+{lvl2}d</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <div className="flex-1">
                  <div className="text-[10px] text-text-muted uppercase">Level 3</div>
                  <div className="text-xs font-bold text-primary mt-0.5">+{lvl3}d</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <div className="flex-1">
                  <div className="text-[10px] text-text-muted uppercase">Level 4</div>
                  <div className="text-xs font-bold text-amber-400 mt-0.5">+{lvl4}d</div>
                </div>
              </div>
            </div>

            {/* Level Inputs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 bg-surface-sunken border border-border rounded-xl">
                <div className="text-[11px] font-semibold text-text-primary">Level 1</div>
                <div className="text-[10px] text-text-muted mb-1.5">1st Recall</div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-muted">+</span>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={lvl1}
                    onChange={(e) => setLvl1(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1 bg-surface border border-border rounded-lg text-sm text-center font-mono text-text-primary focus:outline-none focus:border-primary"
                  />
                  <span className="text-xs text-text-muted">d</span>
                </div>
              </div>

              <div className="p-2.5 bg-surface-sunken border border-border rounded-xl">
                <div className="text-[11px] font-semibold text-text-primary">Level 2</div>
                <div className="text-[10px] text-text-muted mb-1.5">Reinforce</div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-muted">+</span>
                  <input
                    type="number"
                    min="2"
                    max="60"
                    value={lvl2}
                    onChange={(e) => setLvl2(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1 bg-surface border border-border rounded-lg text-sm text-center font-mono text-text-primary focus:outline-none focus:border-primary"
                  />
                  <span className="text-xs text-text-muted">d</span>
                </div>
              </div>

              <div className="p-2.5 bg-surface-sunken border border-border rounded-xl">
                <div className="text-[11px] font-semibold text-text-primary">Level 3</div>
                <div className="text-[10px] text-text-muted mb-1.5">Encoding</div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-muted">+</span>
                  <input
                    type="number"
                    min="3"
                    max="90"
                    value={lvl3}
                    onChange={(e) => setLvl3(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1 bg-surface border border-border rounded-lg text-sm text-center font-mono text-text-primary focus:outline-none focus:border-primary"
                  />
                  <span className="text-xs text-text-muted">d</span>
                </div>
              </div>

              <div className="p-2.5 bg-surface-sunken border border-border rounded-xl">
                <div className="text-[11px] font-semibold text-text-primary">Level 4</div>
                <div className="text-[10px] text-text-muted mb-1.5">Mastery</div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-muted">+</span>
                  <input
                    type="number"
                    min="4"
                    max="180"
                    value={lvl4}
                    onChange={(e) => setLvl4(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1 bg-surface border border-border rounded-lg text-sm text-center font-mono text-text-primary focus:outline-none focus:border-primary"
                  />
                  <span className="text-xs text-text-muted">d</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-border bg-surface-raised flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-text-primary hover:bg-surface-hover border border-transparent transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults (1, 5, 12, 25 & 3d)
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              Save Intervals
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
