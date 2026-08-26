import { useState } from 'react'
import {
  X, MapPin, CheckCircle2, XCircle,
  AlertTriangle, Loader, Navigation, Send,
  Battery, Scale, CloudSun, Route, Clock, Gauge
} from 'lucide-react'
import useMissionStore from '../../stores/missionStore'
import useTelemetryStore from '../../stores/telemetryStore'
import useSettingsStore from '../../stores/settingsStore'
import { useToast } from '../common/Toast'
import { formatDistance, formatDuration, formatWeight } from '../../lib/formatters'
import { sound } from '../../lib/audioService'

function SixPointValidationDisplay({ result, form, currentBatteryPct, settings }) {
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

  const probColor = (prob || 0) >= 0.8 ? 'text-emerald-bright' : (prob || 0) >= 0.6 ? 'text-amber-bright' : 'text-crimson-bright'
  const probBg = (prob || 0) >= 0.8 ? 'bg-emerald-950/80 border-emerald/40' : (prob || 0) >= 0.6 ? 'bg-amber-950/80 border-amber/40' : 'bg-crimson-950/80 border-crimson/40'

  const gates = [
    { id: 'battery', title: 'Battery %', icon: Battery, passed: currentBatteryPct >= battUsage, detail: `${currentBatteryPct.toFixed(0)}% vs ${battUsage.toFixed(0)}% req` },
    { id: 'weight', title: 'Weight', icon: Scale, passed: form.package_weight_g <= maxPayload, detail: `${formatWeight(form.package_weight_g)} / ${formatWeight(maxPayload)} max` },
    { id: 'weather', title: 'Weather', icon: CloudSun, passed: rejections.every((r) => !r.toLowerCase().includes('wind') && !r.toLowerCase().includes('precip')), detail: 'Nominal conditions' },
    { id: 'distance', title: 'Distance', icon: Route, passed: dist <= maxRange, detail: `${formatDistance(dist)} / ${formatDistance(maxRange)} max` },
    { id: 'tof', title: 'TOF', icon: Clock, passed: totalTime > 0, detail: `${formatDuration(totalTime)} flight` },
    { id: 'speed', title: 'Speed', icon: Gauge, passed: speedMs > 0, detail: `${(speedMs * 3.6).toFixed(0)} km/h cruise` },
  ]

  return (
    <div className={`rounded-xl p-3 border ${isFeasible ? 'border-emerald/40 bg-emerald-950/25' : 'border-crimson/40 bg-crimson-950/25'} select-none space-y-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isFeasible ? <CheckCircle2 className="w-4 h-4 text-emerald-bright" /> : <XCircle className="w-4 h-4 text-crimson-bright" />}
          <span className={`text-xs font-mono font-bold uppercase ${isFeasible ? 'text-emerald-bright' : 'text-crimson-bright'}`}>
            {isFeasible ? 'VALIDATION PASSED' : 'VALIDATION REJECTED'}
          </span>
        </div>
        {prob !== undefined && (
          <span className={`text-xs font-black font-mono px-2 py-0.5 rounded border tabular-nums ${probColor} ${probBg}`}>
            {(prob * 100).toFixed(0)}% SUCCESS
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
        {gates.map((g) => {
          const Icon = g.icon
          return (
            <div key={g.id} className={`p-1 rounded border flex items-center gap-1 ${g.passed ? 'bg-charcoal-900 border-emerald/30' : 'bg-crimson-950 border-crimson/40 text-crimson-bright'}`}>
              <Icon className={`w-3 h-3 ${g.passed ? 'text-emerald-bright' : 'text-crimson-bright'}`} />
              <span className="font-bold text-[9px] uppercase">{g.title}:</span>
              <span className="text-[8px] text-slate-400 truncate">{g.detail}</span>
            </div>
          )
        })}
      </div>

      {rejections.length > 0 && (
        <div className="space-y-1 mt-1">
          {rejections.map((r, i) => (
            <p key={i} className="text-[10px] font-mono text-crimson-bright bg-crimson-950/60 p-1 rounded">
              {r}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MissionCreator({ isOpen, onClose, pickedDest, onPickDestFromMap }) {
  const [form, setForm] = useState({
    package_weight_g: 500,
    dest_label: '',
    scheduled_at: '',
  })
  const [mission, setMission] = useState(null)
  const [step, setStep] = useState('create')
  const [loading, setLoading] = useState(false)

  const { createMission, validateMission, startMission } = useMissionStore()
  const frame = useTelemetryStore((s) => s.frame)
  const { settings } = useSettingsStore()
  const toast = useToast()

  const dest = pickedDest
  const weightPresets = [250, 500, 1000, 1500, 2000]

  const handleCreate = async () => {
    if (!dest) {
      toast.warning('No Destination Selected', 'Designate a drop point on the map first')
      return
    }
    if (!form.package_weight_g || form.package_weight_g < 1) {
      toast.warning('Invalid Weight', 'Specify a valid parcel payload weight')
      return
    }

    setLoading(true)
    try {
      const created = await createMission({
        dest_lat: dest.lat,
        dest_lon: dest.lon,
        dest_label: form.dest_label || 'VIT Chennai Delivery Waypoint',
        package_weight_g: parseInt(form.package_weight_g),
        scheduled_at: form.scheduled_at || null,
      })
      setMission(created)
      const validated = await validateMission(created.id)
      setMission(validated)
      setStep('validated')
    } catch (err) {
      toast.error('Mission Creation Failed', err.message || 'Unable to register mission')
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
      toast.success('Mission Dispatched!', 'Drone armed and executing autonomous takeoff')
      onClose()
    } catch (err) {
      toast.error('Launch Command Failed', err.message || 'Drone rejected start sequence')
      setStep('validated')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setMission(null)
    setStep('create')
    setForm({ package_weight_g: 500, dest_label: '', scheduled_at: '' })
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[40] backdrop-blur-sm transition-opacity" onClick={handleClose} />
      <div className="fixed right-0 top-14 bottom-0 w-96 z-50 glass-panel border-l border-white/10 flex flex-col shadow-2xl select-none bg-charcoal-900/95">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-charcoal-950/90">
          <h2 className="text-sm font-bold font-mono text-white flex items-center gap-2 uppercase tracking-wider">
            <Navigation className="w-4 h-4 text-cyan" />
            <span>DISPATCH MISSION PLANNER</span>
          </h2>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 sidebar-scroll">
          <div>
            <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5 block">
              1. DROP ZONE DESTINATION *
            </label>
            {dest ? (
              <div className="glass-card p-3 border border-cyan/30 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-crimson-bright mt-0.5" />
                  <div>
                    <p className="text-xs font-mono font-bold text-white tabular-nums">
                      {dest.lat.toFixed(5)}° N, {dest.lon.toFixed(5)}° E
                    </p>
                    {form.dest_label && <p className="text-xs text-cyan mt-0.5">{form.dest_label}</p>}
                  </div>
                </div>
                <button onClick={onPickDestFromMap} className="px-2 py-1 rounded bg-cyan-950/80 text-cyan text-xs font-mono">
                  Change
                </button>
              </div>
            ) : (
              <button onClick={onPickDestFromMap} className="w-full glass-card p-3 border border-dashed border-cyan/40 hover:border-cyan text-xs font-mono text-cyan flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>CLICK MAP TO DESIGNATE TARGET</span>
              </button>
            )}
          </div>

          <div>
            <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-1 block">
              Destination Label
            </label>
            <input
              type="text"
              placeholder="e.g. VIT Academic Block"
              value={form.dest_label}
              onChange={(e) => setForm((f) => ({ ...f, dest_label: e.target.value }))}
              className="input text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                2. PAYLOAD WEIGHT (GRAMS) *
              </label>
              <span className="text-xs font-mono text-cyan font-bold tabular-nums">
                {formatWeight(form.package_weight_g)}
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="2500"
              step="50"
              value={form.package_weight_g}
              onChange={(e) => setForm((f) => ({ ...f, package_weight_g: Number(e.target.value) }))}
              className="w-full h-1.5 bg-charcoal-800 rounded-lg appearance-none cursor-pointer accent-cyan"
            />
            <div className="flex items-center gap-1.5 mt-2">
              {weightPresets.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, package_weight_g: w }))}
                  className={`flex-1 py-1 rounded text-[10px] font-mono border ${form.package_weight_g === w ? 'bg-cyan-950 text-cyan border-cyan font-bold' : 'bg-charcoal-800 border-white/5 text-slate-400'}`}
                >
                  {w >= 1000 ? `${w / 1000}k` : `${w}g`}
                </button>
              ))}
            </div>
          </div>

          {mission?.validation_result && (
            <SixPointValidationDisplay
              result={mission.validation_result}
              form={form}
              currentBatteryPct={frame.battery_pct || 98}
              settings={settings}
            />
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-charcoal-950/90 space-y-2">
          {step === 'create' && (
            <button onClick={handleCreate} disabled={loading || !dest} className="btn-primary w-full py-2.5 font-mono text-xs">
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{loading ? 'VALIDATING 6 GATES...' : 'VALIDATE & COMPUTE TRAJECTORY'}</span>
            </button>
          )}

          {step === 'validated' && mission?.validation_result?.is_feasible && (
            <button onClick={handleStart} disabled={loading} className="btn-primary w-full py-2.5 font-mono text-xs">
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>DISPATCH MISSION • AUTONOMOUS LAUNCH</span>
            </button>
          )}

          {step === 'validated' && !mission?.validation_result?.is_feasible && (
            <button onClick={() => setStep('create')} className="btn-secondary w-full text-xs font-mono py-2">
              Adjust Parameters & Re-test
            </button>
          )}
        </div>
      </div>
    </>
  )
}
