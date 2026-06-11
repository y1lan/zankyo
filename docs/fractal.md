# Fractal

ref: https://www.youtube.com/watch?v=Dz2Hm5ThNFw
caption: ./fractal_video_cc.txt

We use fractals as the primary visual renderer for the game — the entire scene is ray-marched in a single full-screen GLSL fragment shader. Notes, hit ring, and effects are all SDF objects composed into the fractal scene.

## Architecture

```
[Full-screen quad] → Vertex Shader (passthrough)
                   → Fragment Shader (ray march entire scene)
                       ├── fractalTunnel()   — infinite Menger sponge
                       ├── noteSDF()         — note spheres + hit particles
                       ├── sectorDotsSDF()   — 8 indicator dots on ring
                       ├── hitZoneSDF()      — thin torus ring
                       └── sceneSDF()        — combines all with carving
```

File: `src/rendering/FractalBackground.ts`

## Ray Marching with Signed Distance Fields (SDFs)

An SDF returns the minimum distance from any point to an implicit surface. We march rays by advancing the safe distance each step until we hit (d < 0.0005) or exceed 120 steps / 50 units.

We use an understep factor of 0.8 for Menger precision to avoid stepping through thin geometry.

## Infinite Menger Sponge

The fractal is an **infinite Menger sponge** — no bounding box, no modular repetition of a finite cube. Algorithm:

```glsl
float d = -1.0;       // start solid everywhere
float s = 0.35;       // initial scale (lower = wider corridors)
float scale = 3.0;    // fixed — not modulated by audio (prevents flicker)

for (int i = 0; i < 5; i++) {
    vec3 a = mod(p * s, 2.0) - 1.0;
    s *= scale;
    vec3 r = abs(1.0 - 3.0 * abs(a));
    float da = max(r.x, r.y);
    float db = max(r.y, r.z);
    float dc = max(r.z, r.x);
    float cr = (min(da, min(db, dc)) - 1.0) / s;
    d = max(d, cr);
}
```

The camera flies along the z-axis at (0, 0, cameraZ) — always inside the central corridor void. A subtle time-based rotation (`u_time * 0.02`) adds visual interest without disorienting.

**Important:** The scale parameter is constant (3.0). Earlier versions modulated it with `u_bass` which caused frame-to-frame geometry changes and horrible flickering.

## Notes as SDF Objects

Notes are spheres at world positions uploaded via uniform arrays:
- `u_notes[12]` — vec4 (xyz position, w=state)
- `u_noteColors[12]` — vec3 (RGB)
- `u_hitEffects[12]` — float (decay timer 0→1)

Note types (maimai-style):
- **Red/pink** `(1.0, 0.2, 0.5)` — single tap
- **Yellow** `(1.0, 0.85, 0.2)` — simultaneous pair (always 2 at once)

Notes orbit at `RING_WORLD_RADIUS` (derived from `HIT_RING_FRACTION * FOV_SCALE * NOTE_HIT_DISTANCE * 0.5`) so they align exactly with the ring and sector dots.

### Hit Explosion Effect

On hit, 4 SDF particle spheres splash **outward** (radially away from tunnel center), shrinking as they fly. The effect decays from 1.0 via `*= 0.88` each frame.

## Hit Zone Ring & Sector Dots

- **Ring:** Thin torus (radius=0.003) at `u_ringRadius` from z-axis, at `cameraZ + NOTE_HIT_DISTANCE`
- **8 dots:** Small spheres (r=0.012) placed at each sector angle on the ring
- Touch detection only registers hits within 25% of ring radius from the ring itself

## Scene Composition

`sceneSDF()` combines all elements with priority: notes > ring/dots > fractal.

The fractal is **carved** around notes and ring using `max(fractal, -(objectDist - margin))` so they're never occluded by Menger geometry.

## Lighting

- Surface normals via central-difference gradient
- Directional light (diffuse + specular)
- **Note lighting on walls:** Each active note casts colored light onto nearby fractal surfaces (attenuation = `1/(1 + d² * 1.5)`)
- Fractal: monochrome base + note-emitted color bleeding
- Notes: self-emission + bright flash on hit (`color * ef * 3.0`)
- Distance fog: `1 - exp(-dist * 0.04)`
- AO approximation from step count

## Audio Uniforms

| Uniform | Source | Effect |
|---------|--------|--------|
| `u_bass` | Low-frequency energy | Smoothed for ambient modulation |
| `u_treble` | High-frequency energy | Smoothed for ambient modulation |
| `u_transient` | Beat detection | Global subtle flash, decays `*= 0.92` |
| `u_shake` | Miss events | Camera offset, decays `*= 0.92` |

**Critical lesson:** Never modulate SDF geometry parameters (scale, iteration count) with audio — causes per-frame geometry changes that flicker violently. Only modulate lighting/color/post-processing.

## Post-Processing

- `HalfFloatType` render target for HDR headroom
- `EffectComposer` with `UnrealBloomPass`
- `ACESFilmicToneMapping` via `renderer.toneMapping`

## Performance: Cone Marching (Not Yet Implemented)

Potential optimization: cast coarse cones per pixel cluster to get safe starting distances, then individual rays start from pre-computed depth. Would reduce per-pixel march iterations significantly.

## Ring Radius Calculation

The ring must match between shader (world units) and HitJudge (screen pixels):

```
World: RING_WORLD_RADIUS = HIT_RING_FRACTION * FOV_SCALE * NOTE_HIT_DISTANCE * 0.5
Screen: ringPixelRadius = HIT_RING_FRACTION * min(width, height) * 0.5
```

Both derive from the same `HIT_RING_FRACTION` constant (currently 0.5) ensuring visual-touch alignment.
