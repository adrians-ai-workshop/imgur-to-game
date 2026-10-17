/* BONY FACADE — Turret Defense
   A tower defense game set at a haunted Victorian house covered in climbing
   skeletons (after a real Halloween decoration photo). Plain HTML/CSS/JS,
   single file, no assets: the house, skeletons, bones and effects are all
   drawn with the Canvas 2D API. */

"use strict";

/* Core, layout & viewport */
const DW = 1200, DH = 800, TOP_H = 64, ROW_H = 64, ROWS = 8;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let dpr = 1, viewScale = 1, viewOX = 0, viewOY = 0;

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth  || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  viewScale = Math.min(w / DW, h / DH);
  viewOX = (w - DW * viewScale) / 2;
  viewOY = (h - DH * viewScale) / 2;
}
window.addEventListener("resize", resize);
resize();

function toGame(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (clientX - r.left - viewOX) / viewScale,
    y: (clientY - r.top  - viewOY) / viewScale
  };
}
function inBounds(p) { return p.x >= 0 && p.x <= DW && p.y >= 0 && p.y <= DH; }

/* Tiny WebAudio synth (no assets). Creaks, knocks, pops, pickup blips. */
const AudioSys = {
  ctx: null, master: null, muted: false,
  init() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.24;
      this.master.connect(this.ctx.destination);
    } catch (e) { /* audio is optional */ }
  },
  now() { return this.ctx ? this.ctx.currentTime : 0; },
  beep(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.now();
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  },
  env(dur, gain) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.now());
    g.gain.exponentialRampToValueAtTime(0.001, this.now() + dur);
    g.connect(this.master);
    return g;
  },
  noiseBurst(dur, freqCut, gain, type) {
    if (!this.ctx || this.muted) return;
    const t = this.now();
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type || "bandpass"; f.frequency.value = freqCut; f.Q.value = 0.9;
    src.connect(f); f.connect(this.env(dur, gain));
    src.start(t);
  },
  guard(fn) { if (this.ctx && !this.muted) fn(this.ctx, this.now(), this.master); },
  playShoot(type) {
    this.guard(c => {
      const t = c.currentTime, o = c.createOscillator(), g = this.env(0.12, 0.10);
      o.type = "square";
      o.frequency.setValueAtTime(type === "lightning" ? 880 : 440, t);
      o.frequency.exponentialRampToValueAtTime(110, t + 0.1);
      o.connect(g); o.start(t); o.stop(t + 0.13);
    });
    this.noiseBurst(type === "lightning" ? 0.08 : 0.05, type === "lightning" ? 3200 : 1600, 0.05);
  },
  playHit() { this.noiseBurst(0.06, 900, 0.07); },
  playPop() { this.noiseBurst(0.05, 700, 0.08); this.beep(180, 0.08, "sine", 0.08); },
  playDestroy() { this.noiseBurst(0.3, 300, 0.14); this.beep(70, 0.28, "sine", 0.1); },
  playPickup() {
    this.guard(c => {
      const t = c.currentTime, o = c.createOscillator(), g = this.env(0.14, 0.07);
      o.type = "triangle";
      o.frequency.setValueAtTime(660, t);
      o.frequency.setValueAtTime(880, t + 0.06);
      o.connect(g); o.start(t); o.stop(t + 0.16);
    });
  },
  playPlace() { this.beep(520, 0.09, "square", 0.07); },
  playDeny() { this.beep(150, 0.14, "sawtooth", 0.05); },
  playLeak() {
    this.noiseBurst(0.2, 1200, 0.11, "highpass");
    this.guard(c => {
      const t = c.currentTime, o = c.createOscillator(), g = this.env(0.2, 0.09);
      o.type = "square";
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(80, t + 0.18);
      o.connect(g); o.start(t); o.stop(t + 0.22);
    });
  },
  playWhack() { this.noiseBurst(0.06, 500, 0.09, "lowpass"); },
  playBombArm() { this.beep(197, 0.05, "square", 0.05); },
  playWaveCue(win) {
    this.guard(c => {
      const t = c.currentTime;
      const seq = win ? [523, 659, 784] : [330, 262, 196];
      seq.forEach((fr, i) => {
        const o = c.createOscillator(), g = this.env(0.2, 0.08);
        o.type = "triangle"; o.frequency.setValueAtTime(fr, t + i * 0.13);
        o.connect(g); o.start(t + i * 0.13); o.stop(t + i * 0.13 + 0.2);
      });
    });
  },
  playVictory() {
    this.guard(c => {
      const t = c.currentTime;
      [523, 659, 784, 1047].forEach((fr, i) => {
        const o = c.createOscillator(), g = this.env(0.3, 0.09);
        o.type = "square"; o.frequency.setValueAtTime(fr, 0.62 + t + i * 0.1);
        o.connect(g); o.start(0.62 + t + i * 0.1); o.stop(0.62 + t + i * 0.1 + 0.3);
      });
    });
  },
  playDefeat() {
    this.guard(c => {
      const t = c.currentTime;
      [392, 330, 262, 196].forEach((fr, i) => {
        const o = c.createOscillator(), g = this.env(0.32, 0.09);
        o.type = "sawtooth"; o.frequency.setValueAtTime(fr, t + i * 0.14);
        o.connect(g); o.start(t + i * 0.14); o.stop(t + i * 0.14 + 0.32);
      });
    });
  }
};

/* Wave table (12 waves). Skeletons spawn from the lawn, pick a window, climb. */
const WAVES = [
  { skels: [{ n: 8, type: "normal" }], interval: 1500, bonus: 25 },
  { skels: [{ n: 11, type: "normal" }], interval: 1400, bonus: 30 },
  { skels: [{ n: 9, type: "normal" }, { n: 4, type: "fast" }], interval: 1400, bonus: 35 },
  { skels: [{ n: 12, type: "normal" }, { n: 5, type: "fast" }], interval: 1300, bonus: 40 },
  { skels: [{ n: 10, type: "normal" }, { n: 6, type: "fast" }, { n: 4, type: "brute" }], interval: 1300, bonus: 45 },
  { skels: [{ n: 14, type: "normal" }, { n: 8, type: "fast" }], interval: 1200, bonus: 50 },
  { skels: [{ n: 10, type: "normal" }, { n: 8, type: "fast" }, { n: 7, type: "brute" }], interval: 1200, bonus: 55 },
  { skels: [{ n: 12, type: "normal" }, { n: 10, type: "fast" }, { n: 8, type: "armored" }], interval: 1150, bonus: 60 },
  { skels: [{ n: 15, type: "normal" }, { n: 10, type: "fast" }, { n: 8, type: "brute" }], interval: 1100, bonus: 65 },
  { skels: [{ n: 14, type: "normal" }, { n: 9, type: "fast" }, { n: 10, type: "armored" }], interval: 1050, bonus: 70 },
  { skels: [{ n: 16, type: "normal" }, { n: 11, type: "fast" }, { n: 9, type: "armored" }], interval: 1000, bonus: 75 },
  { skels: [{ n: 12, type: "normal" }, { n: 9, type: "fast" }, { n: 7, type: "armored" }, { n: 1, type: "boss" }], interval: 950, bonus: 100 }
];
const BOSS_DMG = 5;

/* Enemy type balance */
const TYPES = {
  normal:  { hp: 20,  speed: 42, dmg: 1, reward: 4, stroke: "#f6f2e4", width: 3, scale: 1.0, name: "NORMAL" },
  fast:    { hp: 15,  speed: 66, dmg: 1, reward: 3, stroke: "#66d9ff", width: 2, scale: 0.92, name: "SPRINTER" },
  brute:   { hp: 60,  speed: 30, dmg: 2, reward: 8, stroke: "#ff9a3d", width: 5, scale: 1.18, name: "BRUTE" },
  armored: { hp: 40,  speed: 38, dmg: 2, reward: 7, stroke: "#c9a6ff", width: 4, scale: 1.06, name: "ARMORED" },
  boss:    { hp: 340, speed: 22, dmg: 5, reward: 60, stroke: "#ff5d6c", width: 6, scale: 1.7, name: "SKELE-BOSS" }
};

/* Grid helper */
function cellAt(x, y) {
  if (x < 0 || y < 0 || x >= DW || y >= DH) return null;
  return { c: Math.floor(x / 60), r: Math.floor(y / 60) };
}

