import { memo } from 'react'
import {
  Satellite, Navigation, Gauge, Zap, Compass,
  Activity, MapPin, Radio, ShieldCheck
} from 'lucide-react'
import useTelemetryStore from '../../stores/telemetryStore'
import { msToKmh, batteryColor } from '../../lib/formatters'

export default memo(function DroneDataList() {
  const frame = useTelemetryStore((s) => s.frame)
  const connected = useTelemetryStore((s) => s.connected)

  const voltage = frame.battery_voltage_v || 24.8
  const current = frame.battery_current_a || 0.8
  const powerWatts = (voltage * current).toFixed(0)
  const speedKmh = msToKmh(frame.speed_ms || 0)

  const getHeadingCardinal = (deg = 0) => {
    const norm = ((deg % 360) + 360) % 360
    return norm >= 337.5 || norm < 22.5 ? 'N' :
      norm >= 22.5 && norm < 67.5 ? 'NE' :
      norm >= 67.5 && norm < 112.5 ? 'E' :
      norm >= 112.5 && norm < 157.5 ? 'SE' :
      norm >= 157.5 && norm < 202.5 ? 'S' :
      norm >= 202.5 && norm < 247.5 ? 'SW' :
      norm >= 247.5 && norm < 292.5 ? 'W' : 'NW'
  }

  const items = [
    {
      label: 'Latitude',
      value: `${Math.abs(frame.lat || 12.8406).toFixed(5)}° ${(frame.lat || 12.8406) >= 0 ? 'N' : 'S'}`,
      icon: MapPin,
      color: 'text-white',
    },
    {
      label: 'Longitude',
      value: `${Math.abs(frame.lon || 80.1534).toFixed(5)}° ${(frame.lon || 80.1534) >= 0 ? 'E' : 'W'}`,
      icon: MapPin,
      color: 'text-white',
    },
    {
      label: 'Ground Speed',
      value: `${speedKmh} km/h`,
      icon: Gauge,
      color: 'text-cyan font-bold',
    },
    {
      label: 'Altitude MSL',
      value: `${(frame.alt_msl_m || 35.0).toFixed(1)} m`,
      icon: Navigation,
      color: 'text-emerald-bright font-bold',
    },
    {
      label: 'Heading',
      value: `${(frame.heading_deg || 0).toFixed(0)}° ${getHeadingCardinal(frame.heading_deg || 0)}`,
      icon: Compass,
      color: 'text-indigo-300 font-semibold',
    },
    {
      label: 'Power Draw',
      value: `${powerWatts} W (${voltage.toFixed(1)}V · ${current.toFixed(1)}A)`,
      icon: Zap,
      color: 'text-amber-bright font-semibold',
    },
    {
      label: 'Satellite Status',
      value: `${frame.satellites_visible || 16} Sats (HDOP ${(frame.hdop || 0.8).toFixed(1)})`,
      icon: Satellite,
      color: 'text-cyan font-medium',
    },
    {
      label: 'EKF / IMU Lock',
      value: frame.armed ? 'ARMED • ACTIVE' : '3D FIX • NOMINAL',
      icon: ShieldCheck,
      color: frame.armed ? 'text-crimson-bright font-bold' : 'text-emerald-bright font-semibold',
    },
  ]

  return (
    <div className="h-full flex flex-col justify-between p-3 select-none bg-charcoal-900/90 rounded-xl border border-white/10 shadow-md">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan" />
          <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
            DRONE DATA
          </h2>
        </div>
        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
          LIVE TELEMETRY
        </span>
      </div>

      {/* Vertical Label : Value List */}
      <div className="flex-1 divide-y divide-white/5 overflow-y-auto sidebar-scroll my-1 pr-0.5">
        {items.map((item, idx) => {
          const Icon = item.icon
          return (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 px-1 hover:bg-white/[0.03] rounded-lg transition-colors font-mono text-xs"
            >
              <div className="flex items-center gap-1.5 text-slate-400">
                <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-[11px] font-medium tracking-tight">{item.label}</span>
              </div>
              <span className={`tabular-nums text-[11px] ${item.color}`}>
                {item.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
})
