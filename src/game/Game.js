import { SceneSetup } from '../rendering/SceneSetup.js';
import { BeatDetector } from '../audio/BeatDetector.js';
import { Note } from './Note.js';
import { HitEffect } from '../rendering/HitEffect.js';
import { Effects } from '../rendering/Effects.js';
import { UI } from '../ui/UI.js';
import {
  HIT_ZONE_MIN,
  HIT_ZONE_MAX,
  PERFECT_ZONE_MIN,
  PERFECT_ZONE_MAX,
  MISS_Z,
  LANES,
} from './Constants.js';
import gsap from 'gsap';

const KEY_TO_LANE = Object.fromEntries(
  LANES.map((lane, i) => [lane.key, i])
);

export class Game {
  constructor() {
    this.sceneSetup = new SceneSetup();
    this.scene = this.sceneSetup.scene;
    this.camera = this.sceneSetup.camera;

    this.beatDetector = new BeatDetector();
    this.hitEffect = new HitEffect(this.scene);
    this.ui = new UI();
    this.effects = null;

    this.notes = [];
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;

    this.setupInput();
    this.setupBeatDetection();
    this.setupAudioLoading();

    this.animate();
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const laneIndex = KEY_TO_LANE[e.code];
      if (laneIndex !== undefined) {
        this.handleLanePress(laneIndex);
      }
    });
  }

  setupBeatDetection() {
    this.beatDetector.onBeat = (energy, laneIndex) => {
      if (!this.beatDetector.isPlaying) return;
      this.spawnNote(laneIndex);
      this.ui.showBeat(energy);
    };

    this.beatDetector.onFrequencyData = (data) => {
      if (this.effects) {
        this.effects.update(data);
      }
    };
  }

  setupAudioLoading() {
    const loadFile = async (file) => {
      if (!file) return;
      this.ui.showLoading();
      try {
        await this.beatDetector.loadAudio(file);
        if (!this.effects) {
          this.effects = new Effects(this.scene, this.camera);
        }
        this.resetGame();
        this.beatDetector.play();
        const name = file.name.replace(/\.[^/.]+$/, '');
        this.ui.setPlaying(true, name);
        this.ui.fileInput.value = '';
      } catch (err) {
        console.error('Failed to load audio:', err);
      } finally {
        this.ui.hideLoading();
      }
    };

    this.ui.fileInput.addEventListener('change', (e) => loadFile(e.target.files[0]));

    this.ui.stopBtn.addEventListener('click', () => this.stopPlayback());

    this.beatDetector.onEnded = () => {
      this.ui.setPlaying(false);
    };
  }

  stopPlayback() {
    this.beatDetector.stop();
    for (const note of this.notes) note.destroy();
    this.notes = [];
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.ui.updateScore(0);
    this.ui.updateCombo(0);
    this.ui.setPlaying(false);
    this.ui.fileInput.value = '';
  }

  resetGame() {
    for (const note of this.notes) {
      note.destroy();
    }
    this.notes = [];
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.ui.updateScore(0);
    this.ui.updateCombo(0);
  }

  spawnNote(laneIndex) {
    const note = new Note(this.scene, laneIndex);
    this.notes.push(note);
  }

  handleLanePress(laneIndex) {
    // Find the closest note in the hit zone that matches this lane
    let bestNote = null;
    let bestDist = Infinity;

    for (const note of this.notes) {
      if (note.hit || note.missed) continue;
      if (note.laneIndex !== laneIndex) continue;
      const z = note.getZ();
      if (z >= HIT_ZONE_MIN && z <= HIT_ZONE_MAX) {
        const dist = Math.abs(z - 10);
        if (dist < bestDist) {
          bestDist = dist;
          bestNote = note;
        }
      }
    }

    if (bestNote) {
      this.hitNote(bestNote);
    } else {
      // Penalty: pressing with no valid note in lane
      this.emptyHit();
    }
  }

  hitNote(note) {
    note.hit = true;

    const z = note.getZ();
    let quality, points, color;

    if (z >= PERFECT_ZONE_MIN && z <= PERFECT_ZONE_MAX) {
      quality = 'perfect';
      points = 300;
      color = '#ffdd00';
    } else {
      quality = 'good';
      points = 100;
      color = '#ffffff';
    }

    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const comboMultiplier = 1 + Math.floor(this.combo / 10);
    this.score += points * comboMultiplier;

    this.hitEffect.spawn(note.mesh.position.clone(), quality);
    this.ui.updateScore(this.score);
    this.ui.updateCombo(this.combo);
    this.ui.showJudgement(
      quality === 'perfect' ? 'PERFECT!' : 'GOOD',
      color
    );

    note.destroy();
  }

  emptyHit() {
    this.combo = 0;
    this.ui.updateCombo(0);
    this.ui.showJudgement('WHIFF', '#888888');
  }

  missNote(note) {
    note.missed = true;
    this.combo = 0;
    this.ui.updateCombo(0);
    this.ui.showJudgement('MISS', '#ff3333');
    this.shakeCamera();
    note.destroy();
  }

  shakeCamera() {
    const origX = this.camera.position.x;
    const origY = this.camera.position.y;

    gsap.to(this.camera.position, {
      x: origX + (Math.random() - 0.5) * 3,
      y: origY + (Math.random() - 0.5) * 3,
      duration: 0.05,
      repeat: 3,
      yoyo: true,
      onComplete: () => {
        this.camera.position.x = origX;
        this.camera.position.y = origY;
      },
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();

    for (let i = this.notes.length - 1; i >= 0; i--) {
      const note = this.notes[i];
      if (note.hit || note.missed) {
        this.notes.splice(i, 1);
        continue;
      }

      note.update(now);

      if (note.getZ() > MISS_Z) {
        this.missNote(note);
        this.notes.splice(i, 1);
      }
    }

    this.sceneSetup.render();
  }
}
