import React, { useState, useEffect } from 'react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import {
  getSavedSliderSettings,
  saveSliderSettings,
  syncActiveStudyDataToWidget,
} from '../../lib/widgetBridge'
import {
  X,
  Sparkles,
  Smartphone,
  ChevronRight,
  Sliders,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface WidgetSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type SizeCategory = '2x2' | '4x1' | '4x2' | '4x4'

/** Layout variants offered by the widget studio. Static, so it is module level:
 *  a fresh object on every render would make the settings effect re-run forever. */
const designOptions: Record<
  SizeCategory,
  Array<{ id: string; name: string; desc: string }>
> = {
  '2x2': [
    {
      id: 'hero',
      name: '1. Active Focus Hero',
      desc: 'Big bold headline for the #1 morning Ward MCQ chapter + secondary chapter + next video time pill.',
    },
    {
      id: 'dual',
      name: '2. Compact Dual Split',
      desc: 'Equal balance between morning Ward MCQs and tonight’s lectures in a clean two-deck split.',
    },
    {
      id: 'sequence',
      name: '3. Numbered Sequence Flow',
      desc: 'Sequential flow listing exactly what to do step 1, 2, and 3 today with numbered badges.',
    },
    {
      id: 'horizon',
      name: '4. Split Shift Horizon',
      desc: 'Clinical shift split with color-coded accent indicators for Day Duty vs Night Study.',
    },
    {
      id: 'rings',
      name: '5. Dual Health Rings',
      desc: 'Samsung Health / Galaxy Watch inspired circular completion metrics.',
    },
  ],
  '4x1': [
    {
      id: 'pill-multi',
      name: '1. Pill Badge Multi-Queue (User Favorite)',
      desc: 'Compact rounded pill tags pushed tight to the top edges with zero subject clutter and 1px center divider. Sized to fit 2 full chapters per side.',
    },
    {
      id: 'max-typo-multi',
      name: '2. Max-Typography Multi-Row (User Favorite)',
      desc: 'Clean uppercase category labels pushed flush against edge, with bold numbered rows fitting 2 full chapter queues cleanly per half.',
    },
    {
      id: 'dense-3tier',
      name: '3. Dense 3-Topic Horizon (Max Capacity)',
      desc: 'Engineered for maximum task capacity. Fits 3 full topics per half (6 total in a 4x1 banner) using compact micro-typography.',
    },
  ],
  '4x2': [
    {
      id: 'desk',
      name: '1. Dual Chapter Desk (Recommended)',
      desc: 'The perfected layout. High contrast, large bold chapter fonts, zero clutter, no tick marks.',
    },
    {
      id: 'checkbox',
      name: '2. Interactive Checkbox Desk',
      desc: 'Features crisp check rings on the left for Ward MCQs, and play icons on the right for tonight’s lectures.',
    },
    {
      id: 'timeline',
      name: '3. Shift Timeline Horizon',
      desc: 'Horizontal timeline visually separating morning ward rounds (09:00) from hostel desk (20:00).',
    },
    {
      id: 'progress',
      name: '4. Target Progress Bars',
      desc: 'Progress-first design featuring horizontal completion fill bars for instant visual reassurance.',
    },
    {
      id: 'triptych',
      name: '5. Triple Triptych Desk',
      desc: 'High-density 3-column banner with Ward MCQs, Tonight’s Lectures, and spaced revision.',
    },
  ],
  '4x4': [
    {
      id: 'three-tier',
      name: '1. Three-Tier Master Desk',
      desc: 'Full-page overview dividing your workflow into Ward MCQs, Tonight’s Video Queue, and 15-min Spaced Revision.',
    },
    {
      id: 'tabbed',
      name: '2. Tabbed Focus Deck',
      desc: 'Category filter tabs at the top (All, MCQs, Videos, Revision) with status indicators.',
    },
    {
      id: 'timeline-kanban',
      name: '3. Full Shift Kanban Timeline',
      desc: 'Chronological timeline mapping your full day from 09:00 ward duty to midnight hostel locking.',
    },
    {
      id: 'command',
      name: '4. High-Yield Command Deck',
      desc: 'Includes 1.5x/2.0x playback speed calculations and Grand Test countdown indicator.',
    },
  ],
}


export const WidgetSettingsModal: React.FC<WidgetSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { topics, subjects, activeSubjectId } = useMedMatrixStore()

  const [activeSize, setActiveSize] = useState<SizeCategory>('4x2')
  const [selectedDesignIndex, setSelectedDesignIndex] = useState(0)

  // Sliders
  const [opacity, setOpacity] = useState(85)
  const [blur, setBlur] = useState(18)
  const [radius, setRadius] = useState(24)

  // Toolbox state
  const [showBorder, setShowBorder] = useState(true)
  const [showDuration, setShowDuration] = useState(true)
  const [edgeToEdge, setEdgeToEdge] = useState(false)
  const [fontScale, setFontScale] = useState(100)

  const fs = (basePx: number) => `${Math.round(basePx * (fontScale / 100) * 10) / 10}px`

  const [isSyncing, setIsSyncing] = useState(false)
  const [showHowTo, setShowHowTo] = useState(false)

  // Load saved preferences. Re-runs when the size tab changes so the design picker
  // reflects what the home screen is really showing for that size — previously it reset
  // to design #1, so saving a second time silently overwrote the chosen layout.
  useEffect(() => {
    if (!isOpen) return

    const saved = getSavedSliderSettings()
    setOpacity(saved.opacity)
    setBlur(saved.blur)
    setRadius(saved.cornerRadius)
    setShowBorder(saved.showBorder)
    setShowDuration(saved.showDuration)
    setEdgeToEdge(saved.edgeToEdge)
    setFontScale(saved.fontScale)

    const savedDesignId =
      activeSize === '2x2'
        ? saved.design2x2
        : activeSize === '4x1'
          ? saved.design4x1
          : activeSize === '4x2'
            ? saved.design4x2
            : saved.design4x4
    const savedIndex = designOptions[activeSize].findIndex((d) => d.id === savedDesignId)
    setSelectedDesignIndex(savedIndex >= 0 ? savedIndex : 0)
  }, [isOpen, activeSize])

  if (!isOpen) return null

  const activeSubject =
    subjects.find((s) => s.id === activeSubjectId) || subjects[0]
  const subjectName = activeSubject ? activeSubject.name : 'Microbiology'

  // Live real data
  const wardTopics = topics.filter(
    (t) => t.status === 'STEP_2_WARD_MCQ' && t.subjectId === activeSubjectId
  )
  const mcqCh1 = wardTopics[0]?.title || 'Sterilization & Disinfection'
  const mcqCh2 = wardTopics[1]?.title || 'Bacterial Culture Media'
  const mcqCh3 = wardTopics[2]?.title || 'Staphylococci & Streptococci'

  const videoTopics = topics.filter(
    (t) => t.status === 'STEP_1_WATCHING' && t.subjectId === activeSubjectId
  )
  const vid1Title = videoTopics[0]?.title || 'Bacterial Genetics'
  const vid1Duration = videoTopics[0] ? `${videoTopics[0].durationMinutes}m` : '34m'
  const vid2Title = videoTopics[1]?.title || 'Drug Resistance'
  const vid2Duration = videoTopics[1] ? `${videoTopics[1].durationMinutes}m` : '21m'
  const vid3Title = videoTopics[2]?.title || 'Antimicrobial Therapy'
  const vid3Duration = videoTopics[2] ? `${videoTopics[2].durationMinutes}m` : '18m'

  const srTopics = topics.filter((t) => t.status === 'LOCKED_IN_SR')
  const sr1 = srTopics[0]?.title || 'General Pathology (Anki)'
  const sr2 = srTopics[1]?.title || 'Autonomic Pharmacology'

  const activeDesignList = designOptions[activeSize]
  const currentDesign = activeDesignList[selectedDesignIndex] || activeDesignList[0]

  const handleSaveAndSync = async () => {
    setIsSyncing(true)
    let success = false
    try {
      saveSliderSettings({
        opacity,
        blur,
        cornerRadius: radius,
        showBorder,
        showDuration,
        edgeToEdge,
        fontScale,
        [`design${activeSize}` as const]: currentDesign.id,
      })
      const designPick = { [`design${activeSize}` as const]: currentDesign.id }
      success = await syncActiveStudyDataToWidget(
        topics,
        subjects,
        activeSubjectId,
        { opacity, blur, cornerRadius: radius, showBorder, showDuration, edgeToEdge, fontScale, ...designPick }
      )
    } catch (err) {
      console.warn('[WidgetSettings] Save & sync failed:', err)
    } finally {
      // Never leave the button stuck in its disabled "Syncing..." state.
      setIsSyncing(false)
    }
    if (success) {
      toast.success('Widget settings saved & synced!', {
        description: `Applied ${currentDesign.name} (${opacity}% opacity, ${showBorder ? 'Framed' : 'Frameless'}) to home screen.`,
      })
    } else {
      toast.success('Preferences saved locally.', {
        description: 'Will sync when running on your Android device.',
      })
    }
  }

  const setPreset = (type: 'clear' | 'frosted' | 'opaque') => {
    if (type === 'clear') {
      setOpacity(25)
      setBlur(4)
      setRadius(24)
    } else if (type === 'frosted') {
      setOpacity(85)
      setBlur(18)
      setRadius(24)
    } else {
      setOpacity(100)
      setBlur(0)
      setRadius(24)
    }
  }

  // Dynamic CSS computed from sliders & toolbox
  const alpha = opacity / 100
  const bgStyleCss = showBorder ? `rgba(18, 18, 23, ${alpha})` : 'transparent'
  const borderAlpha = Math.min(0.25, 0.08 + alpha * 0.15)
  const borderRgba = showBorder ? `1px solid rgba(255, 255, 255, ${borderAlpha})` : 'none'
  const cardAlpha = Math.min(0.65, 0.15 + alpha * 0.35)
  const cardBgCss = showBorder ? `rgba(34, 34, 45, ${cardAlpha})` : 'rgba(24, 24, 30, 0.55)'
  const cardBorderCss = showBorder ? `1px solid rgba(255, 255, 255, ${Math.min(0.18, 0.05 + alpha * 0.1)})` : '1px solid rgba(255, 255, 255, 0.08)'
  const cardRadius = Math.max(8, radius - 10) + 'px'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-[#0e0e13] border border-[#23232b] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#1c1c22] flex items-center justify-between bg-[#121217]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 leading-tight">
                Widgets &amp; Customization
              </h2>
              <p className="text-[11px] text-zinc-400">
                14 Layouts &bull; Continuous Sliders &bull; Samsung S24 Ultra
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs custom-scroll">
          {/* Quick Setup Instructions Collapsible */}
          <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-900/40 text-cyan-200/90 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-semibold text-cyan-200 text-xs">
                  How to Add Widget on S24 Ultra
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHowTo(!showHowTo)}
                className="text-[11px] font-bold text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>{showHowTo ? 'Hide steps' : 'View steps'}</span>
                <ChevronRight className={`w-3 h-3 transition-transform ${showHowTo ? 'rotate-90' : ''}`} />
              </button>
            </div>
            {showHowTo && (
              <div className="pt-2 border-t border-cyan-900/40 space-y-1 text-[11px] text-zinc-300">
                <p>1. Go to your S24 Ultra Home Screen.</p>
                <p>2. Long press empty space &rarr; tap <strong>Widgets</strong>.</p>
                <p>3. Select <strong>MedMatrix</strong> &rarr; touch &amp; hold <strong>MedMatrix Today</strong>.</p>
                <p>4. Long press the placed widget and drag the blue dots to resize between <strong>2x2, 4x2, or 4x4</strong>.</p>
              </div>
            )}
          </div>

          {/* Size Category Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-300">Widget Grid Size:</span>
              <div className="flex items-center gap-1 bg-[#181820] p-1 rounded-xl border border-zinc-800">
                {(['2x2', '4x1', '4x2', '4x4'] as SizeCategory[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      // The saved design for this size is restored by the effect above.
                      setActiveSize(size)
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeSize === size
                        ? 'bg-cyan-500 text-black shadow-md'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {size} ({designOptions[size].length})
                  </button>
                ))}
              </div>
            </div>

            {/* Design Variant Pills Carousel */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 custom-scroll">
              {activeDesignList.map((des, idx) => (
                <button
                  key={des.id}
                  type="button"
                  onClick={() => setSelectedDesignIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold shrink-0 transition-all ${
                    selectedDesignIndex === idx
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'bg-[#15151c] text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                  }`}
                >
                  {des.name}
                </button>
              ))}
            </div>
          </div>

          {/* Continuous Sliders Controls */}
          <div className="bg-[#14141a] p-3.5 rounded-2xl border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200 text-xs">
                Real-Time Appearance Sliders
              </span>
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setPreset('clear')}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('frosted')}
                  className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800"
                >
                  Frosted
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('opaque')}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  AMOLED
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Opacity Slider */}
              <div className="bg-[#1b1b24] p-2.5 rounded-xl border border-zinc-800/60 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-300">Opacity</span>
                  <span className="font-mono text-cyan-400 font-bold">{opacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Blur Slider */}
              <div className="bg-[#1b1b24] p-2.5 rounded-xl border border-zinc-800/60 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-300">Frosted Blur</span>
                  <span className="font-mono text-cyan-400 font-bold">{blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="32"
                  value={blur}
                  onChange={(e) => setBlur(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Radius Slider */}
              <div className="bg-[#1b1b24] p-2.5 rounded-xl border border-zinc-800/60 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-300">Corner Radius</span>
                  <span className="font-mono text-cyan-400 font-bold">{radius}dp</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Display & Typography Toolbox */}
          <div className="p-3.5 rounded-2xl bg-[#14141b] border border-[#23232c] space-y-3">
            <div className="flex items-center justify-between border-b border-[#20202a] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🧰</span>
                <span className="font-bold text-zinc-100 text-xs">
                  Display &amp; Typography Toolbox
                </span>
              </div>
              <span className="text-[10px] text-zinc-400">
                Frameless &bull; Font Scale &bull; Clean Titles
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Outer Box / Border Toggle */}
              <div className="bg-[#1b1b24] p-2.5 rounded-xl border border-zinc-800/60 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-zinc-200">Outer Box</div>
                  <div className="text-[9px] text-zinc-400">Frameless mode</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBorder(!showBorder)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                    showBorder
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'bg-red-500/20 text-red-400 border border-red-500/40'
                  }`}
                >
                  {showBorder ? 'Box: ON' : 'Box: OFF'}
                </button>
              </div>

              {/* Video Minutes Toggle */}
              <div className="bg-[#1b1b24] p-2.5 rounded-xl border border-zinc-800/60 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-zinc-200">Video Minutes</div>
                  <div className="text-[9px] text-zinc-400">Hide (34m) duration</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDuration(!showDuration)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                    showDuration
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                  }`}
                >
                  {showDuration ? 'Minutes: SHOW' : 'Minutes: HIDE'}
                </button>
              </div>

              {/* Edge Stretch Toggle */}
              <div className="bg-[#1b1b24] p-2.5 rounded-xl border border-zinc-800/60 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-zinc-200">Edge Stretch</div>
                  <div className="text-[9px] text-zinc-400">Expand text width</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEdgeToEdge(!edgeToEdge)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                    edgeToEdge
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60'
                  }`}
                >
                  {edgeToEdge ? 'Stretch: ON' : 'Stretch: OFF'}
                </button>
              </div>
            </div>

            {/* Font Scale Slider */}
            <div className="bg-[#1b1b24] p-2.5 rounded-xl border border-zinc-800/60 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-300 font-bold">Font Size Scale</span>
                <span className="font-mono text-cyan-400 font-bold">{fontScale}%</span>
              </div>
              <input
                type="range"
                min="80"
                max="135"
                value={fontScale}
                onChange={(e) => setFontScale(Number(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[9px] text-zinc-500">
                <span>80% (Compact)</span>
                <span>100% (Default)</span>
                <span>135% (Large)</span>
              </div>
            </div>
          </div>

          {/* Live Rendered Canvas */}
          <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-[#121217] via-[#0d0d12] to-[#07070a] border border-[#262630] flex flex-col items-center justify-center min-h-[190px] relative overflow-hidden">
            {/* Wallpaper glow */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                background:
                  'radial-gradient(circle at 75% 25%, rgba(56, 189, 248, 0.2) 0%, transparent 55%), radial-gradient(circle at 20% 75%, rgba(52, 211, 153, 0.16) 0%, transparent 60%)',
              }}
            />

            {/* LIVE WIDGET CONTAINER */}
            <div
              className="z-10 transition-all duration-100 flex flex-col justify-between overflow-hidden box-border"
              style={{
                width: activeSize === '2x2' ? '185px' : 'min(380px, 100%)',
                height:
                  activeSize === '2x2'
                    ? '185px'
                    : activeSize === '4x1'
                    ? '78px'
                    : activeSize === '4x2'
                    ? '155px'
                    : '330px',
                maxWidth: '100%',
                padding:
                  activeSize === '4x1'
                    ? (edgeToEdge ? '4px 4px' : '6px 12px')
                    : activeSize === '2x2'
                    ? (edgeToEdge ? '6px 6px' : '11px 12px')
                    : (edgeToEdge ? '8px 8px' : '12px 14px'),
                backgroundColor: bgStyleCss,
                border: borderRgba,
                borderRadius: showBorder ? `${radius}px` : '0px',
                backdropFilter: (showBorder && blur > 0) ? `blur(${blur}px)` : 'none',
                WebkitBackdropFilter: (showBorder && blur > 0) ? `blur(${blur}px)` : 'none',
                boxShadow: showBorder
                  ? `0 16px 36px -8px rgba(0, 0, 0, ${Math.min(
                      0.85,
                      0.2 + alpha * 0.6
                    )}), 0 0 0 1px rgba(255, 255, 255, ${borderAlpha})`
                  : 'none',
                filter: showBorder ? 'none' : 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.95))',
              }}
            >
              {/* 2X2 VARIANTS */}
              {activeSize === '2x2' && (
                <div className="w-full h-full flex flex-col justify-between overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between w-full">
                    <span className="font-extrabold text-[12px] text-white tracking-wide">
                      TODAY
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 truncate max-w-[80px]">
                      {subjectName}
                    </span>
                  </div>

                  {/* Body according to variant */}
                  {currentDesign.id === 'hero' && (
                    <>
                      <div
                        className="p-2 mt-2 flex flex-col justify-center"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[9px] font-bold text-emerald-400 block tracking-wider">
                          🩺 CURRENT WARD MCQ
                        </span>
                        <span className="text-[12px] font-bold text-white block truncate mt-0.5">
                          {mcqCh1}
                        </span>
                        <span className="text-[10px] text-zinc-300 block truncate mt-0.5">
                          {mcqCh2}
                        </span>
                      </div>
                      <div
                        className="px-2 py-1.5 mt-1.5 flex flex-col justify-center"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[9px] font-bold text-sky-400 block tracking-wider">
                          🌙 NEXT TONIGHT
                        </span>
                        <span className="text-[11px] font-bold text-white block truncate mt-0.5">
                          {vid1Title} ({vid1Duration})
                        </span>
                      </div>
                    </>
                  )}

                  {currentDesign.id === 'dual' && (
                    <div className="space-y-1.5 mt-2">
                      <div
                        className="p-1.5"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[9px] font-bold text-emerald-400 block">
                          🩺 WARD MCQS
                        </span>
                        <span className="text-[10px] font-bold text-white block truncate">
                          • {mcqCh1}
                        </span>
                        <span className="text-[10px] text-zinc-300 block truncate">
                          • {mcqCh2}
                        </span>
                      </div>
                      <div
                        className="p-1.5"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[9px] font-bold text-sky-400 block">
                          🌙 TONIGHT
                        </span>
                        <span className="text-[10px] font-bold text-white block truncate">
                          • {vid1Title} ({vid1Duration})
                        </span>
                      </div>
                    </div>
                  )}

                  {currentDesign.id === 'sequence' && (
                    <div className="space-y-1 mt-2">
                      <div
                        className="p-1.5 flex items-center gap-1.5"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[8px] flex items-center justify-center shrink-0">
                          1
                        </span>
                        <span className="text-[10px] font-bold text-white truncate">
                          {mcqCh1}
                        </span>
                      </div>
                      <div
                        className="p-1.5 flex items-center gap-1.5"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[8px] flex items-center justify-center shrink-0">
                          2
                        </span>
                        <span className="text-[10px] text-zinc-300 truncate">
                          {mcqCh2}
                        </span>
                      </div>
                      <div
                        className="p-1.5 flex items-center gap-1.5"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-sky-500/20 text-sky-400 font-bold text-[8px] flex items-center justify-center shrink-0">
                          3
                        </span>
                        <span className="text-[10px] text-sky-300 truncate">
                          {vid1Title}
                        </span>
                      </div>
                    </div>
                  )}

                  {currentDesign.id === 'horizon' && (
                    <div className="space-y-1.5 mt-2">
                      <div
                        className="p-2 border-l-2 border-emerald-400"
                        style={{
                          backgroundColor: cardBgCss,
                          borderTop: cardBorderCss,
                          borderRight: cardBorderCss,
                          borderBottom: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[8px] font-bold text-emerald-400 block">
                          ☀️ 09:00 WARD ROUNDS
                        </span>
                        <span className="text-[11px] font-bold text-white block truncate">
                          {mcqCh1}
                        </span>
                      </div>
                      <div
                        className="p-2 border-l-2 border-sky-400"
                        style={{
                          backgroundColor: cardBgCss,
                          borderTop: cardBorderCss,
                          borderRight: cardBorderCss,
                          borderBottom: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[8px] font-bold text-sky-400 block">
                          🌙 20:00 HOSTEL DESK
                        </span>
                        <span className="text-[11px] font-bold text-white block truncate">
                          {vid1Title} ({vid1Duration})
                        </span>
                      </div>
                    </div>
                  )}

                  {currentDesign.id === 'rings' && (
                    <div className="space-y-1 mt-1 text-center">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div
                          className="p-1.5 flex flex-col items-center"
                          style={{
                            backgroundColor: cardBgCss,
                            border: cardBorderCss,
                            borderRadius: cardRadius,
                          }}
                        >
                          <div className="w-6 h-6 rounded-full border-2 border-emerald-400 border-t-transparent flex items-center justify-center font-bold text-[9px] text-emerald-300">
                            2
                          </div>
                          <span className="text-[8px] font-bold text-zinc-300 mt-0.5">
                            Ready
                          </span>
                        </div>
                        <div
                          className="p-1.5 flex flex-col items-center"
                          style={{
                            backgroundColor: cardBgCss,
                            border: cardBorderCss,
                            borderRadius: cardRadius,
                          }}
                        >
                          <div className="w-6 h-6 rounded-full border-2 border-sky-400 border-l-transparent flex items-center justify-center font-bold text-[9px] text-sky-300">
                            55m
                          </div>
                          <span className="text-[8px] font-bold text-zinc-300 mt-0.5">
                            Queue
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-white truncate block mt-1">
                        Next: {mcqCh1}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 4X1 SLIM VARIANTS */}
              {activeSize === '4x1' && (
                <div className="w-full h-full flex flex-col justify-center overflow-hidden">
                  {currentDesign.id === 'pill-multi' && (
                    <div className="flex items-center justify-between gap-3 w-full h-full min-w-0">
                      <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                        <div className="flex items-center mb-1">
                          <span
                            className="font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 tracking-wider"
                            style={{ fontSize: fs(8) }}
                          >
                            🩺 WARD MCQ
                          </span>
                        </div>
                        <span
                          className="font-bold text-white truncate block leading-tight"
                          style={{ fontSize: fs(11.5) }}
                        >
                          {mcqCh1}
                        </span>
                        <span
                          className="font-semibold text-zinc-300 truncate block mt-0.5 leading-tight"
                          style={{ fontSize: fs(10.5) }}
                        >
                          {mcqCh2}
                        </span>
                      </div>
                      <div className="w-[1px] h-11 bg-white/15 shrink-0" />
                      <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                        <div className="flex items-center mb-1">
                          <span
                            className="font-extrabold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 tracking-wider"
                            style={{ fontSize: fs(8) }}
                          >
                            🌙 TONIGHT
                          </span>
                        </div>
                        <span
                          className="font-bold text-white truncate block leading-tight"
                          style={{ fontSize: fs(11.5) }}
                        >
                          {vid1Title}{showDuration ? ` (${vid1Duration})` : ''}
                        </span>
                        <span
                          className="font-semibold text-zinc-300 truncate block mt-0.5 leading-tight"
                          style={{ fontSize: fs(10.5) }}
                        >
                          {vid2Title}{showDuration ? ` (${vid2Duration})` : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  {currentDesign.id === 'max-typo-multi' && (
                    <div className="flex items-center justify-between gap-3 w-full h-full min-w-0">
                      <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                        <span
                          className="font-extrabold text-emerald-400 tracking-wider uppercase mb-0.5"
                          style={{ fontSize: fs(8.5) }}
                        >
                          WARD MCQS
                        </span>
                        <span
                          className="font-extrabold text-white truncate block leading-tight"
                          style={{ fontSize: fs(11.5) }}
                        >
                          1. {mcqCh1}
                        </span>
                        <span
                          className="font-semibold text-zinc-300 truncate block mt-0.5 leading-tight"
                          style={{ fontSize: fs(10.5) }}
                        >
                          2. {mcqCh2}
                        </span>
                      </div>
                      <div className="w-[1px] h-11 bg-white/15 shrink-0" />
                      <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                        <span
                          className="font-extrabold text-sky-400 tracking-wider uppercase mb-0.5"
                          style={{ fontSize: fs(8.5) }}
                        >
                          TONIGHT'S VIDEOS
                        </span>
                        <span
                          className="font-extrabold text-white truncate block leading-tight"
                          style={{ fontSize: fs(11.5) }}
                        >
                          1. {vid1Title}{showDuration ? ` (${vid1Duration})` : ''}
                        </span>
                        <span
                          className="font-semibold text-zinc-300 truncate block mt-0.5 leading-tight"
                          style={{ fontSize: fs(10.5) }}
                        >
                          2. {vid2Title}{showDuration ? ` (${vid2Duration})` : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  {currentDesign.id === 'dense-3tier' && (
                    <div className="flex items-center justify-between gap-2.5 w-full h-full min-w-0">
                      <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className="font-extrabold text-emerald-400 tracking-wider"
                            style={{ fontSize: fs(8) }}
                          >
                            🩺 WARD MCQS
                          </span>
                          <span
                            className="font-bold text-emerald-400 bg-emerald-500/15 px-1 rounded"
                            style={{ fontSize: fs(7.5) }}
                          >
                            3 QUEUED
                          </span>
                        </div>
                        <span
                          className="font-bold text-white truncate block leading-tight"
                          style={{ fontSize: fs(10.5) }}
                        >
                          • {mcqCh1}
                        </span>
                        <span
                          className="font-semibold text-zinc-300 truncate block mt-0.5 leading-tight"
                          style={{ fontSize: fs(9.5) }}
                        >
                          • {mcqCh2}
                        </span>
                        <span
                          className="font-medium text-zinc-400 truncate block mt-0.5 leading-tight"
                          style={{ fontSize: fs(9) }}
                        >
                          • {mcqCh3}
                        </span>
                      </div>
                      <div className="w-[1px] h-12 bg-white/15 shrink-0" />
                      <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className="font-extrabold text-sky-400 tracking-wider"
                            style={{ fontSize: fs(8) }}
                          >
                            🌙 TONIGHT
                          </span>
                          <span
                            className="font-bold text-sky-400 bg-sky-500/15 px-1 rounded"
                            style={{ fontSize: fs(7.5) }}
                          >
                            55m
                          </span>
                        </div>
                        <span
                          className="font-bold text-white truncate block leading-tight"
                          style={{ fontSize: fs(10.5) }}
                        >
                          • {vid1Title}{showDuration ? ` (${vid1Duration})` : ''}
                        </span>
                        <span
                          className="font-semibold text-zinc-300 truncate block mt-0.5 leading-tight"
                          style={{ fontSize: fs(9.5) }}
                        >
                          • {vid2Title}{showDuration ? ` (${vid2Duration})` : ''}
                        </span>
                        <span
                          className="font-medium text-zinc-400 truncate block mt-0.5 leading-tight"
                          style={{ fontSize: fs(9) }}
                        >
                          • {vid3Title}{showDuration ? ` (${vid3Duration})` : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 4X2 VARIANTS */}
              {activeSize === '4x2' && (
                <div className="w-full h-full flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between w-full min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-extrabold text-[13px] text-white tracking-wide shrink-0">
                        TODAY
                      </span>
                      <span className="text-[11px] text-[#94A3B8] font-medium truncate">
                        • {format(new Date(), 'EEE, MMM d')}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 truncate max-w-[120px] shrink-0">
                      {subjectName}
                    </span>
                  </div>

                  {currentDesign.id === 'desk' && (
                    <div
                      className="grid grid-cols-2 gap-2 my-auto"
                      style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}
                    >
                      <div
                        className="p-2 flex flex-col justify-center min-w-0 overflow-hidden"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[10px] font-bold text-emerald-400 block tracking-wider truncate">
                          🩺 WARD MCQS
                        </span>
                        <span className="text-[11px] font-bold text-white block truncate mt-1">
                          {mcqCh1}
                        </span>
                        <span className="text-[10px] text-zinc-300 block truncate mt-0.5">
                          {mcqCh2}
                        </span>
                      </div>
                      <div
                        className="p-2 flex flex-col justify-center min-w-0 overflow-hidden"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[10px] font-bold text-sky-400 block tracking-wider truncate">
                          🌙 TONIGHT&apos;S VIDEOS
                        </span>
                        <span className="text-[11px] font-bold text-white block truncate mt-1">
                          {vid1Title} ({vid1Duration})
                        </span>
                        <span className="text-[10px] text-zinc-300 block truncate mt-0.5">
                          {vid2Title} ({vid2Duration})
                        </span>
                      </div>
                    </div>
                  )}

                  {currentDesign.id === 'checkbox' && (
                    <div
                      className="grid grid-cols-2 gap-2 my-auto"
                      style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}
                    >
                      <div
                        className="p-2 min-w-0 overflow-hidden"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[9px] font-bold text-emerald-400 block mb-1 truncate">
                          🩺 WARD MCQS
                        </span>
                        <div className="flex items-center gap-1.5 py-0.5 min-w-0">
                          <span className="w-3 h-3 rounded-full border border-emerald-400 shrink-0" />
                          <span className="text-[11px] font-bold text-white truncate min-w-0">
                            {mcqCh1}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 py-0.5 min-w-0">
                          <span className="w-3 h-3 rounded-full border border-zinc-500 shrink-0" />
                          <span className="text-[10px] text-zinc-300 truncate min-w-0">
                            {mcqCh2}
                          </span>
                        </div>
                      </div>
                      <div
                        className="p-2 min-w-0 overflow-hidden"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[9px] font-bold text-sky-400 block mb-1 truncate">
                          🌙 TONIGHT QUEUE
                        </span>
                        <div className="flex items-center gap-1.5 py-0.5 min-w-0">
                          <span className="text-[9px] text-sky-400 shrink-0">▶</span>
                          <span className="text-[11px] font-bold text-white truncate min-w-0">
                            {vid1Title} ({vid1Duration})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 py-0.5 min-w-0">
                          <span className="text-[9px] text-sky-400 shrink-0">▶</span>
                          <span className="text-[10px] text-zinc-300 truncate min-w-0">
                            {vid2Title} ({vid2Duration})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentDesign.id === 'timeline' && (
                    <div
                      className="grid grid-cols-2 gap-2 my-auto"
                      style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}
                    >
                      <div
                        className="p-2 border-t-2 border-emerald-400 min-w-0 overflow-hidden"
                        style={{
                          backgroundColor: cardBgCss,
                          borderRight: cardBorderCss,
                          borderBottom: cardBorderCss,
                          borderLeft: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <div className="flex justify-between text-[9px] font-bold text-emerald-400">
                          <span>☀️ MORNING</span>
                          <span className="text-zinc-400">09:00</span>
                        </div>
                        <span className="text-[11px] font-bold text-white block truncate mt-1">
                          {mcqCh1}
                        </span>
                        <span className="text-[10px] text-zinc-300 block truncate">
                          {mcqCh2}
                        </span>
                      </div>
                      <div
                        className="p-2 border-t-2 border-sky-400 min-w-0 overflow-hidden"
                        style={{
                          backgroundColor: cardBgCss,
                          borderRight: cardBorderCss,
                          borderBottom: cardBorderCss,
                          borderLeft: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <div className="flex justify-between text-[9px] font-bold text-sky-400">
                          <span>🌙 HOSTEL</span>
                          <span className="text-zinc-400">20:00</span>
                        </div>
                        <span className="text-[11px] font-bold text-white block truncate mt-1">
                          {vid1Title} ({vid1Duration})
                        </span>
                        <span className="text-[10px] text-zinc-300 block truncate">
                          {vid2Title} ({vid2Duration})
                        </span>
                      </div>
                    </div>
                  )}

                  {currentDesign.id === 'progress' && (
                    <div
                      className="grid grid-cols-2 gap-2 my-auto"
                      style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}
                    >
                      <div
                        className="p-2 min-w-0 overflow-hidden"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <div className="flex justify-between text-[9px] mb-1">
                          <span className="font-bold text-emerald-400">MCQS</span>
                          <span className="text-white font-bold">2 Ready</span>
                        </div>
                        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-1.5">
                          <div className="h-full bg-emerald-400 rounded-full w-full" />
                        </div>
                        <span className="text-[11px] font-bold text-white block truncate">
                          {mcqCh1}
                        </span>
                      </div>
                      <div
                        className="p-2 min-w-0 overflow-hidden"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <div className="flex justify-between text-[9px] mb-1">
                          <span className="font-bold text-sky-400">VIDEOS</span>
                          <span className="text-white font-bold">55 Mins</span>
                        </div>
                        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-1.5">
                          <div className="h-full bg-sky-400 rounded-full w-2/3" />
                        </div>
                        <span className="text-[11px] font-bold text-white block truncate">
                          {vid1Title} ({vid1Duration})
                        </span>
                      </div>
                    </div>
                  )}

                  {currentDesign.id === 'triptych' && (
                    <div
                      className="grid grid-cols-3 gap-1.5 my-auto"
                      style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)' }}
                    >
                      <div
                        className="p-2 text-center min-w-0 overflow-hidden"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[9px] font-bold text-emerald-400 block truncate">
                          🩺 MCQS
                        </span>
                        <span className="text-[10px] font-bold text-white block truncate mt-0.5">
                          {mcqCh1}
                        </span>
                      </div>
                      <div
                        className="p-2 text-center min-w-0 overflow-hidden"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[9px] font-bold text-sky-400 block truncate">
                          🌙 VIDEOS
                        </span>
                        <span className="text-[10px] font-bold text-white block truncate mt-0.5">
                          {vid1Title}
                        </span>
                      </div>
                      <div
                        className="p-2 text-center min-w-0 overflow-hidden"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[9px] font-bold text-amber-400 block truncate">
                          ⚡ REVISION
                        </span>
                        <span className="text-[10px] font-bold text-white block truncate mt-0.5">
                          {sr1}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 4X4 VARIANTS */}
              {activeSize === '4x4' && (
                <div className="w-full h-full flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between w-full min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-extrabold text-[14px] text-white tracking-wide shrink-0">
                        TODAY
                      </span>
                      <span className="text-[11px] text-[#94A3B8] truncate">
                        • {format(new Date(), 'EEEE, MMM d')}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 truncate max-w-[120px] shrink-0">
                      {subjectName}
                    </span>
                  </div>

                  {currentDesign.id === 'three-tier' && (
                    <div className="space-y-2 mt-2">
                      <div
                        className="p-2"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[9px] font-bold text-emerald-400 block">
                          🩺 WARD MCQS (FROM LAST NIGHT)
                        </span>
                        <span className="text-[11px] font-bold text-white block truncate mt-0.5">
                          {mcqCh1}
                        </span>
                        <span className="text-[10px] text-zinc-300 block truncate mt-0.5">
                          {mcqCh2}
                        </span>
                      </div>
                      <div
                        className="p-2"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[9px] font-bold text-sky-400 block">
                          🌙 TONIGHT&apos;S VIDEO QUEUE
                        </span>
                        <span className="text-[11px] font-bold text-white block truncate mt-0.5">
                          {vid1Title} ({vid1Duration})
                        </span>
                        <span className="text-[10px] text-zinc-300 block truncate mt-0.5">
                          {vid2Title} ({vid2Duration})
                        </span>
                      </div>
                      <div
                        className="p-2"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[9px] font-bold text-amber-400 block">
                          ⚡ 15-MIN SPACED REVISION
                        </span>
                        <span className="text-[10px] font-medium text-white block truncate mt-0.5">
                          {sr1} &bull; {sr2}
                        </span>
                      </div>
                    </div>
                  )}

                  {currentDesign.id === 'tabbed' && (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded bg-cyan-500 text-black font-bold text-[9px]">
                          ALL (5)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[9px]">
                          MCQS (2)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[9px]">
                          VIDEOS (2)
                        </span>
                      </div>
                      <div
                        className="p-2 flex justify-between items-center"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <div>
                          <span className="text-[8px] font-bold text-emerald-400 block">
                            WARD MCQ
                          </span>
                          <span className="text-[11px] font-bold text-white truncate block">
                            {mcqCh1}
                          </span>
                        </div>
                        <span className="text-[9px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10">
                          READY
                        </span>
                      </div>
                      <div
                        className="p-2 flex justify-between items-center"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <div>
                          <span className="text-[8px] font-bold text-sky-400 block">
                            TONIGHT VIDEO
                          </span>
                          <span className="text-[11px] font-bold text-white truncate block">
                            {vid1Title}
                          </span>
                        </div>
                        <span className="text-[9px] text-sky-400 font-bold px-1.5 py-0.5 rounded bg-sky-500/10">
                          {vid1Duration}
                        </span>
                      </div>
                    </div>
                  )}

                  {currentDesign.id === 'timeline-kanban' && (
                    <div className="space-y-2 mt-2">
                      <div
                        className="p-2 border-l-4 border-emerald-400"
                        style={{
                          backgroundColor: cardBgCss,
                          borderTop: cardBorderCss,
                          borderRight: cardBorderCss,
                          borderBottom: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[8px] font-bold text-emerald-400 block">
                          09:00 - 17:00 &bull; WARD SPRINT
                        </span>
                        <span className="text-[11px] font-bold text-white block truncate">
                          {mcqCh1}
                        </span>
                      </div>
                      <div
                        className="p-2 border-l-4 border-sky-400"
                        style={{
                          backgroundColor: cardBgCss,
                          borderTop: cardBorderCss,
                          borderRight: cardBorderCss,
                          borderBottom: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[8px] font-bold text-sky-400 block">
                          20:30 - 23:30 &bull; VIDEO LECTURES
                        </span>
                        <span className="text-[11px] font-bold text-white block truncate">
                          {vid1Title} ({vid1Duration})
                        </span>
                      </div>
                    </div>
                  )}

                  {currentDesign.id === 'command' && (
                    <div className="space-y-2 mt-2">
                      <div className="grid grid-cols-3 gap-1">
                        <div
                          className="p-1 text-center"
                          style={{
                            backgroundColor: cardBgCss,
                            border: cardBorderCss,
                            borderRadius: cardRadius,
                          }}
                        >
                          <span className="text-[8px] text-zinc-400 block">1.0x</span>
                          <span className="text-[10px] font-bold text-white">55m</span>
                        </div>
                        <div
                          className="p-1 text-center bg-cyan-950/40 border border-cyan-800"
                          style={{ borderRadius: cardRadius }}
                        >
                          <span className="text-[8px] text-cyan-300 block">1.5x</span>
                          <span className="text-[10px] font-bold text-cyan-200">37m</span>
                        </div>
                        <div
                          className="p-1 text-center"
                          style={{
                            backgroundColor: cardBgCss,
                            border: cardBorderCss,
                            borderRadius: cardRadius,
                          }}
                        >
                          <span className="text-[8px] text-zinc-400 block">2.0x</span>
                          <span className="text-[10px] font-bold text-white">28m</span>
                        </div>
                      </div>
                      <div
                        className="p-2"
                        style={{
                          backgroundColor: cardBgCss,
                          border: cardBorderCss,
                          borderRadius: cardRadius,
                        }}
                      >
                        <span className="text-[9px] font-bold text-emerald-400 block">
                          🩺 WARD MCQS
                        </span>
                        <span className="text-[11px] font-bold text-white block truncate">
                          {mcqCh1}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Design Info */}
          <div className="p-3 bg-[#13131a] rounded-xl border border-zinc-800/60 text-zinc-400 text-xs space-y-1">
            <span className="font-bold text-white block text-xs">
              {currentDesign.name}
            </span>
            <p className="text-[11px] leading-relaxed">{currentDesign.desc}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1c1c22] bg-[#121217] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-medium"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSaveAndSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSyncing ? 'Syncing...' : 'Save & Sync to Home Screen'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
