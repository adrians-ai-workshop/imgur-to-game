# Einstein Puzzle - browser adaptation

A faithful, dependency-free JavaScript adaptation of **Einstein 2.0** by Alexander
Babichev / Flowix, as distributed in Debian. Open `index.html` directly or launch
Einstein Puzzle from the root arcade registry. No build, downloads, external fonts,
CDN or network service is required during play.

## Preserved from the original

- Original 36 large and 36 small card images, background textures, buttons, clue
  images, failure/select/exclude/click/victory sound effects.
- The 800x600 reference layout: six-by-six grid at upper left, 24 horizontal clue
  slots to the right, 15 two-card same-column clue slots along the bottom, blue
  title bar and timer, and the six original game buttons.
- Each row is a permutation of six symbols: numbers, letters, Roman numerals,
  dice, shapes, and mathematical operators.
- Left-click selects; right-click excludes. Cell singles and symbols with only
  one remaining position propagate within their row. Clues are not automatically
  applied during play.
- Red arrow = immediately adjacent in either order. Red dots = somewhere to the
  left, not necessarily adjacent. Blue arrow = three consecutive columns with the
  displayed center card in the middle, outer cards reversible. Stacked = same
  column.
- Right-click a clue to remove it. Switch displays removed clues in their original
  slots; right-click restores them. Switch again returns to active clues.
- A wrong move immediately ends the attempt. Try again restarts the same puzzle
  and excludes it from top scores.
- Generator constructs a random solution, adds valid clues until deductively
  solvable, removes redundant clues, and retries if the clues exceed the original
  24 horizontal / 15 vertical limits. Full sound deduction to a singleton board
  certifies a unique solution, without guessing.

## Intentional web differences

This is a source adaptation, **not a binary/emulator port or a pixel-identical
copy of every native dialog**. The gameplay artwork is original; fonts use the
browser's Arial/Helvetica rather than the original packaged TrueType fonts.

The required animated attract menu requires an explicit New game / Enter action.
The background fills the viewport with no separate side panel. Desktop gameplay
preserves the original **4:3 (800x600) aspect ratio**, centered and uniformly scaled
to fit the available width and height. Cards stay square, and the complete grid,
controls and clue strips remain visible on wide and ultrawide screens. Spare
space uses the same background rather than stretching the puzzle. Text and gaps
scale with the playfield, not with the browser width.

Portrait reflows the same board and clues into a touch-friendly, vertically
scrollable game view while preserving square cards. Browser safe areas and
reduced-motion preferences are respected.

Web conveniences: touch Select/Exclude mode, keyboard input, clue descriptions
and highlights, undo for **valid** moves only, browser fullscreen, volume control,
five named local save slots, local top ten times, and automatic pause when the
page is hidden. Game progress is **not autosaved**. The main menu retains the
current session until the page closes.

Browser saves are JSON in localStorage, not compatible with native Linux save
files. They belong to this browser and site address; disk mode, different ports
and different hosts do not share storage. Storage errors and invalid saves are
reported explicitly. Saved puzzles and candidate state are validated before use.

### Controls

| Input | Action |
| --- | --- |
| Left click / Select-mode tap / focused Enter or Space | Open candidate |
| Right click / Shift-click / Exclude-mode tap / focused Delete or Shift+Enter/Space | Exclude candidate |
| Right-click clue / Exclude-mode tap clue / focused Delete | Hide or restore clue |
| Click, hover or focus clue | Describe clue and highlight remaining positions |
| X / Select-Exclude button | Toggle tap mode |
| S / Switch | Show active or removed clues |
| P / Pause | Pause/resume; board and clues are hidden |
| Ctrl+Z / Cmd+Z / Undo | Undo last valid move |
| Esc | Exit confirmation / dismiss ordinary dialog |
| F1 / Help | Rules |

## License and provenance

Original game and resources: **Copyright 2003-2005 Alexander Babichev, Flowix**,
licensed under **GNU GPL version 2 or later**, without warranty.
This browser adaptation and modified resources are also GPL-2.0-or-later.

- [Debian package](https://packages.qa.debian.org/einstein)
- [Debian copyright declaration](https://sources.debian.org/src/einstein/2.0.dfsg.2-11/debian/copyright/)
- [Original source download](https://deb.debian.org/debian/pool/main/e/einstein/einstein_2.0.dfsg.2.orig.tar.gz)
- [Bundled unchanged original source archive](upstream-source.tar.gz)
- [Full GPL-2 license](COPYING)

`assets/*.png` are lossless conversions of `res/*.bmp` from that archive. The
between-arrow's corner background color is made transparent, matching the SDL
color key. `assets/*.wav` are unchanged. `engine.js` adapts the possibilities,
clue semantics and generation approach in `puzgen.cpp` and `rules.cpp`; the web
UI is implemented in `index.html`, `style.css` and `game.js`. All preferred
editable source is included unminified. No original font files are redistributed.

The unused upstream title artwork and cursor are not used by the web interface.

## Validation

With Node.js 18 or newer, from the repository root:

```sh
node --test games/einstein/engine.test.cjs
node --check games/einstein/game.js
```

The dependency-free tests cover all clue semantics, propagation, valid and invalid
moves, determinism, 100 generated puzzles, original clue-slot limits, solution
preservation, irredundant clue sets, save-puzzle validation, and registry launch
targets. Browser integration additionally needs manual or browser-automation
checks for input, dialogs, saves, audio and responsive rendering.
