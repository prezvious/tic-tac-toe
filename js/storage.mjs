export const STORAGE_KEY = "ttt-state-v1";

export const LEGACY_KEYS = [
  "ttt-theme",
  "ttt-difficulty",
  "ttt-symbol",
  "ttt-mode",
  "ttt-personality",
  "ttt-stats",
];

export const DEFAULT_SETTINGS = Object.freeze({
  theme: "canvas",
  difficulty: "easy",
  symbol: "X",
  mode: "pva",
  personality: "balanced",
});

export const DEFAULT_STATS = Object.freeze({
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  winStreak: 0,
  bestStreak: 0,
});

export const DEFAULT_SCORES = Object.freeze({
  pva: { player: 0, ai: 0 },
  pvp: { x: 0, o: 0 },
  ava: { x: 0, o: 0 },
});

export function createDefaultState() {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    stats: { ...DEFAULT_STATS },
    scores: cloneScores(DEFAULT_SCORES),
    history: [],
  };
}

export function normalizeState(value) {
  const defaults = createDefaultState();
  if (!value || typeof value !== "object") {
    return defaults;
  }

  return {
    version: 1,
    settings: {
      ...defaults.settings,
      ...sanitizeSettings(value.settings),
    },
    stats: {
      ...defaults.stats,
      ...sanitizeStats(value.stats),
    },
    scores: normalizeScores(value.scores),
    history: Array.isArray(value.history) ? value.history.slice(0, 20) : [],
  };
}

export function loadState(storage = window.localStorage) {
  const storedState = safeGet(storage, STORAGE_KEY);
  if (storedState) {
    try {
      return normalizeState(JSON.parse(storedState));
    } catch (error) {
      console.warn("Failed to parse saved tic-tac-toe state:", error.message);
    }
  }

  if (!hasLegacyState(storage)) {
    return createDefaultState();
  }

  const migrated = migrateLegacyState(storage);
  saveState(migrated, storage);
  return migrated;
}

export function saveState(state, storage = window.localStorage) {
  safeSet(storage, STORAGE_KEY, JSON.stringify(normalizeState(state)));
}

export function clearAllState(storage = window.localStorage) {
  safeRemove(storage, STORAGE_KEY);
  LEGACY_KEYS.forEach((key) => safeRemove(storage, key));
}

export function resetState(storage = window.localStorage) {
  clearAllState(storage);
  return createDefaultState();
}

function hasLegacyState(storage) {
  return LEGACY_KEYS.some((key) => safeGet(storage, key) !== null);
}

function migrateLegacyState(storage) {
  const state = createDefaultState();
  state.settings.theme = readLegacyValue(storage, "ttt-theme", state.settings.theme);
  state.settings.difficulty = readLegacyValue(storage, "ttt-difficulty", state.settings.difficulty);
  state.settings.symbol = readLegacyValue(storage, "ttt-symbol", state.settings.symbol);
  state.settings.mode = readLegacyValue(storage, "ttt-mode", state.settings.mode);
  state.settings.personality = readLegacyValue(storage, "ttt-personality", state.settings.personality);

  const legacyStats = safeGet(storage, "ttt-stats");
  if (legacyStats) {
    try {
      state.stats = {
        ...state.stats,
        ...sanitizeStats(JSON.parse(legacyStats)),
      };
    } catch (error) {
      console.warn("Failed to parse legacy stats:", error.message);
    }
  }

  return normalizeState(state);
}

function readLegacyValue(storage, key, fallback) {
  const value = safeGet(storage, key);
  return value === null ? fallback : value;
}

function sanitizeSettings(settings = {}) {
  const validThemes = ["canvas", "azure", "aurora", "solar", "apricot", "dusk", "blush", "vapor", "abyss"];
  const validDifficulties = ["easy", "medium", "hard"];
  const validSymbols = ["X", "O"];
  const validModes = ["pva", "ava", "pvp"];
  const validPersonalities = ["balanced", "aggressive", "defensive", "random"];

  return {
    theme: validThemes.includes(settings.theme) ? settings.theme : DEFAULT_SETTINGS.theme,
    difficulty: validDifficulties.includes(settings.difficulty) ? settings.difficulty : DEFAULT_SETTINGS.difficulty,
    symbol: validSymbols.includes(settings.symbol) ? settings.symbol : DEFAULT_SETTINGS.symbol,
    mode: validModes.includes(settings.mode) ? settings.mode : DEFAULT_SETTINGS.mode,
    personality: validPersonalities.includes(settings.personality)
      ? settings.personality
      : DEFAULT_SETTINGS.personality,
  };
}

function sanitizeStats(stats = {}) {
  return Object.fromEntries(
    Object.keys(DEFAULT_STATS).map((key) => [key, toSafeCount(stats[key])])
  );
}

function normalizeScores(scores = {}) {
  return {
    pva: {
      player: toSafeCount(scores.pva?.player),
      ai: toSafeCount(scores.pva?.ai),
    },
    pvp: {
      x: toSafeCount(scores.pvp?.x),
      o: toSafeCount(scores.pvp?.o),
    },
    ava: {
      x: toSafeCount(scores.ava?.x),
      o: toSafeCount(scores.ava?.o),
    },
  };
}

function toSafeCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function cloneScores(scores) {
  return {
    pva: { ...scores.pva },
    pvp: { ...scores.pvp },
    ava: { ...scores.ava },
  };
}

function safeGet(storage, key) {
  try {
    return storage.getItem(key);
  } catch (error) {
    console.warn(`localStorage get error for key "${key}":`, error.message);
    return null;
  }
}

function safeSet(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch (error) {
    console.warn(`localStorage set error for key "${key}":`, error.message);
  }
}

function safeRemove(storage, key) {
  try {
    storage.removeItem(key);
  } catch (error) {
    console.warn(`localStorage remove error for key "${key}":`, error.message);
  }
}
