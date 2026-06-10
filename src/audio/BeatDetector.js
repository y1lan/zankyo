const BANDS = [
  { name: 'bass',   bins: [0, 1],   label: 'Kick',       lane: 0 },
  { name: 'lowMid', bins: [2, 5],   label: 'Snare/Tom',  lane: 1 },
  { name: 'highMid',bins: [6, 20],  label: 'Percussion', lane: 2 },
  { name: 'high',   bins: [21, 64], label: 'Hi-hat',     lane: 3 },
];

export class BeatDetector {
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
      lastOnsetTime: 0,
      lastSpawnTime: 0,
    }));

    this.lowFreqAvg = 0;
    this.midFreqAvg = 0;
    this.highFreqAvg = 0;
  }

  async loadAudio(file) {
    this.stop();

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

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
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.3;

    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.bandState = BANDS.map(() => ({
      smoothed: 0,
      lastOnsetTime: 0,
      lastSpawnTime: 0,
    }));
  }

  play() {
    if (!this.source) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.source.start(0);
    this.isPlaying = true;
    this.scheduleAnalyze();
  }

  stop() {
    this.isPlaying = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    try {
      if (this.source) this.source.stop();
    } catch (_) {}
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
    this.source = null;
    this.analyser = null;
    this.audioContext = null;
  }

  scheduleAnalyze() {
    this.rafId = requestAnimationFrame(() => this.analyze());
  }

  analyze() {
    if (!this.isPlaying || !this.analyser) return;
    this.scheduleAnalyze();

    this.analyser.getByteFrequencyData(this.dataArray);

    const now = performance.now();

    // Multi-band onset detection via spectral difference
    const cooldown = 130;
    const safetyTimeout = 600; // force spawn if nothing for 600ms

    for (const band of BANDS) {
      const state = this.bandState[band.lane];
      const energy = this.bandEnergy(band.bins[0], band.bins[1]);

      // Very slow smoothing: tracks the background level
      if (state.smoothed === 0) {
        state.smoothed = energy;
      } else {
        state.smoothed = state.smoothed * 0.97 + energy * 0.03;
      }

      // Onset = positive energy difference vs smoothed background
      const diff = energy - state.smoothed;

      // Per-band minimum thresholds (higher bands naturally quieter)
      const minDiff = band.lane <= 1 ? 20 : 12;

      // Safety net: if no note spawned in any lane for safetyTimeout, lower the bar
      const timeSinceAnySpawn = Math.min(
        ...this.bandState.map((s) => now - s.lastSpawnTime)
      );
      const effectiveDiff = timeSinceAnySpawn > safetyTimeout ? diff * 1.5 : diff;
      const effectiveMin = timeSinceAnySpawn > safetyTimeout ? minDiff * 0.5 : minDiff;

      if (
        effectiveDiff > effectiveMin &&
        now - state.lastOnsetTime > cooldown &&
        this.onBeat
      ) {
        state.lastOnsetTime = now;
        state.lastSpawnTime = now;
        // Boost smoothed to prevent immediate re-trigger
        state.smoothed += diff * 0.3;
        this.onBeat(energy, band.lane);
      }
    }

    // Full-range averages for visual effects
    this.lowFreqAvg = this.rangeAvg(0, 10);
    this.midFreqAvg = this.rangeAvg(10, 50);
    this.highFreqAvg = this.rangeAvg(50, 128);

    if (this.onFrequencyData) {
      this.onFrequencyData({
        low: this.lowFreqAvg,
        mid: this.midFreqAvg,
        high: this.highFreqAvg,
      });
    }
  }

  bandEnergy(startBin, endBin) {
    let sum = 0;
    for (let i = startBin; i <= endBin; i++) {
      sum += this.dataArray[i];
    }
    return sum / (endBin - startBin + 1);
  }

  rangeAvg(start, end) {
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += this.dataArray[i];
    }
    return sum / (end - start);
  }
}

export { BANDS };
