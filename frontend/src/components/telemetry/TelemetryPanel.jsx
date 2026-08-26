import { Battery, Zap, Navigation, Gauge, Radio, Compass, Satellite, MapPin, Activity } from 'lucide-react'
import useTelemetryStore from '../../stores/telemetryStore'
import { useInterpolatedTelemetry } from '../../hooks/useTelemetry'
import { batteryColor, formatCoords, msToKmh } from '../../lib/formatters'

function MetricPod({ icon: Icon, label, value, unit, iconBg, accentColor, sub }) {
  return (
    <div className="metric-pod p-2.5 flex flex-col justify-between border border-white/5 hover:border-cyan/30 transition-all duration-200 bg-charcoal-900/90 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={`p-1 rounded-md ${iconBg || 'bg-charcoal-800 text-cyan'}`}>
          <Icon className="w-3 h-3" />
        </div>
      </div>
      <div className="mt-1.5">
        <div className="flex items-baseline gap-1">
          <span className={`font-mono text-lg font-bold tracking-tight tabular-nums ${accentColor || 'text-white'}`}>
            {value}
          </span>
          {unit && <span className="text-[10px] font-mono text-slate-400 font-semibold">{unit}</span>}
        </div>
        {sub && <div className="text-[9px] font-mono text-slate-500 mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  )
}

function BatteryCard({ pct, voltage, current, mah }) {
  const color = pct > 50 ? '#10e599' : pct > 25 ? '#fbbf24' : '#ff3355'
  const powerWatts = (voltage * current).toFixed(0)

  return (
    <div className="glass-card p-3 border border-white/10 bg-charcoal-900/90 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-charcoal-800 ${batteryColor(pct)} border border-white/5`}>
            <Battery className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider block">
              POWER PACK (6S LiPo)
            </span>
            <span className="text-[9px] font-mono text-slate-400">
              {mah?.toLocaleString() || 9800} mAh • {voltage.toFixed(1)}V • {current.toFixed(1)}A
            </span>
          </div>
        </div>
        <div className="text-right font-mono">
          <span className={`text-lg font-black tabular-nums ${batteryColor(pct)}`}>
            {pct.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Battery Gauge Bar */}
      <div className="h-1.5 bg-charcoal-950 rounded-full overflow-hidden p-[1px] border border-white/10">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.max(pct, 2)}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}`
          }}
        />
      </div>

      {/* Voltage & Amperage Ticker */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[10px] font-mono text-slate-300">
        <span>{voltage.toFixed(1)}V Total</span>
        <span className="text-slate-600">•</span>
        <span className="text-amber-bright font-semibold">{current.toFixed(1)}A Load</span>
        <span className="text-slate-600">•</span>
        <span className="text-cyan font-semibold">{powerWatts}W Power</span>
      </div>
    </div>
  )
}

export default function TelemetryPanel() {
  const telem = useInterpolatedTelemetry()
  const { connected } = useTelemetryStore()

  if (!connected && telem.timestamp_ms === 0) {
    return (
      <div className="p-3">
        <div className="glass-card p-4 text-center border border-white/10 bg-charcoal-900/90">
          <Radio className="w-6 h-6 text-cyan/60 mx-auto mb-2 animate-pulse" />
          <p className="text-xs font-mono text-slate-300 font-semibold">WAITING FOR MAVLINK TELEMETRY...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 p-3.5 select-none font-mono">
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan" />
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            AVIONICS TELEMETRY
          </h2>
        </div>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
          connected
            ? 'bg-emerald-950/80 text-emerald-bright border-emerald/40 shadow-[0_0_8px_rgba(16,229,153,0.3)]'
            : 'bg-crimson-950/80 text-crimson-bright border-crimson/40'
        }`}>
          {connected ? '● 5Hz LINK ACTIVE' : '○ DISCONNECTED'}
        </span>
      </div>

      {/* Battery Card */}
      <BatteryCard
        pct={telem.battery_pct}
        voltage={telem.battery_voltage_v}
        current={telem.battery_current_a}
        mah={telem.battery_remaining_mah}
      />

      {/* 2x2 Tactical Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        <MetricPod
          icon={Gauge}
          label="Ground Speed"
          value={msToKmh(telem.speed_ms)}
          unit="km/h"
          iconBg="bg-cyan-950/80 text-cyan"
          accentColor="text-white"
          sub={`${telem.speed_ms.toFixed(1)} m/s`}
        />
        <MetricPod
          icon={Navigation}
          label="Altitude AGL"
          value={telem.alt_m.toFixed(1)}
          unit="m"
          iconBg="bg-emerald-950/80 text-emerald-bright"
          accentColor="text-emerald-bright"
          sub={`MSL ${telem.alt_msl_m.toFixed(0)}m`}
        />
        <MetricPod
          icon={Compass}
          label="Compass Heading"
          value={`${telem.heading_deg.toFixed(0)}°`}
          iconBg="bg-indigo-950/80 text-indigo-300"
          accentColor="text-indigo-300"
          sub="Magnetic North"
        />
        <MetricPod
          icon={Zap}
          label="System Power"
          value={(telem.battery_voltage_v * telem.battery_current_a).toFixed(0)}
          unit="W"
          iconBg="bg-amber-950/80 text-amber-bright"
          accentColor="text-amber-bright"
          sub={`${telem.battery_current_a.toFixed(1)} Amps`}
        />
      </div>

      {/* GPS Position Coordinates Card */}
      <div className="glass-card p-2.5 border border-white/5 bg-charcoal-950/80">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 uppercase tracking-wider">
            <MapPin className="w-3 h-3 text-cyan" />
            <span>GEO COORDINATES</span>
          </div>
          <span className="text-[9px] text-cyan font-bold">
            {telem.satellites_visible || 16} SATS 3D-FIX
          </span>
        </div>
        <p className="text-xs text-white font-semibold tracking-wide">
          {telem.lat !== 0 || telem.lon !== 0 ? formatCoords(telem.lat, telem.lon) : 'VIT CHENNAI 12.8406°N, 80.1534°E'}
        </p>
      </div>
    </div>
  )
}
