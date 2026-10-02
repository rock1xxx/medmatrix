import React from 'react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts'
import {
  TrendingUp,
  Award,
  Clock,
  Bookmark,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react'
import { format, addDays, parseISO, isSameDay } from 'date-fns'

export const AnalyticsView: React.FC = () => {
  const { topics, subjects } = useMedMatrixStore()

  // 1. Pipeline Breakdown Data
  const queuedCount = topics.filter((t) => t.status === 'QUEUED').length
  const watchingCount = topics.filter((t) => t.status === 'STEP_1_WATCHING').length
  const wardCount = topics.filter((t) => t.status === 'STEP_2_WARD_MCQ').length
  const annotatingCount = topics.filter((t) => t.status === 'STEP_3_ANNOTATING').length
  const srCount = topics.filter((t) => t.status === 'LOCKED_IN_SR').length

  const pipelinePieData = [
    { name: 'Queued Backlog', value: queuedCount, color: '#64748b' },
    { name: 'Tonight Videos', value: watchingCount, color: '#8b5cf6' },
    { name: 'Ward MCQs', value: wardCount, color: '#f59e0b' },
    { name: 'Annotations Pending', value: annotatingCount, color: '#06b6d4' },
    { name: 'Locked in SR', value: srCount, color: '#10b981' },
  ]

  // 2. Subject Progress Chart Data
  const subjectProgressData = subjects.map((s) => {
    const subjectTopics = topics.filter((t) => t.subjectId === s.id)
    const lockedCount = subjectTopics.filter((t) => t.status === 'LOCKED_IN_SR').length
    const pendingCount = subjectTopics.length - lockedCount
    return {
      name: s.shortCode,
      fullName: s.name,
      Locked: lockedCount,
      Pending: pendingCount,
      total: subjectTopics.length,
    }
  })

  // 3. SR Levels Distribution
  const srTopics = topics.filter((t) => t.status === 'LOCKED_IN_SR' && t.srData)
  const levelDistribution = [
    { level: 'Level 0 (+1d)', count: srTopics.filter((t) => t.srData?.level === 0).length, color: '#38bdf8' },
    { level: 'Level 1 (+5d)', count: srTopics.filter((t) => t.srData?.level === 1).length, color: '#818cf8' },
    { level: 'Level 2 (+12d)', count: srTopics.filter((t) => t.srData?.level === 2).length, color: '#c084fc' },
    { level: 'Level 3 (+25d)', count: srTopics.filter((t) => t.srData?.level === 3).length, color: '#f59e0b' },
    { level: 'Level 4 (Mastered ⭐)', count: srTopics.filter((t) => (t.srData?.level ?? 0) >= 4).length, color: '#10b981' },
  ]

  // 4. Next 7 Days Review Forecast
  const today = new Date()
  const next7DaysForecast = Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(today, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(date, 'EEE d')

    const dueCount = srTopics.filter((t) => {
      if (!t.srData) return false
      return t.srData.nextReviewDate === dateStr
    }).length

    return {
      day: dayLabel,
      reviews: dueCount,
    }
  })

  // Key metric summaries
  const totalBookmarks = topics.reduce((acc, t) => acc + (t.bookmarkCount || 0), 0)
  const masteredCount = srTopics.filter((t) => (t.srData?.level ?? 0) >= 4).length
  const totalCurriculumHours = (topics.reduce((acc, t) => acc + t.durationMinutes, 0) / 60).toFixed(1)

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 px-3 sm:px-6 pt-2">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Analytics &amp; Retention Radar
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Real-time metrics on your NEET PG curriculum completion, Ebbinghaus mastery curve, and upcoming review workload.
        </p>
      </div>

      {/* Top Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Locked in SR</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-black text-emerald-400">
            {srCount} <span className="text-xs font-normal text-slate-400">/ {topics.length}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {Math.round((srCount / topics.length) * 100)}% of 271 Chapters
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Mastered ⭐</span>
            <Award className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-mono font-black text-yellow-400">
            {masteredCount} <span className="text-xs font-normal text-slate-400">Topics</span>
          </div>
          <div className="text-[11px] text-slate-500">Level 4 Permanent Retention</div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Ward Bookmarks</span>
            <Bookmark className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-black text-amber-400">
            {totalBookmarks} <span className="text-xs font-normal text-slate-400">MCQs</span>
          </div>
          <div className="text-[11px] text-slate-500">Flagged on duty for review</div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Curriculum Runtime</span>
            <Clock className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-mono font-black text-violet-400">
            {totalCurriculumHours}h
          </div>
          <div className="text-[11px] text-slate-500">~{(Number(totalCurriculumHours) / 1.5).toFixed(1)}h at 1.5x speed</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Pipeline Breakdown (Donut) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Current Pipeline Distribution</span>
            </h3>
            <span className="text-xs text-slate-500">Total: 271 Chapters</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pipelinePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                >
                  {pipelinePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {pipelinePieData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-400 truncate">{item.name}:</span>
                <span className="font-mono font-bold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Spaced Repetition Level Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Ebbinghaus Spaced Repetition Levels</span>
            </h3>
            <span className="text-xs font-mono text-emerald-400 font-bold">{srCount} in Engine</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelDistribution} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis dataKey="level" type="category" stroke="#64748b" tick={{ fontSize: 11 }} width={110} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[0, 8, 8, 0]}>
                  {levelDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-500 italic">
            Each review completed advances interval: Level 0 (+1d) &rarr; L1 (+5d) &rarr; L2 (+12d) &rarr; L3 (+25d) &rarr; Mastered &star;.
          </p>
        </div>

        {/* Chart 3: Upcoming 7-Day Review Forecast */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Upcoming 7-Day Spaced Review Forecast</span>
            </h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={next7DaysForecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="reviews" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-500">
            Balanced workload: 15-minute evening review sessions prevent pile-ups before major hospital rotations.
          </p>
        </div>

        {/* Chart 4: Subject-by-Subject Progress */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Subject Revision Progress (19 Subjects)</span>
            </h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectProgressData.slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="Locked" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Pending" stackId="a" fill="#334155" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              <span>Locked in SR</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-700" />
              <span>Pending / In Progress</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
