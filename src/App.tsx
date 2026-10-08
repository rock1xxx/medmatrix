import React, { useState, useEffect } from 'react'
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
import { FloatingWidgetDock } from './components/widget/FloatingWidgetDock'
import { IosWidgetGuideModal } from './components/modals/IosWidgetGuideModal'
import { initSyncEngine } from './lib/syncEngine'
import { Toaster } from 'sonner'

export function App() {
  useEffect(() => {
    initSyncEngine()
  }, [])
  const {
    activeTab,
    setActiveTab,
    stretchDrawerOpen,
    setStretchDrawerOpen,
    setSelectedTopicForDetail,
  } = useMedMatrixStore()

  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)
  const [iosGuideOpen, setIosGuideOpen] = useState(false)
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
          onOpenIosGuide={() => setIosGuideOpen(true)}
        />
        <IosWidgetGuideModal
          isOpen={iosGuideOpen}
          onClose={() => setIosGuideOpen(false)}
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
        onOpenWidgetGuide={() => setIosGuideOpen(true)}
      />

      {/* Active View Container */}
      <main className="flex-1 w-full pt-2">
        {activeTab === 'ward' && <WardFastTrack />}
        {activeTab === 'hostel' && <HostelCommandCenter />}
        {activeTab === 'timeline' && <TimelineRoadmap />}
        {activeTab === 'matrix' && <MasterMatrix />}
        {activeTab === 'kanban' && <MasterKanban />}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Floating Interactive Widget Dock */}
      <FloatingWidgetDock onOpenIosGuide={() => setIosGuideOpen(true)} />

      {/* Modals & Drawers */}
      <StretchQueueDrawer />
      <TopicDetailsModal />
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
      <IosWidgetGuideModal
        isOpen={iosGuideOpen}
        onClose={() => setIosGuideOpen(false)}
      />
    </div>
  )
}

export default App
