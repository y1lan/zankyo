import {
  TUNNEL_RADIUS, NOTE_SPAWN_DISTANCE, NOTE_HIT_DISTANCE,
  SECTORS, NOTE_COLOR_SINGLE, NOTE_COLOR_SIMULTANEOUS,
  NOTE_CURVE_IN, NOTE_CURVE_OUT,
  type NoteType,
} from './Config.js';
import { getDifficulty } from './Difficulty.js';
import { getFlowSpeed } from './FlowSpeed.js';

let _id: number = 0;

export type NoteState = 'active' | 'hit' | 'miss' | 'fly';

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
  flyStartTime: number | null;

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
    this.travelTime = getDifficulty().noteTravelTime / getFlowSpeed();
    this.state = 'active';
    this.hitTime = null;
    this.flyStartTime = null;

    const sector = SECTORS[sectorIndex];
    this.wallX = Math.cos(sector.angle) * TUNNEL_RADIUS;
    this.wallY = Math.sin(sector.angle) * TUNNEL_RADIUS;
  }

  /** Visual z-position: S-curve approach, then linear fly-past after hit zone */
  currentZ(now: number, cameraZ: number): number {
    const elapsed = (now - this.spawnTime) / 1000;
    const t = elapsed / this.travelTime;
    const D = NOTE_SPAWN_DISTANCE - NOTE_HIT_DISTANCE;

    if (t <= 1.0) {
      const tA = Math.pow(t, NOTE_CURVE_IN);
      const oB = Math.pow(1 - t, NOTE_CURVE_OUT);
      const easedT = tA / (tA + oB);
      return cameraZ + NOTE_HIT_DISTANCE + D * (1 - easedT);
    } else {
      // Linear continuation: note flies toward and past the camera
      const flySpeed = D / this.travelTime;
      return cameraZ + NOTE_HIT_DISTANCE - flySpeed * (elapsed - this.travelTime);
    }
  }

  /** Linear distance for hit detection and miss detection (matches visual at t=1) */
  distanceToHitZone(now: number, cameraZ: number): number {
    const elapsed = (now - this.spawnTime) / 1000;
    const progress = elapsed / this.travelTime;
    return (NOTE_SPAWN_DISTANCE - NOTE_HIT_DISTANCE) * (1 - progress);
  }
}