/* ----------------------------------------------------------------------
   House layout (the "path") — skeletons enter from the left/right lawn
   edges, walk to the porch, climb onto the porch roof, up the turret,
   around the cone and down a chimney. Each window on the facade is a goal.
---------------------------------------------------------------------- */
const HOUSE = {
  // Facade windows (in design coords). Skeletons pick one as a goal.
  windows: [
    { x: 420, y: 300, w: 56, h: 84 },  // downstairs left
    { x: 716, y: 300, w: 56, h: 84 },  // downstairs middle
    { x: 910, y: 300, w: 56, h: 84 },  // downstairs right
    { x: 540, y: 150, w: 56, h: 84 },  // upstairs left
    { x: 716, y: 150, w: 56, h: 84 },  // upstairs middle
    { x: 910, y: 150, w: 56, h: 84 }   // upstairs right
  ],
  // Turret cone apex (skeletons circle the cone rim).
  apex: { x: 806, y: 88 },
  // Porch roof: towers sit here and on the turret wall.
  porch: { x0: 180, x1: 1000, y: 396 },
  // Lawn
  lawnY: 726
};

// Tower build spots: porch roof strip + turret wall spots.
const SLOTS = [];
for (let i = 0; i < 6; i++)
  SLOTS.push({ x: 250 + i * 140, y: 378, roof: true });
SLOTS.push({ x: 700, y: 172, roof: false }, { x: 912, y: 172, roof: false },
           { x: 700, y: 316, roof: false }, { x: 912, y: 316, roof: false },
           { x: 806, y: 240, roof: false }, { x: 806, y: 344, roof: false });

/* Launcher catalog */
const LAUNCHERS = {
  banger:  { key: "1", name: "BANGER",  cost: 25, color: "#ff9a3d", range: 170,
             cooldown: 550, dmg: 8, speed: 520, splash: 0, stack: 0 },
  fizzer:  { key: "2", name: "FIZZER",  cost: 50, color: "#66d9ff", range: 150,
             cooldown: 900, dmg: 12, speed: 0, splash: 0, stack: 2, zap: true },
  mortar:  { key: "3", name: "MORTAR",  cost: 80, color: "#ff5d6c", range: 210,
             cooldown: 1400, dmg: 20, speed: 420, splash: 52, stack: 0, lob: true }
};

/* Upgrade catalog (per-type, bought on the turret popup). */
const UPGRADES = {
  banger:  { firecracker: { cost: 45, name: "FIRECRACKER", desc: "Bigger bangs knock climbers sideways" } },
  fizzer:  { lightning:  { cost: 45, name: "LIGHTNING",  desc: "Zaps chain to two skeletons" } },
  mortar:  { cluster:    { cost: 55, name: "CLUSTER",    desc: "Splits into three sub-charges" } }
};

/* The 5-point defense of a normal enemy's march. */
const POP_RANK = ["normal", "fast", "armored", "brute", "boss"];

/* Sprite pre-render (offscreen canvas cache, lazy). */
const SPRITE_CACHE = new Map();
function getSkeletonSprite(type, frame) {
  const key = type + "-" + frame;
  if (SPRITE_CACHE.has(key)) return SPRITE_CACHE.get(key);
  const t = TYPES[type];
  const c = document.createElement("canvas");
  c.width = 72; c.height = 72;
  const g = c.getContext("2d");
  drawSkeletonInto(g, 36, 36, t, frame, 1);
  SPRITE_CACHE.set(key, c);
  return c;
}

/* ----------------------------------------------------------------------
   Skeleton drawing (procedural, on-canvas). Draws into any 2D context.
---------------------------------------------------------------------- */
function drawSkeletonInto(g, cx, cy, type, frame, scale) {
  const s = (type.scale || 1) * scale;
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);

  const wob = Math.sin(frame * 0.24) * 2;
  g.strokeStyle = type.stroke;
  g.fillStyle = type.stroke;
  g.lineWidth = type.width;
  g.lineCap = "round";

  // Rib cage
  g.beginPath();
  g.moveTo(-4, -8); g.quadraticCurveTo(-7, 0, -4, 6);
  g.moveTo(4, -8);  g.quadraticCurveTo(7, 0, 4, 6);
  g.moveTo(-6.5, -2 + wob * 0.3); g.lineTo(6.5, -2 + wob * 0.3);
  g.moveTo(-5.5, 2.5 + wob * 0.3);  g.lineTo(5.5, 2.5 + wob * 0.3);
  g.stroke();

  // Spine and pelvis
  g.beginPath();
  g.moveTo(0, -12); g.lineTo(0, 8);
  g.moveTo(-6, 12); g.lineTo(6, 12);
  g.stroke();

  // Arms (climb pose, animated)
  const armSwing = Math.sin(frame * 0.2 + 1) * 5;
  g.beginPath();
  g.moveTo(-6, -9); g.lineTo(-13, -6 + armSwing * 0.3);
  g.lineTo(-14, 1 + armSwing * 0.6);
  g.moveTo(6, -9);  g.lineTo(13, -6 - armSwing * 0.3);
  g.lineTo(14, 1 - armSwing * 0.6);
  g.stroke();

  // Legs (walking / climbing)
  g.beginPath();
  g.moveTo(-4, 13); g.lineTo(-6, 22 + armSwing * 0.35);
  g.lineTo(-8, 30 + armSwing * 0.4);
  g.moveTo(4, 13);  g.lineTo(6, 22 - armSwing * 0.35);
  g.lineTo(8, 30 - armSwing * 0.4);
  g.stroke();

  // Skull (bobbing)
  const bob = Math.sin(frame * 0.18) * 1.2;
  g.beginPath();
  g.arc(0, -17 + bob, 7.5, 0, Math.PI * 2);
  g.fill();

  // Jaw
  g.beginPath();
  g.moveTo(-4, -11.5 + bob); g.lineTo(4, -11.5 + bob);
  g.moveTo(-4, -11.5 + bob); g.lineTo(-4, -9 + bob);
  g.moveTo(4, -11.5 + bob);  g.lineTo(4, -9 + bob);
  g.stroke();

  // Eye holes
  g.fillStyle = "#0b0f1f";
  g.beginPath();
  g.arc(-3, -17.5 + bob, 1.9, 0, Math.PI * 2);
  g.arc(3, -17.5 + bob, 1.9, 0, Math.PI * 2);
  g.fill();

  g.restore();
}

/* ----------------------------------------------------------------------
   Game state
---------------------------------------------------------------------- */
let mode = "attract";     // attract | playing
let phase = "build";      // build | wave
let paused = false;
let shake = 0;

let lives, bones, kills, score, waveIdx, bombsLeft;
let enemies = [], projectiles = [], towers = [], particles = [], floatTexts = [], beams = [];
let spawnQueue = [], spawnTimer = 0, spawnInterval = 1500;
let speedMult = 1, timeMs = 0;
let selectedType = "banger";
let ghostPos = null;
let attractTimer = 0;
let attractSkels = [];
let mousePos = { x: DW / 2, y: DH / 2 };
const KEYS = new Set();

/* ----------------------------------------------------------------------
   DOM refs & helpers
---------------------------------------------------------------------- */
const $ = id => document.getElementById(id);
const els = {
  status: $("hud-status"), lives: $("stat-lives"), bones: $("stat-bones"),
  wave: $("stat-wave"), waves: $("stat-waves"), cue: $("hud-cue"),
  controls: $("controls"), startwave: $("btn-startwave"),
  speed: $("btn-speed"), mute: $("btn-mute"), pauseBtn: $("btn-pause"),
  attract: $("overlay-attract"), pause: $("overlay-pause"),
  over: $("overlay-over"), win: $("overlay-win"),
  overStats: $("over-stats"), winStats: $("win-stats"), live: $("live")
};
els.waves.textContent = String(WAVES.length);

function live(msg) { els.live.textContent = msg; }
function show(el, on) { el.classList.toggle("show", !!on); }

function showCue(text, ms) {
  if (!text) { els.cue.textContent = ""; els.cue.classList.remove("show"); return; }
  els.cue.textContent = text;
  els.cue.classList.add("show");
  if (!ms) return;
  clearTimeout(showCue._t);
  showCue._t = setTimeout(() => { els.cue.classList.remove("show"); els.cue.textContent = ""; }, ms);
}

