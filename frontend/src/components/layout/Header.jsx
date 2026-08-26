import { memo } from 'react'
import {
  Settings, Plus, Wifi, WifiOff, Satellite, Battery,
  ShieldCheck, ArrowLeft, Volume2, VolumeX,
  Sliders, Radio, Package, Send, CheckCircle2
} from 'lucide-react'
import DroneLogo from '../common/DroneLogo'
import useTelemetryStore from '../../stores/telemetryStore'
import useMissionStore from '../../stores/missionStore'
import { sound } from '../../lib/audioService'

export default memo(function Header({ currentView, onViewChange, onOpenNewMission, onToggleTweaks, tweaksOpen }) {
  const connected = useTelemetryStore((s) => s.connected)
  const frame = useTelemetryStore((s) => s.frame)
  const audioEnabled = useTelemetryStore((s) => s.audioEnabled)
  const setAudioEnabled = useTelemetryStore((s) => s.setAudioEnabled)
  const { activeMission } = useMissionStore()

  const toggleSound = () => {
    const next = sound.toggleMute()
    setAudioEnabled(!next)
    if (!next) {
      sound.playClick()
    }
  }

  const modeColors = {
    AUTO:      'text-cyan bg-cyan-950/80 border-cyan/50 shadow-[0_0_10px_rgba(0,240,255,0.25)]',
    RTL:       'text-amber-300 bg-amber-950/80 border-amber/50 shadow-[0_0_10px_rgba(245,158,11,0.25)]',
    LOITER:    'text-indigo-300 bg-indigo-950/80 border-indigo-500/40',
    POSHOLD:   'text-cyan bg-cyan-950/80 border-cyan/40',
    LAND:      'text-amber-300 bg-amber-950/80 border-amber/40',
    STABILIZE: 'text-slate-300 bg-charcoal-800 border-slate-600',
    STANDBY:   'text-slate-400 bg-charcoal-800 border-slate-700',
    UNKNOWN:   'text-slate-500 bg-charcoal-850 border-slate-800',
  }

  const modeClass = modeColors[frame.flight_mode] || modeColors.UNKNOWN

  const batteryColor = frame.battery_pct > 50
    ? 'text-emerald-bright'
    : frame.battery_pct > 25
    ? 'text-amber-bright'
    : 'text-crimson-bright'

  // Delivery status calculation
  const isLoaded = activeMission && activeMission.package_weight_g > 0 && ['READY', 'IN_FLIGHT'].includes(activeMission.status)
  const flightStateText = activeMission
    ? activeMission.status === 'IN_FLIGHT'
      ? 'Active → Inflight'
      : activeMission.status === 'RETURNING'
      ? 'Returning'
      : activeMission.status === 'DELIVERED'
      ? 'Delivered'
      : activeMission.status
    : frame.is_flying
    ? 'Inflight'
    : frame.armed
    ? 'Armed'
    : 'Standby'

  return (
    <header className="glass-panel border-b border-white/10 px-4 md:px-5 h-14 flex items-center justify-between z-30 shrink-0 select-none bg-charcoal-900/95">
      {/* Left: Brand Identity & View Navigation */}
      <div className="flex items-center gap-3.5">
        <div
          onClick={() => {
            sound.playClick()
            onViewChange('dashboard')
          }}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          {/* Stylized Aero Emblem */}
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-charcoal-800 via-charcoal-850 to-charcoal-900 border border-white/15 flex items-center justify-center shadow-[0_0_16px_rgba(0,0,0,0.8)] group-hover:border-cyan/70 transition-all duration-300">
            <div className="absolute inset-0 rounded-xl bg-cyan/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <DroneLogo className="w-5 h-5 group-hover:scale-110 transition-transform" strokeColor="#00f0ff" coreColor="#00f0ff" glow={true} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black font-display tracking-widest text-gradient-cyan">
              AERODROP
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-charcoal-800 text-cyan border border-cyan/30 tracking-wider">
              GCS-01
            </span>
          </div>
        </div>

        {/* View Switcher: Operations vs Settings */}
        <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>
        {currentView === 'settings' ? (
          <button
            onClick={() => {
              sound.playClick()
              onViewChange('dashboard')
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-charcoal-800 hover:bg-charcoal-750 border border-white/10 text-slate-200 hover:text-white text-xs font-mono transition-all active:scale-95 shadow-sm"
            id="back-to-dashboard-btn"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan" />
            <span className="font-semibold">OPERATIONS</span>
          </button>
        ) : (
          <button
            onClick={() => {
              sound.playClick()
              onViewChange('settings')
            }}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-charcoal-850/80 hover:bg-charcoal-750 border border-white/10 hover:border-cyan/40 text-slate-300 hover:text-white text-xs font-mono transition-all active:scale-95 shadow-sm"
            id="open-settings-btn"
          >
            <Settings className="w-3.5 h-3.5 text-cyan" />
            <span>Config</span>
          </button>
        )}
      </div>

      {/* Center: Delivery Status + Live Avionics Badges */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-xl bg-charcoal-900/90 border border-white/10 shadow-inner">
        {/* NEW: Delivery Status Group (Loaded/Not Loaded + Flight State) */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-charcoal-800/90 border border-white/5 font-mono text-[11px]">
          <Package className={`w-3.5 h-3.5 ${isLoaded ? 'text-cyan' : 'text-slate-500'}`} />
          <span className={`font-semibold ${isLoaded ? 'text-cyan' : 'text-slate-400'}`}>
            {isLoaded ? `Loaded (${activeMission.package_weight_g}g)` : 'Not Loaded'}
          </span>
          <span className="text-slate-600">|</span>
          <span className={`font-bold ${
            activeMission?.status === 'IN_FLIGHT' ? 'text-emerald-bright animate-pulse' :
            frame.armed ? 'text-amber-bright' : 'text-slate-300'
          }`}>
            {flightStateText}
          </span>
        </div>

        <div className="h-3.5 w-[1px] bg-white/10" />

        {/* Arm State */}
        {frame.armed ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-crimson-950/80 border border-crimson/50 text-crimson-bright text-[11px] font-mono font-bold tracking-wider animate-pulse shadow-[0_0_10px_rgba(255,51,85,0.35)]">
            <span className="w-1.5 h-1.5 rounded-full bg-crimson-bright animate-ping" />
            <span>ARMED</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-charcoal-800 border border-white/5 text-slate-400 text-[11px] font-mono">
            <ShieldCheck className="w-3 h-3 text-slate-500" />
            <span>DISARMED</span>
          </div>
        )}

        {/* Flight Mode */}
        <div className={`badge text-[11px] font-mono font-bold border px-2 py-0.5 ${modeClass}`}>
          {frame.flight_mode || 'STANDBY'}
        </div>

        <div className="h-3.5 w-[1px] bg-white/10" />

        {/* Satellite Count: ICON + NUMBER ONLY */}
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-charcoal-800/90 border border-white/5 text-[11px] font-mono text-slate-200"
          title={`GPS Fix: 3D (${frame.satellites_visible || 16} satellites)`}
        >
          <Satellite className="w-3.5 h-3.5 text-cyan" />
          <span className="font-bold tabular-nums">{frame.satellites_visible || 16}</span>
        </div>

        {/* Battery %: ICON + NUMBER ONLY */}
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-charcoal-800/90 border border-white/5 text-[11px] font-mono"
          title={`Battery: ${frame.battery_pct?.toFixed(0) || 0}% (${frame.battery_voltage_v?.toFixed(1) || 24.8}V)`}
        >
          <Battery className={`w-3.5 h-3.5 ${batteryColor}`} />
          <span className={`font-bold tabular-nums ${batteryColor}`}>{frame.battery_pct?.toFixed(0) || 0}%</span>
        </div>

        {/* Link: ICON + NUMBER ONLY */}
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-mono ${
            connected
              ? 'bg-emerald-950/60 border-emerald/40 text-emerald-bright'
              : 'bg-crimson-950/60 border-crimson/40 text-crimson-bright'
          }`}
          title={connected ? 'MAVLink Telemetry Stream: 5Hz (18ms latency)' : 'Telemetry Disconnected'}
        >
          {connected ? <Wifi className="w-3.5 h-3.5 text-emerald-bright" /> : <WifiOff className="w-3.5 h-3.5 text-crimson-bright" />}
          <span className="font-bold tabular-nums">{connected ? '5Hz' : 'OFF'}</span>
        </div>
      </div>

      {/* Right: Sound FX, Tweaks, & Plan Mission Action */}
      <div className="flex items-center gap-2">
        {/* Sound FX Audio Toggle */}
        <button
          onClick={toggleSound}
          className={`p-2 rounded-xl border transition-all text-xs ${
            audioEnabled
              ? 'bg-cyan-950/60 border-cyan/40 text-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]'
              : 'bg-charcoal-800 border-white/10 text-slate-400 hover:text-white'
          }`}
          title={audioEnabled ? 'Avionics Audio Enabled' : 'Avionics Audio Muted'}
          aria-label="Toggle Audio"
        >
          {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* Tweaks Panel Toggle Button */}
        <button
          onClick={() => {
            sound.playClick()
            onToggleTweaks()
          }}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all ${
            tweaksOpen
              ? 'bg-amber-950/70 border-amber/50 text-amber-bright shadow-[0_0_12px_rgba(245,158,11,0.3)]'
              : 'bg-charcoal-800 border-white/10 text-slate-300 hover:border-amber/40 hover:text-white'
          }`}
          title="Interactive Simulator & HUD Tweaks"
          id="tweaks-toggle-btn"
        >
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold">Tweaks</span>
        </button>

        {/* Plan New Mission Action Button */}
        <button
          onClick={() => {
            sound.playClick()
            onOpenNewMission()
          }}
          className="btn-primary text-xs font-mono py-1.5 px-3 flex items-center gap-1.5 shadow-[0_0_16px_rgba(16,185,129,0.4)] hover:shadow-[0_0_24px_rgba(16,185,129,0.6)]"
          id="header-new-mission-btn"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
          <span className="font-bold tracking-wider">New Mission</span>
        </button>
      </div>
    </header>
  )
})
