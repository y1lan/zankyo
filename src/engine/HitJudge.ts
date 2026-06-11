import { bus } from '../core/Bus.js';
import type { Bus } from '../core/Bus.js';
import { NoteSpawner } from './NoteSpawner.js';
import { Note } from './Note.js';
import {
  CRITICAL_ZONE_RADIUS, PERFECT_ZONE_RADIUS,
  GREAT_ZONE_RADIUS, GOOD_ZONE_RADIUS, HIT_ZONE_RADIUS,
  WEIGHT_CRITICAL_PERFECT, WEIGHT_PERFECT, WEIGHT_GREAT, WEIGHT_GOOD,
  SECTORS, RANKS, HIT_RING_FRACTION, SHADER_FOV, NOTE_HIT_DISTANCE,
  RING_TOUCH_TOLERANCE, ACHIEVEMENT_MAX_PERCENT,
} from './Config.js';

export type Judgement = 'critical' | 'perfect' | 'great' | 'good' | 'miss';

declare global {
  interface Window {
    __zankyoHitJudgeInputController?: AbortController;
  }
}

// KeyboardEvent.code → sector index. Ring is rotated π/8 clockwise so
// sectors 0–3 sit on the right half (top→bottom) and 4–7 on the left.
// Index fingers (F, J) take the top of each side; pinkies the bottom.
export const KEY_TO_SECTOR: Record<string, number> = {
  KeyF: 7,       // left side, top
  KeyD: 6,       // left side, upper
  KeyS: 5,       // left side, lower
  KeyA: 4,       // left side, bottom
  KeyJ: 0,       // right side, top
  KeyK: 1,       // right side, upper
  KeyL: 2,       // right side, lower
  Semicolon: 3,  // right side, bottom
};

export class HitJudge {
  private bus: Bus;
  private noteSpawner: NoteSpawner;
  weightSum: number;
  combo: number;
  maxCombo: number;
  totalNotes: number;
  hitNotes: number;
  beatmapLength: number;
  judgements: Record<Judgement, number>;

  constructor(bus: Bus, noteSpawner: NoteSpawner) {
    this.bus = bus;
    this.noteSpawner = noteSpawner;
    this.weightSum = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalNotes = 0;
    this.hitNotes = 0;
    this.beatmapLength = 0;
    this.judgements = { critical: 0, perfect: 0, great: 0, good: 0, miss: 0 };

    this._setupTouch();
    this._setupKeyboard();
  }

  setBeatmapLength(n: number): void {
    this.beatmapLength = n;
  }

