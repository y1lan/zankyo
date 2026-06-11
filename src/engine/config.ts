// Tunnel geometry
export const TUNNEL_SPEED: number = 2.0 // units/sec camera flies forward

// Note flight
export const NOTE_SPAWN_DISTANCE: number = 50 // how far ahead notes spawn (far away)
export const NOTE_HIT_DISTANCE: number = 2 // z-distance from camera for hit zone center

// Hit zone ring size as fraction of the smaller screen dimension (0-1)
export const HIT_RING_FRACTION: number = 0.8

// World-space ring radius (must match shader's _calcRingRadius)
export const SHADER_FOV: number = 1.2
export const RING_WORLD_RADIUS: number =
  HIT_RING_FRACTION * SHADER_FOV * NOTE_HIT_DISTANCE * 0.5

// Notes orbit at ring radius so they land on the dots
export const TUNNEL_RADIUS: number = RING_WORLD_RADIUS

// Hit windows (z-proximity to hit zone center)
export const HIT_ZONE_RADIUS: number = 3.5 // total catchable zone
export const CRITICAL_ZONE_RADIUS: number = 0.5 // critical perfect
export const PERFECT_ZONE_RADIUS: number = 1.0 // perfect
export const GREAT_ZONE_RADIUS: number = 2.0 // great
export const GOOD_ZONE_RADIUS: number = 3.0 // good
export const MISS_DISTANCE: number = -2.0 // past hit zone = miss (negative = behind camera)
export const RING_TOUCH_TOLERANCE: number = 0.25
export const HIT_NOTE_HOLD_MS: number = 220 // keep hit note position briefly so FX stays on the correct slot
export const NOTE_FLY_DURATION_MS: number = 4000 // keep missed note in spawner after it flies past camera

// 8 Sectors (maimai-style octagonal ring)
export interface Sector {
  readonly angle: number // radians, clockwise from top
  readonly color: [number, number, number] // RGB normalized
}

// 8 sectors evenly spaced, starting from top going clockwise
export const SECTORS: Sector[] = Array.from({ length: 8 }, (_, i) => {
  // Rotated by π/8 clockwise so 4 sectors fall on each side of the vertical
  // axis — left/right hands get symmetric halves on the keyboard.
  const angle = Math.PI / 2 - (i * Math.PI) / 4 - Math.PI / 8
  // Alternate colors: warm and cool
  const hues: [number, number, number][] = [
    [0.4, 0.8, 1.0], // right-top - cyan
    [0.6, 0.6, 1.0], // right-upper - lavender
    [1.0, 0.4, 0.8], // right-lower - pink
    [1.0, 0.5, 0.3], // right-bottom - orange
    [1.0, 0.9, 0.3], // left-bottom - yellow
    [0.5, 1.0, 0.4], // left-lower - green
    [0.3, 0.7, 1.0], // left-upper - blue
    [0.7, 0.4, 1.0] // left-top - purple
  ]
  return { angle, color: hues[i] }
})

// Note type (maimai-style: red = single tap, yellow = simultaneous pair)
export type NoteType = 'single' | 'simultaneous'

export const NOTE_COLOR_SINGLE: [number, number, number] = [1.0, 0.2, 0.5] // pink/red
export const NOTE_COLOR_SIMULTANEOUS: [number, number, number] = [
  1.0, 0.85, 0.2
] // yellow

// Spawn density, simultaneous-pair probability, global cooldown, anti-cluster
// gap, and note travel time all live on the difficulty profile now — see
// `engine/difficulty.ts`.

// Max visible notes in shader
export const MAX_SHADER_NOTES: number = 12

// Note sphere radius in SDF
export const NOTE_SPHERE_RADIUS: number = 0.15

// Scoring weights (fraction of max per note; critical = 1.0 → 101% achievable)
export const WEIGHT_CRITICAL_PERFECT: number = 1.0 // → 101%
export const WEIGHT_PERFECT: number = 100 / 101 // → 100%
export const WEIGHT_GREAT: number = 80 / 101 // → ~80%
export const WEIGHT_GOOD: number = 50 / 101 // → ~50%
export const WEIGHT_MISS: number = 0 // → 0%
export const ACHIEVEMENT_MAX_PERCENT: number = 101

// Rank thresholds (percentage of max possible score)
export interface Rank {
  readonly name: string
  readonly threshold: number // minimum percentage
}

export const RANKS: Rank[] = [
  { name: 'SSS+', threshold: 100.5 }, // All Critical Perfect (101%)
  { name: 'SSS', threshold: 100.0 },
  { name: 'SS+', threshold: 99.5 },
  { name: 'SS', threshold: 99.0 },
  { name: 'S+', threshold: 98.0 },
  { name: 'S', threshold: 97.0 },
  { name: 'AAA', threshold: 94.0 },
  { name: 'AA', threshold: 90.0 },
  { name: 'A', threshold: 80.0 },
  { name: 'B', threshold: 60.0 },
  { name: 'C', threshold: 40.0 },
  { name: 'D', threshold: 0.0 }
]

