"use strict";

// ---- game state, input, simulation ----
const cv = document.getElementById("game");
const ctx = cv.getContext("2d");
let VW = 1, VH = 1, DPR = 1, TS = 48;
const SAFE = { t: 0, r: 0, b: 0, l: 0 };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
function turnTo(a, b, k) { return a - angDiff(a, b) * Math.min(1, k); }

const MAX_DRONES = 10;
const HI_KEY = "resistance-is-tidy:hi";

const WEAPON = {
  A: { n: 1, col: "#ffd35a" },
  B: { n: 2, col: "#ff6a4a" },
  C: { n: 3, col: "#c48bff" },
  D: { n: 0, col: "#6dff9a" },
};

const CREW = {
  ensign: { name: "ENSIGN", hp: 30, col: "#e2b53c", trim: "#7a5a0c", weapon: "A", dmg: 7, rate: 1.25, spd: 1.5, run: 3.0, assim: 0.9, score: 100, armed: true, pref: 5.5, dr: { hp: 45, melee: 8 } },
  security: { name: "SECURITY", hp: 65, col: "#c8413f", trim: "#5c1717", weapon: "B", dmg: 9, rate: 0.6, spd: 1.6, run: 3.2, assim: 1.2, score: 200, armed: true, pref: 5, dr: { hp: 80, melee: 7, ranged: 9, rate: 0.75 } },
  medic: { name: "MEDIC", hp: 30, col: "#38c6bd", trim: "#0d6660", spd: 1.4, run: 3.3, assim: 0.8, score: 150, armed: false, medic: true, dr: { hp: 40, melee: 5, heal: true } },
  scientist: { name: "SCIENTIST", hp: 24, col: "#5f8dff", trim: "#22409a", spd: 1.3, run: 3.4, assim: 0.7, score: 150, armed: false, dr: { hp: 35, melee: 5, sci: true } },
  officer: { name: "OFFICER", hp: 110, col: "#efe3c2", trim: "#c9922a", weapon: "C", dmg: 12, rate: 1.3, spd: 1.5, run: 2.8, assim: 1.8, score: 500, armed: true, pref: 5.5, dr: { hp: 120, melee: 12, ranged: 14, rate: 1 } },
  captain: { name: "CAPTAIN", hp: 170, col: "#2c46b5", trim: "#f2c14e", weapon: "C", dmg: 14, rate: 1.0, spd: 1.5, run: 2.9, assim: 2.6, score: 2500, armed: true, pref: 5, big: 1.22, dr: { hp: 220, melee: 16, ranged: 18, rate: 0.85 } },
};

const KEYS = [
  { id: "coil", name: "WARP COIL", short: "COIL", col: "#ff8a3d" },
  { id: "crystal", name: "DEFLECTOR CRYSTAL", short: "CRYSTAL", col: "#5fe3ff" },
  { id: "core", name: "ISOLINEAR CORE", short: "CORE", col: "#7dff8a" },
  { id: "injector", name: "PLASMA INJECTOR", short: "INJECTOR", col: "#ff5c7a" },
  { id: "array", name: "SENSOR ARRAY", short: "ARRAY", col: "#8aa4ff" },
];

const ROOM_CREW = {
  QUARTERS: ["ensign", "ensign", "scientist"], MESS: ["ensign", "ensign", "medic", "ensign"],
  LAB: ["scientist", "scientist", "ensign"], SICKBAY: ["medic", "medic", "scientist"],
  ARMORY: ["security", "security", "security"], CARGO: ["ensign", "security"], HALL: ["ensign", "security"],
  ENGINE: ["ensign", "security", "ensign"], BRIDGE: ["officer", "officer", "security", "ensign"], TRANSPORTER: [],
};

const G = {
  mode: "attract", t: 0, modeT: 0, deckIdx: 0, lives: 3, score: 0, hi: 0, runSeed: 1, deckStartScore: 0, deckStartTidy: 0,
  m: null, p: null, crew: [], drones: [], bolts: [], parts: [], floats: [], items: [], log: [],
  alert: 0, alertPos: null, reinT: 6, reinCount: 0, shake: 0, flash: 0, hurt: 0, stamp: 0,
  cam: { x: 0, y: 0 }, ox: 0, oy: 0, hs: 1, tidy: 0, assimCount: 0, silentCount: 0, quota: 0, initialCrew: 0,
  captain: null, conduit: { x: 0, y: 0 }, online: false, deckT: 0, stats: {}, cand: null, hintT: 0, demoT: 0,
  keyTaken: 0, keyTotal: 0, prompt: "", bot: { t: 0, tgt: null, scanT: 6, idle: 0 },
};

// ---------- input ----------
const keys = new Set(), pressed = new Set();
const mouse = { x: 0, y: 0, moved: -1e9, down: false };
const touch = { on: false, stick: null, assim: false, scanEdge: false, ids: {} };
let padPrevScan = false;

addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)) e.preventDefault();
  if (!keys.has(e.code)) pressed.add(e.code);
  keys.add(e.code);
  Sfx.init();
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => { keys.clear(); mouse.down = false; if (G.mode === "play") setMode("paused"); });
addEventListener("contextmenu", (e) => e.preventDefault());

function touchBtns() {
  const hs = G.hs;
  return {
    assim: { x: VW - SAFE.r - 84 * hs, y: VH - SAFE.b - 96 * hs, r: 52 * hs },
    scan: { x: VW - SAFE.r - 190 * hs, y: VH - SAFE.b - 60 * hs, r: 36 * hs },
  };
}

cv.addEventListener("pointerdown", (e) => {
  Sfx.init();
  mouse.x = e.clientX; mouse.y = e.clientY;
  pressed.add("Click");
  if (e.pointerType === "touch") {
    touch.on = true;
    const b = touchBtns();
    const hit = (o) => Math.hypot(e.clientX - o.x, e.clientY - o.y) < o.r * 1.25;
    if (hit(b.assim)) { touch.ids[e.pointerId] = "assim"; touch.assim = true; }
    else if (hit(b.scan)) { touch.ids[e.pointerId] = "scan"; touch.scanEdge = true; }
    else if (e.clientX < VW * 0.55 && !touch.stick) { touch.ids[e.pointerId] = "stick"; touch.stick = { ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY }; }
  } else if (e.button === 2) pressed.add("RMB");
  else { mouse.down = true; mouse.moved = performance.now(); }
});
cv.addEventListener("pointermove", (e) => {
  mouse.x = e.clientX; mouse.y = e.clientY;
  if (e.pointerType !== "touch") mouse.moved = performance.now();
  else if (touch.ids[e.pointerId] === "stick" && touch.stick) { touch.stick.x = e.clientX; touch.stick.y = e.clientY; }
});
const pointerEnd = (e) => {
  if (e.pointerType !== "touch") { if (e.button === 0) mouse.down = false; return; }
  const role = touch.ids[e.pointerId];
  if (role === "stick") touch.stick = null;
  if (role === "assim") touch.assim = false;
  delete touch.ids[e.pointerId];
};
cv.addEventListener("pointerup", pointerEnd);
cv.addEventListener("pointercancel", pointerEnd);

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = window.innerWidth; VH = window.innerHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
  TS = clamp(Math.min(VW / 26, VH / 14.5), 22, 84);
  G.hs = clamp(Math.min(VW / 1280, VH / 720), 0.62, 1.5);
  const cs = getComputedStyle(document.getElementById("safe"));
  SAFE.t = parseFloat(cs.paddingTop) || 0; SAFE.r = parseFloat(cs.paddingRight) || 0;
  SAFE.b = parseFloat(cs.paddingBottom) || 0; SAFE.l = parseFloat(cs.paddingLeft) || 0;
  buildOverlays();
}
addEventListener("resize", resize);

