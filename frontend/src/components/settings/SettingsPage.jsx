import { useState, useEffect } from 'react'
import {
  Save, ArrowLeft, Shield, Cpu, MapPin, Radio,
  CheckCircle2, Loader, Sparkles
} from 'lucide-react'
import useSettingsStore from '../../stores/settingsStore'
import { useToast } from '../common/Toast'
import { sound } from '../../lib/audioService'

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 mb-6 pb-4 border-b border-white/10">
      <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan/40 text-cyan shadow-[0_0_12px_rgba(0,240,255,0.2)]">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base font-bold text-white tracking-wide font-display">{title}</h3>
        <p className="text-xs text-slate-400 mt-0.5 font-sans">{description}</p>
      </div>
    </div>
  )
}

function InputField({ id, label, type = 'text', value, onChange, min, max, step, placeholder, unit, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
          {label}
        </label>
        {unit && <span className="text-[11px] font-mono text-cyan/90">{unit}</span>}
      </div>
      <input
        id={id}
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className="input"
      />
      {hint && <span className="text-[10px] text-slate-500 font-sans">{hint}</span>}
    </div>
  )
}

function ToggleCard({ id, title, description, checked, onChange }) {
  return (
    <div className="glass-card p-4 flex items-center justify-between gap-4 border border-white/10 bg-charcoal-900/90">
      <div>
        <label htmlFor={id} className="text-sm font-bold text-white cursor-pointer block">{title}</label>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => {
          sound.playClick()
          onChange(!checked)
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-gradient-to-r from-cyan to-blue-500 shadow-[0_0_12px_rgba(0,240,255,0.5)]' : 'bg-charcoal-800'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export default function SettingsPage({ onBackToDashboard }) {
  const { settings, fetchSettings, updateSettings } = useSettingsStore()
  const [activeTab, setActiveTab] = useState('base')
  const [form, setForm] = useState(() => (settings ? { ...settings } : null))
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!settings) {
      fetchSettings()
    } else {
      setForm((prev) => prev || { ...settings })
    }
  }, [settings, fetchSettings])

  const setField = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    sound.playClick()
    if (!form) return
    setSaving(true)
    try {
      await updateSettings(form)
      toast.success('Configuration Saved', 'System operational parameters updated successfully')
    } catch (err) {
      sound.playAlert(true)
      toast.error('Save Failed', err.message || 'Failed to update configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleResetVitChennai = () => {
    sound.playClick()
    setForm((prev) => ({
      ...prev,
      home_lat: 12.8406,
      home_lon: 80.1534,
      home_label: 'VIT Chennai Base Station',
    }))
    toast.info('Coordinates Set', 'Restored VIT Chennai Base Station coordinates (12.8406, 80.1534)')
  }

  const tabs = [
    { id: 'base', label: 'Base Station & Geofence', icon: MapPin },
    { id: 'drone', label: 'Drone Dynamics & Payload', icon: Cpu },
    { id: 'safety', label: 'Safety Thresholds & Limits', icon: Shield },
    { id: 'network', label: 'Hardware & Streams', icon: Radio },
  ]

  if (!form) {
    return (
      <div className="flex-1 flex items-center justify-center bg-charcoal-950">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 text-cyan animate-spin" />
          <span className="text-xs font-mono text-slate-400">LOADING SYSTEM SETTINGS...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-charcoal-950 select-none">
      {/* Top Settings Bar */}
      <div className="glass-panel border-b border-white/10 px-6 py-3.5 flex items-center justify-between shrink-0 bg-charcoal-900/95">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              sound.playClick()
              onBackToDashboard()
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-charcoal-800 hover:bg-charcoal-750 border border-white/10 text-slate-300 hover:text-white text-xs font-mono transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>OPERATIONS DASHBOARD</span>
          </button>
          <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>
          <div>
            <h2 className="text-sm font-bold text-white font-mono tracking-wider flex items-center gap-2">
              <span>SYSTEM CONFIGURATION</span>
              <span className="badge bg-cyan-950 text-cyan text-[10px]">AERODROP v2.0</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-xs font-mono py-2 px-5"
          >
            {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'SAVING...' : 'SAVE CONFIGURATION'}</span>
          </button>
        </div>
      </div>

      {/* Main Settings Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Category Tabs Navigation */}
        <div className="w-72 border-r border-white/10 p-4 flex flex-col gap-1.5 shrink-0 bg-charcoal-900/70 overflow-y-auto">
          <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
            CONFIGURATION SECTIONS
          </p>
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  sound.playClick()
                  setActiveTab(tab.id)
                }}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 text-xs font-mono ${
                  active
                    ? 'bg-gradient-to-r from-cyan-950/80 to-blue-900/40 border border-cyan/50 text-white shadow-[0_0_16px_rgba(0,240,255,0.2)] font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-cyan' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}

          <div className="mt-auto pt-6 px-2">
            <div className="glass-card p-3 border border-white/10 text-[11px] font-mono text-slate-400 space-y-1 bg-charcoal-950/80">
              <div className="flex justify-between">
                <span>ACTIVE BASE:</span>
                <span className="text-emerald-bright font-bold">VIT CHENNAI</span>
              </div>
              <div className="flex justify-between">
                <span>TELEMETRY:</span>
                <span className="text-cyan">{form.telemetry_rate_hz || 5} Hz</span>
              </div>
              <div className="flex justify-between">
                <span>SIMULATION:</span>
                <span className={form.mock_mode ? 'text-amber-bright' : 'text-slate-500'}>
                  {form.mock_mode ? 'ENABLED' : 'HARDWARE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Active Tab Content */}
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl sidebar-scroll">
          {/* TAB 1: Base Station */}
          {activeTab === 'base' && (
            <div className="space-y-6 animate-fade-in">
              <SectionHeader
                icon={MapPin}
                title="Base Station & Launch Pad Coordinates"
                description="Configure the primary home origin point, ground telemetry transceiver, and return-to-base location."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  id="home-lat"
                  label="Home Latitude"
                  type="number"
                  step="0.000001"
                  min="-90"
                  max="90"
                  value={form.home_lat}
                  onChange={setField('home_lat')}
                  placeholder="12.8406"
                  unit="DEG N"
                  hint="VIT Chennai Latitude: 12.8406"
                />
                <InputField
                  id="home-lon"
                  label="Home Longitude"
                  type="number"
                  step="0.000001"
                  min="-180"
                  max="180"
                  value={form.home_lon}
                  onChange={setField('home_lon')}
                  placeholder="80.1534"
                  unit="DEG E"
                  hint="VIT Chennai Longitude: 80.1534"
                />
              </div>

              <InputField
                id="home-label"
                label="Base Station Identifier / Label"
                value={form.home_label}
                onChange={setField('home_label')}
                placeholder="VIT Chennai Base Station"
                hint="Descriptive name shown on map HUD and mission dispatches"
              />

              <div className="glass-card p-4 border border-emerald/20 flex items-center justify-between bg-charcoal-900/90">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-950/80 text-emerald-bright">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono uppercase">Quick Location Preset</h4>
                    <p className="text-xs text-slate-400">Set coordinates directly to Vellore Institute of Technology (VIT) Chennai campus.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetVitChennai}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-bright border border-emerald/40 text-xs font-mono transition-all"
                >
                  Apply VIT Chennai Preset
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Drone Specifications */}
          {activeTab === 'drone' && (
            <div className="space-y-6 animate-fade-in">
              <SectionHeader
                icon={Cpu}
                title="Drone Flight Dynamics & Specifications"
                description="Tune the delivery aircraft physical specs, cruise speed envelope, and motor current consumption profile."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  id="cruise-speed"
                  label="Cruise Airspeed"
                  type="number"
                  min="1"
                  max="40"
                  step="0.5"
                  value={form.cruise_speed_ms}
                  onChange={setField('cruise_speed_ms')}
                  unit="m/s"
                  hint="Standard delivery transit velocity (approx 54 km/h at 15 m/s)"
                />
                <InputField
                  id="max-payload"
                  label="Maximum Payload Capacity"
                  type="number"
                  min="100"
                  max="10000"
                  step="100"
                  value={form.max_payload_g}
                  onChange={setField('max_payload_g')}
                  unit="Grams"
                  hint="Payload gatekeeper rejects heavier parcels during validation"
                />
                <InputField
                  id="battery-cap"
                  label="Battery Pack Capacity"
                  type="number"
                  min="1000"
                  max="50000"
                  step="500"
                  value={form.battery_capacity_mah}
                  onChange={setField('battery_capacity_mah')}
                  unit="mAh (6S LiPo)"
                  hint="Nominal pack storage capacity"
                />
                <InputField
                  id="hover-current"
                  label="Hover Discharge Current"
                  type="number"
                  min="5"
                  max="60"
                  step="0.5"
                  value={form.hover_current_a}
                  onChange={setField('hover_current_a')}
                  unit="Amps (A)"
                  hint="Current draw while stationed at destination drop-point"
                />
                <InputField
                  id="cruise-current"
                  label="Cruise Discharge Current"
                  type="number"
                  min="5"
                  max="60"
                  step="0.5"
                  value={form.cruise_current_a}
                  onChange={setField('cruise_current_a')}
                  unit="Amps (A)"
                  hint="Current draw under level cruise forward flight"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Safety Limits */}
          {activeTab === 'safety' && (
            <div className="space-y-6 animate-fade-in">
              <SectionHeader
                icon={Shield}
                title="Safety Thresholds & Meteorological Gates"
                description="Pre-flight validation checks will abort or reject missions exceeding these meteorological and electrical safety margins."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  id="max-wind"
                  label="Maximum Wind Speed Gate"
                  type="number"
                  min="1"
                  max="30"
                  step="0.5"
                  value={form.max_wind_speed_ms}
                  onChange={setField('max_wind_speed_ms')}
                  unit="m/s"
                  hint="Flights rejected if forecast wind exceeds threshold (e.g. 10 m/s = 36 km/h)"
                />
                <InputField
                  id="max-precip"
                  label="Precipitation Limit"
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={form.max_precipitation_mm}
                  onChange={setField('max_precipitation_mm')}
                  unit="mm/hr Rain"
                  hint="Weather safety gate rejects flight in heavy rainfall"
                />
                <InputField
                  id="battery-reserve"
                  label="Failsafe Return Battery Reserve"
                  type="number"
                  min="5"
                  max="50"
                  step="1"
                  value={form.battery_reserve_pct}
                  onChange={setField('battery_reserve_pct')}
                  unit="%"
                  hint="Emergency reserve margin preserved upon return touchdown"
                />
                <InputField
                  id="max-range"
                  label="Max Operational Radius"
                  type="number"
                  min="0.5"
                  max="50"
                  step="0.5"
                  value={form.max_range_km}
                  onChange={setField('max_range_km')}
                  unit="km (one-way)"
                  hint="Geofence boundary around VIT Chennai Base Station"
                />
              </div>
            </div>
          )}

          {/* TAB 4: Hardware & Network Streams */}
          {activeTab === 'network' && (
            <div className="space-y-6 animate-fade-in">
              <SectionHeader
                icon={Radio}
                title="Telemetry Transceivers, Video & API Integrations"
                description="Configure MAVLink UDP telemetry endpoints, MediaMTX HLS camera relays, and live WeatherAPI token."
              />

              <ToggleCard
                id="mock-mode-toggle"
                title="Mock Simulation Mode"
                description="Simulate autonomous drone flights with realistic trajectory telemetry (no physical flight controller required)."
                checked={form.mock_mode}
                onChange={setField('mock_mode')}
              />

              {!form.mock_mode && (
                <InputField
                  id="mavlink-conn"
                  label="MAVLink Connection String"
                  value={form.mavlink_connection}
                  onChange={setField('mavlink_connection')}
                  placeholder="udpin:0.0.0.0:14550"
                  hint="UDP port listening for companion computer / ArduPilot MAVLink streams"
                />
              )}

              <InputField
                id="jetsan-url"
                label="Jetsan / MediaMTX HLS Stream URL"
                value={form.jetsan_hls_url}
                onChange={setField('jetsan_hls_url')}
                placeholder="http://localhost:8554/stream.m3u8"
                hint="Live HLS stream endpoint for real-time video surveillance"
              />

              <InputField
                id="weather-key"
                label="WeatherAPI.com Secret Token Key"
                type="password"
                value={form.weather_api_key}
                onChange={setField('weather_api_key')}
                placeholder="Enter WeatherAPI.com API token"
                hint="Leave empty to use built-in simulated realistic weather telemetry"
              />

              <InputField
                id="telemetry-rate"
                label="WebSocket Broadcast Frequency"
                type="number"
                min="1"
                max="20"
                step="1"
                value={form.telemetry_rate_hz}
                onChange={setField('telemetry_rate_hz')}
                unit="Hz"
                hint="Frequency of telemetry pushes to connected mission control dashboards"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