function syncHud() {
  els.lives.textContent = String(Math.max(0, Math.floor(lives)));
  els.bones.textContent = String(Math.floor(bones));
  els.wave.textContent = String(Math.min(WAVES.length, waveIdx + 1));
  updateStartBtn();
  const playing = mode === "playing";
  show(els.status, playing);
  show(els.pauseBtn, playing && !paused);
  show(els.controls, playing);
}

function updateStartBtn() {
  if (phase === "build") {
    els.startwave.textContent = "START WAVE " + Math.min(WAVES.length, waveIdx + 1);
    els.startwave.disabled = false;
  } else {
    const left = spawnQueue.length + enemies.length;
    els.startwave.textContent = "WAVE… " + left + " LEFT";
    els.startwave.disabled = true;
  }
}

function toggleSpeed() {
  speedMult = speedMult === 1 ? 2 : (speedMult === 2 ? 3 : 1);
  els.speed.textContent = speedMult + "x >";
  live("Speed " + speedMult + "x");
}
function toggleMute() {
  AudioSys.muted = !AudioSys.muted;
  els.mute.textContent = AudioSys.muted ? "SOUND OFF" : "SOUND ON";
  live(AudioSys.muted ? "Sound off" : "Sound on");
}

/* ----------------------------------------------------------------------
   Game flow
---------------------------------------------------------------------- */
function resetGameState() {
  lives = 20; bones = 60; kills = 0; score = 0; waveIdx = 0; bombsLeft = 3;
  enemies = []; projectiles = []; towers = []; particles = []; floatTexts = []; beams = [];
  spawnQueue = []; spawnTimer = 0; spawnInterval = 1500;
  phase = "build"; paused = false; speedMult = 1; shake = 0;
  selectedType = "banger"; ghostPos = null;
  attractSkels = [];
  els.speed.textContent = "1x >";
}

function startGame() {
  AudioSys.init();
  resetGameState();
  mode = "playing";
  show(els.attract, false); show(els.over, false);
  show(els.win, false); show(els.pause, false);
  syncHud();
  showCue("BUILD YOUR DEFENSE, THEN START WAVE 1");
  live("Bony Facade started. Place towers, then start wave 1.");
}

function setMode(newMode) { mode = newMode; }

function quitToAttract() {
  resetGameState();
  setMode("attract");
  attractTimer = 0;
  show(els.pause, false); show(els.over, false); show(els.win, false);
  show(els.attract, true);
  showCue(null);
  syncHud();
  live("Attract screen. Bony Facade. Press start to defend the house.");
}

function togglePause() {
  if (mode !== "playing") return;
  paused = !paused;
  show(els.pause, paused);
  syncHud();
  live(paused ? "Paused" : "Resumed");
}

function startNextWave() {
  if (mode !== "playing" || paused || phase !== "build") return;
  if (waveIdx >= WAVES.length) { endGameWin(); return; }
  const def = WAVES[waveIdx];
  spawnQueue = [];
  def.skels.forEach(group => {
    for (let i = 0; i < group.n; i++) spawnQueue.push(group.type);
  });
  spawnInterval = def.interval;
  spawnTimer = 0;
  phase = "wave";
  bombsLeft = 3;
  AudioSys.playWaveCue(waveIdx === WAVES.length - 1);
  const bossHere = def.skels.some(g => g.type === "boss");
  showCue(bossHere ? "FINAL WAVE — THE SKELE-BOSS RISES!" : "WAVE " + (waveIdx + 1) + " — THE BONES ARE COMING!", 2400);
  live("Wave " + (waveIdx + 1) + " started.");
  syncHud();
}

function endGameLose() {
  phase = "done";
  AudioSys.playDefeat();
  shake = 16;
  els.overStats.textContent =
    "The house held through wave " + Math.max(1, waveIdx + 1) + ". " +
    kills + " skeletons popped, score " + score + ".";
  show(els.over, true);
  showCue(null);
  live("Game over. The house fell. Press Enter to play again.");
}

function endGameWin() {
  phase = "done";
  AudioSys.playVictory();
  els.winStats.textContent =
    kills + " skeletons popped. Score " + score +
    " · House health left: " + Math.max(0, Math.floor(lives)) + " of 20.";
  show(els.win, true);
  showCue(null);
  live("Victory! Dawn breaks and the house still stands. Press Enter to play again.");
}

/* ----------------------------------------------------------------------
   Pathing & spawns — lawn → porch → turret → cone → chimney.
---------------------------------------------------------------------- */
function buildPath() {
  // One shared lathe path: entry points, waypoints, segments.
  return null;
}

// Each skeleton picks a window on spawn; its route is computed from the
// entry edge. Movement is waypoint-hopping toward that window.
function makeRoute(windowIdx, fromLeft) {
  const w = HOUSE.windows[windowIdx];
  const pts = [];
  if (fromLeft) {
    pts.push({ x: -34, y: HOUSE.lawnY });
    pts.push({ x: HOUSE.porch.x0 + 40, y: HOUSE.lawnY });
  } else {
    pts.push({ x: DW + 34, y: HOUSE.lawnY });
    pts.push({ x: HOUSE.porch.x1 - 40, y: HOUSE.lawnY });
  }
  pts.push({ x: w.x, y: HOUSE.porch.y + 18 });   // porch roof edge
  if (w.y < 250) pts.push({ x: w.x, y: w.y + 100 }); // climb up the facade
  pts.push({ x: w.x + w.w / 2, y: w.y + w.h / 2 });
  return pts;
}

function spawnEnemy(type) {
  const t = TYPES[type];
  const fromLeft = Math.random() < 0.5;
  const windowIdx = Math.floor(Math.random() * HOUSE.windows.length);
  const route = makeRoute(windowIdx, fromLeft);
  enemies.push({
    type, hp: t.hp, maxHp: t.hp,
    x: route[0].x, y: route[0].y,
    waypointIdx: 1, route,
    speed: t.speed, dmg: t.dmg, reward: t.reward,
    frame: Math.random() * 20,
    slowUntil: 0, slowFactor: 1,
    dead: false, reached: false,
    orbit: 0, whackCd: 0, whxed: false,
    knockX: 0, knockY: 0, knockUntil: 0,
    stack: 0, stackTimer: 0
  });
}

/* ----------------------------------------------------------------------
   Effects
---------------------------------------------------------------------- */
function spawnParticles(x, y, count, color, speedMax, life, size, gravity) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = speedMax * (0.3 + Math.random() * 0.9);
    particles.push({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - speedMax * 0.35,
      life: life * (0.6 + Math.random() * 0.7), maxLife: life,
      color, size: size * (0.6 + Math.random() * 0.9),
      gravity: gravity || 0, kind: "spark", rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 8
    });
  }
}

// When a skeleton pops it FALLS APART (photo payoff!): bone bits + a skull
// tumble to the lawn, then fade.
function explodeSkeleton(e) {
  const t = TYPES[e.type];
  const bits = e.type === "boss" ? 14 : 8;
  for (let i = 0; i < bits; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 90 + Math.random() * 120;
    particles.push({
      x: e.x + (Math.random() - 0.5) * 14,
      y: e.y + (Math.random() - 0.5) * 18,
      vx: Math.cos(a) * sp,
      vy: -(40 + Math.random() * 80),
      life: 1300, maxLife: 1300,
      color: t.stroke, size: 5 + Math.random() * 3,
      gravity: 420, kind: "bone", rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 12
    });
  }
  // The skull — biggest piece.
  particles.push({
    x: e.x, y: e.y - 14,
    vx: (Math.random() - 0.5) * 60, vy: -70,
    life: 1500, maxLife: 1500,
    color: t.stroke, size: 7.5 * (t.scale || 1),
    gravity: 420, kind: "skull", rot: 0,
    vr: (Math.random() - 0.5) * 9
  });
}

function addFloat(x, y, text, color) {
  floatTexts.push({ x, y, text, color: color || "#ffd23f", life: 1100, maxLife: 1100 });
}
function addBeam(x1, y1, x2, y2, color, width, life) {
  beams.push({ x1, y1, x2, y2, color, width, life, maxLife: life });
}

/* ----------------------------------------------------------------------
   Combat
---------------------------------------------------------------------- */
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }

