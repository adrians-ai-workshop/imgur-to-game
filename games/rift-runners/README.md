# Rift Runners

A self-contained, pseudo-3D arcade hoverbike racer set on the alien world of Kepler-186F. All art and sound are generated in the browser; there are no external assets, libraries, network requests, or build steps.

## Play

Open `index.html` directly, or launch **Rift Runners** from the arcade menu.

- **W / Up arrow:** accelerate
- **S / Down arrow:** brake
- **A/D or Left/Right arrows:** steer
- **Space / Shift:** ion boost (uses the green charge meter)
- **P / Escape:** pause or resume
- **R:** restart while paused
- **M:** mute or enable sound
- **F:** toggle fullscreen where supported
- **Touch:** on-screen steering, brake, boost, and throttle controls

Complete three laps against seven rival riders. Cyan track strips provide a free speed surge, and floating green ion crystals restore 30% boost charge. Leaving the track slows the bike; colliding with rivals or the outer barrier costs speed.

The game includes an animated attract mode, countdown, race and lap timers, live position, minimap, generated engine/effect audio, pause and results screens, and responsive high-DPI rendering.

The vehicles use detailed layered armor, mechanical linkages, twin turbines, anti-gravity rings, visible riders, race numbers, brake lights, and animated boost exhaust. Their vector models are cached as animated sprites to keep rendering costs close to the original lightweight models. Track projection uses lap-local camera distance so the road and scenery remain visible on every lap.
