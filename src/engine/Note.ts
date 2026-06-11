import {
  TUNNEL_RADIUS, NOTE_SPAWN_DISTANCE, NOTE_HIT_DISTANCE,
  SECTORS, NOTE_COLOR_SINGLE, NOTE_COLOR_SIMULTANEOUS,
  type NoteType,
} from './config.js';
import { getDifficulty } from './difficulty.js';

let _id: number = 0;

export type NoteState = 'active' | 'hit' | 'miss';

export class Note {
  readonly id: number;
  readonly sectorIndex: number;
  spawnTime: number;
  readonly spawnZ: number;
  readonly noteType: NoteType;
  readonly color: [number, number, number];
  // Captured at spawn so a mid-game difficulty change doesn't warp
  // in-flight notes — they finish at their original speed.
  readonly travelTime: number;
  state: NoteState;
  hitTime: number | null;

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
    this.travelTime = getDifficulty().noteTravelTime;
    this.state = 'active';
    this.hitTime = null;

    const sector = SECTORS[sectorIndex];
    this.wallX = Math.cos(sector.angle) * TUNNEL_RADIUS;
    this.wallY = Math.sin(sector.angle) * TUNNEL_RADIUS;
  }

  /** Current z-position of the note (constant-speed approach in camera-relative space) */
  currentZ(now: number, cameraZ: number): number {
    const elapsed = (now - this.spawnTime) / 1000;
    const progress = elapsed / this.travelTime;
    const initialRelativeDistance = NOTE_SPAWN_DISTANCE - NOTE_HIT_DISTANCE;
    const relativeDistanceToHitZone = initialRelativeDistance * (1 - progress);
    return cameraZ + NOTE_HIT_DISTANCE + relativeDistanceToHitZone;
  }

  /** Distance from the hit zone center (positive = still approaching, negative = passed) */
  distanceToHitZone(now: number, cameraZ: number): number {
    const noteZ = this.currentZ(now, cameraZ);
    const hitZoneZ = cameraZ + NOTE_HIT_DISTANCE;
    return noteZ - hitZoneZ;
  }
}
