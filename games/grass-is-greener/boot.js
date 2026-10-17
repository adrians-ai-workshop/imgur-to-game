/* The Grass Is Greener - whimsical deer platformer.
   Boot module: canvas sizing, view scaling, input, small math helpers. */
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const VIEW_H_UNITS = 760;          // world units visible vertically

  let W = 960, H = 540, scale = 1, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(320, window.innerWidth | 0);
    H = Math.max(240, window.innerHeight | 0);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    scale = H / VIEW_H_UNITS;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- math helpers ----------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a += 0x6d2b79f5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- input ----------
  const keys = Object.create(null);
  const pressed = new Set();          // key codes seen since last frame

  function onKeyDown(e) {
    const c = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c)) e.preventDefault();
    if (!keys[c]) pressed.add(c);
    keys[c] = true;
  }
  function onKeyUp(e) { keys[e.code] = false; }

  const touch = { left: false, right: false, jump: false };

  function attachInput() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      canvas.classList.add('touch');
      document.body.classList.add('has-touch');
      GGG.buildTouchControls();
    }
  }

  const pressedCodes = [];            // filled each frame, consumed by game logic

  function pollInput() {
    pressedCodes.length = 0;
    for (const c of pressed) pressedCodes.push(c);
    pressed.clear();
  }

  window.GGG = {
    canvas, ctx,
    get W() { return W; }, get H() { return H; }, get scale() { return scale; },
    viewUnitsH: VIEW_H_UNITS,
    keys, pressedCodes, touch, attachInput, pollInput,
    clamp, lerp, mulberry32,
    // shared mutable game state (filled in by game.js)
    state: 'boot',              // attract | play | pause | levelclear | gameover | alldone
    keysEnabled: true,
  };
})();