import { chooseAiMove, getBestMove } from "./ai.mjs";
import {
  applyRoundResult,
  canPlayAt,
  createRoundResult,
  createRoundState,
  opponentOf,
  playMove,
  scoreViewForMode,
  undoPvaTurn,
} from "./game.mjs";
import { loadState, resetState, saveState } from "./storage.mjs";

const TIMING = Object.freeze({
  AI_MOVE_DELAY: 500,
  AVA_MOVE_DELAY: 760,
  AVA_RESTART_DELAY: 2800,
  MODAL_EXIT_DELAY: 190,
});

export function createApp(documentRef = document) {
  return new TicTacToeApp(documentRef);
}

class TicTacToeApp {
  constructor(documentRef) {
    this.document = documentRef;
    this.appState = loadState();
    this.round = createRoundState();
    this.isThinking = false;
    this.aiMoveTimer = null;
    this.restartTimer = null;
    this.modalTimer = null;

    this.cells = Array.from(this.document.querySelectorAll("[data-cell]"));
    this.statusDisplay = this.document.getElementById("status");
    this.turnIndicator = this.document.getElementById("turn-indicator");
    this.boardElement = this.document.getElementById("game-board");
    this.playerScoreCard = this.document.getElementById("player-score-card");
    this.aiScoreCard = this.document.getElementById("ai-score-card");
    this.playerLabel = this.document.getElementById("player-label");
    this.aiLabel = this.document.getElementById("ai-label");
    this.playerScoreDisplay = this.document.getElementById("player-score");
    this.aiScoreDisplay = this.document.getElementById("ai-score");
    this.undoButton = this.document.getElementById("undo-btn");
    this.resetRoundButton = this.document.getElementById("reset-round-btn");
    this.resetDataButton = this.document.getElementById("reset-data-btn");
    this.historyButton = this.document.getElementById("history-btn");
    this.historyContainer = this.document.getElementById("history-container");
    this.historyList = this.document.getElementById("history-list");
    this.settingsButton = this.document.getElementById("settings-btn");
    this.settingsPanel = this.document.getElementById("settings-panel");
    this.closeSettingsButton = this.document.getElementById("close-settings");
    this.overlay = this.document.getElementById("overlay");
    this.progressContainer = this.document.getElementById("restart-progress-container");
    this.progressBar = this.document.getElementById("restart-progress-bar");
    this.themeColorMeta = this.document.getElementById("theme-color-meta");
    this.statsDashboard = {
      gamesPlayed: this.document.getElementById("games-played"),
      wins: this.document.getElementById("player-wins"),
      losses: this.document.getElementById("player-losses"),
      draws: this.document.getElementById("player-draws"),
      winStreak: this.document.getElementById("win-streak"),
      bestStreak: this.document.getElementById("best-streak"),
    };
  }

  start() {
    this.bindEvents();
    this.applyTheme();
    this.renderAll();
    this.resetRound({ silent: true });
  }