  private _setupKeyboard(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (document.activeElement?.tagName === 'INPUT') return;
      const sectorIndex = KEY_TO_SECTOR[e.code];
      if (sectorIndex === undefined) return;
      e.preventDefault();
      this.bus.emit('input:key', { sectorIndex });
      this._handle(sectorIndex);
    });
  }

  /** Get ring radius in screen pixels */
  private _ringPixelRadius(): number {
    // Match shader projection exactly: uv uses resolution.y as the scale basis.
    const ringWorldRadius = HIT_RING_FRACTION * SHADER_FOV * NOTE_HIT_DISTANCE * 0.5;
    const worldToPixel = window.innerHeight / (SHADER_FOV * NOTE_HIT_DISTANCE);
    return ringWorldRadius * worldToPixel;
  }

  private _setupTouch(): void {
    window.__zankyoHitJudgeInputController?.abort();
    const inputController = new AbortController();
    window.__zankyoHitJudgeInputController = inputController;

    let lastTouchMs = 0;

    const onTouch = (x: number, y: number): boolean => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ringR = this._ringPixelRadius();

      // Only register hits near the ring
      if (Math.abs(dist - ringR) > ringR * RING_TOUCH_TOLERANCE) return false;

      const sectorIndex = this._screenToSector(x, y);
      this.bus.emit('input:key', { sectorIndex });
      this._handle(sectorIndex);
      return true;
    };

    window.addEventListener('touchstart', (e: TouchEvent) => {
      lastTouchMs = performance.now();
      let consumed = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        consumed = onTouch(t.clientX, t.clientY) || consumed;
      }
      if (consumed) e.preventDefault();
    }, { passive: false, signal: inputController.signal });

    window.addEventListener('mousedown', (e: MouseEvent) => {
      // Ignore synthetic mouse events that follow touch on hybrid devices.
      if (performance.now() - lastTouchMs < 500) return;
      if (e.button === 0) {
        onTouch(e.clientX, e.clientY);
      }
    }, { signal: inputController.signal });
  }

  /** Map screen position to sector index based on angle from screen center */
  private _screenToSector(x: number, y: number): number {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dx = x - cx;
    const dy = -(y - cy); // flip y (screen y is inverted)
    const angle = Math.atan2(dy, dx);

    let bestIndex = 0;
    let smallestDelta = Infinity;
    for (let i = 0; i < SECTORS.length; i++) {
      const sectorAngle = SECTORS[i].angle;
      // Wrap-safe shortest angular distance.
      const delta = Math.atan2(
        Math.sin(angle - sectorAngle),
        Math.cos(angle - sectorAngle),
      );
      const absDelta = Math.abs(delta);
      if (absDelta < smallestDelta) {
        smallestDelta = absDelta;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  reset(): void {
    this.weightSum = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalNotes = 0;
    this.hitNotes = 0;
    this.judgements = { critical: 0, perfect: 0, great: 0, good: 0, miss: 0 };
  }

  private _handle(sectorIndex: number): void {
    const now = performance.now();
    const note = this.noteSpawner.findInZone(sectorIndex, now);
    if (note) {
      this._hit(note, now);
    }
    // No penalty for tapping empty space (maimai-style)
  }

  private _hit(note: Note, now: number): void {
    const dist = Math.abs(note.distanceToHitZone(now, this.noteSpawner.cameraZ));

    let judgement: Judgement;
    let weight: number;
    let color: string;
    let text: string;

    if (dist <= CRITICAL_ZONE_RADIUS) {
      judgement = 'critical';
      weight = WEIGHT_CRITICAL_PERFECT;
      color = '#ffee00';
      text = 'CRITICAL PERFECT';
    } else if (dist <= PERFECT_ZONE_RADIUS) {
      judgement = 'perfect';
      weight = WEIGHT_PERFECT;
      color = '#ffaa00';
      text = 'PERFECT';
    } else if (dist <= GREAT_ZONE_RADIUS) {
      judgement = 'great';
      weight = WEIGHT_GREAT;
      color = '#ff44aa';
      text = 'GREAT';
    } else {
      judgement = 'good';
      weight = WEIGHT_GOOD;
      color = '#88ff88';
      text = 'GOOD';
    }

    note.state = 'hit';
    note.hitTime = now;
    this.totalNotes++;
    this.hitNotes++;
    this.judgements[judgement]++;
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.weightSum += weight;

    this.bus.emit('game:hit', { note, quality: judgement === 'critical' || judgement === 'perfect' ? 'perfect' : 'good' });
    this.bus.emit('game:score', { score: this.getAchievement(), combo: this.combo });
    this.bus.emit('game:judgement', { text, color });
  }

  miss(): void {
    this.totalNotes++;
    this.judgements.miss++;
    this.combo = 0;
    this.bus.emit('game:score', { score: this.getAchievement(), combo: 0 });
    this.bus.emit('game:judgement', { text: 'MISS', color: '#888888' });
    this.bus.emit('game:miss');
  }

  /** Get current achievement percentage (0-101).
   *  101 / beatmapLength = score per critical perfect note.
   *  weightSum accumulates each note's fractional contribution.
   *  All Critical Perfect → weightSum = beatmapLength → achievement = 101%. */
  getAchievement(): number {
    if (this.beatmapLength === 0) return 0;
    return Math.min((this.weightSum / this.beatmapLength) * ACHIEVEMENT_MAX_PERCENT, ACHIEVEMENT_MAX_PERCENT);
  }

  /** Get current rank */
  getRank(): string {
    const achievement = this.getAchievement();
    for (const rank of RANKS) {
      if (achievement >= rank.threshold) return rank.name;
    }
    return 'D';
  }
}