function playerInput() {
  let mx = 0, my = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) my -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) my += 1;
  let assim = keys.has("Space") || mouse.down || touch.assim;
  let scan = pressed.has("KeyQ") || pressed.has("KeyE") || pressed.has("RMB") || touch.scanEdge;
  const pad = navigator.getGamepads ? navigator.getGamepads()[0] : null;
  if (pad) {
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    if (Math.hypot(ax, ay) > 0.2) { mx += ax; my += ay; }
    if (pad.buttons[0] && pad.buttons[0].pressed) assim = true;
    const s = !!((pad.buttons[2] && pad.buttons[2].pressed) || (pad.buttons[1] && pad.buttons[1].pressed));
    if (s && !padPrevScan) scan = true;
    padPrevScan = s;
  }
  if (touch.stick) {
    const r = 55 * G.hs;
    mx += clamp((touch.stick.x - touch.stick.ox) / r, -1, 1);
    my += clamp((touch.stick.y - touch.stick.oy) / r, -1, 1);
  }
  touch.scanEdge = false;
  let aim = null;
  if (!touch.on && performance.now() - mouse.moved < 2500) {
    aim = Math.atan2(mouse.y - (G.oy + G.p.y * TS), mouse.x - (G.ox + G.p.x * TS));
  }
  return { mx, my, aim, assim, scan };
}

// ---------- helpers ----------
function logMsg(text, col) { G.log.unshift({ t: G.t, text, col: col || "#7dffa8" }); if (G.log.length > 6) G.log.pop(); }
function floatText(x, y, text, col, size) { G.floats.push({ x, y, text, col, size: size || 1, life: 1.4, max: 1.4 }); }
function burst(x, y, n, col, spd, life, size) {
  for (let i = 0; i < n && G.parts.length < 700; i++) {
    const a = Math.random() * TAU, s = spd * rand(0.3, 1);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * rand(0.6, 1), max: life, col, size: size || 0.05 });
  }
}
function setMode(mode) {
  G.mode = mode; G.modeT = 0;
  document.body.dataset.ui = mode === "attract" || mode === "paused" || mode === "gameover" || mode === "victory" ? "menu" : "play";
}
function moveBy(e, dx, dy, r) {
  const m = G.m;
  if (!collides(m, e.x + dx, e.y, r)) e.x += dx;
  if (!collides(m, e.x, e.y + dy, r)) e.y += dy;
}
const visAt = (x, y) => G.m.vis[Math.floor(y) * G.m.W + Math.floor(x)] === G.stamp;
const spotXY = (m, idx) => ({ x: (idx % m.W) + 0.5, y: ((idx / m.W) | 0) + 0.5 });

// ---------- deck setup ----------
function makeCables() {
  const anchors = [[-0.16, -0.3], [-0.2, -0.15], [-0.22, 0], [-0.2, 0.15], [-0.16, 0.3], [-0.05, -0.4], [-0.05, 0.4]];
  return anchors.map((a, i) => ({ ax: a[0], ay: a[1], ph: i * 1.7, pts: Array.from({ length: 8 }, () => ({ x: 0, y: 0 })) }));
}

function newPlayer(x, y) {
  const p = {
    x, y, vx: 0, vy: 0, r: 0.32, ang: 0, hp: 100, max: 100, hurtT: 0, chan: null, scanCD: 3, scanT: 0, scanAge: 99,
    adapt: { A: 0, B: 0, C: 0 }, adaptTier: { A: 0, B: 0, C: 0 }, walk: 0, god: false, dead: false, cables: makeCables(),
    path: null, pi: 0, rp: 0, tub: 0,
  };
  for (const c of p.cables) for (const q of c.pts) { q.x = x; q.y = y; }
  return p;
}

function makeCrew(kind, x, y, room) {
  const d = CREW[kind];
  return {
    k: kind, d, x, y, r: 0.3 * (d.big || 1), ang: rand(0, TAU), hp: d.hp, state: "patrol", aware: 0, anim: rand(0, 6),
    path: null, pi: 0, rp: 0, wp: null, idle: rand(0, 2), fireCD: rand(0.5, 1.5), home: room, strafe: Math.random() < 0.5 ? 1 : -1,
    downT: 0, held: 0, silent: false, lastSeen: null, lostT: 0, tgt: null, tgtT: Math.random() * 0.25, flash: 0, look: 0,
    invT: 0, fleeT: 0, fleeGoal: null, rpF: 0, medT: Math.random(), rv: null, revT: 0, dur: d.assim, dead: false,
    skin: pick(["#f0c8a0", "#d9a07a", "#a9714f", "#7a4b34", "#e8d2b8", "#b9d3a8"]),
    hair: pick(["#2a1c14", "#5a3b22", "#111", "#b89a4a", "#7a2c1c", "#c9c9c9"]),
    fall: rand(0, TAU), alarmed: false, prev: "patrol",
  };
}

function makeDrone(c) {
  const dr = c.d.dr;
  return {
    k: c.k, d: c.d, dr, x: c.x, y: c.y, r: 0.3 * (c.d.big || 1), ang: c.ang, hp: dr.hp, max: dr.hp, cd: rand(0, 1), tgt: null,
    scanT: 0, path: null, pi: 0, rp: 0, anim: rand(0, 6), spawn: 1, flash: 0, dead: false,
  };
}

