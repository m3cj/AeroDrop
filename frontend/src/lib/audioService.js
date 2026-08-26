/**
 * Synthetic Avionics Audio Service — uses pure Web Audio API oscillators.
 * Zero external audio files, zero network latency, instant tactile audio cues.
 */

class AvionicsAudioService {
  constructor() {
    this.ctx = null
    this.muted = false
    this.volume = 0.15 // Subtle background level
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  setMuted(muted) {
    this.muted = muted
  }

  isMuted() {
    return this.muted
  }

  toggleMute() {
    this.muted = !this.muted
    return this.muted
  }

  // 1. Tactical Click / Soft Tap
  playClick() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.04)

    gain.gain.setValueAtTime(this.volume * 0.4, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start()
    osc.stop(this.ctx.currentTime + 0.04)
  }

  // 2. Radar Ping Sweep Sound
  playRadarPing() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(2400, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15)

    gain.gain.setValueAtTime(this.volume * 0.3, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start()
    osc.stop(this.ctx.currentTime + 0.18)
  }

  // 3. Target Waypoint Designate Chime
  playTargetLock() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc1 = this.ctx.createOscillator()
    const osc2 = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc1.type = 'triangle'
    osc2.type = 'sine'

    osc1.frequency.setValueAtTime(1046.5, now) // C6
    osc1.frequency.setValueAtTime(1318.5, now + 0.06) // E6
    osc2.frequency.setValueAtTime(2093.0, now + 0.06) // C7

    gain.gain.setValueAtTime(this.volume * 0.5, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(this.ctx.destination)

    osc1.start(now)
    osc2.start(now + 0.06)
    osc1.stop(now + 0.22)
    osc2.stop(now + 0.22)
  }

  // 4. Mission Launch Sequence Fanfare
  playLaunchSequence() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const notes = [587.33, 783.99, 1046.5, 1567.98] // D5, G5, C6, G6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + idx * 0.08)

      gain.gain.setValueAtTime(0.001, now + idx * 0.08)
      gain.gain.linearRampToValueAtTime(this.volume * 0.5, now + idx * 0.08 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now + idx * 0.08)
      osc.stop(now + idx * 0.08 + 0.25)
    })
  }

  // 5. Caution / Critical Alert Buzzer
  playAlert(isCritical = false) {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = isCritical ? 'sawtooth' : 'triangle'
    osc.frequency.setValueAtTime(isCritical ? 880 : 520, now)
    osc.frequency.setValueAtTime(isCritical ? 440 : 380, now + 0.08)

    gain.gain.setValueAtTime(this.volume * (isCritical ? 0.6 : 0.4), now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.2)
  }
}

export const sound = new AvionicsAudioService()
export default sound
