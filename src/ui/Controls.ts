import type { Bus } from '../core/Bus';
import { getDifficulty, cycleDifficulty } from '../engine/Difficulty';
import { getFlowSpeed, adjustFlowSpeed, FLOW_SPEED_STEP } from '../engine/FlowSpeed';
import { SONG_LIST, type SongEntry } from '../audio/SongList';

export class Controls {
  public el: HTMLDivElement;
  public pauseBtn: HTMLButtonElement;
  public fileInput: HTMLInputElement;
  public loadLabel: HTMLLabelElement;
  public difficultyBtn: HTMLButtonElement;
  private flowSpeedRow: HTMLDivElement;
  private flowSpeedValEl: HTMLSpanElement;
  private autoBtn: HTMLButtonElement = null!;
  private autoIndicator: HTMLSpanElement = null!;
  private _autoMode: boolean = false;
  private _playing: boolean = false;
  private _menuBlur: HTMLDivElement = null!;
  private _songSelect: HTMLSelectElement = null!;
  private _loadingBar: HTMLDivElement = null!;
  private _loadingFill: HTMLDivElement = null!;

  constructor(bus: Bus) {
    // Full-screen blur overlay for main menu
    const menuBlur = document.createElement('div');
    menuBlur.id = 'menu-blur';
    Object.assign(menuBlur.style, {
      position: 'fixed', inset: '0', zIndex: '3',
      backdropFilter: 'blur(12px)',
      background: 'rgba(0, 0, 0, 0.3)',
      transition: 'opacity 0.4s ease-out',
      pointerEvents: 'none',
    });
    document.body.appendChild(menuBlur);
    this._menuBlur = menuBlur;
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
    this.loadLabel.textContent = 'PLAY MY OWN SONG';
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

    // Song selector dropdown (above LOAD TRACK)
    this._songSelect = document.createElement('select');
    this._songSelect.id = 'song-select';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'SONG LIST';
    defaultOpt.disabled = true;
    defaultOpt.selected = true;
    this._songSelect.appendChild(defaultOpt);
    for (const song of SONG_LIST) {
      const opt = document.createElement('option');
      opt.value = song.id;
      opt.textContent = song.title;
      this._songSelect.appendChild(opt);
    }
    Object.assign(this._songSelect.style, {
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%, calc(-50% - 60px))',
      padding: '12px 36px', border: '2px solid rgba(255,255,255,0.3)',
      background: 'rgba(255,255,255,0.05)', color: '#fff',
      fontFamily: "'Noto Sans JP', sans-serif", fontSize: '0.95rem',
      fontWeight: '700', letterSpacing: '0.2em', cursor: 'pointer',
      backdropFilter: 'blur(10px)', zIndex: '10',
      appearance: 'none', textAlign: 'center', boxSizing: 'border-box',
      width: '12em',
    });
    document.body.appendChild(this._songSelect);

