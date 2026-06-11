import type { Bus } from '../core/bus.js';
import { getDifficulty, cycleDifficulty } from '../engine/difficulty.js';

export class Controls {
  public el: HTMLDivElement;
  public pauseBtn: HTMLButtonElement;
  public fileInput: HTMLInputElement;
  public loadLabel: HTMLLabelElement;
  public difficultyBtn: HTMLButtonElement;

  constructor(bus: Bus) {
    // Right-bottom container (visible during play)
    this.el = document.createElement('div');
    this.el.id = 'controls-bar';
    Object.assign(this.el.style, {
      position: 'fixed', bottom: '40px', right: '40px',
      display: 'none', zIndex: '10',
    });

    this.pauseBtn = document.createElement('button');
    this.pauseBtn.id = 'pause-btn';
    this.pauseBtn.textContent = '⏸';
    Object.assign(this.pauseBtn.style, {
      padding: '10px 20px', border: '2px solid rgba(255,200,50,0.5)',
      background: 'rgba(255,200,50,0.1)', color: '#fff',
      fontFamily: "'Noto Sans JP', sans-serif", fontSize: '1.4rem',
      cursor: 'pointer', backdropFilter: 'blur(10px)',
    });
    this.pauseBtn.addEventListener('click', () => bus.emit('ui:pause'));
    this.el.appendChild(this.pauseBtn);
    document.body.appendChild(this.el);

    // Hidden file input
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'audio/*';
    this.fileInput.id = 'file-input';
    this.fileInput.style.display = 'none';
    document.body.appendChild(this.fileInput);

    // Centered LOAD TRACK label (initial state)
    this.loadLabel = document.createElement('label');
    this.loadLabel.htmlFor = 'file-input';
    this.loadLabel.id = 'file-label';
    this.loadLabel.textContent = 'LOAD TRACK';
    Object.assign(this.loadLabel.style, {
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      padding: '12px 36px', border: '2px solid rgba(255,255,255,0.3)',
      background: 'rgba(255,255,255,0.05)', color: '#fff',
      fontFamily: "'Noto Sans JP', sans-serif", fontSize: '0.95rem',
      fontWeight: '700', letterSpacing: '0.2em', cursor: 'pointer',
      backdropFilter: 'blur(10px)', zIndex: '10',
    });
    document.body.appendChild(this.loadLabel);

    // Difficulty cycle button (centered, just below LOAD TRACK)
    this.difficultyBtn = document.createElement('button');
    this.difficultyBtn.id = 'difficulty-btn';
    Object.assign(this.difficultyBtn.style, {
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%, calc(-50% + 60px))',
      padding: '8px 24px', border: '2px solid',
      background: 'rgba(0,0,0,0.4)',
      fontFamily: "'Noto Sans JP', sans-serif", fontSize: '0.78rem',
      fontWeight: '700', letterSpacing: '0.25em', cursor: 'pointer',
      backdropFilter: 'blur(10px)', zIndex: '10',
      transition: 'all 200ms ease-out',
    });
    this._applyDifficultyStyle();
    this.difficultyBtn.addEventListener('click', () => {
      cycleDifficulty();
      this._applyDifficultyStyle();
    });
    document.body.appendChild(this.difficultyBtn);

    this.fileInput.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const f = target.files?.[0];
      if (f) bus.emit('ui:load', { file: f });
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        bus.emit('ui:pause');
      }
    });
  }

  setPlaying(playing: boolean): void {
    this.loadLabel.style.display = playing ? 'none' : 'inline-block';
    this.difficultyBtn.style.display = playing ? 'none' : 'inline-block';
    this.el.style.display = playing ? 'flex' : 'none';
  }

  clearFile(): void { this.fileInput.value = ''; }

  private _applyDifficultyStyle(): void {
    const profile = getDifficulty();
    this.difficultyBtn.textContent = profile.label;
    this.difficultyBtn.style.color = profile.color;
    this.difficultyBtn.style.borderColor = profile.color + '90';
  }
}
