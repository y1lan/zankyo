import { bus } from './core/bus.js';
import { BeatDetector } from './audio/BeatDetector.js';
import { NoteSpawner } from './engine/NoteSpawner.js';
import { HitJudge } from './engine/HitJudge.js';
import { SceneSetup } from './rendering/SceneSetup.js';
import { FractalTunnel } from './rendering/FractalTunnel.js';
import { LaneMandalas } from './rendering/LaneMandalas.js';
import { HitEffects } from './rendering/HitEffects.js';
import { Controls } from './ui/Controls.js';
import { HUD } from './ui/HUD.js';
import { JudgementPopup } from './ui/JudgementPopup.js';
import gsap from 'gsap';

// ── Rendering ──────────────────────────────────────────────
const sceneSetup = new SceneSetup();
const { scene, camera } = sceneSetup;
new LaneMandalas(scene);
const hitFx = new HitEffects(scene);
let tunnel = null;

// ── UI ─────────────────────────────────────────────────────
const controls = new Controls(bus);
const hud = new HUD();
const judgement = new JudgementPopup();

// ── Engine ─────────────────────────────────────────────────
const spawner = new NoteSpawner(scene);
const judge = new HitJudge(bus, spawner);

// ── Audio ──────────────────────────────────────────────────
const audio = new BeatDetector();

// ── Wire bus events ────────────────────────────────────────

// UI → load audio
bus.on('ui:load', async ({ file }) => {
  try {
    await audio.loadAudio(file);
    audio.play();
    judge.reset();
    spawner.clear();
    if (!tunnel) tunnel = new FractalTunnel(scene);
    controls.setPlaying(true);
    hud.showSong(file.name.replace(/\.[^/.]+$/, ''));
    controls.clearFile();
  } catch (err) {
    console.error(err);
  }
});

// UI → stop
bus.on('ui:stop', () => {
  audio.stop();
  spawner.clear();
  judge.reset();
  controls.setPlaying(false);
  hud.hideSong();
  hud.updateScore(0, 0);
});

// Audio → beat → spawn note + visual feedback
audio.onBeat = (energy, laneIndex) => {
  spawner.spawn(laneIndex);
  hud.showBeat(energy);
  if (tunnel) tunnel.onBeat();
};

// Audio → frequency data → background + FOV + fractal tunnel
audio.onFrequencyData = ({ low, mid, high }) => {
  const ln = low / 255, mn = mid / 255, hn = high / 255;
  sceneSetup.setBg(0.03 + ln * 0.12, 0.02 + mn * 0.04, 0.04 + hn * 0.25);
  if (tunnel) tunnel.update({ lowNorm: ln, midNorm: mn, highNorm: hn });
};

// Audio → ended
audio.onEnded = () => {
  controls.setPlaying(false);
  hud.hideSong();
};

// Engine → hit → effects
bus.on('game:hit', ({ position, quality }) => {
  hitFx.spawn(position, quality);
});

// Engine → score/combo → HUD
bus.on('game:score', ({ score, combo }) => {
  hud.updateScore(score, combo);
});

// Engine → judgement → popup
bus.on('game:judgement', ({ text, color }) => {
  judgement.show(text, color);
});

// Engine → miss → camera shake
bus.on('game:miss', () => {
  const ox = camera.position.x, oy = camera.position.y;
  gsap.to(camera.position, {
    x: ox + (Math.random() - 0.5) * 1.5,
    y: oy + (Math.random() - 0.5) * 1.5,
    duration: 0.05, repeat: 3, yoyo: true,
    onComplete: () => { camera.position.x = ox; camera.position.y = oy; },
  });
});

// ── Game loop ──────────────────────────────────────────────
function loop() {
  requestAnimationFrame(loop);

  const missed = spawner.update(performance.now());
  for (const _ of missed) judge.miss();

  sceneSetup.render();
}
loop();
