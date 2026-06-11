import { bus } from './core/bus.js';
import { BeatDetector } from './audio/BeatDetector.js';
import { NoteSpawner } from './engine/NoteSpawner.js';
import { HitJudge } from './engine/HitJudge.js';
import {
  TUNNEL_SPEED,
  SECTORS,
  MAX_SHADER_NOTES,
  BEAT_SPAWN_CHANCE,
  SIMULTANEOUS_CHANCE,
  ENABLE_BEAT_FLASH,
} from './engine/config.js';
import { SceneSetup } from './rendering/SceneSetup.js';
import { FractalBackground, type NoteShaderData } from './rendering/FractalBackground.js';
import { Controls } from './ui/Controls.js';
import { PauseMenu } from './ui/PauseMenu.js';
import { HUD } from './ui/HUD.js';
import { JudgementPopup } from './ui/JudgementPopup.js';

// ── Rendering ──────────────────────────────────────────────────────
const sceneSetup = new SceneSetup();
const { scene } = sceneSetup;
let fractalBg: FractalBackground | null = null;

// ── UI ─────────────────────────────────────────────────────────
const controls = new Controls(bus);
const pauseMenu = new PauseMenu(bus, controls.fileInput);
const hud = new HUD();
const judgement = new JudgementPopup();

// ── Engine ─────────────────────────────────────────────────────
const spawner = new NoteSpawner();
const judge = new HitJudge(bus, spawner);

// ── Audio ──────────────────────────────────────────────────────
const audio = new BeatDetector();

// ── Game State ─────────────────────────────────────────────────
let cameraZ = 0;
let playing = false;
let paused = false;
let bgEnabled = true;
let lastTime = performance.now();
let bassNorm = 0;
let trebleNorm = 0;

// ── Wire bus events ────────────────────────────────────────────────

// UI → load audio
bus.on('ui:load', async ({ file }) => {
  try {
    await audio.loadAudio(file);
    audio.play();
    judge.reset();
    spawner.clear();
    cameraZ = 0;
    lastTime = performance.now();
    playing = true;
    paused = false;
    if (!fractalBg) {
      fractalBg = new FractalBackground(scene);
      fractalBg.setBgEnabled(bgEnabled);
    }
    controls.setPlaying(true);
    hud.showSong(file.name.replace(/\.[^/.]+$/, ''));
    controls.clearFile();
  } catch (err) {
    console.error(err);
  }
});

// UI → stop
bus.on('ui:stop', () => {
  pauseMenu.hide();
  audio.stop();
  spawner.clear();
  judge.reset();
  playing = false;
  paused = false;
  controls.setPlaying(false);
  hud.hideSong();
  hud.updateScore(0, 0);
});

// UI → pause (only effective when playing)
bus.on('ui:pause', () => {
  if (!playing) return;
  playing = false;
  paused = true;
  audio.pause();
  pauseMenu.show(bgEnabled);
});

// UI → resume (emitted by PauseMenu after countdown)
bus.on('ui:resume', () => {
  paused = false;
  playing = true;
  lastTime = performance.now();
  audio.resume();
  controls.setPlaying(true);
});

// Audio → beat → spawn red single or yellow pair (maimai-style)
audio.onBeat = (_energy, _laneIndex) => {
  // Reduce note density
  if (Math.random() > BEAT_SPAWN_CHANCE) return;

  if (Math.random() < SIMULTANEOUS_CHANCE) {
    // Yellow simultaneous pair: two different sectors
    const s1 = Math.floor(Math.random() * SECTORS.length);
    let s2 = (s1 + Math.floor(Math.random() * (SECTORS.length - 1)) + 1) % SECTORS.length;
    spawner.spawnPair(s1, s2);
  } else {
    // Red single note
    const sectorIndex = Math.floor(Math.random() * SECTORS.length);
    spawner.spawn(sectorIndex, 'single');
  }
  if (ENABLE_BEAT_FLASH && fractalBg) fractalBg.onBeat();
};

// Audio → frequency data
audio.onFrequencyData = ({ low, mid, high }) => {
  bassNorm = low / 255;
  trebleNorm = high / 255;
};

// Audio → ended
audio.onEnded = () => {
  playing = false;
  paused = false;
  controls.setPlaying(false);
  hud.hideSong();
};

// Engine → hit → trigger shader effect and remove note visually
bus.on('game:hit', ({ note }) => {
  if (fractalBg) fractalBg.triggerHitEffect(note.id);
});

// Engine → score/combo → HUD + achievement
bus.on('game:score', ({ score, combo }) => {
  hud.updateScore(score, combo);
  hud.updateAchievement(judge.getAchievement(), judge.getRank());
});

// Engine → judgement → popup
bus.on('game:judgement', ({ text, color }) => {
  judgement.show(text, color);
});

// Engine → miss → shake
bus.on('game:miss', () => {
  if (fractalBg) fractalBg.onMiss();
});

// UI → toggle background rendering
bus.on('ui:toggle-bg', () => {
  bgEnabled = !bgEnabled;
  if (fractalBg) fractalBg.setBgEnabled(bgEnabled);
});

// ── Game loop ────────────────────────────────────────────────────
function loop(): void {
  requestAnimationFrame(loop);

  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  if (playing) {
    // Advance camera
    cameraZ += TUNNEL_SPEED * dt;
    spawner.cameraZ = cameraZ;

    // Check for missed notes
    const missed = spawner.update(now);
    for (const _ of missed) judge.miss();

    // Build note shader data
    if (fractalBg) {
      const shaderNotes: NoteShaderData[] = [];
      const activeNotes = spawner.notes.slice(0, MAX_SHADER_NOTES);
      for (const n of activeNotes) {
        const z = n.currentZ(now, cameraZ);
        shaderNotes.push({
          id: n.id,
          x: n.wallX,
          y: n.wallY,
          z,
          state: n.state === 'active' ? 1.0 : 0.0,
          color: [...n.color] as [number, number, number],
        });
      }
      fractalBg.updateNotes(shaderNotes);
      fractalBg.update(bassNorm, trebleNorm, cameraZ);
    }
  }

  sceneSetup.render();
}
loop();
