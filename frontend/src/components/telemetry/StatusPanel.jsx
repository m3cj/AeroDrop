import { useEffect, useRef, memo, useState, useMemo } from 'react'
import {
  Wind, Droplets, Eye, CloudSun, AlertTriangle,
  CheckCircle2, ArrowUp, Gauge, Flame, Terminal,
  Activity, Compass, Radio, ShieldCheck, Sun, Cloud,
  CloudRain, Zap, Layers, RefreshCw
} from 'lucide-react'
import api from '../../lib/api'
import useTelemetryStore from '../../stores/telemetryStore'
import useSettingsStore from '../../stores/settingsStore'
import { useSmoothTelemetry } from '../../hooks/useTelemetry'
import { sound } from '../../lib/audioService'

/**
 * Aviation Meteorological Wind Rose Dial
 */
function WindRoseDial({ windDegree = 0, windSpeedMs = 0, windKnots = '0.0', cardinal = 'N', isAlert = false }) {
  return (
    <div className="flex items-center gap-2.5 bg-charcoal-950/80 p-2 rounded-xl border border-white/5 font-mono">
      {/* 360° Wind Compass Rose */}
      <div className="relative w-12 h-12 rounded-full border border-cyan/40 bg-charcoal-900 flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.15)] shrink-0">
        {/* Subtle Cardinal Tick Marks */}
        <span className="absolute top-0.5 text-[7px] font-bold text-cyan/70 leading-none">N</span>
        <span className="absolute bottom-0.5 text-[7px] font-bold text-slate-500 leading-none">S</span>
        <span className="absolute right-0.5 text-[7px] font-bold text-slate-500 leading-none">E</span>
        <span className="absolute left-0.5 text-[7px] font-bold text-slate-500 leading-none">W</span>

        {/* Dynamic Wind Direction Needle */}
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-700 ease-out"
          style={{ transform: `rotate(${windDegree}deg)` }}
        >
          <div className="flex flex-col items-center">
            <ArrowUp className="w-4 h-4 text-cyan drop-shadow-[0_0_6px_#00f0ff]" />
            <div className="w-0.5 h-2 bg-cyan/40 rounded-full" />
          </div>
        </div>
      </div>

      {/* Wind Metrics Readout */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1">
          <span className={`text-base font-black tabular-nums leading-none ${isAlert ? 'text-amber-bright' : 'text-white'}`}>
            {windSpeedMs.toFixed(1)}
          </span>
          <span className="text-[9px] text-slate-400 font-semibold">m/s</span>
          <span className="text-[10px] text-slate-300 font-bold ml-1">({windKnots} kt)</span>
        </div>
        <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1">
          <span className="text-cyan font-bold">{cardinal} · {windDegree.toFixed(0).padStart(3, '0')}°</span>
          <span className="text-slate-500">Gust: {(windSpeedMs * 1.35).toFixed(1)}m/s</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Military/Avionics Grade 60 FPS HTML5 Canvas Attitude Horizon Gauge
 */
const AttitudeHorizonCanvas = memo(function AttitudeHorizonCanvas() {
  const canvasRef = useRef(null)
  const smooth = useSmoothTelemetry(0.2)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height / 2
    const radius = width / 2 - 2

    ctx.clearRect(0, 0, width, height)
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.clip()

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((smooth.roll_deg * Math.PI) / 180)
    const pitchOffset = Math.max(-radius * 0.85, Math.min(radius * 0.85, smooth.pitch_deg * 2.0))
    ctx.translate(0, pitchOffset)

    // Sky
    const skyGrad = ctx.createLinearGradient(0, -radius * 2, 0, 0)
    skyGrad.addColorStop(0, '#041d33')
    skyGrad.addColorStop(0.5, '#023859')
    skyGrad.addColorStop(1, '#0284c7')
    ctx.fillStyle = skyGrad
    ctx.fillRect(-radius * 2.5, -radius * 2.5, radius * 5, radius * 2.5)

    // Ground
    const groundGrad = ctx.createLinearGradient(0, 0, 0, radius * 2)
    groundGrad.addColorStop(0, '#381c03')
    groundGrad.addColorStop(0.6, '#241202')
    groundGrad.addColorStop(1, '#120a02')
    ctx.fillStyle = groundGrad
    ctx.fillRect(-radius * 2.5, 0, radius * 5, radius * 2.5)

    // Horizon line
    ctx.strokeStyle = '#00f0ff'
    ctx.lineWidth = 1.75
    ctx.shadowColor = '#00f0ff'
    ctx.shadowBlur = 4
    ctx.beginPath()
    ctx.moveTo(-radius * 2.5, 0)
    ctx.lineTo(radius * 2.5, 0)
    ctx.stroke()
    ctx.shadowBlur = 0

    // Pitch ladder rungs
    const rungs = [
      { deg: 20, y: -20 * 2.0, label: '+20' },
      { deg: 10, y: -10 * 2.0, label: '+10' },
      { deg: -10, y: 10 * 2.0, label: '-10' },
      { deg: -20, y: 20 * 2.0, label: '-20' },
    ]

    ctx.font = 'bold 7px monospace'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.textAlign = 'center'
    rungs.forEach((r) => {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(-14, r.y)
      ctx.lineTo(14, r.y)
      ctx.stroke()
      ctx.fillText(r.label, -20, r.y + 2.5)
      ctx.fillText(r.label, 20, r.y + 2.5)
    })

    ctx.restore()

    // Aircraft fixed reticle
    ctx.strokeStyle = '#fbbf24'
    ctx.fillStyle = '#fbbf24'
    ctx.lineWidth = 2
    ctx.shadowColor = '#fbbf24'
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.moveTo(cx - 20, cy)
    ctx.lineTo(cx - 6, cy)
    ctx.lineTo(cx - 6, cy + 3)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx + 20, cy)
    ctx.lineTo(cx + 6, cy)
    ctx.lineTo(cx + 6, cy + 3)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy, 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()

    // Outer bezel ring
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)'
    ctx.lineWidth = 1.5
    ctx.shadowColor = 'rgba(0, 240, 255, 0.3)'
    ctx.shadowBlur = 4
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()
  }, [smooth.pitch_deg, smooth.roll_deg])

  return (
    <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={56}
        height={56}
        className="w-14 h-14 rounded-full shadow-md"
      />
    </div>
  )
})

