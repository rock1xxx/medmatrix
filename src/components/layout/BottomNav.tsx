import React from 'react'
import { useMedMatrixStore } from '../../store/useMedMatrixStore'
import { ViewMode } from '../../types'
import { Sun, Moon, CalendarDays, BookOpen, Kanban, TrendingUp } from 'lucide-react'

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, topics, activeSubjectId } = useMedMatrixStore()

  // Ward count (MCQs to solve on duty for active focus subject only)
  const wardCount = topics.filter(
    (t) => t.status === 'STEP_2_WARD_MCQ' && t.subjectId === activeSubjectId
  ).length

  // Tonight count (Pending annotations for active focus subject only)
  const annotatingCount = topics.filter(
    (t) => t.status === 'STEP_3_ANNOTATING' && t.subjectId === activeSubjectId
  ).length
  const tonightBadgeCount = annotatingCount

  const items: {
    id: ViewMode
    label: string
    icon: React.ComponentType<{ className?: string; size?: number }>
    badge?: number
    /** The Kanban board is a pointer-and-screen workspace; phones do not get it. */
    desktopOnly?: boolean
  }[] = [
    { id: 'ward', label: 'Ward', icon: Sun, badge: wardCount },
    { id: 'hostel', label: 'Tonight', icon: Moon, badge: tonightBadgeCount },
    { id: 'timeline', label: 'Timeline', icon: CalendarDays },
    { id: 'matrix', label: 'Syllabus', icon: BookOpen },
    { id: 'kanban', label: 'Board', icon: Kanban, desktopOnly: true },
    { id: 'analytics', label: 'Stats', icon: TrendingUp },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#101014]/95 backdrop-blur-xl border-t border-[#222226] safe-bottom select-none">
      <nav className="max-w-md lg:max-w-2xl mx-auto flex items-center justify-between px-1.5 py-1">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`relative ${
                item.desktopOnly ? 'hidden lg:flex' : 'flex'
              } flex-col items-center justify-center flex-1 min-h-[48px] lg:min-h-[52px] py-1 px-0.5 rounded-xl transition-all active:scale-90 ${
                isActive
                  ? 'text-white font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon size={19} className={isActive ? 'text-emerald-400' : 'text-zinc-500'} />
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1 py-0.2 min-w-3.5 h-3.5 rounded-full bg-emerald-500 text-black text-[9px] font-extrabold flex items-center justify-center shadow-sm">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10.5px] mt-0.5 tracking-tight font-medium">
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
