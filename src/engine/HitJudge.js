import {
  HIT_ZONE_MIN, HIT_ZONE_MAX,
  PERFECT_ZONE_MIN, PERFECT_ZONE_MAX,
  SCORE_PERFECT, SCORE_GOOD,
  LANES,
} from './config.js';

const KEY_TO_LANE = Object.fromEntries(LANES.map((l, i) => [l.key, i]));

export class HitJudge {
  constructor(bus, noteSpawner) {
    this.bus = bus;
    this.noteSpawner = noteSpawner;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const li = KEY_TO_LANE[e.code];
      if (li !== undefined) this._handle(li);
    });
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
  }

  _handle(laneIndex) {
    const note = this.noteSpawner.findInZone(laneIndex, HIT_ZONE_MIN, HIT_ZONE_MAX);
    if (note) {
      this._hit(note);
    } else {
      this._whiff();
    }
  }

  _hit(note) {
    note.hit = true;
    const z = note.z();

    let quality, pts, color;
    if (z >= PERFECT_ZONE_MIN && z <= PERFECT_ZONE_MAX) {
      quality = 'perfect';
      pts = SCORE_PERFECT;
      color = '#ffdd00';
    } else {
      quality = 'good';
      pts = SCORE_GOOD;
      color = '#ffffff';
    }

    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.score += pts * (1 + Math.floor(this.combo / 10));

    note.destroy();
    this.bus.emit('game:hit', { position: note.position(), quality });
    this.bus.emit('game:score', { score: this.score, combo: this.combo });
    this.bus.emit('game:judgement', { text: quality === 'perfect' ? 'PERFECT!' : 'GOOD', color });
  }

  _whiff() {
    this.combo = 0;
    this.bus.emit('game:score', { score: this.score, combo: 0 });
    this.bus.emit('game:judgement', { text: 'WHIFF', color: '#888888' });
  }

  miss() {
    this.combo = 0;
    this.bus.emit('game:score', { score: this.score, combo: 0 });
    this.bus.emit('game:judgement', { text: 'MISS', color: '#ff3333' });
    this.bus.emit('game:miss');
  }
}
