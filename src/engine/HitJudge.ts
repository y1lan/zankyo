import { bus } from '../core/bus.js';
import type { Bus } from '../core/bus.js';
import { NoteSpawner } from './NoteSpawner.js';
import { Note } from './Note.js';
import {
  CRITICAL_ZONE_RADIUS, PERFECT_ZONE_RADIUS,
  GREAT_ZONE_RADIUS, GOOD_ZONE_RADIUS, HIT_ZONE_RADIUS,
  SCORE_CRITICAL_PERFECT, SCORE_PERFECT, SCORE_GREAT, SCORE_GOOD,
  SECTORS, RANKS, HIT_RING_FRACTION, RING_TOUCH_TOLERANCE, ACHIEVEMENT_MAX_PERCENT,
} from './config.js';

export type Judgement = 'critical' | 'perfect' | 'great' | 'good' | 'miss';

export class HitJudge {
  private bus: Bus;
  private noteSpawner: NoteSpawner;
  score: number;
  combo: number;
  maxCombo: number;
  totalNotes: number;
  judgements: Record<Judgement, number>;

  constructor(bus: Bus, noteSpawner: NoteSpawner) {
    this.bus = bus;
    this.noteSpawner = noteSpawner;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalNotes = 0;
    this.judgements = { critical: 0, perfect: 0, great: 0, good: 0, miss: 0 };

    this._setupTouch();
  }

  /** Get ring radius in screen pixels */
  private _ringPixelRadius(): number {
    const smallSide = Math.min(window.innerWidth, window.innerHeight);
    return HIT_RING_FRACTION * smallSide * 0.5;
  }

  private _setupTouch(): void {
    const onTouch = (x: number, y: number) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ringR = this._ringPixelRadius();

      // Only register hits near the ring
      if (Math.abs(dist - ringR) > ringR * RING_TOUCH_TOLERANCE) return;

      const sectorIndex = this._screenToSector(x, y);
      this._handle(sectorIndex);
    };

    window.addEventListener('touchstart', (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        onTouch(t.clientX, t.clientY);
      }
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 0) {
        onTouch(e.clientX, e.clientY);
      }
    });
  }

  /** Map screen position to sector index based on angle from screen center */
  private _screenToSector(x: number, y: number): number {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dx = x - cx;
    const dy = -(y - cy); // flip y (screen y is inverted)
    // Shift by half a sector (PI/8) to center tap zones on dots
    const angle = Math.atan2(dy, dx) + Math.PI / 8;

    // Find closest sector
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < SECTORS.length; i++) {
      let diff = Math.abs(angle - SECTORS[i].angle);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  reset(): void {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalNotes = 0;
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
    let pts: number;
    let color: string;
    let text: string;

    if (dist <= CRITICAL_ZONE_RADIUS) {
      judgement = 'critical';
      pts = SCORE_CRITICAL_PERFECT;
      color = '#ffee00';
      text = 'CRITICAL PERFECT';
    } else if (dist <= PERFECT_ZONE_RADIUS) {
      judgement = 'perfect';
      pts = SCORE_PERFECT;
      color = '#ffaa00';
      text = 'PERFECT';
    } else if (dist <= GREAT_ZONE_RADIUS) {
      judgement = 'great';
      pts = SCORE_GREAT;
      color = '#ff44aa';
      text = 'GREAT';
    } else {
      judgement = 'good';
      pts = SCORE_GOOD;
      color = '#88ff88';
      text = 'GOOD';
    }

    note.state = 'hit';
    this.totalNotes++;
    this.judgements[judgement]++;
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.score += pts;

    this.bus.emit('game:hit', { note, quality: judgement === 'critical' || judgement === 'perfect' ? 'perfect' : 'good' });
    this.bus.emit('game:score', { score: this.score, combo: this.combo });
    this.bus.emit('game:judgement', { text, color });
  }

  miss(): void {
    this.totalNotes++;
    this.judgements.miss++;
    this.combo = 0;
    this.bus.emit('game:score', { score: this.score, combo: 0 });
    this.bus.emit('game:judgement', { text: 'MISS', color: '#ff3333' });
    this.bus.emit('game:miss');
  }

  /** Get current achievement percentage (0-101) */
  getAchievement(): number {
    if (this.totalNotes === 0) return 0;
    const maxPossible = this.totalNotes * SCORE_CRITICAL_PERFECT;
    return (this.score / maxPossible) * ACHIEVEMENT_MAX_PERCENT;
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
