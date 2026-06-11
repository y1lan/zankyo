import { BANDS, type Band } from './Bands.js';
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
  SECTORS,
  type NoteType,
} from '../engine/Config.js';
import { getDifficulty } from '../engine/Difficulty.js';

export interface BeatmapNote {
  timeMs: number;
  sectorIndex: number;
  noteType: NoteType;
}

export interface Beatmap {
  notes: BeatmapNote[];
  totalNotes: number;
}

/**
 * Analyze an AudioBuffer offline and generate the full beatmap ahead of time.
 * Uses the same multi-band onset detection as the real-time BeatDetector,
 * but processes the entire track in one pass.
 */
export function generateBeatmap(audioBuffer: AudioBuffer): Beatmap {
  const diff = getDifficulty();
  const sampleRate = audioBuffer.sampleRate;
  const fftSize = AUDIO_FFT_SIZE;
  const hopSize = fftSize / 2; // advance by half a window each step
  const totalSamples = audioBuffer.length;

  // Mix down to mono
  const mono = new Float32Array(totalSamples);
  const numChannels = audioBuffer.numberOfChannels;
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < totalSamples; i++) {
      mono[i] += channelData[i];
    }
  }
  if (numChannels > 1) {
    for (let i = 0; i < totalSamples; i++) {
      mono[i] /= numChannels;
    }
  }

  // Hann window
  const window = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
  }

  // Per-band state (mirrors BeatDetector)
  const bandState = BANDS.map(() => ({
    smoothed: 0,
    peakDiff: AUDIO_INITIAL_PEAK_DIFF,
    lastOnsetTime: 0,
  }));
  let lastGlobalOnsetMs = 0;

  const notes: BeatmapNote[] = [];
  const numBins = fftSize / 2;
  const magnitudes = new Float32Array(numBins);

  // Sliding smoothing for magnitudes (simulates AnalyserNode smoothingTimeConstant)
  const smoothedMags = new Float32Array(numBins);

  for (let offset = 0; offset + fftSize <= totalSamples; offset += hopSize) {
    const timeMs = (offset / sampleRate) * 1000;

    // Apply window and compute FFT magnitudes
    const real = new Float32Array(fftSize);
    const imag = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      real[i] = mono[offset + i] * window[i];
    }
    fft(real, imag, fftSize);

    // Convert to dB-like scale (0-255 range matching AnalyserNode getByteFrequencyData)
    for (let i = 0; i < numBins; i++) {
      const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / fftSize;
      const db = 20 * Math.log10(Math.max(mag, 1e-10));
      // Map roughly to 0-255 like AnalyserNode (minDecibels=-100, maxDecibels=-30)
      const normalized = Math.max(0, Math.min(255, ((db + 100) / 70) * 255));
      smoothedMags[i] = AUDIO_SMOOTHING_TIME_CONSTANT * smoothedMags[i] +
        (1 - AUDIO_SMOOTHING_TIME_CONSTANT) * normalized;
      magnitudes[i] = smoothedMags[i];
    }

    // Multi-band onset detection
    for (const band of BANDS) {
      const state = bandState[band.lane];
      const energy = bandEnergy(magnitudes, band.bins[0], band.bins[1]);

      if (state.smoothed === 0) {
        state.smoothed = energy;
      } else {
        state.smoothed = state.smoothed * AUDIO_SMOOTH_KEEP + energy * AUDIO_SMOOTH_ADD;
      }

      const diffVal = energy - state.smoothed;
      state.peakDiff = state.peakDiff * AUDIO_PEAK_KEEP + Math.max(diffVal, 0) * AUDIO_PEAK_ADD;

      const threshold = Math.max(AUDIO_THRESHOLD_MIN, state.peakDiff * AUDIO_THRESHOLD_PEAK_FACTOR);

      const timeSinceAnySpawn = Math.min(
        ...bandState.map(s => timeMs - s.lastOnsetTime)
      );
      const effectiveThreshold = timeSinceAnySpawn > AUDIO_SAFETY_TIMEOUT_MS
        ? threshold * AUDIO_SAFETY_THRESHOLD_SCALE
        : threshold;

      if (
        diffVal > effectiveThreshold &&
        timeMs - state.lastOnsetTime > AUDIO_ONSET_COOLDOWN_MS &&
        timeMs - lastGlobalOnsetMs > diff.globalCooldownMs
      ) {
        // Spawn decision
        if (Math.random() > diff.spawnChance) {
          state.lastOnsetTime = timeMs;
          state.smoothed += diffVal * AUDIO_ONSET_SMOOTH_BOOST;
          continue;
        }

        state.lastOnsetTime = timeMs;
        lastGlobalOnsetMs = timeMs;
        state.smoothed += diffVal * AUDIO_ONSET_SMOOTH_BOOST;

        if (Math.random() < diff.simultaneousChance) {
          const s1 = Math.floor(Math.random() * SECTORS.length);
          const s2 = (s1 + Math.floor(Math.random() * (SECTORS.length - 1)) + 1) % SECTORS.length;
          notes.push({ timeMs, sectorIndex: s1, noteType: 'simultaneous' });
          notes.push({ timeMs, sectorIndex: s2, noteType: 'simultaneous' });
        } else {
          const sectorIndex = Math.floor(Math.random() * SECTORS.length);
          notes.push({ timeMs, sectorIndex, noteType: 'single' });
        }
      }
    }
  }

  // Sort by time
  notes.sort((a, b) => a.timeMs - b.timeMs);

  return { notes, totalNotes: notes.length };
}

function bandEnergy(magnitudes: Float32Array, startBin: number, endBin: number): number {
  let sum = 0;
  for (let i = startBin; i <= endBin; i++) {
    sum += magnitudes[i];
  }
  return sum / (endBin - startBin + 1);
}

/** In-place Cooley-Tukey FFT (radix-2 DIT) */
function fft(real: Float32Array, imag: Float32Array, n: number): void {
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  // Butterfly stages
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = -2 * Math.PI / len;
    const wReal = Math.cos(angle);
    const wImag = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curReal = 1, curImag = 0;
      for (let j = 0; j < halfLen; j++) {
        const tReal = curReal * real[i + j + halfLen] - curImag * imag[i + j + halfLen];
        const tImag = curReal * imag[i + j + halfLen] + curImag * real[i + j + halfLen];
        real[i + j + halfLen] = real[i + j] - tReal;
        imag[i + j + halfLen] = imag[i + j] - tImag;
        real[i + j] += tReal;
        imag[i + j] += tImag;
        const newReal = curReal * wReal - curImag * wImag;
        curImag = curReal * wImag + curImag * wReal;
        curReal = newReal;
      }
    }
  }
}
