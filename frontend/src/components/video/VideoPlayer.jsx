import { useEffect, useRef, useState, useCallback, memo } from 'react'
import Hls from 'hls.js'
import {
  ZoomIn, ZoomOut, Camera, Video, Maximize2, Minimize2,
  Square, Crosshair, Film, Flame, Moon, Scan, Eye,
  Battery, Navigation, Compass, MapPin
} from 'lucide-react'
import useSettingsStore from '../../stores/settingsStore'
import useTelemetryStore from '../../stores/telemetryStore'
import { useToast } from '../common/Toast'
import { formatCoords, msToKmh, batteryColor } from '../../lib/formatters'
import { sound } from '../../lib/audioService'

export default function VideoPlayer() {
  const videoRef = useRef(null)
  const dummyVideoRef = useRef(null)
  const hlsRef = useRef(null)
  const containerRef = useRef(null)

  const [hasLiveError, setHasLiveError] = useState(true)
  const [streamMode, setStreamMode] = useState('dummy') // 'live' | 'dummy'
  const [filterMode, setFilterMode] = useState('standard') // 'standard' | 'thermal' | 'nightvision' | 'ai_tracking'
  const [zoom, setZoom] = useState(1)
  const [isRecording, setIsRecording] = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [crosshairVisible, setCrosshairVisible] = useState(true)

  const { settings } = useSettingsStore()
  const frame = useTelemetryStore((s) => s.frame)
  const toast = useToast()

  const hlsUrl = settings?.jetsan_hls_url || 'http://localhost:8554/stream.m3u8'

  // Attempt live HLS stream when in 'live' mode
  useEffect(() => {
    if (streamMode !== 'live') {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      return
    }

    const video = videoRef.current
    if (!video) return

    setHasLiveError(false)

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 5,
      })
      hlsRef.current = hls
      hls.loadSource(hlsUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setHasLiveError(false)
        video.play().catch(() => {})
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setHasLiveError(true)
        }
      })

      return () => {
        hls.destroy()
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl
      video.play().catch(() => {})
    } else {
      setHasLiveError(true)
    }
  }, [hlsUrl, streamMode])

  // Timer for recording counter
  useEffect(() => {
    if (!isRecording) return
    const interval = setInterval(() => setRecSeconds((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [isRecording])

  // Snapshot Capture Handler
  const handleCapture = useCallback(() => {
    sound.playClick()
    const activeVideo = streamMode === 'live' && !hasLiveError ? videoRef.current : dummyVideoRef.current
    if (!activeVideo) return

    try {
      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = activeVideo.videoWidth || 1280
      exportCanvas.height = activeVideo.videoHeight || 720
      const ctx = exportCanvas.getContext('2d')

      if (filterMode === 'nightvision') {
        ctx.filter = 'brightness(1.2) contrast(1.4) sepia(1) hue-rotate(85deg) saturate(2)'
      } else if (filterMode === 'thermal') {
        ctx.filter = 'contrast(2) invert(1) hue-rotate(180deg) saturate(3)'
      }

      ctx.drawImage(activeVideo, 0, 0, exportCanvas.width, exportCanvas.height)
      ctx.filter = 'none'

      // Burn in HUD telemetry watermark bar
      ctx.fillStyle = 'rgba(8, 10, 15, 0.9)'
      ctx.fillRect(0, exportCanvas.height - 50, exportCanvas.width, 50)
      ctx.fillStyle = '#00f0ff'
      ctx.font = 'bold 16px monospace'
      ctx.fillText(
        `AERODROP-01 • ${new Date().toISOString()} • HDG ${(frame.heading_deg || 0).toFixed(0)}° • ALT ${(frame.alt_m || 0).toFixed(1)}m • SPD ${msToKmh(frame.speed_ms)} km/h • MODE ${frame.flight_mode}`,
        24,
        exportCanvas.height - 18
      )

      const link = document.createElement('a')
      link.download = `aerodrop_optics_${Date.now()}.png`
      link.href = exportCanvas.toDataURL('image/png')
      link.click()
      toast.success('Optical Frame Captured', 'Snapshot saved with telemetry watermark')
    } catch {
      toast.error('Capture Failed', 'Browser hardware security prevented frame capture')
    }
  }, [streamMode, hasLiveError, filterMode, frame, toast])

  // Recording Toggle
  const handleToggleRecord = useCallback(() => {
    sound.playClick()
    if (!isRecording) {
      setRecSeconds(0)
      setIsRecording(true)
      sound.playAlert(false)
      toast.info('Optical Recording Active', 'Recording HUD stream')
    } else {
      setIsRecording(false)
      toast.success('Recording Completed', `Saved ${recSeconds}s optical footage`)
    }
  }, [isRecording, recSeconds, toast])

  // Fullscreen Handler
  const handleToggleFullscreen = () => {
    sound.playClick()
    if (!containerRef.current) return
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
      setIsFullscreen(false)
    }
  }

  const formatRecTime = (s) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const isPlayingDummy = streamMode === 'dummy' || (streamMode === 'live' && hasLiveError)

  const filterStyle = {
    standard: '',
    thermal: 'brightness(1.1) contrast(1.8) invert(1) hue-rotate(180deg) saturate(2.5)',
    nightvision: 'brightness(1.2) contrast(1.4) sepia(1) hue-rotate(85deg) saturate(2)',
    ai_tracking: 'contrast(1.1)',
  }[filterMode]

  const pct = Math.max(0, Math.min(100, frame.battery_pct || 98))
  const volt = frame.battery_voltage_v || 24.8
  const curr = frame.battery_current_a || 0.8
  const battColor = pct > 50 ? 'text-emerald-bright' : pct > 25 ? 'text-amber-bright' : 'text-crimson-bright'

  return (
    <div className="h-full w-full flex flex-col justify-between select-none bg-charcoal-950 rounded-xl overflow-hidden border border-white/10 shadow-lg">
      {/* Video Viewport Area with HUD Overlays */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-0 bg-black flex flex-col justify-between overflow-hidden group"
      >
        {/* Video Content Layer */}
        <div className="absolute inset-0 overflow-hidden flex items-center justify-center bg-black">
          {isPlayingDummy ? (
            <video
              ref={dummyVideoRef}
              src="/camera-dummy.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover transition-transform duration-300 origin-center"
              style={{
                transform: `scale(${zoom})`,
                filter: filterStyle,
              }}
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover transition-transform duration-300 origin-center"
              style={{
                transform: `scale(${zoom})`,
                filter: filterStyle,
              }}
            />
          )}
        </div>

        {/* Optical Vignette Effect */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.65)_100%)]"></div>

        {/* AI Object Tracking Bounding Box Simulation */}
        {filterMode === 'ai_tracking' && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute top-[32%] left-[28%] w-[42%] h-[36%] border-2 border-emerald-bright/80 bg-emerald-bright/5 rounded-lg flex flex-col justify-between p-1.5 shadow-[0_0_14px_rgba(16,229,153,0.4)] animate-pulse">
              <div className="flex items-center justify-between text-[9px] font-mono font-bold text-emerald-bright bg-charcoal-950/90 px-1 rounded w-max">
                <span>TARGET: DROP ZONE [CONF 99.2%]</span>
              </div>
              <div className="flex justify-between items-end text-[8px] font-mono text-emerald-bright">
                <span>DIST: 42m</span>
                <span>TERRAIN: CLEAR</span>
              </div>
            </div>
          </div>
        )}

        {/* Center Tactical Crosshair Reticle */}
        {crosshairVisible && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border border-cyan/50 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-ping"></div>
              </div>
              <div className="absolute w-full h-[1px] bg-cyan/40"></div>
              <div className="absolute h-full w-[1px] bg-cyan/40"></div>
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan/70"></div>
              <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan/70"></div>
              <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan/70"></div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan/70"></div>
            </div>
          </div>
        )}

        {/* Top HUD Bar */}
        <div className="relative z-20 p-2.5 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent">
          {/* Left: Feed Status Badge & Mode */}
          <div className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
              !isPlayingDummy
                ? 'bg-emerald-950/80 text-emerald-bright border-emerald/50'
                : 'bg-cyan-950/80 text-cyan border-cyan/50'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${!isPlayingDummy ? 'bg-emerald-bright animate-ping' : 'bg-cyan'}`}></span>
              <span>{!isPlayingDummy ? 'LIVE GIMBAL' : 'OPTICAL HUD'}</span>
            </div>

            <span className="text-[10px] font-mono text-cyan font-bold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan/30">
              4K 60FPS
            </span>

            {filterMode !== 'standard' && (
              <span className="text-[10px] font-mono text-purple-300 font-bold bg-purple-950/70 px-1.5 py-0.5 rounded border border-purple-500/40 uppercase">
                {filterMode.replace('_', ' ')}
              </span>
            )}

            {zoom > 1 && (
              <span className="text-[10px] font-mono text-amber-bright bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber/40">
                {zoom}x
              </span>
            )}
          </div>

          {/* Right: NEW HUD Battery Overlay on Feed Box (from wireframe) + Recording status */}
          <div className="flex items-center gap-2">
            {isRecording && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-crimson-950/90 border border-crimson/60 text-[10px] font-mono text-crimson-bright animate-pulse">
                <span className="w-2 h-2 rounded-full bg-crimson-bright"></span>
                <span>REC {formatRecTime(recSeconds)}</span>
              </div>
            )}

            {/* Compact Battery Readout Overlay on the Feed Box */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-charcoal-950/85 backdrop-blur-md border border-white/10 font-mono text-xs shadow-md"
              title={`Battery State: ${pct.toFixed(0)}% (${volt.toFixed(1)}V, ${curr.toFixed(1)}A)`}
            >
              <Battery className={`w-3.5 h-3.5 ${battColor}`} />
              <span className={`font-bold tabular-nums ${battColor}`}>{pct.toFixed(0)}%</span>
              <span className="text-slate-500 text-[10px]">|</span>
              <span className="text-slate-200 text-[11px] tabular-nums font-semibold">{volt.toFixed(1)}V</span>
              <span className="text-slate-500 text-[10px]">|</span>
              <span className="text-amber-bright text-[11px] tabular-nums">{curr.toFixed(1)}A</span>
            </div>

            {/* Stream Switch (Live vs Dummy) */}
            <button
              onClick={() => {
                sound.playClick()
                setStreamMode(streamMode === 'live' ? 'dummy' : 'live')
              }}
              className="p-1 px-1.5 rounded bg-black/70 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[10px] font-mono transition-all flex items-center gap-1"
              title="Toggle Live Stream / Dummy Video"
            >
              <Film className="w-3 h-3 text-cyan" />
              <span>{streamMode === 'live' ? 'Dummy' : 'Live'}</span>
            </button>
          </div>
        </div>

        {/* Bottom HUD Quick Camera Controls Toolbar */}
        <div className="relative z-20 p-2 flex items-center justify-end bg-gradient-to-t from-black/85 via-black/40 to-transparent">
          <div className="flex items-center gap-1 bg-charcoal-900/90 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg">
            {/* Filter Mode Selector */}
            <button
              onClick={() => {
                sound.playClick()
                const modes = ['standard', 'thermal', 'nightvision', 'ai_tracking']
                const next = modes[(modes.indexOf(filterMode) + 1) % modes.length]
                setFilterMode(next)
              }}
              className={`p-1 rounded transition-colors ${
                filterMode !== 'standard' ? 'bg-purple-500/30 text-purple-300' : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
              title={`Active Filter: ${filterMode}`}
            >
              {filterMode === 'thermal' ? <Flame className="w-3.5 h-3.5 text-amber-bright" /> :
               filterMode === 'nightvision' ? <Moon className="w-3.5 h-3.5 text-emerald-bright" /> :
               filterMode === 'ai_tracking' ? <Scan className="w-3.5 h-3.5 text-cyan" /> :
               <Eye className="w-3.5 h-3.5" />}
            </button>

            {/* Zoom controls */}
            <button
              onClick={() => {
                sound.playClick()
                setZoom((z) => Math.max(1, z - 0.5))
              }}
              disabled={zoom <= 1}
              className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                sound.playClick()
                setZoom((z) => Math.min(3, z + 0.5))
              }}
              disabled={zoom >= 3}
              className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* Toggle Reticle */}
            <button
              onClick={() => {
                sound.playClick()
                setCrosshairVisible((v) => !v)
              }}
              className={`p-1 rounded transition-colors ${
                crosshairVisible ? 'bg-cyan-950 text-cyan' : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
              title="Toggle Reticle"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>

            {/* Snapshot Photo */}
            <button
              onClick={handleCapture}
              className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-emerald-bright transition-colors"
              title="Capture Snapshot"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            {/* Record Video */}
            <button
              onClick={handleToggleRecord}
              className={`p-1 rounded transition-colors ${
                isRecording ? 'bg-crimson/30 text-crimson-bright' : 'text-slate-300 hover:bg-white/10 hover:text-crimson-bright'
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Video className="w-3.5 h-3.5" />}
            </button>

            {/* Fullscreen */}
            <button
              onClick={handleToggleFullscreen}
              className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* NEW: Compact HDG / ALT / Coordinates Row Directly Underneath Live Feed (from wireframe) */}
      <div className="px-3.5 py-2 bg-charcoal-900/95 border-t border-white/10 flex items-center justify-between font-mono text-xs shrink-0">
        {/* Line 1: HDG | ALT | SPD */}
        <div className="flex items-center gap-2 text-[11px]">
          <div className="flex items-center gap-1 text-cyan font-bold">
            <Compass className="w-3.5 h-3.5" />
            <span>HDG {(frame.heading_deg || 0).toFixed(0)}°</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-emerald-bright font-bold">
            <Navigation className="w-3.5 h-3.5" />
            <span>ALT {(frame.alt_m || 0).toFixed(1)}m</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="text-slate-200 font-semibold">
            {msToKmh(frame.speed_ms)} km/h
          </div>
        </div>

        {/* Line 2: Coordinates */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
          <MapPin className="w-3 h-3 text-crimson-bright shrink-0" />
          <span className="font-semibold tabular-nums">
            {frame.lat && frame.lat !== 0 ? formatCoords(frame.lat, frame.lon) : '12.8406° N, 80.1534° E'}
          </span>
        </div>
      </div>
    </div>
  )
}
