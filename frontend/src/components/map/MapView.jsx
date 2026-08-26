import { useEffect, useRef, useState, useCallback, memo } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents, useMap, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Home, Crosshair, LocateFixed, Compass, Layers, Shield,
  Navigation, Radio, Zap
} from 'lucide-react'
import useTelemetryStore from '../../stores/telemetryStore'
import useMissionStore from '../../stores/missionStore'
import useSettingsStore from '../../stores/settingsStore'
import WeatherBadge from '../weather/WeatherBadge'
import { formatCoords, msToKmh } from '../../lib/formatters'
import { sound } from '../../lib/audioService'

// Fix Leaflet default icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom Tactical Drone Icon with translucent frosted glass and directional heading needle
const createDroneIcon = () => L.divIcon({
  className: 'custom-drone-marker',
  html: `
    <div id="drone-marker-container" style="position:relative; width:60px; height:60px; display:flex; align-items:center; justify-content:center;">
      <!-- Outer Radar Ping Pulse -->
      <div style="
        position: absolute;
        inset: 0px;
        border-radius: 50%;
        border: 2px solid var(--hud-primary, #00f0ff);
        background: var(--hud-glow-soft, rgba(0, 240, 255, 0.15));
        animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        pointer-events: none;
      "></div>

      <!-- Tactical Radar Range Ring -->
      <div style="
        position: absolute;
        width: 48px;
        height: 48px;
        border: 1.5px dashed var(--hud-primary, #00f0ff);
        border-radius: 50%;
        opacity: 0.6;
        pointer-events: none;
      "></div>

      <!-- Heading Directional Arrow Pointer (Driven directly by 60FPS RAF without CSS fighting) -->
      <div id="drone-heading-pointer" style="
        position: absolute;
        width: 54px;
        height: 54px;
        transform: rotate(0deg);
        transform-origin: center;
        will-change: transform;
        pointer-events: none;
      ">
        <div style="
          position: absolute;
          top: -3px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-bottom: 11px solid var(--hud-primary, #00f0ff);
          filter: drop-shadow(0 0 8px var(--hud-primary, #00f0ff));
        "></div>
      </div>

      <!-- Rotating Drone Container -->
      <div id="drone-icon-body" style="
        width: 38px;
        height: 38px;
        transform: rotate(0deg);
        transform-origin: center;
        will-change: transform;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(12, 14, 20, 0.92);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 50%;
        padding: 4px;
        border: 1.5px solid var(--hud-primary, #00f0ff);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8), 0 0 16px var(--hud-glow-soft);
      ">
        <img
          src="/droneIcon.svg"
          alt="AeroDrop Drone"
          style="
            width: 100%;
            height: 100%;
            object-fit: contain;
            pointer-events: none;
            filter: brightness(1.3) contrast(1.2) drop-shadow(0 0 6px var(--hud-primary, #00f0ff));
          "
        />
      </div>
    </div>
  `,
  iconSize: [60, 60],
  iconAnchor: [30, 30],
})

