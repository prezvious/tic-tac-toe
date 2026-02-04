# Tic-Tac-Toe

## Description
A premium, visually stunning implementation of Tic-Tac-Toe featuring a **Soft UI (Neumorphic)** design system. This project goes beyond the basics by offering a highly polished user experience with glassmorphism effects, distinct aesthetic themes, and robust gameplay modes—including a fully automated AI vs. AI spectator mode.

## Key Features

### 🎨 Visual Design & Themes
- **Neumorphic & Glassmorphic UI:** Built with modern CSS techniques using soft shadows, gradients, and transparency effects to create a tactile, realistic feel.
- **9 Curated Themes:** Instantly switch between completely distinct visual styles:
  - **Canvas:** Radical minimalism with white-on-white textures.
  - **Azure:** Reliable tech blue aesthetics.
  - **Aurora:** Morning clarity with glassmorphism effects.
  - **Solar:** Energetic gradients of orange and red.
  - **Apricot:** Organic warmth and earth tones.
  - **Dusk:** A balanced blend of warm and cool greys.
  - **Blush:** Soft romantic gradients.
  - **Vapor:** Cyberpunk digital nostalgia with neon accents.
  - **Abyss:** Premium dark luxury.

### 🎮 Game Modes
- **Player vs AI (PvA):** Challenge the computer.
- **AI vs AI (AvA):** Watch the "System" play against itself in an infinite loop. Features an auto-restart progress bar that triggers after every match.

### 🧠 AI Intelligence
- **Easy:** The AI plays randomly.
- **Medium:** A mix of random moves and basic blocking strategies.
- **Hard:** Uses the **Minimax algorithm** to play perfectly. It is mathematically impossible to beat this level (the best outcome is a draw).

### ⚙️ Functionality
- **Smart Persistence:** Your preferences (Theme, Difficulty, Symbol, Mode) are saved automatically to LocalStorage.
- **Move History:** A scrollable log tracking every move made during the match.
- **Undo System:** Make a mistake? Step back two moves (available in PvA mode).
- **Score Tracking:** Persistent score counters for both Player and AI.

## How to Play
1. **Launch:** Open the [link](https://prezvious.github.io/tic-tac-toe/) in any modern web browser.
2. **Settings:** Click the "Game Settings" button to customize your experience:
   - **Mode:** Switch between playing yourself or watching the AI battle.
   - **Style:** Select one of the 9 themes by clicking the circular swatches.
   - **Difficulty:** Adjust the AI challenge level.
   - **Symbol:** Choose to play as X or O.
3. **Controls:**
   - **Undo Move:** Reverts the board state (PvA only).
   - **Reset Round:** Clears the board to start fresh.
   - **Reset Scores:** Sets the win counters back to zero.
   - **Show History:** Toggles the game log visibility.

## Technologies Used
- **HTML5:** Semantic markup.
- **CSS3:** Advanced usage of CSS Variables (Custom Properties), Flexbox, Grid, and linear/radial gradients for theming.
- **JavaScript (ES6+):** Vanilla JS handling DOM manipulation, Minimax algorithm logic, and state management.
