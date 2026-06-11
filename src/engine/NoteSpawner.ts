import { Note } from './Note.js';
import { HIT_ZONE_RADIUS, MISS_DISTANCE, type NoteType } from './config.js';

export class NoteSpawner {
  notes: Note[];
  cameraZ: number;

  constructor() {
    this.notes = [];
    this.cameraZ = 0;
  }

  spawn(sectorIndex: number, noteType: NoteType = 'single'): Note {
    const note = new Note(sectorIndex, this.cameraZ, noteType);
    this.notes.push(note);
    return note;
  }

  /** Spawn a simultaneous pair in two different sectors */
  spawnPair(sector1: number, sector2: number): [Note, Note] {
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

  clear(): void {
    this.notes = [];
  }
}