function initDeck(idx, opts) {
  opts = opts || {};
  const seed = opts.seed != null ? opts.seed : G.runSeed * 31 + idx * 7919 + 13;
  const m = generateDeck(idx, seed);
  const rng = m.rng, cfg = m.cfg;
  const rpick = (arr) => arr[(rng() * arr.length) | 0];
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  G.m = m; G.deckIdx = idx;
  const sr = m.rooms[m.startRoom];
  G.p = newPlayer(sr.cx + 1, sr.cy + 1);
  Object.assign(G, { crew: [], drones: [], bolts: [], parts: [], floats: [], items: [], log: [], alert: 0, alertPos: null, reinT: 8, reinCount: 0, shake: 0, flash: 0, hurt: 0, assimCount: 0, silentCount: 0, deckT: 0, online: false, captain: null, keyTaken: 0, hintT: 0, cand: null });

  let pool = [];
  for (const rm of m.rooms) for (let k of ROOM_CREW[rm.type]) {
    if (idx === 0 && k === "officer") k = "security";
    if (k === "ensign" && rm.type === "ENGINE" && idx >= 1) k = "officer";
    if (k === "ensign" && idx >= 2 && rng() < 0.3) k = "security";
    pool.push([k, rm]);
  }
  shuffle(pool);
  pool = pool.slice(0, cfg.crew);
  const roomsAvail = m.rooms.filter((r) => r.id !== m.startRoom);
  while (pool.length < cfg.crew) pool.push([rng() < 0.6 ? "ensign" : "security", rpick(roomsAvail)]);
  for (const [k, rm] of pool) {
    const s = spotXY(m, rpick(rm.spots));
    G.crew.push(makeCrew(k, s.x, s.y, rm));
  }
  if (m.bridgeRoom >= 0) {
    const br = m.rooms[m.bridgeRoom];
    G.captain = makeCrew("captain", br.cx + 1, br.y0 + 1.5, br);
    G.crew.push(G.captain);
  }
  G.initialCrew = G.crew.length;
  G.quota = Math.ceil(G.initialCrew * 0.55);

  const ex = m.rooms[m.exitRoom];
  G.conduit = { x: ex.cx + 1, y: ex.cy + 1 };

  const withSpots = shuffle(roomsAvail.filter((r) => r.itemSpots.length > 0));
  const ks = shuffle(KEYS.slice()).slice(0, cfg.keys);
  ks.forEach((kd, i) => {
    const rm = withSpots[i % withSpots.length], s = spotXY(m, rpick(rm.itemSpots));
    G.items.push({ type: "key", def: kd, x: s.x, y: s.y, taken: false, ph: rng() * 6 });
  });
  G.keyTotal = ks.length;
  const extras = [["cell", 3], ["clip", 4]];
  for (const [type, n] of extras) {
    for (let i = 0; i < n; i++) {
      const rm = rpick(withSpots), s = spotXY(m, rpick(rm.itemSpots));
      G.items.push({ type, x: s.x, y: s.y, taken: false, ph: rng() * 6 });
    }
  }
  G.cam.x = G.p.x; G.cam.y = G.p.y;
  G.stamp++;
  computeVis(m, G.p.x, G.p.y, 13.5, G.stamp);
}

function objDone() {
  return G.keyTaken >= G.keyTotal && G.assimCount >= G.quota && (!G.captain || G.captain.assimilated);
}

// ---------- flow ----------
function enterAttract() {
  G.runSeed = (Math.random() * 1e6) | 0;
  initDeck(1, { seed: (Math.random() * 1e6) | 0 });
  G.p.god = true;
  G.bot = { t: 0, tgt: null, scanT: 5, idle: 0 };
  G.demoT = 0;
  setMode("attract");
}

function startRun() {
  Sfx.init();
  G.runSeed = (Math.random() * 1e6) | 0;
  G.score = 0; G.tidy = 0; G.lives = 3;
  G.deckStartScore = 0; G.deckStartTidy = 0;
  initDeck(0);
  setMode("briefing");
  Sfx.voice("Resistance is futile.");
}

function retryDeck() {
  G.score = G.deckStartScore; G.tidy = G.deckStartTidy;
  initDeck(G.deckIdx);
  setMode("briefing");
}

function nextDeck() {
  if (G.deckIdx >= DECKS.length - 1) { finishRun(true); return; }
  G.deckStartScore = G.score; G.deckStartTidy = G.tidy;
  initDeck(G.deckIdx + 1);
  setMode("briefing");
  Sfx.voice("Proceed to the next deck.");
}

function finishRun(won) {
  if (G.score > G.hi) { G.hi = G.score; try { localStorage.setItem(HI_KEY, String(G.hi)); } catch (e) { /* storage blocked */ } }
  setMode(won ? "victory" : "gameover");
  if (won) Sfx.voice("Efficiency achieved.");
}

function deckClear() {
  let conv = 0, tot = 0;
  const m = G.m;
  for (let i = 0; i < m.tiles.length; i++) if (m.tiles[i] === 1 || m.tiles[i] === 2) { tot++; if (m.conv[i] > 0.4) conv++; }
  const pct = tot ? conv / tot : 0;
  const bonus = Math.max(0, Math.round(3000 - G.deckT * 8)) + Math.round(pct * 2000);
  G.score += bonus;
  G.stats = { assim: G.assimCount, total: G.initialCrew, silent: G.silentCount, time: G.deckT, conv: pct, bonus, drones: G.drones.length };
  Sfx.warp();
  setMode("clear");
}

function killPlayer() {
  const p = G.p;
  p.dead = true; p.hp = 0;
  if (p.chan) releaseTarget();
  Sfx.channel(null); Sfx.death();
  burst(p.x, p.y, 60, "#6dff9a", 6, 1.2, 0.07);
  G.shake = 1.6;
  setMode("dying");
}

function handleMenus() {
  const confirm = pressed.has("Enter") || pressed.has("Space") || pressed.has("Click");
  if (pressed.has("KeyM")) Sfx.toggleMute();
  if (pressed.has("KeyF") && document.fullscreenEnabled) {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
  }
  switch (G.mode) {
    case "attract": if (confirm && (G.modeT > 0.3)) startRun(); break;
    case "briefing": if ((confirm && G.modeT > 0.5) || G.modeT > 14) { setMode("play"); Sfx.blip(); } break;
    case "play": if (pressed.has("Escape") || pressed.has("KeyP")) setMode("paused"); break;
    case "paused": if (pressed.has("Escape") || pressed.has("KeyP") || pressed.has("Click")) setMode("play"); break;
    case "clear": if (confirm && G.modeT > 0.8) nextDeck(); break;
    case "dead": if (confirm && G.modeT > 0.6) retryDeck(); break;
    case "gameover": case "victory": if (confirm && G.modeT > 1.2) { enterAttract(); } break;
  }
}

