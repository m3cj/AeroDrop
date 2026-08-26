import { useEffect, useRef, useState } from 'react'
import useTelemetryStore from '../stores/telemetryStore'

/**
 * useTelemetry — returns current frame.
 */
export function useTelemetry() {
  return useTelemetryStore((state) => state.frame)
}

/**
 * useTelemetrySelector — atomic selector hook for fine-grained subscriptions.
 */
export function useTelemetrySelector(selector) {
  return useTelemetryStore(selector)
}

/**
 * useTelemetryHistory — returns the rolling 35-sample telemetry history buffer.
 */
export function useTelemetryHistory() {
  return useTelemetryStore((state) => state.history)
}

/**
 * useSmoothTelemetry — 60 FPS RAF-interpolated telemetry for buttery-smooth instruments.
 * Uses exponential smoothing to glide between 5Hz updates without stutter.
 */
export function useSmoothTelemetry(smoothingFactor = 0.18) {
  const targetFrame = useTelemetryStore((state) => state.frame)
  const [smoothState, setSmoothState] = useState({
    pitch_deg: 0,
    roll_deg: 0,
    heading_deg: 0,
    alt_m: 0,
    speed_ms: 0,
  })

  const stateRef = useRef(smoothState)
  const targetRef = useRef(targetFrame)
  targetRef.current = targetFrame

  useEffect(() => {
    let animId
    const tick = () => {
      const current = stateRef.current
      const target = targetRef.current

      // Calculate shortest path for heading angles around 360
      let headingDiff = ((target.heading_deg - current.heading_deg + 540) % 360) - 180

      const nextPitch = current.pitch_deg + (target.pitch_deg - current.pitch_deg) * smoothingFactor
      const nextRoll = current.roll_deg + (target.roll_deg - current.roll_deg) * smoothingFactor
      const nextHeading = (current.heading_deg + headingDiff * smoothingFactor + 360) % 360
      const nextAlt = current.alt_m + ((target.alt_m || 0) - current.alt_m) * smoothingFactor
      const nextSpeed = current.speed_ms + ((target.speed_ms || 0) - current.speed_ms) * smoothingFactor

      const nextState = {
        pitch_deg: nextPitch,
        roll_deg: nextRoll,
        heading_deg: nextHeading,
        alt_m: nextAlt,
        speed_ms: nextSpeed,
      }

      stateRef.current = nextState
      setSmoothState(nextState)

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [smoothingFactor])

  return smoothState
}

export default useTelemetry
