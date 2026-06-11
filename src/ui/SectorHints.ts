import type { Bus } from '../core/Bus';
import { SECTORS, HIT_RING_FRACTION } from '../engine/Config';
import { KEY_TO_SECTOR } from '../engine/HitJudge';

// Place hints just outside the ring
const HINT_RADIUS_FACTOR = 1.18;
const FLASH_MS = 140;

export class SectorHints {
  private container: HTMLDivElement;
  private hints: HTMLDivElement[] = [];
  private flashTimers: Array<ReturnType<typeof setTimeout> | null> = [];

  constructor(bus: Bus) {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '5',
    });
    document.body.appendChild(this.container);

    // Hide on touch devices — keyboard hints are useless there
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      this.container.style.display = 'none';
      return;
    }

    // Reverse map: sector index → key label
    const sectorToLabel: Record<number, string> = {};
    for (const [code, idx] of Object.entries(KEY_TO_SECTOR)) {
      sectorToLabel[idx] = code === 'Semicolon' ? ';' : code.replace(/^Key/, '');
    }

    for (let i = 0; i < SECTORS.length; i++) {
      const el = document.createElement('div');
      el.textContent = sectorToLabel[i] ?? '';
      Object.assign(el.style, {
        position: 'absolute',
        transform: 'translate(-50%, -50%)',
        fontFamily: "'Courier New', monospace",
        fontWeight: '700',
        fontSize: '0.85rem',
        color: 'rgba(255,255,255,0.65)',
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: '4px',
        padding: '2px 7px',
        letterSpacing: '0.05em',
        transition: 'all 120ms ease-out',
        backdropFilter: 'blur(4px)',
      });
      this.container.appendChild(el);
      this.hints.push(el);
      this.flashTimers.push(null);
    }

    this._reposition();
    window.addEventListener('resize', () => this._reposition());

    bus.on('input:key', ({ sectorIndex }) => this.flash(sectorIndex));
  }

  private _reposition(): void {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const ringR = HIT_RING_FRACTION * Math.min(window.innerWidth, window.innerHeight) * 0.5;
    const r = ringR * HINT_RADIUS_FACTOR;
    for (let i = 0; i < SECTORS.length; i++) {
      const a = SECTORS[i].angle;
      const x = cx + r * Math.cos(a);
      const y = cy - r * Math.sin(a); // screen y is inverted
      this.hints[i].style.left = `${x}px`;
      this.hints[i].style.top = `${y}px`;
    }
  }

  flash(sectorIndex: number): void {
    const el = this.hints[sectorIndex];
    if (!el) return;
    el.style.color = '#fff';
    el.style.background = 'rgba(94,234,212,0.35)';
    el.style.borderColor = 'rgba(94,234,212,0.9)';
    if (this.flashTimers[sectorIndex] !== null) {
      clearTimeout(this.flashTimers[sectorIndex] as ReturnType<typeof setTimeout>);
    }
    this.flashTimers[sectorIndex] = setTimeout(() => {
      el.style.color = 'rgba(255,255,255,0.65)';
      el.style.background = 'rgba(0,0,0,0.35)';
      el.style.borderColor = 'rgba(255,255,255,0.25)';
      this.flashTimers[sectorIndex] = null;
    }, FLASH_MS);
  }
}
