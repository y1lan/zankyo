import { bus } from '../core/bus.js';
import type { Bus } from '../core/bus.js';
import { NoteSpawner } from './NoteSpawner.js';
import { Note } from './Note.js';
import {
  HIT_ZONE_MIN, HIT_ZONE_MAX,
  PERFECT_ZONE_MIN, PERFECT_ZONE_MAX,
  SCORE_PERFECT, SCORE_GOOD,
  LANES,
} from './config.js';

const KEY_TO_LANE: Record<string, number> = Object.fromEntries(
  LANES.map((l, i) => [l.key, i])
);

export class HitJudge {
  private bus: Bus;
  private noteSpawner: NoteSpawner;
  score: number;
  combo: number;
  maxCombo: number;

  constructor(bus: Bus, noteSpawner: NoteSpawner) {
    this.bus = bus;
    this.noteSpawner = noteSpawner;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      const li = KEY_TO_LANE[e.code];
      if (li !== undefined) this._handle(li);
    });
  }

  reset(): void {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
  }

  private _handle(laneIndex: number): void {
    const note = this.noteSpawner.findInZone(laneIndex, HIT_ZONE_MIN, HIT_ZONE_MAX);
    if (note) {
      this._hit(note);
    } else {
      this._whiff();
    }
  }

  private _hit(note: Note): void {
    note.hit = true;
    const z = note.z();

    let quality: 'perfect' | 'good';
    let pts: number;
    let color: string;
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

  private _whiff(): void {
    this.combo = 0;
    this.bus.emit('game:score', { score: this.score, combo: 0 });
    this.bus.emit('game:judgement', { text: 'WHIFF', color: '#888888' });
  }

  miss(): void {
    this.combo = 0;
    this.bus.emit('game:score', { score: this.score, combo: 0 });
    this.bus.emit('game:judgement', { text: 'MISS', color: '#ff3333' });
    this.bus.emit('game:miss');
  }
}
