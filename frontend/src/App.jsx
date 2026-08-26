import { useState, useCallback, useEffect } from 'react'
import Header from './components/layout/Header'
import MapView from './components/map/MapView'
import VideoPlayer from './components/video/VideoPlayer'
import DroneDataList from './components/telemetry/DroneDataList'
import MissionDetailsPanel from './components/mission/MissionDetailsPanel'
import StatusPanel from './components/telemetry/StatusPanel'
import MissionDrawer from './components/mission/MissionDrawer'
import SettingsPage from './components/settings/SettingsPage'
import TweaksPanel from './components/common/TweaksPanel'
import { useWebSocket } from './hooks/useWebSocket'
import useSettingsStore from './stores/settingsStore'

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard' | 'settings'
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tweaksOpen, setTweaksOpen] = useState(false)
  const [pickedDest, setPickedDest] = useState(null)
  const [isPickingDest, setIsPickingDest] = useState(false)

  // Initialize WebSocket connection for live telemetry & status events
  useWebSocket()

  // Load settings on mount
  const { fetchSettings } = useSettingsStore()
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handlePickDestFromMap = useCallback(() => {
    setDrawerOpen(false)
    setIsPickingDest(true)
  }, [])

  const handleDestinationPicked = useCallback((dest) => {
    setPickedDest(dest)
    setIsPickingDest(false)
    setDrawerOpen(true)
  }, [])

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false)
    setIsPickingDest(false)
  }, [])

  const handleOpenNewMission = useCallback(() => {
    setDrawerOpen(true)
  }, [])

  const handleToggleTweaks = useCallback(() => {
    setTweaksOpen((prev) => !prev)
  }, [])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-charcoal-950 text-slate-100 font-sans select-none antialiased">
      {/* Universal Aerospace Command Header */}
      <Header
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view)}
        onOpenNewMission={handleOpenNewMission}
        onToggleTweaks={handleToggleTweaks}
        tweaksOpen={tweaksOpen}
      />

      {/* Main Operations Viewport */}
      {currentView === 'settings' ? (
        <SettingsPage onBackToDashboard={() => setCurrentView('dashboard')} />
      ) : (
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden p-2 md:p-2.5 gap-2 md:gap-2.5 bg-charcoal-950">
          {/* UPPER DECK: Equal Side-by-Side Split (Live Cam Feed on Left, Tactical Tracking Map on Right) */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2 md:gap-2.5">
            {/* 1. Live Cam Feed with HUD Battery Overlay & Compact HDG/ALT/Coords Footer */}
            <section className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
              <VideoPlayer />
            </section>

            {/* 2. Tactical Drone Live Tracking Map with Collapsed Weather Badge */}
            <section className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
              <MapView
                isPickingDest={isPickingDest}
                onDestinationPick={handleDestinationPicked}
                pickedDest={pickedDest}
              />
            </section>
          </div>

          {/* LOWER DECK: 3 Structured Telemetry & Mission Columns */}
          <div className="h-[200px] lg:h-[215px] shrink-0 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-2.5">
            {/* Column 1: Consolidated Drone Data List */}
            <section className="min-w-0 h-full overflow-hidden">
              <DroneDataList />
            </section>

            {/* Column 2: Mission Details (Weight, Destination, How Much Left, + New Mission) */}
            <section className="min-w-0 h-full overflow-hidden">
              <MissionDetailsPanel onOpenNewMission={handleOpenNewMission} />
            </section>

            {/* Column 3: Aviation Meteorological & Weather Standard Card (Wind Rose, METAR, Atmosphere, Avionics) */}
            <section className="min-w-0 h-full overflow-hidden">
              <StatusPanel />
            </section>
          </div>
        </main>
      )}

      {/* Mission Planner Drawer with 6-Point Feasibility Validation Check */}
      <MissionDrawer
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
        pickedDest={pickedDest}
        onPickDestFromMap={handlePickDestFromMap}
      />

      {/* Interactive Simulation & HUD Tweaks Panel */}
      <TweaksPanel
        isOpen={tweaksOpen}
        onClose={() => setTweaksOpen(false)}
      />
    </div>
  )
}