// ---------- assimilation ----------
function findTarget() {
  const p = G.p;
  let best = null, bs = 1e9;
  for (const c of G.crew) {
    if (c.dead || c.state === "held") continue;
    const dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy);
    if (d > 1.55) continue;
    if (d > 0.85 && Math.abs(angDiff(Math.atan2(dy, dx), p.ang)) > 1.05) continue;
    if (!los(G.m, p.x, p.y, c.x, c.y)) continue;
    const s = d - (c.state === "down" ? 0.4 : 0);
    if (s < bs) { bs = s; best = c; }
  }
  return best;
}

function beginAssimilation(c) {
  const p = G.p;
  const wasDown = c.state === "down";
  c.prev = c.state;
  c.silent = !wasDown && c.aware < 0.5 && (c.state === "patrol" || c.state === "investigate" || c.state === "revive");
  c.dur = c.d.assim * (wasDown ? 0.25 : c.silent ? 0.55 : 1);
  c.state = "held"; c.held = 0;
  p.chan = c;
  if (!c.silent && !wasDown) noise(c.x, c.y, 11);
  Sfx.thud();
}

function releaseTarget() {
  const p = G.p, c = p.chan;
  if (c) {
    c.state = c.prev === "down" ? "down" : "combat";
    if (c.state === "combat" && !c.d.armed) c.state = "flee";
    c.held = 0; c.aware = 1;
    if (c.state !== "down") raiseAlert();
  }
  p.chan = null;
  Sfx.channel(null);
}

function finishAssimilation(c) {
  const p = G.p;
  c.dead = true; c.assimilated = true; p.chan = null;
  Sfx.channel(null); Sfx.assim();
  const mult = 1 + 0.1 * G.tidy;
  const pts = Math.round(c.d.score * (c.silent ? 1.5 : 1) * mult);
  G.score += pts; G.assimCount++;
  if (c.silent) G.silentCount++;
  if (G.drones.length < MAX_DRONES) G.drones.push(makeDrone(c));
  p.hp = Math.min(p.max, p.hp + (G.drones.length >= MAX_DRONES ? 20 : 8));
  convertArea(G.m, c.x, c.y, 3.4, 0.9);
  burst(c.x, c.y, 34, "#6dff9a", 4.5, 0.9, 0.06);
  floatText(c.x, c.y - 0.6, "+" + pts + (c.silent ? " SILENT" : ""), "#7dffa8");
  logMsg(c.d.name + " ASSIMILATED" + (c.silent ? " - SILENT" : ""));
  G.flash = 0.3; G.shake = Math.max(G.shake, 0.5);
  if (c.k === "captain") { logMsg("THE CAPTAIN IS ONE OF US", "#ffe27a"); Sfx.voice("The captain has joined the collective."); }
}

function noise(x, y, r) {
  for (const c of G.crew) {
    if (c.dead || c.state === "down" || c.state === "held" || c.state === "combat" || c.state === "flee") continue;
    if (Math.hypot(c.x - x, c.y - y) < r) setInvestigate(c, x, y, 0.45);
  }
}

function setInvestigate(c, x, y, aware) {
  c.state = "investigate"; c.inv = { x, y }; c.path = null; c.invT = 12; c.look = 0;
  if (aware) c.aware = Math.max(c.aware, aware);
}

function raiseAlert() {
  const p = G.p;
  if (G.alert <= 0) { logMsg("RED ALERT - INTRUDER ON BOARD", "#ff6a5a"); Sfx.alarm(); }
  G.alert = Math.max(G.alert, 16);
  G.alertPos = { x: p.x, y: p.y };
}

function enterCombat(c) {
  c.state = c.d.armed ? "combat" : "flee";
  c.lostT = 0; c.aware = 1; c.fleeT = 5; c.path = null;
  if (!c.alarmed) { c.alarmed = true; floatText(c.x, c.y - 0.8, "!", "#ff4a3a", 1.4); Sfx.spot(); }
  raiseAlert();
}

// ---------- damage ----------
function hurtPlayer(dmg, type) {
  const p = G.p;
  if (p.dead) return;
  const eff = dmg * (1 - p.adapt[type]);
  if (!p.god) p.hp -= eff;
  p.adapt[type] = Math.min(0.8, p.adapt[type] + 0.1);
  const tier = Math.floor(p.adapt[type] / 0.3);
  if (tier > p.adaptTier[type]) {
    p.adaptTier[type] = tier;
    logMsg("ADAPTED TO TYPE-" + WEAPON[type].n + " PHASERS: -" + Math.round(p.adapt[type] * 100) + "% DAMAGE", "#9dd6ff");
  }
  p.hurtT = 3; G.hurt = 0.35; G.shake = Math.max(G.shake, 0.35);
  burst(p.x, p.y, 6, "#ff7a4a", 3, 0.3);
  floatText(p.x, p.y - 0.5, "-" + Math.round(eff), "#ff8a70");
  Sfx.hit();
  if (p.god && p.hp < 50) p.hp = p.max;
  if (p.hp <= 0 && G.mode === "play") killPlayer();
}

function hurtDrone(d, dmg) {
  if (d.dead) return;
  d.hp -= dmg; d.flash = 0.12;
  burst(d.x, d.y, 4, "#6dff9a", 2, 0.3);
  if (d.hp <= 0) { d.dead = true; burst(d.x, d.y, 24, "#6dff9a", 4, 0.8); logMsg("DRONE LOST", "#ffb08a"); }
}

function downCrew(c) {
  if (c === G.p.chan) { G.p.chan = null; Sfx.channel(null); }
  c.state = "down"; c.downT = 10; c.hp = 0; c.path = null;
  floatText(c.x, c.y - 0.5, "DOWN", "#ffe27a");
}

function hurtCrew(c, dmg, src) {
  if (c.dead || c.state === "down" || c.state === "held") return;
  c.hp -= dmg; c.flash = 0.12;
  burst(c.x, c.y, 4, "#ffd0a0", 2, 0.3);
  if (c.hp <= 0) { downCrew(c); return; }
  if (c.state !== "combat" && c.state !== "flee") { if (src && src !== G.p) c.tgt = src; enterCombat(c); }
}

function shoot(x, y, ang, speed, dmg, type, owner, src) {
  G.bolts.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, dmg, type, owner, src, life: 2.2, col: WEAPON[type].col });
}

