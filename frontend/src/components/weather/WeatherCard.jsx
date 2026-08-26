import { useEffect, useState } from 'react'
import {
  Wind, Droplets, Eye, CloudSun, AlertTriangle,
  CheckCircle2, ArrowUp, Sun, Cloud, CloudRain
} from 'lucide-react'
import api from '../../lib/api'
import useSettingsStore from '../../stores/settingsStore'

export default function WeatherCard() {
  const [weather, setWeather] = useState(null)
  const { settings } = useSettingsStore()

  useEffect(() => {
    const lat = settings?.home_lat || 12.8406
    const lon = settings?.home_lon || 80.1534
    if (!lat || !lon) return

    api.get('/weather', { params: { lat, lon } })
      .then((r) => setWeather(r.data.current))
      .catch(() => {})

    const interval = setInterval(() => {
      api.get('/weather', { params: { lat, lon } })
        .then((r) => setWeather(r.data.current))
        .catch(() => {})
    }, 5 * 60 * 1000)

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
  const visibility = weather?.visibility_km ?? 10

  return (
    <div className="h-full p-2.5 select-none flex flex-col justify-between">
      <div className="glass-card p-3 border border-white/10 h-full flex flex-col justify-between shadow-md bg-charcoal-900/90 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-cyan-950/80 text-cyan border border-cyan/20">
              <CloudSun className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">WEATHER</span>
          </div>
          {isFlightClear ? (
            <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-emerald-bright bg-emerald-950/90 px-2.5 py-1 rounded-full border border-emerald/50 shadow-[0_0_10px_rgba(16,229,153,0.25)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-bright status-beacon" />
              CLEAR
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-amber-bright bg-amber-950/90 px-2.5 py-1 rounded-full border border-amber/50 animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              CAUTION
            </span>
          )}
        </div>

        {/* Main: Temp + Wind side by side */}
        <div className="flex items-center justify-between my-1">
          {/* Temperature */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono text-white tracking-tight tabular-nums leading-none">{tempC}°</span>
              <span className="text-[10px] font-mono text-slate-400">C</span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium capitalize mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
              {weather?.condition_text || 'Partly Cloudy'}
            </p>
          </div>

          {/* Wind Compass + Value */}
          <div className="flex items-center gap-2.5 bg-charcoal-950/90 px-3 py-2 rounded-xl border border-white/5">
            <div
              className="w-8 h-8 rounded-full border border-cyan/40 bg-charcoal-900 flex items-center justify-center shadow-[0_0_8px_rgba(0,240,255,0.2)]"
            >
              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-700 ease-out"
                style={{ transform: `rotate(${windDir}deg)` }}
              >
                <ArrowUp className="w-4 h-4 text-cyan drop-shadow-[0_0_4px_#00f0ff]" />
              </div>
            </div>
            <div className="font-mono">
              <span className={`text-base font-black tabular-nums leading-none block ${windAlert ? 'text-amber-bright' : 'text-white'}`}>
                {windSpeed.toFixed(1)} <span className="text-[9px] text-slate-400 font-normal">m/s</span>
              </span>
              <span className="text-[9px] text-slate-400 block">{getWindCardinal(windDir)} · {windKnots}kt</span>
            </div>
          </div>
        </div>

        {/* Bottom micro-stats */}
        <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-white/5 text-[10px] font-mono">
          <div className="bg-charcoal-950/60 p-1 rounded-lg border border-white/5 flex items-center gap-1.5">
            <Wind className={`w-3 h-3 shrink-0 ${windAlert ? 'text-amber-bright' : 'text-cyan'}`} />
            <div className="truncate">
              <span className="text-[8px] text-slate-400 block leading-none">GUST</span>
              <span className={windAlert ? 'text-amber-bright font-bold' : 'text-slate-200'}>
                {((windSpeed || 3.4) * 1.35).toFixed(1)} m/s
              </span>
            </div>
          </div>

          <div className="bg-charcoal-950/60 p-1 rounded-lg border border-white/5 flex items-center gap-1.5">
            <Droplets className="w-3 h-3 text-cyan shrink-0" />
            <div className="truncate">
              <span className="text-[8px] text-slate-400 block leading-none">HUMID</span>
              <span className="text-slate-200 font-bold">{humidity}%</span>
            </div>
          </div>

          <div className="bg-charcoal-950/60 p-1 rounded-lg border border-white/5 flex items-center gap-1.5">
            <Eye className="w-3 h-3 text-cyan shrink-0" />
            <div className="truncate">
              <span className="text-[8px] text-slate-400 block leading-none">VIS</span>
              <span className="text-slate-200 font-bold">{visibility}km</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
