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
      <Header onOpenShortcuts={() => setShortcutsModalOpen(true)} />

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

      {/* Modals & Drawers */}
      <StretchQueueDrawer />
      <TopicDetailsModal />
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  )
}

export default App