// ---------- movement helpers ----------
function goTo(e, tx, ty, spd, dt) {
  const m = G.m;
  let gx = tx, gy = ty;
  e.rp -= dt;
  if (!walkLine(m, e.x, e.y, tx, ty, e.r)) {
    if (e.rp <= 0 || !e.path) {
      e.path = findPath(m, Math.floor(e.x), Math.floor(e.y), Math.floor(tx), Math.floor(ty));
      e.pi = 0; e.rp = 0.5 + Math.random() * 0.3;
    }
    if (e.path) {
      while (e.pi < e.path.length - 1 && Math.hypot(e.path[e.pi].x - e.x, e.path[e.pi].y - e.y) < 0.35) e.pi++;
      gx = e.path[e.pi].x; gy = e.path[e.pi].y;
    }
  } else e.path = null;
  const dx = gx - e.x, dy = gy - e.y, d = Math.hypot(dx, dy);
  if (d > 0.02) {
    moveBy(e, (dx / d) * spd * dt, (dy / d) * spd * dt, e.r);
    e.ang = turnTo(e.ang, Math.atan2(dy, dx), dt * 8);
  }
  return Math.hypot(tx - e.x, ty - e.y);
}

function pickWaypoint(c) {
  const m = G.m;
  let rm = c.home;
  if (Math.random() < 0.25 && rm.links.length) rm = m.rooms[pick(rm.links)];
  if (!rm.spots.length) return { x: c.x, y: c.y };
  return spotXY(m, pick(rm.spots));
}

function chooseTarget(c, sees) {
  if (sees) return G.p;
  let best = null, bd = 9;
  for (const d of G.drones) {
    if (d.dead) continue;
    const dd = Math.hypot(d.x - c.x, d.y - c.y);
    if (dd < bd && los(G.m, c.x, c.y, d.x, d.y)) { bd = dd; best = d; }
  }
  return best;
}

// ---------- crew AI ----------
function updateCrew(c, dt) {
  const p = G.p, m = G.m;
  c.anim += dt; c.flash = Math.max(0, c.flash - dt);
  if (c.state === "down") {
    c.downT -= dt;
    if (c.downT <= 0) { c.hp = c.d.hp * 0.45; setInvestigate(c, p.x, p.y, 0.5); }
    return;
  }
  if (c.state === "held") return;
  c.fireCD -= dt;

  const dx = p.x - c.x, dy = p.y - c.y, dP = Math.hypot(dx, dy);
  const engaged = c.state === "combat" || c.state === "flee";
  let sees = false;
  if (!p.dead && dP < (G.alert > 0 ? 13 : 10) && los(m, c.x, c.y, p.x, p.y)) {
    if (engaged || dP < 2.2 || (G.alert > 0 && dP < 8) || Math.abs(angDiff(Math.atan2(dy, dx), c.ang)) < 1.15) sees = true;
  }
  if (sees) {
    c.aware = Math.min(1, c.aware + dt * (dP < 3 ? 3 : dP < 6 ? 1.6 : 0.9) * (G.alert > 0 ? 2 : 1));
    c.lastSeen = { x: p.x, y: p.y };
    if (c.aware >= 1 && !engaged) enterCombat(c);
    if (c.state === "combat" || c.state === "flee") { G.alert = Math.max(G.alert, 14); G.alertPos = { x: p.x, y: p.y }; }
  } else c.aware = Math.max(0, c.aware - dt * 0.3);

  c.tgtT -= dt;
  if (c.tgtT <= 0) {
    c.tgtT = 0.25;
    c.tgt = chooseTarget(c, sees);
    if (c.tgt && c.tgt !== p && !engaged) enterCombat(c);
  }

  switch (c.state) {
    case "patrol": {
      if (G.alert > 0 && G.alertPos) { setInvestigate(c, G.alertPos.x, G.alertPos.y, 0); break; }
      if (c.d.medic) {
        c.medT -= dt;
        if (c.medT <= 0) {
          c.medT = 1;
          let best = null, bd = 18;
          for (const o of G.crew) {
            if (o.dead || o.state !== "down") continue;
            const d = Math.hypot(o.x - c.x, o.y - c.y);
            if (d < bd) { bd = d; best = o; }
          }
          if (best) { c.state = "revive"; c.rv = best; c.revT = 0; c.path = null; break; }
        }
      }
      if (!c.wp) {
        if (c.idle > 0) { c.idle -= dt; c.ang += Math.sin(c.anim * 1.3) * dt * 0.6; break; }
        c.wp = pickWaypoint(c); c.path = null; c.patT = 14;
      }
      c.patT -= dt;
      const d = goTo(c, c.wp.x, c.wp.y, c.d.spd, dt);
      if (d < 0.5 || c.patT <= 0) { c.wp = null; c.idle = rand(1, 3.5); }
      break;
    }
    case "investigate": {
      c.invT -= dt;
      if (c.look > 0) {
        c.look -= dt; c.ang += Math.sin(c.anim * 2.2) * dt * 1.6;
        if (c.look <= 0) { c.state = "patrol"; c.wp = null; }
        break;
      }
      const d = goTo(c, c.inv.x, c.inv.y, c.d.spd * 1.5, dt);
      if (d < 0.7) c.look = 1.8;
      else if (c.invT <= 0) { c.state = "patrol"; c.wp = null; }
      break;
    }
    case "revive": {
      const o = c.rv;
      if (!o || o.dead || o.state !== "down") { c.state = "patrol"; c.wp = null; break; }
      goTo(c, o.x, o.y, c.d.run * 0.8, dt);
      if (Math.hypot(o.x - c.x, o.y - c.y) < 1.05) {
        c.revT += dt;
        if (Math.random() < dt * 14) G.parts.push({ x: o.x, y: o.y, vx: rand(-0.4, 0.4), vy: -rand(0.5, 1.2), life: 0.6, max: 0.6, col: "#7ff3ff", size: 0.05 });
        if (c.revT > 1.6) {
          o.hp = o.d.hp * 0.5; setInvestigate(o, p.x, p.y, 0.6);
          floatText(o.x, o.y - 0.6, "REVIVED", "#7ff3ff");
          c.state = "patrol"; c.wp = null;
        }
      }
      break;
    }
    case "flee": {
      c.rpF -= dt; c.fleeT -= dt;
      if (sees) c.fleeT = 4;
      if (!c.fleeGoal || c.rpF <= 0) {
        let best = null, bd = -1;
        for (let i = 0; i < 5; i++) {
          const rm = pick(m.rooms), d = Math.hypot(rm.cx - p.x, rm.cy - p.y);
          if (d > bd) { bd = d; best = rm; }
        }
        c.fleeGoal = { x: best.cx + 1, y: best.cy + 1 }; c.rpF = 3;
      }
      goTo(c, c.fleeGoal.x, c.fleeGoal.y, c.d.run, dt);
      if (!sees && c.fleeT <= 0) { c.state = "patrol"; c.wp = null; c.fleeGoal = null; }
      break;
    }
    case "combat": {
      const t = c.tgt;
      if (t) {
        const tx = t.x - c.x, ty = t.y - c.y, d = Math.hypot(tx, ty), a = Math.atan2(ty, tx);
        c.ang = turnTo(c.ang, a, dt * 9); c.lostT = 0;
        const pref = c.d.pref;
        if (d > pref + 1.2) goTo(c, t.x, t.y, c.d.run, dt);
        else if (d < pref - 1.8) moveBy(c, -Math.cos(a) * c.d.spd * dt * 1.4, -Math.sin(a) * c.d.spd * dt * 1.4, c.r);
        else {
          moveBy(c, -Math.sin(a) * c.strafe * 1.3 * dt, Math.cos(a) * c.strafe * 1.3 * dt, c.r);
          if (Math.random() < dt * 0.5) c.strafe *= -1;
        }
        if (c.fireCD <= 0 && Math.abs(angDiff(a, c.ang)) < 0.25 && d < 12) crewFire(c, a);
      } else {
        c.lostT += dt;
        if (c.lastSeen) goTo(c, c.lastSeen.x, c.lastSeen.y, c.d.run * 0.8, dt);
        if (c.lostT > 3) { const ls = c.lastSeen || { x: c.x, y: c.y }; setInvestigate(c, ls.x, ls.y, 0.4); }
      }
      break;
    }
  }
}