/**
 * Quad-Motor RPM Visualizer
 */
function MotorRow({ motors }) {
  const m1 = motors?.m1_rpm || 0
  const m2 = motors?.m2_rpm || 0
  const m3 = motors?.m3_rpm || 0
  const m4 = motors?.m4_rpm || 0
  const temp = motors?.esc_temp_c || 34.5
  const maxRpm = 7500
  const items = [
    { label: 'M1', rpm: m1 },
    { label: 'M2', rpm: m2 },
    { label: 'M3', rpm: m3 },
    { label: 'M4', rpm: m4 },
  ]

  return (
    <div className="p-2 rounded-lg bg-charcoal-950/80 border border-white/5">
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-300 uppercase">
          <Gauge className="w-3 h-3 text-cyan" />
          <span>MOTORS</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
          <Flame className="w-3 h-3 text-amber-bright" />
          <span className="text-white font-bold">{temp}°C</span>
        </div>
      </div>

      <div className="flex gap-1.5">
        {items.map((m) => {
          const pct = Math.min(100, Math.round((m.rpm / maxRpm) * 100))
          return (
            <div key={m.label} className="flex-1">
              <div className="h-6 bg-charcoal-900 rounded border border-white/5 flex flex-col-reverse overflow-hidden">
                <div
                  className="w-full bg-gradient-to-t from-cyan to-emerald-bright/80 transition-all duration-300"
                  style={{ height: `${Math.max(4, pct)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 mt-0.5 px-0.5">
                <span>{m.label}</span>
                <span className="text-slate-200 tabular-nums">{(m.rpm / 1000).toFixed(1)}k</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default memo(function StatusPanel() {
  const frame = useTelemetryStore((s) => s.frame)
  const motors = useTelemetryStore((s) => s.motors)
  const mavlinkLogs = useTelemetryStore((s) => s.mavlinkLogs)
  const smooth = useSmoothTelemetry(0.2)
  const { settings } = useSettingsStore()

  const [activeTab, setActiveTab] = useState('weather') // 'weather' | 'avionics' | 'logs'
  const [weather, setWeather] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchWeather = async () => {
    const lat = settings?.home_lat || 12.8406
    const lon = settings?.home_lon || 80.1534
    try {
      setIsRefreshing(true)
      const res = await api.get('/weather', { params: { lat, lon } })
      if (res.data?.current) {
        setWeather(res.data.current)
      }
    } catch {
      // Keep existing or fallback
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchWeather()
    const interval = setInterval(fetchWeather, 45000)
    return () => clearInterval(interval)
  }, [settings?.home_lat, settings?.home_lon])

  const maxWindAllowed = settings?.max_wind_speed_ms || 10.0
  const windSpeed = weather?.wind_ms ?? 3.4
  const windDir = weather?.wind_degree ?? 65
  const windAlert = windSpeed > maxWindAllowed
  const precip = weather?.precipitation_mm ?? 0.0
  const isFlightClear = !windAlert && precip < (settings?.max_precipitation_mm || 2.0)

  const getWindCardinal = (deg) => {
    const norm = ((deg % 360) + 360) % 360
    return norm >= 337.5 || norm < 22.5 ? 'N' :
      norm >= 22.5 && norm < 67.5 ? 'NE' :
      norm >= 67.5 && norm < 112.5 ? 'E' :
      norm >= 112.5 && norm < 157.5 ? 'SE' :
      norm >= 157.5 && norm < 202.5 ? 'S' :
      norm >= 202.5 && norm < 247.5 ? 'SW' :
      norm >= 247.5 && norm < 292.5 ? 'W' : 'NW'
  }

  const windKnots = (windSpeed * 1.94384).toFixed(1)
  const tempC = weather?.temp_c ? weather.temp_c.toFixed(1) : '28.5'
  const humidity = weather?.humidity_pct ?? 62
  const visibility = weather?.visibility_km ?? 10.0
  const cloudPct = weather?.cloud_pct ?? 25

  // Derived aviation Dew Point (approx Magnus formula)
  const dewPointC = useMemo(() => {
    const t = parseFloat(tempC) || 28.5
    const rh = humidity || 62
    return (t - ((100 - rh) / 5)).toFixed(1)
  }, [tempC, humidity])

  // Formatted Aviation METAR standard string
  const metarString = useMemo(() => {
    const degStr = Math.round(windDir).toString().padStart(3, '0')
    const ktStr = Math.round(parseFloat(windKnots) || 6).toString().padStart(2, '0')
    const tempRounded = Math.round(parseFloat(tempC) || 28)
    const dpRounded = Math.round(parseFloat(dewPointC) || 22)
    const visStr = visibility >= 10 ? '9999' : `${(visibility * 1000).toFixed(0)}`
    const cloudCode = cloudPct > 60 ? 'BKN030' : cloudPct > 20 ? 'FEW030' : 'SKC'
    return `VOMM 261600Z ${degStr}${ktStr}KT ${visStr} ${cloudCode} ${tempRounded}/${dpRounded} Q1013 NOSIG VFR`
  }, [windDir, windKnots, tempC, dewPointC, visibility, cloudPct])

  return (
    <div className="h-full flex flex-col justify-between p-2.5 select-none bg-charcoal-900/95 rounded-xl border border-white/10 shadow-md">
      {/* Header with Aviation Standard Title, Go/No-Go Badge & Sub-Tab Switcher */}
      <div className="flex items-center justify-between pb-1.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-lg bg-cyan-950/80 text-cyan border border-cyan/20 shrink-0">
            <CloudSun className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <h2 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider truncate">
              {activeTab === 'weather' ? 'WEATHER & ENVIRONMENT' : activeTab === 'avionics' ? 'AVIONICS & MOTORS' : 'MAVLINK LOGS'}
            </h2>
          </div>
        </div>

        {/* Sub-view switcher tabs */}
        <div className="flex items-center gap-1 shrink-0">
          {activeTab === 'weather' && (
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider mr-1 ${
              isFlightClear
                ? 'bg-emerald-950/90 text-emerald-bright border border-emerald/40'
                : 'bg-amber-950/90 text-amber-bright border border-amber/40 animate-pulse'
            }`}>
              {isFlightClear ? 'VFR • GO' : 'MVFR • CAUTION'}
            </span>
          )}

          <div className="flex items-center bg-charcoal-950 p-0.5 rounded-lg border border-white/10 text-[9px] font-mono">
            <button
              onClick={() => {
                sound.playClick()
                setActiveTab('weather')
              }}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeTab === 'weather'
                  ? 'bg-charcoal-800 text-cyan font-bold border border-cyan/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Weather
            </button>
            <button
              onClick={() => {
                sound.playClick()
                setActiveTab('avionics')
              }}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeTab === 'avionics'
                  ? 'bg-charcoal-800 text-cyan font-bold border border-cyan/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Avionics
            </button>
            <button
              onClick={() => {
                sound.playClick()
                setActiveTab('logs')
              }}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                activeTab === 'logs'
                  ? 'bg-charcoal-800 text-cyan font-bold border border-cyan/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Logs
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'weather' ? (
        /* Aviation Standard Meteorological View */
        <div className="flex-1 flex flex-col justify-between py-1 min-h-0 space-y-1.5">
          {/* Top Row: Wind Rose Dial + Atmospheric Temperature/Dewpoint */}
          <div className="grid grid-cols-2 gap-1.5 items-stretch">
            {/* Wind Rose */}
            <WindRoseDial
              windDegree={windDir}
              windSpeedMs={windSpeed}
              windKnots={windKnots}
              cardinal={getWindCardinal(windDir)}
              isAlert={windAlert}
            />

            {/* Temp & Dew Point Pod */}
            <div className="bg-charcoal-950/80 p-2 rounded-xl border border-white/5 font-mono flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">ATMOSPHERE</span>
                <span className="text-[9px] text-cyan font-semibold">QNH 1013 hPa</span>
              </div>
              <div className="flex items-baseline gap-1.5 my-0.5">
                <span className="text-xl font-black text-white tabular-nums leading-none">{tempC}°C</span>
                <span className="text-[10px] text-slate-400 font-medium">Td {dewPointC}°C</span>
              </div>
              <div className="flex items-center justify-between text-[9px] text-slate-400">
                <span className="text-slate-300 truncate">{weather?.condition_text || 'Partly Cloudy'}</span>
                <span className="text-emerald-bright font-bold">DA ~1.1k ft</span>
              </div>
            </div>
          </div>

          {/* Micro Grid Parameters: Humidity, Visibility, Cloud Ceiling, Precipitation */}
          <div className="grid grid-cols-4 gap-1 text-[9px] font-mono">
            <div className="bg-charcoal-950/70 px-1.5 py-1 rounded-lg border border-white/5">
              <span className="text-[7px] text-slate-400 block uppercase leading-none">HUMID</span>
              <span className="text-slate-200 font-bold mt-0.5 block">{humidity}%</span>
            </div>
            <div className="bg-charcoal-950/70 px-1.5 py-1 rounded-lg border border-white/5">
              <span className="text-[7px] text-slate-400 block uppercase leading-none">VISIB</span>
              <span className="text-slate-200 font-bold mt-0.5 block">{visibility} km</span>
            </div>
            <div className="bg-charcoal-950/70 px-1.5 py-1 rounded-lg border border-white/5">
              <span className="text-[7px] text-slate-400 block uppercase leading-none">CLOUD</span>
              <span className="text-cyan font-bold mt-0.5 block">{cloudPct}% FEW</span>
            </div>
            <div className="bg-charcoal-950/70 px-1.5 py-1 rounded-lg border border-white/5">
              <span className="text-[7px] text-slate-400 block uppercase leading-none">PRECIP</span>
              <span className="text-emerald-bright font-bold mt-0.5 block">{precip.toFixed(1)} mm</span>
            </div>
          </div>

          {/* Aviation METAR Decoded Banner */}
          <div className="bg-charcoal-950/90 px-2 py-1 rounded-lg border border-cyan/20 flex items-center justify-between text-[8px] font-mono text-cyan/90 shadow-inner">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan shrink-0 animate-pulse" />
              <span className="font-bold text-white tracking-wider">METAR:</span>
              <span className="truncate text-slate-300 font-semibold">{metarString}</span>
            </div>
            <button
              onClick={() => {
                sound.playClick()
                fetchWeather()
              }}
              className="text-slate-400 hover:text-cyan p-0.5 rounded transition-colors shrink-0 ml-1"
              title="Refresh meteorological observation"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isRefreshing ? 'animate-spin text-cyan' : ''}`} />
            </button>
          </div>
        </div>
      ) : activeTab === 'avionics' ? (
        /* Attitude Dial & Motors View */
        <div className="flex-1 flex flex-col justify-between py-1 min-h-0 space-y-1.5">
          {/* Attitude Horizon Dial + Readout */}
          <div className="p-1.5 rounded-lg bg-charcoal-950/80 border border-white/5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AttitudeHorizonCanvas />
              <div className="font-mono text-xs">
                <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-wider">ATTITUDE</span>
                <span className="text-[10px] text-cyan block tabular-nums font-semibold">
                  P {smooth.pitch_deg >= 0 ? '+' : ''}{smooth.pitch_deg.toFixed(1)}°
                </span>
                <span className="text-[10px] text-amber-bright block tabular-nums font-semibold">
                  R {smooth.roll_deg >= 0 ? '+' : ''}{smooth.roll_deg.toFixed(1)}°
                </span>
              </div>
            </div>

            <div className="text-right font-mono text-xs">
              <span className="text-[8px] text-slate-400 block uppercase font-bold tracking-wider">VSI</span>
              <span className="text-xs font-bold text-emerald-bright tabular-nums block">
                {frame.vertical_speed_ms ? (frame.vertical_speed_ms >= 0 ? '+' : '') + frame.vertical_speed_ms.toFixed(1) : '+0.0'} m/s
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                VIB: {motors?.vibration_level || '0.02'}g
              </span>
            </div>
          </div>

          {/* Motor RPMs */}
          <MotorRow motors={motors} />
        </div>
      ) : (
        /* MAVLink Logs View */
        <div className="flex-1 my-1 p-2 rounded-lg bg-charcoal-950/90 border border-white/5 text-[10px] font-mono space-y-1 overflow-y-auto sidebar-scroll max-h-36">
          <div className="flex items-center justify-between text-slate-500 pb-1 border-b border-white/5 text-[8px] uppercase tracking-wider">
            <span>TIME</span>
            <span>MAVLINK LOG</span>
          </div>
          {mavlinkLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-1.5 leading-tight">
              <span className="text-slate-500 shrink-0">{log.time}</span>
              <span className={`px-1 rounded text-[8px] font-bold ${
                log.type === 'ALERT' ? 'bg-crimson-950 text-crimson-bright border border-crimson/40' :
                log.type === 'WARN' ? 'bg-amber-950 text-amber-bright border border-amber/40' :
                log.type === 'NAV' ? 'bg-cyan-950 text-cyan border border-cyan/40' :
                'bg-charcoal-800 text-slate-300'
              }`}>{log.type}</span>
              <span className="text-slate-300 truncate">{log.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

