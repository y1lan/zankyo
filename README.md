# ZANKYO (残響)

[简体中文](./README_zh.md)

A rhythm game set inside a ray-marched fractal tunnel — built with Three.js, GLSL shaders, and the Web Audio API. Drop an MP3, get a beatmap, and tap on an 8-sector ring as notes fly through an infinite Menger sponge synced to the track.

## How to play

1. Click **LOAD TRACK** and pick any audio file from your machine.
2. Pick a **difficulty** (cycle button: EASY → BASIC → ADVANCED → EXPERT → MASTER). The choice persists in `localStorage`.
3. Optionally tune **SPEED** (`[` / `]` or the ± buttons) to scale how fast notes approach.
4. The track plays; notes spawn on detected onsets and fly toward the glowing hit ring.
5. Press the corresponding key when a note overlaps the ring — closer to centre = better judgement.
6. Press **⏸** or **Space** to pause; press again for a 3-2-1 resume countdown.
7. At the end of the track a **result screen** shows your achievement %, rank, max combo, and judgement breakdown.

### Keys

Home-row split — left hand on the left half of the ring, right hand on the right half:

| Key   | Sector       |
| ----- | ------------ |
| **F** | Top-left     |
| **D** | Left         |
| **S** | Bottom-left  |
| **A** | Bottom       |
| **J** | Top          |
| **K** | Top-right    |
| **L** | Right        |
| **;** | Bottom-right |

Touch is also supported — tap the ring sector directly on mobile.

## Judgement & scoring

Five tiers, judged by the note's z-distance to the centre of the ring at tap time:

| Judgement          | Window (units)  | Score weight |
| ------------------ | --------------- | ------------ |
| CRITICAL PERFECT   | ±0.5            | 1.00 (→101%) |
| PERFECT            | ±1.0            | 100 / 101    |
| GREAT              | ±2.0            | 80 / 101     |
| GOOD               | ±3.0            | 50 / 101     |
| MISS               | past hit zone   | 0            |

Achievement % is `score / max_possible × 101`. Ranks: SSS+ / SSS / SS+ / SS / S+ / S / AAA / AA / A / B / C / D.

## Difficulty

Five profiles tuned to feel like maimai's standard set. Higher difficulty means more notes, more simultaneous pairs, less time to react, and tighter same-sector spacing.

|              | Spawn | Pair  | Onset cooldown | Sector gap | Travel |
| ------------ | ----- | ----- | -------------- | ---------- | ------ |
| **EASY**     | 0.12  | 0%    | 400 ms         | 12         | 9.0 s  |
| **BASIC**    | 0.18  | 8%    | 300 ms         | 9          | 8.5 s  |
| **ADVANCED** | 0.25  | 18%   | 220 ms         | 6          | 8.0 s  |
| **EXPERT**   | 0.45  | 35%   | 135 ms         | 3          | 5.5 s  |
| **MASTER**   | 0.65  | 50%   | 100 ms         | 2          | 4.0 s  |

Judgement windows do **not** change — difficulty only affects what the chart looks like, not how generous the timing is.

## Architecture

```
[MP3]      ─► BeatDetector  (live FFT for visuals)
           ─► BeatmapGenerator  (offline pass: full chart up front)
                       │
                       ▼
                NoteSpawner (anti-cluster, same-sector gap)
                       │
                       ▼
                 ┌─────┴─────┐
                 ▼           ▼
            HitJudge     FractalBackground (GLSL shader)
                 │           │
                 ▼           ▼
              HUD/UI    SceneSetup (Three.js + EffectComposer/Bloom)
```

- **Offline beatmap generation** (`BeatmapGenerator.ts`) — when a track loads, the whole audio buffer is FFT-scanned in one pass using the same multi-band onset detection as the live `BeatDetector`. The resulting chart is deterministic and pause/resume safe (note timestamps are absolute and shifted by the paused duration, not recomputed).
- **Anti-cluster spawning** — `NoteSpawner.canSpawn` skips a note when an existing same-sector note is within `MIN_SAME_SECTOR_Z_GAP`. Simultaneous pairs are all-or-nothing to avoid half pairs.
- **Event bus** (`core/bus.ts`) — typed pub/sub; the renderer, audio, and DOM layers only talk through events (`game:hit`, `game:miss`, `ui:pause`, `ui:resume`, `ui:toggle-bg`, etc.).
- **Engine vs rendering** — `engine/` owns gameplay state and is renderer-agnostic. `rendering/` owns Three.js + the shader. UI is pure DOM.

