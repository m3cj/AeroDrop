import { useEffect, useRef, useCallback } from 'react'
import useTelemetryStore from '../stores/telemetryStore'
import useMissionStore from '../stores/missionStore'
import { useToast } from '../components/common/Toast'

const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30000

/**
 * useWebSocket — manages a single multiplexed WebSocket connection.
 * Auto-reconnects with exponential backoff.
 * Demuxes message types to appropriate Zustand stores.
 */
export function useWebSocket() {
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const reconnectDelay = useRef(RECONNECT_BASE_MS)
  const mounted = useRef(true)

  const { updateFrame, setConnected } = useTelemetryStore()
  const { updateMissionStatus } = useMissionStore()
  const toast = useToast()

  const handleMessage = useCallback((event) => {
    try {
      const msg = JSON.parse(event.data)

      switch (msg.type) {
        case 'telemetry':
          updateFrame(msg.data)
          break

        case 'mission_status':
          updateMissionStatus(msg.data.mission_id, msg.data.status, msg.data)
          if (msg.data.status === 'IN_FLIGHT') {
            toast.info('Mission started', 'Drone is now in flight')
          } else if (msg.data.status === 'COMPLETED') {
            toast.success('Mission complete', 'Drone has returned to base')
          } else if (msg.data.status === 'FAILED') {
            toast.error('Mission failed', msg.data.reason || 'Unknown error')
          } else if (msg.data.status === 'DELIVERED') {
            toast.success('Package delivered', 'En route back to base')
          }
          break

        case 'alert':
          const level = msg.data.level
          if (level === 'critical' || level === 'error') {
            toast.error(msg.data.title, msg.data.message)
          } else if (level === 'warning') {
            toast.warning(msg.data.title, msg.data.message)
          } else {
            toast.info(msg.data.title, msg.data.message)
          }
          break

        case 'connected':
          reconnectDelay.current = RECONNECT_BASE_MS
          break

        default:
          break
      }
    } catch (e) {
      // ignore parse errors
    }
  }, [updateFrame, updateMissionStatus, toast])

  const connect = useCallback(() => {
    if (!mounted.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        reconnectDelay.current = RECONNECT_BASE_MS
      }

      ws.onmessage = handleMessage

      ws.onclose = () => {
        setConnected(false)
        if (!mounted.current) return
        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, RECONNECT_MAX_MS)
          connect()
        }, reconnectDelay.current)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch (e) {
      setConnected(false)
    }
  }, [handleMessage, setConnected])

  useEffect(() => {
    mounted.current = true
    connect()

    return () => {
      mounted.current = false
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const sendMessage = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { sendMessage }
}