    // Loading bar (hidden by default)
    this._loadingBar = document.createElement('div');
    Object.assign(this._loadingBar.style, {
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%, calc(-50% - 20px))',
      width: '200px', height: '4px',
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '2px', overflow: 'hidden',
      zIndex: '10', display: 'none',
    });
    this._loadingFill = document.createElement('div');
    Object.assign(this._loadingFill.style, {
      width: '0%', height: '100%',
      background: 'rgba(100,220,255,0.8)',
      borderRadius: '2px',
      transition: 'width 0.1s linear',
    });
    this._loadingBar.appendChild(this._loadingFill);
    document.body.appendChild(this._loadingBar);

    this._songSelect.addEventListener('change', () => {
      const songId = this._songSelect.value;
      const song = SONG_LIST.find(s => s.id === songId);
      if (song) this._loadSong(song, bus);
    });

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

    // Flow speed control row (below difficulty button)
    this.flowSpeedRow = document.createElement('div');
    this.flowSpeedRow.id = 'flow-speed-row';
    Object.assign(this.flowSpeedRow.style, {
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%, calc(-50% + 110px))',
      display: 'flex', alignItems: 'center', gap: '8px',
      fontFamily: "'Noto Sans JP', sans-serif",
      fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.2em',
      color: 'rgba(255,255,255,0.55)', zIndex: '10',
    });

    const speedLabel = document.createElement('span');
    speedLabel.textContent = 'SPEED';

    const speedDown = document.createElement('button');
    const speedUp = document.createElement('button');
    for (const btn of [speedDown, speedUp]) {
      Object.assign(btn.style, {
        padding: '3px 10px',
        border: '1px solid rgba(255,255,255,0.2)',
        background: 'rgba(255,255,255,0.04)', color: '#fff',
        fontFamily: "'Noto Sans JP', sans-serif", fontSize: '0.9rem',
        fontWeight: '700', cursor: 'pointer', backdropFilter: 'blur(8px)',
      });
    }
    speedDown.textContent = '−';
    speedUp.textContent = '+';

    this.flowSpeedValEl = document.createElement('span');
    Object.assign(this.flowSpeedValEl.style, {
      minWidth: '48px', textAlign: 'center',
      fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.85)',
    });

    speedDown.addEventListener('click', () => { adjustFlowSpeed(-FLOW_SPEED_STEP); this._updateFlowSpeedVal(); });
    speedUp.addEventListener('click', () => { adjustFlowSpeed(+FLOW_SPEED_STEP); this._updateFlowSpeedVal(); });

    this.flowSpeedRow.append(speedDown, speedLabel, this.flowSpeedValEl, speedUp);
    document.body.appendChild(this.flowSpeedRow);
    this._updateFlowSpeedVal();

    // AUTO toggle button (below flow speed)
    this.autoBtn = document.createElement('button');
    this.autoBtn.id = 'auto-btn';
    Object.assign(this.autoBtn.style, {
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%, calc(-50% + 160px))',
      padding: '4px 18px', border: '1px solid rgba(255,255,255,0.15)',
      background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.4)',
      fontFamily: "'Noto Sans JP', sans-serif", fontSize: '0.65rem',
      fontWeight: '700', letterSpacing: '0.25em', cursor: 'pointer',
      backdropFilter: 'blur(8px)', zIndex: '10',
      transition: 'all 200ms ease-out',
    });
    this.autoBtn.addEventListener('click', () => bus.emit('ui:toggle-auto'));
    this._applyAutoStyle();
    document.body.appendChild(this.autoBtn);

    // AUTO indicator shown in-game (next to pause button)
    this.autoIndicator = document.createElement('span');
    Object.assign(this.autoIndicator.style, {
      fontSize: '0.6rem', fontFamily: "'Noto Sans JP', sans-serif",
      fontWeight: '700', letterSpacing: '0.2em',
      color: '#ffdd44', display: 'none',
    });
    this.autoIndicator.textContent = 'AUTO';
    this.el.appendChild(this.autoIndicator);

    this.fileInput.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const f = target.files?.[0];
      if (f) bus.emit('ui:load', { file: f });
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        bus.emit('ui:pause');
        return;
      }
      if (!this._playing) {
        if (e.code === 'BracketLeft') { e.preventDefault(); adjustFlowSpeed(-FLOW_SPEED_STEP); this._updateFlowSpeedVal(); }
        if (e.code === 'BracketRight') { e.preventDefault(); adjustFlowSpeed(+FLOW_SPEED_STEP); this._updateFlowSpeedVal(); }
      }
    });
  }

  setPlaying(playing: boolean): void {
    this._playing = playing;
    this.loadLabel.style.display = playing ? 'none' : 'inline-block';
    this._songSelect.style.display = playing ? 'none' : 'block';
    this._loadingBar.style.display = 'none';
    this.difficultyBtn.style.display = playing ? 'none' : 'inline-block';
    this.flowSpeedRow.style.display = playing ? 'none' : 'flex';
    this.autoBtn.style.display = playing ? 'none' : 'inline-block';
    this._logo.style.display = playing ? 'none' : 'block';
    this.el.style.display = playing ? 'flex' : 'none';
    this.autoIndicator.style.display = (playing && this._autoMode) ? 'inline' : 'none';
    this._menuBlur.style.opacity = playing ? '0' : '1';
    this._menuBlur.style.pointerEvents = 'none';
  }

  setAutoMode(on: boolean): void {
    this._autoMode = on;
    this._applyAutoStyle();
    if (this._playing) {
      this.autoIndicator.style.display = on ? 'inline' : 'none';
    }
  }

  clearFile(): void { this.fileInput.value = ''; }

  private _applyAutoStyle(): void {
    if (this._autoMode) {
      this.autoBtn.textContent = 'AUTO ●';
      this.autoBtn.style.color = '#ffdd44';
      this.autoBtn.style.borderColor = '#ffdd4490';
    } else {
      this.autoBtn.textContent = 'AUTO';
      this.autoBtn.style.color = 'rgba(255,255,255,0.4)';
      this.autoBtn.style.borderColor = 'rgba(255,255,255,0.15)';
    }
  }

  private _applyDifficultyStyle(): void {
    const profile = getDifficulty();
    this.difficultyBtn.textContent = profile.label;
    this.difficultyBtn.style.color = profile.color;
    this.difficultyBtn.style.borderColor = profile.color + '90';
  }

  private _updateFlowSpeedVal(): void {
    this.flowSpeedValEl.textContent = getFlowSpeed().toFixed(1) + '×';
  }

  private async _loadSong(song: SongEntry, bus: Bus): Promise<void> {
    this._loadingBar.style.display = 'block';
    this._loadingFill.style.width = '0%';
    this._songSelect.disabled = true;

    try {
      const response = await fetch(song.file);
      if (!response.ok) throw new Error(`Failed to fetch ${song.file}`);

      const contentLength = Number(response.headers.get('content-length') || 0);
      const reader = response.body!.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (contentLength > 0) {
          this._loadingFill.style.width = `${(received / contentLength * 100).toFixed(0)}%`;
        }
      }

      const blob = new Blob(chunks);
      const file = new File([blob], song.title, { type: blob.type || 'audio/flac' });
      bus.emit('ui:load', { file });
    } catch (err) {
      console.error('Song load failed:', err);
    } finally {
      this._loadingBar.style.display = 'none';
      this._songSelect.disabled = false;
      this._songSelect.selectedIndex = 0;
    }
  }
}