function crewFire(c, a) {
  const d = c.d, diff = 1 + G.deckIdx * 0.12;
  c.fireCD = (d.rate * rand(1, 1.4)) / (0.9 + G.deckIdx * 0.08);
  const ox = c.x + Math.cos(a) * 0.45, oy = c.y + Math.sin(a) * 0.45;
  if (d.weapon === "C") for (let k = -1; k <= 1; k++) shoot(ox, oy, a + k * 0.15 + rand(-0.03, 0.03), 7.5, d.dmg * diff, "C", "crew", c);
  else shoot(ox, oy, a + rand(-0.08, 0.08), 8, d.dmg * diff, d.weapon, "crew", c);
  Sfx.phaser(d.weapon);
}

// ---------- drones ----------
function updateDrone(d, dt) {
  const p = G.p, m = G.m;
  d.anim += dt; d.flash = Math.max(0, d.flash - dt); d.spawn = Math.max(0, d.spawn - dt * 2.5); d.cd -= dt;
  d.scanT -= dt;
  if (d.scanT <= 0) {
    d.scanT = 0.2 + Math.random() * 0.1;
    let best = null, bd = 9;
    for (const c of G.crew) {
      if (c.dead || c.state === "down" || c.state === "held") continue;
      const dd = Math.hypot(c.x - d.x, c.y - d.y);
      if (dd < bd && los(m, d.x, d.y, c.x, c.y)) { bd = dd; best = c; }
    }
    d.tgt = best;
  }
  if (d.tgt && (d.tgt.dead || d.tgt.state === "down" || d.tgt.state === "held")) d.tgt = null;
  const t = d.tgt;
  if (t) {
    const dx = t.x - d.x, dy = t.y - d.y, dist = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    if (d.dr.ranged) {
      d.ang = turnTo(d.ang, a, dt * 9);
      if (dist > 5) goTo(d, t.x, t.y, 2.8, dt);
      else if (dist < 2.8) moveBy(d, -Math.cos(a) * 2 * dt, -Math.sin(a) * 2 * dt, d.r);
      if (d.cd <= 0 && dist < 9 && Math.abs(angDiff(a, d.ang)) < 0.3) {
        d.cd = d.dr.rate * rand(1, 1.3);
        shoot(d.x + Math.cos(a) * 0.4, d.y + Math.sin(a) * 0.4, a, 9, d.dr.ranged, "D", "drone", d);
        Sfx.dronePulse();
      }
    } else {
      goTo(d, t.x, t.y, 3.0, dt);
      if (dist < 0.95 && d.cd <= 0) { d.cd = 0.7; hurtCrew(t, d.dr.melee, d); d.ang = a; burst(t.x, t.y, 5, "#9dffb8", 3, 0.3); }
    }
  } else {
    const idx = G.drones.indexOf(d), n = G.drones.length;
    const ang = p.ang + Math.PI + (idx - (n - 1) / 2) * 0.55;
    const rad = 1.7 + (idx % 3) * 0.7;
    const tx = p.x + Math.cos(ang) * rad, ty = p.y + Math.sin(ang) * rad;
    if (Math.hypot(tx - d.x, ty - d.y) > 0.5) goTo(d, tx, ty, 3.4, dt);
    else d.ang = turnTo(d.ang, p.ang, dt * 4);
  }
  if (d.dr.heal && !p.dead && Math.hypot(p.x - d.x, p.y - d.y) < 4) p.hp = Math.min(p.max, p.hp + 2.5 * dt);
  convertArea(m, d.x, d.y, 1.1, dt * 0.35);
}

// ---------- player ----------
function doScan() {
  const p = G.p, m = G.m;
  p.scanCD = 12; p.scanT = 5; p.scanAge = 0;
  Sfx.scan();
  const R = 24, x0 = Math.max(0, Math.floor(p.x - R)), x1 = Math.min(m.W - 1, Math.ceil(p.x + R));
  const y0 = Math.max(0, Math.floor(p.y - R)), y1 = Math.min(m.H - 1, Math.ceil(p.y + R));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * m.W + x;
    if (Math.hypot(x - p.x, y - p.y) < R && (m.tiles[i] !== 0 || m.wallVis[i])) m.seen[i] = 1;
  }
}

function updatePlayer(dt, inp) {
  const p = G.p;
  if (p.dead) { p.vx = p.vy = 0; return; }
  let mx = inp.mx, my = inp.my;
  const ml = Math.hypot(mx, my);
  if (ml > 1) { mx /= ml; my /= ml; }
  const spd = 3.3 * (p.chan ? 0.35 : 1), k = 1 - Math.exp(-dt * 12);
  p.vx += (mx * spd - p.vx) * k; p.vy += (my * spd - p.vy) * k;
  moveBy(p, p.vx * dt, p.vy * dt, p.r);
  p.walk += Math.hypot(p.vx, p.vy) * dt;
  if (inp.aim != null) p.ang = turnTo(p.ang, inp.aim, dt * 14);
  else if (ml > 0.15) p.ang = turnTo(p.ang, Math.atan2(my, mx), dt * 10);

  const sci = G.drones.filter((d) => d.dr.sci).length;
  p.scanCD = Math.max(0, p.scanCD - dt * (1 + 0.35 * sci));
  p.scanT = Math.max(0, p.scanT - dt); p.scanAge += dt;
  if (inp.scan && p.scanCD <= 0) doScan();

  if (p.hurtT > 0) p.hurtT -= dt; else p.hp = Math.min(p.max, p.hp + 3 * dt);
  for (const t of ["A", "B", "C"]) p.adapt[t] = Math.max(0, p.adapt[t] - dt * 0.01);

  // channel
  if (p.chan) {
    const c = p.chan, d = Math.hypot(c.x - p.x, c.y - p.y);
    if (!inp.assim || c.state !== "held" || d > 2.1) releaseTarget();
    else {
      const tx = p.x + Math.cos(p.ang) * 0.85, ty = p.y + Math.sin(p.ang) * 0.85;
      if (!collides(G.m, tx, ty, c.r)) { c.x += (tx - c.x) * Math.min(1, dt * 10); c.y += (ty - c.y) * Math.min(1, dt * 10); }
      c.ang = turnTo(c.ang, p.ang + Math.PI, dt * 8);
      c.held += dt / c.dur;
      Sfx.channel(c.held);
      p.tub += dt;
      if (Math.random() < dt * 40) burst(c.x, c.y, 1, "#6dff9a", 2, 0.4);
      if (c.held >= 1) finishAssimilation(c);
    }
    G.cand = null;
  } else {
    G.cand = findTarget();
    if (inp.assim && G.cand) beginAssimilation(G.cand);
  }
}

