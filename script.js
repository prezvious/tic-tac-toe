document.addEventListener("DOMContentLoaded", () => {
  const storageKeys = {
    theme: "ttt-theme",
    difficulty: "ttt-difficulty",
    symbol: "ttt-symbol",
    mode: "ttt-mode",
  };

  const safeStorage = {
    get(key, fallback) {
      try {
        const stored = localStorage.getItem(key);
        return stored !== null ? stored : fallback;
      } catch (error) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        // Ignore storage errors (private browsing, etc.)
      }
    },
  };

  let board = Array(9).fill("");
  let currentPlayer = "X";
  let gameActive = true;
  let playerSymbol = safeStorage.get(storageKeys.symbol, "X");
  let aiSymbol = playerSymbol === "X" ? "O" : "X";
  let gameMode = safeStorage.get(storageKeys.mode, "pva"); // 'pva' or 'ava'
  let playerScore = 0;
  let aiScore = 0;
  let moveHistory = [];
  let gameHistory = [];
  let aiDifficulty = safeStorage.get(storageKeys.difficulty, "easy");
  let aiMoveTimer = null; // Track the AI move timer
  let isThinking = false; // Flag to prevent multiple AI computations

  const cells = document.querySelectorAll(".cell");
  const statusDisplay = document.getElementById("status");
  const turnIndicator = document.getElementById("turn-indicator");
  const playerScoreDisplay = document.getElementById("player-score");
  const aiScoreDisplay = document.getElementById("ai-score");
  const scoreBoxes = document.querySelectorAll(".score-box");
  const historyContainer = document.getElementById("history-container");
  const historyList = document.getElementById("history-list");
  const historyButton = document.getElementById("history-btn");
  const settingsPanel = document.getElementById("settings-panel");
  const settingsButton = document.getElementById("settings-btn");
  const overlay = document.getElementById("overlay");

  const themeButtons = document.querySelectorAll(".theme-swatch");
  const difficultyButtons = document.querySelectorAll(".difficulty-btn");
  const symbolButtons = document.querySelectorAll(".symbol-btn");
  const modeButtons = document.querySelectorAll(".mode-btn");

  const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // Rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // Columns
    [0, 4, 8],
    [2, 4, 6], // Diagonals
  ];

  initGame();

  function initGame() {
    cells.forEach((cell) => {
      const index = Number(cell.getAttribute("data-index"));
      cell.addEventListener("click", () => handleCellClick(cell));
      cell.textContent = "";
      cell.classList.remove("x", "o", "winner");
      cell.setAttribute("aria-label", `Empty cell ${index + 1}`);
    });

    document.getElementById("undo-btn").addEventListener("click", undoMove);
    document
      .getElementById("reset-round-btn")
      .addEventListener("click", () => resetRound());
    document
      .getElementById("reset-scores-btn")
      .addEventListener("click", resetScores);
    historyButton.addEventListener("click", toggleHistory);
    settingsButton.addEventListener("click", () => toggleSettings());
    document
      .getElementById("close-settings")
      .addEventListener("click", () => toggleSettings(false));
    overlay.addEventListener("click", () => toggleSettings(false));
    document.addEventListener("keydown", handleGlobalKeyDown);

    themeButtons.forEach((btn) => {
      btn.addEventListener("click", () => applyTheme(btn.getAttribute("data-theme")));
    });

    difficultyButtons.forEach((btn) => {
      btn.addEventListener("click", () =>
        applyDifficulty(btn.getAttribute("data-difficulty"))
      );
    });

    symbolButtons.forEach((btn) => {
      btn.addEventListener("click", () => applySymbol(btn.getAttribute("data-symbol")));
    });

    modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => applyMode(btn.getAttribute("data-mode")));
    });

    // Apply stored preferences
    applyTheme(safeStorage.get(storageKeys.theme, "canvas"), { skipSave: true });
    applyDifficulty(aiDifficulty, { skipSave: true });
    applySymbol(playerSymbol, { skipSave: true, skipReset: true });
    applyMode(gameMode, { skipSave: true, skipReset: true });

    resetRound(true);
  }

  function setActiveButton(buttons, value, dataKey) {
    buttons.forEach((btn) => {
      const isActive = btn.getAttribute(`data-${dataKey}`) === value;
      btn.classList.toggle("active", isActive);
    });
  }

  function applyMode(mode, { skipSave = false, skipReset = false } = {}) {
    gameMode = mode;
    setActiveButton(modeButtons, mode, "mode");

    // Update labels/UI based on mode
    const playerLabel = document.querySelector(".score-box[aria-label='Player score'] .label");
    const aiLabel = document.querySelector(".score-box[aria-label='AI score'] .label");
    const undoBtn = document.getElementById("undo-btn");

    if (gameMode === "ava") {
      if (playerLabel) playerLabel.textContent = "System (X)";
      if (aiLabel) aiLabel.textContent = "System (O)";
      if (undoBtn) undoBtn.style.display = 'none';
      // Only trigger reset if we are switching modes and not just initializing
      // But the skipReset flag handles the init case.
    } else {
      if (playerLabel) playerLabel.textContent = "Player";
      if (aiLabel) aiLabel.textContent = "AI";
      if (undoBtn) undoBtn.style.display = 'inline-block';
    }

    if (!skipSave) {
      safeStorage.set(storageKeys.mode, mode);
    }

    if (!skipReset) {
      resetRound();
    }
  }

  function handleCellClick(cell) {
    // Disable interaction in AI vs AI mode
    if (gameMode === "ava") return;

    const index = Number(cell.getAttribute("data-index"));

    if (
      Number.isNaN(index) ||
      board[index] !== "" ||
      !gameActive ||
      currentPlayer !== playerSymbol ||
      isThinking
    ) {
      return;
    }

    makeMove(index, playerSymbol);

    if (gameActive) {
      // Clear any existing timer just in case
      if (aiMoveTimer) clearTimeout(aiMoveTimer);
      aiMoveTimer = setTimeout(makeAiMove, 500);
      isThinking = true;
      updateStatusMessage();
    }
  }

  function makeMove(index, symbol) {
    if (!Number.isInteger(index) || index < 0 || index >= board.length) {
      return;
    }

    board[index] = symbol;
    moveHistory.push({
      index,
      symbol,
    });

    const cell = cells[index];
    if (!cell) {
      return;
    }

    cell.textContent = symbol;
    cell.classList.add(symbol.toLowerCase());
    cell.setAttribute("aria-label", `${symbol} placed on cell ${index + 1}`);

    updateHistory(`${symbol} played at position ${index + 1}`);

    if (checkWin(symbol)) {
      endGame(false);
    } else if (checkDraw()) {
      endGame(true);
    } else {
      currentPlayer = currentPlayer === "X" ? "O" : "X";
      updateStatusMessage();
    }
  }

  function triggerAutoPlay() {
    if (!gameActive || gameMode !== "ava") return;

    // Use a delay for watchability
    const delay = 800; // 0.8 seconds

    if (aiMoveTimer) clearTimeout(aiMoveTimer);
    isThinking = true;

    // Status update is handled by updateStatusMessage calling this, 
    // but we can ensure message is set.
    // statusDisplay.textContent = `System (${currentPlayer}) is thinking...`;

    aiMoveTimer = setTimeout(() => {
      if (!gameActive) return;

      // In AI vs AI, we use Minimax (getBestMove) for BOTH sides
      const moveIndex = getBestMove(currentPlayer);

      if (moveIndex !== null) {
        makeMove(moveIndex, currentPlayer);
      } else {
        // Should verify draw/win before here, but safe fallback
        if (checkDraw()) endGame(true);
      }
    }, delay);
  }

  function makeAiMove() {
    // This is for Player vs AI mode
    isThinking = false;
    aiMoveTimer = null;

    if (!gameActive || currentPlayer !== aiSymbol) {
      return;
    }

    let moveIndex = null;

    switch (aiDifficulty) {
      case "hard":
        moveIndex = getBestMove(aiSymbol);
        break;
      case "medium":
        moveIndex = Math.random() < 0.7 ? getSmartMove() : getRandomMove();
        break;
      case "easy":
      default:
        moveIndex = Math.random() < 0.3 ? getSmartMove() : getRandomMove();
        break;
    }

    if (moveIndex === null || moveIndex === undefined) {
      if (checkDraw()) {
        endGame(true);
      }
      return;
    }

    makeMove(moveIndex, aiSymbol);
  }

  function getRandomMove() {
    const availableMoves = board
      .map((cell, index) => (cell === "" ? index : null))
      .filter((index) => index !== null);

    if (availableMoves.length === 0) {
      return null;
    }

    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }

  function getSmartMove() {
    for (let i = 0; i < winningConditions.length; i++) {
      const [a, b, c] = winningConditions[i];
      if (board[a] === aiSymbol && board[b] === aiSymbol && board[c] === "") return c;
      if (board[a] === aiSymbol && board[c] === aiSymbol && board[b] === "") return b;
      if (board[b] === aiSymbol && board[c] === aiSymbol && board[a] === "") return a;
    }

    for (let i = 0; i < winningConditions.length; i++) {
      const [a, b, c] = winningConditions[i];
      if (board[a] === playerSymbol && board[b] === playerSymbol && board[c] === "") return c;
      if (board[a] === playerSymbol && board[c] === playerSymbol && board[b] === "") return b;
      if (board[b] === playerSymbol && board[c] === playerSymbol && board[a] === "") return a;
    }

    if (board[4] === "") return 4;

    const corners = [0, 2, 6, 8].filter((cornerIndex) => board[cornerIndex] === "");
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];

    return getRandomMove();
  }

  function getBestMove(symbolToMaximize = aiSymbol) {
    const opponentSymbol = symbolToMaximize === "X" ? "O" : "X";

    function minimax(newBoard, depth, isMaximizing, alpha, beta) {
      const winner = checkWinningCondition(newBoard);
      if (winner === symbolToMaximize) return 10 - depth;
      if (winner === opponentSymbol) return depth - 10;
      if (checkBoardFull(newBoard)) return 0;

      if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
          if (newBoard[i] === "") {
            newBoard[i] = symbolToMaximize;
            const score = minimax(newBoard, depth + 1, false, alpha, beta);
            newBoard[i] = "";
            bestScore = Math.max(score, bestScore);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) {
              break;
            }
          }
        }
        return bestScore;
      } else {
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
          if (newBoard[i] === "") {
            newBoard[i] = opponentSymbol;
            const score = minimax(newBoard, depth + 1, true, alpha, beta);
            newBoard[i] = "";
            bestScore = Math.min(score, bestScore);
            beta = Math.min(beta, score);
            if (beta <= alpha) {
              break;
            }
          }
        }
        return bestScore;
      }
    }

    function checkWinningCondition(testBoard) {
      for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (testBoard[a] && testBoard[a] === testBoard[b] && testBoard[a] === testBoard[c]) {
          return testBoard[a];
        }
      }
      return null;
    }

    function checkBoardFull(testBoard) {
      return testBoard.every((cell) => cell !== "");
    }

    let bestScore = -Infinity;
    let bestMove = null;

    // Optimization/Randomness for opening move if board is empty
    // This makes sure games vary slightly if AI starts first
    if (board.every(c => c === "")) {
      return Math.floor(Math.random() * 9);
    }

    for (let i = 0; i < 9; i++) {
      if (board[i] === "") {
        board[i] = symbolToMaximize;
        const score = minimax(board, 0, false, -Infinity, Infinity);
        board[i] = "";
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }

    return bestMove !== null ? bestMove : getRandomMove();
  }

  function checkWin(symbol) {
    for (let i = 0; i < winningConditions.length; i++) {
      const [a, b, c] = winningConditions[i];
      if (board[a] === symbol && board[b] === symbol && board[c] === symbol) {
        cells[a].classList.add("winner");
        cells[b].classList.add("winner");
        cells[c].classList.add("winner");
        return true;
      }
    }

    return false;
  }

  function checkDraw() {
    return board.every((cell) => cell !== "");
  }

  function endGame(isDraw) {
    gameActive = false;
    isThinking = false; // Stop thinking on end game
    if (aiMoveTimer) clearTimeout(aiMoveTimer);

    if (isDraw) {
      statusDisplay.textContent = "It's a draw!";
      gameHistory.push({
        result: "draw",
        moves: [...moveHistory],
      });
    } else {
      // Winner logic
      // If gameMode is ava: X is 'playerScore' slot, O is 'aiScore' slot (arbitrary mapping)
      // If gameMode is pva: Player is 'playerScore' slot, AI is 'aiScore' slot.

      if (gameMode === 'ava') {
        statusDisplay.textContent = `System (${currentPlayer}) won!`;
        if (currentPlayer === "X") {
          playerScore++;
          playerScoreDisplay.textContent = playerScore;
          gameHistory.push({ result: "X win", moves: [...moveHistory] });
        } else {
          aiScore++;
          aiScoreDisplay.textContent = aiScore;
          gameHistory.push({ result: "O win", moves: [...moveHistory] });
        }
      } else { // PvA
        if (currentPlayer === playerSymbol) {
          statusDisplay.textContent = "You won!";
          playerScore++;
          playerScoreDisplay.textContent = playerScore;
          gameHistory.push({ result: "player win", moves: [...moveHistory] });
        } else {
          statusDisplay.textContent = "AI won!";
          aiScore++;
          aiScoreDisplay.textContent = aiScore;
          gameHistory.push({ result: "ai win", moves: [...moveHistory] });
        }
      }
    }

    updateTurnIndicator();
    updateScoreHighlights();

    if (gameMode === 'ava') {
      const progressContainer = document.getElementById("restart-progress-container");
      const progressBar = document.getElementById("restart-progress-bar");

      if (progressContainer && progressBar) {
        progressContainer.classList.add("visible");
        progressContainer.setAttribute("aria-hidden", "false");

        // Reset width first
        progressBar.style.width = "0%";
        progressBar.style.transition = "none";

        // Force reflow
        void progressBar.offsetWidth;

        // Start animation
        progressBar.style.transition = "width 3s linear";
        progressBar.style.width = "100%";
      }

      setTimeout(() => {
        if (progressContainer) {
          progressContainer.classList.remove("visible");
          progressContainer.setAttribute("aria-hidden", "true");
        }
        resetRound();
      }, 3000);
    }
  }

  function undoMove() {
    // If AI is thinking, don't allow undo to prevent state corruption
    if (moveHistory.length < 2 || !gameActive || isThinking || gameMode === "ava") {
      return;
    }

    const aiMove = moveHistory.pop();
    const playerMove = moveHistory.pop();

    resetCell(aiMove.index);
    resetCell(playerMove.index);

    board[aiMove.index] = "";
    board[playerMove.index] = "";

    updateHistory("Moves undone");

    currentPlayer = playerSymbol;
    updateStatusMessage();
  }

  function resetCell(index) {
    const cell = cells[index];
    if (!cell) return;
    cell.textContent = "";
    cell.classList.remove("x", "o", "winner");
    cell.setAttribute("aria-label", `Empty cell ${index + 1}`);
  }

  function resetRound(silent = false) {
    if (aiMoveTimer) clearTimeout(aiMoveTimer);
    aiMoveTimer = null;
    isThinking = false;

    board = Array(9).fill("");
    gameActive = true;
    moveHistory = [];

    cells.forEach((cell) => {
      const cellIndex = Number(cell.getAttribute("data-index"));
      cell.textContent = "";
      cell.classList.remove("x", "o", "winner");
      cell.setAttribute("aria-label", `Empty cell ${cellIndex + 1}`);
    });

    currentPlayer = "X";

    // In PvA, if player is O, AI (X) doesn't exist? Wait, AI is O if player is X.
    // If player is O, AI is X.
    // My logic says: aiSymbol = playerSymbol == X ? O : X.
    // So if player is O, aiSymbol is X.
    // X always starts.
    // So if AI is X, AI starts.

    // In AI vs AI, X starts (System X).

    updateStatusMessage(); // This sets message.

    // Move trigger logic
    if (gameMode === 'ava') {
      // System X always moves first? Yes, currentPlayer is X.
      // triggerAutoPlay will check currentPlayer and run getBestMove.
      // We need to kick it off.
      triggerAutoPlay();
    } else {
      // PvA logic
      if (currentPlayer === aiSymbol) {
        isThinking = true;
        aiMoveTimer = setTimeout(() => {
          if (gameActive && currentPlayer === aiSymbol) {
            makeAiMove();
          }
        }, 450);
      }
    }

    if (!silent) {
      updateHistory("Round reset");
    }
  }

  function resetScores() {
    playerScore = 0;
    aiScore = 0;
    playerScoreDisplay.textContent = "0";
    aiScoreDisplay.textContent = "0";
    gameHistory = [];
    updateHistory("Scores reset");

    if (gameActive) updateStatusMessage();
  }

  function updateStatusMessage() {
    if (gameActive) {
      if (gameMode === 'ava') {
        statusDisplay.textContent = `System (${currentPlayer}) is thinking...`;
        triggerAutoPlay();
      } else {
        if (isThinking) {
          statusDisplay.textContent = "AI is thinking...";
        } else {
          statusDisplay.textContent = currentPlayer === playerSymbol ? "Your turn!" : "AI is thinking...";
        }
      }
    }

    updateTurnIndicator();
    updateScoreHighlights();
  }

  function updateTurnIndicator() {
    if (!turnIndicator) {
      return;
    }

    if (!gameActive) {
      turnIndicator.textContent = "Round complete";
      return;
    }

    const turnOwner = currentPlayer === playerSymbol ? "Your move" : "AI thinking";
    turnIndicator.textContent = `${turnOwner} (${currentPlayer})`;
  }

  function updateScoreHighlights() {
    if (scoreBoxes.length < 2) {
      return;
    }

    const [playerBox, aiBox] = scoreBoxes;
    playerBox.classList.toggle("is-active", gameActive && currentPlayer === playerSymbol);
    aiBox.classList.toggle("is-active", gameActive && currentPlayer === aiSymbol);
  }

  function updateHistory(message) {
    if (!message) {
      return;
    }

    const historyItem = document.createElement("div");
    historyItem.classList.add("history-move");
    historyItem.textContent = message;
    historyList.prepend(historyItem);

    while (historyList.children.length > 10) {
      historyList.removeChild(historyList.lastChild);
    }
  }

  function toggleHistory() {
    const shouldShow = historyContainer.style.display !== "block";
    historyContainer.style.display = shouldShow ? "block" : "none";
    historyContainer.setAttribute("aria-hidden", (!shouldShow).toString());
    historyButton.textContent = shouldShow ? "Hide History" : "Show History";
    historyButton.setAttribute("aria-expanded", shouldShow.toString());
  }

  function toggleSettings(forceState) {
    const shouldShow =
      typeof forceState === "boolean"
        ? forceState
        : !settingsPanel.classList.contains("is-visible");

    settingsPanel.classList.toggle("is-visible", shouldShow);
    overlay.classList.toggle("is-visible", shouldShow);
    document.body.classList.toggle("no-scroll", shouldShow);
    settingsPanel.setAttribute("aria-hidden", (!shouldShow).toString());
    overlay.setAttribute("aria-hidden", (!shouldShow).toString());
    settingsButton.setAttribute("aria-expanded", shouldShow.toString());

    if (shouldShow) {
      settingsPanel.focus({ preventScroll: true });
    } else {
      settingsButton.focus({ preventScroll: true });
    }
  }

  function handleGlobalKeyDown(event) {
    if (event.key === "Escape" && settingsPanel.classList.contains("is-visible")) {
      toggleSettings(false);
    }
  }

  function applyTheme(theme, { skipSave = false } = {}) {
    document.body.setAttribute("data-theme", theme);
    setActiveButton(themeButtons, theme, "theme");
    if (!skipSave) {
      safeStorage.set(storageKeys.theme, theme);
    }
  }

  function applyDifficulty(difficulty, { skipSave = false } = {}) {
    aiDifficulty = difficulty;
    setActiveButton(difficultyButtons, difficulty, "difficulty");
    if (!skipSave) {
      safeStorage.set(storageKeys.difficulty, difficulty);
    }
  }

  function applySymbol(symbol, { skipSave = false, skipReset = false } = {}) {
    playerSymbol = symbol;
    aiSymbol = playerSymbol === "X" ? "O" : "X";
    setActiveButton(symbolButtons, symbol, "symbol");

    if (!skipSave) {
      safeStorage.set(storageKeys.symbol, symbol);
    }

    if (!skipReset) {
      resetRound(true);
    } else {
      updateStatusMessage();
    }
  }
});
