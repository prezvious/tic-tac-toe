# Tic-Tac-Toe

A clean, accessible tic-tac-toe game built as a static website. It supports Player vs AI, Player vs Player, AI vs AI autoplay, nine visual themes, saved progress, and keyboard-friendly play.

## Features

- **Three modes:** Player vs AI, Player vs Player, and AI vs AI spectator mode.
- **AI options:** Easy, medium, hard minimax, plus balanced, aggressive, defensive, and random personalities in Player vs AI.
- **Nine themes:** Canvas, Azure, Aurora, Solar, Apricot, Dusk, Blush, Vapor, and Abyss.
- **Accessible board:** Each cell is a real button with native keyboard activation and accurate labels.
- **Saved progress:** Preferences, scores, Player vs AI stats, and recent round history are stored locally.
- **Reset All Data:** Clears saved preferences, scores, stats, history, and older legacy storage keys.

## How to Play

Open the live site:

https://prezvious.github.io/tic-tac-toe/

For local development, serve the folder over HTTP because the app uses native ES modules:

```powershell
node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript'};http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');const file=path.resolve(root,url.pathname==='/'?'index.html':url.pathname.slice(1));if(!file.startsWith(root)){res.writeHead(403);res.end('Forbidden');return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain'});res.end(data);});}).listen(8765,'127.0.0.1',()=>console.log('http://127.0.0.1:8765'))"
```

## Controls

- **Board cells:** Press Tab to move through cells, then Enter or Space to place a mark.
- **Reset Round:** Clears only the current board.
- **Undo Move:** Available in Player vs AI after both the player and AI have moved.
- **Game Settings:** Changes mode, theme, AI options, and player symbol.
- **Show History:** Shows current move activity and recent completed rounds.
- **Reset All Data:** Clears every saved value and returns the app to defaults.

## Project Structure

- `index.html` - semantic static page shell.
- `style.css` - responsive theme and layout system.
- `script.js` - small browser entrypoint.
- `js/game.mjs` - pure game rules, scoring, stats, and history updates.
- `js/ai.mjs` - AI move selection and minimax.
- `js/storage.mjs` - localStorage persistence, migration, and reset behavior.
- `js/ui.mjs` - DOM rendering, settings dialog, timers, and interactions.
- `tests/*.test.mjs` - Node unit tests for game, AI, and storage logic.

## Verification

Run the unit tests:

```powershell
node --test tests\*.test.mjs
```

The website has no build step and no runtime dependencies beyond a modern browser.
