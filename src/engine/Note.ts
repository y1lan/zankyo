import {
  TUNNEL_RADIUS, NOTE_SPAWN_DISTANCE, NOTE_HIT_DISTANCE,
  NOTE_TRAVEL_TIME, SECTORS, NOTE_COLOR_SINGLE, NOTE_COLOR_SIMULTANEOUS,
  type NoteType,
} from './config.js';

let _id: number = 0;

export type NoteState = 'active' | 'hit' | 'miss';

export class Note {
  readonly id: number;
  readonly sectorIndex: number;
  readonly spawnTime: number;
  readonly spawnZ: number;
  readonly noteType: NoteType;
  readonly color: [number, number, number];
  state: NoteState;

  // Position on tunnel wall (x, y derived from sector angle)
  readonly wallX: number;
  readonly wallY: number;

  constructor(sectorIndex: number, cameraZ: number, noteType: NoteType = 'single') {
    this.id = _id++;
    this.sectorIndex = sectorIndex;
    this.spawnTime = performance.now();
    this.spawnZ = cameraZ + NOTE_SPAWN_DISTANCE;
    this.noteType = noteType;
    this.color = noteType === 'single' ? NOTE_COLOR_SINGLE : NOTE_COLOR_SIMULTANEOUS;
    this.state = 'active';

    const sector = SECTORS[sectorIndex];
    this.wallX = Math.cos(sector.angle) * TUNNEL_RADIUS;
    this.wallY = Math.sin(sector.angle) * TUNNEL_RADIUS;
  }

  /** Current z-position of the note (moves toward camera over time) */
  currentZ(now: number): number {
    const elapsed = (now - this.spawnTime) / 1000;
    const progress = elapsed / NOTE_TRAVEL_TIME;
    const totalDistance = NOTE_SPAWN_DISTANCE - NOTE_HIT_DISTANCE;
    return this.spawnZ - progress * totalDistance;
  }

  /** Distance from the hit zone center (positive = still approaching, negative = passed) */
  distanceToHitZone(now: number, cameraZ: number): number {
    const noteZ = this.currentZ(now);
    const hitZoneZ = cameraZ + NOTE_HIT_DISTANCE;
    return noteZ - hitZoneZ;
  }
}
