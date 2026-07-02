import test from "node:test";
import assert from "node:assert/strict";

import {
  LEGACY_KEYS,
  STORAGE_KEY,
  clearAllState,
  createDefaultState,
  loadState,
  resetState,
  saveState,
} from "../js/storage.mjs";

test("loadState migrates legacy preferences and stats", () => {
  const storage = createMemoryStorage();
  storage.setItem("ttt-theme", "vapor");
  storage.setItem("ttt-difficulty", "hard");
  storage.setItem("ttt-symbol", "O");
  storage.setItem("ttt-mode", "pva");
  storage.setItem("ttt-personality", "defensive");
  storage.setItem("ttt-stats", JSON.stringify({ gamesPlayed: 4, wins: 2, bestStreak: 2 }));

  const state = loadState(storage);

  assert.equal(state.settings.theme, "vapor");
  assert.equal(state.settings.difficulty, "hard");
  assert.equal(state.settings.symbol, "O");
  assert.equal(state.settings.personality, "defensive");
  assert.equal(state.stats.gamesPlayed, 4);
  assert.equal(state.stats.wins, 2);
  assert.equal(state.stats.bestStreak, 2);
  assert.ok(storage.getItem(STORAGE_KEY));
});

test("saveState normalizes invalid persisted values", () => {
  const storage = createMemoryStorage();
  const state = createDefaultState();
  state.settings.theme = "not-a-theme";
  state.scores.pva.player = -1;

  saveState(state, storage);
  const loaded = loadState(storage);

  assert.equal(loaded.settings.theme, "canvas");
  assert.equal(loaded.scores.pva.player, 0);
});

test("resetState clears versioned and legacy keys", () => {
  const storage = createMemoryStorage();
  storage.setItem(STORAGE_KEY, "{}");
  LEGACY_KEYS.forEach((key) => storage.setItem(key, "legacy"));

  const state = resetState(storage);

  assert.deepEqual(state, createDefaultState());
  assert.equal(storage.getItem(STORAGE_KEY), null);
  LEGACY_KEYS.forEach((key) => assert.equal(storage.getItem(key), null));
});

test("clearAllState removes every known saved key", () => {
  const storage = createMemoryStorage();
  storage.setItem(STORAGE_KEY, "{}");
  LEGACY_KEYS.forEach((key) => storage.setItem(key, "legacy"));

  clearAllState(storage);

  assert.equal(storage.getItem(STORAGE_KEY), null);
  LEGACY_KEYS.forEach((key) => assert.equal(storage.getItem(key), null));
});

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}
