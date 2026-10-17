/* ============================================================
   SIX ANGLES ON DRY WORLD -- core.js
   viewport maths, seeded RNG, input, synthesised audio.
   ============================================================ */
(function () {
  "use strict";

  const TAU = Math.PI * 2;
  const DRY = (window.DRY = { TAU: TAU });

  /* ---------- maths ---------- */
  DRY.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  DRY.lerp = function (a, b, t) { return a + (b - a) * t; };
  DRY.damp = function (a, b, rate, dt) { return DRY.lerp(a, b, 1 - Math.exp(-rate * dt)); };
  DRY.sign = function (v) { return v < 0 ? -1 : v > 0 ? 1 : 0; };
  DRY.fract = function (v) { return v - Math.floor(v); };
  DRY.easeOut = function (t) { t = DRY.clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
  DRY.easeIn = function (t) { t = DRY.clamp(t, 0, 1); return t * t; };
  DRY.waveShape = function (t) { return 0.5 - 0.5 * Math.cos(DRY.fract(t) * TAU); };

  /* shortest signed difference between two angles */
  DRY.shortAngle = function (a, b) {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  };

  /* small deterministic PRNG so the attract demo can loop identically */
  DRY.makeRng = function (seed) {
    let s = seed >>> 0 || 12345;
    const rng = function () {
      s ^= s << 13; s |= 0;
      s ^= s >>> 17;
      s ^= s << 5; s |= 0;
      return (s >>> 0) / 4294967296;
    };
    rng.range = function (a, b) { return a + (b - a) * rng(); };
    rng.int = function (n) { return Math.floor(rng() * n); };
    rng.pick = function (list) { return list[Math.floor(rng() * list.length)]; };
    rng.chance = function (p) { return rng() < p; };
    return rng;
  };

  let streamSeed = 20261012;
  DRY.rng = DRY.makeRng(streamSeed);
  DRY.reseedStream = function () { streamSeed = (streamSeed * 1103515245 + 12345) >>> 0; DRY.rng = DRY.makeRng(streamSeed); };

  /* ---------- viewport / canvas ---------- */
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const view = DRY.view = { W: 320, H: 240, dpr: 1, cx: 160, cy: 900, R: 700, groundY: -500, unit: 1 };

  DRY.canvas = canvas;
  DRY.ctx = ctx;

  function placeCamera(phi, lean) {
    view.cx = view.W * 0.5 - Math.cos(phi) * view.R + (lean || 0) * view.unit;
    view.cy = view.groundY + view.R;
  }
  DRY.placeCamera = placeCamera;

  function resize() {
    const stage = document.getElementById("stage");
    const w = Math.max(320, Math.floor(stage.clientWidth));
    const h = Math.max(240, Math.floor(stage.clientHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    view.W = w; view.H = h; view.dpr = dpr;
    /* the dry world is a tiny moon: one huge circle whose top arc fills the screen */
    view.R = Math.max(h * 1.5, w * 1.28);
    view.unit = DRY.clamp(Math.min(w / 900, h / 640), 0.56, 1.16);
    view.groundY = h * 0.7;
    placeCamera(view.playerPhi || -Math.PI / 2, 0);
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("orientationchange", resize);
  resize();

  /* ---------- input ---------- */
  const held = Object.create(null);
  const Input = DRY.input = {
    mx: view.W * 0.5, my: view.H * 0.4, firing: false, mouseSeen: false, coarse: false,
    moveAxis: 0, jumpWish: false, dashWish: false, confirmWish: false,
    pauseWish: false, muteWish: false, buttonMove: 0,
    down: function (code) { return !!held[code]; },
    clear: function () {
      for (const k in held) held[k] = false;
      Input.firing = false; Input.buttonMove = 0; Input.moveAxis = 0;
    },
  };

  const LEFT_KEYS = ["KeyA", "ArrowLeft"];
  const RIGHT_KEYS = ["KeyD", "ArrowRight"];
  const anyHeld = function (list) {
    for (let i = 0; i < list.length; i += 1) if (held[list[i]]) return true;
    return false;
  };

  window.addEventListener("keydown", function (e) {
    const c = e.code;
    if (!held[c]) {
      if (c === "Space" || c === "KeyW" || c === "ArrowUp") Input.jumpWish = true;
      if (c === "ShiftLeft" || c === "ShiftRight" || c === "KeyK") Input.dashWish = true;
      if (c === "Enter" || c === "NumpadEnter") Input.confirmWish = true;
    }
    held[c] = true;
    if (c === "Escape" || c === "KeyP") { e.preventDefault(); Input.pauseWish = true; }
    if (c === "KeyM") Input.muteWish = true;
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"].indexOf(c) >= 0) e.preventDefault();
  });
  window.addEventListener("keyup", function (e) { held[e.code] = false; });
  window.addEventListener("blur", function () { Input.clear(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) Input.clear(); });

  canvas.addEventListener("mousemove", function (e) {
    const r = canvas.getBoundingClientRect();
    Input.mx = e.clientX - r.left; Input.my = e.clientY - r.top; Input.mouseSeen = true;
  });
  canvas.addEventListener("pointerdown", function (e) {
    if (e.button === 2) return;
    const r = canvas.getBoundingClientRect();
    Input.mx = e.clientX - r.left; Input.my = e.clientY - r.top;
    Input.firing = true; Input.confirmWish = true; Input.mouseSeen = true;
    DRY.Audio.unlock();
  });
  window.addEventListener("pointerup", function () { Input.firing = false; });
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  if (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0) {
    document.body.classList.add("touch");
    Input.coarse = true;
    const hold = function (id, on, off) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("pointerdown", function (e) { e.preventDefault(); DRY.Audio.unlock(); on(); });
      ["pointerup", "pointercancel", "pointerleave"].forEach(function (n) { el.addEventListener(n, off); });
    };
    const tap = function (id, fn) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("pointerdown", function (e) { e.preventDefault(); DRY.Audio.unlock(); fn(); });
    };
    hold("t-left", function () { Input.buttonMove = -1; }, function () { if (Input.buttonMove < 0) Input.buttonMove = 0; });
    hold("t-right", function () { Input.buttonMove = 1; }, function () { if (Input.buttonMove > 0) Input.buttonMove = 0; });
    tap("t-jump", function () { Input.jumpWish = true; Input.confirmWish = true; });
    tap("t-fire", function () { Input.firing = true; window.setTimeout(function () { Input.firing = false; }, 80); });
  }

  DRY.readInput = function () {
    let a = 0;
    if (anyHeld(LEFT_KEYS)) a -= 1;
    if (anyHeld(RIGHT_KEYS)) a += 1;
    Input.moveAxis = DRY.clamp(a + Input.buttonMove, -1, 1);
  };

  /* ---------- audio: synthesised, no asset files ---------- */
  const Audio = DRY.Audio = { ctx: null, master: null, muted: false, ready: false };

  Audio.unlock = function () {
    if (!Audio.ready) {
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return;
        Audio.ctx = new Ctor();
        Audio.master = Audio.ctx.createGain();
        Audio.master.gain.value = Audio.muted ? 0 : 0.5;
        Audio.master.connect(Audio.ctx.destination);
        Audio.ready = true;
      } catch (err) { Audio.ready = false; }
    } else if (Audio.ctx.state === "suspended") {
      Audio.ctx.resume();
    }
  };

  Audio.setMuted = function (muted) {
    Audio.muted = muted;
    if (Audio.ready) Audio.master.gain.value = muted ? 0 : 0.5;
  };

  function env(dur, peak) {
    const a = Audio.ctx.createGain();
    const t = Audio.ctx.currentTime;
    a.gain.setValueAtTime(0.0001, t);
    a.gain.exponentialRampToValueAtTime(Math.max(peak, 0.003), t + Math.min(0.015, dur * 0.35));
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return a;
  }

  function tone(opts) {
    if (!Audio.ready || Audio.muted) return;
    const t = Audio.ctx.currentTime;
    const osc = Audio.ctx.createOscillator();
    osc.type = opts.type || "square";
    osc.frequency.setValueAtTime(opts.freq, t);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(24, opts.to), t + opts.dur * 0.95);
    const gain = env(opts.dur, opts.gain == null ? 0.18 : opts.gain);
    osc.connect(gain); gain.connect(Audio.master);
    osc.start(t); osc.stop(t + opts.dur + 0.02);
  }

  function noise(opts) {
    if (!Audio.ready || Audio.muted) return;
    const t = Audio.ctx.currentTime;
    const dur = opts.dur;
    const len = Math.max(8, Math.floor(Audio.ctx.sampleRate * dur));
    const buf = Audio.ctx.createBuffer(1, len, Audio.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = Audio.ctx.createBufferSource();
    src.buffer = buf;
    const filt = Audio.ctx.createBiquadFilter();
    filt.type = opts.filter || "bandpass";
    filt.frequency.setValueAtTime(opts.freq, t);
    if (opts.to) filt.frequency.exponentialRampToValueAtTime(Math.max(60, opts.to), t + dur);
    filt.Q.value = opts.q == null ? 1.1 : opts.q;
    const gain = env(dur, opts.gain == null ? 0.22 : opts.gain);
    src.connect(filt); filt.connect(gain); gain.connect(Audio.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  Audio.shoot = function (heavy) {
    noise({ dur: heavy ? 0.34 : 0.2, freq: heavy ? 900 : 1500, to: 120, q: 0.7, gain: heavy ? 0.36 : 0.27 });
    tone({ type: "triangle", freq: heavy ? 220 : 340, to: 62, dur: heavy ? 0.24 : 0.15, gain: heavy ? 0.24 : 0.17 });
  };
  Audio.click = function () { tone({ type: "square", freq: 680, to: 380, dur: 0.05, gain: 0.09 }); };
  Audio.cylOpen = function () { tone({ type: "square", freq: 250, to: 170, dur: 0.08, gain: 0.12 }); };
  Audio.cylClose = function (n) { tone({ type: "square", freq: 300 + n * 90, to: 190, dur: 0.06, gain: 0.1 }); };
  Audio.hurt = function () {
    noise({ dur: 0.26, freq: 430, to: 95, q: 0.6, gain: 0.3 });
    tone({ type: "sawtooth", freq: 180, to: 58, dur: 0.3, gain: 0.15 });
  };
  Audio.kill = function (chain) {
    const lift = Math.min(chain || 0, 7);
    tone({ type: "square", freq: 320 * Math.pow(1.122, lift * 4), to: 92, dur: 0.16, gain: 0.15 });
    noise({ dur: 0.2, freq: 780, to: 140, gain: 0.2 });
  };
  Audio.ricochet = function (i) {
    tone({ type: "sawtooth", freq: 900 + i * 260, to: 300, dur: 0.14, gain: 0.11 });
    noise({ dur: 0.1, freq: 3200, to: 1500, q: 4, gain: 0.12 });
  };
  Audio.chatter = function (pitch) { tone({ type: "square", freq: pitch || 520, to: (pitch || 520) * 0.6, dur: 0.07, gain: 0.045 }); };
  Audio.uiBlip = function (up) { tone({ type: "triangle", freq: up ? 480 : 300, to: up ? 900 : 190, dur: 0.1, gain: 0.12 }); };


})();
