import { useState, memo } from 'react'
import {
  Navigation, MapPin, Package, Clock, ShieldAlert,
  XCircle, Plus, CheckCircle2, ArrowRight, Gauge,
  Activity
} from 'lucide-react'
import useMissionStore from '../../stores/missionStore'
import { useToast } from '../common/Toast'
import StatusBadge from '../common/StatusBadge'
import { formatDuration, formatDistance, formatWeight } from '../../lib/formatters'
import { sound } from '../../lib/audioService'

export default memo(function MissionDetailsPanel({ onOpenNewMission }) {
  const { activeMission, abortMission } = useMissionStore()
  const [confirmAbort, setConfirmAbort] = useState(false)
  const toast = useToast()

  const pipeline = ['READY', 'IN_FLIGHT', 'DELIVERED', 'RETURNING', 'COMPLETED']
  const currentStepIndex = activeMission ? pipeline.indexOf(activeMission.status) : -1

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

  const isMissionActive = activeMission && ['READY', 'IN_FLIGHT', 'DELIVERED', 'RETURNING'].includes(activeMission.status)

  return (
    <div className="h-full flex flex-col justify-between p-3 select-none bg-charcoal-900/90 rounded-xl border border-white/10 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-cyan" />
          <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
            MISSION DETAILS
          </h2>
        </div>
        {activeMission ? (
          <StatusBadge status={activeMission.status} />
        ) : (
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-charcoal-800 text-slate-400 border border-white/5">
            STANDBY
          </span>
        )}
      </div>

      {activeMission ? (
        <div className="flex-1 flex flex-col justify-between my-1 space-y-2">
          {/* Three Core Data Points: Weight, Destination, How Much Left */}
          <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
            {/* 1. Payload Weight */}
            <div className="p-2 rounded-lg bg-charcoal-950/80 border border-white/5 flex items-center gap-2">
              <div className="p-1 rounded bg-cyan-950 text-cyan">
                <Package className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[8px] text-slate-400 block uppercase font-bold">WEIGHT</span>
                <span className="text-xs font-bold text-white tabular-nums">
                  {formatWeight(activeMission.package_weight_g)}
                </span>
              </div>
            </div>

            {/* 2. Remaining Distance / How Much Left */}
            <div className="p-2 rounded-lg bg-charcoal-950/80 border border-white/5 flex items-center gap-2">
              <div className="p-1 rounded bg-emerald-950 text-emerald-bright">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[8px] text-slate-400 block uppercase font-bold">HOW MUCH LEFT</span>
                <span className="text-xs font-bold text-emerald-bright tabular-nums">
                  {formatDistance(activeMission.distance_km || 0)}
                  {activeMission.estimated_flight_time_s ? ` · ${formatDuration(activeMission.estimated_flight_time_s)}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Destination */}
          <div className="p-2 rounded-lg bg-charcoal-950/80 border border-white/5 flex items-start gap-2 font-mono">
            <div className="p-1 rounded bg-crimson/20 text-crimson-bright mt-0.5 shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[8px] text-slate-400 block uppercase font-bold leading-none">DESTINATION</span>
              <p className="text-xs font-semibold text-white truncate mt-0.5">
                {activeMission.dest_label || `${activeMission.dest_lat?.toFixed(4)}° N, ${activeMission.dest_lon?.toFixed(4)}° E`}
              </p>
            </div>
          </div>

          {/* Abort / Actions */}
          {isMissionActive && (
            <div className="pt-0.5">
              {confirmAbort ? (
                <div className="flex items-center gap-1.5 animate-fade-in">
                  <button
                    onClick={() => setConfirmAbort(false)}
                    className="btn-secondary text-[11px] font-mono py-1 px-2 flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAbort(activeMission.id)}
                    className="btn-danger text-[11px] font-mono py-1 px-2.5 flex-[2] flex items-center justify-center gap-1"
                    id={`confirm-abort-${activeMission.id}`}
                  >
                    <ShieldAlert className="w-3 h-3" />
                    <span>CONFIRM RTL</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      sound.playAlert(false)
                      setConfirmAbort(true)
                    }}
                    className="btn-danger flex-1 text-[11px] font-mono py-1 flex items-center justify-center gap-1.5"
                    id={`abort-mission-${activeMission.id}`}
                  >
                    <XCircle className="w-3 h-3" />
                    <span>ABORT / RTL</span>
                  </button>
                  <button
                    onClick={() => {
                      sound.playClick()
                      onOpenNewMission()
                    }}
                    className="btn-secondary text-[11px] font-mono py-1 px-2.5 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-cyan" />
                    <span>New</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Standby State */
        <div className="flex-1 flex flex-col justify-between my-1 p-2 rounded-lg bg-charcoal-950/60 border border-white/5">
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Aircraft Status</span>
              <span className="text-emerald-bright font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-bright status-beacon" />
                PAD ALPHA • READY
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Current Payload</span>
              <span className="text-slate-300">Not Loaded (0 g)</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Launch Clearance</span>
              <span className="text-cyan font-semibold">GCS AUTO-READY</span>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick()
              onOpenNewMission()
            }}
            id="plan-new-mission-btn"
            className="btn-primary w-full text-xs font-mono py-1.5 mt-2 flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.01] transition-transform"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="font-bold tracking-wider uppercase">New Mission</span>
          </button>
        </div>
      )}
    </div>
  )
})
