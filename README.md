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
| Collective Breach (3D FPS) | `games/collective-breach/` |
| Futile (8-bit NES style, 12 stages, boss every 4th) | `games/futile/` |
| The Grass Is Greener (whimsy platformer, 6 meadows) | `games/grass-is-greener/` |
| Bony Facade (turret defense, 12 waves) | `games/bony-facade/` |
| Six Angles on Dry World (manga arc shooter, 12 duels) | `games/six-angles-on-dry-world/` |
| Golden Hour Fenestron (urban rotorcraft charter & hoist rescue, 6 shifts) | `games/golden-hour-fenestron/` |
| Fenestron 3D: Golden Horizon (3D rotorcraft sim-arcade, 6 sectors) | `games/fenestron-3d/` |
| A Proper Country (stealth avoidance, McDonald's 1983) | `games/mcdonalds-1983/` |

Resistance Is Tidy controls: WASD to move, mouse to aim, Space or click to assimilate, Q or right-click to scan, Esc to pause, M to mute, F for fullscreen. Each game shows its own controls on its start screen.

Bony Facade (turret-defense of the same house the skeletons are climbing): works from file:// — 1/2/3 pick a
Jack-o'-Launcher, click a glowing spot to place it, click a placed launcher to buy its upgrade (firecracker /
lightning / cluster). Click a skeleton (or Space) for a Pumpkin Bomb, 3 per wave. Survive 12 waves and the
Skele-Boss; Esc pauses, M mutes.

Six Angles on Dry World (a black-and-white manga duel fought on the crust of a tiny moon — everything is drawn in
ink and screentone, and positions are angles along one huge arc rather than flat x/y): A/D walk the arc, W/Space jump
(low moon, long air), mouse aims, click or Space fires, R spins the cylinder open (it also reloads on its own once the
sixth chamber is empty), Shift dashes — a dash dodges. The sixth bullet of every cylinder is the bank shot: it skips
off the crust and can walk into whoever was hiding behind your first target; banks chain for double and quadruple
points. Survive 12 duels, then the Grim Arguer; getting hit costs one of five strips of hide, which you get back a
strip at a time between duels. Esc/P pause, M mute, T restart from the pause panel.

The menu lists each game's original prompt and the model that made it in an "Origin" dropdown.

## Adding a game

1. Put the game in `games/<game-slug>/` with an `index.html` entry page.
2. Register it in `games.js` with `title`, `genre`, `entry`, `prompt` and `model`.

Project rules for new games are in `.github/copilot-instructions.md`.
