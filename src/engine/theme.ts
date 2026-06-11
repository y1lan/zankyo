// RGB triple in 0–1 floats (matches what the shader expects)
export type Rgb = readonly [number, number, number];

// Hex CSS color used by the DOM/UI layer
export type CssColor = string;

export type ThemeId = 'default' | 'kong';

export interface Theme {
  readonly id: ThemeId;
  readonly label: string;
  readonly accent: CssColor;            // shown on the cycle button + UI accents
  readonly noteSingle: Rgb;             // primary note color
  readonly notePair: Rgb;               // simultaneous-pair note color
  readonly sectorColors: readonly Rgb[]; // 8 sector hues (note light bleed)
  readonly comboHot: CssColor;          // HUD combo flares to this once hot
}

function hex(c: string): Rgb {
  const n = parseInt(c.replace('#', ''), 16);
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255] as const;
}

// Original "rainbow" palette — what the game shipped with.
const DEFAULT: Theme = {
  id: 'default',
  label: 'DEFAULT',
  accent: '#ff44aa',
  noteSingle: [1.0, 0.2, 0.5],   // pink/red
  notePair: [1.0, 0.85, 0.2],    // yellow
  sectorColors: [
    [0.4, 0.8, 1.0],   // cyan
    [0.6, 0.6, 1.0],   // lavender
    [1.0, 0.4, 0.8],   // pink
    [1.0, 0.5, 0.3],   // orange
    [1.0, 0.9, 0.3],   // yellow
    [0.5, 1.0, 0.4],   // green
    [0.3, 0.7, 1.0],   // blue
    [0.7, 0.4, 1.0],   // purple
  ],
  comboHot: '#ff44aa',
};

// Kong Inc — lime #CCFF00 hero, cool desaturated sectors so the lime pops.
const KONG: Theme = {
  id: 'kong',
  label: 'KONG',
  accent: '#CCFF00',
  noteSingle: hex('#CCFF00'),    // Kong lime
  notePair: [1.0, 1.0, 1.0],     // white
  sectorColors: [
    hex('#5EC4DA'),
    hex('#4A9DB8'),
    hex('#3878A0'),
    hex('#2A5687'),
    hex('#4A4A6E'),
    hex('#6B6B8E'),
    hex('#8FA8B8'),
    hex('#B4D4DC'),
  ],
  comboHot: '#CCFF00',
};

export const THEMES: Record<ThemeId, Theme> = { default: DEFAULT, kong: KONG };
export const THEME_ORDER: readonly ThemeId[] = ['default', 'kong'];

const STORAGE_KEY = 'zankyo.theme';
const DEFAULT_ID: ThemeId = 'default';

function loadStored(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (stored && stored in THEMES) return stored;
  } catch { /* localStorage may be unavailable */ }
  return DEFAULT_ID;
}

let _current: ThemeId = loadStored();

export function getTheme(): Theme {
  return THEMES[_current];
}

export function setTheme(id: ThemeId): Theme {
  _current = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  return getTheme();
}

export function cycleTheme(): Theme {
  const idx = THEME_ORDER.indexOf(_current);
  return setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
}
