import React, { useState, useMemo } from 'react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { SubjectIcon } from '../common/SubjectIcon'
import { SubjectFlowModal } from '../modals/SubjectFlowModal'
import { generateCalendarProjection } from '../../lib/calendarProjection'
import { ProjectedDayItem, DayShiftTag } from '../../types'
import {
  CalendarDays,
  Calendar as CalendarIcon,
  ListFilter,
  CheckCircle2,
  Clock,
  Trophy,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Award,
  ListOrdered,
  Plus,
  X,
  Target,
  FileText,
  AlertCircle,
} from 'lucide-react'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parseISO,
} from 'date-fns'

export const TimelineRoadmap: React.FC = () => {
  const {
    topics,
    subjects,
    subjectOrder,
    activeSubjectId,
    setActiveSubjectId,
    dailyPaceTopics,
    setDailyPaceTopics,
    swtCompletedSubjects,
    markSWTCompleted,
    gtSchedule,
    logGTScore,
    gtStartThreshold,
    dayOverrides,
    setDayOverride,
  } = useMedMatrixStore()

  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar')
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [flowModalOpen, setFlowModalOpen] = useState(false)
  
  // Selected day for detailed inspector modal
  const [selectedDayItem, setSelectedDayItem] = useState<ProjectedDayItem | null>(null)
  
  // GT Score Modal State
  const [selectedGTForScore, setSelectedGTForScore] = useState<string | null>(null)
  const [scoreInput, setScoreInput] = useState<string>('')
  const [percentileInput, setPercentileInput] = useState<string>('')

  // 1. Generate dynamic forward projection
  const projection = useMemo(() => {
    return generateCalendarProjection({
      topics,
      subjects,
      subjectOrder,
      activeSubjectId,
      dailyPaceTopics,
      gtSchedule,
      swtCompletedSubjects,
      gtStartThreshold,
      dayOverrides,
      startDate: new Date(),
    })
  }, [
    topics,
    subjects,
    subjectOrder,
    activeSubjectId,
    dailyPaceTopics,
    gtSchedule,
    swtCompletedSubjects,
    gtStartThreshold,
    dayOverrides,
  ])

  // Map projected days by yyyy-MM-dd for instant lookup
  const projectedDayMap = useMemo(() => {
    const map = new Map<string, ProjectedDayItem>()
    projection.projectedDays.forEach((day) => {
      map.set(day.date, day)
    })
    return map
  }, [projection.projectedDays])

  // 2. Global metrics
  const totalTopics = topics.length
  const lockedCount = topics.filter((t) => t.status === 'LOCKED_IN_SR').length
  const progressPct = Math.round((lockedCount / totalTopics) * 100)
  const remainingHours = Math.round(
    topics
      .filter((t) => t.status !== 'LOCKED_IN_SR')
      .reduce((acc, t) => acc + t.durationMinutes, 0) / 60
  )

  // 3. Calendar Month Grid Calculation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentMonth])

  // Save Shift Override handler
  const handleShiftChange = (dateStr: string, shift: DayShiftTag) => {
    setDayOverride(dateStr, { shiftType: shift })
    if (selectedDayItem && selectedDayItem.date === dateStr) {
      setSelectedDayItem({
        ...selectedDayItem,
        shiftType: shift,
      })
    }
  }

  // GT score logging handlers
  const handleOpenScoreModal = (gtId: string, currentScore?: number, currentPct?: number) => {
    setSelectedGTForScore(gtId)
    setScoreInput(currentScore !== undefined ? String(currentScore) : '')
    setPercentileInput(currentPct !== undefined ? String(currentPct) : '')
  }

  const handleSaveScore = () => {
    if (!selectedGTForScore) return
    const scoreVal = parseInt(scoreInput, 10)
    if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > 800) {
      alert('Please enter a valid NEET PG score between 0 and 800.')
      return
    }
    const pctVal = percentileInput ? parseFloat(percentileInput) : undefined
    logGTScore(selectedGTForScore, scoreVal, pctVal)
    setSelectedGTForScore(null)
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-3 space-y-4 sm:space-y-5 pb-28">
      {/* 1. Header: First Read Estimator & Pace Selector */}
      <div className="bg-[#141418] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-3.5 sm:space-y-4 shadow-sm">
        <div className="flex flex-col gap-3">
          {/* Title & Target Date */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>First Read Target</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5 flex flex-wrap items-baseline gap-1.5">
                <span>{format(projection.estimatedFinishDate, 'd MMMM yyyy')}</span>
                <span className="text-xs font-normal text-zinc-400">
                  ({projection.daysRemaining} days left)
                </span>
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
                {lockedCount} / {totalTopics} lectures locked in SR • {remainingHours} hrs remaining.
              </p>
            </div>
          </div>

          {/* Controls: Daily Pace & Subject Flow */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/60 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Focus Subject Selector */}
              <div className="flex items-center gap-1.5 bg-[#1a1a20] border border-zinc-800 px-2.5 py-1 rounded-xl min-h-[38px]">
                <span className="text-[10px] text-zinc-400 font-medium">Focus:</span>
                <div className="relative flex items-center">
                  <select
                    value={activeSubjectId}
                    onChange={(e) => setActiveSubjectId(e.target.value)}
                    aria-label="Active focus subject"
                    className="bg-transparent text-emerald-400 font-semibold text-xs pr-4 focus:outline-none appearance-none cursor-pointer"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#18181e] text-zinc-200">
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-emerald-400/80 pointer-events-none -ml-3" />
                </div>
              </div>

              {/* Subject Flow Reorder Button */}
              <button
                type="button"
                onClick={() => setFlowModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-700/80 text-zinc-200 text-xs font-medium transition-all shadow-sm min-h-[38px]"
                title="Change subject sequence"
              >
                <ListOrdered size={14} className="text-emerald-400 shrink-0" />
                <span>Subject Flow</span>
              </button>
            </div>

            {/* Daily Pace Selector */}
            <div className="bg-[#1a1a20] border border-zinc-800 p-1 rounded-xl flex items-center gap-1 min-h-[38px]">
              <span className="text-[10px] text-zinc-400 px-1 font-medium hidden sm:inline">Pace:</span>
              {[
                { pace: 1, label: '1 / day' },
                { pace: 2, label: '2 / day' },
                { pace: 3, label: '3 / day' },
              ].map(({ pace, label }) => {
                const isSelected = dailyPaceTopics === pace
                return (
                  <button
                    key={pace}
                    type="button"
                    onClick={() => setDailyPaceTopics(pace)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all active:scale-95 min-h-[28px] ${
                      isSelected
                        ? 'bg-emerald-500 text-black font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] sm:text-xs text-zinc-400">
            <span>Curriculum Progress</span>
            <span className="font-mono text-zinc-300 font-semibold">{progressPct}%</span>
          </div>
          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Upcoming Subject Days Horizon (Horizontal Mini-Spans) */}
        {projection.subjectSpans.length > 0 && (
          <div className="pt-0.5">
            <div className="flex items-center justify-between text-[10.5px] text-zinc-400 mb-1.5 font-medium">
              <span>Upcoming Subject Spans:</span>
              <button
                type="button"
                onClick={() => setFlowModalOpen(true)}
                className="text-[10.5px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 active:scale-95 transition-all"
              >
                <span>Reorder Flow &rarr;</span>
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              {projection.subjectSpans.slice(0, 8).map((span) => (
                <div
                  key={span.subjectId}
                  onClick={() => setFlowModalOpen(true)}
                  className="bg-[#1a1a20] border border-zinc-800/80 hover:border-emerald-500/40 cursor-pointer rounded-xl px-2.5 py-1.5 shrink-0 flex items-center gap-2 active:scale-95 transition-all"
                  title="Tap to rearrange subject sequence"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: span.subjectColor }}
                  />
                  <div>
                    <div className="font-semibold text-zinc-200 text-[11px] leading-tight">
                      {span.subjectName}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {format(parseISO(span.startDate), 'd MMM')} – {format(parseISO(span.endDate), 'd MMM')} ({span.totalDays}d)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. View Mode Toggle (Calendar Grid vs Linear Agenda) */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 gap-2">
        <div className="flex gap-1 bg-[#141418] p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
              viewMode === 'calendar'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CalendarIcon size={14} className={viewMode === 'calendar' ? 'text-emerald-400' : ''} />
            <span>Month Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('agenda')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
              viewMode === 'agenda'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ListFilter size={14} className={viewMode === 'agenda' ? 'text-emerald-400' : ''} />
            <span>Daily Agenda</span>
          </button>
        </div>

        {viewMode === 'calendar' && (
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white active:scale-95 min-w-[32px] min-h-[32px] flex items-center justify-center"
              aria-label="Previous month"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-bold text-zinc-200 min-w-24 sm:min-w-28 text-center font-mono truncate">
              {format(currentMonth, 'MMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white active:scale-95 min-w-[32px] min-h-[32px] flex items-center justify-center"
              aria-label="Next month"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* 3. VIEW A: Month Grid ("Big Calendar View") - Mobile Optimized */}
      {viewMode === 'calendar' && (
        <div className="bg-[#141418] border border-zinc-800/80 rounded-2xl p-2 sm:p-4 space-y-2 select-none">
          {/* Weekday Headers: Single letter on mobile, 3-letter on desktop */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-[11px] font-semibold text-zinc-400 pb-1.5 border-b border-zinc-800/60">
            <span><span className="sm:hidden">S</span><span className="hidden sm:inline">Sun</span></span>
            <span><span className="sm:hidden">M</span><span className="hidden sm:inline">Mon</span></span>
            <span><span className="sm:hidden">T</span><span className="hidden sm:inline">Tue</span></span>
            <span><span className="sm:hidden">W</span><span className="hidden sm:inline">Wed</span></span>
            <span><span className="sm:hidden">T</span><span className="hidden sm:inline">Thu</span></span>
            <span><span className="sm:hidden">F</span><span className="hidden sm:inline">Fri</span></span>
            <span><span className="sm:hidden">S</span><span className="hidden sm:inline">Sat</span></span>
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 pt-0.5">
            {calendarDays.map((date) => {
              const dateStr = format(date, 'yyyy-MM-dd')
              const isCurrent = isSameMonth(date, currentMonth)
              const isCurrentDay = isToday(date)
              const projected = projectedDayMap.get(dateStr)

              return (
                <div
                  key={dateStr}
                  onClick={() => projected && setSelectedDayItem(projected)}
                  className={`min-h-[58px] sm:min-h-[85px] p-1 sm:p-1.5 rounded-xl border transition-all flex flex-col justify-between ${
                    !isCurrent
                      ? 'opacity-20 border-transparent bg-zinc-950/20 pointer-events-none'
                      : projected
                      ? 'cursor-pointer hover:border-zinc-700 bg-[#16161c] border-zinc-800/80 active:scale-95'
                      : 'border-zinc-900 bg-zinc-950/40 text-zinc-600'
                  } ${
                    isCurrentDay
                      ? 'ring-1 ring-emerald-500/50 bg-[#181822]'
                      : ''
                  }`}
                  style={
                    projected?.subjectColor && !projected.isGTDay
                      ? {
                          borderTopColor: projected.subjectColor,
                          borderTopWidth: 2.5,
                        }
                      : undefined
                  }
                >
                  {/* Day Header: Number & Shift Tag */}
                  <div className="flex items-center justify-between leading-none">
                    <span
                      className={`text-[11px] sm:text-xs font-mono font-medium ${
                        isCurrentDay
                          ? 'text-emerald-400 font-bold'
                          : isCurrent
                          ? 'text-zinc-300'
                          : 'text-zinc-600'
                      }`}
                    >
                      {format(date, 'd')}
                    </span>

                    {projected?.shiftType && projected.shiftType !== 'MEDIUM' && (
                      <span
                        className={`text-[8px] sm:text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                          projected.shiftType === 'HIGH'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                        }`}
                        title={`${projected.shiftType} Work Shift`}
                      >
                        {projected.shiftType[0]}
                      </span>
                    )}
                  </div>

                  {/* Day Content Badges - Ultra Compact on Mobile */}
                  <div className="space-y-0.5 my-auto">
                    {/* GT Day Badge */}
                    {projected?.isGTDay && (
                      <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded flex items-center justify-center sm:justify-start gap-1">
                        <Target size={10} className="shrink-0" />
                        <span className="hidden sm:inline truncate">GT Day</span>
                      </div>
                    )}

                    {/* SWT Milestone Badge */}
                    {projected?.isSWTDay && (
                      <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded flex items-center justify-center sm:justify-start gap-1">
                        <Trophy size={10} className="shrink-0" />
                        <span className="hidden sm:inline truncate">SWT</span>
                      </div>
                    )}

                    {/* Normal Lectures Badge */}
                    {projected && !projected.isGTDay && projected.topicsToWatch.length > 0 && (
                      <div>
                        {/* Desktop View: Full name & lecture count */}
                        <div className="hidden sm:block">
                          <div className="text-[10px] font-semibold text-zinc-200 truncate leading-tight">
                            {projected.subjectName}
                          </div>
                          <div className="text-[9px] text-zinc-400 font-mono">
                            {projected.topicsToWatch.length} lecs
                          </div>
                        </div>

                        {/* Mobile View: Clean dots/pill */}
                        <div className="sm:hidden flex items-center justify-center gap-0.5 pt-0.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: projected.subjectColor }}
                          />
                          <span className="text-[9px] font-mono font-medium text-zinc-400">
                            {projected.topicsToWatch.length}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom indicator dot */}
                  <div className="h-0.5 sm:h-1 flex items-center justify-end">
                    {projected?.isSWTDay && (
                      <span className="w-1 h-1 rounded-full bg-emerald-400" />
                    )}
                    {projected?.isGTDay && (
                      <span className="w-1 h-1 rounded-full bg-amber-400" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. VIEW B: Linear Agenda (Scrollable Day-by-Day Feed) */}
      {viewMode === 'agenda' && (
        <div className="space-y-3">
          <div className="text-[11px] sm:text-xs text-zinc-400 px-1 flex items-center justify-between">
            <span>Daily Forward Schedule ({projection.projectedDays.length} projected days)</span>
            <span>Tap shift tag to adjust load</span>
          </div>

          {projection.projectedDays.slice(0, 45).map((day) => {
            const parsedDate = parseISO(day.date)
            const isTodayDate = isToday(parsedDate)

            return (
              <div
                key={day.date}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isTodayDate
                    ? 'bg-[#181824] border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/20'
                    : day.isGTDay
                    ? 'bg-[#1a1712] border-amber-500/40'
                    : day.isSWTDay
                    ? 'bg-[#121a16] border-emerald-500/40'
                    : 'bg-[#141418] border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {/* Header: Date + Shift Tag Toggle */}
                <div className="flex items-center justify-between gap-2 border-b border-zinc-800/60 pb-2.5 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-400">
                      Day {day.dayNumber}
                    </span>
                    <span className="text-xs text-zinc-400">•</span>
                    <h3 className="text-sm font-bold text-white">
                      {format(parsedDate, 'EEE, d MMM')}
                    </h3>
                    {isTodayDate && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Shift Tag Selector (Touch Friendly) */}
                  <div className="flex items-center gap-1">
                    {(['LOW', 'MEDIUM', 'HIGH'] as const).map((shift) => (
                      <button
                        key={shift}
                        type="button"
                        onClick={() => handleShiftChange(day.date, shift)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all active:scale-95 min-h-[28px] ${
                          day.shiftType === shift
                            ? shift === 'HIGH'
                              ? 'bg-rose-950 text-rose-300 font-bold border border-rose-800/40'
                              : shift === 'LOW'
                              ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/40'
                              : 'bg-zinc-700 text-white font-bold'
                            : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/60'
                        }`}
                        title={`Set duty shift to ${shift} work`}
                      >
                        {shift === 'LOW' ? 'Low' : shift === 'MEDIUM' ? 'Med' : 'High'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Day Tasks & Content */}
                <div className="pt-2.5 space-y-2">
                  {/* GT Day Card */}
                  {day.isGTDay && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-950/20 border border-amber-900/40 rounded-xl p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                          <Target size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-amber-300">
                            {day.gtTitle || 'Grand Test (200 MCQs • 800 Marks)'}
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            Dedicated test & review day (0 new video lectures)
                          </div>
                        </div>
                      </div>

                      {day.gtId && (
                        <button
                          type="button"
                          onClick={() => handleOpenScoreModal(day.gtId!)}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all active:scale-95 min-h-[38px]"
                        >
                          Log Score
                        </button>
                      )}
                    </div>
                  )}

                  {/* Scheduled Lectures */}
                  {!day.isGTDay && day.topicsToWatch.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: day.subjectColor }}
                        />
                        <span className="text-xs font-bold text-zinc-200">
                          {day.subjectName}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          ({day.topicsToWatch.length} lectures scheduled)
                        </span>
                      </div>

                      <div className="space-y-1 pl-3 border-l border-zinc-800/80">
                        {day.topicsToWatch.map((topic) => (
                          <div
                            key={topic.id}
                            className="text-xs flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#101014] border border-[#202026]"
                          >
                            <div className="flex items-center gap-2 truncate min-w-0">
                              <span className="text-zinc-400 font-mono text-[11px] shrink-0">
                                Lec {topic.chapterNumber}
                              </span>
                              <span className="text-zinc-200 font-medium truncate">
                                {topic.title}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-zinc-400 shrink-0 ml-2">
                              {topic.durationMinutes}m
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SWT Milestone Card (Done on the final day of subject) */}
                  {day.isSWTDay && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <Trophy size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-emerald-300">
                            🏆 {day.swtSubjectName} Subject-Wise Test (SWT)
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            Final lectures done! Take 100-MCQ SWT tonight for quick revision.
                          </div>
                        </div>
                      </div>

                      {day.swtSubjectId && (
                        <button
                          type="button"
                          onClick={() => markSWTCompleted(day.swtSubjectId!)}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all active:scale-95 min-h-[38px]"
                        >
                          Mark Passed
                        </button>
                      )}
                    </div>
                  )}

                  {day.customNote && (
                    <div className="text-[11px] text-zinc-400 bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/40">
                      📝 {day.customNote}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 5. Day Details Bottom Sheet Drawer (Mobile Ergonomic) */}
      {selectedDayItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            onClick={() => setSelectedDayItem(null)}
            className="fixed inset-0"
          />

          <div className="relative bg-[#141418] border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto z-10 animate-in slide-in-from-bottom duration-200 safe-bottom">
            {/* Mobile Drag Indicator Handle */}
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-1 sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <div className="text-xs font-mono text-zinc-400">
                  Day {selectedDayItem.dayNumber}
                </div>
                <h3 className="text-base font-bold text-white">
                  {format(parseISO(selectedDayItem.date), 'EEEE, d MMMM yyyy')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayItem(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {/* Shift Tag Override Selector (Touch Friendly 44px buttons) */}
            <div className="bg-[#1a1a20] p-3 rounded-xl border border-zinc-800 space-y-2">
              <span className="text-xs font-medium text-zinc-300">
                Hospital Duty Workload:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'LOW', label: 'Low Work', desc: 'Sprint / Off' },
                    { id: 'MEDIUM', label: 'Medium', desc: 'Standard' },
                    { id: 'HIGH', label: 'High Work', desc: '12h Casualty' },
                  ] as const
                ).map(({ id, label, desc }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleShiftChange(selectedDayItem.date, id)}
                    className={`py-2 px-2 rounded-xl text-center transition-all border min-h-[46px] active:scale-95 ${
                      selectedDayItem.shiftType === id
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="text-xs">{label}</div>
                    <div className="text-[9px] text-zinc-400 font-normal">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Details */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {selectedDayItem.isGTDay && (
                <div className="p-3.5 bg-amber-950/20 border border-amber-900/40 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Target size={15} />
                    <span>{selectedDayItem.gtTitle || 'Grand Test'}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Dedicated 200-MCQ test & review day (0 new video lectures).
                  </p>
                  {selectedDayItem.gtId && (
                    <button
                      type="button"
                      onClick={() => handleOpenScoreModal(selectedDayItem.gtId!)}
                      className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs active:scale-95 transition-all min-h-[40px]"
                    >
                      Log Score
                    </button>
                  )}
                </div>
              )}

              {/* Scheduled Lectures */}
              {!selectedDayItem.isGTDay && selectedDayItem.topicsToWatch.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: selectedDayItem.subjectColor }}
                    />
                    <span>{selectedDayItem.subjectName}</span>
                    <span className="text-[11px] text-zinc-400 font-normal">
                      ({selectedDayItem.topicsToWatch.length} lectures)
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {selectedDayItem.topicsToWatch.map((topic) => (
                      <div
                        key={topic.id}
                        className="p-2.5 bg-[#101014] border border-[#202026] rounded-xl text-xs flex justify-between items-center"
                      >
                        <span className="truncate text-zinc-200 font-medium">
                          Lec {topic.chapterNumber}: {topic.title}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400 shrink-0 ml-2">
                          {topic.durationMinutes}m
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SWT Card if finishing today */}
              {selectedDayItem.isSWTDay && (
                <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/40 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Trophy size={15} />
                    <span>🏆 {selectedDayItem.swtSubjectName} Subject-Wise Test</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Final lectures completed! Quick revision 100-MCQ SWT scheduled for tonight.
                  </p>
                  {selectedDayItem.swtSubjectId && (
                    <button
                      type="button"
                      onClick={() => markSWTCompleted(selectedDayItem.swtSubjectId!)}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs active:scale-95 transition-all min-h-[40px]"
                    >
                      Mark SWT Completed
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedDayItem(null)}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold active:scale-95 transition-all min-h-[40px]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. GT Score Input Bottom Sheet */}
      {selectedGTForScore && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            onClick={() => setSelectedGTForScore(null)}
            className="fixed inset-0"
          />

          <div className="relative bg-[#18181c] border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl z-10 safe-bottom animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-1 sm:hidden" />

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <span>Log Grand Test Score</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedGTForScore(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  Score obtained (out of 800):
                </label>
                <input
                  type="number"
                  min="0"
                  max="800"
                  placeholder="e.g. 540"
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  className="w-full bg-[#121214] border border-zinc-700 rounded-xl px-3 py-2.5 text-white font-mono text-base focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  Percentile (optional %):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 89.5"
                  value={percentileInput}
                  onChange={(e) => setPercentileInput(e.target.value)}
                  className="w-full bg-[#121214] border border-zinc-700 rounded-xl px-3 py-2.5 text-white font-mono text-base focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedGTForScore(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors min-h-[42px] active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveScore}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors min-h-[42px] active:scale-95"
              >
                Save Score
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Subject Flow Reorder Modal */}
      <SubjectFlowModal
        isOpen={flowModalOpen}
        onClose={() => setFlowModalOpen(false)}
      />
    </div>
  )
}
