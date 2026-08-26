import { create } from 'zustand'

/**
 * Telemetry store — holds latest drone telemetry, rolling history buffer,
 * motor ESC diagnostics, MAVLink log messages, and operator HUD preferences.
 */
const useTelemetryStore = create((set, get) => ({
  // Connection & link quality
  connected: false,
  lastUpdateMs: null,
  packetCount: 0,
  linkLatencyMs: 18,

  // HUD Theme & Audio settings
  theme: 'cyan', // 'cyan' | 'emerald' | 'amber' | 'crimson' | 'violet'
  audioEnabled: true,
  simulationScenario: 'default', // 'default' | 'high_wind' | 'low_battery' | 'urban_drop' | 'emergency_rtl'

  // Latest raw frame from backend / MAVLink
  frame: {
    lat: 12.8406,
    lon: 80.1534,
    alt_m: 0,
    alt_msl_m: 35,
    speed_ms: 0,
    heading_deg: 0,
    pitch_deg: 0,
    roll_deg: 0,
    yaw_deg: 0,
    vertical_speed_ms: 0,
    battery_pct: 98,
    battery_voltage_v: 24.8,
    battery_current_a: 0.8,
    battery_remaining_mah: 9800,
    flight_mode: 'STANDBY',
    armed: false,
    is_flying: false,
    gps_fix_type: 3,
    satellites_visible: 16,
    hdop: 0.8,
    timestamp_ms: Date.now(),
  },

  // Quad-rotor Brushless Motor & ESC Telemetry
  motors: {
    m1_rpm: 0,
    m2_rpm: 0,
    m3_rpm: 0,
    m4_rpm: 0,
    esc_temp_c: 34.5,
    vibration_level: 0.08,
  },

  // MAVLink Live Stream Console Logs
  mavlinkLogs: [
    { id: 1, time: new Date().toLocaleTimeString(), type: 'SYS', msg: 'AeroDrop GCS-01 telemetry transceiver online' },
    { id: 2, time: new Date().toLocaleTimeString(), type: 'GPS', msg: '3D Satellite Lock acquired (16 visible sats, HDOP 0.8)' },
    { id: 3, time: new Date().toLocaleTimeString(), type: 'NAV', msg: 'Home Base initialized at VIT Chennai [12.8406, 80.1534]' },
  ],

  // Previous frame (for interpolation)
  prevFrame: null,

  // Rolling history buffer (last 35 samples) for real-time sparkline waveforms
  history: [
    { time: 0, alt_m: 0, speed_ms: 0, power_w: 20, battery_pct: 98, voltage_v: 24.8 },
  ],

  // Actions
  setConnected: (connected) => set({ connected }),
  
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
  },

  setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
  setSimulationScenario: (simulationScenario) => set({ simulationScenario }),

  addLogMessage: (type, msg) => {
    set((state) => ({
      mavlinkLogs: [
        ...state.mavlinkLogs.slice(-49),
        { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), type, msg }
      ]
    }))
  },

  updateFrame: (data) =>
    set((state) => {
      const now = Date.now()
      const newFrame = { ...state.frame, ...data, timestamp_ms: now }
      const power_w = (newFrame.battery_voltage_v || 0) * (newFrame.battery_current_a || 0)

      // Compute simulated motor RPMs based on flight state
      const baseRpm = newFrame.armed
        ? newFrame.is_flying
          ? 5200 + Math.sin(now / 400) * 120 + (newFrame.speed_ms || 0) * 80
          : 1800
        : 0
      
      const updatedMotors = {
        m1_rpm: Math.max(0, Math.round(baseRpm + (newFrame.roll_deg || 0) * 25 - (newFrame.pitch_deg || 0) * 20)),
        m2_rpm: Math.max(0, Math.round(baseRpm - (newFrame.roll_deg || 0) * 25 - (newFrame.pitch_deg || 0) * 20)),
        m3_rpm: Math.max(0, Math.round(baseRpm - (newFrame.roll_deg || 0) * 25 + (newFrame.pitch_deg || 0) * 20)),
        m4_rpm: Math.max(0, Math.round(baseRpm + (newFrame.roll_deg || 0) * 25 + (newFrame.pitch_deg || 0) * 20)),
        esc_temp_c: Number((32.0 + (newFrame.battery_current_a || 0.8) * 0.4).toFixed(1)),
        vibration_level: newFrame.is_flying ? Number((0.12 + Math.random() * 0.06).toFixed(2)) : 0.02,
      }

      // Add to rolling history buffer (keep max 35 samples)
      const newHistoryItem = {
        time: now,
        alt_m: newFrame.alt_m || 0,
        speed_ms: newFrame.speed_ms || 0,
        power_w: power_w || 0,
        battery_pct: newFrame.battery_pct || 0,
        voltage_v: newFrame.battery_voltage_v || 0,
      }
      const updatedHistory = [...state.history.slice(-34), newHistoryItem]

      return {
        prevFrame: state.frame,
        frame: newFrame,
        motors: updatedMotors,
        lastUpdateMs: now,
        packetCount: state.packetCount + 1,
        history: updatedHistory,
      }
    }),

  // Scenario simulator injection
  injectScenario: (scenarioName) => {
    let patch = {}
    if (scenarioName === 'high_wind') {
      patch = { flight_mode: 'POSHOLD', pitch_deg: 8.5, roll_deg: -5.2, vertical_speed_ms: -0.4 }
      get().addLogMessage('WARN', 'High wind shear detected (8.5 m/s gust) — attitude gyro compensating')
    } else if (scenarioName === 'low_battery') {
      patch = { battery_pct: 18, battery_voltage_v: 21.2, flight_mode: 'RTL', armed: true, is_flying: true }
      get().addLogMessage('ALERT', 'Battery depleted past 20% failsafe gate — commanding RTL failsafe')
    } else if (scenarioName === 'urban_drop') {
      patch = { alt_m: 12.5, speed_ms: 2.1, flight_mode: 'LAND', pitch_deg: -1.2, roll_deg: 0.5, vertical_speed_ms: -0.8 }
      get().addLogMessage('NAV', 'Drop target reached: executing precision payload descent at 12m AGL')
    } else if (scenarioName === 'emergency_rtl') {
      patch = { flight_mode: 'RTL', armed: true, is_flying: true, speed_ms: 14.5, alt_m: 45.0 }
      get().addLogMessage('CMD', 'Manual emergency RTL issued by GCS operator')
    } else {
      patch = { flight_mode: 'STANDBY', armed: false, is_flying: false, alt_m: 0, speed_ms: 0, pitch_deg: 0, roll_deg: 0 }
      get().addLogMessage('SYS', 'Simulation reset to nominal standby on launch pad')
    }
    get().updateFrame(patch)
    set({ simulationScenario: scenarioName })
  },

  reset: () =>
    set({
      connected: false,
      lastUpdateMs: null,
      packetCount: 0,
      prevFrame: null,
      frame: {
        lat: 12.8406, lon: 80.1534,
        alt_m: 0, alt_msl_m: 35,
        speed_ms: 0, heading_deg: 0,
        pitch_deg: 0, roll_deg: 0, yaw_deg: 0,
        vertical_speed_ms: 0,
        battery_pct: 98, battery_voltage_v: 24.8,
        battery_current_a: 0.8, battery_remaining_mah: 9800,
        flight_mode: 'STANDBY', armed: false, is_flying: false,
        gps_fix_type: 3, satellites_visible: 16, hdop: 0.8,
        timestamp_ms: Date.now(),
      },
      motors: {
        m1_rpm: 0, m2_rpm: 0, m3_rpm: 0, m4_rpm: 0,
        esc_temp_c: 34.5, vibration_level: 0.08,
      },
      history: [{ time: 0, alt_m: 0, speed_ms: 0, power_w: 20, battery_pct: 98, voltage_v: 24.8 }],
    }),
}))

export default useTelemetryStore
