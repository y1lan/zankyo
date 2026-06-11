# AGENTS.md - Zankyo Project Guide

## TODO

[docs/TODO.md](./docs/TODO.md) is used to track TODO items. Update TODO file when a task is finished or a new task shall be added.

## Notes

- Use file editing tool except when editing this file (`AGENTS.md`)
- Update this file (`AGENTS.md`) when anything changed or there're things worth noting for future.
- All source files use ES module syntax (`import`/`export`).
- Classes are PascalCase; files match their default export class name.
- Constants are `UPPER_SNAKE_CASE`, exported individually.
- Tunable constants and runtime flags should live in `src/engine/config.ts` and be imported where used.
- Touch hit-ring radius must stay projection-aligned with shader math (height-based screen mapping).
- `Note.currentZ` should be evaluated against live `cameraZ` so NOTE_TRAVEL_TIME remains accurate while camera moves.
- Keep hit notes alive briefly (state=`hit`) so shader hit-effect slot mapping does not jump to the next note.
- Hit effects must be keyed by `note.id` (not array index) because shader note slots reorder every frame.
- Touch listeners must only call `preventDefault()` when a gameplay hit is consumed; otherwise mobile UI taps (e.g. file picker labels) break.
- Prefer perf-only shader optimizations that keep visuals stable (e.g., reduce unnecessary `calcNormal(sceneSDF)` calls).
- Cone marching uses a low-res prepass buffer (10x10 tiles) and must store a conservative start distance backoff to avoid skipping near geometry.
- Cone aggressiveness is controlled via config (`FRACTAL_CONE_MAX_STEPS`, `FRACTAL_CONE_STEP_SCALE`, `FRACTAL_CONE_BACKOFF_RADIUS_FACTOR`).

## Architecture and Data Flow

    [MP3 File] -> BeatDetector (Web Audio FFT) -> onBeat callback -> Game.spawnNote()
                                                -> onFrequencyData -> Effects.update()

    [Keyboard Input] -> Game.handleLanePress() -> hit detection -> HitEffect.spawn()
                                                                -> UI.updateScore/Combo

    [Animation Loop] -> Game.animate() -> Note.update() (move notes along z-axis)
                                        -> SceneSetup.render() (EffectComposer with bloom)

### Key relationships:

- Game is the orchestrator - owns the scene, beat detector, notes array, and score state.
- BeatDetector fires callbacks; it does NOT know about the game or scene.
- Effects and HitEffect only receive data; they do not mutate game state.
- UI is pure DOM manipulation with no Three.js dependency.

---

## Development

    npm install        # Install dependencies
    npm run dev        # Vite dev server at http://localhost:5173
    npm run build      # Production build to dist/
    npm run preview    # Preview production build

### Nix

A flake.nix provides a dev shell for the project toolchain. Enter with nix develop or use direnv.
