import { useEffect } from 'react'
import { Plus, Package, MapPin, Navigation, XCircle, Sparkles, Send, CheckCircle2, History } from 'lucide-react'
import useMissionStore from '../../stores/missionStore'
import { useToast } from '../common/Toast'
import StatusBadge from '../common/StatusBadge'
import { formatDuration, formatDistance, formatWeight, timeAgo } from '../../lib/formatters'

function ActiveMissionCard({ mission, onAbort }) {
  const progress = ['CREATED', 'VALIDATED', 'READY', 'IN_FLIGHT', 'DELIVERED', 'RETURNING', 'COMPLETED']
  const currentStep = progress.indexOf(mission.status)

  const prob = mission.success_probability
  const probColor = prob >= 0.8 ? 'text-emerald-400' : prob >= 0.6 ? 'text-amber-400' : 'text-rose-400'
  const probBg = prob >= 0.8 ? 'bg-emerald-950/80 border-emerald-500/40' : prob >= 0.6 ? 'bg-amber-950/80 border-amber-500/40' : 'bg-rose-950/80 border-rose-500/40'

  return (
    <div className="glass-card p-3.5 border border-sky-500/30 shadow-[0_0_20px_rgba(56,189,248,0.15)] select-none">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan animate-ping"></span>
          <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider">ACTIVE MISSION</span>
        </div>
        <StatusBadge status={mission.status} />
      </div>

      {/* Progress Step Bar */}
      <div className="flex items-center gap-1 mb-3">
        {progress.map((step, i) => (
          <div
            key={step}
            className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
              i <= currentStep
                ? 'bg-gradient-to-r from-sky-400 to-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.6)]'
                : 'bg-surface-700'
            }`}
            title={step}
          />
        ))}
      </div>

      {/* Mission Key Telemetry */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-2.5">
        <div className="glass-card p-2 border border-white/5">
          <span className="text-[10px] text-slate-400 block uppercase">Total Distance</span>
          <span className="text-sm font-bold text-white">{formatDistance(mission.distance_km || 0)}</span>
        </div>
        <div className="glass-card p-2 border border-white/5">
          <span className="text-[10px] text-slate-400 block uppercase">Payload Weight</span>
          <span className="text-sm font-bold text-white">{formatWeight(mission.package_weight_g)}</span>
        </div>
        {mission.estimated_flight_time_s && (
          <div className="glass-card p-2 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase">Est. Trip Time</span>
            <span className="text-sm font-bold text-sky-300">{formatDuration(mission.estimated_flight_time_s)}</span>
          </div>
        )}
        {mission.success_probability !== null && (
          <div className={`glass-card p-2 border ${probBg}`}>
            <span className="text-[10px] text-slate-400 block uppercase">Feasibility</span>
            <span className={`text-sm font-black ${probColor}`}>{(mission.success_probability * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>

      {mission.dest_label && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-800/80 border border-white/5 text-xs font-mono text-slate-300 mb-3">
          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="truncate">{mission.dest_label}</span>
        </div>
      )}

      {/* Abort button for active missions */}
      {['READY', 'IN_FLIGHT', 'DELIVERED', 'RETURNING'].includes(mission.status) && (
        <button
          onClick={() => onAbort(mission.id)}
          className="btn-danger w-full text-xs font-mono py-2"
          id={`abort-mission-${mission.id}`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>ABORT & RETURN TO BASE</span>
        </button>
      )}
    </div>
  )
}

function MissionHistoryItem({ mission }) {
  return (
    <div className="glass-card p-2.5 flex items-center justify-between gap-2 border border-white/5 hover:border-white/15 transition-all">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-2 h-2 rounded-full shrink-0 ${
          mission.status === 'COMPLETED' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]' :
          mission.status === 'FAILED' ? 'bg-rose-400' :
          'bg-slate-500'
        }`} />
        <div className="min-w-0">
          <p className="text-xs font-mono font-semibold text-white truncate">
            {mission.dest_label || `${mission.dest_lat?.toFixed(4)}, ${mission.dest_lon?.toFixed(4)}`}
          </p>
          <p className="text-[10px] font-mono text-slate-400">{timeAgo(mission.created_at)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-mono text-slate-400">{formatWeight(mission.package_weight_g)}</span>
        <StatusBadge status={mission.status} />
      </div>
    </div>
  )
}

export default function MissionPanel({ onCreateMission }) {
  const { missions, activeMission, loading, abortMission, fetchMissions } = useMissionStore()
  const toast = useToast()

  useEffect(() => {
    fetchMissions()
  }, [fetchMissions])

  const handleAbort = async (id) => {
    try {
      await abortMission(id, 'Operator commanded abort')
      toast.warning('Mission Aborted', 'Drone commanded to execute RTL failsafe')
    } catch (err) {
      toast.error('Abort Failed', err.message || 'Unable to transmit abort command')
    }
  }

  const recent = missions.filter(
    (m) => !activeMission || m.id !== activeMission.id
  ).slice(0, 5)

  return (
    <div className="flex flex-col gap-3 p-3.5 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-sky-400" />
          <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">MISSION CONTROL</h2>
        </div>
        <button
          id="create-mission-btn"
          onClick={onCreateMission}
          className="btn-primary text-xs font-mono py-1 px-3"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>NEW DISPATCH</span>
        </button>
      </div>

      {/* Active Mission */}
      {activeMission ? (
        <ActiveMissionCard mission={activeMission} onAbort={handleAbort} />
      ) : (
        <div className="glass-card p-4 text-center border border-dashed border-white/10">
          <Send className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
          <p className="text-xs font-mono text-slate-300 font-semibold">NO ACTIVE MISSION IN FLIGHT</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Plan and launch an autonomous parcel dispatch</p>
          <button
            onClick={onCreateMission}
            className="mt-2.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-mono transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Mission</span>
          </button>
        </div>
      )}

      {/* Mission History */}
      {recent.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            <History className="w-3 h-3" />
            <span>RECENT MISSIONS</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {recent.map((m) => (
              <MissionHistoryItem key={m.id} mission={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
