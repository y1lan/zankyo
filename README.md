# ZANKYOU (残响)

A rhythm game built with pure web technologies — Three.js + Web Audio API.

## How to play

1. Click **LOAD TRACK** and select an MP3 file
2. Notes fly toward you on 4 lanes, synced to the bass beat
3. Press the matching key when a note reaches the glowing ring

| Key | Lane |
|-----|------|
| **D** | Left (blue) |
| **F** | Mid-left (pink) |
| **J** | Mid-right (green) |
| **K** | Right (orange) |

## Scoring

- **PERFECT** (center ring) — 300 pts
- **GOOD** (outer zone) — 100 pts
- **MISS** (note flies past) — combo reset, camera shake
- **WHIFF** (wrong key / empty press) — combo reset
- Combo multiplier increases every 10 hits

## Tech stack

- **Three.js** — 3D rendering, bloom post-processing (UnrealBloomPass)
- **Web Audio API** — real-time FFT analysis (AnalyserNode, fftSize 256)
- **GSAP** — note animation and camera shake
- **Vite** — dev server and bundler

## Project structure

```
src/
├── main.js                   # Entry point
├── audio/
│   └── BeatDetector.js       # AudioContext + AnalyserNode beat detection
├── game/
│   ├── Constants.js          # Timing windows, lanes, tuning parameters
│   ├── Game.js               # Main loop, input, hit detection, scoring
│   └── Note.js               # Note mesh, lane assignment, flight animation
├── rendering/
│   ├── SceneSetup.js         # Three.js scene, bloom, lane guides
│   ├── Effects.js            # Audio-reactive background, camera FOV, tunnel
│   └── HitEffect.js          # Particle burst + expanding ring on hit
└── ui/
    └── UI.js                 # DOM overlay: score, combo, judgments, file picker
```

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build

```bash
npm run build    # outputs to dist/
```

Deploy `dist/` to Vercel, Netlify, or GitHub Pages.
