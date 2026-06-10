import { Note } from './Note.js';
import { MISS_Z } from './config.js';

export class NoteSpawner {
  constructor(scene) {
    this.scene = scene;
    this.notes = [];
  }

  spawn(laneIndex) {
    const note = new Note(this.scene, laneIndex);
    this.notes.push(note);
    return note;
  }

  update(now) {
    const missed = [];
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i];
      if (n.hit || n.missed) {
        n.destroy();
        this.notes.splice(i, 1);
        continue;
      }
      n.update(now);
      if (n.z() > MISS_Z) {
        n.missed = true;
        missed.push(n);
        n.destroy();
        this.notes.splice(i, 1);
      }
    }
    return missed;
  }

  findInZone(laneIndex, zoneMin, zoneMax) {
    let best = null;
    let bestDist = Infinity;
    for (const n of this.notes) {
      if (n.hit || n.missed || n.laneIndex !== laneIndex) continue;
      const z = n.z();
      if (z >= zoneMin && z <= zoneMax) {
        const d = Math.abs(z - 10);
        if (d < bestDist) { bestDist = d; best = n; }
      }
    }
    return best;
  }

  clear() {
    for (const n of this.notes) n.destroy();
    this.notes = [];
  }
}