// Tactical Home Base Icon
const createHomeIcon = (label = 'VIT CHENNAI') => L.divIcon({
  className: 'custom-home-icon',
  html: `
    <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center;">
      <div style="
        position: absolute;
        inset: 2px;
        border-radius: 50%;
        border: 2px solid rgba(16, 229, 153, 0.85);
        background: rgba(16, 229, 153, 0.15);
        box-shadow: 0 0 14px rgba(16, 229, 153, 0.6);
      "></div>
      <div style="
        width: 22px;
        height: 22px;
        background: linear-gradient(135deg, #065f46, #10b981);
        border: 2px solid #a7f3d0;
        border-radius: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 12px rgba(16, 229, 153, 0.9);
        z-index: 2;
      ">
        <span style="color:#ffffff; font-family:'JetBrains Mono', monospace; font-size:11px; font-weight:800; line-height:1;">H</span>
      </div>
      <div style="
        position: absolute;
        bottom: -16px;
        background: rgba(12, 14, 20, 0.95);
        border: 1px solid rgba(52, 211, 153, 0.7);
        color: #a7f3d0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 8px;
        font-weight: 700;
        letter-spacing: 0.5px;
        padding: 1px 5px;
        border-radius: 4px;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0,0,0,0.8);
      ">
        ${label}
      </div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
})

// Destination Waypoint Drop Icon
const destIcon = L.divIcon({
  className: 'custom-dest-icon',
  html: `
    <div style="position:relative; width:40px; height:48px; display:flex; flex-direction:column; align-items:center; justify-content:flex-start;">
      <div style="
        width: 30px;
        height: 30px;
        background: linear-gradient(135deg, rgba(255, 51, 85, 0.95), rgba(225, 29, 72, 0.95));
        border: 2px solid #fecdd3;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 0 16px rgba(255, 51, 85, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="transform: rotate(45deg); display:flex; align-items:center; justify-content:center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      </div>
      <div style="
        width: 18px;
        height: 8px;
        border: 1.5px solid rgba(255, 51, 85, 0.8);
        border-radius: 50%;
        background: rgba(255, 51, 85, 0.25);
        margin-top: 2px;
        animation: pulse 1.5s infinite;
      "></div>
    </div>
  `,
  iconSize: [40, 48],
  iconAnchor: [20, 42],
})

// Laser Crosshair for map picking
const clickDestIcon = L.divIcon({
  className: 'custom-crosshair-icon',
  html: `
    <div style="position:relative; width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
      <div style="
        position: absolute;
        inset: 0px;
        border: 2px dashed #fbbf24;
        border-radius: 50%;
        animation: spin 8s linear infinite;
        box-shadow: 0 0 14px rgba(251, 191, 36, 0.7);
      "></div>
      <div style="width: 8px; height: 8px; background: #fbbf24; border-radius: 50%; box-shadow: 0 0 8px #fbbf24;"></div>
      <div style="position:absolute; width:100%; height:1.5px; background:rgba(251,191,36,0.7);"></div>
      <div style="position:absolute; height:100%; width:1.5px; background:rgba(251,191,36,0.7);"></div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})

function MapClickHandler({ isPickingDest, onPick }) {
  useMapEvents({
    click: (e) => {
      if (isPickingDest) {
        sound.playTargetLock()
        onPick({ lat: e.latlng.lat, lon: e.latlng.lng })
      }
    },
  })
  return null
}

function MapController({ centerTarget, zoomLevel }) {
  const map = useMap()
  useEffect(() => {
    if (centerTarget && centerTarget[0] && centerTarget[1]) {
      map.flyTo(centerTarget, zoomLevel || map.getZoom(), {
        duration: 1.0,
        easeLinearity: 0.25,
      })
    }
  }, [centerTarget, zoomLevel, map])
  return null
}

