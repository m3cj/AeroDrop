import { useEffect, useRef, memo, useState } from 'react'
import {
  Battery, Zap, Navigation, Gauge, Compass,
  TrendingUp
} from 'lucide-react'
import useTelemetryStore from '../../stores/telemetryStore'
import { useTelemetryHistory } from '../../hooks/useTelemetry'
import { batteryColor, msToKmh } from '../../lib/formatters'

/**
 * High-precision Canvas Sparkline Waveform
 */
const MetricSparkline = memo(function MetricSparkline({ dataKey, color = '#00f0ff', height = 28 }) {
  const canvasRef = useRef(null)
  const history = useTelemetryHistory()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, width, h)

    if (!history || history.length < 2) {
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.moveTo(0, h / 2)
      ctx.lineTo(width, h / 2)
      ctx.stroke()
      ctx.setLineDash([])
      return
    }

    const values = history.map((item) => item[dataKey] || 0)
    const min = Math.min(...values)
    const max = Math.max(...values, min + 0.1)
    const range = max - min || 1
    const stepX = width / (values.length - 1)

    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, `${color}45`)
    grad.addColorStop(1, `${color}00`)

    ctx.beginPath()
    values.forEach((v, i) => {
      const x = i * stepX
      const y = h - ((v - min) / range) * (h - 6) - 3
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })

    ctx.strokeStyle = color
    ctx.lineWidth = 1.75
    ctx.shadowColor = color
    ctx.shadowBlur = 6
    ctx.stroke()

    ctx.lineTo(width, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.shadowBlur = 0
    ctx.fill()
  }, [history, dataKey, color])

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={height}
      className="w-full h-7 rounded overflow-hidden mt-1 opacity-80 hover:opacity-100 transition-opacity"
    />
  )
})

/**
 * Mini Compass Rose
 */
function MiniCompassRose({ heading = 0 }) {
  const norm = ((heading % 360) + 360) % 360
  const dir =
    norm >= 337.5 || norm < 22.5 ? 'N' :
    norm >= 22.5 && norm < 67.5 ? 'NE' :
    norm >= 67.5 && norm < 112.5 ? 'E' :
    norm >= 112.5 && norm < 157.5 ? 'SE' :
    norm >= 157.5 && norm < 202.5 ? 'S' :
    norm >= 202.5 && norm < 247.5 ? 'SW' :
    norm >= 247.5 && norm < 292.5 ? 'W' : 'NW'

  return (
    <div className="flex items-center justify-between w-full mt-1.5 pt-1 border-t border-white/5 font-mono">
      <div className="flex items-center gap-1.5">
        <div
          className="w-4 h-4 rounded-full border border-indigo-400/40 flex items-center justify-center relative transition-transform duration-300 bg-charcoal-950"
          style={{ transform: `rotate(${heading}deg)` }}
        >
          <div className="w-0.5 h-2 bg-indigo-400 rounded-full -translate-y-0.5 shadow-[0_0_4px_rgba(129,140,248,0.8)]" />
        </div>
        <span className="text-[10px] font-bold text-indigo-300 tracking-wider">
          {dir} <span className="text-slate-500 font-normal">({heading.toFixed(0)}°)</span>
        </span>
      </div>
      <span className="text-[9px] text-slate-500 uppercase tracking-tight">MAG</span>
    </div>
  )
}

/**
 * Metric Pod
 */
function MetricPod({ icon: Icon, label, value, unit, accentColor, iconBg, subLeft, subRight, dataKey, sparkColor, customFooter }) {
  return (
    <div className="metric-pod p-2 flex flex-col justify-between group">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-200 transition-colors">
          {label}
        </span>
        <div className={`p-1 rounded-md border border-white/5 ${iconBg || 'bg-charcoal-800 text-cyan'}`}>
          <Icon className="w-3 h-3" />
        </div>
      </div>

      <div className="my-0.5">
        <div className="flex items-baseline gap-1">
          <span className={`font-mono text-xl font-bold tracking-tight leading-none tabular-nums ${accentColor || 'text-white'}`}>
            {value}
          </span>
          {unit && <span className="text-[10px] font-mono text-slate-400 font-semibold">{unit}</span>}
        </div>
        {(subLeft || subRight) && (
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mt-1">
            <span className="truncate">{subLeft}</span>
            {subRight && <span className="text-slate-400 shrink-0 font-medium">{subRight}</span>}
          </div>
        )}
      </div>

      {customFooter ? customFooter : dataKey ? <MetricSparkline dataKey={dataKey} color={sparkColor} /> : null}
    </div>
  )
}

/**
 * Simplified Flight Corridor Profile
 */
