import { JUDGEMENT_POPUP_ANIMATION_DURATION_SEC } from '../engine/Config';

export class JudgementPopup {
  public el: HTMLDivElement;

  constructor() {
    this.el = document.createElement("div");
    Object.assign(this.el.style, {
      position: "fixed", top: "40%", left: "50%", transform: "translate(-50%,-50%)",
      fontSize: "3rem", fontWeight: "900", opacity: "0", zIndex: "20",
      fontFamily: "'Noto Sans JP', sans-serif", pointerEvents: "none",
    });
    document.body.appendChild(this.el);

    this._addStyles();
  }

  private _addStyles(): void {
    const s = document.createElement("style");
    s.textContent = `
      @keyframes jpop {
        0%   { transform: translate(-50%,-50%) scale(0.5); opacity:1; }
        50%  { transform: translate(-50%,-50%) scale(1.2); opacity:1; }
        100% { transform: translate(-50%,-50%) scale(0.8); opacity:0; }
      }
    `;
    document.head.appendChild(s);
  }

  show(text: string, color: string): void {
    this.el.textContent = text;
    this.el.style.color = color;
    this.el.style.textShadow = `0 0 20px ${color}`;
    this.el.style.animation = "none";
    void this.el.offsetWidth;
    this.el.style.animation = `jpop ${JUDGEMENT_POPUP_ANIMATION_DURATION_SEC}s ease-out forwards`;
  }
}