  bindEvents() {
    this.cells.forEach((cell) => {
      cell.addEventListener("click", () => this.handleCellClick(Number(cell.dataset.cell)));
      cell.addEventListener("mouseenter", () => this.previewCell(cell));
      cell.addEventListener("mouseleave", () => cell.removeAttribute("data-preview"));
    });

    this.undoButton.addEventListener("click", () => this.undoMove());
    this.resetRoundButton.addEventListener("click", () => this.resetRound());
    this.resetDataButton.addEventListener("click", () => this.resetAllData());
    this.historyButton.addEventListener("click", () => this.toggleHistory());
    this.settingsButton.addEventListener("click", () => this.openSettings());
    this.closeSettingsButton.addEventListener("click", () => this.closeSettings());
    this.overlay.addEventListener("click", () => this.closeSettings());

    this.document.addEventListener("keydown", (event) => this.handleDocumentKeyDown(event));

    this.document.querySelectorAll(".theme-swatch[data-theme]").forEach((button) => {
      button.addEventListener("click", () => this.updateSetting("theme", button.dataset.theme));
    });
    this.document.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => this.updateSetting("mode", button.dataset.mode));
    });
    this.document.querySelectorAll("[data-difficulty]").forEach((button) => {
      button.addEventListener("click", () => this.updateSetting("difficulty", button.dataset.difficulty));
    });
    this.document.querySelectorAll("[data-personality]").forEach((button) => {
      button.addEventListener("click", () => this.updateSetting("personality", button.dataset.personality));
    });
    this.document.querySelectorAll("[data-symbol]").forEach((button) => {
      button.addEventListener("click", () => this.updateSetting("symbol", button.dataset.symbol));
    });
  }

  get settings() {
    return this.appState.settings;
  }

  get playerSymbol() {
    return this.settings.symbol;
  }

  get aiSymbol() {
    return opponentOf(this.playerSymbol);
  }

  handleCellClick(index) {
    if (!this.canHumanPlay(index)) {
      return;
    }

    const symbol = this.settings.mode === "pvp" ? this.round.currentPlayer : this.playerSymbol;
    this.makeMove(index, symbol);

    if (this.round.active && this.settings.mode === "pva") {
      this.schedulePvaMove();
    }
  }

  canHumanPlay(index) {
    if (this.settings.mode === "ava" || this.isThinking) {
      return false;
    }
    if (this.settings.mode === "pva" && this.round.currentPlayer !== this.playerSymbol) {
      return false;
    }
    return canPlayAt(this.round, index, this.round.currentPlayer);
  }

  makeMove(index, symbol) {
    const previousMoveCount = this.round.moves.length;
    this.round = playMove(this.round, index, symbol);
    if (this.round.moves.length === previousMoveCount) {
      return false;
    }

    this.renderRound();
    if (!this.round.active) {
      this.completeRound();
    }
    return true;
  }

  completeRound() {
    this.isThinking = false;
    this.clearAiTimer();
    const result = createRoundResult(this.round, this.settings);
    this.appState = applyRoundResult(this.appState, result, this.settings);
    saveState(this.appState);
    this.renderAll();

    if (this.settings.mode === "ava") {
      this.scheduleAvaRestart();
    }
  }

  schedulePvaMove() {
    this.clearAiTimer();
    this.isThinking = true;
    this.renderStatus();

    this.aiMoveTimer = window.setTimeout(() => {
      this.isThinking = false;
      this.aiMoveTimer = null;
      if (!this.round.active || this.round.currentPlayer !== this.aiSymbol) {
        this.renderStatus();
        return;
      }

      const move = chooseAiMove(this.round.board, {
        aiSymbol: this.aiSymbol,
        playerSymbol: this.playerSymbol,
        difficulty: this.settings.difficulty,
        personality: this.settings.personality,
      });

      if (move !== null) {
        this.makeMove(move, this.aiSymbol);
      } else {
        this.renderStatus();
      }
    }, TIMING.AI_MOVE_DELAY);
  }

  scheduleAvaMove() {
    if (this.settings.mode !== "ava" || !this.round.active) {
      return;
    }

    this.clearAiTimer();
    this.isThinking = true;
    this.renderStatus();

    this.aiMoveTimer = window.setTimeout(() => {
      this.isThinking = false;
      this.aiMoveTimer = null;
      if (!this.round.active || this.settings.mode !== "ava") {
        this.renderStatus();
        return;
      }

      const move = getBestMove(this.round.board, this.round.currentPlayer);
      if (move !== null) {
        this.makeMove(move, this.round.currentPlayer);
      }
      if (this.round.active) {
        this.scheduleAvaMove();
      }
    }, TIMING.AVA_MOVE_DELAY);
  }

  scheduleAvaRestart() {
    this.clearRestartTimer();
    this.progressContainer.hidden = false;
    this.progressContainer.setAttribute("aria-hidden", "false");
    this.progressBar.style.transitionDuration = "0ms";
    this.progressBar.style.width = "0%";
    this.progressBar.getBoundingClientRect();
    this.progressBar.style.transitionDuration = `${TIMING.AVA_RESTART_DELAY}ms`;
    this.progressBar.style.width = "100%";

    this.restartTimer = window.setTimeout(() => {
      this.resetRound({ silent: true });
    }, TIMING.AVA_RESTART_DELAY);
  }

  undoMove() {
    if (this.undoButton.disabled) {
      return;
    }
    this.round = undoPvaTurn(this.round, this.playerSymbol);
    this.renderRound();
  }

  resetRound({ silent = false } = {}) {
    this.clearAiTimer();
    this.clearRestartTimer();
    this.isThinking = false;
    this.round = createRoundState();
    this.progressContainer.hidden = true;
    this.progressContainer.setAttribute("aria-hidden", "true");
    this.progressBar.style.transitionDuration = "0ms";
    this.progressBar.style.width = "0%";
    this.renderRound();

    if (!silent) {
      this.statusDisplay.textContent = "Round Reset";
    }

    if (this.settings.mode === "ava") {
      this.scheduleAvaMove();
    } else if (this.settings.mode === "pva" && this.round.currentPlayer === this.aiSymbol) {
      this.schedulePvaMove();
    }
  }

  resetAllData() {
    const confirmed = window.confirm(
      "Reset all saved data? This clears preferences, scores, stats, and round history."
    );
    if (!confirmed) {
      return;
    }

    this.clearAiTimer();
    this.clearRestartTimer();
    this.appState = resetState();
    this.applyTheme();
    this.closeSettings({ restoreFocus: false });
    this.renderAll();
    this.resetRound({ silent: true });
  }

  updateSetting(key, value) {
    if (!value || this.settings[key] === value) {
      return;
    }

    this.appState = {
      ...this.appState,
      settings: {
        ...this.settings,
        [key]: value,
      },
    };
    saveState(this.appState);

    if (key === "theme") {
      this.applyTheme();
      this.renderSettings();
      return;
    }

    this.renderAll();
    if (key === "mode" || key === "symbol") {
      this.resetRound({ silent: true });
    }
  }

  applyTheme() {
    this.document.body.dataset.theme = this.settings.theme;
    window.requestAnimationFrame(() => {
      const color = window.getComputedStyle(this.document.body).getPropertyValue("--theme-color").trim();
      if (color && this.themeColorMeta) {
        this.themeColorMeta.setAttribute("content", color);
      }
    });
  }

  renderAll() {
    this.renderScores();
    this.renderStats();
    this.renderHistory();
    this.renderSettings();
    this.renderRound();
  }

  renderRound() {
    this.renderBoard();
    this.renderScores();
    this.renderStatus();
    this.renderControls();
  }

  renderBoard() {
    const interactive = this.round.active && !this.isThinking && this.settings.mode !== "ava";
    this.boardElement.classList.toggle("interactive", interactive);

    this.cells.forEach((cell) => {
      const index = Number(cell.dataset.cell);
      const symbol = this.round.board[index];
      const canPlay = this.canHumanPlay(index);
      cell.textContent = symbol;
      cell.disabled = false;
      cell.classList.toggle("x", symbol === "X");
      cell.classList.toggle("o", symbol === "O");
      cell.classList.toggle("winner", this.round.winningLine.includes(index));
      cell.setAttribute("aria-disabled", (!canPlay).toString());
      cell.setAttribute("aria-label", this.getCellLabel(index, symbol, canPlay));
      if (!canPlay) {
        cell.removeAttribute("data-preview");
      }
    });
  }

  renderScores() {
    const scoreView = scoreViewForMode(this.appState, this.settings.mode);
    this.playerLabel.textContent = scoreView.leftLabel;
    this.aiLabel.textContent = scoreView.rightLabel;
    this.updateScoreValue(this.playerScoreDisplay, scoreView.leftValue);
    this.updateScoreValue(this.aiScoreDisplay, scoreView.rightValue);

    const leftActive = this.round.active && (
      (this.settings.mode === "pva" && this.round.currentPlayer === this.playerSymbol) ||
      (this.settings.mode !== "pva" && this.round.currentPlayer === "X")
    );
    const rightActive = this.round.active && (
      (this.settings.mode === "pva" && this.round.currentPlayer === this.aiSymbol) ||
      (this.settings.mode !== "pva" && this.round.currentPlayer === "O")
    );
    this.playerScoreCard.classList.toggle("is-active", leftActive);
    this.aiScoreCard.classList.toggle("is-active", rightActive);
  }

  renderStatus() {
    if (!this.round.active) {
      this.statusDisplay.textContent = this.round.isDraw
        ? "Round Drawn"
        : this.getWinnerStatus();
      this.turnIndicator.textContent = "Round complete";
      return;
    }

    if (this.settings.mode === "ava") {
      this.statusDisplay.textContent = `System ${this.round.currentPlayer} Thinking\u2026`;
      this.turnIndicator.textContent = "AI vs AI autoplay";
    } else if (this.settings.mode === "pvp") {
      this.statusDisplay.textContent = `${this.round.currentPlayer}'s Turn`;
      this.turnIndicator.textContent = `Place ${this.round.currentPlayer}`;
    } else if (this.isThinking || this.round.currentPlayer === this.aiSymbol) {
      this.statusDisplay.textContent = "AI Thinking\u2026";
      this.turnIndicator.textContent = `AI plays ${this.aiSymbol}`;
    } else {
      this.statusDisplay.textContent = "Your Turn";
      this.turnIndicator.textContent = `Your move (${this.playerSymbol})`;
    }
  }

  renderControls() {
    const undoDisabled = (
      this.settings.mode !== "pva" ||
      this.round.moves.length < 2 ||
      !this.round.active ||
      this.isThinking
    );
    this.undoButton.disabled = undoDisabled;
  }

  renderStats() {
    Object.entries({
      gamesPlayed: "gamesPlayed",
      wins: "wins",
      losses: "losses",
      draws: "draws",
      winStreak: "winStreak",
      bestStreak: "bestStreak",
    }).forEach(([elementKey, statKey]) => {
      this.statsDashboard[elementKey].textContent = this.appState.stats[statKey];
    });
  }

  renderHistory() {
    const currentMoves = this.round.moves.map((move, index) => ({
      text: `Move ${index + 1}: ${move.symbol} to cell ${move.index + 1}`,
    }));
    const savedHistory = this.appState.history.map((entry) => ({
      text: `${formatMode(entry.mode)}: ${entry.result} in ${entry.moves.length} moves`,
    }));
    const items = [...currentMoves, ...savedHistory].slice(0, 20);

    this.historyList.replaceChildren();
    if (items.length === 0) {
      const empty = this.document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No completed rounds yet.";
      this.historyList.append(empty);
      return;
    }

    items.forEach((item) => {
      const row = this.document.createElement("div");
      row.className = "history-move";
      row.textContent = item.text;
      this.historyList.append(row);
    });
  }

  renderSettings() {
    this.setActiveButtons(".theme-swatch[data-theme]", this.settings.theme, "theme");
    this.setActiveButtons("[data-mode]", this.settings.mode, "mode");
    this.setActiveButtons("[data-difficulty]", this.settings.difficulty, "difficulty");
    this.setActiveButtons("[data-personality]", this.settings.personality, "personality");
    this.setActiveButtons("[data-symbol]", this.settings.symbol, "symbol");

    this.document.querySelectorAll("[data-visible-modes]").forEach((group) => {
      const allowedModes = group.dataset.visibleModes.split(/\s+/);
      const visible = allowedModes.includes(this.settings.mode);
      group.hidden = !visible;
      setInert(group, !visible);
    });
  }

  setActiveButtons(selector, activeValue, dataKey) {
    this.document.querySelectorAll(selector).forEach((button) => {
      const active = button.dataset[dataKey] === activeValue;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active.toString());
    });
  }

  toggleHistory() {
    const show = this.historyContainer.hidden;
    this.historyContainer.hidden = !show;
    this.historyButton.textContent = show ? "Hide History" : "Show History";
    this.historyButton.setAttribute("aria-expanded", show.toString());
    if (show) {
      this.renderHistory();
    }
  }

  openSettings() {
    window.clearTimeout(this.modalTimer);
    this.overlay.hidden = false;
    this.settingsPanel.hidden = false;
    setInert(this.settingsPanel, false);
    this.settingsButton.setAttribute("aria-expanded", "true");
    this.document.body.classList.add("no-scroll");

    window.requestAnimationFrame(() => {
      this.overlay.classList.add("is-visible");
      this.settingsPanel.classList.add("is-visible");
      this.closeSettingsButton.focus({ preventScroll: true });
    });
  }

  closeSettings({ restoreFocus = true } = {}) {
    if (this.settingsPanel.hidden) {
      return;
    }

    this.overlay.classList.remove("is-visible");
    this.settingsPanel.classList.remove("is-visible");
    setInert(this.settingsPanel, true);
    this.settingsButton.setAttribute("aria-expanded", "false");
    this.document.body.classList.remove("no-scroll");

    this.modalTimer = window.setTimeout(() => {
      this.overlay.hidden = true;
      this.settingsPanel.hidden = true;
    }, TIMING.MODAL_EXIT_DELAY);

    if (restoreFocus) {
      this.settingsButton.focus({ preventScroll: true });
    }
  }

  handleDocumentKeyDown(event) {
    if (event.key === "Escape" && !this.settingsPanel.hidden) {
      event.preventDefault();
      this.closeSettings();
      return;
    }

    if (event.key === "Tab" && !this.settingsPanel.hidden) {
      this.trapSettingsFocus(event);
    }
  }

  trapSettingsFocus(event) {
    const focusable = Array.from(
      this.settingsPanel.querySelectorAll("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])")
    ).filter((element) => !element.hidden && element.offsetParent !== null);

    if (focusable.length === 0) {
      event.preventDefault();
      this.settingsPanel.focus({ preventScroll: true });
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  previewCell(cell) {
    const index = Number(cell.dataset.cell);
    if (!this.canHumanPlay(index)) {
      return;
    }
    const previewSymbol = this.settings.mode === "pvp" ? this.round.currentPlayer : this.playerSymbol;
    cell.setAttribute("data-preview", previewSymbol);
  }

  getCellLabel(index, symbol, canPlay) {
    const cellNumber = index + 1;
    if (symbol) {
      return `Cell ${cellNumber}, ${symbol}`;
    }
    if (canPlay) {
      return `Cell ${cellNumber}, empty, place ${this.round.currentPlayer}`;
    }
    return `Cell ${cellNumber}, empty, unavailable`;
  }

  getWinnerStatus() {
    if (this.settings.mode === "pva") {
      return this.round.winner === this.playerSymbol ? "You Won" : "AI Won";
    }
    if (this.settings.mode === "ava") {
      return `System ${this.round.winner} Won`;
    }
    return `${this.round.winner} Won`;
  }

  updateScoreValue(element, value) {
    if (element.textContent === String(value)) {
      return;
    }
    element.textContent = value;
    element.classList.remove("score-bumping");
    element.getBoundingClientRect();
    element.classList.add("score-bumping");
  }

  clearAiTimer() {
    if (this.aiMoveTimer) {
      window.clearTimeout(this.aiMoveTimer);
      this.aiMoveTimer = null;
    }
  }

  clearRestartTimer() {
    if (this.restartTimer) {
      window.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }
}

function setInert(element, inert) {
  if (inert) {
    element.setAttribute("inert", "");
  } else {
    element.removeAttribute("inert");
  }
  element.inert = inert;
}

function formatMode(mode) {
  if (mode === "pva") {
    return "Player vs AI";
  }
  if (mode === "pvp") {
    return "Player vs Player";
  }
  return "AI vs AI";
}
