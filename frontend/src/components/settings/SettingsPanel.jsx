import { useState, useEffect } from 'react'
import { X, Save, Loader } from 'lucide-react'
import useSettingsStore from '../../stores/settingsStore'
import { useToast } from '../common/Toast'

function Field({ label, id, type = 'text', value, onChange, min, max, step, placeholder, unit }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs text-muted uppercase tracking-wider mb-1 block">
        {label} {unit && <span className="lowercase normal-case text-muted/60">({unit})</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        min={min} max={max} step={step}
        placeholder={placeholder}
        className="input"
      />
    </div>
  )
}

function ToggleSwitch({ id, label, checked, onChange, description }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <label htmlFor={id} className="text-sm text-white cursor-pointer">{label}</label>
        {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
          checked ? 'bg-accent' : 'bg-surface-500'
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  )
}

export default function SettingsPanel({ isOpen, onClose }) {
  const { settings, fetchSettings, updateSettings } = useSettingsStore()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (isOpen && !settings) fetchSettings()
  }, [isOpen, settings, fetchSettings])

  useEffect(() => {
    if (settings) setForm({ ...settings })
  }, [settings])

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    setLoading(true)
    try {
      await updateSettings(form)
      toast.success('Settings saved', 'Configuration updated successfully')
      onClose()
    } catch (err) {
      toast.error('Save failed', err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[40] backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-14 bottom-0 w-96 z-50 glass-panel border-l border-border animate-slide-in-right flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-glass text-muted hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!form ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader className="w-6 h-6 text-muted animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Home base */}
            <section>
              <h3 className="text-xs font-semibold text-accent uppercase tracking-wider mb-3">
                🏠 Home Base
              </h3>
              <div className="space-y-3">
                <Field id="home-lat" label="Latitude" type="number" value={form.home_lat} onChange={set('home_lat')} step="0.00001" min="-90" max="90" />
                <Field id="home-lon" label="Longitude" type="number" value={form.home_lon} onChange={set('home_lon')} step="0.00001" min="-180" max="180" />
                <Field id="home-label" label="Label" value={form.home_label} onChange={set('home_label')} placeholder="Home Base" />
              </div>
            </section>

            <div className="border-t border-border" />

            {/* Drone parameters */}
            <section>
              <h3 className="text-xs font-semibold text-accent uppercase tracking-wider mb-3">
                🚁 Drone Performance
              </h3>
              <div className="space-y-3">
                <Field id="cruise-speed" label="Cruise Speed" type="number" value={form.cruise_speed_ms} onChange={set('cruise_speed_ms')} min="1" max="50" step="0.5" unit="m/s" />
                <Field id="max-payload" label="Max Payload" type="number" value={form.max_payload_g} onChange={set('max_payload_g')} min="100" max="10000" step="100" unit="grams" />
                <Field id="battery-cap" label="Battery Capacity" type="number" value={form.battery_capacity_mah} onChange={set('battery_capacity_mah')} min="1000" step="100" unit="mAh" />
                <Field id="hover-current" label="Hover Current" type="number" value={form.hover_current_a} onChange={set('hover_current_a')} min="1" step="0.5" unit="Amps" />
                <Field id="cruise-current" label="Cruise Current" type="number" value={form.cruise_current_a} onChange={set('cruise_current_a')} min="1" step="0.5" unit="Amps" />
              </div>
            </section>

            <div className="border-t border-border" />

            {/* Safety thresholds */}
            <section>
              <h3 className="text-xs font-semibold text-accent uppercase tracking-wider mb-3">
                ⚡ Safety Thresholds
              </h3>
              <div className="space-y-3">
                <Field id="max-wind" label="Max Wind Speed" type="number" value={form.max_wind_speed_ms} onChange={set('max_wind_speed_ms')} min="0" max="30" step="0.5" unit="m/s" />
                <Field id="max-precip" label="Max Precipitation" type="number" value={form.max_precipitation_mm} onChange={set('max_precipitation_mm')} min="0" step="0.1" unit="mm/hr" />
                <Field id="battery-reserve" label="Battery Reserve" type="number" value={form.battery_reserve_pct} onChange={set('battery_reserve_pct')} min="5" max="50" step="1" unit="%" />
                <Field id="max-range" label="Max Range" type="number" value={form.max_range_km} onChange={set('max_range_km')} min="0.1" step="0.5" unit="km (one-way)" />
              </div>
            </section>

            <div className="border-t border-border" />

            {/* Connection */}
            <section>
              <h3 className="text-xs font-semibold text-accent uppercase tracking-wider mb-3">
                📡 Connection
              </h3>
              <div className="space-y-3">
                <ToggleSwitch
                  id="mock-mode-toggle"
                  label="Mock Mode"
                  description="Use simulated telemetry (no real drone needed)"
                  checked={form.mock_mode}
                  onChange={set('mock_mode')}
                />
                {!form.mock_mode && (
                  <Field id="mavlink-conn" label="MAVLink Connection" value={form.mavlink_connection} onChange={set('mavlink_connection')} placeholder="udpin:0.0.0.0:14550" />
                )}
                <Field id="jetsan-url" label="Jetsan HLS URL" value={form.jetsan_hls_url} onChange={set('jetsan_hls_url')} placeholder="http://localhost:8554/stream.m3u8" />
                <Field id="weather-key" label="WeatherAPI Key" value={form.weather_api_key} onChange={set('weather_api_key')} placeholder="Your WeatherAPI.com key" type="password" />
              </div>
            </section>
          </div>
        )}

        <div className="p-4 border-t border-border">
          <button
            id="settings-save-btn"
            onClick={handleSave}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </>
  )
}
