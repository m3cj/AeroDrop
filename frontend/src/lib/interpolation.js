/**
 * Client-side position interpolation between telemetry ticks.
 *
 * The backend pushes telemetry at 5 Hz (every 200ms).
 * We use requestAnimationFrame to lerp between the last two known positions
 * at 60 FPS for smooth drone marker animation on the map.
 */

/** Linear interpolation */
export const lerp = (a, b, t) => a + (b - a) * t

/**
 * Angle interpolation — takes shortest path around 360°.
 * e.g. lerp from 350° to 10° should go through 0°, not 340°.
 */
export const lerpAngle = (a, b, t) => {
  let diff = ((b - a + 540) % 360) - 180
  return (a + diff * t + 360) % 360
}

/**
 * Get interpolated position between prev and current telemetry frames.
 *
 * @param {object} prev - Previous TelemetryFrame
 * @param {object} curr - Current TelemetryFrame
 * @param {number} lastUpdateMs - Timestamp when curr was received
 * @param {number} intervalMs - Expected interval between frames (e.g. 200ms for 5 Hz)
 * @returns Interpolated { lat, lon, alt_m, heading_deg, speed_ms }
 */
export function getInterpolated(prev, curr, lastUpdateMs, intervalMs = 200) {
  if (!prev || !curr) return curr

  const elapsed = Date.now() - lastUpdateMs
  const t = Math.min(elapsed / intervalMs, 1.2) // allow slight overshoot

  return {
    ...curr,
    lat: lerp(prev.lat, curr.lat, t),
    lon: lerp(prev.lon, curr.lon, t),
    alt_m: lerp(prev.alt_m, curr.alt_m, t),
    heading_deg: lerpAngle(prev.heading_deg, curr.heading_deg, t),
    speed_ms: lerp(prev.speed_ms, curr.speed_ms, t),
  }
}