## Rendering

The entire game scene is rendered in a single full-screen GLSL fragment shader using **signed distance fields (SDFs)** and **sphere tracing (ray marching)**.

### Scene composition

Three SDFs are unioned per ray, with priority ordering for material classification:

1. **Fractal tunnel** — an infinite Menger sponge defined by 5 iterations of cross-shaped void carving. Space around active notes and the hit ring is *carved out of* the fractal so gameplay elements are never occluded by walls.
2. **Note spheres** — placed at each active note's world position. On hit, 6 particle spheres burst radially outward in a decaying explosion.
3. **Hit zone ring** — a torus at a fixed z-offset from the camera, with 8 sector dots placed around it. The ring pulses with a `u_transient` uniform driven by recent onset energy.

### Lighting

- Fractal walls: central-difference normals → diffuse + specular.
- Note spheres: cheap analytic normals (`normalize(p - center)`) — no extra `sceneSDF` calls.
- Active notes cast colored point-light onto nearby fractal walls (attenuation loop).
- Hit ring: pulse glow, no normal computation.
- Global: step-count ambient occlusion + distance fog.

### Cone marching (perf)

A two-pass **cone marching** optimization makes the main ray march start much further from the camera:

1. **Prepass** — a low-resolution buffer (screen ÷ 10×10 tiles) marches one ray per tile. The cone from the camera through the tile boundary defines a growing safe radius; marching halts once the SDF distance falls below the cone radius (finer pixel-level detail could be missed). The resulting safe-start distance (with a conservative backoff) is stored in a `HalfFloat` texture.
2. **Main pass** — each pixel samples the prepass buffer and begins marching from that distance instead of zero. Effectively the coarse iterations become ~100× cheaper (one evaluation per tile, not per pixel).

### Pause optimization

When the player is on the pause menu, title screen, or result screen, the game loop early-returns before `sceneSetup.render()`. The canvas freezes on the last frame and the shader stops burning GPU — the fan kicks down within a second. Resume restores RAF cadence and shifts note timestamps by the paused wall-clock duration so they don't all expire at once.

### Post-processing

Three.js `EffectComposer` → `UnrealBloomPass` over an HDR (`HalfFloatType`) render target → ACES filmic tone mapping.

## Tech stack

- **Three.js** — WebGL renderer, EffectComposer, bloom
- **GLSL** — full-screen SDF ray marching with cone-march prepass
- **Web Audio API** — `AnalyserNode` (fftSize 256) for live visuals, an offline pass over the decoded buffer for the beatmap
- **TypeScript** — strict, ES modules
- **Vite** — dev server and bundler

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # → dist/
npm run preview    # preview the built bundle
```

A `flake.nix` provides a dev shell for the project toolchain. Enter with `nix develop`, or use direnv.

Deploy `dist/` to Vercel, Netlify, GitHub Pages, or any static host.

## Project layout

```
src/
├── main.ts                       game loop + bus wiring
├── core/bus.ts                   typed pub/sub
├── audio/
│   ├── BeatDetector.ts           live FFT for visuals
│   ├── BeatmapGenerator.ts       offline chart generation
│   ├── HitSounds.ts              judgement-based audio feedback
│   └── bands.ts                  frequency band definitions
├── engine/
│   ├── config.ts                 all tunable constants
│   ├── difficulty.ts             5-tier profile system + localStorage
│   ├── flowSpeed.ts              user-tunable speed multiplier
│   ├── Note.ts                   per-note state, motion curve
│   ├── NoteSpawner.ts            active notes + anti-cluster spawn
│   └── HitJudge.ts               sector/timing judgement + scoring
├── rendering/
│   ├── SceneSetup.ts             Three.js scene, camera, composer, bloom
│   └── FractalBackground.ts      the GLSL shader & material
└── ui/
    ├── Controls.ts               load/pause/difficulty/speed buttons
    ├── HUD.ts                    song name, combo, achievement %
    ├── PauseMenu.ts              pause overlay + resume countdown
    ├── ResultScreen.ts           end-of-song summary
    ├── JudgementPopup.ts         CRITICAL/PERFECT/GREAT/GOOD/MISS popups
    ├── RingPulse.ts              radial ripple on hit
    └── SectorHints.ts            on-screen keyboard labels per sector
```
