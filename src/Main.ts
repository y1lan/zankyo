import { bus } from './core/Bus.js';
import { BeatDetector } from './audio/BeatDetector.js';
import { generateBeatmap, type Beatmap, type BeatmapNote } from './audio/BeatmapGenerator.js';
import { NoteSpawner } from './engine/NoteSpawner.js';
import { HitJudge } from './engine/HitJudge.js';
import {
  TUNNEL_SPEED,
  MAX_SHADER_NOTES,
  ENABLE_BEAT_FLASH,
  NOTE_SPAWN_DISTANCE,
} from './engine/Config.js';
import { getDifficulty } from './engine/Difficulty.js';
import { getFlowSpeed } from './engine/FlowSpeed.js';
import { SceneSetup } from './rendering/SceneSetup.js';
import { FractalBackground, type NoteShaderData } from './rendering/FractalBackground.js';
import { Controls } from './ui/Controls.js';
import { PauseMenu } from './ui/PauseMenu.js';
import { ResultScreen } from './ui/ResultScreen.js';
import { HUD } from './ui/HUD.js';
import { JudgementPopup } from './ui/JudgementPopup.js';
import { SectorHints } from './ui/SectorHints.js';
import { RingPulse } from './ui/RingPulse.js';
import { HitSounds } from './audio/HitSounds.js';

// ── Rendering ──────────────────────────────────────────────────────
const sceneSetup = new SceneSetup();
const { scene } = sceneSetup;
let fractalBg: FractalBackground | null = null;

// ── UI ─────────────────────────────────────────────────────────
const controls = new Controls(bus);
const pauseMenu = new PauseMenu(bus);
const resultScreen = new ResultScreen(bus);
const hud = new HUD();
const judgement = new JudgementPopup();
new SectorHints(bus);
new RingPulse(bus);
new HitSounds(bus);

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
let pauseStartTime = 0;
let lastTime = performance.now();
let lastSongName = '';
let bassNorm = 0;
let trebleNorm = 0;
let beatmap: Beatmap | null = null;
let beatmapIndex = 0;
let playStartTime = 0;

// ── Wire bus events ────────────────────────────────────────────────

// UI → load audio
bus.on('ui:load', async ({ file }) => {
  try {
    await audio.loadAudio(file);

    // Generate beatmap from the decoded audio buffer
    const audioBuffer = audio.source!.buffer!;
    beatmap = generateBeatmap(audioBuffer);
    beatmapIndex = 0;

    audio.play();
    judge.reset();
    judge.setBeatmapLength(beatmap.totalNotes);
    spawner.clear();
    cameraZ = 0;
    playStartTime = performance.now();
    lastTime = playStartTime;
    playing = true;
    paused = false;
    if (!fractalBg) {
      fractalBg = new FractalBackground(scene);
      fractalBg.setBgEnabled(bgEnabled);
    }
    lastSongName = file.name.replace(/\.[^/.]+$/, '');
    controls.setPlaying(true);
    hud.showSong(lastSongName);
    controls.clearFile();
  } catch (err) {
    console.error(err);
  }
});