// Runtime flags
export const ENABLE_BEAT_FLASH: boolean = false

// Audio analysis
export interface Band {
  readonly name: string
  readonly bins: [number, number]
  readonly lane: number
}

export const BANDS: readonly Band[] = [
  { name: 'bass', bins: [0, 1], lane: 0 }, // 0-172 Hz
  { name: 'lowMid', bins: [2, 5], lane: 1 }, // 172-861 Hz
  { name: 'highMid', bins: [6, 20], lane: 2 }, // 861-3445 Hz
  { name: 'high', bins: [21, 64], lane: 3 } // 3445-11025 Hz
]
export const AUDIO_FFT_SIZE: number = 256
export const AUDIO_SMOOTHING_TIME_CONSTANT: number = 0.3
export const AUDIO_INITIAL_PEAK_DIFF: number = 15
export const AUDIO_ONSET_COOLDOWN_MS: number = 260
export const AUDIO_SAFETY_TIMEOUT_MS: number = 1200
export const AUDIO_THRESHOLD_MIN: number = 8
export const AUDIO_THRESHOLD_PEAK_FACTOR: number = 0.35
export const AUDIO_SAFETY_THRESHOLD_SCALE: number = 0.5
export const AUDIO_SMOOTH_KEEP: number = 0.97
export const AUDIO_SMOOTH_ADD: number = 0.03
export const AUDIO_PEAK_KEEP: number = 0.995
export const AUDIO_PEAK_ADD: number = 0.005
export const AUDIO_ONSET_SMOOTH_BOOST: number = 0.3
export const AUDIO_RANGE_LOW_START_BIN: number = 0
export const AUDIO_RANGE_LOW_END_BIN: number = 10
export const AUDIO_RANGE_MID_START_BIN: number = 10
export const AUDIO_RANGE_MID_END_BIN: number = 50
export const AUDIO_RANGE_HIGH_START_BIN: number = 50
export const AUDIO_RANGE_HIGH_END_BIN: number = 128

// Rendering pipeline
export const SCENE_CAMERA_FOV_DEG: number = 70
export const SCENE_CAMERA_NEAR: number = 0.1
export const SCENE_CAMERA_FAR: number = 200
export const SCENE_MAX_PIXEL_RATIO: number = 2
export const SCENE_TONE_MAPPING_EXPOSURE: number = 1.0
export const BLOOM_STRENGTH: number = 1.2
export const BLOOM_RADIUS: number = 1
export const BLOOM_THRESHOLD: number = 1.5
export const FRACTAL_MAX_PIXELS: number = 2_073_600 // max total pixels for shader render (0 = no cap)

// Fractal shader runtime
export const FRACTAL_FULLSCREEN_PLANE_SIZE: number = 2
export const FRACTAL_UNIFORM_TIME_SCALE: number = 0.001
export const FRACTAL_TRANSIENT_DECAY: number = 0.92
export const FRACTAL_SHAKE_DECAY: number = 0.92
export const FRACTAL_HIT_EFFECT_DECAY: number = 0.88
export const FRACTAL_CONE_TILE_SIZE: number = 64
export const FRACTAL_CONE_MAX_STEPS: number = 64
export const FRACTAL_CONE_STEP_SCALE: number = 0.95
export const FRACTAL_CONE_BACKOFF_RADIUS_FACTOR: number = 0.75

// Logo decal on corridor walls
export const LOGO_CELL_SIZE: number = 4 // world units per repeating cell (z and y)
export const LOGO_SCALE: number = 0.8 // fraction of cell the logo fills (0-1)
export const LOGO_OFFSET_Z: number = 0.2 // logo center position within cell along z (0-1)
export const LOGO_OFFSET_Y: number = 0.1 // logo center position within cell along y (0-1)
export const LOGO_GLOW_INTENSITY: number = 1.5 // glow brightness multiplier

// Note approach curve: t^IN / (t^IN + (1-t)^OUT), symmetric S when IN=OUT.
// IN=2, OUT=1.2 → slow start (~20% time, 5% dist), fast middle (~70% time, 88% dist),
// short tail (~10% time, 7% dist).
export const NOTE_CURVE_IN: number = 2
export const NOTE_CURVE_OUT: number = 1.2

// UI
export const COMBO_HOT_THRESHOLD: number = 10
export const JUDGEMENT_POPUP_ANIMATION_DURATION_SEC: number = 0.5
