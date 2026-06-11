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

    pnpm install       # Install dependencies (nix devShell provides pnpm)
    pnpm run dev       # Vite dev server at http://localhost:5173
    pnpm run build     # Production build to dist/
    pnpm run preview   # Preview production build

### Nix

A flake.nix provides a dev shell with pnpm. Enter with nix develop or use direnv.