// UI → stop
bus.on('ui:stop', () => {
  resultScreen.hide();
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

// UI → pause: pause when playing, or start resume countdown when already paused
bus.on('ui:pause', () => {
  if (playing) {
    playing = false;
    paused = true;
    pauseStartTime = performance.now();
    audio.pause();
    pauseMenu.show(bgEnabled);
  } else if (paused) {
    pauseMenu.startResume();
  }
});

// UI → resume (emitted by PauseMenu after countdown)
bus.on('ui:resume', () => {
  // Shift note timestamps so paused wall-clock time is ignored
  const pausedDuration = performance.now() - pauseStartTime;
  spawner.shiftSpawnTimes(pausedDuration);
  playStartTime += pausedDuration;
  paused = false;
  playing = true;
  lastTime = performance.now();
  audio.resume();
  controls.setPlaying(true);
});

// Audio → beat (only used for beat flash now, not spawning)
audio.onBeat = (_energy, _laneIndex) => {
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
  hud.updateScore(0, 0);

  resultScreen.show({
    songName: lastSongName,
    achievement: judge.getAchievement(),
    rank: judge.getRank(),
    maxCombo: judge.maxCombo,
    judgements: { ...judge.judgements },
    totalNotes: judge.totalNotes,
    difficulty: getDifficulty(),
  });
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

// ── FPS Counter ──────────────────────────────────────────────────
const fpsEl = document.createElement('div');
Object.assign(fpsEl.style, {
  position: 'fixed', bottom: '10px', left: '10px', zIndex: '100',
  color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontFamily: 'monospace',
  pointerEvents: 'none',
});
document.body.appendChild(fpsEl);
let fpsFrames = 0;
let fpsLastUpdate = performance.now();

// One initial render so the canvas isn't an uninitialized framebuffer before
// the first track loads — after that, render() only runs while playing.
sceneSetup.render();

// Re-render once when the window is resized while paused/stopped, otherwise
// the frozen canvas would stretch with the new viewport.
window.addEventListener('resize', () => { if (!playing) sceneSetup.render(); });

// ── Game loop ────────────────────────────────────────────────────
function loop(): void {
  requestAnimationFrame(loop);

  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  // Skip all work when paused/stopped — the fractal shader is the heavy bit
  // and there's nothing for the player to look at that would change anyway.
  // The canvas keeps the last frame, the DOM overlays (pause menu, HUD,
  // title screen) still render via the browser.
  if (!playing) return;

  // FPS + pixel count
  fpsFrames++;
  if (now - fpsLastUpdate >= 500) {
    const fps = (fpsFrames / ((now - fpsLastUpdate) / 1000)).toFixed(0);
    const pr = sceneSetup.renderer.getPixelRatio();
    const totalPx = Math.round(window.innerWidth * pr * window.innerHeight * pr);
    const pxStr = totalPx > 1_000_000 ? `${(totalPx / 1_000_000).toFixed(2)}M` : `${(totalPx / 1000).toFixed(0)}K`;
    fpsEl.textContent = `${fps} fps | ${pxStr} px`;
    fpsFrames = 0;
    fpsLastUpdate = now;
  }

  // Advance camera
  cameraZ += TUNNEL_SPEED * getFlowSpeed() * dt;
  spawner.cameraZ = cameraZ;

  // Spawn notes from pre-generated beatmap
  if (beatmap) {
    const diff = getDifficulty();
    const elapsedMs = now - playStartTime;
    while (beatmapIndex < beatmap.notes.length) {
      const entry = beatmap.notes[beatmapIndex];
      if (entry.timeMs > elapsedMs) break;
      if (entry.noteType === 'simultaneous') {
        // Simultaneous notes come in pairs with same timeMs; spawn individually
        spawner.spawn(entry.sectorIndex, 'simultaneous');
      } else {
        spawner.spawn(entry.sectorIndex, 'single');
      }
      beatmapIndex++;
    }
  }

  // Check for missed notes
  const missed = spawner.update(now);
  for (const _ of missed) judge.miss();

  // Build note shader data — active notes fill slots first, fly notes use remainder
  if (fractalBg) {
    const shaderNotes: NoteShaderData[] = [];
    const pushNote = (n: typeof spawner.notes[0]) => {
      shaderNotes.push({
        id: n.id, x: n.wallX, y: n.wallY,
        z: n.currentZ(now, cameraZ),
        state: 1.0,
        color: [...n.color] as [number, number, number],
      });
    };
    for (const n of spawner.notes) {
      if (shaderNotes.length >= MAX_SHADER_NOTES) break;
      if (n.state === 'active') pushNote(n);
    }
    for (const n of spawner.notes) {
      if (shaderNotes.length >= MAX_SHADER_NOTES) break;
      if (n.state === 'fly') pushNote(n);
    }
    fractalBg.updateNotes(shaderNotes);
    fractalBg.update(bassNorm, trebleNorm, cameraZ, sceneSetup.renderer);
  }

  sceneSetup.render();
}
loop();
