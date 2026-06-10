export class HUD {
  public el: HTMLDivElement;
  public songEl: HTMLDivElement;
  public scoreEl: HTMLDivElement;
  public comboEl: HTMLDivElement;
  public beatEl: HTMLDivElement;
  public laneEl: HTMLDivElement;

  constructor() {
    this.el = document.createElement("div");
    Object.assign(this.el.style, {
      position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
      pointerEvents: "none", zIndex: "10", fontFamily: "'Noto Sans JP', sans-serif",
    });

    // Song name (top-left)
    this.songEl = this._div("song-name", { top: "30px", left: "40px", fontSize: "0.9rem", fontWeight: "700", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", position: "absolute", maxWidth: "50vw", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });

    // Score (top-right)
    this.scoreEl = this._div("score", { top: "30px", right: "40px", fontSize: "2rem", fontWeight: "700", color: "#fff", textShadow: "0 0 20px rgba(255,255,255,0.5)", letterSpacing: "0.15em", fontVariantNumeric: "tabular-nums", position: "absolute" });
    this.scoreEl.textContent = "0000000";

    // Combo (center-right)
    this.comboEl = this._div("combo", { top: "50%", right: "60px", fontSize: "4rem", fontWeight: "900", color: "#00ffff", textShadow: "0 0 30px rgba(0,255,255,0.8),0 0 60px rgba(0,200,255,0.5)", opacity: "0", transition: "all 0.15s", fontStyle: "italic", transform: "skewX(-10deg) translateY(-50%)", position: "absolute" });

    // BEAT! (center)
    this.beatEl = this._div("beat", { top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: "5rem", fontWeight: "900", color: "#fff", textShadow: "0 0 40px rgba(255,255,255,0.8)", opacity: "0", transition: "opacity 0.1s", letterSpacing: "0.2em", whiteSpace: "nowrap", position: "absolute" });
    this.beatEl.textContent = "BEAT!";

    // Lane keys (bottom area)
    this.laneEl = this._div("lane-keys", { bottom: "120px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "60px", position: "absolute" });
    this.laneEl.innerHTML = ["D","F","J","K"].map((k: string, i: number) => {
      const colors = ["#44aaff","#ff44aa","#aaff44","#ffaa44"];
      return `<span style="font-size:1.5rem;font-weight:900;color:${colors[i]};text-shadow:0 0 12px currentColor;opacity:0.45">${k}</span>`;
    }).join("");

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

  showBeat(intensity: number): void {
    this.beatEl.classList.add("active");
    this.beatEl.style.textShadow = `0 0 ${40+intensity}px rgba(255,255,255,0.8),0 0 ${80+intensity}px rgba(100,100,255,0.6)`;
    this.beatEl.style.opacity = "1";
    setTimeout(() => { this.beatEl.style.opacity = "0"; }, 100);
  }

  updateScore(score: number, combo: number): void {
    this.scoreEl.textContent = String(score).padStart(7, "0");
    if (combo > 0) {
      this.comboEl.style.opacity = "1";
      this.comboEl.textContent = `${combo} COMBO`;
      const hot = combo >= 10;
      this.comboEl.style.color = hot ? "#ff00ff" : "#00ffff";
      this.comboEl.style.textShadow = hot
        ? "0 0 30px rgba(255,0,255,0.8),0 0 60px rgba(255,0,200,0.5)"
        : "0 0 30px rgba(0,255,255,0.8),0 0 60px rgba(0,200,255,0.5)";
    } else {
      this.comboEl.style.opacity = "0";
    }
  }
}
