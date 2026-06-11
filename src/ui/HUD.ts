import { COMBO_HOT_THRESHOLD } from '../engine/Config';

export class HUD {
  public el: HTMLDivElement;
  public songEl: HTMLDivElement;
  public scoreEl: HTMLDivElement;
  public comboEl: HTMLDivElement;
  public achieveEl: HTMLDivElement;

  constructor() {
    this.el = document.createElement("div");
    Object.assign(this.el.style, {
      position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
      pointerEvents: "none", zIndex: "2", fontFamily: "'Noto Sans JP', sans-serif",
    });

    // Song name (top-left)
    this.songEl = this._div("song-name", { top: "30px", left: "40px", fontSize: "0.9rem", fontWeight: "700", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", position: "absolute", maxWidth: "50vw", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });

    // Score removed — show percentage only
    this.scoreEl = this._div("score", { display: "none" });

    // Achievement % (top-right)
    this.achieveEl = this._div("achieve", { top: "30px", right: "40px", fontSize: "2rem", fontWeight: "700", color: "#fff", textShadow: "0 0 20px rgba(255,255,255,0.5)", letterSpacing: "0.1em", fontVariantNumeric: "tabular-nums", position: "absolute" });
    this.achieveEl.textContent = "0.00%";

    // Combo (center-right)
    this.comboEl = this._div("combo", { top: "50%", right: "60px", fontSize: "4rem", fontWeight: "900", color: "#00ffff", textShadow: "0 0 30px rgba(0,255,255,0.8),0 0 60px rgba(0,200,255,0.5)", opacity: "0", transition: "all 0.15s", fontStyle: "italic", transform: "skewX(-10deg) translateY(-50%)", position: "absolute" });

    // (BEAT! element removed)

    this._addStyles();
    document.body.appendChild(this.el);
  }

  private _div(id: string, styles: Partial<CSSStyleDeclaration>): HTMLDivElement {
    const d = document.createElement("div");
    d.id = id;
    Object.assign(d.style, styles);
    this.el.appendChild(d);
    return d;
  }

  private _addStyles(): void {
    const s = document.createElement("style");
    s.textContent = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700;900&display=swap');`;
    document.head.appendChild(s);
  }

  showSong(name: string): void { this.songEl.textContent = name; }
  hideSong(): void { this.songEl.textContent = ""; }

  updateScore(score: number, combo: number): void {
    this.scoreEl.textContent = String(score).padStart(7, "0");
    if (combo > 0) {
      this.comboEl.style.opacity = "1";
      this.comboEl.textContent = `${combo}`;
      const hot = combo >= COMBO_HOT_THRESHOLD;
      this.comboEl.style.color = hot ? "#ff00ff" : "#00ffff";
      this.comboEl.style.textShadow = hot
        ? "0 0 30px rgba(255,0,255,0.8),0 0 60px rgba(255,0,200,0.5)"
        : "0 0 30px rgba(0,255,255,0.8),0 0 60px rgba(0,200,255,0.5)";
    } else {
      this.comboEl.style.opacity = "0";
    }
  }

  updateAchievement(percent: number, rank: string): void {
    this.achieveEl.textContent = `${percent.toFixed(2)}% | ${rank}`;
  }
}
