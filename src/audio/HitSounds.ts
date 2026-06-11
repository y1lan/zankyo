import type { Bus } from '../core/Bus.js'
import type { Judgement } from '../engine/HitJudge.js'

/**
 * Synthesized hit feedback sounds using Web Audio API oscillators.
 * No audio files needed — generates short tonal pings.
 */
export class HitSounds {
  private ctx: AudioContext | null = null

  constructor(bus: Bus) {
    // Ring tap (any input on the ring)
    bus.on('input:key', () => this._playTap())

    // Note hit (judgement-quality correlated pitch)
    bus.on('game:hit', ({ quality }) => {
      this._playHit(quality === 'perfect' ? 'perfect' : 'good')
    })
  }

  private _ensureCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext()
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  /** Short soft click for any ring tap */
  private _playTap(): void {
    const ctx = this._ensureCtx()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04)
    gain.gain.setValueAtTime(0.4, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.06)
  }

  /** Tonal ping for note hit — higher pitch for better judgement */
  private _playHit(quality: 'perfect' | 'good'): void {
    const ctx = this._ensureCtx()
    const now = ctx.currentTime

    // Perfect = bright high ping, Good = lower duller ping
    const baseFreq = quality === 'perfect' ? 600 : 800
    const duration = quality === 'perfect' ? 0.12 : 0.08
    const volume = quality === 'perfect' ? 0.8 : 0.6

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = quality === 'perfect' ? 'sine' : 'triangle'
    osc.frequency.setValueAtTime(baseFreq, now)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + duration)
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + duration + 0.01)
  }
}
