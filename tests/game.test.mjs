import test from "node:test";
import assert from "node:assert/strict";

import {
  applyRoundResult,
  createRoundResult,
  createRoundState,
  playMove,
  scoreViewForMode,
  undoPvaTurn,
} from "../js/game.mjs";
import { createDefaultState } from "../js/storage.mjs";

test("playMove detects wins and records the winning line", () => {
  let round = createRoundState();
  round = playMove(round, 0, "X");
  round = playMove(round, 3, "O");
  round = playMove(round, 1, "X");
  round = playMove(round, 4, "O");
  round = playMove(round, 2, "X");

  assert.equal(round.active, false);
  assert.equal(round.winner, "X");
  assert.deepEqual(round.winningLine, [0, 1, 2]);
});

test("undoPvaTurn removes the player and AI moves together", () => {
  let round = createRoundState();
  round = playMove(round, 0, "X");
  round = playMove(round, 4, "O");

  const undone = undoPvaTurn(round, "X");

  assert.deepEqual(undone.board, Array(9).fill(""));
  assert.equal(undone.currentPlayer, "X");
  assert.equal(undone.moves.length, 0);
});

test("applyRoundResult persists pva scores and player stats", () => {
  const state = createDefaultState();
  let round = createRoundState();
  round = playMove(round, 0, "X");
  round = playMove(round, 3, "O");
  round = playMove(round, 1, "X");
  round = playMove(round, 4, "O");
  round = playMove(round, 2, "X");

  const settings = { mode: "pva", symbol: "X" };
  const result = createRoundResult(round, settings);
  const nextState = applyRoundResult(state, result, settings);

  assert.equal(nextState.scores.pva.player, 1);
  assert.equal(nextState.stats.gamesPlayed, 1);
  assert.equal(nextState.stats.wins, 1);
  assert.equal(nextState.stats.bestStreak, 1);
  assert.equal(nextState.history[0].result, "You won");
});

test("scoreViewForMode exposes the correct mode-specific labels", () => {
  const state = createDefaultState();
  state.scores.pvp.x = 2;
  state.scores.ava.o = 3;

  assert.deepEqual(scoreViewForMode(state, "pvp"), {
    leftLabel: "X",
    leftValue: 2,
    rightLabel: "O",
    rightValue: 0,
  });
  assert.deepEqual(scoreViewForMode(state, "ava"), {
    leftLabel: "System X",
    leftValue: 0,
    rightLabel: "System O",
    rightValue: 3,
  });
});