function FlightElevationProfile({ alt_m = 0, speed_ms = 0 }) {
  const cruiseAlt = 45
  const dropAlt = 12

  return (
    <div className="h-full flex flex-col justify-between p-2 select-none font-mono metric-pod bg-charcoal-950/90">
      <div className="flex items-center justify-between px-1 mb-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan uppercase tracking-wider">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>CORRIDOR PROFILE</span>
        </div>
        <div className="flex items-center gap-3 text-[9px]">
          <span className="text-slate-400">CRUISE <span className="text-cyan font-bold">{cruiseAlt}m</span></span>
          <span className="text-slate-400">DROP <span className="text-amber-bright font-bold">{dropAlt}m</span></span>
          <span className="text-emerald-bright font-bold">CLEAR</span>
        </div>
      </div>

      <div className="relative flex-1 bg-charcoal-900/60 rounded-lg border border-white/5 p-2 flex items-center justify-between overflow-hidden">
        <div className="absolute inset-0 flex flex-col justify-between p-2 pointer-events-none opacity-25">
          <div className="w-full border-b border-dashed border-cyan text-[8px] text-cyan text-right pr-1">45m</div>
          <div className="w-full border-b border-dashed border-amber-bright text-[8px] text-amber-bright text-right pr-1">12m</div>
          <div className="w-full border-b border-white text-[8px] text-slate-500 text-right pr-1">0m</div>
        </div>

        <svg className="w-full h-full" viewBox="0 0 500 70" preserveAspectRatio="none">
          <defs>
            <linearGradient id="corridorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path
            d="M 15 65 L 75 18 L 220 18 L 260 48 L 280 48 L 320 18 L 420 18 L 485 65 Z"
            fill="url(#corridorGrad)"
            stroke="#00f0ff"
            strokeWidth="1.75"
            strokeDasharray="4 2"
          />
          <circle cx="15" cy="65" r="3.5" fill="#10e599" stroke="#000" strokeWidth="1" />
          <circle cx="75" cy="18" r="3" fill="#00f0ff" stroke="#000" strokeWidth="1" />
          <circle cx="270" cy="48" r="4" fill="#ff3355" stroke="#fff" strokeWidth="1" />
          <circle cx="485" cy="65" r="3.5" fill="#10e599" stroke="#000" strokeWidth="1" />
        </svg>

        <div className="absolute top-2 left-3 bg-charcoal-950/90 px-2.5 py-1 rounded-md border border-cyan/40 text-[10px] text-cyan flex items-center gap-2 shadow-lg backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan animate-ping" />
          <span className="font-bold">{alt_m.toFixed(1)}m AGL</span>
          <span className="text-slate-400">{msToKmh(speed_ms)} km/h</span>
        </div>
      </div>
    </div>
  )
}

export default function BottomMetrics() {
  const frame = useTelemetryStore((s) => s.frame)
  const [activeTab, setActiveTab] = useState('metrics')

  const pct = Math.max(0, Math.min(100, frame.battery_pct || 98))
  const color = pct > 50 ? '#10e599' : pct > 25 ? '#fbbf24' : '#ff3355'
  const voltage = frame.battery_voltage_v || 24.8
  const current = frame.battery_current_a || 0.8
  const powerWatts = (voltage * current).toFixed(0)
  const mahRemaining = frame.battery_remaining_mah || 9800
  const estMinutes = current > 0.1 ? Math.max(1, Math.round((mahRemaining / (current * 1000)) * 60)) : 45

  return (
    <div className="h-full flex flex-col justify-between p-2.5 select-none">
      {/* Compact Battery Row */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-charcoal-900/90 border border-white/10 shadow-md mb-2">
        {/* Battery icon + percentage */}
        <div className={`flex items-center gap-1.5 ${batteryColor(pct)}`}>
          <Battery className="w-4 h-4" />
          <span className="text-base font-black font-mono tabular-nums leading-none">{pct.toFixed(0)}%</span>
        </div>

        {/* Gauge bar */}
        <div className="flex-1 h-1.5 bg-charcoal-950 rounded-full overflow-hidden border border-white/10">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
          />
        </div>

        {/* Key stats inline */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
          <span className="text-slate-200 font-semibold">{voltage.toFixed(1)}V</span>
          <span className="text-amber-bright font-semibold">{current.toFixed(1)}A</span>
          <span className="text-cyan font-semibold">{powerWatts}W</span>
          <span className="text-emerald-bright font-semibold">~{estMinutes}m</span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-0.5 bg-charcoal-950 p-0.5 rounded-lg border border-white/10 ml-1">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-semibold transition-all ${
              activeTab === 'metrics'
                ? 'bg-charcoal-800 text-cyan border border-cyan/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Telemetry
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-charcoal-800 text-cyan border border-cyan/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Profile
          </button>
        </div>
      </div>

      {/* 4 Metric Pods or Corridor Profile */}
      {activeTab === 'profile' ? (
        <div className="flex-1 min-h-0">
          <FlightElevationProfile alt_m={frame.alt_m || 0} speed_ms={frame.speed_ms || 0} />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 min-h-0">
          <MetricPod
            icon={Gauge}
            label="Speed"
            value={msToKmh(frame.speed_ms)}
            unit="km/h"
            accentColor="text-white"
            iconBg="bg-cyan-950/80 text-cyan"
            subLeft={`${frame.speed_ms?.toFixed(1) || 0} m/s`}
            subRight="GNSS"
            dataKey="speed_ms"
            sparkColor="#00f0ff"
          />

          <MetricPod
            icon={Navigation}
            label="Altitude"
            value={frame.alt_m?.toFixed(1) || '0.0'}
            unit="m"
            accentColor="text-emerald-bright"
            iconBg="bg-emerald-950/80 text-emerald-bright"
            subLeft={`MSL ${frame.alt_msl_m?.toFixed(0) || 35}m`}
            subRight={`VSI ${frame.vertical_speed_ms ? (frame.vertical_speed_ms >= 0 ? '+' : '') + frame.vertical_speed_ms.toFixed(1) : '+0.0'}`}
            dataKey="alt_m"
            sparkColor="#10e599"
          />

          <MetricPod
            icon={Compass}
            label="Heading"
            value={`${frame.heading_deg?.toFixed(0).padStart(3, '0') || '000'}°`}
            accentColor="text-indigo-300"
            iconBg="bg-indigo-950/80 text-indigo-300"
            customFooter={<MiniCompassRose heading={frame.heading_deg || 0} />}
          />

          <MetricPod
            icon={Zap}
            label="Power"
            value={powerWatts}
            unit="W"
            accentColor="text-amber-bright"
            iconBg="bg-amber-950/80 text-amber-bright"
            subLeft={`${current.toFixed(1)}A`}
            subRight={`${voltage.toFixed(1)}V`}
            dataKey="power_w"
            sparkColor="#fbbf24"
          />
        </div>
      )}
    </div>
  )
}
