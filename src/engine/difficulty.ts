export type DifficultyLevel = 'easy' | 'basic' | 'advanced' | 'expert' | 'master';

export interface DifficultyProfile {
  readonly level: DifficultyLevel;
  readonly label: string;
  readonly color: string;
  readonly spawnChance: number;
  readonly simultaneousChance: number;
  readonly globalCooldownMs: number;
  readonly minSameSectorZGap: number;
  readonly noteTravelTime: number;
}

export const PROFILES: Record<DifficultyLevel, DifficultyProfile> = {
  easy: {
    level: 'easy', label: 'EASY', color: '#7af07a',
    spawnChance: 0.12, simultaneousChance: 0.00, globalCooldownMs: 400,
    minSameSectorZGap: 12, noteTravelTime: 9.0,
  },
  basic: {
    level: 'basic', label: 'BASIC', color: '#7ab8ff',
    spawnChance: 0.18, simultaneousChance: 0.08, globalCooldownMs: 300,
    minSameSectorZGap: 9, noteTravelTime: 8.5,
  },
  advanced: {
    level: 'advanced', label: 'ADVANCED', color: '#ffd34a',
    spawnChance: 0.25, simultaneousChance: 0.18, globalCooldownMs: 220,
    minSameSectorZGap: 6, noteTravelTime: 8.0,
  },
  expert: {
    level: 'expert', label: 'EXPERT', color: '#ff5a5a',
    spawnChance: 0.45, simultaneousChance: 0.35, globalCooldownMs: 135,
    minSameSectorZGap: 3, noteTravelTime: 5.5,
  },
  master: {
    level: 'master', label: 'MASTER', color: '#c87aff',
    spawnChance: 0.65, simultaneousChance: 0.50, globalCooldownMs: 100,
    minSameSectorZGap: 2, noteTravelTime: 4.0,
  },
};

export const DIFFICULTY_ORDER: readonly DifficultyLevel[] = [
  'easy', 'basic', 'advanced', 'expert', 'master',
];

const STORAGE_KEY = 'zankyo.difficulty';
const DEFAULT_LEVEL: DifficultyLevel = 'advanced';

function loadStoredLevel(): DifficultyLevel {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as DifficultyLevel | null;
    if (stored && stored in PROFILES) return stored;
  } catch { /* localStorage may be unavailable */ }
  return DEFAULT_LEVEL;
}

let _current: DifficultyLevel = loadStoredLevel();

export function getDifficulty(): DifficultyProfile {
  return PROFILES[_current];
}

export function setDifficulty(level: DifficultyLevel): DifficultyProfile {
  _current = level;
  try { localStorage.setItem(STORAGE_KEY, level); } catch { /* ignore */ }
  return getDifficulty();
}

export function cycleDifficulty(): DifficultyProfile {
  const idx = DIFFICULTY_ORDER.indexOf(_current);
  return setDifficulty(DIFFICULTY_ORDER[(idx + 1) % DIFFICULTY_ORDER.length]);
}
