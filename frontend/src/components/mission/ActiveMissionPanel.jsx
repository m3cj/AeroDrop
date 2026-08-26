import { useState } from 'react'
import {
  Navigation, MapPin, XCircle, Send, Plus,
  ShieldAlert, Clock, CheckCircle2, Package,
  Compass, ArrowRight, Radio, Crosshair
} from 'lucide-react'
import useMissionStore from '../../stores/missionStore'
import { useToast } from '../common/Toast'
import StatusBadge from '../common/StatusBadge'
import { formatDuration, formatDistance, formatWeight } from '../../lib/formatters'
import { sound } from '../../lib/audioService'

export default function ActiveMissionPanel({ onOpenNewMission }) {
  const { activeMission, abortMission } = useMissionStore()
  const [confirmAbort, setConfirmAbort] = useState(false)
  const toast = useToast()

  const progress = ['CREATED', 'VALIDATED', 'READY', 'IN_FLIGHT', 'DELIVERED', 'RETURNING', 'COMPLETED']
  const currentStep = activeMission ? progress.indexOf(activeMission.status) : -1

  const handleAbort = async (id) => {
    sound.playAlert(true)
    try {
      await abortMission(id, 'Operator commanded emergency RTL')
      toast.warning('Mission Aborted', 'Drone commanded to execute Return-to-Launch failsafe')
      setConfirmAbort(false)
    } catch (err) {
      toast.error('Abort Failed', err.message || 'Unable to transmit abort command')
    }
  }

  const prob = activeMission?.success_probability
  const probColor = prob >= 0.8 ? 'text-emerald-bright' : prob >= 0.6 ? 'text-amber-bright' : 'text-crimson-bright'
  const probBg = prob >= 0.8
    ? 'bg-emerald-950/80 border-emerald/40'
    : prob >= 0.6
    ? 'bg-amber-950/80 border-amber/40'
    : 'bg-crimson-950/80 border-crimson/40'

  return (
    <div className="flex flex-col gap-2.5 p-3.5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-cyan" />
          <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
            ACTIVE MISSION
          </h2>
        </div>
        {activeMission && <StatusBadge status={activeMission.status} />}
      </div>

      {activeMission ? (
        <div className="glass-card p-3 border border-cyan/30 shadow-[0_0_20px_rgba(0,240,255,0.12)] bg-charcoal-900/90 space-y-2.5">
          {/* Mission Progress Pipeline */}
          <div>
            <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 uppercase tracking-wider mb-1">
              <span>MISSION PIPELINE</span>
              <span className="text-cyan font-bold">{activeMission.status}</span>
            </div>
            <div className="flex items-center gap-1">
              {progress.map((step, i) => (
                <div
                  key={step}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                    i <= currentStep
                      ? 'bg-gradient-to-r from-cyan to-emerald-bright shadow-[0_0_8px_rgba(0,240,255,0.8)]'
                      : 'bg-charcoal-800'
                  }`}
                  title={step}
                />
              ))}
            </div>
          </div>

          {/* Mission Key Telemetry Grid */}
          <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
            <div className="metric-pod p-2 bg-charcoal-950/80">
              <span className="text-[8px] text-slate-400 block uppercase font-bold">DISTANCE</span>
              <span className="text-xs font-bold text-white tabular-nums">
                {formatDistance(activeMission.distance_km || 0)}
              </span>
            </div>
            <div className="metric-pod p-2 bg-charcoal-950/80">
              <span className="text-[8px] text-slate-400 block uppercase font-bold">PAYLOAD</span>
              <span className="text-xs font-bold text-white tabular-nums">
                {formatWeight(activeMission.package_weight_g)}
              </span>
            </div>
            {activeMission.estimated_flight_time_s && (
              <div className="metric-pod p-2 bg-charcoal-950/80">
                <span className="text-[8px] text-slate-400 block uppercase font-bold">ETA</span>
                <span className="text-xs font-bold text-cyan tabular-nums">
                  {formatDuration(activeMission.estimated_flight_time_s)}
                </span>
              </div>
            )}
            {activeMission.success_probability !== null && (
              <div className={`metric-pod p-2 border ${probBg} bg-charcoal-950/80`}>
                <span className="text-[8px] text-slate-400 block uppercase font-bold">SCORE</span>
                <span className={`text-xs font-black tabular-nums ${probColor}`}>
                  {(activeMission.success_probability * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>

          {/* Destination Target Capsule */}
          {activeMission.dest_label && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-charcoal-950/90 border border-white/5 text-[10px] font-mono text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-crimson-bright shrink-0" />
              <div className="truncate">
                <span className="text-[8px] text-slate-400 block uppercase leading-none">TARGET DROP ZONE</span>
                <span className="font-semibold text-white truncate block mt-0.5">
                  {activeMission.dest_label}
                </span>
              </div>
            </div>
          )}

          {/* Abort Button with Safety Confirmation */}
          {['READY', 'IN_FLIGHT', 'DELIVERED', 'RETURNING'].includes(activeMission.status) && (
            <div className="pt-1">
              {confirmAbort ? (
                <div className="flex items-center gap-2 animate-fade-in">
                  <button
                    onClick={() => setConfirmAbort(false)}
                    className="btn-secondary text-xs font-mono py-1.5 px-2.5 flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAbort(activeMission.id)}
                    className="btn-danger text-xs font-mono py-1.5 px-3 flex-[2] flex items-center justify-center gap-1.5"
                    id={`confirm-abort-${activeMission.id}`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>CONFIRM RTL</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    sound.playAlert(false)
                    setConfirmAbort(true)
                  }}
                  className="btn-danger w-full text-xs font-mono py-1.5 flex items-center justify-center gap-1.5 shadow-md"
                  id={`abort-mission-${activeMission.id}`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>EMERGENCY ABORT & RTL</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Standby State */
        <div className="glass-card p-3 border border-white/10 shadow-sm bg-charcoal-900/90 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-bright status-beacon" />
              <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">LAUNCHPAD ALPHA</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-bright bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald/30 font-semibold">READY</span>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-3 px-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-slate-500 uppercase">Aircraft</span>
              <span className="text-white font-semibold">Hexacopter-01</span>
            </div>
            <div className="flex flex-col gap-0.5 text-right">
              <span className="text-[9px] text-slate-500 uppercase">Home</span>
              <span className="text-cyan font-mono text-[9px]">12.84°N 80.15°E</span>
            </div>
            <div className="flex flex-col gap-0.5 text-right">
              <span className="text-[9px] text-slate-500 uppercase">Readiness</span>
              <span className="text-emerald-bright font-semibold">NOMINAL</span>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick()
              onOpenNewMission()
            }}
            className="btn-primary w-full text-xs font-mono py-2 flex items-center justify-center gap-2 shadow-lg group-hover:scale-[1.01] transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span className="font-bold tracking-wider uppercase">Plan New Mission</span>
          </button>
        </div>
      )}
    </div>
  )
}
