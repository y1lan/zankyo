import type { Bus } from '../core/Bus';

interface ResultData {
  songName: string;
  achievement: number;
  rank: string;
  maxCombo: number;
  judgements: { critical: number; perfect: number; great: number; good: number; miss: number };
  totalNotes: number;
  difficulty: { label: string; color: string };
}

const STYLE = `
#result-overlay {
  position: fixed; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(8px);
  z-index: 200;
  opacity: 0; pointer-events: none;
  transition: opacity 0.35s ease;
}
#result-overlay:not(.rs-visible) { backdrop-filter: none; }
#result-overlay.rs-visible { opacity: 1; pointer-events: auto; }

#result-panel {
  display: flex; flex-direction: column; align-items: stretch; gap: 20px;
  padding: 36px 44px;
  border: 2px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20px);
  min-width: 560px;
  font-family: 'Noto Sans JP', sans-serif;
}

/* ── Header ── */
.rs-title {
  margin: 0;
  font-size: 0.65rem; font-weight: 700; letter-spacing: 0.4em;
  color: rgba(255,255,255,0.3); text-align: center;
}

/* ── Two-column body ── */
.rs-body {
  display: flex; gap: 0; align-items: stretch;
}

/* ── Left: score ── */
.rs-left {
  flex: 0 0 180px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 6px;
  padding-right: 28px;
  border-right: 1px solid rgba(255,255,255,0.12);
}
.rs-rank {
  margin: 0;
  font-size: 4.5rem; font-weight: 900; line-height: 1;
}
.rs-achieve {
  margin: 0;
  font-size: 1.5rem; font-weight: 700; color: #fff;
  font-variant-numeric: tabular-nums;
}

/* ── Right: details ── */
.rs-right {
  flex: 1;
  display: flex; flex-direction: column; gap: 14px;
  padding-left: 28px;
}
.rs-song-row {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
}
.rs-song {
  margin: 0;
  font-size: 0.95rem; font-weight: 700; color: #fff;
  letter-spacing: 0.05em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 220px;
}
.rs-diff {
  flex-shrink: 0;
  padding: 2px 8px; border: 2px solid;
  font-size: 0.65rem; font-weight: 700; letter-spacing: 0.2em;
}
.rs-combo {
  margin: 0;
  font-size: 0.8rem; font-weight: 700; letter-spacing: 0.15em;
  color: rgba(255,255,255,0.55);
}
.rs-judges {
  display: flex; flex-direction: column; gap: 4px;
}
.rs-judge-row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em;
}
.rs-judge-count {
  font-variant-numeric: tabular-nums; min-width: 28px; text-align: right;
}

/* ── Footer button ── */
#rs-menu {
  align-self: center;
  padding: 10px 32px;
  border: 2px solid rgba(255,100,100,0.5);
  background: rgba(255,50,50,0.08); color: #fff;
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 0.85rem; font-weight: 700; letter-spacing: 0.2em;
  cursor: pointer; transition: background 0.2s, border-color 0.2s;
}
#rs-menu:hover { background: rgba(255,50,50,0.2); border-color: rgba(255,100,100,0.8); }
`;

const JUDGE_CONFIG = [
  { key: 'critical', label: 'CRITICAL PERFECT', color: '#ffd700' },
  { key: 'perfect',  label: 'PERFECT',           color: '#ffaa44' },
  { key: 'great',    label: 'GREAT',              color: '#ff77cc' },
  { key: 'good',     label: 'GOOD',               color: '#88ff88' },
  { key: 'miss',     label: 'MISS',               color: '#888888' },
] as const;

export class ResultScreen {
  public el: HTMLDivElement;
  private songEl: HTMLParagraphElement;
  private diffEl: HTMLSpanElement;
  private rankEl: HTMLParagraphElement;
  private achieveEl: HTMLParagraphElement;
  private comboEl: HTMLParagraphElement;
  private judgeRows: Map<string, HTMLSpanElement> = new Map();

  constructor(bus: Bus) {
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    this.el = document.createElement('div');
    this.el.id = 'result-overlay';

    const panel = document.createElement('div');
    panel.id = 'result-panel';

    // Header
    const title = document.createElement('p');
    title.className = 'rs-title';
    title.textContent = 'RESULT';

    // Two-column body
    const body = document.createElement('div');
    body.className = 'rs-body';

    // Left column: rank + achievement
    const left = document.createElement('div');
    left.className = 'rs-left';

    this.rankEl = document.createElement('p');
    this.rankEl.className = 'rs-rank';

    this.achieveEl = document.createElement('p');
    this.achieveEl.className = 'rs-achieve';

    left.append(this.rankEl, this.achieveEl);

    // Right column: song info + combo + judges
    const right = document.createElement('div');
    right.className = 'rs-right';

    const songRow = document.createElement('div');
    songRow.className = 'rs-song-row';

    this.songEl = document.createElement('p');
    this.songEl.className = 'rs-song';

    this.diffEl = document.createElement('span');
    this.diffEl.className = 'rs-diff';

    songRow.append(this.songEl, this.diffEl);

    this.comboEl = document.createElement('p');
    this.comboEl.className = 'rs-combo';

    const judgesEl = document.createElement('div');
    judgesEl.className = 'rs-judges';
    for (const cfg of JUDGE_CONFIG) {
      const row = document.createElement('div');
      row.className = 'rs-judge-row';
      const label = document.createElement('span');
      label.textContent = cfg.label;
      label.style.color = cfg.color;
      const count = document.createElement('span');
      count.className = 'rs-judge-count';
      count.style.color = cfg.color;
      this.judgeRows.set(cfg.key, count);
      row.append(label, count);
      judgesEl.appendChild(row);
    }

    right.append(songRow, this.comboEl, judgesEl);
    body.append(left, right);

    // Footer button
    const menuBtn = document.createElement('button');
    menuBtn.id = 'rs-menu';
    menuBtn.textContent = 'BACK TO MENU';
    menuBtn.addEventListener('click', () => bus.emit('ui:stop'));

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Space' && this.el.classList.contains('rs-visible')) {
        e.preventDefault();
        bus.emit('ui:stop');
      }
    });

    panel.append(title, body, menuBtn);
    this.el.appendChild(panel);
    document.body.appendChild(this.el);
  }

  show(data: ResultData): void {
    this.songEl.textContent = data.songName;

    this.diffEl.textContent = data.difficulty.label;
    this.diffEl.style.color = data.difficulty.color;
    this.diffEl.style.borderColor = data.difficulty.color + '90';

    const rankColor = this._rankColor(data.rank);
    this.rankEl.textContent = data.rank;
    this.rankEl.style.color = rankColor;
    this.rankEl.style.textShadow = `0 0 30px ${rankColor}, 0 0 60px ${rankColor}80`;

    this.achieveEl.textContent = data.achievement.toFixed(2) + '%';

    this.comboEl.textContent = `MAX COMBO  ${data.maxCombo}`;

    for (const cfg of JUDGE_CONFIG) {
      const el = this.judgeRows.get(cfg.key);
      if (el) el.textContent = String(data.judgements[cfg.key]);
    }

    this.el.classList.add('rs-visible');
  }

  hide(): void {
    this.el.classList.remove('rs-visible');
  }

  private _rankColor(rank: string): string {
    if (rank.startsWith('S')) return '#ffd700';
    if (rank.startsWith('A')) return '#88ddff';
    if (rank === 'B' || rank === 'C') return '#ffaa44';
    return '#ff5555';
  }
}
