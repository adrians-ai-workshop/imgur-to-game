# Imgur to Game

A small browser arcade where each game is built from an Imgur image and a prompt. Every game is plain HTML, CSS and JavaScript, so there is nothing to install or build.

## Run the games

**Online:** [Play the arcade on GitHub Pages](https://adrians-ai-workshop.github.io/imgur-to-game/).

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
| Asteroids (vector arcade shooter) | `games/asteroids/` |
| Star Wars (first-person vector arcade) | `games/star-wars/` |
| Tetris Clone (falling-block puzzle) | `games/tetris-clone/` |
| Einstein Puzzle (GPL Linux game adapted for the web) | `games/einstein/` |
| First Hunting Mission (stealth-pounce, 5 rooms, 9 lives) | `games/first-hunting-mission/` |
| Ink & Edge (sketchbook blade duel) | `games/ink-and-edge/` |
| I Can't Prove It (pumpkin-stand shoplifting stealth, endless shifts) | `games/cant-prove-it/` |
| Pumpkin Cup (bra-sized pumpkin heist, side-view runner) | `games/pumpkin-cup/` |
| Rift Runners (alien hoverbike racing, 3 laps, 8 riders) | `games/rift-runners/` |

Resistance Is Tidy controls: WASD to move, mouse to aim, Space or click to assimilate, Q or right-click to scan, Esc to pause, M to mute, F for fullscreen. Each game shows its own controls on its start screen.

First Hunting Mission (a very small tabby, five enormous rooms, and a household that is only pretending to be scared):
A/D sneak (silent), Shift trot (fast and loud), hold Space to wind up and release to pounce, P/Esc pause, M mute,
F fullscreen. Land close to your prey for a clean catch, stay unseen for a bigger multiplier, and chain pounces to
raise the score. Nine lives are shared across the run; the last room asks you to pounce a vacuum cleaner's glowing
power button four times. It works from disk or a static server.

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

I Can't Prove It (you are the shoplifter from the meme — grab pumpkins off the tiered display, stuff them into your tote bag, and dump them at your truck before the guard catches you): WASD/arrows move, hold Space to grab a pumpkin, hold F to stuff it in your bag, hold E at the truck pad to dump (full bags pay a bonus), X drops what you're carrying. The guard can only bust you if he sees your hands on a pumpkin — his cone turns red and shows "!" while he builds proof; being seen with pumpkins fills the suspicion meter until he chases you for a bag check, which always ends in "I CAN'T PROVE IT." (but costs you time). The display tower and the truck block line of sight. Hit each shift's quota before the clock runs out; three busts or a missed shift ends the run. P/Esc pause, M mute. Works from disk or a static server.

Einstein Puzzle uses the original game's artwork, sounds, 6x6 deduction rules and
fail-on-mistake behavior. Left-click a candidate to open it, right-click to exclude;
right-click clues to hide them and use Switch to view/restore removed clues. On
touchscreens, toggle Select / Exclude below the board. P pauses, S switches clues,
X changes input mode, and Ctrl+Z undoes a valid move. Save/load uses five explicit
browser-local slots (no autosave); the attract menu includes rules and local top
scores. It works from disk or a static server. See
[port notes and licensing](games/einstein/README.md) for GPL attribution, original
source, intentional web differences and tests.

## Publishing

The public hosting repository is
[adrians-ai-workshop/imgur-to-game](https://github.com/adrians-ai-workshop/imgur-to-game).
The [Pages workflow](.github/workflows/pages.yml) tests the puzzle engine and
registry, packages the static arcade and all games, then deploys to GitHub Pages
automatically on every push to `main`. It can also be run manually from the
repository's Actions tab. No package installation or build tool is required.

In repository **Settings > Pages**, the source must be **GitHub Actions**.
The deploy job uses the `github-pages` environment and only grants Pages write
and identity-token permissions to that job. The published artifact contains the
arcade files and game sources, including Einstein's GPL license and source
archive, but not Git history or repository configuration.

Local browser saves do not transfer to the online site. Save slots on GitHub
Pages belong to that site's browser storage.

## Adding a game

1. Put the game in `games/<game-slug>/` with an `index.html` entry page.
2. Register it in `games.js` with `title`, `genre`, `entry`, `prompt` and `model`.

Project rules for new games are in `.github/copilot-instructions.md`.
