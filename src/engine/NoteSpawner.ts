import { Note } from './Note.js';
import {
  HIT_ZONE_RADIUS, MISS_DISTANCE, HIT_NOTE_HOLD_MS,
  NOTE_SPAWN_DISTANCE, type NoteType,
} from './config.js';
import { getDifficulty } from './difficulty.js';

export class NoteSpawner {
  notes: Note[];
  cameraZ: number;

  constructor() {
    this.notes = [];
    this.cameraZ = 0;
  }

  /** True if a new note in this sector wouldn't pile onto an existing one. */
  canSpawn(sectorIndex: number): boolean {
    const spawnZ = this.cameraZ + NOTE_SPAWN_DISTANCE;
    const now = performance.now();
    const minGap = getDifficulty().minSameSectorZGap;
    for (const n of this.notes) {
      if (n.state !== 'active' || n.sectorIndex !== sectorIndex) continue;
      if (spawnZ - n.currentZ(now, this.cameraZ) < minGap) return false;
    }
    return true;
  }

  spawn(sectorIndex: number, noteType: NoteType = 'single'): Note | null {
    if (!this.canSpawn(sectorIndex)) return null;
    const note = new Note(sectorIndex, this.cameraZ, noteType);
    this.notes.push(note);
    return note;
  }

  /** Spawn a simultaneous pair in two different sectors. Skipped entirely
   *  if either sector would cluster — pairs are all-or-nothing. */
  spawnPair(sector1: number, sector2: number): [Note, Note] | null {
    if (!this.canSpawn(sector1) || !this.canSpawn(sector2)) return null;
    const a = new Note(sector1, this.cameraZ, 'simultaneous');
    const b = new Note(sector2, this.cameraZ, 'simultaneous');
    this.notes.push(a, b);
    return [a, b];
  }

  /** Update and return missed notes */
  update(now: number): Note[] {
    const missed: Note[] = [];
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i];
      if (n.state === 'hit') {
        if (n.hitTime !== null && now - n.hitTime >= HIT_NOTE_HOLD_MS) {
          this.notes.splice(i, 1);
        }
        continue;
      }
      if (n.state !== 'active') {
        this.notes.splice(i, 1);
        continue;
      }
      const dist = n.distanceToHitZone(now, this.cameraZ);
      if (dist < MISS_DISTANCE) {
        n.state = 'miss';
        missed.push(n);
        this.notes.splice(i, 1);
      }
    }
    return missed;
  }

  /** Find closest active note in hit zone for a given sector */
  findInZone(sectorIndex: number, now: number): Note | null {
    let best: Note | null = null;
    let bestDist: number = Infinity;
    for (const n of this.notes) {
      if (n.state !== 'active' || n.sectorIndex !== sectorIndex) continue;
      const dist = n.distanceToHitZone(now, this.cameraZ);
      const absDist = Math.abs(dist);
      if (absDist <= HIT_ZONE_RADIUS && absDist < bestDist) {
        bestDist = absDist;
        best = n;
      }
    }
    return best;
  }

  /** Shift all note timestamps forward by ms to compensate for paused wall-clock time */
  shiftSpawnTimes(ms: number): void {
    for (const note of this.notes) {
      note.spawnTime += ms;
      if (note.hitTime !== null) note.hitTime += ms;
    }
  }

  clear(): void {
    this.notes = [];
  }
}
