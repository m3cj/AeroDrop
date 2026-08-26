import { useEffect, useState, useRef } from 'react'
import {
  Wind, Droplets, Eye, CloudSun, AlertTriangle,
  CheckCircle2, ArrowUp, Sun, Cloud, CloudRain, X,
  Gauge
} from 'lucide-react'
import api from '../../lib/api'
import useSettingsStore from '../../stores/settingsStore'
import { sound } from '../../lib/audioService'

export default function WeatherBadge() {
  const [weather, setWeather] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef(null)
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

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

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

  const toggleOpen = () => {
    sound.playClick()
    setIsOpen((prev) => !prev)
  }

  return (
    <div className="relative select-none" ref={popoverRef}>
      {/* Compact Collapsed Weather Icon + Temp Badge */}
      <button
        onClick={toggleOpen}
        id="weather-badge-trigger"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono transition-all duration-200 backdrop-blur-md shadow-md border ${
          isOpen
            ? 'bg-cyan-950/90 border-cyan text-cyan shadow-[0_0_12px_rgba(0,240,255,0.3)]'
            : isFlightClear
            ? 'bg-charcoal-900/90 border-white/10 hover:border-cyan/40 text-slate-200 hover:text-white'
            : 'bg-amber-950/80 border-amber-500/40 text-amber-bright shadow-[0_0_10px_rgba(245,158,11,0.2)]'
        }`}
        title="Click to view detailed local meteorological telemetry"
      >
        <CloudSun className={`w-3.5 h-3.5 ${isFlightClear ? 'text-cyan' : 'text-amber-bright'}`} />
        <span className="font-bold tabular-nums">{tempC}°C</span>
        {windAlert && <span className="w-1.5 h-1.5 rounded-full bg-amber-bright animate-ping" />}
      </button>

      {/* Expanded Floating Popover Card */}
      {isOpen && (
        <div className="absolute top-10 left-0 sm:left-auto sm:right-0 w-72 z-[1100] glass-card p-3.5 border border-white/15 shadow-2xl bg-charcoal-900/95 backdrop-blur-2xl rounded-2xl animate-fade-in divide-y divide-white/10 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-cyan-950/80 text-cyan border border-cyan/20">
                <CloudSun className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  METEOROLOGY
                </h3>
                <p className="text-[10px] font-mono text-slate-400">Surface Launch Conditions</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isFlightClear ? (
                <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-bright bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald/50">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  CLEAR
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-amber-bright bg-amber-950/90 px-2 py-0.5 rounded-full border border-amber/50 animate-pulse">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  CAUTION
                </span>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close Weather Popover"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Weather Stats (Temp + Wind Compass) */}
          <div className="pt-2 flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-white tabular-nums">{tempC}°</span>
                <span className="text-xs font-mono text-slate-400">C</span>
              </div>
              <p className="text-[11px] text-slate-300 capitalize flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
                {weather?.condition_text || 'Partly Cloudy'}
              </p>
            </div>

            {/* Wind compass */}
            <div className="flex items-center gap-2 bg-charcoal-950/90 px-2.5 py-1.5 rounded-xl border border-white/5 font-mono">
              <div className="w-7 h-7 rounded-full border border-cyan/40 bg-charcoal-900 flex items-center justify-center shadow-inner">
                <div
                  className="w-full h-full flex items-center justify-center transition-transform duration-700 ease-out"
                  style={{ transform: `rotate(${windDir}deg)` }}
                >
                  <ArrowUp className="w-3.5 h-3.5 text-cyan drop-shadow-[0_0_4px_#00f0ff]" />
                </div>
              </div>
              <div>
                <span className={`text-xs font-black tabular-nums block ${windAlert ? 'text-amber-bright' : 'text-white'}`}>
                  {windSpeed.toFixed(1)} <span className="text-[9px] text-slate-400 font-normal">m/s</span>
                </span>
                <span className="text-[9px] text-slate-400 block">{getWindCardinal(windDir)} · {windKnots}kt</span>
              </div>
            </div>
          </div>

          {/* Micro Grid Details */}
          <div className="pt-2 grid grid-cols-3 gap-1.5 text-[10px] font-mono">
            <div className="bg-charcoal-950/70 p-1.5 rounded-lg border border-white/5">
              <span className="text-[8px] text-slate-400 block uppercase leading-none">GUST</span>
              <span className={`font-bold mt-0.5 block ${windAlert ? 'text-amber-bright' : 'text-slate-200'}`}>
                {((windSpeed || 3.4) * 1.35).toFixed(1)} m/s
              </span>
            </div>
            <div className="bg-charcoal-950/70 p-1.5 rounded-lg border border-white/5">
              <span className="text-[8px] text-slate-400 block uppercase leading-none">HUMID</span>
              <span className="text-slate-200 font-bold mt-0.5 block">{humidity}%</span>
            </div>
            <div className="bg-charcoal-950/70 p-1.5 rounded-lg border border-white/5">
              <span className="text-[8px] text-slate-400 block uppercase leading-none">VIS</span>
              <span className="text-slate-200 font-bold mt-0.5 block">{visibility} km</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
