import { BANDS } from './Bands.js';
import {
  AUDIO_FFT_SIZE,
  AUDIO_SMOOTHING_TIME_CONSTANT,
  AUDIO_INITIAL_PEAK_DIFF,
  AUDIO_ONSET_COOLDOWN_MS,
  AUDIO_SAFETY_TIMEOUT_MS,
  AUDIO_THRESHOLD_MIN,
  AUDIO_THRESHOLD_PEAK_FACTOR,
  AUDIO_SAFETY_THRESHOLD_SCALE,
  AUDIO_SMOOTH_KEEP,
  AUDIO_SMOOTH_ADD,
  AUDIO_PEAK_KEEP,
  AUDIO_PEAK_ADD,
  AUDIO_ONSET_SMOOTH_BOOST,
  AUDIO_RANGE_LOW_START_BIN,
  AUDIO_RANGE_LOW_END_BIN,
  AUDIO_RANGE_MID_START_BIN,
  AUDIO_RANGE_MID_END_BIN,
  AUDIO_RANGE_HIGH_START_BIN,
  AUDIO_RANGE_HIGH_END_BIN,
} from '../engine/Config.js';
import { getDifficulty } from '../engine/Difficulty.js';

export interface BandState {
  smoothed: number;
  peakDiff: number;
  lastOnsetTime: number;
  lastSpawnTime: number;
}

export interface FrequencyData {
  low: number;
  mid: number;
  high: number;
}

export type OnBeatCallback = (energy: number, laneIndex: number) => void;
export type OnFrequencyDataCallback = (data: FrequencyData) => void;
export type OnEndedCallback = () => void;

export class BeatDetector {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  source: AudioBufferSourceNode | null;
  dataArray: Uint8Array<ArrayBuffer> | null;
  isPlaying: boolean;
  onBeat: OnBeatCallback | null;
  onFrequencyData: OnFrequencyDataCallback | null;
  onEnded: OnEndedCallback | null;
  rafId: number | null;
  bandState: BandState[];
  lowFreqAvg: number;
  midFreqAvg: number;
  highFreqAvg: number;
  private _skip: boolean;
  private _lastGlobalOnsetMs: number;

  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.dataArray = null;
    this.isPlaying = false;
    this.onBeat = null;
    this.onFrequencyData = null;
    this.onEnded = null;
    this.rafId = null;

    this.bandState = BANDS.map(() => ({
      smoothed: 0,
      peakDiff: AUDIO_INITIAL_PEAK_DIFF,
      lastOnsetTime: 0,
      lastSpawnTime: 0,
    }));

