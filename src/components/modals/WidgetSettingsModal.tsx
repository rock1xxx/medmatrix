import React, { useState, useEffect } from 'react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import {
  WidgetBackgroundStyle,
  WidgetCornerRadius,
  getSavedWidgetStyles,
  saveWidgetStyles,
  syncActiveStudyDataToWidget,
} from '../../lib/widgetBridge'
import {
  X,
  Sparkles,
  Smartphone,
  Check,
  Moon,
  Stethoscope,
  Clock,
  Layers,
  Sliders,
  ChevronRight,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface WidgetSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type PreviewSize = '2x2' | '4x2' | '4x4'

export const WidgetSettingsModal: React.FC<WidgetSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { topics, subjects, activeSubjectId } = useMedMatrixStore()

  const [previewSize, setPreviewSize] = useState<PreviewSize>('4x2')
  const [bgStyle, setBgStyle] = useState<WidgetBackgroundStyle>('frosted')
  const [cornerRadius, setCornerRadius] = useState<WidgetCornerRadius>(24)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showHowTo, setShowHowTo] = useState(false)

  // Initialize from saved styles on open
  useEffect(() => {
    if (isOpen) {
      const saved = getSavedWidgetStyles()
      setBgStyle(saved.bgStyle)
      setCornerRadius(saved.cornerRadius)
    }
  }, [isOpen])

  if (!isOpen) return null

  const activeSubject =
    subjects.find((s) => s.id === activeSubjectId) || subjects[0]
  const subjectName = activeSubject ? activeSubject.name : 'Microbiology'

  // Real data
  const wardTopics = topics.filter(
    (t) => t.status === 'STEP_2_WARD_MCQ' && t.subjectId === activeSubjectId
  )
  const mcqCh1 = wardTopics[0]?.title || 'Sterilization & Disinfection'
  const mcqCh2 = wardTopics[1]?.title || 'Bacterial Culture Media'

  const videoTopics = topics.filter(
    (t) => t.status === 'STEP_1_WATCHING' && t.subjectId === activeSubjectId
  )
  const videoCh1Title = videoTopics[0]?.title || 'Bacterial Genetics'
  const videoCh1Time = videoTopics[0] ? `${videoTopics[0].durationMinutes}m` : '34m'
  const videoCh2Title = videoTopics[1]?.title || 'Drug Resistance'
  const videoCh2Time = videoTopics[1] ? `${videoTopics[1].durationMinutes}m` : '21m'

  const srTopics = topics.filter((t) => t.status === 'LOCKED_IN_SR')
  const srCh1 = srTopics[0]?.title || 'General Pathology (Anki)'
  const srCh2 = srTopics[1]?.title || 'Autonomic Pharmacology'

  const handleSaveAndSync = async () => {
    setIsSyncing(true)
    saveWidgetStyles(bgStyle, cornerRadius)
    const success = await syncActiveStudyDataToWidget(
      topics,
      subjects,
      activeSubjectId,
      { bgStyle, cornerRadius }
    )
    setIsSyncing(false)
    if (success) {
      toast.success('Widget settings updated!', {
        description: 'Changes applied to your Android home screen widget.',
      })
    } else {
      toast.success('Preferences saved locally.', {
        description: 'Will sync next time on device.',
      })
    }
  }

  // Dynamic preview styling
  const getContainerBg = () => {
    switch (bgStyle) {
      case 'transparent':
        return 'bg-black/30 backdrop-blur-sm border-white/10 shadow-lg'
      case 'opaque':
        return 'bg-[#101014] border-white/20 shadow-2xl'
      case 'frosted':
      default:
        return 'bg-[#141418]/85 backdrop-blur-md border-white/15 shadow-2xl'
    }
  }

  const getCardBg = () => {
    switch (bgStyle) {
      case 'transparent':
        return 'bg-white/5 border border-white/10'
      case 'opaque':
        return 'bg-[#1a1a22] border border-white/10'
      case 'frosted':
      default:
        return 'bg-[#22222c]/50 backdrop-blur-sm border border-white/10'
    }
  }

  const getRadiusClass = () => {
    switch (cornerRadius) {
      case 16:
        return 'rounded-2xl'
      case 32:
        return 'rounded-[32px]'
      case 24:
      default:
        return 'rounded-3xl'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#0e0e12] border border-[#23232b] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1c1c22] flex items-center justify-between bg-[#121217]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 leading-tight">
                Widgets & Customization
              </h2>
              <p className="text-[11px] text-zinc-400">
                Samsung One UI & Android Home Screen
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
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Info Banner */}
          <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-900/40 text-cyan-200/90 space-y-2">
            <div className="flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-cyan-200">
                  Native Android Home Screen Widget
                </p>
                <p className="text-[11px] text-cyan-300/80 leading-relaxed">
                  Widgets are added directly from your Samsung S24 Ultra home screen. Long-press empty wallpaper &rarr; <strong>Widgets</strong> &rarr; <strong>MedMatrix Today</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowHowTo(!showHowTo)}
              className="text-[11px] font-semibold text-cyan-400 hover:underline flex items-center gap-1 pt-1"
            >
              <span>{showHowTo ? 'Hide setup steps' : 'View how to add & resize on S24 Ultra'}</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${showHowTo ? 'rotate-90' : ''}`} />
            </button>
            {showHowTo && (
              <div className="pt-2 border-t border-cyan-900/40 space-y-1.5 text-[11px] text-zinc-300 pl-1">
                <p>1. Go to your phone&apos;s home screen.</p>
                <p>2. Long press an empty area &rarr; tap <strong>Widgets</strong>.</p>
                <p>3. Search or scroll to <strong>MedMatrix</strong> &rarr; tap <strong>MedMatrix Today</strong>.</p>
                <p>4. Touch &amp; hold to place it on your screen.</p>
                <p>5. Long press the placed widget and drag the resize handles to switch between <strong>2x2, 4x2, or 4x4</strong>.</p>
              </div>
            )}
          </div>

          {/* Live Preview Switcher */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-300">Live Appearance Preview</span>
              <div className="flex items-center gap-1 bg-[#181820] p-1 rounded-xl border border-zinc-800">
                {(['2x2', '4x2', '4x4'] as PreviewSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPreviewSize(size)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      previewSize === size
                        ? 'bg-cyan-500 text-black shadow-md'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Widget Preview Canvas */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121216] to-[#1c1c24] border border-[#262630] flex items-center justify-center min-h-[170px]">
              {/* 2x2 Preview */}
              {previewSize === '2x2' && (
                <div
                  className={`w-[170px] min-h-[160px] p-3.5 border flex flex-col justify-between transition-all duration-300 ${getContainerBg()} ${getRadiusClass()}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[12px] text-white tracking-wide">TODAY</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 truncate max-w-[80px]">
                      {subjectName}
                    </span>
                  </div>

                  <div className={`p-2 rounded-xl mt-2 ${getCardBg()}`}>
                    <span className="text-[9px] font-bold text-emerald-400 block tracking-wide">
                      🩺 WARD MCQ
                    </span>
                    <span className="text-[11px] font-bold text-white block truncate leading-tight mt-0.5">
                      {mcqCh1}
                    </span>
                    <span className="text-[10px] text-zinc-300 block truncate leading-tight mt-0.5">
                      {mcqCh2}
                    </span>
                  </div>

                  <div className={`px-2 py-1.5 rounded-xl mt-2 flex items-center gap-1.5 ${getCardBg()}`}>
                    <Moon className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                    <span className="text-[10px] font-medium text-sky-300 truncate">
                      {videoCh1Title} ({videoCh1Time})
                    </span>
                  </div>
                </div>
              )}

              {/* 4x2 Preview (Default) */}
              {previewSize === '4x2' && (
                <div
                  className={`w-full max-w-[360px] min-h-[135px] p-3.5 border flex flex-col justify-between transition-all duration-300 ${getContainerBg()} ${getRadiusClass()}`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-[13px] text-white tracking-wide">TODAY</span>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        • {format(new Date(), 'EEE, MMM d')}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {subjectName}
                    </span>
                  </div>

                  {/* Dual Cards */}
                  <div className="grid grid-cols-2 gap-2 mt-2.5">
                    {/* Ward MCQs */}
                    <div className={`p-2.5 rounded-xl ${getCardBg()} flex flex-col justify-center`}>
                      <span className="text-[10px] font-bold text-emerald-400 block tracking-wider">
                        🩺 WARD MCQS
                      </span>
                      <span className="text-[11px] font-bold text-white block truncate mt-1">
                        {mcqCh1}
                      </span>
                      <span className="text-[10px] text-zinc-300 block truncate mt-0.5">
                        {mcqCh2}
                      </span>
                    </div>

                    {/* Tonight Videos */}
                    <div className={`p-2.5 rounded-xl ${getCardBg()} flex flex-col justify-center`}>
                      <span className="text-[10px] font-bold text-sky-400 block tracking-wider">
                        🌙 TONIGHT&apos;S VIDEOS
                      </span>
                      <span className="text-[11px] font-bold text-white block truncate mt-1">
                        {videoCh1Title} ({videoCh1Time})
                      </span>
                      <span className="text-[10px] text-zinc-300 block truncate mt-0.5">
                        {videoCh2Title} ({videoCh2Time})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4x4 Preview */}
              {previewSize === '4x4' && (
                <div
                  className={`w-full max-w-[360px] min-h-[220px] p-3.5 border flex flex-col justify-between transition-all duration-300 ${getContainerBg()} ${getRadiusClass()}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-[13px] text-white tracking-wide">TODAY</span>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        • {format(new Date(), 'EEEE, MMM d')}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {subjectName}
                    </span>
                  </div>

                  <div className="space-y-2 mt-2">
                    <div className={`p-2 rounded-xl ${getCardBg()}`}>
                      <span className="text-[9px] font-bold text-emerald-400 block tracking-wide">
                        🩺 WARD MCQS (FROM LAST NIGHT)
                      </span>
                      <span className="text-[11px] font-bold text-white block truncate mt-0.5">
                        {mcqCh1}
                      </span>
                      <span className="text-[10px] text-zinc-300 block truncate mt-0.5">
                        {mcqCh2}
                      </span>
                    </div>

                    <div className={`p-2 rounded-xl ${getCardBg()}`}>
                      <span className="text-[9px] font-bold text-sky-400 block tracking-wide">
                        🌙 TONIGHT&apos;S VIDEO QUEUE
                      </span>
                      <span className="text-[11px] font-bold text-white block truncate mt-0.5">
                        {videoCh1Title} ({videoCh1Time})
                      </span>
                      <span className="text-[10px] text-zinc-300 block truncate mt-0.5">
                        {videoCh2Title} ({videoCh2Time})
                      </span>
                    </div>

                    <div className={`p-2 rounded-xl ${getCardBg()}`}>
                      <span className="text-[9px] font-bold text-amber-400 block tracking-wide">
                        ⚡ 15-MIN SPACED REVISION
                      </span>
                      <span className="text-[10px] font-medium text-white block truncate mt-0.5">
                        {srCh1} • {srCh2}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Background Transparency Selection */}
          <div className="space-y-2">
            <span className="font-semibold text-zinc-300">Background Transparency</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'frosted', label: 'Frosted Glass', desc: 'Blur & dark glass' },
                { id: 'transparent', label: 'Transparent', desc: 'Clear & wallpaper' },
                { id: 'opaque', label: 'Solid Opaque', desc: 'OLED pitch dark' },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setBgStyle(style.id as WidgetBackgroundStyle)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    bgStyle === style.id
                      ? 'border-cyan-500 bg-cyan-500/10 text-white ring-1 ring-cyan-500/40'
                      : 'border-zinc-800 bg-[#141418] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px]">{style.label}</span>
                    {bgStyle === style.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                  <span className="text-[9px] text-zinc-400 block leading-tight">
                    {style.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Rounded Corner Radius Selection */}
          <div className="space-y-2">
            <span className="font-semibold text-zinc-300">Corner Radius</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { radius: 16, label: '16dp', desc: 'Subtle curves' },
                { radius: 24, label: '24dp (Standard)', desc: 'Samsung One UI' },
                { radius: 32, label: '32dp', desc: 'Extra rounded' },
              ].map((item) => (
                <button
                  key={item.radius}
                  type="button"
                  onClick={() => setCornerRadius(item.radius as WidgetCornerRadius)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    cornerRadius === item.radius
                      ? 'border-cyan-500 bg-cyan-500/10 text-white ring-1 ring-cyan-500/40'
                      : 'border-zinc-800 bg-[#141418] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px]">{item.label}</span>
                    {cornerRadius === item.radius && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                  <span className="text-[9px] text-zinc-400 block leading-tight">
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>
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
