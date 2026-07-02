export const WINNING_LINES = Object.freeze([
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]);

export function opponentOf(symbol) {
  return symbol === "X" ? "O" : "X";
}

export function createRoundState() {
  return {
    board: Array(9).fill(""),
    currentPlayer: "X",
    active: true,
    winner: null,
    winningLine: [],
    isDraw: false,
    moves: [],
  };
}

export function canPlayAt(round, index, symbol) {
  return Boolean(
    round?.active &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < 9 &&
    round.board[index] === "" &&
    round.currentPlayer === symbol
  );
}

export function playMove(round, index, symbol) {
  if (!canPlayAt(round, index, symbol)) {
    return round;
  }

  const board = [...round.board];
  board[index] = symbol;

  const winningLine = findWinningLine(board, symbol);
  const isDraw = !winningLine && board.every(Boolean);
  const active = !winningLine && !isDraw;

  return {
    board,
    currentPlayer: active ? opponentOf(symbol) : symbol,
    active,
    winner: winningLine ? symbol : null,
    winningLine: winningLine || [],
    isDraw,
    moves: [...round.moves, { index, symbol }],
  };
}

export function undoPvaTurn(round, playerSymbol) {
  if (!round.active || round.moves.length < 2) {
    return round;
  }

  const moves = round.moves.slice(0, -2);
  const board = Array(9).fill("");
  moves.forEach((move) => {
    board[move.index] = move.symbol;
  });

  return {
    board,
    currentPlayer: playerSymbol,
    active: true,
    winner: null,
    winningLine: [],
    isDraw: false,
    moves,
  };
}

export function findWinningLine(board, symbol) {
  return WINNING_LINES.find(([a, b, c]) => (
    board[a] === symbol &&
    board[b] === symbol &&
    board[c] === symbol
  )) || null;
}

export function getWinner(board) {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { symbol: board[a], line };
    }
  }
  return null;
}

export function createRoundResult(round, settings) {
  if (round.active) {
    return null;
  }

  const mode = settings.mode;
  if (round.isDraw) {
    return {
      mode,
      result: "draw",
      winner: null,
      label: getDrawLabel(mode),
      moves: round.moves,
    };
  }

  return {
    mode,
    result: "win",
    winner: round.winner,
    label: getWinLabel(mode, round.winner, settings.symbol),
    moves: round.moves,
  };
}

export function applyRoundResult(appState, result, settings) {
  if (!result) {
    return appState;
  }

  const state = {
    ...appState,
    stats: { ...appState.stats },
    scores: {
      pva: { ...appState.scores.pva },
      pvp: { ...appState.scores.pvp },
      ava: { ...appState.scores.ava },
    },
    history: [...appState.history],
  };

  if (result.mode === "pva") {
    applyPvaResult(state, result, settings.symbol);
  } else if (result.mode === "pvp" && result.winner) {
    state.scores.pvp[result.winner.toLowerCase()] += 1;
  } else if (result.mode === "ava" && result.winner) {
    state.scores.ava[result.winner.toLowerCase()] += 1;
  }

  state.history = [
    {
      mode: result.mode,
      result: result.label,
      moves: result.moves,
      completedAt: new Date().toISOString(),
    },
    ...state.history,
  ].slice(0, 20);

  return state;
}

export function scoreViewForMode(appState, mode) {
  if (mode === "pvp") {
    return {
      leftLabel: "X",
      leftValue: appState.scores.pvp.x,
      rightLabel: "O",
      rightValue: appState.scores.pvp.o,
    };
  }

  if (mode === "ava") {
    return {
      leftLabel: "System X",
      leftValue: appState.scores.ava.x,
      rightLabel: "System O",
      rightValue: appState.scores.ava.o,
    };
  }

  return {
    leftLabel: "Player",
    leftValue: appState.scores.pva.player,
    rightLabel: "AI",
    rightValue: appState.scores.pva.ai,
  };
}

function applyPvaResult(state, result, playerSymbol) {
  state.stats.gamesPlayed += 1;

  if (result.result === "draw") {
    state.stats.draws += 1;
    state.stats.winStreak = 0;
    return;
  }

  if (result.winner === playerSymbol) {
    state.scores.pva.player += 1;
    state.stats.wins += 1;
    state.stats.winStreak += 1;
    state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.winStreak);
  } else {
    state.scores.pva.ai += 1;
    state.stats.losses += 1;
    state.stats.winStreak = 0;
  }
}

function getWinLabel(mode, winner, playerSymbol) {
  if (mode === "pva") {
    return winner === playerSymbol ? "You won" : "AI won";
  }
  if (mode === "ava") {
    return `System ${winner} won`;
  }
  return `${winner} won`;
}

function getDrawLabel(mode) {
  if (mode === "ava") {
    return "Systems drew";
  }
  return mode === "pvp" ? "Players drew" : "Draw";
}
