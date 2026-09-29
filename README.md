# Imgur to Game

A small browser arcade where each game is built from an Imgur image and a prompt. Every game is plain HTML, CSS and JavaScript, so there is nothing to install or build.

## Run the games

**Quickest:** open `index.html` in a modern browser (Chrome, Edge, Firefox or Safari). Click **Browse games** and pick a title. The games also work when opened straight from disk.

**With a local server (optional):** from this folder, run one of:

```sh
npx serve .
# or
python -m http.server 8000
```

Then open the printed address (for example `http://localhost:8000`).

To run a single game directly, open its page, e.g. `games/resistance-is-tidy/index.html`.

## Games

| Game | Folder |
| --- | --- |
| Why Do We Do It This Way? | `games/why-do-we-do-it-this-way/` |
| Resistance Is Tidy | `games/resistance-is-tidy/` |

Resistance Is Tidy controls: WASD to move, mouse to aim, Space or click to assimilate, Q or right-click to scan, Esc to pause, M to mute, F for fullscreen. Each game shows its own controls on its start screen.

The menu lists each game's original prompt and the model that made it in an "Origin" dropdown.

## Adding a game

1. Put the game in `games/<game-slug>/` with an `index.html` entry page.
2. Register it in `games.js` with `title`, `genre`, `entry`, `prompt` and `model`.

Project rules for new games are in `.github/copilot-instructions.md`.