    this.lowFreqAvg = 0;
    this.midFreqAvg = 0;
    this.highFreqAvg = 0;
    this._skip = false;
    this._lastGlobalOnsetMs = 0;
  }

  async loadAudio(file: File): Promise<void> {
    this.stop();

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer: ArrayBuffer = await file.arrayBuffer();
    const audioBuffer: AudioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = audioBuffer;

    this.source.onended = () => {
      this.isPlaying = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (this.onEnded) this.onEnded();
    };

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = AUDIO_FFT_SIZE;
    this.analyser.smoothingTimeConstant = AUDIO_SMOOTHING_TIME_CONSTANT;

    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.bandState = BANDS.map(() => ({
      smoothed: 0,
      peakDiff: AUDIO_INITIAL_PEAK_DIFF,
      lastOnsetTime: 0,
      lastSpawnTime: 0,
    }));
  }

  play(): void {
    if (!this.source || !this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.source.start(0);
    this.isPlaying = true;
    this.scheduleAnalyze();
  }

  pause(): void {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'running') {
      this.isPlaying = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.audioContext.suspend().catch(() => {});
    }
  }

  resume(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume().then(() => {
        this.isPlaying = true;
        this.scheduleAnalyze();
      }).catch(() => {});
    }
  }

  get paused(): boolean {
    return this.audioContext?.state === 'suspended';
  }

  stop(): void {
    this.isPlaying = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    try {
      if (this.source) this.source.stop();
    } catch (_) { }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => { });
    }
    this.source = null;
    this.analyser = null;
    this.audioContext = null;
  }

  scheduleAnalyze(): void {
    this.rafId = requestAnimationFrame(() => this.analyze());
  }

  analyze(): void {
    if (!this.isPlaying || !this.analyser || !this.dataArray) return;
    this.scheduleAnalyze();

    // Skip every other frame (halve effective sample rate)
    this._skip = !this._skip;
    if (this._skip) return;

    this.analyser.getByteFrequencyData(this.dataArray);

    const now: number = performance.now();

    // Multi-band onset detection with adaptive per-band thresholds
    const cooldown: number = AUDIO_ONSET_COOLDOWN_MS;
    const safetyTimeout: number = AUDIO_SAFETY_TIMEOUT_MS;

    for (const band of BANDS) {
      const state: BandState = this.bandState[band.lane];
      const energy: number = this.bandEnergy(band.bins[0], band.bins[1]);

      if (state.smoothed === 0) {
        state.smoothed = energy;
      } else {
        state.smoothed = state.smoothed * AUDIO_SMOOTH_KEEP + energy * AUDIO_SMOOTH_ADD;
      }

      const diff: number = energy - state.smoothed;

      // Adaptive threshold: each band self-calibrates to its own dynamics
      state.peakDiff = state.peakDiff * AUDIO_PEAK_KEEP + Math.max(diff, 0) * AUDIO_PEAK_ADD;

      // Threshold = 35% of recent peak diff, with absolute minimum of 8
      const threshold: number = Math.max(AUDIO_THRESHOLD_MIN, state.peakDiff * AUDIO_THRESHOLD_PEAK_FACTOR);

      // Safety net: if no note spawned anywhere for safetyTimeout, lower the bar
      const timeSinceAnySpawn: number = Math.min(
        ...this.bandState.map((s: BandState) => now - s.lastSpawnTime)
      );
      const effectiveThreshold: number = timeSinceAnySpawn > safetyTimeout
        ? threshold * AUDIO_SAFETY_THRESHOLD_SCALE
        : threshold;

      if (
        diff > effectiveThreshold &&
        now - state.lastOnsetTime > cooldown &&
        now - this._lastGlobalOnsetMs > getDifficulty().globalCooldownMs &&
        this.onBeat
      ) {
        state.lastOnsetTime = now;
        state.lastSpawnTime = now;
        this._lastGlobalOnsetMs = now;
        state.smoothed += diff * AUDIO_ONSET_SMOOTH_BOOST;
        this.onBeat(energy, band.lane);
      }
    }

    // Full-range averages for visual effects
    this.lowFreqAvg = this.rangeAvg(AUDIO_RANGE_LOW_START_BIN, AUDIO_RANGE_LOW_END_BIN);
    this.midFreqAvg = this.rangeAvg(AUDIO_RANGE_MID_START_BIN, AUDIO_RANGE_MID_END_BIN);
    this.highFreqAvg = this.rangeAvg(AUDIO_RANGE_HIGH_START_BIN, AUDIO_RANGE_HIGH_END_BIN);

    if (this.onFrequencyData) {
      this.onFrequencyData({
        low: this.lowFreqAvg,
        mid: this.midFreqAvg,
        high: this.highFreqAvg,
      });
    }
  }

  bandEnergy(startBin: number, endBin: number): number {
    let sum: number = 0;
    for (let i: number = startBin; i <= endBin; i++) {
      sum += this.dataArray![i];
    }
    return sum / (endBin - startBin + 1);
  }

  rangeAvg(start: number, end: number): number {
    let sum: number = 0;
    for (let i: number = start; i < end; i++) {
      sum += this.dataArray![i];
    }
    return sum / (end - start);
  }
}