function damageEnemy(e, dmg, opts) {
  if (e.dead || e.hp <= 0) return;
  opts = opts || {};
  e.hp -= dmg;
  // Firecracker / splash knockback shoves climbers down the facade.
  if (opts.knock) {
    e.knockX = (opts.knock && opts.kx !== undefined) ? opts.kx : (e.x - opts.sx) * 3.4;
    e.knockY = (opts.knock && opts.ky !== undefined) ? opts.ky : (e.y - opts.sy) * 3.4;
    e.knockUntil = timeMs + 200;
  }
  if (opts.slow) { e.slowUntil = timeMs + opts.slowDur; e.slowFactor = opts.slowFactor; }
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    kills++;
    bones += e.reward;
    score += e.type === "boss" ? 500 : 10;
    explodeSkeleton(e);
    spawnParticles(e.x, e.y, e.type === "boss" ? 26 : 8, "#f6f2e4", 110, 420, 2.6, 0);
    addFloat(e.x, e.y - 26, "+" + e.reward + " BONES", "#ffd23f");
    AudioSys.playPop();
    if (e.type === "boss") { shake = 14; AudioSys.playDestroy(); }
    syncHud();
  }
}

function explodeAt(p) {
  const ty = LAUNCHERS[p.type];
  // Splash — splash hits hurt everything in the radius, including through
  // the facade. Clusters split into 3 charges.
  if (p.cluster) {
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.52;
      const cx = p.x + Math.cos(a) * 26, cy = p.y + Math.sin(a) * 26;
      const rr = 38;
      for (const e of enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - cx, e.y - cy);
        if (d <= rr + 12) damageEnemy(e, Math.ceil(p.dmg * 0.45), { knock: true, sx: cx, sy: cy });
      }
      spawnParticles(cx, cy, 8, "#ffd23f", 130, 320, 2.6, 0);
    }
  } else if (p.splash > 0) {
    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d <= p.splash + 12) {
        damageEnemy(e, e === p.target ? p.dmg : Math.ceil(p.dmg * 0.55),
          { knock: true, sx: p.x, sy: p.y });
      }
    }
    if (p.target && !p.target.dead && Math.hypot(p.target.x - p.x, p.target.y - p.y) > p.splash + 12) {
      damageEnemy(p.target, p.dmg);
    }
  } else {
    if (p.target && !p.target.dead) {
      const hasFire = p.upgrades && p.upgrades.includes("firecracker");
      damageEnemy(p.target, p.dmg, { knock: hasFire, sx: p.x, sy: p.y });
      if (hasFire) spawnParticles(p.x, p.y, 10, "#ff9a3d", 120, 350, 2.4, 0);
    }
  }
  spawnParticles(p.x, p.y, ty.lob ? 6 : 5, ty.color, 110, 300, 2.2, 0);
  AudioSys.playHit();
}

/* ----------------------------------------------------------------------
   Towers & upgrades
---------------------------------------------------------------------- */
function slotAtPoint(p) {
  for (const s of SLOTS) {
    const tw = towers.find(t => t.slot === s);
    if (tw) continue;
    if (Math.hypot(p.x - s.x, p.y - s.y) <= 32) return s;
  }
  return null;
}
function towerAtPoint(p) {
  for (const t of towers) {
    if (Math.hypot(p.x - t.x, p.y - t.y) <= 30) return t;
  }
  return null;
}

function placeTower(slot, typeKey) {
  const ty = LAUNCHERS[typeKey];
  if (bones < ty.cost) {
    AudioSys.playDeny();
    addFloat(slot.x, slot.y - 34, "NEED " + ty.cost + " BONES", "#ff5d6c");
    showCue("NOT ENOUGH BONES FOR " + ty.name + " (" + ty.cost + ")", 1600);
    syncHud();
    return;
  }
  bones -= ty.cost;
  towers.push({
    type: typeKey, x: slot.x, y: slot.y, slot,
    cooldown: 0, barrelA: -Math.PI / 2,
    upgrades: [], target: null
  });
  AudioSys.playPlace();
  spawnParticles(slot.x, slot.y - 8, 10, "#ffd23f", 90, 320, 2, 0);
  addFloat(slot.x, slot.y - 34, ty.name, ty.color);
  syncHud();
}

function upgradeTower(tw, upKey) {
  const catalog = UPGRADES[tw.type];
  const up = catalog ? catalog[upKey] : null;
  if (!up) return;
  if (tw.upgrades.includes(upKey)) { showCue("ALREADY FITTED", 1200); return; }
  if (bones < up.cost) {
    AudioSys.playDeny();
    addFloat(tw.x, tw.y - 38, "NEED " + up.cost + " BONES", "#ff5d6c");
    showCue("NOT ENOUGH BONES FOR " + up.name, 1600);
    syncHud();
    return;
  }
  bones -= up.cost;
  tw.upgrades.push(upKey);
  AudioSys.playPlace();
  spawnParticles(tw.x, tw.y - 14, 14, "#66d9ff", 110, 380, 2.4, 0);
  addFloat(tw.x, tw.y - 38, up.name + "!", "#66d9ff");
  syncHud();
}

/* Update */
function update(dtMs) {
  const dt = dtMs / 1000;
  timeMs += dtMs;

  if (mode === "attract") { updateAttract(dtMs); return; }
  if (mode !== "playing" || paused) return;
  if (phase === "done") { updateFx(dtMs); return; }

  // Spawn
  if (phase === "wave" && spawnQueue.length) {
    spawnTimer += dtMs;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnEnemy(spawnQueue.shift());
      updateStartBtn();
    }
  }
  if (phase === "wave" && !spawnQueue.length && !enemies.length) {
    const def = WAVES[waveIdx];
    const bonus = def.bonus;
    bones += bonus;
    AudioSys.playWaveCue(true);
    score += bonus;
    if (waveIdx >= WAVES.length - 1) {
      updateFx(dtMs);
      endGameWin();
      syncHud();
      return;
    }
    showCue("WAVE CLEAR! +" + bonus + " BONUS BONES", 2200);
    waveIdx++;
    phase = "build";
    bombsLeft = 3;
    syncHud();
  }

  // Enemies — follow their route toward the window.
  const now = timeMs;
  for (const e of enemies) {
    if (e.dead) continue;
    e.frame += dtMs / 16;
    if (now > e.knockUntil) { e.knockX *= 0.85; e.knockY *= 0.85; }
    if (e.whackCd > 0) e.whackCd -= dtMs;
    let spd = e.speed;
    if (now < e.slowUntil) spd *= e.slowFactor;
    if (now < e.knockUntil) spd *= 0.35;

    const wp = e.route[e.waypointIdx];
    if (wp) {
      const dx = wp.x - e.x, dy = wp.y - e.y;
      const d = Math.hypot(dx, dy);
      const step = spd * dt;
      if (d <= step + 2) {
        e.x = wp.x; e.y = wp.y;
        e.waypointIdx++;
        if (e.waypointIdx >= e.route.length && !e.reached) {
          e.reached = true; e.dead = true; e.leak = true;
          onLeak(e);
        }
      } else {
        e.x += (dx / d) * step + e.knockX * dt;
        e.y += (dy / d) * step + e.knockY * dt;
      }
    }
  }
  enemies = enemies.filter(e => !e.dead);

  // Towers — target the skeleton furthest along its road, rotate, fire.
  for (const tw of towers) {
    const ty = LAUNCHERS[tw.type];
    tw.cooldown -= dtMs;
    let best = null, bestScore = -Infinity;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - tw.x, e.y - tw.y);
      if (d > ty.range) continue;
      const sc = e.waypointIdx * 1000 + (1 - (d / ty.range)) * 10;
      if (sc > bestScore) { bestScore = sc; best = e; }
    }
    tw.target = best;
    if (best) {
      const want = Math.atan2(best.y - tw.y, best.x - tw.x);
      let cur = tw.barrelA, diff = want - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      tw.barrelA = cur + diff * Math.min(1, dt * 8);
      if (Math.abs(diff) < 0.4 && tw.cooldown <= 0) {
        fireProjectile(tw, best);
        tw.cooldown = ty.cooldown;
      }
    }
  }

  // Projectiles — chase their foe; lobbed mortars arc with gravity.
  for (const p of projectiles) {
    const tgt = p.target;
    if (p.lob) {
      p.t += dt * (p.speed / 400);
      if (tgt && !tgt.dead) { p.tx = tgt.x; p.ty2 = tgt.y; }
      p.x = p.sx + (p.tx - p.sx) * Math.min(1, p.t);
      p.y = p.sy + (p.ty2 - p.sy) * Math.min(1, p.t) - Math.sin(Math.min(1, p.t) * Math.PI) * 90;
      if (p.t >= 1) { p.done = true; explodeAt(p); }
    } else {
      if (tgt && !tgt.dead) { p.tx = tgt.x; p.ty2 = tgt.y; }
      const dx = p.tx - p.x, dy = p.ty2 - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= step + 6) { p.x = p.tx; p.y = p.ty2; p.done = true; explodeAt(p); }
      else { p.x += (dx / d) * step; p.y += (dy / d) * step; }
    }
  }
  projectiles = projectiles.filter(p => !p.done);

  updateFx(dtMs);
  if (shake > 0) shake = Math.max(0, shake - dtMs * 0.02);
  updateStartBtn();
}

