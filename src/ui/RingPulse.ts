import type { Bus } from '../core/Bus';
import { SECTORS, HIT_RING_FRACTION } from '../engine/Config';

const PULSE_DURATION_MS = 250;
const ARC_GAP_RAD = 0.12; // gap on each side of sector boundary
const ARC_SPAN_RAD = Math.PI / 4 - ARC_GAP_RAD * 2; // arc length per sector
const STROKE_WIDTH = 5;
const EXPAND_PX = 20; // how far outward the arc travels

export class RingPulse {
  private svg: SVGSVGElement;

  constructor(bus: Bus) {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    Object.assign(this.svg.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: '4', overflow: 'visible',
    });
    document.body.appendChild(this.svg);

    bus.on('input:key', ({ sectorIndex }) => this._pulse(sectorIndex));
  }

  private _ringPixelRadius(): number {
    return HIT_RING_FRACTION * window.innerHeight * 0.5;
  }

  private _pulse(sectorIndex: number): void {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const r = this._ringPixelRadius();
    const centerAngle = SECTORS[sectorIndex].angle;

    // Arc from centerAngle - half_span to centerAngle + half_span
    // SVG arcs use clockwise screen angles (y-down), so flip.
    const halfSpan = ARC_SPAN_RAD / 2;
    const startAngle = -(centerAngle + halfSpan); // negate for screen coords
    const endAngle = -(centerAngle - halfSpan);

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const largeArc = ARC_SPAN_RAD > Math.PI ? 1 : 0;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'rgba(255, 230, 50, 0.9)');
    path.setAttribute('stroke-width', String(STROKE_WIDTH));
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('filter', 'url(#ringPulseGlow)');
    path.style.opacity = '1';
    path.style.transition = `opacity ${PULSE_DURATION_MS}ms ease-out, transform ${PULSE_DURATION_MS}ms ease-out`;
    path.style.transformOrigin = `${cx}px ${cy}px`;

    // Ensure glow filter exists
    if (!this.svg.querySelector('#ringPulseGlow')) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = `
        <filter id="ringPulseGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      `;
      this.svg.appendChild(defs);
    }

    this.svg.appendChild(path);

    const scaleFactor = (r + EXPAND_PX) / r;
    requestAnimationFrame(() => {
      path.style.transform = `scale(${scaleFactor})`;
      path.style.opacity = '0';
    });

    setTimeout(() => path.remove(), PULSE_DURATION_MS + 50);
  }
}
