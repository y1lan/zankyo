import type { Bus } from '../core/Bus';

const STYLE = `
#pause-menu-overlay {
  position: fixed; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(6px);
  z-index: 10;
  opacity: 0; pointer-events: none;
  transition: opacity 0.25s ease;
}
#pause-menu-overlay.pm-visible {
  opacity: 1; pointer-events: auto;
}
#pause-menu-panel {
  display: flex; flex-direction: column; align-items: stretch; gap: 14px;
  padding: 40px 48px;
  border: 2px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(16px);
  min-width: 300px;
}
.pm-btn {
  padding: 14px 36px;
  border: 2px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.05);
  color: #fff;
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 0.95rem; font-weight: 700; letter-spacing: 0.2em;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.pm-btn:hover {
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.6);
}
#pm-resume { border-color: rgba(255,200,50,0.5);  background: rgba(255,200,50,0.08); }
#pm-menu   { border-color: rgba(255,100,100,0.5); background: rgba(255,50,50,0.08); }
#pm-bg     { border-color: rgba(100,255,150,0.4); background: rgba(100,255,150,0.06); }
#pm-countdown {
  display: none;
  text-align: center;
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 6rem; font-weight: 900; color: #fff;
  text-shadow: 0 0 40px rgba(255,200,50,0.8), 0 0 80px rgba(255,200,50,0.4);
  min-height: 7rem; line-height: 1;
}
@keyframes pmCountPop {
  0%   { transform: scale(1.4); opacity: 0.9; }
  60%  { transform: scale(1.0); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0; }
}
`;

export class PauseMenu {
  public el: HTMLDivElement;
  private countdownEl: HTMLDivElement;
  private buttonsEl: HTMLDivElement;
  private bgBtn: HTMLButtonElement;
  private bus: Bus;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _counting: boolean = false;
  private _bgEnabled: boolean = true;

  constructor(bus: Bus) {
    this.bus = bus;

    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    this.el = document.createElement('div');
    this.el.id = 'pause-menu-overlay';

    const panel = document.createElement('div');
    panel.id = 'pause-menu-panel';

    this.countdownEl = document.createElement('div');
    this.countdownEl.id = 'pm-countdown';

    this.buttonsEl = document.createElement('div');
    Object.assign(this.buttonsEl.style, { display: 'flex', flexDirection: 'column', gap: '14px' });

    const resumeBtn = this._btn('RESUME',       'pm-resume');
    const menuBtn   = this._btn('BACK TO MENU', 'pm-menu');
    this.bgBtn      = this._btn('BG ON',        'pm-bg') as HTMLButtonElement;

    resumeBtn.addEventListener('click', () => this._startCountdown());
    menuBtn.addEventListener('click',   () => bus.emit('ui:stop'));
    this.bgBtn.addEventListener('click', () => {
      this._bgEnabled = !this._bgEnabled;
      this._updateBgBtn();
      bus.emit('ui:toggle-bg');
    });

    this.buttonsEl.append(resumeBtn, menuBtn, this.bgBtn);
    panel.append(this.countdownEl, this.buttonsEl);
    this.el.appendChild(panel);
    document.body.appendChild(this.el);
  }

  private _btn(text: string, id: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = id;
    btn.className = 'pm-btn';
    btn.textContent = text;
    return btn;
  }

  private _updateBgBtn(): void {
    this.bgBtn.textContent = this._bgEnabled ? 'BG ON' : 'BG OFF';
    Object.assign(this.bgBtn.style, {
      borderColor: this._bgEnabled ? 'rgba(100,255,150,0.4)' : 'rgba(180,180,180,0.3)',
      background:  this._bgEnabled ? 'rgba(100,255,150,0.06)' : 'rgba(180,180,180,0.04)',
    });
  }

  show(bgEnabled: boolean): void {
    this._bgEnabled = bgEnabled;
    this._updateBgBtn();
    this.countdownEl.style.display = 'none';
    this.buttonsEl.style.display = 'flex';
    this.el.classList.add('pm-visible');
  }

  hide(): void {
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._counting = false;
    this.el.classList.remove('pm-visible');
  }

  get isCountingDown(): boolean { return this._counting; }

  startResume(): void {
    if (this._counting) return;
    this._startCountdown();
  }

  private _startCountdown(): void {
    this._counting = true;
    this.buttonsEl.style.display = 'none';
    this.countdownEl.style.display = 'block';

    const show = (n: number) => {
      this.countdownEl.textContent = String(n);
      this.countdownEl.style.animation = 'none';
      void this.countdownEl.offsetWidth;
      this.countdownEl.style.animation = 'pmCountPop 0.9s ease-out forwards';
    };

    show(3);
    this._timer = setTimeout(() => {
      show(2);
      this._timer = setTimeout(() => {
        show(1);
        this._timer = setTimeout(() => {
          this._timer = null;
          this.hide();
          this.bus.emit('ui:resume');
        }, 950);
      }, 950);
    }, 950);
  }
}
