import React, { useState, useEffect, lazy, Suspense } from 'react'
import { useMedMatrixStore } from './store/useMedMatrixStore'
import { Header } from './components/layout/Header'
import { BottomNav } from './components/layout/BottomNav'
import { WardFastTrack } from './components/views/WardFastTrack'
import { HostelCommandCenter } from './components/views/HostelCommandCenter'
import { TimelineRoadmap } from './components/views/TimelineRoadmap'
import { MasterKanban } from './components/views/MasterKanban'
import { MasterMatrix } from './components/views/MasterMatrix'
import { StretchQueueDrawer } from './components/modals/StretchQueueDrawer'
import { TopicDetailsModal } from './components/modals/TopicDetailsModal'
import { KeyboardShortcutsModal } from './components/modals/KeyboardShortcutsModal'
import { TodayTodoWidget } from './components/widget/TodayTodoWidget'
import { WidgetSettingsModal } from './components/modals/WidgetSettingsModal'
import { initSyncEngine } from './lib/syncEngine'
import {
  syncActiveStudyDataToWidget,
  checkIsWidgetConfigLaunch,
  fetchLatestAppUpdate,
} from './lib/widgetBridge'
import { Toaster, toast } from 'sonner'

// Charts are heavy and only used here, so keep recharts out of the initial bundle.
const AnalyticsView = lazy(() =>
  import('./components/views/AnalyticsView').then((m) => ({ default: m.AnalyticsView }))
)

export function App() {
  useEffect(() => {
    initSyncEngine()
  }, [])
  const {
    topics,
    subjects,
    activeSubjectId,
    activeTab,
    setActiveTab,
    stretchDrawerOpen,
    setStretchDrawerOpen,
    setSelectedTopicForDetail,
  } = useMedMatrixStore()

  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)
  const [widgetSettingsOpen, setWidgetSettingsOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    const search = window.location.search
    const hash = window.location.hash
    return (
      search.includes('settings=widget') ||
      search.includes('view=widgets') ||
      hash.includes('widget-settings')
    )
  })

  // Detect Android widget configuration intent (from long-press ⚙️ on Home Screen)
  useEffect(() => {
    checkIsWidgetConfigLaunch().then((isConfig) => {
      if (isConfig) {
        setWidgetSettingsOpen(true)
      }
    })

    const handleOpenWidgetSettings = () => {
      setWidgetSettingsOpen(true)
    }

    window.addEventListener('medmatrix:openWidgetSettings', handleOpenWidgetSettings)
    return () => {
      window.removeEventListener('medmatrix:openWidgetSettings', handleOpenWidgetSettings)
    }
  }, [])

  // Automatically keep Android home screen widget updated with real study queue
  useEffect(() => {
    syncActiveStudyDataToWidget(topics, subjects, activeSubjectId)
  }, [topics, subjects, activeSubjectId])

  // Non-intrusive background check for new GitHub APK updates on startup
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const update = await fetchLatestAppUpdate()
        if (update && update.isUpdateAvailable) {
          toast.info(`MedMatrix Update Available (${update.latestVersion})`, {
            id: 'medmatrix-update-available',
            description: 'Tap Update to install now, or swipe the banner away.',
            duration: 6000,
            closeButton: true,
            action: {
              label: 'Update',
              onClick: () =>
                window.dispatchEvent(new Event('medmatrix:openUpdateModal')),
            },
          })
        }
      } catch {
        // Silently ignore network failures on startup
      }
    }, 4000)
    return () => clearTimeout(timer)
  }, [])
  const [isWidgetView] = useState(() => {
    if (typeof window === 'undefined') return false
    const search = window.location.search
    return search.includes('view=widget') || search.includes('widget=true')
  })

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return
      }

      if (e.key === '1') {
        setActiveTab('ward')
      } else if (e.key === '2') {
        setActiveTab('hostel')
      } else if (e.key === '3') {
        setActiveTab('timeline')
      } else if (e.key === '4') {
        setActiveTab('matrix')
      } else if (e.key === '5') {
        setActiveTab('kanban')
      } else if (e.key === '6') {
        setActiveTab('analytics')
      } else if (e.key === 's' || e.key === 'S') {
        setStretchDrawerOpen(!stretchDrawerOpen)
      } else if (e.key === '?') {
        setShortcutsModalOpen((prev) => !prev)
      } else if (e.key === 'Escape') {
        setStretchDrawerOpen(false)
        setShortcutsModalOpen(false)
        setSelectedTopicForDetail(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    activeTab,
    setActiveTab,
    stretchDrawerOpen,
    setStretchDrawerOpen,
    setSelectedTopicForDetail,
  ])

  if (isWidgetView) {
    return (
      <div className="min-h-screen bg-[#0c0c0e] text-zinc-100 flex items-center justify-center p-3 sm:p-6 selection:bg-emerald-500/20 selection:text-emerald-300">
        <Toaster
          theme="dark"
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#18181b',
              borderColor: '#27272a',
              color: '#f4f4f5',
              borderRadius: '0.75rem',
              fontSize: '12px',
            },
          }}
        />
        <TodayTodoWidget
          isStandalone={true}
          onOpenFullApp={() => {
            window.location.href = '/'
          }}
          onOpenIosGuide={() => setWidgetSettingsOpen(true)}
        />
        <WidgetSettingsModal
          isOpen={widgetSettingsOpen}
          onClose={() => setWidgetSettingsOpen(false)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-zinc-100 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-300 pb-16">
      {/* Toast Notification Provider */}
      <Toaster
        theme="dark"
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#18181b',
            borderColor: '#27272a',
            color: '#f4f4f5',
            borderRadius: '0.75rem',
            fontSize: '12px',
          },
        }}
      />

      {/* Minimal Top Header */}
      <Header
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
        onOpenWidgetSettings={() => setWidgetSettingsOpen(true)}
      />

      {/* Active View Container */}
      <main className="flex-1 w-full pt-2">
        {activeTab === 'ward' && <WardFastTrack />}
        {activeTab === 'hostel' && <HostelCommandCenter />}
        {activeTab === 'timeline' && <TimelineRoadmap />}
        {activeTab === 'matrix' && <MasterMatrix />}
        {activeTab === 'kanban' && <MasterKanban />}
        {activeTab === 'analytics' && (
          <Suspense
            fallback={
              <div className="max-w-xl mx-auto px-4 pt-8 text-center text-xs text-zinc-500">
                Loading analytics…
              </div>
            }
          >
            <div className="pt-2">
              <AnalyticsView />
            </div>
          </Suspense>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Modals & Drawers */}
      <StretchQueueDrawer />
      <TopicDetailsModal />
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
      <WidgetSettingsModal
        isOpen={widgetSettingsOpen}
        onClose={() => setWidgetSettingsOpen(false)}
      />
    </div>
  )
}

export default App
