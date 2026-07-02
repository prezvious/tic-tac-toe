import { WINNING_LINES, getWinner, opponentOf } from "./game.mjs";

const PROBABILITIES = Object.freeze({
  aggressive: { easy: 0.5, medium: 0.8 },
  defensive: { easy: 0.4, medium: 0.7 },
  balanced: { easy: 0.3, medium: 0.7 },
});

export function chooseAiMove(board, options) {
  const {
    aiSymbol,
    playerSymbol,
    difficulty = "easy",
    personality = "balanced",
  } = options;

  if (difficulty === "hard" && personality !== "random") {
    return getBestMove(board, aiSymbol);
  }

  if (personality === "random") {
    return getRandomMove(board);
  }

  const probability = PROBABILITIES[personality]?.[difficulty] ?? PROBABILITIES.balanced.easy;
  if (Math.random() > probability) {
    return getRandomMove(board);
  }

  if (personality === "defensive") {
    return getSmartMove(board, aiSymbol, playerSymbol, false);
  }

  return getSmartMove(board, aiSymbol, playerSymbol, true);
}

export function getRandomMove(board) {
  const available = availableMoves(board);
  if (available.length === 0) {
    return null;
  }
  return available[Math.floor(Math.random() * available.length)];
}

export function getSmartMove(board, aiSymbol, playerSymbol, prioritizeAttack = true) {
  const attackMove = findImmediateMove(board, aiSymbol);
  const blockMove = findImmediateMove(board, playerSymbol);

  if (prioritizeAttack && attackMove !== null) {
    return attackMove;
  }
  if (blockMove !== null) {
    return blockMove;
  }
  if (!prioritizeAttack && attackMove !== null) {
    return attackMove;
  }
  if (board[4] === "") {
    return 4;
  }

  const corners = [0, 2, 6, 8].filter((index) => board[index] === "");
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  return getRandomMove(board);
}

export function getBestMove(board, symbolToMaximize) {
  const moves = availableMoves(board);
  if (moves.length === 0) {
    return null;
  }

  if (moves.length === 9) {
    return [0, 2, 4, 6, 8][Math.floor(Math.random() * 5)];
  }

  const opponentSymbol = opponentOf(symbolToMaximize);
  let bestScore = -Infinity;
  let bestMove = null;

  for (const move of moves) {
    const nextBoard = [...board];
    nextBoard[move] = symbolToMaximize;
    const score = minimax(nextBoard, 0, false, symbolToMaximize, opponentSymbol, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function minimax(board, depth, isMaximizing, maxSymbol, minSymbol, alpha, beta) {
  const winner = getWinner(board);
  if (winner?.symbol === maxSymbol) {
    return 10 - depth;
  }
  if (winner?.symbol === minSymbol) {
    return depth - 10;
  }
  if (availableMoves(board).length === 0) {
    return 0;
  }

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (const move of availableMoves(board)) {
      board[move] = maxSymbol;
      const score = minimax(board, depth + 1, false, maxSymbol, minSymbol, alpha, beta);
      board[move] = "";
      bestScore = Math.max(score, bestScore);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) {
        break;
      }
    }
    return bestScore;
  }

  let bestScore = Infinity;
  for (const move of availableMoves(board)) {
    board[move] = minSymbol;
    const score = minimax(board, depth + 1, true, maxSymbol, minSymbol, alpha, beta);
    board[move] = "";
    bestScore = Math.min(score, bestScore);
    beta = Math.min(beta, score);
    if (beta <= alpha) {
      break;
    }
  }
  return bestScore;
}

function findImmediateMove(board, symbol) {
  for (const [a, b, c] of WINNING_LINES) {
    const line = [board[a], board[b], board[c]];
    const symbolCount = line.filter((cell) => cell === symbol).length;
    const emptyIndex = line.findIndex((cell) => cell === "");
    if (symbolCount === 2 && emptyIndex !== -1) {
      return [a, b, c][emptyIndex];
    }
  }
  return null;
}

function availableMoves(board) {
  return board
    .map((cell, index) => (cell === "" ? index : null))
    .filter((index) => index !== null);
}
