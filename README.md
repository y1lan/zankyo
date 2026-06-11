# ZANKYO (残響)

A rhythm game set inside a ray-marched fractal tunnel — built with Three.js, GLSL shaders, and the Web Audio API. Notes fly through an infinite Menger sponge toward an 8-sector hit ring while the fractal walls react to the music.

## How to play

1. Click **NEW TRACK** and select an audio file
2. Notes spawn on beats and fly toward you through 8 sectors (maimai-style ring)
3. Press the matching sector key when a note reaches the glowing ring
4. Press **⏸** or **Escape** to pause

| Key   | Sector       |
| ----- | ------------ |
| **F** | Top-left     |
| **J** | Top-right    |
| **D** | Left         |
| **K** | Right        |
| **S** | Bottom-left  |
| **L** | Bottom-right |
| **A** | Far left     |
| **;** | Far right    |

Touch input is also supported — tap the ring sector directly on mobile.

## Scoring

- **CRITICAL PERFECT**
- **PERFECT**
- **GREAT**
- **GOOD**
- **MISS** (note flies past)

## Rendering

The entire scene is rendered in a single full-screen GLSL fragment shader using **signed distance fields (SDF)** and **sphere tracing (ray marching)**.

### Scene composition

The combined SDF includes three material types, resolved per-ray with priority ordering:

1. **Fractal tunnel** — an infinite Menger sponge defined by 5 iterations of cross-shaped void carving. The fractal rotates slowly over time. Space around notes and the hit ring is carved out so gameplay elements are never occluded.
2. **Note spheres** — SDF spheres placed at each active note's world position. On hit, 6 particle spheres burst outward as a decaying explosion effect.
3. **Hit zone ring** — an SDF torus at a fixed z-offset from the camera, with 8 sector dots placed around it.

### Lighting

- Fractal walls use central-difference normals with diffuse + specular shading.
- Note spheres use cheap analytic normals (`normalize(p - center)`) to avoid extra `sceneSDF` calls.
- Notes emit colored light onto nearby fractal walls (point-light attenuation loop).
- Hit ring uses a simple pulse glow with no normal computation.
- Step-count ambient occlusion and distance fog are applied globally.

### Cone marching (performance)

A two-pass **cone marching** optimization reduces per-pixel ray march cost:

1. **Prepass** — a low-resolution buffer (screen ÷ 10×10 tiles) marches one representative ray per tile. A cone originating from the camera through the tile boundary defines a growing radius; marching halts when the SDF distance falls below the cone radius, since finer detail could be missed for individual pixels. The resulting safe start distance (with a conservative backoff) is stored in a `HalfFloat` texture.
2. **Main pass** — each pixel samples the prepass buffer and begins its ray march from the stored start distance instead of zero, skipping the first many iterations. This effectively makes the coarse iterations ~100× cheaper (one evaluation per tile instead of per pixel).

### Post-processing

The shader output goes through Three.js `EffectComposer` with **UnrealBloomPass** (HDR render target, ACES filmic tone mapping).

## Tech stack

- **Three.js** — WebGL renderer, EffectComposer, bloom
- **GLSL** — full-screen SDF ray marching with cone-march prepass
- **Web Audio API** — real-time FFT beat detection (AnalyserNode, fftSize 256)
- **TypeScript** — all source in ES module syntax
- **Vite** — dev server and bundler

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs to dist/
npm run preview    # preview production build
```

A `flake.nix` provides a dev shell for the project toolchain. Enter with `nix develop` or use direnv.

Deploy `dist/` to Vercel, Netlify, or GitHub Pages.
