import {
  Sliders, X, Zap, Wind, BatteryCharging,
  ShieldAlert, Volume2, VolumeX, Eye, Check, Sparkles
} from 'lucide-react'
import useTelemetryStore from '../../stores/telemetryStore'
import { sound } from '../../lib/audioService'

export default function TweaksPanel({ isOpen, onClose }) {
  const theme = useTelemetryStore((s) => s.theme)
  const setTheme = useTelemetryStore((s) => s.setTheme)
  const audioEnabled = useTelemetryStore((s) => s.audioEnabled)
  const setAudioEnabled = useTelemetryStore((s) => s.setAudioEnabled)
  const simulationScenario = useTelemetryStore((s) => s.simulationScenario)
  const injectScenario = useTelemetryStore((s) => s.injectScenario)

  if (!isOpen) return null

  const scenarios = [
    { id: 'default', label: 'Normal Flight', icon: Zap, desc: 'Nominal cruise' },
    { id: 'high_wind', label: 'Wind Turbulence', icon: Wind, desc: 'Gust oscillations' },
    { id: 'low_battery', label: 'Low Battery RTL', icon: BatteryCharging, desc: '18% failsafe' },
    { id: 'urban_drop', label: 'Precision Drop', icon: Eye, desc: '12m descent' },
    { id: 'emergency_rtl', label: 'Emergency RTL', icon: ShieldAlert, desc: 'Immediate RTB' },
  ]

  const themes = [
    { id: 'cyan', label: 'Cyan', color: '#00f0ff' },
    { id: 'emerald', label: 'Emerald', color: '#10e599' },
    { id: 'amber', label: 'Amber', color: '#fbbf24' },
    { id: 'crimson', label: 'Crimson', color: '#ff4d6d' },
    { id: 'violet', label: 'Violet', color: '#c084fc' },
  ]

  const handleScenarioChange = (id) => {
    sound.playTargetLock()
    injectScenario(id)
  }

  const handleThemeChange = (id) => {
    sound.playClick()
    setTheme(id)
  }

  const toggleSound = () => {
    const next = sound.toggleMute()
    setAudioEnabled(!next)
    if (!next) sound.playClick()
  }

  return (
    <div className="fixed bottom-14 right-4 w-80 max-w-[calc(100vw-2rem)] z-[9995] glass-panel rounded-2xl border border-white/15 p-3.5 shadow-2xl animate-slide-up select-none bg-charcoal-900/95 backdrop-blur-xl">
      {/* Sleek Minimal Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-bright flex items-center justify-center">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              OPERATIONS TWEAKS
            </h3>
            <p className="text-[9px] font-mono text-slate-400">Live telemetry injection & theme</p>
          </div>
        </div>
        <button
          onClick={() => {
            sound.playClick()
            onClose()
          }}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Close Tweaks"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Section 1: Telemetry Simulation Scenarios */}
        <div>
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-amber-bright uppercase tracking-wider mb-1.5">
            <span>1. INJECT SCENARIO</span>
            <span className="text-[9px] text-slate-500 font-normal">Active: {simulationScenario || 'default'}</span>
          </div>

          <div className="space-y-1">
            {scenarios.map((sc) => {
              const Icon = sc.icon
              const active = simulationScenario === sc.id
              return (
                <button
                  key={sc.id}
                  onClick={() => handleScenarioChange(sc.id)}
                  className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-all text-xs font-mono border ${
                    active
                      ? 'bg-amber-950/70 border-amber/60 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.2)] font-semibold'
                      : 'bg-charcoal-950/70 border-white/5 text-slate-300 hover:bg-charcoal-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-amber-bright' : 'text-slate-500'}`} />
                    <span className="text-xs truncate">{sc.label}</span>
                    <span className="text-[9px] text-slate-500 font-sans truncate">({sc.desc})</span>
                  </div>
                  {active && <Check className="w-3 h-3 text-amber-bright shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Section 2: HUD Color Theme Phosphor */}
        <div>
          <div className="text-[10px] font-mono font-bold text-cyan uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>2. HUD PALETTE</span>
            <span className="text-[9px] text-slate-500 capitalize">{theme}</span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {themes.map((th) => {
              const active = theme === th.id
              return (
                <button
                  key={th.id}
                  onClick={() => handleThemeChange(th.id)}
                  title={th.label}
                  className={`p-1.5 rounded-lg flex flex-col items-center gap-1 border transition-all ${
                    active
                      ? 'bg-charcoal-800 border-white/40 shadow-sm'
                      : 'bg-charcoal-950/70 border-white/5 hover:border-white/20'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${active ? 'scale-110 ring-2 ring-white/30' : ''}`}
                    style={{ backgroundColor: th.color, boxShadow: `0 0 8px ${th.color}` }}
                  />
                  <span className="text-[9px] font-mono text-slate-300 truncate w-full text-center">
                    {th.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Section 3: Avionics Audio Synth */}
        <div className="p-2 rounded-xl border border-white/10 flex items-center justify-between bg-charcoal-950/70">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-md ${audioEnabled ? 'bg-cyan-950 text-cyan' : 'bg-charcoal-800 text-slate-500'}`}>
              {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </div>
            <div>
              <p className="text-[11px] font-mono font-bold text-white leading-none">Avionics Web Audio</p>
              <p className="text-[9px] text-slate-400 font-sans">Synthesized telemetry cues</p>
            </div>
          </div>
          <button
            onClick={toggleSound}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border ${
              audioEnabled
                ? 'bg-cyan-950/90 text-cyan border-cyan/50 shadow-[0_0_8px_rgba(0,240,255,0.25)]'
                : 'bg-charcoal-800 text-slate-400 border-white/10'
            }`}
          >
            {audioEnabled ? 'ON' : 'MUTED'}
          </button>
        </div>
      </div>
    </div>
  )
}