function onLeak(e) {
  lives -= e.dmg;
  shake = Math.max(shake, 8);
  AudioSys.playLeak();
  showCue("THE SKELETONS BREACH A WINDOW! -" + e.dmg + " HEART", 1500);
  spawnParticles(e.x, e.y, 14, "#ff5d6c", 130, 420, 2.6, 0);
  addFloat(e.x, e.y - 20, "-" + e.dmg + " HEART", "#ff5d6c");
  syncHud();
  if (lives <= 0) { endGameLose(); }
}

function updateFx(dtMs) {
  const dt = dtMs / 1000;
  for (const p of particles) {
    p.life -= dtMs;
    if (p.gravity) {
      p.vy += p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > HOUSE.lawnY + 30) {
        p.y = HOUSE.lawnY + 30;
        p.vy = -p.vy * 0.35;
        p.vx *= 0.8;
        if (Math.abs(p.vy) < 18) { p.vy = 0; p.vx *= 0.9; }
      }
    } else {
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }
  particles = particles.filter(p => p.life > 0);
  for (const f of floatTexts) { f.life -= dtMs; f.y -= dt * 26; }
  floatTexts = floatTexts.filter(f => f.life > 0);
  for (const b of beams) b.life -= dtMs;
  beams = beams.filter(b => b.life > 0);
}

function updateAttract(dtMs) {
  attractTimer += dtMs;
  if (attractSkels.length < 7 && Math.random() < dtMs / 700) {
    const w = HOUSE.windows[Math.floor(Math.random() * HOUSE.windows.length)];
    attractSkels.push({
      type: ["normal", "fast", "brute", "armored", "boss"][Math.floor(Math.random() * 5)],
      x: w.x + w.w / 2 + (Math.random() - 0.5) * 40,
      y: HOUSE.porch.y + 30,
      goalY: w.y + w.h / 2, speed: 26 + Math.random() * 20,
      frame: Math.random() * 30, alpha: 0
    });
  }
  for (const s of attractSkels) {
    s.alpha = Math.min(1, (s.alpha || 0) + dtMs / 900);
    if (s.y > s.goalY) s.y -= s.speed * (dtMs / 1000);
    else s.y = s.goalY + Math.sin(s.frame * 0.1) * 4;
    s.frame += dtMs / 16;
  }
  attractSkels = attractSkels.filter(s => s.y >= s.goalY - 30);
  updateFx(dtMs);
}

