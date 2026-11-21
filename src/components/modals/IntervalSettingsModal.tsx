import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import {
  X,
  Clock,
  Brain,
  RotateCcw,
  Check,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Target,
  Minus,
  Plus,
} from 'lucide-react'
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
    dailyPaceTopics,
    gtStartThreshold,
    setEbbinghausIntervals,
    setPostponeIntervalDays,
    setTodayPace,
    setGTStartThreshold,
    resetIntervalsToDefault,
  } = useMedMatrixStore()

  const [lvl1, setLvl1] = useState(ebbinghausIntervals[0])
  const [lvl2, setLvl2] = useState(ebbinghausIntervals[1])
  const [lvl3, setLvl3] = useState(ebbinghausIntervals[2])
  const [lvl4, setLvl4] = useState(ebbinghausIntervals[3])
  const [postpone, setPostpone] = useState(postponeIntervalDays)
  const [pace, setPace] = useState(dailyPaceTopics || 2)
  const [gtThreshold, setGtThreshold] = useState(gtStartThreshold || 7)
  const [error, setError] = useState<string | null>(null)

  // Reset inputs when modal opens or store changes
  useEffect(() => {
    if (isOpen) {
      setLvl1(ebbinghausIntervals[0])
      setLvl2(ebbinghausIntervals[1])
      setLvl3(ebbinghausIntervals[2])
      setLvl4(ebbinghausIntervals[3])
      setPostpone(postponeIntervalDays)
      setPace(dailyPaceTopics || 2)
      setGtThreshold(gtStartThreshold || 7)
      setError(null)
    }
  }, [isOpen, ebbinghausIntervals, postponeIntervalDays, dailyPaceTopics, gtStartThreshold])

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
    const gt = Number(gtThreshold)

    if ([v1, v2, v3, v4, p].some((v) => isNaN(v) || v <= 0)) {
      setError('All intervals and postpone days must be positive integers.')
      return
    }

    if (v1 >= v2 || v2 >= v3 || v3 >= v4) {
      setError('Spaced intervals should strictly increase (Level 1 < Level 2 < Level 3 < Level 4).')
      return
    }

    if (isNaN(gt) || gt < 1 || gt > 19) {
      setError('Grand Test start threshold must be between 1 and 19 subjects.')
      return
    }

    setEbbinghausIntervals([v1, v2, v3, v4])
    setPostponeIntervalDays(p)
    if (pace !== dailyPaceTopics) {
      setTodayPace(pace)
    }
    if (gt !== gtStartThreshold) {
      setGTStartThreshold(gt)
    }
    onClose()
  }

  const handleReset = () => {
    resetIntervalsToDefault()
    setTodayPace(2)
    setGTStartThreshold(7)
    setLvl1(DEFAULT_EBBINGHAUS_INTERVALS[0])
    setLvl2(DEFAULT_EBBINGHAUS_INTERVALS[1])
    setLvl3(DEFAULT_EBBINGHAUS_INTERVALS[2])
    setLvl4(DEFAULT_EBBINGHAUS_INTERVALS[3])
    setPostpone(DEFAULT_POSTPONE_DAYS)
    setPace(2)
    setGtThreshold(7)
    setError(null)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="interval-modal-title"
        className="w-full max-w-lg bg-[#141418] border border-[#26262e] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#222228] bg-[#18181e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 id="interval-modal-title" className="text-base sm:text-lg font-bold text-zinc-100 leading-tight">
                Study Settings
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Ebbinghaus intervals, daily pace &amp; Grand Test milestones
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            aria-label="Close study settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto text-sm text-zinc-300">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 0: Daily Pace & Grand Test Schedule */}
          <div className="p-4 bg-[#0e0e12] border border-[#24242c] rounded-xl space-y-3.5">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-400" />
              Daily Pace &amp; Grand Tests
            </h3>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs font-medium text-zinc-200">Base Daily Pace</div>
                <div className="text-[11px] text-zinc-500">Default videos scheduled per normal duty day</div>
              </div>
              <div className="inline-flex items-center gap-1 bg-[#141418] p-1 rounded-xl border border-[#26262e]">
                {[1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPace(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      pace === p
                        ? 'bg-emerald-500 text-black shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {p}/d
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#1e1e26] pt-3 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs font-medium text-zinc-200">Grand Test Start Threshold</div>
                <div className="text-[11px] text-zinc-500">
                  Begin bi-weekly Grand Tests after completing N subjects
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Decrease Grand Test threshold"
                  onClick={() => setGtThreshold((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-[#141418] border border-[#2c2c36] hover:border-zinc-500 text-zinc-300 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-16 text-center font-mono text-xs font-bold text-zinc-100 bg-[#141418] border border-[#26262e] py-1.5 rounded-lg">
                  {gtThreshold} subj
                </span>
                <button
                  type="button"
                  aria-label="Increase Grand Test threshold"
                  onClick={() => setGtThreshold((prev) => Math.min(19, prev + 1))}
                  className="w-8 h-8 rounded-lg bg-[#141418] border border-[#2c2c36] hover:border-zinc-500 text-zinc-300 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Review Presets
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
                        ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 font-medium shadow-sm'
                        : 'bg-[#0e0e12] border-[#24242c] hover:border-zinc-600 text-zinc-300'
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
          <div className="p-4 bg-[#0e0e12] border border-[#24242c] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Postpone Interval (&quot;Revise Later&quot;)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Delay tonight&apos;s review by this many days when busy or on emergency duty.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1.5 flex-wrap">
                {[1, 2, 3, 5, 7].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setPostpone(days)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      postpone === days
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold'
                        : 'bg-[#141418] border-[#26262e] hover:border-zinc-600 text-zinc-300'
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
                  aria-label="Custom postpone days"
                  value={postpone}
                  onChange={(e) => setPostpone(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2.5 py-1.5 bg-[#141418] border border-[#2c2c36] rounded-lg text-sm text-center font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                />
                <span className="text-xs text-zinc-400">days</span>
              </div>
            </div>
          </div>

          {/* Section 2: Spaced Repetition Levels */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-emerald-400" />
                Ebbinghaus Review Intervals
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Wait intervals across the 4 review cycles from locking a chapter to Mastery.
              </p>
            </div>

            {/* Visual 4-Step Chain */}
            <div className="p-3 bg-[#0e0e12] border border-[#24242c] rounded-xl">
              <div className="flex items-center justify-between text-xs font-mono text-center">
                <div className="flex-1">
                  <div className="text-[10px] text-zinc-500 uppercase">Lock</div>
                  <div className="text-xs font-semibold text-zinc-300 mt-0.5">Day 0</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <div className="flex-1">
                  <div className="text-[10px] text-zinc-500 uppercase">Rev 1</div>
                  <div className="text-xs font-bold text-sky-400 mt-0.5">+{lvl1}d</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <div className="flex-1">
                  <div className="text-[10px] text-zinc-500 uppercase">Rev 2</div>
                  <div className="text-xs font-bold text-indigo-400 mt-0.5">+{lvl2}d</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <div className="flex-1">
                  <div className="text-[10px] text-zinc-500 uppercase">Rev 3</div>
                  <div className="text-xs font-bold text-violet-400 mt-0.5">+{lvl3}d</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <div className="flex-1">
                  <div className="text-[10px] text-zinc-500 uppercase">Mastery</div>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5">+{lvl4}d</div>
                </div>
              </div>
            </div>

            {/* Level Inputs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 bg-[#0e0e12] border border-[#24242c] rounded-xl">
                <label htmlFor="sr-lvl-1" className="block text-[11px] font-semibold text-zinc-100">
                  Review 1
                </label>
                <div className="text-[10px] text-zinc-500 mb-1.5">1st Recall (L0)</div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-zinc-500">+</span>
                  <input
                    id="sr-lvl-1"
                    type="number"
                    min="1"
                    max="30"
                    value={lvl1}
                    onChange={(e) => setLvl1(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1 bg-[#141418] border border-[#2c2c36] rounded-lg text-sm text-center font-mono text-zinc-100 focus:outline-none focus:border-emerald-400"
                  />
                  <span className="text-xs text-zinc-500">d</span>
                </div>
              </div>

              <div className="p-2.5 bg-[#0e0e12] border border-[#24242c] rounded-xl">
                <label htmlFor="sr-lvl-2" className="block text-[11px] font-semibold text-zinc-100">
                  Review 2
                </label>
                <div className="text-[10px] text-zinc-500 mb-1.5">Reinforce (L1)</div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-zinc-500">+</span>
                  <input
                    id="sr-lvl-2"
                    type="number"
                    min="2"
                    max="60"
                    value={lvl2}
                    onChange={(e) => setLvl2(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1 bg-[#141418] border border-[#2c2c36] rounded-lg text-sm text-center font-mono text-zinc-100 focus:outline-none focus:border-emerald-400"
                  />
                  <span className="text-xs text-zinc-500">d</span>
                </div>
              </div>

              <div className="p-2.5 bg-[#0e0e12] border border-[#24242c] rounded-xl">
                <label htmlFor="sr-lvl-3" className="block text-[11px] font-semibold text-zinc-100">
                  Review 3
                </label>
                <div className="text-[10px] text-zinc-500 mb-1.5">Encoding (L2)</div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-zinc-500">+</span>
                  <input
                    id="sr-lvl-3"
                    type="number"
                    min="3"
                    max="90"
                    value={lvl3}
                    onChange={(e) => setLvl3(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1 bg-[#141418] border border-[#2c2c36] rounded-lg text-sm text-center font-mono text-zinc-100 focus:outline-none focus:border-emerald-400"
                  />
                  <span className="text-xs text-zinc-500">d</span>
                </div>
              </div>

              <div className="p-2.5 bg-[#0e0e12] border border-[#24242c] rounded-xl">
                <label htmlFor="sr-lvl-4" className="block text-[11px] font-semibold text-zinc-100">
                  Review 4
                </label>
                <div className="text-[10px] text-zinc-500 mb-1.5">Mastery (L3)</div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-zinc-500">+</span>
                  <input
                    id="sr-lvl-4"
                    type="number"
                    min="4"
                    max="180"
                    value={lvl4}
                    onChange={(e) => setLvl4(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1 bg-[#141418] border border-[#2c2c36] rounded-lg text-sm text-center font-mono text-zinc-100 focus:outline-none focus:border-emerald-400"
                  />
                  <span className="text-xs text-zinc-500">d</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#222228] bg-[#18181e] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-transparent transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 border border-[#2c2c36] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-950/30 flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
