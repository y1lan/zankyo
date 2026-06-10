export class UI {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'ui-overlay';
    document.body.appendChild(this.container);

    // Song name (top left)
    this.songNameEl = document.createElement('div');
    this.songNameEl.id = 'song-name';
    this.container.appendChild(this.songNameEl);

    // BEAT! indicator (center)
    this.beatIndicator = document.createElement('div');
    this.beatIndicator.id = 'beat-indicator';
    this.beatIndicator.textContent = 'BEAT!';
    this.container.appendChild(this.beatIndicator);

    // Score (top right)
    this.scoreEl = document.createElement('div');
    this.scoreEl.id = 'score';
    this.scoreEl.textContent = '0000000';
    this.container.appendChild(this.scoreEl);

    // Combo (center-right)
    this.comboEl = document.createElement('div');
    this.comboEl.id = 'combo';
    this.container.appendChild(this.comboEl);

    // Judgement popup (center)
    this.judgementEl = document.createElement('div');
    this.judgementEl.id = 'judgement';
    this.container.appendChild(this.judgementEl);

    // Lane key indicators (bottom area, above buttons)
    this.laneKeys = document.createElement('div');
    this.laneKeys.id = 'lane-keys';
    this.laneKeys.innerHTML = `
      <span class="lane-key" style="color:#44aaff">D</span>
      <span class="lane-key" style="color:#ff44aa">F</span>
      <span class="lane-key" style="color:#aaff44">J</span>
      <span class="lane-key" style="color:#ffaa44">K</span>
    `;
    this.container.appendChild(this.laneKeys);

    // Control buttons bar
    this.controlsBar = document.createElement('div');
    this.controlsBar.id = 'controls-bar';

    this.stopBtn = document.createElement('button');
    this.stopBtn.id = 'stop-btn';
    this.stopBtn.textContent = 'STOP';
    this.stopBtn.style.display = 'none';
    this.controlsBar.appendChild(this.stopBtn);

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'audio/*';
    this.fileInput.id = 'file-input';
    this.controlsBar.appendChild(this.fileInput);

    this.fileLabel = document.createElement('label');
    this.fileLabel.htmlFor = 'file-input';
    this.fileLabel.textContent = 'LOAD TRACK';
    this.fileLabel.id = 'file-label';
    this.controlsBar.appendChild(this.fileLabel);

    this.newTrackLabel = document.createElement('label');
    this.newTrackLabel.htmlFor = 'file-input';
    this.newTrackLabel.textContent = 'NEW TRACK';
    this.newTrackLabel.id = 'new-track-label';
    this.newTrackLabel.style.display = 'none';
    this.controlsBar.appendChild(this.newTrackLabel);

    this.container.appendChild(this.controlsBar);

    // Loading overlay
    this.loadingEl = document.createElement('div');
    this.loadingEl.id = 'loading';
    this.loadingEl.textContent = 'LOADING...';
    this.loadingEl.style.display = 'none';
    this.container.appendChild(this.loadingEl);

    this.addStyles();

    this.score = 0;
    this.combo = 0;
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700;900&display=swap');

      #ui-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
        font-family: 'Noto Sans JP', sans-serif;
      }

      #song-name {
        position: absolute;
        top: 30px;
        left: 40px;
        font-size: 0.9rem;
        font-weight: 700;
        color: rgba(255,255,255,0.35);
        letter-spacing: 0.1em;
        max-width: 50vw;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #beat-indicator {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 5rem;
        font-weight: 900;
        color: #fff;
        text-shadow: 0 0 40px rgba(255,255,255,0.8), 0 0 80px rgba(100,100,255,0.6);
        opacity: 0;
        transition: opacity 0.1s;
        letter-spacing: 0.2em;
        white-space: nowrap;
      }

      #beat-indicator.active { opacity: 1; }

      #score {
        position: absolute;
        top: 30px;
        right: 40px;
        font-size: 2rem;
        font-weight: 700;
        color: #fff;
        text-shadow: 0 0 20px rgba(255,255,255,0.5);
        letter-spacing: 0.15em;
        font-variant-numeric: tabular-nums;
      }

      #combo {
        position: absolute;
        top: 50%;
        right: 60px;
        font-size: 4rem;
        font-weight: 900;
        color: #00ffff;
        text-shadow: 0 0 30px rgba(0,255,255,0.8), 0 0 60px rgba(0,200,255,0.5);
        opacity: 0;
        transition: all 0.15s;
        font-style: italic;
        transform: skewX(-10deg) translateY(-50%);
      }

      #combo.active { opacity: 1; }

      #judgement {
        position: absolute;
        top: 40%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 3rem;
        font-weight: 900;
        opacity: 0;
      }

      #judgement.show {
        opacity: 1;
        animation: judgementPop 0.5s ease-out forwards;
      }

      @keyframes judgementPop {
        0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
        50%  { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
      }

      #lane-keys {
        position: absolute;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 60px;
      }

      .lane-key {
        font-size: 1.5rem;
        font-weight: 900;
        text-shadow: 0 0 12px currentColor;
        opacity: 0.45;
        pointer-events: none;
      }

      #controls-bar {
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 16px;
        align-items: center;
      }

      #file-input { display: none; }

      #file-label, #new-track-label, #stop-btn {
        padding: 12px 36px;
        background: rgba(255,255,255,0.05);
        border: 2px solid rgba(255,255,255,0.3);
        color: #fff;
        font-family: 'Noto Sans JP', sans-serif;
        font-size: 0.95rem;
        font-weight: 700;
        letter-spacing: 0.2em;
        cursor: pointer;
        pointer-events: auto;
        transition: all 0.3s;
        backdrop-filter: blur(10px);
      }

      #new-track-label {
        border-color: rgba(100,200,255,0.4);
      }

      #stop-btn {
        border-color: rgba(255,100,100,0.5);
        background: rgba(255,50,50,0.1);
      }

      #file-label:hover, #new-track-label:hover {
        background: rgba(255,255,255,0.15);
        border-color: rgba(255,255,255,0.6);
        text-shadow: 0 0 20px rgba(255,255,255,0.5);
      }

      #stop-btn:hover {
        background: rgba(255,50,50,0.25);
        border-color: rgba(255,100,100,0.8);
      }

      #loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 2rem;
        font-weight: 900;
        color: #fff;
        letter-spacing: 0.3em;
        animation: pulse 0.8s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  showSongName(name) {
    this.songNameEl.textContent = name;
  }

  showBeat(intensity) {
    this.beatIndicator.classList.add('active');
    this.beatIndicator.style.textShadow =
      `0 0 ${40 + intensity}px rgba(255,255,255,0.8), 0 0 ${80 + intensity}px rgba(100,100,255,0.6)`;
    setTimeout(() => this.beatIndicator.classList.remove('active'), 100);
  }

  updateScore(score) {
    this.score = score;
    this.scoreEl.textContent = String(score).padStart(7, '0');
  }

  updateCombo(combo) {
    this.combo = combo;
    if (combo > 0) {
      this.comboEl.classList.add('active');
      this.comboEl.textContent = `${combo} COMBO`;
      if (combo >= 10) {
        this.comboEl.style.color = '#ff00ff';
        this.comboEl.style.textShadow =
          '0 0 30px rgba(255,0,255,0.8), 0 0 60px rgba(255,0,200,0.5)';
      } else {
        this.comboEl.style.color = '#00ffff';
        this.comboEl.style.textShadow =
          '0 0 30px rgba(0,255,255,0.8), 0 0 60px rgba(0,200,255,0.5)';
      }
    } else {
      this.comboEl.classList.remove('active');
    }
  }

  showJudgement(text, color = '#fff') {
    this.judgementEl.textContent = text;
    this.judgementEl.style.color = color;
    this.judgementEl.style.textShadow = `0 0 20px ${color}`;
    this.judgementEl.classList.remove('show');
    void this.judgementEl.offsetWidth;
    this.judgementEl.classList.add('show');
  }

  setPlaying(playing, songName) {
    if (playing) {
      this.fileLabel.style.display = 'none';
      this.newTrackLabel.style.display = 'inline-block';
      this.stopBtn.style.display = 'inline-block';
      if (songName) this.showSongName(songName);
    } else {
      this.fileLabel.style.display = 'inline-block';
      this.newTrackLabel.style.display = 'none';
      this.stopBtn.style.display = 'none';
      this.songNameEl.textContent = '';
    }
  }

  showLoading() {
    this.loadingEl.style.display = 'block';
    this.fileLabel.style.display = 'none';
    this.newTrackLabel.style.display = 'none';
    this.stopBtn.style.display = 'none';
  }

  hideLoading() {
    this.loadingEl.style.display = 'none';
  }
}
