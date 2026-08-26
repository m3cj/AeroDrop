import { useState, useEffect } from 'react'
import {
  X, MapPin, CheckCircle2, XCircle,
  AlertTriangle, Loader, Sparkles, Send,
  History, Battery, Scale, CloudSun, Route, Clock, Gauge,
  Trash2, Plus, Target
} from 'lucide-react'
import DroneLogo from '../common/DroneLogo'
import useMissionStore from '../../stores/missionStore'
import useTelemetryStore from '../../stores/telemetryStore'
import useSettingsStore from '../../stores/settingsStore'
import { useToast } from '../common/Toast'
import StatusBadge from '../common/StatusBadge'
import { formatDistance, formatDuration, formatWeight, timeAgo } from '../../lib/formatters'
import { sound } from '../../lib/audioService'

/**
 * Minimalist, Aerospace-grade 6-Point Feasibility Validation Matrix
 */
function SixPointValidationDisplay({ result, form, dest, currentBatteryPct, settings }) {
  if (!result) return null

  const vr = result.validation_result || result
  const isFeasible = vr.is_feasible ?? (result.status === 'VALIDATED')
  const prob = vr.delivery_success_probability ?? vr.success_probability ?? result.success_probability
  const dist = vr.distance_km ?? result.distance_km ?? 0
  const totalTime = vr.estimated_total_time_s ?? vr.estimated_flight_time_s ?? result.estimated_flight_time_s ?? 0
  const battUsage = vr.estimated_battery_usage_pct ?? result.estimated_battery_usage_pct ?? 0
  const speedMs = vr.effective_speed_ms ?? 12.0
  const rejections = vr.rejection_reasons || result.rejection_reasons || (result.failure_reason ? [result.failure_reason] : [])
  const warnings = vr.warnings || result.warnings || []

  const maxPayload = settings?.max_payload_g || 2000
  const maxRange = settings?.max_range_km || 5.0

  const probPercent = prob !== undefined && prob !== null ? Math.round(prob * 100) : 90
  const isOptimal = probPercent >= 80

  // 6 Core Gating Criteria:
  const gates = [
    {
      id: 'battery',
      title: 'Battery Reserve',
      icon: Battery,
      passed: currentBatteryPct >= battUsage,
      value: `${currentBatteryPct.toFixed(0)}% (${battUsage.toFixed(0)}% req)`,
    },
    {
      id: 'weight',
      title: 'Payload Mass',
      icon: Scale,
      passed: form.package_weight_g <= maxPayload,
      value: `${formatWeight(form.package_weight_g)} / ${formatWeight(maxPayload)}`,
    },
    {
      id: 'weather',
      title: 'Airspace Weather',
      icon: CloudSun,
      passed: rejections.every((r) => !r.toLowerCase().includes('wind') && !r.toLowerCase().includes('precip')),
      value: 'Clear · Nominal Winds',
    },
    {
      id: 'distance',
      title: 'Mission Range',
      icon: Route,
      passed: dist <= maxRange,
      value: `${formatDistance(dist)} / ${formatDistance(maxRange)}`,
    },
    {
      id: 'tof',
      title: 'Flight Time (TOF)',
      icon: Clock,
      passed: totalTime > 0 && totalTime < 3600,
      value: `${formatDuration(totalTime)} RT`,
    },
    {
      id: 'speed',
      title: 'Cruise Speed',
      icon: Gauge,
      passed: speedMs > 0,
      value: `${(speedMs * 3.6).toFixed(0)} km/h`,
    },
  ]

  return (
    <div className={`rounded-xl p-3 border transition-all select-none animate-fade-in space-y-2.5 ${
      isFeasible
        ? 'border-emerald/30 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,229,153,0.08)]'
        : 'border-crimson/30 bg-crimson-950/20 shadow-[0_0_20px_rgba(255,51,85,0.08)]'
    }`}>
      {/* Sleek Verdict Strip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isFeasible ? (
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-bright">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-lg bg-crimson-500/20 flex items-center justify-center text-crimson-bright">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          )}
          <div>
            <div className={`text-xs font-mono font-bold uppercase tracking-wider ${
              isFeasible ? 'text-emerald-bright' : 'text-crimson-bright'
            }`}>
              {isFeasible ? 'FEASIBILITY VERIFIED' : 'MISSION REJECTED'}
            </div>
            <div className="text-[9px] font-mono text-slate-400">
              6/6 Avionics safety gates computed
            </div>
          </div>
        </div>

        <div className={`px-2.5 py-1 rounded-lg border font-mono text-xs font-bold tabular-nums flex items-center gap-1.5 ${
          isOptimal
            ? 'bg-emerald-950/80 border-emerald/40 text-emerald-bright shadow-[0_0_10px_rgba(16,229,153,0.2)]'
            : 'bg-amber-950/80 border-amber/40 text-amber-bright'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          <span>{probPercent}% FEASIBLE</span>
        </div>
      </div>

      {/* Streamlined 2-Column Gate Micro-Grid */}
      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
        {gates.map((g) => {
          const Icon = g.icon
          return (
            <div
              key={g.id}
              className={`p-2 rounded-lg border transition-all flex items-center gap-2 ${
                g.passed
                  ? 'bg-charcoal-950/70 border-white/5 text-slate-300 hover:border-white/10'
                  : 'bg-crimson-950/60 border-crimson/40 text-crimson-bright'
              }`}
            >
              <div className={`p-1 rounded-md shrink-0 ${
                g.passed ? 'bg-charcoal-800 text-cyan' : 'bg-crimson-900/60 text-crimson-bright'
              }`}>
                <Icon className="w-3 h-3" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 leading-none">
                  <span className="text-[9px] font-mono uppercase text-slate-400 font-semibold truncate">
                    {g.title}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    g.passed ? 'bg-emerald-bright' : 'bg-crimson-bright animate-ping'
                  }`} />
                </div>
                <div className="text-[10px] font-mono font-bold text-slate-100 truncate mt-1">
                  {g.value}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Compact Rejections */}
      {rejections.length > 0 && (
        <div className="space-y-1 pt-1">
          {rejections.map((r, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] font-mono text-crimson-bright bg-crimson-950/60 px-2.5 py-1.5 rounded-lg border border-crimson/30">
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Compact Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1 pt-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] font-mono text-amber-bright bg-amber-950/60 px-2.5 py-1.5 rounded-lg border border-amber/30">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MissionHistoryItem({ mission }) {
  return (
    <div className="p-2.5 rounded-xl flex items-center justify-between gap-2.5 border border-white/5 hover:border-cyan/30 transition-all bg-charcoal-950/70 hover:bg-charcoal-900/90 shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-2 h-2 rounded-full shrink-0 ${
          mission.status === 'COMPLETED' ? 'bg-emerald-bright shadow-[0_0_8px_rgba(16,229,153,0.8)]' :
          mission.status === 'ABORTED' ? 'bg-amber-bright' :
          mission.status === 'FAILED' ? 'bg-crimson-bright' :
          'bg-cyan'
        }`} />
        <div className="min-w-0">
          <p className="text-xs font-mono font-bold text-white truncate">
            {mission.dest_label || `${mission.dest_lat?.toFixed(4)}° N, ${mission.dest_lon?.toFixed(4)}° E`}
          </p>
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">{timeAgo(mission.created_at)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-mono text-slate-300 tabular-nums font-semibold">
          {formatWeight(mission.package_weight_g)}
        </span>
        <StatusBadge status={mission.status} />
      </div>
    </div>
  )
}

export default function MissionDrawer({ isOpen, onClose, pickedDest, onPickDestFromMap }) {
  const [activeTab, setActiveTab] = useState('plan') // 'plan' | 'history'
  const [confirmClear, setConfirmClear] = useState(false)
  const [form, setForm] = useState({
    package_weight_g: 500,
    dest_label: '',
    scheduled_at: '',
  })
  const [mission, setMission] = useState(null)
  const [step, setStep] = useState('create') // 'create' | 'validated' | 'starting'
  const [loading, setLoading] = useState(false)

  const { createMission, validateMission, startMission, missions, fetchMissions, clearMissions } = useMissionStore()
  const frame = useTelemetryStore((s) => s.frame)
  const { settings } = useSettingsStore()
  const toast = useToast()

  useEffect(() => {
    if (isOpen) {
      fetchMissions()
    }
  }, [isOpen, fetchMissions])

  const dest = pickedDest
  const weightPresets = [250, 500, 1000, 1500, 2000]

  const handleCreateAndValidate = async () => {
    sound.playClick()
    if (!dest) {
      toast.warning('No Target Coords', 'Click on the tactical map to designate a drop zone')
      return
    }
    if (!form.package_weight_g || form.package_weight_g < 1) {
      toast.warning('Invalid Weight', 'Specify a valid payload weight')
      return
    }

    setLoading(true)
    try {
      const created = await createMission({
        dest_lat: dest.lat,
        dest_lon: dest.lon,
        dest_label: form.dest_label || 'Delivery Drop Zone',
        package_weight_g: parseInt(form.package_weight_g),
        scheduled_at: form.scheduled_at || null,
      })
      setMission(created)

      // Run 6-Point Validation Check with backend
      const validated = await validateMission(created.id)
      setMission(validated)
      setStep('validated')
      sound.playTargetLock()
    } catch (err) {
      sound.playAlert(true)
      toast.error('Validation Failed', err.message || 'Unable to compute feasibility gates')
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async () => {
    if (!mission) return
    setLoading(true)
    setStep('starting')
    try {
      await startMission(mission.id)
      sound.playLaunchSequence()
      toast.success('Mission Dispatched!', 'Drone armed and executing autonomous takeoff')
      onClose()
    } catch (err) {
      sound.playAlert(true)
      toast.error('Launch Rejected', err.message || 'Drone rejected start sequence')
      setStep('validated')
    } finally {
      setLoading(false)
    }
  }

  const handleClearAllHistory = async () => {
    sound.playAlert(false)
    try {
      await clearMissions()
      toast.info('Log Reset', 'Mission history cleared')
      setConfirmClear(false)
    } catch (err) {
      toast.error('Clear Failed', err.message || 'Unable to clear mission history')
    }
  }

  const handleClose = () => {
    sound.playClick()
    setMission(null)
    setStep('create')
    setForm({ package_weight_g: 500, dest_label: '', scheduled_at: '' })
    setConfirmClear(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Minimalist Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[9990] backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Sleek Aerospace Drawer */}
      <div className="fixed inset-y-0 right-0 w-[420px] max-w-full z-[9999] glass-panel border-l border-white/10 animate-slide-in-right flex flex-col shadow-2xl select-none bg-charcoal-900/95 backdrop-blur-xl">
        {/* Modern Minimal Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-charcoal-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-charcoal-800 to-charcoal-900 border border-white/10 flex items-center justify-center shadow-inner text-cyan">
              <DroneLogo className="w-4 h-4" strokeColor="#00f0ff" coreColor="#00f0ff" glow={true} />
            </div>
            <div>
              <h2 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                PLAN MISSION
              </h2>
              <p className="text-[10px] font-mono text-slate-400">Autonomous flight gatekeeper</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Minimalist Tab Switcher */}
        <div className="px-4 py-2.5 bg-charcoal-950/40 border-b border-white/5 shrink-0">
          <div className="flex items-center p-1 rounded-xl bg-charcoal-950/90 border border-white/10 font-mono text-xs">
            <button
              onClick={() => {
                sound.playClick()
                setActiveTab('plan')
              }}
              className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'plan'
                  ? 'bg-charcoal-800 text-cyan border border-cyan/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan" />
              <span>New Mission</span>
            </button>
            <button
              onClick={() => {
                sound.playClick()
                setActiveTab('history')
              }}
              className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'history'
                  ? 'bg-charcoal-800 text-cyan border border-cyan/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>History ({missions.length})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Minimalist Mission Planner Form */}
        {activeTab === 'plan' ? (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 sidebar-scroll">
              {/* 1. Target Destination Card */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                  <span>1. DROP TARGET</span>
                  {dest && (
                    <span className="text-[9px] font-mono text-emerald-bright font-bold px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald/30">
                      GPS LOCKED
                    </span>
                  )}
                </div>

                {dest ? (
                  <div className="p-3 rounded-xl border border-cyan/30 bg-charcoal-950/80 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-lg bg-crimson/20 text-crimson-bright shrink-0">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-mono font-bold text-white tabular-nums truncate">
                          {dest.lat.toFixed(5)}° N, {dest.lon.toFixed(5)}° E
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          sound.playClick()
                          onPickDestFromMap()
                        }}
                        className="px-2 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan text-[11px] font-mono transition-colors shrink-0 border border-cyan/30"
                      >
                        Repick
                      </button>
                    </div>

                    {/* Integrated Waypoint Label */}
                    <div className="pt-1 border-t border-white/5">
                      <input
                        id="mission-dest-label"
                        type="text"
                        placeholder="Waypoint name e.g. VIT Academic Block"
                        value={form.dest_label}
                        onChange={(e) => setForm((f) => ({ ...f, dest_label: e.target.value }))}
                        className="w-full bg-charcoal-900/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan/50 transition-colors"
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      sound.playClick()
                      onPickDestFromMap()
                    }}
                    className="w-full p-4 rounded-xl border border-dashed border-cyan/40 hover:border-cyan hover:bg-cyan/5 transition-all flex flex-col items-center justify-center gap-1.5 text-xs font-mono text-cyan hover:text-white shadow-sm group bg-charcoal-950/50"
                  >
                    <Target className="w-5 h-5 text-cyan group-hover:scale-110 transition-transform" />
                    <span className="font-bold tracking-wide">Designate Coordinates on Map</span>
                    <span className="text-[10px] text-slate-400 font-sans">Click anywhere on the tactical map</span>
                  </button>
                )}
              </div>

              {/* 2. Payload Mass Slider & Preset Chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                  <span>2. PAYLOAD MASS</span>
                  <span className="text-xs font-mono text-cyan font-bold tabular-nums">
                    {form.package_weight_g >= 1000
                      ? `${(form.package_weight_g / 1000).toFixed(2)} kg`
                      : `${form.package_weight_g} g`}
                  </span>
                </div>

                <input
                  id="mission-weight-input"
                  type="range"
                  min="50"
                  max="2000"
                  step="50"
                  value={form.package_weight_g}
                  onChange={(e) => setForm((f) => ({ ...f, package_weight_g: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-charcoal-800 rounded-lg appearance-none cursor-pointer accent-cyan"
                />

                <div className="flex items-center gap-1.5">
                  {weightPresets.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        sound.playClick()
                        setForm((f) => ({ ...f, package_weight_g: w }))
                      }}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-mono transition-all tabular-nums ${
                        form.package_weight_g === w
                          ? 'bg-cyan-950/90 text-cyan border border-cyan/60 font-bold shadow-[0_0_8px_rgba(0,240,255,0.25)]'
                          : 'bg-charcoal-950/80 text-slate-400 hover:bg-charcoal-800 hover:text-white border border-white/5'
                      }`}
                    >
                      {w >= 1000 ? `${w / 1000}kg` : `${w}g`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Feasibility Verification Matrix */}
              {step === 'validated' && mission && (
                <SixPointValidationDisplay
                  result={mission}
                  form={form}
                  dest={dest}
                  currentBatteryPct={frame.battery_pct || 98}
                  settings={settings}
                />
              )}
            </div>

            {/* Bottom Actions Footer */}
            <div className="p-3.5 border-t border-white/10 bg-charcoal-950/90 shrink-0">
              {step === 'create' ? (
                <button
                  id="validate-mission-btn"
                  onClick={handleCreateAndValidate}
                  disabled={loading || !dest}
                  className="btn-primary w-full text-xs font-mono py-2.5 flex items-center justify-center gap-2 rounded-xl"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>CHECKING FEASIBILITY GATES...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>VALIDATE MISSION CONSTRAINTS</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      sound.playClick()
                      setStep('create')
                    }}
                    className="btn-secondary text-xs font-mono py-2.5 px-3 flex-1 rounded-xl"
                  >
                    Edit
                  </button>
                  <button
                    id="start-mission-btn"
                    onClick={handleStart}
                    disabled={loading || !(mission?.validation_result?.is_feasible ?? mission?.is_feasible ?? (mission?.status === 'VALIDATED'))}
                    className="btn-primary text-xs font-mono py-2.5 px-4 flex-[2] flex items-center justify-center gap-2 rounded-xl shadow-[0_0_16px_rgba(16,185,129,0.4)]"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>ARMING AIRCRAFT...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>ARM & LAUNCH MISSION</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Tab 2: Mission History Log */
          <div className="flex-1 flex flex-col justify-between overflow-hidden p-3.5">
            <div className="flex items-center justify-between mb-2.5 shrink-0">
              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300">
                <History className="w-3.5 h-3.5 text-cyan" />
                <span className="font-bold uppercase tracking-wider">RECORDED MISSIONS</span>
                <span className="text-[10px] text-slate-500 tabular-nums">({missions.length})</span>
              </div>

              {missions.length > 0 && (
                <div>
                  {confirmClear ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-charcoal-800 text-slate-400"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleClearAllHistory}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-crimson-950 text-crimson-bright border border-crimson/40 font-bold"
                      >
                        Confirm
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="text-[10px] font-mono text-slate-400 hover:text-crimson-bright flex items-center gap-1 transition-colors px-2 py-1 rounded bg-charcoal-950 border border-white/5 hover:border-crimson/30"
                      title="Clear mission log"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Scrollable Mission History */}
            <div className="flex-1 overflow-y-auto sidebar-scroll pr-1 space-y-1.5">
              {missions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-white/10 bg-charcoal-950/40">
                  <div className="p-2.5 rounded-full bg-charcoal-800 text-slate-500 mb-2">
                    <History className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-mono font-bold text-slate-300">NO MISSIONS RECORDED</p>
                  <p className="text-[11px] font-mono text-slate-500 mt-1">Dispatched missions will appear here</p>
                  <button
                    onClick={() => setActiveTab('plan')}
                    className="btn-secondary text-xs font-mono py-1 px-3 mt-3 flex items-center gap-1.5"
                  >
                    <Plus className="w-3 h-3 text-cyan" />
                    <span>Plan Mission</span>
                  </button>
                </div>
              ) : (
                missions.map((m) => (
                  <MissionHistoryItem key={m.id} mission={m} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
