// Note flight
export const NOTE_SPAWN_Z: number = -100;
export const NOTE_END_Z: number = 30;
export const NOTE_TRAVEL_TIME: number = 3.5;

// Hit windows (z-axis)
export const HIT_ZONE_MIN: number = 6;
export const HIT_ZONE_MAX: number = 13;
export const PERFECT_ZONE_MIN: number = 9;
export const PERFECT_ZONE_MAX: number = 11;
export const MISS_Z: number = 17;

// Lanes
export interface Lane {
  readonly key: string;
  readonly x: number;
  readonly color: number;
  readonly label: string;
}

export const LANES = [
  { key: 'KeyD', x: -6, color: 0x44aaff, label: 'D' },
  { key: 'KeyF', x: -2, color: 0xff44aa, label: 'F' },
  { key: 'KeyJ', x:  2, color: 0xaaff44, label: 'J' },
  { key: 'KeyK', x:  6, color: 0xffaa44, label: 'K' },
] as const;

// Scoring
export const SCORE_PERFECT: number = 300;
export const SCORE_GOOD: number = 100;
