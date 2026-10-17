/* The Grass Is Greener - a whimsical deer platformer built from an Imgur meme:
   a fawn among pink lilies captioned "the grass is greener wherever I am". */
(function () {
  const G = window.GGG;
  const R = () => window.Rules;
  G.attachInput();

  let state = 'attract', t = 0, last = performance.now(), advance = null, rafErr = 0;
  const CAPTIONS = [
    '&ldquo;the grass is greener wherever I am&rdquo;',
    'Every meadow has its bees.',
    'The lilies follow you now.',
    'Greener? There it is again.',
    'Somewhere over the next hedgerow.',
  ];

  const showHud = (v) => window.UI.setHudVisible(v);
  const toast = (s, ms) => window.UI.toast(s, ms);

  function startAttract() {
    state = 'attract'; advance = null;
    showHud(false);
    window.UI.attract(() => startRun(0));
  }

  function startRun(idx) {
    window.Sfx.resume(); window.Sfx.start();
    window.UI.close();
    R().newRun(idx || 0);
    showHud(true);
    state = 'play';
    toast(CAPTIONS[0], 2400);
  }

  function gameOver() {
    state = 'gameover'; advance = () => startRun(0);
    showHud(false);
    window.Sfx.gameover();
    window.UI.gameOver({ collected: R().run.collectedTotal }, advance);
  }

  function allDone() {
    state = 'alldone';
    const run = R().run;
    advance = () => startRun(0);
    showHud(false);
    window.UI.allDone({ collected: run.collectedTotal, total: R().totalBlossoms(), time: run.totalTime }, advance);
  }

  function levelClear() {
    if (state !== 'play') return;
    state = 'levelclear';
    const r = R();
    r.run.totalTime += r.timeOn();
    const info = r.info();
    showHud(false);
    window.Sfx.gate();
    advance = () => {
      if (info.last) { allDone(); return; }
      window.UI.close();
      r.refill(2);                 // a fresh meadow lifts the fawn's spirits
      r.loadLevel(r.run.levelIdx + 1);
      showHud(true);
      state = 'play';
      toast(CAPTIONS[r.run.levelIdx % CAPTIONS.length]);
    };
    window.UI.levelClear(info, advance);
  }

  const pauseGame = () => {
    if (state !== 'play') return;
    state = 'pause'; advance = null;
    window.UI.pause(() => { window.UI.close(); state = 'play'; }, startAttract);
  };

  function shortcuts(pc) {
    if (pc.indexOf('KeyM') >= 0) { const m = window.Sfx.toggle(); toast(m ? 'Sound off' : 'Sound on', 900); }
    if (pc.indexOf('Escape') >= 0 || pc.indexOf('KeyP') >= 0) { pauseGame(); return; }
    if (pc.indexOf('Enter') >= 0) {
      if (state === 'attract') startRun(0);
      else if (advance) advance();
    }
  }

  function frame(now) {
    const dt = Math.min(0.034, (now - last) / 1000 || 0);
    last = now;
    G.pollInput();
    try {
      shortcuts(G.pressedCodes);
      t += dt;

      if (state === 'play') {
        const res = R().update(dt, t);
        if (res.goal) levelClear();
        else if (res.dead) gameOver();
      } else if (window.Ent && window.Ent.parts.length) window.Ent.updateParts(dt);

      const vw = G.W / G.scale, vh = G.H / G.scale;
      if (state === 'attract' || !R().level) {
        window.Scene.attractDraw(t);
      } else {
        window.Scene.world({ level: R().level, levelIdx: R().run ? R().run.levelIdx : 0,
          player: R().player, cam: R().cam, t, vw, vh });
      }
    } catch (e) {
      rafErr++; if (rafErr < 5) console.error('frame error', e);
    }
    requestAnimationFrame(frame);
  }

  startAttract();
  requestAnimationFrame(frame);
})();