export class Controls {
  constructor(bus) {
    this.bus = bus;

    this.el = document.createElement('div');
    this.el.id = 'controls-bar';
    Object.assign(this.el.style, {
      position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: '16px', alignItems: 'center', pointerEvents: 'none', zIndex: '10',
    });

    this._btn = (text, id, extras = {}) => {
      const el = document.createElement(id === 'file-label' || id === 'new-track-label' ? 'label' : 'button');
      if (id === 'file-label' || id === 'new-track-label') el.htmlFor = 'file-input';
      el.id = id;
      el.textContent = text;
      Object.assign(el.style, {
        padding: '12px 36px', border: '2px solid rgba(255,255,255,0.3)',
        background: 'rgba(255,255,255,0.05)', color: '#fff',
        fontFamily: "'Noto Sans JP', sans-serif", fontSize: '0.95rem',
        fontWeight: 700, letterSpacing: '0.2em', cursor: 'pointer',
        pointerEvents: 'auto', transition: 'all 0.3s', backdropFilter: 'blur(10px)',
        ...extras,
      });
      this.el.appendChild(el);
      return el;
    };

    this.stopBtn = this._btn('STOP', 'stop-btn', { borderColor: 'rgba(255,100,100,0.5)', background: 'rgba(255,50,50,0.1)' });
    this.stopBtn.style.display = 'none';

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'audio/*';
    this.fileInput.id = 'file-input';
    this.fileInput.style.display = 'none';
    this.el.appendChild(this.fileInput);

    this.loadLabel = this._btn('LOAD TRACK', 'file-label');
    this.newLabel = this._btn('NEW TRACK', 'new-track-label', { borderColor: 'rgba(100,200,255,0.4)' });
    this.newLabel.style.display = 'none';

    document.body.appendChild(this.el);

    this.fileInput.addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (f) bus.emit('ui:load', { file: f });
    });
    this.stopBtn.addEventListener('click', () => bus.emit('ui:stop'));
    // newLabel shares the same file input
  }

  setPlaying(playing) {
    this.loadLabel.style.display = playing ? 'none' : 'inline-block';
    this.newLabel.style.display = playing ? 'inline-block' : 'none';
    this.stopBtn.style.display = playing ? 'inline-block' : 'none';
  }

  clearFile() { this.fileInput.value = ''; }
}
