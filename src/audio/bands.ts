// Four frequency bands mapped to lanes.
// fftSize=256 -> 128 bins, each ~172 Hz.

export interface Band {
  name: string;
  bins: [number, number];
  lane: number;
}

export const BANDS: readonly Band[] = [
  { name: 'bass',    bins: [0, 1],  lane: 0 }, // 0-172 Hz      -> D (blue)
  { name: 'lowMid',  bins: [2, 5],  lane: 1 }, // 172-861 Hz    -> F (pink)
  { name: 'highMid', bins: [6, 20], lane: 2 }, // 861-3445 Hz   -> J (green)
  { name: 'high',    bins: [21, 64],lane: 3 }, // 3445-11025 Hz -> K (orange)
];
