/** Format seconds to mm:ss or hh:mm:ss */
export const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return '--:--'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Format meters/s to km/h display */
export const msToKmh = (ms) => (ms * 3.6).toFixed(1)

/** Format grams to readable weight */
export const formatWeight = (grams) => {
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`
  return `${grams} g`
}

/** Format km with 2 decimal places */
export const formatDistance = (km) => {
  if (km < 1) return `${(km * 1000).toFixed(0)} m`
  return `${km.toFixed(2)} km`
}

/** Format coordinates to display string */
export const formatCoords = (lat, lon, decimals = 5) => {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(decimals)}°${ns}, ${Math.abs(lon).toFixed(decimals)}°${ew}`
}

/** Format altitude */
export const formatAlt = (m) => `${m.toFixed(1)} m`

/** Format speed in m/s */
export const formatSpeed = (ms) => `${ms.toFixed(1)} m/s`

/** Format battery percentage with color class */
export const batteryColor = (pct) => {
  if (pct > 50) return 'text-success'
  if (pct > 25) return 'text-warning'
  return 'text-danger'
}

/** Format probability as % with color */
export const formatProbability = (p) => `${(p * 100).toFixed(0)}%`

/** Format mission status to display label */
export const statusLabel = (status) => {
  const labels = {
    CREATED: 'Created',
    VALIDATED: 'Validated',
    READY: 'Ready',
    IN_FLIGHT: 'In Flight',
    DELIVERED: 'Delivered',
    RETURNING: 'Returning',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
    ABORTED: 'Aborted',
  }
  return labels[status] || status
}

/** Format datetime string to local display */
export const formatDate = (isoString) => {
  if (!isoString) return '--'
  return new Date(isoString).toLocaleString()
}

/** Get relative time string (e.g. "2 min ago") */
export const timeAgo = (isoString) => {
  if (!isoString) return '--'
  const diff = Date.now() - new Date(isoString).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
