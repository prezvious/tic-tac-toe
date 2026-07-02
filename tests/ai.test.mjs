import test from "node:test";
import assert from "node:assert/strict";

import { getBestMove, getSmartMove } from "../js/ai.mjs";

test("getSmartMove takes an immediate winning move", () => {
  const board = ["O", "O", "", "X", "", "", "X", "", ""];

  assert.equal(getSmartMove(board, "O", "X", true), 2);
});

test("getSmartMove blocks an immediate opponent win", () => {
  const board = ["X", "X", "", "O", "", "", "", "", ""];

  assert.equal(getSmartMove(board, "O", "X", false), 2);
});

test("getBestMove finds a forced win", () => {
  const board = ["O", "O", "", "X", "X", "", "", "", ""];

  assert.equal(getBestMove(board, "O"), 2);
});

test("getBestMove blocks the opponent when required", () => {
  const board = ["X", "X", "", "O", "", "", "", "", "O"];

  assert.equal(getBestMove(board, "O"), 2);
});