function updateCables(dt) {
  const p = G.p, ca = Math.cos(p.ang), sa = Math.sin(p.ang);
  const amp = 0.55 / (1 + G.tidy * 0.9), L = 0.17;
  for (const c of p.cables) {
    const a0 = c.pts[0];
    a0.x = p.x + ca * c.ax - sa * c.ay; a0.y = p.y + sa * c.ax + ca * c.ay;
    for (let i = 1; i < c.pts.length; i++) {
      const a = c.pts[i - 1], b = c.pts[i];
      const wob = Math.sin(G.t * 2.1 + c.ph + i * 0.8) * amp * 0.09 * i;
      const tx = a.x - ca * L - sa * wob, ty = a.y - sa * L + ca * wob;
      const k = Math.min(1, dt * (9 - i * 0.6));
      b.x += (tx - b.x) * k; b.y += (ty - b.y) * k;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      b.x = a.x + (dx / d) * L; b.y = a.y + (dy / d) * L;
    }
  }
}

// ---------- world update ----------
function updateDoors(dt) {
  const m = G.m, ents = [G.p];
  for (const c of G.crew) if (!c.dead) ents.push(c);
  for (const d of G.drones) ents.push(d);
  const k = Math.min(1, dt * 7);
  for (const i of m.doors) {
    const dx = (i % m.W) + 0.5, dy = ((i / m.W) | 0) + 0.5;
    let near = 0;
    for (const e of ents) if (Math.abs(e.x - dx) < 1.5 && Math.abs(e.y - dy) < 1.5) { near = 1; break; }
    m.doorOpen[i] += (near - m.doorOpen[i]) * k;
  }
}

function separate() {
  const all = [G.p];
  for (const c of G.crew) if (!c.dead && c.state !== "down" && c.state !== "held") all.push(c);
  for (const d of G.drones) all.push(d);
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = 0.55;
      if (d >= min || d < 0.001) continue;
      const push = (min - d) * 0.5, nx = dx / d, ny = dy / d;
      const wa = a === G.p ? 0.2 : 1, wb = b === G.p ? 0.2 : 1;
      moveBy(a, -nx * push * wa, -ny * push * wa, a.r);
      moveBy(b, nx * push * wb, ny * push * wb, b.r);
    }
  }
}

function updateBolts(dt) {
  const m = G.m, p = G.p;
  for (const b of G.bolts) {
    b.life -= dt;
    for (let s = 0; s < 2 && b.life > 0; s++) {
      b.x += (b.vx * dt) / 2; b.y += (b.vy * dt) / 2;
      const tx = Math.floor(b.x), ty = Math.floor(b.y), t = tileAtM(m, tx, ty);
      if (blocksShot(t) || (t === 3 && m.doorOpen[ty * m.W + tx] < 0.5)) { b.life = 0; burst(b.x, b.y, 3, b.col, 2, 0.25); break; }
      if (b.owner === "crew") {
        if (!p.dead && Math.hypot(p.x - b.x, p.y - b.y) < 0.42) { hurtPlayer(b.dmg, b.type); b.life = 0; break; }
        let hit = false;
        for (const d of G.drones) if (!d.dead && Math.hypot(d.x - b.x, d.y - b.y) < 0.4) { hurtDrone(d, b.dmg); hit = true; break; }
        if (hit) { b.life = 0; break; }
      } else {
        let hit = false;
        for (const c of G.crew) {
          if (c.dead || c.state === "down" || c.state === "held") continue;
          if (Math.hypot(c.x - b.x, c.y - b.y) < 0.4) { hurtCrew(c, b.dmg, b.src); hit = true; break; }
        }
        if (hit) { b.life = 0; break; }
      }
    }
  }
  G.bolts = G.bolts.filter((b) => b.life > 0);
}

function updateFx(dt) {
  for (const q of G.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - dt * 2.2; q.vy *= 1 - dt * 2.2; q.life -= dt; }
  G.parts = G.parts.filter((q) => q.life > 0);
  for (const f of G.floats) { f.life -= dt; f.y -= dt * 0.6; }
  G.floats = G.floats.filter((f) => f.life > 0);
  G.shake *= Math.exp(-dt * 6); G.flash = Math.max(0, G.flash - dt * 1.5); G.hurt = Math.max(0, G.hurt - dt * 1.2);
}

function collectItems() {
  const p = G.p;
  for (const it of G.items) {
    if (it.taken || Math.hypot(it.x - p.x, it.y - p.y) > 0.75) continue;
    if (it.type === "cell" && p.hp >= p.max) continue;
    it.taken = true;
    burst(it.x, it.y, 16, it.type === "key" ? it.def.col : "#9dffb8", 3, 0.6);
    if (it.type === "key") {
      G.keyTaken++; G.score += 250;
      logMsg("RECOVERED: " + it.def.name + " (" + G.keyTaken + "/" + G.keyTotal + ")", it.def.col);
      floatText(it.x, it.y - 0.6, it.def.name, it.def.col); Sfx.key();
    } else if (it.type === "cell") {
      p.hp = Math.min(p.max, p.hp + 35);
      floatText(it.x, it.y - 0.6, "+35 INTEGRITY", "#9dffb8"); Sfx.pickup();
    } else {
      G.tidy++; G.score += 50;
      logMsg("CABLE CLIP SECURED - TIDINESS " + G.tidy + ", SCORE x" + (1 + 0.1 * G.tidy).toFixed(1), "#d8dee8");
      floatText(it.x, it.y - 0.6, "TIDIER", "#d8dee8"); Sfx.pickup();
    }
  }
}

