# Fractal

ref: https://www.youtube.com/watch?v=Dz2Hm5ThNFw
caption: ./fractal_video_cc.txt

We want to use fractals to make the game more visually attractive. The fractals will be rendered using ray marching and animated in response to the music.

## Ray Marching with Signed Distance Fields (SDFs)

An SDF is a function that returns the minimum distance from any point in space to an implicit surface. Simple primitives (sphere, box, plane) have closed-form SDFs; complex shapes are built by combining them with boolean operators (union, intersection, difference). Smooth-blend variants of these operators allow shapes to flow into each other.

**Ray marching loop:**
1. Fire a ray from the camera position in the pixel's projected direction (derived from the view-projection matrix).
2. Evaluate the SDF at the current ray position to get distance `d`.
3. Advance the ray by `d` units — guaranteed safe because the SDF returns the *minimum* distance to any surface.
4. Repeat until `d < 1e-4` (hit) or the ray exceeds a max step count / max distance (miss).

Because SDFs are purely mathematical, scene repetition is free: take the fractional part of the position to tile the scene infinitely, or warp/bend the space for organic distortion.

## Fractals

Fractals emerge from iteratively applying transformations to geometric structures. A classic example is the **Menger sponge**: recursively remove cube-shaped sections from a larger cube by running a for-loop that increases the carving frequency each iteration.

To add visual variety, the space is transformed each iteration — a simple rotation or positional offset is enough to break symmetry and produce intricate results.

## Lighting

Surface normals are approximated with the **central difference method** on the SDF gradient at the intersection point. From there:

- **Reflections:** reflect the camera ray off the surface normal, re-run ray marching in the new direction, then blend the secondary hit color with the primary surface color.
- **Shadows:** cast a shadow ray toward each light source; if the ray intersects geometry before reaching the light, the point is in shadow.

## Wiring the Audio to the Fractal

Audio data is processed on the CPU then uploaded to the GPU each frame.

**Frequency extraction:** Apply the Discrete Fourier Transform (DFT/FFT) to a window of PCM samples centered on the current playback timestamp. This converts amplitude-over-time data into frequency magnitudes. The resulting spectrum (low pitch on the left, high pitch on the right) is passed to the shader.

**Transient detection:** Instead of reacting only to loudness, detect *transients* — sudden spikes that occur when a note is struck. Method: track the signal with two envelopes, one fast and one slow. When they diverge significantly, a transient has occurred. Trigger visual events (expansions, color shifts) on transients for a more dynamic feel.

**Additional modulators:**
- **LFOs (Low Frequency Oscillators):** sinusoidal or other periodic signals that vary properties smoothly over time, independent of audio content.
- **Beat generators:** locked to song BPM for reliable rhythmic sync.

**Shader uniforms:**
- `u_bass`: energy in the low-frequency bands — drive the fractal's folding scale factor. Bass hits cause the geometry to mutate or expand.
- `u_treble`: energy in the high-frequency bands — map to the lighting/color function so hi-hats and snares flash neon tones.
- `u_transient`: fires on detected transients — use for one-shot visual bursts.

## Post-Processing

Three.js's `EffectComposer` (already in use) makes this low-effort:

- **Tone mapping:** built-in via `renderer.toneMapping` (e.g. `ACESFilmicToneMapping`) — no extra pass needed.
- **Bloom/glow:** already configured with `UnrealBloomPass`.

To enable HDR output from the fractal shader, just ensure the render target uses `HalfFloatType` (or `FloatType`) so colors can exceed 0–1 before tone mapping compresses them back.

## Performance: Cone Marching

Ray marching can be expensive — the SDF may be evaluated hundreds of times per ray. **Cone marching** amortises this cost:

1. Group pixels into coarse clusters (e.g. 10×10).
2. For each cluster, cast a cone from the camera through the cluster boundary and march it until the SDF distance falls below the cone's radius at that step. This gives a conservative "safe starting distance" covering all rays in the cluster.
3. Store this estimate in a buffer. Individual pixel ray marches start from this pre-computed distance rather than from zero.

The first iterations are effectively computed 100× more cheaply. Actual speedup is moderate (not 100×) because secondary rays (reflections, shadows) don't benefit, and rays still need to march further after the initial estimate.

## Implementation Notes

1. Start from a reference fractal on Shadertoy (e.g. "Mandelbulb", "Menger Sponge", "Fractal Tunnel") and port the GLSL to a Three.js `ShaderMaterial` (GLSL) or a WebGPU compute/fragment shader (WGSL).
2. Add audio uniforms (`u_bass`, `u_treble`, `u_transient`) and multiply them into the fractal's SDF scale and lighting expressions.
3. Match the raymarching camera's FOV to Three.js's camera FOV so the fractal background aligns with the rasterized foreground.
4. Feed the `EffectComposer` pipeline for tone mapping and bloom.