/* ----------------------------------------------------------------------
   Render — the Victorian house, turret, cone, porch, lawn & dusk sky.
---------------------------------------------------------------------- */
function roundRectPath(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

function drawSky(g) {
  const sky = g.createLinearGradient(0, 0, 0, DH);
  sky.addColorStop(0, "#1a2350");
  sky.addColorStop(0.55, "#2c3566");
  sky.addColorStop(0.78, "#4a3a63");
  sky.addColorStop(1, "#1b1030");
  g.fillStyle = sky;
  g.fillRect(0, 0, DW, DH);

  // Stars (subtle, twinkling)
  g.fillStyle = "#eef1ff";
  for (let i = 0; i < 42; i++) {
    const sx = (i * 173) % DW;
    const sy = (i * 97) % 300;
    g.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(timeMs / 900 + i));
    g.fillRect(sx, sy, 2, 2);
  }
  g.globalAlpha = 1;

  // Big Halloween moon
  const mx = 1055, my = 92;
  g.fillStyle = "#f6ecd2";
  g.beginPath(); g.arc(mx, my, 42, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(214, 196, 160, .8)";
  g.beginPath(); g.arc(mx - 12, my - 8, 8, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(mx + 14, my + 12, 6, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(mx + 6, my - 16, 5, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 0.16;
  g.fillStyle = "#f6ecd2";
  g.beginPath(); g.arc(mx, my, 58, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;

  // Distant rooftops & dead tree
  g.fillStyle = "#141a33";
  g.beginPath();
  g.moveTo(0, 690);
  g.lineTo(70, 620); g.lineTo(150, 660); g.lineTo(225, 600);
  g.lineTo(320, 650); g.lineTo(DW, 610); g.lineTo(DW, 690);
  g.lineTo(0, 690);
  g.closePath(); g.fill();
  g.strokeStyle = "#141a33"; g.lineWidth = 5; g.lineCap = "round";
  g.beginPath();
  g.moveTo(60, 690); g.lineTo(52, 600);
  g.moveTo(52, 630); g.lineTo(20, 600);
  g.moveTo(52, 620); g.lineTo(84, 592);
  g.stroke();
}

function drawHedge(g) {
  g.fillStyle = "#12220f";
  g.beginPath();
  g.arc(150, 700, 64, 0, Math.PI * 2);
  g.arc(250, 712, 50, 0, Math.PI * 2);
  g.arc(1000, 704, 70, 0, Math.PI * 2);
  g.arc(1100, 716, 52, 0, Math.PI * 2);
  g.fill();
}

function drawLawn(g) {
  const lawn = g.createLinearGradient(0, 600, 0, DH);
  lawn.addColorStop(0, "#224018");
  lawn.addColorStop(1, "#0c1a08");
  g.fillStyle = lawn;
  g.fillRect(0, 604, DW, DH - 604);

  // Scattered leaf specks
  g.fillStyle = "rgba(255, 210, 63, .14)";
  for (let i = 0; i < 26; i++) {
    const lx = (i * 211) % DW + Math.sin(timeMs / 1400 + i) * 4;
    g.fillRect(lx, 648 + (i * 47) % 120, 4, 2);
  }

  // Trick-or-treat path to the porch
  g.fillStyle = "rgba(220, 205, 180, .25)";
  g.beginPath();
  g.moveTo(560, 742); g.lineTo(640, 742);
  g.lineTo(620, 612); g.lineTo(580, 612);
  g.closePath(); g.fill();
}

function drawHouse(g) {
  // Porch floor + steps
  g.fillStyle = "#3b2c22";
  g.fillRect(HOUSE.porch.x0 - 16, 622, HOUSE.porch.x1 - HOUSE.porch.x0 + 32, 22);
  g.fillStyle = "#261b14";
  g.fillRect(480, 644, 240, 16);

  // Porch pillars
  g.fillStyle = "#cfc4ae";
  for (const px of [240, 400, 560, 720, 880, 960]) {
    g.fillRect(px, 420, 14, 182);
    g.fillRect(px - 2, 420, 18, 8);
  }

  // Facade wall
  const wall = g.createLinearGradient(0, 140, 0, 620);
  wall.addColorStop(0, "#2f3b55");
  wall.addColorStop(1, "#232c42");
  g.fillStyle = wall;
  g.fillRect(HOUSE.porch.x0 - 10, 150, HOUSE.porch.x1 - HOUSE.porch.x0 + 20, 472);

  // Side gable
  g.fillStyle = "#26314a";
  g.beginPath();
  g.moveTo(HOUSE.porch.x0 - 10, 150);
  g.lineTo(400, 84);
  g.lineTo(640, 150);
  g.closePath(); g.fill();

  // Porch roof
  g.fillStyle = "#1a1426";
  g.fillRect(HOUSE.porch.x0 - 26, HOUSE.porch.y, HOUSE.porch.x1 - HOUSE.porch.x0 + 52, 26);
  g.fillStyle = "rgba(246, 242, 228, .12)";
  g.fillRect(HOUSE.porch.x0 - 26, HOUSE.porch.y, HOUSE.porch.x1 - HOUSE.porch.x0 + 52, 4);

  drawWindows(g);
  drawTurret(g);

  // Front door + warm light
  g.fillStyle = "#31221a";
  roundRectPath(g, 568, 486, 64, 128, 4); g.fill();
  g.fillStyle = "#ffb84d";
  g.beginPath(); g.arc(600, 520, 7, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(255, 184, 77, .18)";
  g.beginPath(); g.arc(600, 520, 26, 0, Math.PI * 2); g.fill();

  // House health scourge — cracks grow as health drops.
  const dmgPct = 1 - Math.max(0, lives) / 20;
  if (dmgPct > 0.2) {
    g.strokeStyle = "rgba(10, 8, 14, .75)";
    g.lineWidth = 1.6; g.lineCap = "round";
    for (let i = 0; i < 12; i++) {
      if (i / 12 > dmgPct) break;
      const cx0 = 260 + (i * 67) % 650, cy0 = 200 + (i * 89) % 330;
      g.beginPath();
      g.moveTo(cx0, cy0);
      g.lineTo(cx0 + 8, cy0 + 20);
      g.lineTo(cx0 + 2, cy0 + 36);
      g.stroke();
    }
  }
}

function drawWindows(g) {
  const lit = Math.sin(timeMs / 400) > -0.4;
  for (const w of HOUSE.windows) {
    // Frame
    g.fillStyle = "#16203a";
    roundRectPath(g, w.x - 3, w.y - 3, w.w + 6, w.h + 6, 3); g.fill();
    // Lit glass
    const flick = 0.86 + 0.1 * Math.sin(timeMs / 300 + w.x);
    g.fillStyle = "rgba(255, 196, 96, " + (lit ? 0.92 * flick : 0.55) + ")";
    g.fillRect(w.x, w.y, w.w, w.h);
    // Shutter hints
    g.fillStyle = "rgba(0,0,0,.18)";
    g.fillRect(w.x - 8, w.y, 5, w.h);
    g.fillRect(w.x + w.w + 3, w.y, 5, w.h);
    // Mullions
    g.fillStyle = "#16203a";
    g.fillRect(w.x + w.w / 2 - 1.5, w.y, 3, w.h);
    g.fillRect(w.x, w.y + w.h / 2 - 1.5, w.w, 3);
  }
}

function drawTurret(g) {
  const tx0 = 716, tx1 = 916, ty0 = 132, ty1 = 396;
  // Cylindrical wall (shaded for curvature)
  const grad = g.createLinearGradient(tx0, 0, tx1, 0);
  grad.addColorStop(0, "#2c3a5c");
  grad.addColorStop(0.5, "#43548a");
  grad.addColorStop(1, "#232e4a");
  g.fillStyle = grad;
  g.fillRect(tx0, ty0, tx1 - tx0, ty1 - ty0);

  // Top brass ring
  g.fillStyle = "rgba(246, 236, 210, .35)";
  g.fillRect(tx0 - 4, ty0, tx1 - tx0 + 8, 10);

  // Turret windows (tall, like the photo)
  const tw = [
    { x: 742, y: 168, w: 34, h: 74 },
    { x: 800, y: 162, w: 36, h: 76 },
    { x: 858, y: 168, w: 34, h: 74 },
    { x: 800, y: 268, w: 38, h: 80 }
  ];
  for (const w of tw) {
    g.fillStyle = "#16203a";
    roundRectPath(g, w.x - 3, w.y - 3, w.w + 6, w.h + 6, 3); g.fill();
    const flick = 0.85 + 0.1 * Math.sin(timeMs / 380 + w.x);
    g.fillStyle = "rgba(255, 196, 96, " + (0.88 * flick) + ")";
    g.fillRect(w.x, w.y, w.w, w.h);
    g.fillStyle = "#16203a";
    g.fillRect(w.x + w.w / 2 - 1.5, w.y, 3, w.h);
    g.fillRect(w.x, w.y + w.h / 2 - 1.5, w.w, 3);
  }

  // Cone roof + finial
  g.fillStyle = "#161124";
  g.beginPath();
  g.moveTo(tx0 - 26, ty0 + 14);
  g.lineTo(HOUSE.apex.x, HOUSE.apex.y - 6);
  g.lineTo(tx1 + 26, ty0 + 14);
  g.closePath(); g.fill();
  g.strokeStyle = "rgba(246, 236, 210, .35)";
  g.lineWidth = 2; g.lineCap = "round";
  g.beginPath();
  g.moveTo(tx0 - 26, ty0 + 14); g.lineTo(tx1 + 26, ty0 + 14);
  g.stroke();
  g.fillStyle = "#2fae6e";
  g.beginPath(); g.arc(HOUSE.apex.x, HOUSE.apex.y - 10, 4, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#2fae6e"; g.lineWidth = 3;
  g.beginPath();
  g.moveTo(HOUSE.apex.x, HOUSE.apex.y - 6);
  g.lineTo(HOUSE.apex.x, HOUSE.apex.y - 20);
  g.stroke();
}


function drawTowerInto(g, tw) {
  const ty = LAUNCHERS[tw.type];
  const pulse = 1 + 0.05 * Math.sin(timeMs / 200 + tw.x);

  // Base mount
  g.fillStyle = "#101525";
  roundRectPath(g, tw.x - 17, tw.y - 6, 34, 22, 4); g.fill();
  g.strokeStyle = "rgba(238, 241, 255, .6)"; g.lineWidth = 1.4;
  roundRectPath(g, tw.x - 17, tw.y - 6, 34, 22, 4); g.stroke();

  // Jack-o'-lantern body
  g.fillStyle = ty.color;
  g.save();
  g.translate(tw.x, tw.y - 14);
  g.scale(pulse, pulse);
  g.beginPath(); g.arc(0, 0, 13, 0, Math.PI * 2); g.fill();
  g.restore();

  // Pumpkin ridges
  g.strokeStyle = "rgba(16, 19, 37, .5)"; g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(tw.x - 6, tw.y - 26); g.quadraticCurveTo(tw.x - 8, tw.y - 14, tw.x - 6, tw.y - 3);
  g.moveTo(tw.x + 6, tw.y - 26); g.quadraticCurveTo(tw.x + 8, tw.y - 14, tw.x + 6, tw.y - 3);
  g.stroke();

  // Stem
  g.strokeStyle = "#2fae6e"; g.lineWidth = 3;
  g.beginPath(); g.moveTo(tw.x, tw.y - 26); g.lineTo(tw.x + 2, tw.y - 31); g.stroke();

  // Face (eyes + grin)
  g.fillStyle = "#101325";
  g.beginPath();
  g.moveTo(tw.x - 8, tw.y - 18); g.lineTo(tw.x - 3, tw.y - 18); g.lineTo(tw.x - 5.5, tw.y - 13); g.closePath(); g.fill();
  g.beginPath();
  g.moveTo(tw.x + 3, tw.y - 18); g.lineTo(tw.x + 8, tw.y - 18); g.lineTo(tw.x + 5.5, tw.y - 13); g.closePath(); g.fill();
  g.beginPath();
  g.moveTo(tw.x - 8, tw.y - 8);
  g.quadraticCurveTo(tw.x, tw.y - 3, tw.x + 8, tw.y - 8);
  g.lineTo(tw.x + 8, tw.y - 5);
  g.quadraticCurveTo(tw.x, tw.y + 1, tw.x - 8, tw.y - 5);
  g.closePath(); g.fill();

  // Barrel follows the target
  g.strokeStyle = ty.color;
  g.lineWidth = tw.type === "mortar" ? 6 : 4;
  g.lineCap = "round";
  const bx = tw.x + Math.cos(tw.barrelA) * 17;
  const by = (tw.y - 14) + Math.sin(tw.barrelA) * 17;
  g.beginPath(); g.moveTo(tw.x, tw.y - 14); g.lineTo(bx, by); g.stroke();

  // Upgrade glyphs
  if (tw.upgrades.length) {
    g.fillStyle = "#66d9ff";
    g.font = "bold 11px monospace";
    g.textAlign = "center";
    g.fillText("✦".repeat(tw.upgrades.length), tw.x, tw.y + 30);
  }
}

function drawEnemyInto(g, e) {
  const frameIdx = Math.floor(e.frame / 2) % 4;
  const spr = getSkeletonSprite(e.type, frameIdx);
  const t = TYPES[e.type];
  const sc = t.scale || 1;
  g.save();
  g.globalAlpha = e.alpha === undefined ? 1 : e.alpha;
  g.drawImage(spr, e.x - 36 * sc, e.y - 36 * sc, 72 * sc, 72 * sc);

  // Slow tint
  if (timeMs < e.slowUntil) {
    g.globalAlpha = 0.35;
    g.fillStyle = "#66d9ff";
    g.beginPath(); g.arc(e.x, e.y, 18 * sc, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
  }
  g.restore();

  // HP bar (hidden at full health)
  if (e.hp < e.maxHp && !e.dead) {
    const w = 32 * sc, pct = Math.max(0, e.hp / e.maxHp);
    g.fillStyle = "rgba(10, 8, 16, .75)";
    g.fillRect(e.x - w / 2, e.y - 40 * sc, w, 5);
    g.fillStyle = pct > 0.45 ? "#2fae6e" : (pct > 0.22 ? "#ffd23f" : "#ff5d6c");
    g.fillRect(e.x - w / 2 + 0.5, e.y - 40 * sc + 0.5, (w - 1) * pct, 4);
  }
}

function drawRangeRing(g, p, range, valid) {
  g.fillStyle = "rgba(102, 217, 255, .08)";
  g.strokeStyle = valid ? "rgba(102, 217, 255, .55)" : "rgba(255, 93, 108, .6)";
  g.lineWidth = 1.5;
  g.beginPath(); g.arc(p.x, p.y, range, 0, Math.PI * 2); g.fill(); g.stroke();
}

function drawParticle(p) {
  const a = Math.max(0, p.life / p.maxLife);
  ctx.save();
  ctx.globalAlpha = p.kind === "spark" ? a : Math.min(1, a * 1.6);
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot || 0);
  if (p.kind === "bone") {
    // Little bone: shaft with two knobs at each end.
    ctx.strokeStyle = p.color;
    ctx.fillStyle = p.color;
    ctx.lineWidth = p.size * 0.5;
    ctx.lineCap = "round";
    const L = p.size * 1.8;
    ctx.beginPath();
    ctx.moveTo(-L / 2, 0); ctx.lineTo(L / 2, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-L / 2, -p.size * 0.35, p.size * 0.42, 0, Math.PI * 2);
    ctx.arc(-L / 2, p.size * 0.35, p.size * 0.42, 0, Math.PI * 2);
    ctx.arc(L / 2, -p.size * 0.35, p.size * 0.42, 0, Math.PI * 2);
    ctx.arc(L / 2, p.size * 0.35, p.size * 0.42, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.kind === "skull") {
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-p.size * 0.55, p.size * 0.45, p.size * 1.1, p.size * 0.55);
    ctx.fillStyle = "#0b0f1f";
    ctx.beginPath();
    ctx.arc(-p.size * 0.36, -p.size * 0.08, p.size * 0.2, 0, Math.PI * 2);
    ctx.arc(p.size * 0.36, -p.size * 0.08, p.size * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(0, 0, p.size * a + 0.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawProjectile(p) {
  const col = p.type === "mortar" ? "#ff5d6c" : (LAUNCHERS[p.type] ? LAUNCHERS[p.type].color : "#eef1ff");
  ctx.fillStyle = col;
  ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
  ctx.fillStyle = "rgba(255, 240, 200, .85)";
  ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
}

function drawUI() {
  ctx.fillStyle = "rgba(7, 10, 20, .82)";
  ctx.fillRect(0, 0, DW, TOP_H);
  ctx.strokeStyle = "rgba(246, 242, 228, .4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, TOP_H); ctx.lineTo(DW, TOP_H); ctx.stroke();

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "bold 22px monospace";
  ctx.fillStyle = "#f6f2e4";
  ctx.fillText("BONY FACADE", 16, 22);

  ctx.font = "13px monospace";
  ctx.fillStyle = "#ffd23f";
  ctx.fillText("WAVE " + Math.min(WAVES.length, waveIdx + 1) + " / " + WAVES.length, 16, 48);

  // HUD: bones, lives, bombs.
  ctx.textAlign = "right";
  ctx.font = "bold 18px monospace";
  ctx.fillStyle = "#f6f2e4";
  ctx.fillText(bones + " BONES", 660, 32);
  ctx.fillStyle = "#ff5d6c";
  ctx.fillText("HEART " + Math.max(0, Math.floor(lives)), 830, 32);
  ctx.fillStyle = "#ff9a3d";
  ctx.fillText("BOMB x" + Math.max(0, bombsLeft), 990, 32);
  ctx.fillStyle = "#66d9ff";
  ctx.fillText("SCORE " + score, 1184, 32);

  // Tower shop (top-right buttons).
  let sx = 640;
  ctx.textAlign = "left";
  for (const key of Object.keys(LAUNCHERS)) {
    const ty = LAUNCHERS[key];
    const x = sx, y = 8, w = 176, h = 48;
    const active = selectedType === key;
    const afford = bones >= ty.cost;
    ctx.fillStyle = active ? "rgba(255, 210, 63, .28)" : "rgba(22, 28, 52, .9)";
    roundRectPath(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = active ? "#ffd23f" : (afford ? "rgba(238, 241, 255, .5)" : "rgba(238, 241, 255, .22)");
    ctx.lineWidth = active ? 2 : 1.2;
    roundRectPath(ctx, x, y, w, h, 8); ctx.stroke();
    ctx.fillStyle = ty.color;
    ctx.beginPath(); ctx.arc(x + 20, y + 24, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = afford ? "#eef1ff" : "rgba(238, 241, 255, .55)";
    ctx.font = "bold 13px monospace";
    ctx.fillText(ty.key + " " + ty.name, x + 38, y + 19);
    ctx.font = "12px monospace";
    ctx.fillStyle = afford ? "#ffd23f" : "rgba(255, 93, 108, .8)";
    ctx.fillText(ty.cost + " BONES", x + 38, y + 37);
    sx += w + 10;
  }
}


/* Shop hit rects (design coords), mirror of the layout in drawUI. */
function shopHitAt(p) {
  let sx = 640;
  for (const key of Object.keys(LAUNCHERS)) {
    const w = 176;
    if (p.x >= sx - 4 && p.x <= sx + w + 4 && p.y >= 4 && p.y <= 58) return key;
    sx += w + 10;
  }
  return null;
}

/* The ghost tower that follows the mouse, plus the range ring. */
function drawGhost() {
  if (!ghostPos) return;
  const slot = slotAtPoint(ghostPos);
  const ty = LAUNCHERS[selectedType];
  ctx.save();
  ctx.globalAlpha = 0.72;
  drawRangeRing(ctx, ghostPos, ty.range, !!slot);
  drawTowerInto(ctx, {
    type: selectedType, x: ghostPos.x, y: ghostPos.y,
    slot: slot || null, cooldown: 0,
    barrelA: -Math.PI / 2, upgrades: [], target: null
  });
  ctx.restore();
  if (!slot) {
    ctx.fillStyle = "rgba(255, 93, 108, .9)";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PLACE ON A GLOWING SPOT", ghostPos.x, ghostPos.y + 30);
  }
}

function drawBuildSlots() {
  for (const s of SLOTS) {
    if (towers.some(t => t.slot === s)) continue;
    const hover = (ghostPos && Math.hypot(ghostPos.x - s.x, ghostPos.y - s.y) <= 30)
      || (mousePos && Math.hypot(mousePos.x - s.x, mousePos.y - s.y) <= 30);
    ctx.save();
    ctx.globalAlpha = hover ? 0.9 : 0.5 + 0.18 * Math.sin(timeMs / 320 + s.x);
    ctx.strokeStyle = hover ? "#ffd23f" : "#66d9ff";
    ctx.lineWidth = hover ? 2.4 : 1.8;
    ctx.beginPath(); ctx.arc(s.x, s.y, hover ? 20 : 16, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = hover ? "rgba(255, 210, 63, .25)" : "rgba(102, 217, 255, .12)";
    ctx.beginPath(); ctx.arc(s.x, s.y, hover ? 20 : 16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  drawGhost();
}

function drawSlotsHint() {
  if (phase !== "build") return;
  ctx.save();
  ctx.fillStyle = "rgba(7, 10, 20, .55)";
  roundRectPath(ctx, DW / 2 - 320, DH - 76, 640, 34, 8); ctx.fill();
  ctx.fillStyle = "#eef1ff";
  ctx.font = "13px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("1/2/3 pick launcher · click a glowing spot to place · click a launcher for upgrades", DW / 2, DH - 59);
  ctx.restore();
}

function draw() {
  resize();
  ctx.setTransform(dpr * viewScale, 0, 0, dpr * viewScale,
    dpr * viewOX + (Math.random() - 0.5) * shake,
    dpr * viewOY + (Math.random() - 0.5) * shake);
  ctx.clearRect(0, 0, DW, DH);

  drawSky(ctx);
  drawLawn(ctx);
  drawHedge(ctx);
  drawHouse(ctx);

  // Attract-mode demo climbers (animated scene behind the panel).
  if (mode === "attract") {
    for (const s of attractSkels) {
      ctx.save();
      ctx.globalAlpha = s.alpha * 0.9;
      drawSkeletonInto(ctx, s.x, s.y, TYPES[s.type], s.frame, 1);
      ctx.restore();
    }
  }

  // Towers
  for (const tw of towers) drawTowerInto(ctx, tw);
  if (mode === "playing") drawBuildSlots();

  // Enemies (sorted low-to-high so higher ones overlap correctly)
  const sorted = enemies.slice().sort((a, b) => a.y - b.y);
  for (const e of sorted) drawEnemyInto(ctx, e);

  // Projectiles & beams
  for (const p of projectiles) drawProjectile(p);
  for (const b of beams) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, b.life / b.maxLife);
    ctx.strokeStyle = b.color;
    ctx.lineWidth = b.width;
    ctx.lineCap = "round";
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      const mx = (b.x1 + b.x2) / 2 + (Math.random() - 0.5) * 10;
      const my = (b.y1 + b.y2) / 2 + (Math.random() - 0.5) * 10;
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(mx, my);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Particles (bone bits, skulls, sparks)
  for (const p of particles) drawParticle(p);

  // Floating texts
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const f of floatTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }

  if (mode === "playing") { drawUI(); drawSlotsHint(); }
}

function fireProjectile(tw, target) {
  const ty = LAUNCHERS[tw.type];
  if (ty.zap) {
    // Instant lightning. Chains to a second skeleton with the upgrade.
    damageEnemy(target, ty.dmg);
    addBeam(tw.x, tw.y - 8, target.x, target.y, "#66d9ff", 2.5, 130);
    AudioSys.playShoot("lightning");
    const both = (UPGRADES[tw.type] && UPGRADES[tw.type].lightning && tw.upgrades.includes("lightning"))
      || tw.upgrades.includes("lightning");
    if (both) {
      let best = null, bd = 120 * 120;
      for (const e of enemies) {
        if (e === target || e.dead) continue;
        const d = dist2(target.x, target.y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (best) {
        damageEnemy(best, Math.ceil(ty.dmg * 0.6));
        addBeam(target.x, target.y, best.x, best.y, "#66d9ff", 1.8, 120);
      }
    }
  } else {
    projectiles.push({
      x: tw.x, y: tw.y - 10, target,
      sx: tw.x, sy: tw.y - 10,
      tx: target.x, ty2: target.y,
      speed: ty.speed, dmg: ty.dmg, type: tw.type,
      splash: ty.splash, tower: tw,
      cluster: tw.upgrades.includes("cluster"),
      lob: !!ty.lob, t: 0,
      upgrades: tw.upgrades
    });
    AudioSys.playShoot(tw.type);
  }
}

/* ----------------------------------------------------------------------
   Player actions & input
---------------------------------------------------------------------- */
function skeletonAtPoint(p) {
  // Nearest live skeleton whose body (or skull) is under the point.
  let best = null, bd = 34 * 34;
  for (const e of enemies) {
    if (e.dead) continue;
    const d = dist2(p.x, p.y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function fireBombAtPoint(p) {
  if (mode !== "playing" || paused || phase !== "wave") return false;
  if (bombsLeft <= 0) {
    showCue("NO PUMPKIN BOMBS LEFT THIS WAVE", 1300);
    AudioSys.playDeny();
    return false;
  }
  bombsLeft--;
  AudioSys.playBombArm();
  // Bomb lands a beat later at the clicked point (small radius pop).
  setTimeout(() => {
    if (mode !== "playing") return;
    const R = 46;
    let hitAny = false;
    for (const e of enemies.slice()) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d <= R + 14) {
        hitAny = true;
        damageEnemy(e, 12, { knock: true, sx: p.x, sy: p.y });
      }
    }
    spawnParticles(p.x, p.y, hitAny ? 16 : 10, "#ff9a3d", 160, 380, 2.8, 0);
    addBeam(p.x, p.y - 4, p.x, p.y + 4, "#ff9a3d", 5, 110);
    AudioSys.playPop();
    if (hitAny) AudioSys.playHit();
  }, 90);
  syncHud();
  return true;
}

function handleCanvasClick(p) {
  if (!inBounds(p)) return;

  const shopKey = shopHitAt(p);
  if (shopKey) { selectedType = shopKey; AudioSys.playPlace(); return; }

  const tw = towerAtPoint(p);
  if (tw) {
    const ups = UPGRADES[tw.type] || {};
    const keys = Object.keys(ups);
    if (keys.length) {
      const upKey = keys[0];
      if (tw.upgrades.includes(upKey)) { showCue(tw.type.toUpperCase() + " ALREADY HAS " + ups[upKey].name, 1400); }
      else upgradeTower(tw, upKey);
    } else {
      showCue(LAUNCHERS[tw.type].name, 900);
    }
    return;
  }

  const slot = slotAtPoint(p);
  if (slot) { placeTower(slot, selectedType); return; }

  // Clicking a skeleton mid-wave fires a Pumpkin Bomb.
  if (phase === "wave" && skeletonAtPoint(p)) { fireBombAtPoint(p); }
}

canvas.addEventListener("pointerdown", evt => {
  AudioSys.init();
  if (mode !== "playing") return;
  const p = toGame(evt.clientX, evt.clientY);
  handleCanvasClick(p);
});

canvas.addEventListener("pointermove", evt => {
  const p = toGame(evt.clientX, evt.clientY);
  mousePos = p;
  ghostPos = (mode === "playing" && inBounds(p)) ? p : null;
});

document.addEventListener("keydown", evt => {
  const k = evt.key.toLowerCase();
  KEYS.add(k);

  if (k === "m") { toggleMute(); return; }

  const overOpen = els.over.classList.contains("show");
  const winOpen = els.win.classList.contains("show");
  const attractOpen = els.attract.classList.contains("show");

  if (k === "escape") {
    if (mode === "playing") togglePause();
    else if (attractOpen) { /* stay */ }
    return;
  }

  if ((k === "enter" || k === " ") && mode === "attract") {
    evt.preventDefault();
    startGame();
    return;
  }
  if ((k === "enter" || k === " ") && (overOpen || winOpen)) {
    evt.preventDefault();
    startGame();
    return;
  }
  if (k === " " && mode === "playing" && !paused) {
    evt.preventDefault();
    if (phase === "wave") fireBombAtPoint(mousePos);
    return;
  }
  if (k === "enter" && mode === "playing" && !paused && phase === "build") {
    startNextWave();
    return;
  }
  if (k === "1" || k === "2" || k === "3") {
    for (const key of Object.keys(LAUNCHERS)) {
      if (LAUNCHERS[key].key === k) { selectedType = key; AudioSys.playPlace(); break; }
    }
  }
});

document.addEventListener("keyup", evt => KEYS.delete(evt.key.toLowerCase()));

/* Buttons */
$("btn-start").addEventListener("click", startGame);
els.startwave.addEventListener("click", startNextWave);
els.speed.addEventListener("click", toggleSpeed);
els.mute.addEventListener("click", toggleMute);
els.pauseBtn.addEventListener("click", togglePause);
$("btn-resume").addEventListener("click", togglePause);
$("btn-restart-pause").addEventListener("click", startGame);
$("btn-quit-pause").addEventListener("click", quitToAttract);
$("btn-retry").addEventListener("click", startGame);
$("btn-quit-over").addEventListener("click", quitToAttract);
$("btn-win-again").addEventListener("click", startGame);
$("btn-quit-win").addEventListener("click", quitToAttract);

/* ----------------------------------------------------------------------
   Main loop
---------------------------------------------------------------------- */
let lastTs = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const dtMs = Math.min(50, lastTs ? (ts - lastTs) : 16);
  lastTs = ts;
  const steps = mode === "playing" && !paused ? speedMult : 1;
  for (let i = 0; i < steps; i++) update(dtMs);
  draw();
}
resetGameState();
syncHud();
requestAnimationFrame(loop);








