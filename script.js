document.addEventListener("DOMContentLoaded", () => {
  const storageKeys = {
    theme: "ttt-theme",
    difficulty: "ttt-difficulty",
    symbol: "ttt-symbol",
    mode: "ttt-mode",
    personality: "ttt-personality",
    stats: "ttt-stats",
  };

  const safeStorage = {
    get(key, fallback) {
      try {
        const stored = localStorage.getItem(key);
        return stored !== null ? stored : fallback;
      } catch (error) {
        console.warn(`localStorage get error for key "${key}":`, error.message);
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn(`localStorage set error for key "${key}":`, error.message);
      }
    },
  };

  // Constants for timing and probabilities
  const TIMING = {
    AI_MOVE_DELAY: 500,
    AVA_MOVE_DELAY: 800,
    AVA_RESTART_DELAY: 3000,
    AI_START_DELAY: 450,
  };
  
  const PROBABILITIES = {
    AGGRESSIVE_MEDIUM: 0.8,
    AGGRESSIVE_EASY: 0.5,
    DEFENSIVE_MEDIUM: 0.7,
    DEFENSIVE_EASY: 0.4,
    BALANCED_MEDIUM: 0.7,
    BALANCED_EASY: 0.3,
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
  let aiPersonality = safeStorage.get(storageKeys.personality, "balanced");
  let aiMoveTimer = null; // Track the AI move timer
  let isThinking = false; // Flag to prevent multiple AI computations

  // Statistics tracking
  let stats = {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winStreak: 0,
    bestStreak: 0,
  };

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

  // Stats dashboard elements
  const statsDashboard = {
    gamesPlayed: document.getElementById("games-played"),
    wins: document.getElementById("player-wins"),
    losses: document.getElementById("player-losses"),
    draws: document.getElementById("player-draws"),
    winStreak: document.getElementById("win-streak"),
    bestStreak: document.getElementById("best-streak"),
  };

  const themeButtons = document.querySelectorAll(".theme-swatch");
  const difficultyButtons = document.querySelectorAll(".difficulty-btn");
  const symbolButtons = document.querySelectorAll(".symbol-btn");
  const modeButtons = document.querySelectorAll(".mode-btn");
  const personalityButtons = document.querySelectorAll(".personality-btn");

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

  // Event listener cleanup function
  let eventListeners = [];

  function cleanupEventListeners() {
    eventListeners.forEach(({ element, event, handler }) => {
      if (element) {
        element.removeEventListener(event, handler);
      }
    });
    eventListeners = [];
  }

  function addEventListenerWithCleanup(element, event, handler) {
    if (element) {
      element.addEventListener(event, handler);
      eventListeners.push({ element, event, handler });
    }
  }

  initGame();

  function initGame() {
    cleanupEventListeners();
    
    cells.forEach((cell) => {
      const index = Number(cell.getAttribute("data-index"));
      const clickHandler = () => handleCellClick(cell);
      addEventListenerWithCleanup(cell, "click", clickHandler);
      cell.textContent = "";
      cell.classList.remove("x", "o", "winner");
      cell.setAttribute("aria-label", `Empty cell ${index + 1}`);
    });

    addEventListenerWithCleanup(document.getElementById("undo-btn"), "click", undoMove);
    addEventListenerWithCleanup(
      document.getElementById("reset-round-btn"),
      "click",
      () => resetRound()
    );
    addEventListenerWithCleanup(
      document.getElementById("reset-scores-btn"),
      "click",
      resetScores
    );
    addEventListenerWithCleanup(historyButton, "click", toggleHistory);
    addEventListenerWithCleanup(settingsButton, "click", () => toggleSettings());
    addEventListenerWithCleanup(
      document.getElementById("close-settings"),
      "click",
      () => toggleSettings(false)
    );
    addEventListenerWithCleanup(overlay, "click", () => toggleSettings(false));
    addEventListenerWithCleanup(document, "keydown", handleGlobalKeyDown);

    themeButtons.forEach((btn) => {
      const themeHandler = () => applyTheme(btn.getAttribute("data-theme"));
      addEventListenerWithCleanup(btn, "click", themeHandler);
    });

    difficultyButtons.forEach((btn) => {
      const difficultyHandler = () =>
        applyDifficulty(btn.getAttribute("data-difficulty"));
      addEventListenerWithCleanup(btn, "click", difficultyHandler);
    });

    symbolButtons.forEach((btn) => {
      const symbolHandler = () => applySymbol(btn.getAttribute("data-symbol"));
      addEventListenerWithCleanup(btn, "click", symbolHandler);
    });

    modeButtons.forEach((btn) => {
      const modeHandler = () => applyMode(btn.getAttribute("data-mode"));
      addEventListenerWithCleanup(btn, "click", modeHandler);
    });

    personalityButtons.forEach((btn) => {
      const personalityHandler = () =>
        applyPersonality(btn.getAttribute("data-personality"));
      addEventListenerWithCleanup(btn, "click", personalityHandler);
    });

    // Load saved stats
    loadStats();

    // Apply stored preferences
    applyTheme(safeStorage.get(storageKeys.theme, "canvas"), { skipSave: true });
    applyDifficulty(aiDifficulty, { skipSave: true });
    applySymbol(playerSymbol, { skipSave: true, skipReset: true });
    applyMode(gameMode, { skipSave: true, skipReset: true });
    applyPersonality(aiPersonality, { skipSave: true });

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
      aiMoveTimer = setTimeout(makeAiMove, TIMING.AI_MOVE_DELAY);
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

    // Clear any existing timer to prevent race conditions
    if (aiMoveTimer) clearTimeout(aiMoveTimer);
    
    isThinking = true;

    aiMoveTimer = setTimeout(() => {
      // Double-check game state before making move (race condition fix)
      if (!gameActive || gameMode !== "ava") return;

      // In AI vs AI, we use Minimax (getBestMove) for BOTH sides
      const moveIndex = getBestMove(currentPlayer);

      if (moveIndex !== null && gameActive) {
        makeMove(moveIndex, currentPlayer);
      } else if (gameActive && checkDraw()) {
        endGame(true);
      }
    }, TIMING.AVA_MOVE_DELAY);
  }

  function makeAiMove() {
    // This is for Player vs AI mode
    isThinking = false;
    aiMoveTimer = null;

    if (!gameActive || currentPlayer !== aiSymbol) {
      return;
    }

    let moveIndex = null;

    // Apply personality-based modifications to AI behavior
    switch (aiPersonality) {
      case "aggressive":
        // Prioritize winning moves, take more risks
        if (aiDifficulty === "hard") {
          moveIndex = getBestMove(aiSymbol);
        } else if (aiDifficulty === "medium") {
          moveIndex = Math.random() < PROBABILITIES.AGGRESSIVE_MEDIUM ? getSmartMove(true) : getRandomMove();
        } else {
          moveIndex = Math.random() < PROBABILITIES.AGGRESSIVE_EASY ? getSmartMove(true) : getRandomMove();
        }
        break;
      
      case "defensive":
        // Prioritize blocking, play safer
        if (aiDifficulty === "hard") {
          moveIndex = getBestMove(aiSymbol);
        } else if (aiDifficulty === "medium") {
          moveIndex = Math.random() < PROBABILITIES.DEFENSIVE_MEDIUM ? getSmartMove(false) : getRandomMove();
        } else {
          moveIndex = Math.random() < PROBABILITIES.DEFENSIVE_EASY ? getSmartMove(false) : getRandomMove();
        }
        break;
      
      case "random":
        // Completely random moves regardless of difficulty
        moveIndex = getRandomMove();
        break;
      
      case "balanced":
      default:
        // Standard behavior based on difficulty
        switch (aiDifficulty) {
          case "hard":
            moveIndex = getBestMove(aiSymbol);
            break;
          case "medium":
            moveIndex = Math.random() < PROBABILITIES.BALANCED_MEDIUM ? getSmartMove() : getRandomMove();
            break;
          case "easy":
          default:
            moveIndex = Math.random() < PROBABILITIES.BALANCED_EASY ? getSmartMove() : getRandomMove();
            break;
        }
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

  function getSmartMove(aggressive = null) {
    // If aggressive is explicitly set, use it; otherwise default behavior
    const prioritizeAttack = aggressive !== null ? aggressive : true;

    if (prioritizeAttack) {
      // First: Check for winning moves
      for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] === aiSymbol && board[b] === aiSymbol && board[c] === "") return c;
        if (board[a] === aiSymbol && board[c] === aiSymbol && board[b] === "") return b;
        if (board[b] === aiSymbol && board[c] === aiSymbol && board[a] === "") return a;
      }

      // Second: Block opponent's winning moves (lower priority for aggressive)
      for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] === playerSymbol && board[b] === playerSymbol && board[c] === "") return c;
        if (board[a] === playerSymbol && board[c] === playerSymbol && board[b] === "") return b;
        if (board[b] === playerSymbol && board[c] === playerSymbol && board[a] === "") return a;
      }
    } else {
      // Defensive: Block first, then attack
      for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] === playerSymbol && board[b] === playerSymbol && board[c] === "") return c;
        if (board[a] === playerSymbol && board[c] === playerSymbol && board[b] === "") return b;
        if (board[b] === playerSymbol && board[c] === playerSymbol && board[a] === "") return a;
      }

      // Then check for winning moves
      for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] === aiSymbol && board[b] === aiSymbol && board[c] === "") return c;
        if (board[a] === aiSymbol && board[c] === aiSymbol && board[b] === "") return b;
        if (board[b] === aiSymbol && board[c] === aiSymbol && board[a] === "") return a;
      }
    }

    // Take center if available
    if (board[4] === "") return 4;

    // Take corners
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

    // Create a copy of the board to avoid corrupting the live game state
    const boardCopy = [...board];
    
    for (let i = 0; i < 9; i++) {
      if (boardCopy[i] === "") {
        boardCopy[i] = symbolToMaximize;
        const score = minimax(boardCopy, 0, false, -Infinity, Infinity);
        boardCopy[i] = "";
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
      // Update stats for draw (only in PvA mode)
      if (gameMode === 'pva') {
        updateStats("draw");
      }
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
          // Update stats for AVA mode (X wins)
          updateStats("win");
        } else {
          aiScore++;
          aiScoreDisplay.textContent = aiScore;
          gameHistory.push({ result: "O win", moves: [...moveHistory] });
          // Update stats for AVA mode (O wins = loss for X perspective)
          updateStats("loss");
        }
      } else { // PvA
        if (currentPlayer === playerSymbol) {
          statusDisplay.textContent = "You won!";
          playerScore++;
          playerScoreDisplay.textContent = playerScore;
          gameHistory.push({ result: "player win", moves: [...moveHistory] });
          updateStats("win");
        } else {
          statusDisplay.textContent = "AI won!";
          aiScore++;
          aiScoreDisplay.textContent = aiScore;
          gameHistory.push({ result: "ai win", moves: [...moveHistory] });
          updateStats("loss");
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
      }, TIMING.AVA_RESTART_DELAY);
    }
  }

  function undoMove() {
    // If AI is thinking, don't allow undo to prevent state corruption
    if (moveHistory.length < 2 || !gameActive || isThinking || gameMode === "ava") {
      return;
    }

    const aiMove = moveHistory.pop();
    const playerMove = moveHistory.pop();

    // Store winning state before undoing
    const wasGameActive = gameActive;
    
    resetCell(aiMove.index);
    resetCell(playerMove.index);

    board[aiMove.index] = "";
    board[playerMove.index] = "";

    // Restore game state properly
    gameActive = true;
    
    // Remove winner highlights from all cells
    cells.forEach(cell => cell.classList.remove("winner"));

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
        }, TIMING.AI_START_DELAY);
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

  function applyPersonality(personality, { skipSave = false } = {}) {
    aiPersonality = personality;
    setActiveButton(personalityButtons, personality, "personality");
    if (!skipSave) {
      safeStorage.set(storageKeys.personality, personality);
    }
  }

  function loadStats() {
    try {
      const savedStats = localStorage.getItem(storageKeys.stats);
      if (savedStats) {
        stats = JSON.parse(savedStats);
      }
    } catch (error) {
      console.warn("Failed to load stats from localStorage:", error.message);
    }
    updateStatsDisplay();
  }

  function saveStats() {
    try {
      localStorage.setItem(storageKeys.stats, JSON.stringify(stats));
    } catch (error) {
      console.warn("Failed to save stats to localStorage:", error.message);
    }
  }

  function updateStatsDisplay() {
    if (statsDashboard.gamesPlayed) statsDashboard.gamesPlayed.textContent = stats.gamesPlayed;
    if (statsDashboard.wins) statsDashboard.wins.textContent = stats.wins;
    if (statsDashboard.losses) statsDashboard.losses.textContent = stats.losses;
    if (statsDashboard.draws) statsDashboard.draws.textContent = stats.draws;
    if (statsDashboard.winStreak) statsDashboard.winStreak.textContent = stats.winStreak;
    if (statsDashboard.bestStreak) statsDashboard.bestStreak.textContent = stats.bestStreak;
  }

  function updateStats(result) {
    stats.gamesPlayed++;
    
    if (result === "win") {
      stats.wins++;
      stats.winStreak++;
      if (stats.winStreak > stats.bestStreak) {
        stats.bestStreak = stats.winStreak;
      }
    } else if (result === "loss") {
      stats.losses++;
      stats.winStreak = 0;
    } else if (result === "draw") {
      stats.draws++;
      stats.winStreak = 0;
    }
    
    saveStats();
    updateStatsDisplay();
  }
});