const DroneMarker = memo(function DroneMarker({ defaultLat, defaultLon }) {
  const frame = useTelemetryStore((s) => s.frame)
  const markerRef = useRef(null)

  const targetLat = (frame.lat && frame.lat !== 0) ? frame.lat : defaultLat
  const targetLon = (frame.lon && frame.lon !== 0) ? frame.lon : defaultLon
  const targetHeading = frame.heading_deg || 0

  // Reference holding the target destination for continuous smooth animation
  const targetsRef = useRef({ lat: targetLat, lon: targetLon, heading: targetHeading })
  targetsRef.current = { lat: targetLat, lon: targetLon, heading: targetHeading }

  // Reference holding the live smoothly-interpolated values
  const currentRef = useRef({
    lat: targetLat,
    lon: targetLon,
    heading: targetHeading,
  })

  // 60FPS continuous RAF smoothing loop
  useEffect(() => {
    let animId
    const lerp = (start, end, factor) => start + (end - start) * factor

    const renderLoop = () => {
      const cur = currentRef.current
      const tgt = targetsRef.current

      // Smooth coordinate interpolation (smooth out 10Hz-20Hz websocket updates)
      const latDelta = Math.abs(tgt.lat - cur.lat)
      const lonDelta = Math.abs(tgt.lon - cur.lon)
      if (latDelta > 0.0000001 || lonDelta > 0.0000001) {
        cur.lat = lerp(cur.lat, tgt.lat, 0.15)
        cur.lon = lerp(cur.lon, tgt.lon, 0.15)
      } else {
        cur.lat = tgt.lat
        cur.lon = tgt.lon
      }

      // Shortest-path angle difference with angular deadband filter to prevent compass twitches
      const angleDiff = ((tgt.heading - cur.heading + 540) % 360) - 180
      if (Math.abs(angleDiff) > 0.3) {
        // Smooth exponential damping
        cur.heading = (cur.heading + angleDiff * 0.14 + 360) % 360
      } else if (Math.abs(angleDiff) > 0.02) {
        // Minor crawl to exact target
        cur.heading = (cur.heading + angleDiff * 0.25 + 360) % 360
      }

      if (markerRef.current) {
        markerRef.current.setLatLng([cur.lat, cur.lon])
        const el = markerRef.current.getElement()
        if (el) {
          const needle = el.querySelector('#drone-heading-pointer')
          const body = el.querySelector('#drone-icon-body')
          const roundedHeading = cur.heading.toFixed(1)
          if (needle) needle.style.transform = `rotate(${roundedHeading}deg)`
          if (body) body.style.transform = `rotate(${roundedHeading}deg)`
        }
      }

      animId = requestAnimationFrame(renderLoop)
    }

    animId = requestAnimationFrame(renderLoop)
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <Marker
      ref={markerRef}
      position={[targetLat, targetLon]}
      icon={createDroneIcon()}
    >
      <Popup>
        <div className="p-1 text-slate-100 font-mono min-w-44">
          <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-white/10">
            <span className="w-2 h-2 rounded-full bg-cyan animate-pulse"></span>
            <span className="text-xs font-bold text-white uppercase tracking-wider">AERODROP-01</span>
            <span className="badge bg-cyan-950 text-cyan text-[10px] ml-auto">{frame.flight_mode || 'STANDBY'}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
            <span className="text-slate-400">Position:</span>
            <span className="text-right text-white">{formatCoords(targetLat, targetLon)}</span>
            <span className="text-slate-400">Altitude:</span>
            <span className="text-right text-cyan font-semibold">{frame.alt_m?.toFixed(1) || 0} m</span>
            <span className="text-slate-400">Speed:</span>
            <span className="text-right text-emerald-bright font-semibold">{msToKmh(frame.speed_ms || 0)} km/h</span>
            <span className="text-slate-400">Heading:</span>
            <span className="text-right text-purple-300 font-semibold">{(frame.heading_deg || 0).toFixed(0)}°</span>
          </div>
        </div>
      </Popup>
    </Marker>
  )
})

export default function MapView({ isPickingDest, onDestinationPick, pickedDest }) {
  const frame = useTelemetryStore((s) => s.frame)
  const { activeMission } = useMissionStore()
  const { settings } = useSettingsStore()

  const [mapCenter, setMapCenter] = useState(null)
  const [trackDrone, setTrackDrone] = useState(false)
  const [flightTrail, setFlightTrail] = useState([])
  const [showGeofence, setShowGeofence] = useState(true)
  const [mapStyle, setMapStyle] = useState('dark') // 'dark' | 'satellite' | 'streets'

  const homeLat = settings?.home_lat || 12.8406
  const homeLon = settings?.home_lon || 80.1534
  const homeLabel = settings?.home_label || 'VIT CHENNAI'
  const maxRangeKm = settings?.max_range_km || 5.0

  const currentDroneLat = (frame.lat && frame.lat !== 0) ? frame.lat : homeLat
  const currentDroneLon = (frame.lon && frame.lon !== 0) ? frame.lon : homeLon

  const isTrackingRef = useRef(trackDrone)
  isTrackingRef.current = trackDrone

  useEffect(() => {
    if (isTrackingRef.current && frame.lat && frame.lon && frame.lat !== 0) {
      setMapCenter([frame.lat, frame.lon])
    }
  }, [frame.lat, frame.lon])

  // Track breadcrumb flight path
  useEffect(() => {
    if (!activeMission) return

    if (frame.lat && frame.lon && frame.lat !== 0) {
      setFlightTrail((prev) => {
        if (prev.length === 0) {
          return [[activeMission.source_lat, activeMission.source_lon], [frame.lat, frame.lon]]
        }
        const last = prev[prev.length - 1]
        const distMoved = Math.hypot(frame.lat - last[0], frame.lon - last[1])
        if (distMoved > 0.00005) {
          return [...prev, [frame.lat, frame.lon]]
        }
        return prev
      })
    }
  }, [activeMission, frame.lat, frame.lon])

  const handleCenterDrone = useCallback(() => {
    sound.playClick()
    setTrackDrone((prev) => !prev)
    setMapCenter([currentDroneLat, currentDroneLon])
  }, [currentDroneLat, currentDroneLon])

  const handleCenterHome = useCallback(() => {
    sound.playClick()
    setTrackDrone(false)
    setMapCenter([homeLat, homeLon])
  }, [homeLat, homeLon])

  const tileUrls = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  }

  return (
    <div className={`relative w-full h-full select-none bg-charcoal-950 rounded-xl overflow-hidden border border-white/10 shadow-lg ${isPickingDest ? 'cursor-crosshair' : ''}`}>
      {/* Target Picking Alert Banner */}
      {isPickingDest && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] glass-panel px-4 py-1.5 rounded-full text-xs font-mono text-amber-300 border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse flex items-center gap-2 bg-charcoal-900/95">
          <Crosshair className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
          <span className="font-bold tracking-wider">CLICK MAP TO DESIGNATE TARGET DROP ZONE</span>
        </div>
      )}

      {/* NEW: Collapsed Weather Icon + Temp Badge (from wireframe & reference) */}
      <div className="absolute top-3 left-3 z-[1000]">
        <WeatherBadge />
      </div>

      {/* Floating Tactical Map Controls Toolbar (Right) */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5">
        <button
          onClick={handleCenterDrone}
          className={`p-2 rounded-xl glass-panel border transition-all duration-200 shadow-md flex items-center justify-center bg-charcoal-900/90 ${
            trackDrone
              ? 'bg-cyan-950/80 border-cyan text-cyan shadow-[0_0_14px_rgba(0,240,255,0.4)]'
              : 'text-slate-300 hover:text-white hover:border-cyan/40 hover:bg-charcoal-800'
          }`}
          title={trackDrone ? 'Tracking Drone (Click to unlock)' : 'Track & Center Drone'}
          aria-label="Track Drone"
        >
          <LocateFixed className="w-4 h-4" />
        </button>

        <button
          onClick={handleCenterHome}
          className="p-2 rounded-xl glass-panel border border-white/10 text-slate-300 hover:text-emerald-bright hover:border-emerald/40 hover:bg-charcoal-800 transition-all duration-200 shadow-md flex items-center justify-center bg-charcoal-900/90"
          title="Center on Base Station (VIT Chennai)"
          aria-label="Center on Base Station"
        >
          <Home className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            sound.playClick()
            setShowGeofence((g) => !g)
          }}
          className={`p-2 rounded-xl glass-panel border transition-all duration-200 shadow-md flex items-center justify-center bg-charcoal-900/90 ${
            showGeofence
              ? 'text-cyan border-cyan/40 bg-charcoal-800'
              : 'text-slate-500 border-white/10 hover:text-slate-300 hover:bg-charcoal-800'
          }`}
          title="Toggle Geofence Perimeter"
          aria-label="Toggle Geofence"
        >
          <Shield className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            sound.playClick()
            setMapStyle((s) => (s === 'dark' ? 'satellite' : s === 'satellite' ? 'streets' : 'dark'))
          }}
          className="p-2 rounded-xl glass-panel border border-white/10 text-slate-300 hover:text-cyan hover:border-cyan/40 hover:bg-charcoal-800 transition-all duration-200 shadow-md flex items-center justify-center bg-charcoal-900/90"
          title={`Basemap: ${mapStyle.toUpperCase()}`}
          aria-label="Toggle Map Basemap"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      <MapContainer
        center={[homeLat, homeLon]}
        zoom={14}
        style={{ width: '100%', height: '100%', backgroundColor: '#07080a' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url={tileUrls[mapStyle]}
          subdomains={mapStyle === 'dark' ? 'abcd' : 'abc'}
          maxZoom={20}
        />

        <MapClickHandler isPickingDest={isPickingDest} onPick={onDestinationPick} />
        <MapController centerTarget={mapCenter} />

        {/* Geofence Safety Radius Rings */}
        {showGeofence && (
          <>
            <Circle
              center={[homeLat, homeLon]}
              radius={maxRangeKm * 1000}
              pathOptions={{
                color: 'var(--hud-primary, #00f0ff)',
                weight: 1.5,
                dashArray: '6, 8',
                fillColor: 'var(--hud-primary, #00f0ff)',
                fillOpacity: 0.03,
              }}
            />
            <Circle
              center={[homeLat, homeLon]}
              radius={maxRangeKm * 800}
              pathOptions={{
                color: '#fbbf24',
                weight: 1,
                dashArray: '4, 8',
                fillColor: 'transparent',
                opacity: 0.4,
              }}
            />
          </>
        )}

        {/* Home Base Station Marker (VIT Chennai) */}
        <Marker position={[homeLat, homeLon]} icon={createHomeIcon(homeLabel)}>
          <Popup>
            <div className="p-1 text-slate-100 font-mono">
              <div className="flex items-center gap-2 mb-1 pb-1 border-b border-emerald/20">
                <span className="w-2 h-2 rounded-full bg-emerald-bright"></span>
                <span className="text-xs font-bold text-emerald-bright uppercase">{homeLabel}</span>
              </div>
              <p className="text-[11px] text-slate-300">{formatCoords(homeLat, homeLon)}</p>
              <p className="text-[10px] text-slate-400 mt-1">Operational Base Launch Pad</p>
            </div>
          </Popup>
        </Marker>

        {/* Active Mission Destination Marker */}
        {activeMission && (
          <Marker
            position={[activeMission.dest_lat, activeMission.dest_lon]}
            icon={destIcon}
          >
            <Popup>
              <div className="p-1 text-slate-100 font-mono">
                <div className="flex items-center gap-2 mb-1 pb-1 border-b border-crimson/20">
                  <span className="w-2 h-2 rounded-full bg-crimson-bright animate-pulse"></span>
                  <span className="text-xs font-bold text-crimson-bright uppercase">DROP TARGET</span>
                </div>
                {activeMission.dest_label && (
                  <p className="text-xs text-white font-semibold">{activeMission.dest_label}</p>
                )}
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {formatCoords(activeMission.dest_lat, activeMission.dest_lon)}
                </p>
                <p className="text-[10px] text-cyan mt-1">
                  Payload: {activeMission.package_weight_g}g
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Picked Destination (Pre-Launch) */}
        {pickedDest && !activeMission && (
          <Marker position={[pickedDest.lat, pickedDest.lon]} icon={clickDestIcon}>
            <Popup>
              <div className="text-xs font-mono p-1">
                <p className="text-amber-bright font-bold mb-1">DESIGNATED DROP POINT</p>
                <p className="text-slate-300">{formatCoords(pickedDest.lat, pickedDest.lon)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Connected Flight Vectors & Waypoint Path */}
        {activeMission && (
          <>
            {/* Planned Corridor Vector */}
            <Polyline
              positions={[
                [activeMission.source_lat, activeMission.source_lon],
                [activeMission.dest_lat, activeMission.dest_lon],
              ]}
              pathOptions={{
                color: '#38bdf8',
                weight: 2,
                dashArray: '6, 8',
                opacity: 0.5,
              }}
            />

            {/* Active Flight Vector */}
            {activeMission.status === 'RETURNING' ? (
              <Polyline
                positions={[
                  [currentDroneLat, currentDroneLon],
                  [activeMission.source_lat, activeMission.source_lon],
                ]}
                pathOptions={{
                  color: '#f59e0b',
                  weight: 2.5,
                  dashArray: '4, 6',
                  opacity: 0.85,
                }}
              />
            ) : (
              <Polyline
                positions={[
                  [currentDroneLat, currentDroneLon],
                  [activeMission.dest_lat, activeMission.dest_lon],
                ]}
                pathOptions={{
                  color: 'var(--hud-primary, #00f0ff)',
                  weight: 2.5,
                  dashArray: '4, 6',
                  opacity: 0.85,
                }}
              />
            )}

            {/* Flown Breadcrumbs Path */}
            {flightTrail.length > 1 && (
              <Polyline
                positions={[...flightTrail, [currentDroneLat, currentDroneLon]]}
                pathOptions={{
                  color: 'var(--hud-primary, #00f0ff)',
                  weight: 3.5,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}
          </>
        )}

        {/* 60 FPS Drone Marker */}
        <DroneMarker defaultLat={homeLat} defaultLon={homeLon} />
      </MapContainer>
    </div>
  )
}
