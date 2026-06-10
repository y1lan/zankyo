export class BeatDetector {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.dataArray = null;
    this.isPlaying = false;
    this.onBeat = null;
    this.onFrequencyData = null;

    this.lowFreqAvg = 0;
    this.midFreqAvg = 0;
    this.highFreqAvg = 0;

    this.lastBeatTime = 0;
    this.beatCooldown = 200; // ms minimum between beats
  }

  async loadAudio(file) {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = audioBuffer;

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.4;

    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  play() {
    if (!this.source) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.source.start(0);
    this.isPlaying = true;
    this.analyze();
  }

  analyze() {
    if (!this.isPlaying) return;

    requestAnimationFrame(() => this.analyze());

    this.analyser.getByteFrequencyData(this.dataArray);

    const bassBins = this.dataArray.slice(0, 3);
    const bassAvg = bassBins.reduce((a, b) => a + b, 0) / bassBins.length;

    this.lowFreqAvg = this.getRangeAverage(0, 10);
    this.midFreqAvg = this.getRangeAverage(10, 50);
    this.highFreqAvg = this.getRangeAverage(50, 128);

    if (this.onFrequencyData) {
      this.onFrequencyData({
        low: this.lowFreqAvg,
        mid: this.midFreqAvg,
        high: this.highFreqAvg,
        bass: bassAvg,
      });
    }

    const now = performance.now();
    if (bassAvg > 200 && now - this.lastBeatTime > this.beatCooldown && this.onBeat) {
      this.lastBeatTime = now;
      this.onBeat(bassAvg);
    }
  }

  getRangeAverage(start, end) {
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += this.dataArray[i];
    }
    return sum / (end - start);
  }
}
