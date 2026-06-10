# TODO

- [x] Use Typescript
- [ ] Fractal Demo
  - [ ] Port a Shadertoy fractal (e.g. Menger sponge / fractal tunnel) to a Three.js `ShaderMaterial` with basic ray marching
  - [ ] Render a demo fractal with some guessed constant
- [ ] Fractal from music MVP (See [fractal.md](./fractal.md))
  - [ ] Extract frequency bands from `BeatDetector`'s analyser → compute `u_bass`, `u_treble` each frame
  - [ ] Wire uniforms into the fractal shader (scale folding by bass, color by treble, burst on transient)
  - [ ] Compose fractal as background — match raymarching FOV to the Three.js camera
- [ ] Fix overshaking
- [ ] Fix camera shifting
- [ ] (Optional) Better Fractal
  - [ ] Add transient detection (dual-envelope method) → `u_transient` uniform
  - [ ] Add SDF lighting (central-difference normals, diffuse + specular)
  - [ ] Add reflections (secondary ray march)
  - [ ] Enable HDR render target (`HalfFloatType`) and ensure tone mapping + existing bloom apply
  - [ ] Implement cone marching for performance if frame rate is too low
- [ ] (Optional) Better beatmap generation
  - [ ] Support multiple difficulty