function spawnReinforcement() {
  const m = G.m, p = G.p;
  const opts = m.rooms.filter((r) => Math.hypot(r.cx - p.x, r.cy - p.y) > 16 && !visAt(r.cx + 1, r.cy + 1) && r.spots.length);
  if (!opts.length) return;
  const rm = pick(opts), s = spotXY(m, pick(rm.spots));
  const c = makeCrew("security", s.x, s.y, rm);
  setInvestigate(c, G.alertPos.x, G.alertPos.y, 0.5);
  G.crew.push(c); G.reinCount++;
  logMsg("SECURITY REINFORCEMENTS INBOUND", "#ff9a7a");
}

function updateWorld(dt, inp) {
  const p = G.p;
  G.deckT += dt;
  updatePlayer(dt, inp);
  updateCables(dt);
  updateDoors(dt);
  for (const c of G.crew) updateCrew(c, dt);
  for (const d of G.drones) updateDrone(d, dt);
  separate();
  updateBolts(dt);
  updateFx(dt);
  G.crew = G.crew.filter((c) => !c.dead);
  G.drones = G.drones.filter((d) => !d.dead);

  if (G.alert > 0) {
    G.alert -= dt; G.reinT -= dt;
    if (G.reinT <= 0) { G.reinT = 11; if (G.reinCount < 3 + G.deckIdx * 2) spawnReinforcement(); }
    if (G.alert <= 0) { logMsg("ALERT STANDING DOWN", "#9dd6ff"); G.alertPos = null; }
  }
  Sfx.tension(G.alert > 0 ? 1 : 0);

  if (!p.dead) convertArea(G.m, p.x, p.y, 1.7, dt * 0.6);
  G.stamp++;
  computeVis(G.m, p.x, p.y, 13.5, G.stamp);

  const aim = 1.4;
  const tx = p.x + Math.cos(p.ang) * aim * 0.6, ty = p.y + Math.sin(p.ang) * aim * 0.6 - (G.mode === "attract" ? (0.26 * VH) / TS : 0);
  const ck = 1 - Math.exp(-dt * 5);
  G.cam.x += (tx - G.cam.x) * ck; G.cam.y += (ty - G.cam.y) * ck;

  if (G.mode !== "play") return;
  collectItems();
  const wasOnline = G.online;
  G.online = objDone();
  if (G.online && !wasOnline) { logMsg("TRANSWARP CONDUIT ONLINE - REACH ENGINEERING", "#ffe27a"); Sfx.online(); }
  const dc = Math.hypot(p.x - G.conduit.x, p.y - G.conduit.y);
  G.prompt = "";
  if (dc < 2.6 && !G.online) G.prompt = "CONDUIT OFFLINE: " + missingText();
  if (G.online && dc < 1.2) deckClear();
}

function missingText() {
  const bits = [];
  if (G.keyTaken < G.keyTotal) bits.push((G.keyTotal - G.keyTaken) + " ITEM" + (G.keyTotal - G.keyTaken > 1 ? "S" : ""));
  if (G.assimCount < G.quota) bits.push((G.quota - G.assimCount) + " ASSIMILATIONS");
  if (G.captain && !G.captain.assimilated) bits.push("THE CAPTAIN");
  return bits.join(" + ") + " REQUIRED";
}

// ---------- attract-mode bot ----------
function botInput(dt) {
  const p = G.p, m = G.m, b = G.bot;
  const inp = { mx: 0, my: 0, aim: null, assim: false, scan: false };
  b.t -= dt; b.scanT -= dt;
  if (b.scanT <= 0) { b.scanT = 15; inp.scan = true; }
  if (p.chan) { inp.assim = true; inp.aim = Math.atan2(p.chan.y - p.y, p.chan.x - p.x); return inp; }
  if (b.t <= 0 || !b.tgt || b.tgt.dead || b.tgt.state === "held") {
    b.t = 0.7; b.tgt = null;
    let bd = 1e9;
    for (const c of G.crew) {
      if (c.dead || c.state === "held") continue;
      const d = Math.hypot(c.x - p.x, c.y - p.y) * (c.state === "down" ? 0.6 : 1);
      if (d < bd) { bd = d; b.tgt = c; }
    }
  }
  if (!b.tgt) { b.idle += dt; if (b.idle > 4) enterAttract(); return inp; }
  b.idle = 0;
  const t = b.tgt, dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
  if (d < 1.3) { inp.aim = a; inp.assim = true; if (d > 0.9) { inp.mx = Math.cos(a) * 0.5; inp.my = Math.sin(a) * 0.5; } return inp; }
  let gx = t.x, gy = t.y;
  p.rp -= dt;
  if (!walkLine(m, p.x, p.y, t.x, t.y, p.r)) {
    if (p.rp <= 0 || !p.path) { p.path = findPath(m, Math.floor(p.x), Math.floor(p.y), Math.floor(t.x), Math.floor(t.y)); p.pi = 0; p.rp = 0.5; }
    if (p.path) {
      while (p.pi < p.path.length - 1 && Math.hypot(p.path[p.pi].x - p.x, p.path[p.pi].y - p.y) < 0.4) p.pi++;
      gx = p.path[p.pi].x; gy = p.path[p.pi].y;
    }
  } else p.path = null;
  const gd = Math.hypot(gx - p.x, gy - p.y) || 1;
  inp.mx = (gx - p.x) / gd; inp.my = (gy - p.y) / gd;
  return inp;
}

// ---------- main loop ----------
function update(dt) {
  G.t += dt; G.modeT += dt;
  handleMenus();
  const neutral = { mx: 0, my: 0, aim: null, assim: false, scan: false };
  switch (G.mode) {
    case "attract": G.demoT += dt; updateWorld(dt, botInput(dt)); if (G.demoT > 90) enterAttract(); break;
    case "play": updateWorld(dt, playerInput()); G.hintT += dt; break;
    case "dying":
      updateWorld(dt * 0.35, neutral);
      if (G.modeT > 2.4) { if (G.lives > 0) { G.lives--; setMode("dead"); } else finishRun(false); }
      break;
    case "briefing": case "clear": case "dead": case "paused": case "gameover": case "victory": {
      const p = G.p, k = 1 - Math.exp(-dt * 5);
      G.cam.x += (p.x - G.cam.x) * k; G.cam.y += (p.y - G.cam.y) * k;
      updateFx(dt);
      break;
    }
  }
  if (G.mode !== "play" && G.mode !== "attract" && G.mode !== "dying") Sfx.channel(null);
}

let lastT = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
  lastT = now;
  update(dt);
  render();
  pressed.clear();
  requestAnimationFrame(loop);
}

function boot() {
  try { G.hi = parseInt(localStorage.getItem(HI_KEY), 10) || 0; } catch (e) { G.hi = 0; }
  resize();
  enterAttract();
  requestAnimationFrame(loop);
}
