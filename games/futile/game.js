"use strict";

// ---- game state, input, AI, bosses (fixed 60 Hz simulation) ----
const cv = document.getElementById("screen");
const gfx = cv.getContext("2d");
let VW = 256, VH = 224, SC = 3;
const SAFE = { t: 0, r: 0, b: 0, l: 0 };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rr = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const DIRN = ["down", "up", "left", "right"];
const HI_KEY = "futile:hi";
const MAX_STAGE = 12, MAX_DRONES = 6;

const CREW = {
  ensign: { name: "ENSIGN", hp: 2, dmg: 1, cd: 100, spd: 0.5, run: 0.85, assim: 70, score: 100, armed: true, pref: 64 },
  security: { name: "SECURITY", hp: 4, dmg: 1, cd: 80, burst: 3, spd: 0.55, run: 1.0, assim: 90, score: 200, armed: true, pref: 52 },
  medic: { name: "MEDIC", hp: 2, spd: 0.5, run: 1.0, assim: 60, score: 150, armed: false, medic: true },
  scientist: { name: "SCIENTIST", hp: 1, spd: 0.5, run: 1.05, assim: 50, score: 150, armed: false },
  officer: { name: "OFFICER", hp: 7, dmg: 2, cd: 110, spread: 3, spd: 0.55, run: 0.9, assim: 120, score: 500, armed: true, pref: 60 },
};
const KIND_MIX = {
  QUARTERS: ["ensign", "ensign", "scientist"], MESS: ["ensign", "medic", "ensign", "scientist"], LAB: ["scientist", "scientist", "ensign"],
  SICKBAY: ["medic", "medic", "scientist"], ARMORY: ["security", "security", "ensign"], CARGO: ["ensign", "security"], HALL: ["ensign", "security"],
  ENGINE: ["ensign", "security", "officer"], TRANSPORTER: [], ARENA: [],
};

const G = {
  mode: "title", frame: 0, modeT: 0, n: 1, lives: 3, score: 0, hi: 0, seed: 1, stageScore: 0, nextLife: 10000,
  L: null, p: null, crew: [], drones: [], bolts: [], parts: [], items: [], texts: [], hazards: [], msgs: [], boss: null,
  cam: { x: 0, y: 0 }, shake: 0, flash: 0, alert: 0, alertPos: null, reinT: 0, reinCount: 0,
  keysGot: 0, keysNeed: 0, assim: 0, quota: 0, silent: 0, conduitOn: false, bossOpen: false, bossFight: false, stageT: 0,
  demo: true, bot: { t: 0, tgt: null, path: null, pi: 0, shootT: 0, idle: 0 }, showMap: false, mapDirty: 0, warnT: 0,
};

// ---------- input ----------
const held = new Set(), pressed = new Set();
addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab", "ShiftLeft", "ShiftRight"].includes(e.code)) e.preventDefault();
  if (!held.has(e.code)) pressed.add(e.code);
  held.add(e.code);
  Snd.init();
});
addEventListener("keyup", (e) => held.delete(e.code));
addEventListener("blur", () => { held.clear(); if (G.mode === "play") setMode("pause"); });
cv.addEventListener("pointerdown", () => { Snd.init(); pressed.add("Click"); });
let padPrev = {};
function padState() {
  const pad = navigator.getGamepads ? navigator.getGamepads()[0] : null;
  const s = { x: 0, y: 0, a: false, b: false, start: false, sel: false };
  if (!pad) return s;
  const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
  if (Math.abs(ax) > 0.3) s.x = Math.sign(ax);
  if (Math.abs(ay) > 0.3) s.y = Math.sign(ay);
  const b = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
  if (b(14)) s.x = -1; if (b(15)) s.x = 1; if (b(12)) s.y = -1; if (b(13)) s.y = 1;
  s.a = b(0) || b(2); s.b = b(1) || b(3); s.start = b(9); s.sel = b(8);
  return s;
}
function readInput() {
  const pd = padState();
  let x = 0, y = 0;
  if (held.has("ArrowLeft") || held.has("KeyA")) x -= 1;
  if (held.has("ArrowRight") || held.has("KeyD")) x += 1;
  if (held.has("ArrowUp") || held.has("KeyW")) y -= 1;
  if (held.has("ArrowDown") || held.has("KeyS")) y += 1;
  x = x || pd.x; y = y || pd.y;
  const a = held.has("KeyZ") || held.has("KeyJ") || held.has("Space") || pd.a;
  const b = held.has("KeyX") || held.has("KeyK") || pd.b;
  const bp = pressed.has("KeyX") || pressed.has("KeyK") || (pd.b && !padPrev.b);
  const start = pressed.has("Enter") || pressed.has("Click") || (pd.start && !padPrev.start) || (pd.a && !padPrev.a);
  const sel = pressed.has("Tab") || pressed.has("ShiftLeft") || pressed.has("ShiftRight") || (pd.sel && !padPrev.sel);
  const pause = pressed.has("KeyP") || pressed.has("Escape") || (pd.start && !padPrev.start);
  padPrev = pd;
  return { x, y, a, b, bp, start, sel, pause };
}

function resize() {
  const ih = window.innerHeight, iw = window.innerWidth;
  SC = Math.max(2, Math.round(ih / 240));
  if (iw / SC < 240) SC = Math.max(1, Math.floor(iw / 240));
  VW = Math.ceil(iw / SC); VH = Math.ceil(ih / SC);
  cv.width = VW; cv.height = VH;
  cv.style.width = VW * SC + "px"; cv.style.height = VH * SC + "px";
  const cs = getComputedStyle(document.getElementById("safe"));
  SAFE.t = Math.ceil((parseFloat(cs.paddingTop) || 0) / SC); SAFE.r = Math.ceil((parseFloat(cs.paddingRight) || 0) / SC);
  SAFE.b = Math.ceil((parseFloat(cs.paddingBottom) || 0) / SC); SAFE.l = Math.ceil((parseFloat(cs.paddingLeft) || 0) / SC);
}
addEventListener("resize", resize);

// ---------- helpers ----------
function msg(s, col) { G.msgs.unshift({ s, col: col == null ? 0x30 : col, t: G.frame }); if (G.msgs.length > 4) G.msgs.pop(); }
function popText(x, y, s, col) { G.texts.push({ x, y, s, col, life: 50 }); }
function burst(x, y, n, col, spd, life, sz) {
  for (let i = 0; i < n && G.parts.length < 400; i++) {
    const a = Math.random() * 6.283, s = spd * rr(0.3, 1);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * rr(0.6, 1), col, sz: sz || 2 });
  }
}
function setMode(m) { G.mode = m; G.modeT = 0; Snd.quiet = m === "title"; document.body.dataset.ui = m === "title" || m === "pause" || m === "over" || m === "win" ? "menu" : "play"; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function vecDir(dx, dy) { return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : dy > 0 ? 0 : 1; }
function addScore(n) {
  G.score += n;
  if (!G.demo && G.score >= G.nextLife) { G.nextLife += 10000; G.lives++; Snd.oneup(); popText(G.p.x, G.p.y - 20, "1UP", 0x28); }
}
function inView(x, y, pad) { pad = pad == null ? 24 : pad; return x > G.cam.x - pad && x < G.cam.x + VW + pad && y > G.cam.y - pad && y < G.cam.y + VH + pad; }

// ---------- stage setup ----------
function newPlayer(x, y) {
  return { x, y, h: 5, dir: 0, fx: 0, fy: 1, hp: 8, max: 8, en: 5, inv: 0, chan: null, anim: 0, moving: false, dead: false, god: false, tub: 0, fireCD: 0, dieT: 0 };
}
function makeCrew(kind, x, y, room) {
  const d = CREW[kind];
  return {
    k: kind, d, x, y, h: 5, dir: (Math.random() * 4) | 0, hp: d.hp, max: d.hp, state: "patrol", aware: 0, anim: (Math.random() * 60) | 0,
    path: null, pi: 0, rp: 0, wp: null, idle: (Math.random() * 90) | 0, fireCD: 60 + ((Math.random() * 60) | 0), burst: 0, burstT: 0,
    alT: 0, home: room, skin: (Math.random() * 6) | 0, held: 0, dur: d.assim, silent: false, downT: 0, dead: false, flash: 0,
    tx: x, ty: y, look: 0, lastSeen: null, strafe: Math.random() < 0.5 ? 1 : -1, fleeT: 0, rv: null, revT: 0, medT: (Math.random() * 60) | 0, invT: 0, prev: "patrol",
  };
}
function makeDrone(c) {
  const ranged = c.k === "security" || c.k === "officer";
  const hp = c.d.hp * 2 + 3;
  return { k: c.k, x: c.x, y: c.y, h: 5, dir: c.dir, hp, max: hp, cd: 0, anim: 0, ranged, tgt: null, scanT: 0, dead: false, flash: 0, path: null, pi: 0, rp: 0, accent: CREW_LOOK[c.k].U, spawn: 20, slot: 0 };
}

function startStage(n, opts) {
  opts = opts || {};
  const seed = opts.seed != null ? opts.seed : G.seed * 131 + n * 7919;
  const L = genLevel(n, seed), info = L.info;
  Object.assign(G, {
    L, n, crew: [], drones: [], bolts: [], parts: [], items: [], texts: [], hazards: [], msgs: [], boss: null,
    alert: 0, alertPos: null, reinT: 600, reinCount: 0, keysGot: 0, keysNeed: info.keys, assim: 0, silent: 0, conduitOn: false,
    bossOpen: false, bossFight: false, stageT: 0, shake: 0, flash: 0, showMap: false, mapDirty: 0, stageScore: G.score,
  });
  G.p = newPlayer(L.start.x, L.start.y);
  const rnd = L.rnd, rp = (a) => a[(rnd() * a.length) | 0];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const rooms = shuffle(L.rooms.filter((r) => r.id !== L.startRoom && r.id !== L.arenaRoom && r.spots.length));
  for (let i = 0; i < info.crew; i++) {
    const r = rooms[i % rooms.length];
    let k = rp(KIND_MIX[r.kind]);
    if (k === "ensign" && info.world >= 2 && rnd() < 0.3) k = "security";
    if (k === "officer" && info.world < 2 && info.n < 3) k = "security";
    if (k === "security" && info.n === 1 && rnd() < 0.5) k = "ensign";
    const sp = r.spots[(rnd() * r.spots.length) | 0];
    G.crew.push(makeCrew(k, ((sp % L.W) + 0.5) * TS, (((sp / L.W) | 0) + 0.5) * TS, r));
  }
  G.quota = info.boss ? 0 : Math.ceil(G.crew.length * 0.5);
  const keyRooms = shuffle(rooms.slice());
  const defs = shuffle(KEY_DEFS.slice()).slice(0, info.keys);
  defs.forEach((def, i) => { const r = keyRooms[i % keyRooms.length]; const sp = spotIn(r, rnd); G.items.push({ type: "key", def, x: sp.x, y: sp.y, taken: false, ph: rnd() * 6 }); });
  const extra = [["heart", 4], ["energy", 3]];
  if (!(n % 2)) extra.push(["oneup", 1]);
  for (const [type, cnt] of extra) for (let i = 0; i < cnt; i++) { const sp = spotIn(rp(rooms), rnd); G.items.push({ type, x: sp.x, y: sp.y, taken: false, ph: rnd() * 6 }); }
  if (L.arenaRoom >= 0) {
    const a = L.rooms[L.arenaRoom];
    for (const [type, dx, dy] of [["heart", -6, -4], ["heart", 6, 4], ["energy", 6, -4], ["energy", -6, 4]]) {
      G.items.push({ type, x: (a.cx + dx + 0.5) * TS, y: (a.cy + dy + 0.5) * TS, taken: false, ph: rnd() * 6 });
    }
    spawnBoss();
  }
  updateCamera(true);
  Snd.play("stage");
}
function spotIn(r, rnd) {
  const L = G.L, sp = r.spots[(rnd() * r.spots.length) | 0];
  return { x: ((sp % L.W) + 0.5) * TS, y: (((sp / L.W) | 0) + 0.5) * TS };
}

// ---------- bosses ----------
function spawnBoss() {
  const L = G.L, def = BOSS_DEFS[L.info.bossIdx], a = L.rooms[L.arenaRoom];
  G.boss = {
    def, kind: def.kind, x: (a.cx + 0.5) * TS, y: (a.y0 + 6) * TS, w: def.w, h: def.h, hp: def.hp, max: def.hp, state: "sleep", t: 0, ph: 1, flash: 0, dead: false,
    face: 0, hold: 0, vx: 0, vy: 0, cycle: 0, ang: 0, summoned: false, staggers: 0, dizzy: false, pose: 0, ax: 0, ay: 0,
    arena: a,
  };
}
function bossHit(dmg) {
  const b = G.boss;
  if (!b || b.dead || b.state === "sleep" || b.state === "stagger" || b.state === "intro") return false;
  if (b.kind === "nova" && b.state !== "open") { b.flash = 2; popText(b.x, b.y - 22, "SHIELD", 0x21); return true; }
  b.hp -= dmg * (b.state === "dizzy" ? 2 : 1); b.flash = 4; Snd.hit();
  if (b.hp <= 0) bossStagger();
  return true;
}
function bossStagger() {
  const b = G.boss;
  b.hp = 0; b.state = "stagger"; b.t = 660; b.pose = 2; b.staggers++;
  G.bolts = G.bolts.filter((x) => x.owner === 0);
  G.hazards = [];
  burst(b.x, b.y, 30, 0x30, 3, 30, 2); G.shake = 12; Snd.boom();
  msg("BOSS DOWN! ASSIMILATE HIM!", 0x28);
  const a = b.arena;
  for (const [dx, dy] of [[-9, 0], [9, 0]]) {
    const sp = { x: (a.cx + dx + 0.5) * TS, y: (a.cy + dy + 0.5) * TS };
    const c = makeCrew("ensign", sp.x, sp.y, a); c.state = "combat"; c.aware = 1; c.alarmed = true; G.crew.push(c);
  }
}
function bossFire(b, ang, spd, dmg, col) { G.bolts.push({ x: b.x, y: b.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg: dmg || 1, owner: 1, col: col == null ? 0x26 : col, life: 240, big: true }); }

function updateBoss() {
  const b = G.boss, p = G.p, L = G.L;
  if (!b || b.dead) return;
  b.t++; if (b.flash > 0) b.flash--;
  const a = b.arena, minX = (a.x0 + 2) * TS, maxX = (a.x1 - 1) * TS, minY = (a.y0 + 2) * TS, maxY = (a.y1 - 1) * TS;
  const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
  const move = (vx, vy) => { b.x = clamp(b.x + vx, minX, maxX); b.y = clamp(b.y + vy, minY, maxY); };
  if (b.state === "sleep") {
    const px = p.x / TS, py = p.y / TS;
    if (G.bossOpen && px > a.x0 + 3 && px < a.x1 - 3 && py > a.y0 + 3 && py < a.y1 - 3) {
      b.state = "intro"; b.t = 0; G.bossFight = true; G.warnT = 150;
      for (const i of L.doors) if (L.doorLock[i] === 0 && isArenaDoor(i)) { L.doorLock[i] = 1; }
      Snd.warn(); Snd.play("boss"); msg(b.def.name + " ATTACKS!", 0x16);
    }
    return;
  }
  if (b.state === "intro") { if (b.t > 120) { b.state = "idle"; b.t = 0; } return; }
  if (b.state === "stagger") {
    b.pose = 2;
    if (b.t > 660 && !p.chan) {
      b.hp = Math.ceil(b.max * 0.4); b.state = "idle"; b.t = 0; b.pose = 0; b.ph = 2; msg("HE RECOVERS!", 0x16); Snd.warn();
    } else if (b.t > 660) b.t = 660;
    return;
  }
  // contact damage
  if (!p.dead && Math.abs(dx) < b.w / 2 + 4 && Math.abs(dy) < b.h / 2 + 4 && b.state !== "telegraph") hurtPlayer(b.state === "dash" ? 2 : 1);
  const enraged = b.ph === 2 || b.hp < b.max * 0.5;
  if (b.kind === "vex") {
    b.pose = b.state === "dash" ? 1 : 0;
    if (b.state === "idle") {
      const want = 72;
      if (d > want + 14) move(Math.cos(ang) * 0.6, Math.sin(ang) * 0.6); else if (d < want - 14) move(-Math.cos(ang) * 0.6, -Math.sin(ang) * 0.6);
      move(-Math.sin(ang) * 0.5 * b.hold, Math.cos(ang) * 0.5 * b.hold);
      if (b.t % 90 === 0) b.hold = Math.random() < 0.5 ? 1 : -1;
      if (b.t % (enraged ? 60 : 80) === 0) { const n = enraged ? 7 : 5; for (let i = 0; i < n; i++) bossFire(b, ang + (i - (n - 1) / 2) * 0.3, 1.7, 1); Snd.foe(); }
      if (b.t > (enraged ? 220 : 300)) { b.state = "telegraph"; b.t = 0; }
      if (enraged && !b.summoned) { b.summoned = true; for (const [ox, oy] of [[-8, 0], [8, 0]]) { const c = makeCrew("security", (a.cx + ox + 0.5) * TS, (a.cy + oy + 0.5) * TS, a); c.state = "combat"; c.aware = 1; c.alarmed = true; G.crew.push(c); } msg("VEX CALLS SECURITY!", 0x16); }
    } else if (b.state === "telegraph") {
      if (b.t === 1) { b.ax = Math.cos(ang); b.ay = Math.sin(ang); }
      if (b.t > 34) { b.state = "dash"; b.t = 0; Snd.warn(); }
    } else if (b.state === "dash") {
      move(b.ax * 3.2, b.ay * 3.2);
      if (b.t > 36) { b.state = "dizzy"; b.t = 0; }
    } else if (b.state === "dizzy") { b.pose = 2; if (b.t > 70) { b.state = "idle"; b.t = 0; b.pose = 0; } }
  } else if (b.kind === "kiln") {
    b.pose = b.state === "slam" ? 1 : 0;
    if (b.state === "idle") {
      move(Math.cos(ang) * (enraged ? 0.6 : 0.42), Math.sin(ang) * (enraged ? 0.6 : 0.42));
      if (b.t > (enraged ? 130 : 190)) { b.state = "slam"; b.t = 0; b.cycle++; }
      if (b.t % 260 === 130) for (let i = 0; i < 3; i++) G.hazards.push({ x: p.x + rr(-40, 40), y: p.y + rr(-30, 30), t: 0 });
    } else if (b.state === "slam") {
      if (b.t === 50) {
        const n = enraged ? 20 : 14;
        for (let i = 0; i < n; i++) bossFire(b, (i / n) * 6.283 + b.cycle, 1.15, 1, 0x27);
        G.shake = 10; Snd.boom();
      }
      if (b.t === 90 && enraged) { for (let i = 0; i < 16; i++) bossFire(b, (i / 16) * 6.283 + 0.2, 1.4, 1, 0x27); G.shake = 8; Snd.boom(); }
      if (b.t > (enraged ? 120 : 90)) { b.state = "dizzy"; b.t = 0; }
    } else if (b.state === "dizzy") { b.pose = 2; if (b.t > 60) { b.state = "idle"; b.t = 0; b.pose = 0; } }
  } else {
    b.pose = b.state === "open" ? 2 : 0;
    if (b.state === "idle") {
      if (b.t === 1) { b.tx = a.cx * TS + rr(-90, 90); b.ty = a.cy * TS + rr(-50, 50); }
      b.x += (clamp(b.tx, minX, maxX) - b.x) * 0.03; b.y += (clamp(b.ty, minY, maxY) - b.y) * 0.03;
      if (b.t > 50) { b.state = "spiral"; b.t = 0; b.ang = ang; }
    } else if (b.state === "spiral") {
      if (b.t % 5 === 0) { const arms = enraged ? 3 : 2; for (let i = 0; i < arms; i++) bossFire(b, b.ang + (i / arms) * 6.283, 1.25, 1, 0x23); b.ang += 0.42; Snd.foe(); }
      if (b.t > 170) { b.state = "aimed"; b.t = 0; }
    } else if (b.state === "aimed") {
      if (b.t % 24 === 6 && b.t < 100) { for (let i = -1; i <= 1; i++) bossFire(b, ang + i * 0.22, 1.9, 1, 0x2C); Snd.foe(); }
      if (b.t > 110) { b.state = "open"; b.t = 0; }
    } else if (b.state === "open") { if (b.t > 100) { b.state = "idle"; b.t = 0; } }
  }
  for (const h of G.hazards) {
    h.t++;
    if (h.t > 50 && h.t < 90 && !p.dead && Math.abs(p.x - h.x) < 14 && Math.abs(p.y - h.y) < 14) hurtPlayer(1);
  }
  G.hazards = G.hazards.filter((h) => h.t < 90);
}
function isArenaDoor(i) {
  const a = G.L.rooms[G.L.arenaRoom], x = i % G.L.W, y = (i / G.L.W) | 0;
  return x >= a.x0 - 1 && x <= a.x1 + 1 && y >= a.y0 - 1 && y <= a.y1 + 1;
}
function bossDefeated() {
  const b = G.boss;
  b.dead = true; G.bossFight = false;
  for (const i of G.L.doors) if (isArenaDoor(i)) G.L.doorLock[i] = 0;
  addScore(5000); G.flash = 20; G.shake = 16; Snd.boom(); Snd.done();
  burst(b.x, b.y, 60, 0x2A, 4, 50, 2); burst(b.x, b.y, 30, 0x30, 3, 40, 2);
  G.bolts = G.bolts.filter((x) => x.owner === 0); G.hazards = [];
  for (const c of G.crew) if (c.state !== "down") { c.hp = 0; c.state = "down"; c.downT = 999; }
  msg(b.def.name + " ASSIMILATED!", 0x2A); msg("TRANSWARP CONDUIT ONLINE", 0x28);
  G.items.push({ type: "oneup", x: b.x, y: b.y + 20, taken: false, ph: 0 });
  Snd.play("stage");
}

// ---------- combat ----------
function hurtPlayer(dmg) {
  const p = G.p;
  if (p.dead || p.inv > 0) return;
  if (!p.god) p.hp -= dmg;
  p.inv = 70; G.shake = Math.max(G.shake, 5); Snd.hurt();
  burst(p.x, p.y, 8, 0x16, 2, 14, 2);
  if (p.chan) releaseTarget();
  if (p.hp <= 0 && !p.god && G.mode === "play") killPlayer();
  if (p.god && p.hp < 4) p.hp = p.max;
}
function killPlayer() {
  const p = G.p;
  p.dead = true; p.hp = 0; p.dieT = 0; Snd.stop(); Snd.boom();
  burst(p.x, p.y, 40, 0x2A, 3, 40, 2); burst(p.x, p.y, 20, 0x30, 2, 30, 2);
  setMode("dying");
}
function hurtCrew(c, dmg, src) {
  if (c.dead || c.state === "down" || c.state === "held") return;
  c.hp -= dmg; c.flash = 6; burst(c.x, c.y, 4, 0x27, 1.5, 12, 2);
  if (c.hp <= 0) {
    c.state = "down"; c.hp = 0; c.downT = 700; c.path = null; popText(c.x, c.y - 14, "DOWN", 0x28); Snd.hit();
    return;
  }
  if (c.state !== "combat" && c.state !== "flee" && c.state !== "alert") enterAlert(c, true);
  void src;
}
function fireBolt(x, y, ang, spd, dmg, owner, col) {
  G.bolts.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg, owner, col, life: 150 });
}
function raiseAlert() {
  const p = G.p;
  if (G.alert <= 0 && !G.demo) { msg("RED ALERT! INTRUDER ABOARD", 0x16); Snd.alarm(); if (!G.bossFight) Snd.play("alert"); }
  G.alert = 900; G.alertPos = { x: p.x, y: p.y };
}
function enterAlert(c, silent) {
  if (c.state === "combat" || c.state === "flee") return;
  c.state = "alert"; c.alT = silent ? 8 : 26; c.aware = 1; c.path = null;
  if (!silent) popText(c.x, c.y - 14, "!", 0x16);
  Snd.blip();
  raiseAlert();
}

// ---------- movement helpers ----------
function steer(e, tx, ty, spd) {
  const L = G.L;
  let gx = tx, gy = ty;
  e.rp = (e.rp || 0) - 1;
  if (!lineWalkable(L, e.x, e.y, tx, ty, e.h)) {
    if (e.rp <= 0 || !e.path) {
      e.path = findPath(L, Math.floor(e.x / TS), Math.floor(e.y / TS), Math.floor(tx / TS), Math.floor(ty / TS)); e.pi = 0; e.rp = 30 + ((Math.random() * 20) | 0);
    }
    if (e.path) {
      while (e.pi < e.path.length - 1 && Math.hypot(e.path[e.pi].x - e.x, e.path[e.pi].y - e.y) < 5) e.pi++;
      gx = e.path[e.pi].x; gy = e.path[e.pi].y;
    }
  } else e.path = null;
  const dx = gx - e.x, dy = gy - e.y, d = Math.hypot(dx, dy);
  if (d > 0.5) {
    const vx = (dx / d) * spd, vy = (dy / d) * spd;
    slide(L, e, vx, vy);
    e.dir = vecDir(vx, vy); e.anim++;
  }
  return Math.hypot(tx - e.x, ty - e.y);
}

// ---------- crew AI ----------
function updateCrew(c) {
  const p = G.p, L = G.L;
  if (c.flash > 0) c.flash--;
  if (c.state === "down") {
    if (--c.downT <= 0) { c.hp = Math.max(1, Math.ceil(c.max / 2)); c.state = "search"; c.tx = p.x; c.ty = p.y; c.look = 0; c.invT = 400; c.aware = 0.5; }
    return;
  }
  if (c.state === "held") return;
  if (c.fireCD > 0) c.fireCD--;
  const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
  const engaged = c.state === "combat" || c.state === "flee" || c.state === "alert";
  let sees = false;
  if (!p.dead && d < (G.alert > 0 ? 170 : 120) && rayClear(L, c.x, c.y, p.x, p.y)) {
    const fv = [[0, 1], [0, -1], [-1, 0], [1, 0]][c.dir];
    if (engaged || d < 34 || (dx * fv[0] + dy * fv[1]) / (d || 1) > 0.15) sees = true;
  }
  if (sees) {
    c.aware = Math.min(1, c.aware + (d < 48 ? 0.05 : d < 90 ? 0.028 : 0.016) * (G.alert > 0 ? 2 : 1));
    c.lastSeen = { x: p.x, y: p.y };
    if (c.aware >= 1 && !engaged) enterAlert(c, false);
    if (engaged && c.state !== "alert") { G.alert = Math.max(G.alert, 600); G.alertPos = { x: p.x, y: p.y }; }
  } else c.aware = Math.max(0, c.aware - 0.004);

  switch (c.state) {
    case "patrol": {
      if (G.alert > 0 && G.alertPos && !G.demo) { c.state = "search"; c.tx = G.alertPos.x; c.ty = G.alertPos.y; c.look = 0; c.invT = 500; break; }
      if (c.d.medic && --c.medT <= 0) {
        c.medT = 60;
        let best = null, bd = 220;
        for (const o of G.crew) if (!o.dead && o.state === "down" && o.downT < 990) { const dd = dist(o, c); if (dd < bd) { bd = dd; best = o; } }
        if (best) { c.state = "revive"; c.rv = best; c.revT = 0; c.path = null; break; }
      }
      if (!c.wp) {
        if (c.idle > 0) { c.idle--; if (c.idle % 50 === 20) c.dir = (Math.random() * 4) | 0; break; }
        const r = Math.random() < 0.7 || !L.rooms.length ? c.home : pick(L.rooms.filter((q) => Math.hypot(q.cx * TS - c.x, q.cy * TS - c.y) < 400 && q.spots.length && q.id !== L.arenaRoom).concat([c.home]));
        const sp = r.spots[(Math.random() * r.spots.length) | 0];
        c.wp = { x: ((sp % L.W) + 0.5) * TS, y: (((sp / L.W) | 0) + 0.5) * TS }; c.path = null; c.patT = 900;
      }
      c.patT--;
      if (steer(c, c.wp.x, c.wp.y, c.d.spd) < 6 || c.patT <= 0) { c.wp = null; c.idle = 50 + ((Math.random() * 120) | 0); }
      break;
    }
    case "search": {
      c.invT--;
      if (c.look > 0) { c.look--; if (c.look % 30 === 10) c.dir = (Math.random() * 4) | 0; if (c.look <= 0) { c.state = "patrol"; c.wp = null; } break; }
      if (steer(c, c.tx, c.ty, c.d.spd * 1.5) < 8) c.look = 90;
      else if (c.invT <= 0) { c.state = "patrol"; c.wp = null; }
      break;
    }
    case "alert": {
      c.dir = vecDir(dx, dy);
      if (--c.alT <= 0) { if (c.d.armed) { c.state = "combat"; c.fireCD = 20; } else { c.state = "flee"; c.fleeT = 360; c.path = null; c.fleeGoal = null; } }
      break;
    }
    case "revive": {
      const o = c.rv;
      if (!o || o.dead || o.state !== "down") { c.state = "patrol"; c.wp = null; break; }
      if (steer(c, o.x, o.y, c.d.run * 0.8) < 14) {
        c.revT++;
        if (c.revT % 8 === 0) G.parts.push({ x: o.x + rr(-4, 4), y: o.y, vx: 0, vy: -0.6, life: 20, col: 0x2C, sz: 2 });
        if (c.revT > 90) { o.hp = Math.max(1, Math.ceil(o.max / 2)); o.state = "search"; o.tx = p.x; o.ty = p.y; o.look = 0; o.invT = 400; popText(o.x, o.y - 14, "REVIVED", 0x2C); c.state = "patrol"; c.wp = null; }
      }
      break;
    }
    case "flee": {
      c.fleeT--;
      if (sees) c.fleeT = 240;
      if (!c.fleeGoal || c.rp <= -600) {
        let best = null, bd = -1;
        for (let i = 0; i < 6; i++) { const r = pick(L.rooms); const dd = Math.hypot(r.cx * TS - p.x, r.cy * TS - p.y); if (dd > bd && r.id !== L.arenaRoom) { bd = dd; best = r; } }
        c.fleeGoal = { x: (best.cx + 0.5) * TS, y: (best.cy + 0.5) * TS };
      }
      steer(c, c.fleeGoal.x, c.fleeGoal.y, c.d.run);
      if (c.fleeT <= 0 && !sees) { c.state = "patrol"; c.wp = null; c.fleeGoal = null; }
      break;
    }
    case "combat": {
      let t = null, td = 1e9;
      if (sees) { t = p; td = d; }
      for (const dr of G.drones) { if (dr.dead) continue; const dd = dist(dr, c); if (dd < 110 && dd < td - 30 && rayClear(L, c.x, c.y, dr.x, dr.y)) { t = dr; td = dd; } }
      if (t) {
        const tx = t.x - c.x, ty = t.y - c.y, ang = Math.atan2(ty, tx);
        c.dir = vecDir(tx, ty); c.lastSeen = { x: t.x, y: t.y }; c.lostT = 0;
        const pref = c.d.pref;
        if (td > pref + 14) steer(c, t.x, t.y, c.d.run);
        else if (td < pref - 16) slide(L, c, -Math.cos(ang) * c.d.spd, -Math.sin(ang) * c.d.spd);
        else { slide(L, c, -Math.sin(ang) * c.strafe * 0.5, Math.cos(ang) * c.strafe * 0.5); if (Math.random() < 0.01) c.strafe *= -1; c.anim++; }
        if (c.fireCD <= 0 && td < 150) {
          c.fireCD = c.d.cd + ((Math.random() * 40) | 0);
          if (c.d.burst) { c.burst = c.d.burst; c.burstT = 0; }
          else if (c.d.spread) { for (let i = -1; i <= 1; i++) fireBolt(c.x, c.y, ang + i * 0.28, 1.7, c.d.dmg, 1, 0x26); Snd.foe(); }
          else { fireBolt(c.x, c.y, ang + rr(-0.06, 0.06), 1.6, c.d.dmg, 1, 0x28); Snd.foe(); }
        }
        if (c.burst > 0 && --c.burstT <= 0) { c.burst--; c.burstT = 7; fireBolt(c.x, c.y, ang + rr(-0.08, 0.08), 1.9, c.d.dmg, 1, 0x26); Snd.foe(); }
      } else {
        c.lostT = (c.lostT || 0) + 1;
        if (c.lastSeen) steer(c, c.lastSeen.x, c.lastSeen.y, c.d.run * 0.8);
        if (c.lostT > 200) { c.state = "search"; c.tx = c.lastSeen ? c.lastSeen.x : c.x; c.ty = c.lastSeen ? c.lastSeen.y : c.y; c.look = 0; c.invT = 400; c.aware = 0.4; }
      }
      break;
    }
  }
}

// ---------- drones ----------
function updateDrone(d) {
  const p = G.p, L = G.L;
  d.anim++; if (d.flash > 0) d.flash--; if (d.spawn > 0) d.spawn--; if (d.cd > 0) d.cd--;
  if (--d.scanT <= 0) {
    d.scanT = 10;
    let best = null, bd = 120;
    for (const c of G.crew) { if (c.dead || c.state === "down" || c.state === "held") continue; const dd = dist(c, d); if (dd < bd && rayClear(L, d.x, d.y, c.x, c.y)) { bd = dd; best = c; } }
    if (G.boss && !G.boss.dead && G.boss.state !== "sleep" && G.boss.state !== "stagger" && G.boss.state !== "intro" && dist(G.boss, d) < 160) best = G.boss;
    d.tgt = best;
  }
  const t = d.tgt;
  if (t && (t.dead || t.state === "down" || t.state === "held")) d.tgt = null;
  if (d.tgt) {
    const dx = t.x - d.x, dy = t.y - d.y, dd = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    d.dir = vecDir(dx, dy);
    if (d.ranged) {
      if (dd > 70) steer(d, t.x, t.y, 0.95); else if (dd < 40) slide(L, d, -Math.cos(ang) * 0.7, -Math.sin(ang) * 0.7);
      if (d.cd <= 0 && dd < 130) { d.cd = 55; fireBolt(d.x, d.y, ang, 2, 1, 0, 0x2A); Snd.tick(1500); }
    } else {
      steer(d, t.x, t.y, 1.05);
      const reach = t === G.boss ? 22 : 12;
      if (dd < reach && d.cd <= 0) { d.cd = 30; if (t === G.boss) bossHit(1); else hurtCrew(t, 1, d); burst(t.x, t.y, 4, 0x2A, 1.5, 10, 2); }
    }
  } else {
    const idx = G.drones.indexOf(d), n = G.drones.length, a = Math.atan2(-p.fy, -p.fx) + (idx - (n - 1) / 2) * 0.7, rad = 22 + (idx % 2) * 10;
    const tx = p.x + Math.cos(a) * rad, ty = p.y + Math.sin(a) * rad;
    if (Math.hypot(tx - d.x, ty - d.y) > 6) steer(d, tx, ty, 1.15);
  }
  if (d.dir === undefined) d.dir = 0;
  if (d.k === "medic" && !p.dead && dist(p, d) < 50 && G.frame % 120 === 0 && p.hp < p.max) { p.hp++; popText(p.x, p.y - 16, "+1", 0x2A); }
  convertArea(L, d.x, d.y, 1, 2);
}

// ---------- assimilation ----------
function findTarget() {
  const p = G.p;
  let best = null, bs = 1e9;
  const cx = p.x + p.fx * 9, cy = p.y + p.fy * 9;
  for (const c of G.crew) {
    if (c.dead || c.state === "held") continue;
    const d = Math.hypot(c.x - cx, c.y - cy);
    if (d > 15) continue;
    if (!rayClear(G.L, p.x, p.y, c.x, c.y)) continue;
    const s = d - (c.state === "down" ? 6 : 0);
    if (s < bs) { bs = s; best = c; }
  }
  const b = G.boss;
  if (!best && b && !b.dead && b.state === "stagger" && Math.abs(b.x - p.x) < b.w / 2 + 14 && Math.abs(b.y - p.y) < b.h / 2 + 14) return b;
  return best;
}
function beginAssim(c) {
  const p = G.p;
  if (c === G.boss) { p.chan = c; c.beingHeld = true; c.held = c.held || 0; c.dur = 160; Snd.grab(); return; }
  c.prev = c.state;
  const wasDown = c.state === "down";
  c.silent = !wasDown && c.aware < 0.5 && (c.state === "patrol" || c.state === "search" || c.state === "revive");
  c.dur = c.d.assim * (wasDown ? 0.2 : c.silent ? 0.5 : 1);
  c.state = "held"; c.held = 0; p.chan = c;
  if (!c.silent && !wasDown) { for (const o of G.crew) if (!o.dead && o !== c && (o.state === "patrol" || o.state === "search") && dist(o, c) < 170) { o.state = "search"; o.tx = c.x; o.ty = c.y; o.look = 0; o.invT = 300; o.aware = Math.max(o.aware, 0.5); } }
  Snd.grab();
}
function releaseTarget() {
  const p = G.p, c = p.chan;
  if (c && c !== G.boss) {
    c.state = c.prev === "down" ? "down" : "alert"; c.alT = 6; c.held = 0; c.aware = 1;
    if (c.state === "alert") { if (!c.d.armed) { c.state = "flee"; c.fleeT = 300; } else c.state = "combat"; raiseAlert(); }
  }
  if (c === G.boss) { c.beingHeld = false; c.held = 0; }
  p.chan = null;
}
function finishAssim(c) {
  const p = G.p;
  p.chan = null;
  if (c === G.boss) { bossDefeated(); return; }
  c.dead = true;
  const pts = Math.round(c.d.score * (c.silent ? 2 : 1));
  addScore(pts); G.assim++; if (c.silent) G.silent++;
  if (G.drones.length < MAX_DRONES) G.drones.push(makeDrone(c));
  p.hp = Math.min(p.max, p.hp + (G.drones.length >= MAX_DRONES ? 1 : 0));
  convertArea(G.L, c.x, c.y, 3, 4);
  burst(c.x, c.y, 24, 0x2A, 2.5, 26, 2);
  popText(c.x, c.y - 14, "+" + pts + (c.silent ? " SNEAK" : ""), 0x2A);
  msg(c.d.name + " ASSIMILATED" + (c.silent ? " - SNEAK" : ""), 0x2A);
  G.flash = 4; G.shake = 3; Snd.done();
}

// ---------- player ----------
function updatePlayer(inp) {
  const p = G.p, L = G.L;
  if (p.dead) return;
  if (p.inv > 0) p.inv--;
  if (p.fireCD > 0) p.fireCD--;
  p.en = Math.min(5, p.en + 0.018);
  let mx = p.chan ? 0 : inp.x, my = p.chan ? 0 : inp.y;
  p.moving = !!(mx || my);
  if (p.moving) {
    const n = Math.hypot(mx, my), spd = 1.3;
    slide(L, p, (mx / n) * spd, (my / n) * spd);
    p.fx = Math.sign(mx); p.fy = Math.sign(my);
    const fn = Math.hypot(p.fx, p.fy); p.fx /= fn; p.fy /= fn;
    p.dir = vecDir(mx, my); p.anim++;
  }
  if (inp.bp && p.fireCD <= 0 && p.en >= 1 && !p.chan) {
    p.en -= 1; p.fireCD = 12;
    fireBolt(p.x + p.fx * 8, p.y + p.fy * 8, Math.atan2(p.fy, p.fx), 3, 1, 0, 0x2A); Snd.shoot();
  } else if (inp.b && p.fireCD <= 0 && p.en >= 1 && !p.chan) {
    p.en -= 1; p.fireCD = 14;
    fireBolt(p.x + p.fx * 8, p.y + p.fy * 8, Math.atan2(p.fy, p.fx), 3, 1, 0, 0x2A); Snd.shoot();
  }
  if (p.chan) {
    const c = p.chan, d = Math.hypot(c.x - p.x, c.y - p.y);
    if (!inp.a || (c !== G.boss && c.state !== "held") || d > (c === G.boss ? 60 : 26) || (c === G.boss && c.state !== "stagger")) releaseTarget();
    else {
      c.held++;
      if (c !== G.boss) {
        const tx = p.x + p.fx * 13, ty = p.y + p.fy * 13;
        if (!boxHit(L, tx, ty, 4)) { c.x += (tx - c.x) * 0.2; c.y += (ty - c.y) * 0.2; }
        c.dir = vecDir(-p.fx, -p.fy);
      }
      p.dir = vecDir(c.x - p.x, c.y - p.y);
      const prog = c.held / c.dur;
      if (c.held % 6 === 0) Snd.tick(300 + prog * 900);
      if (c.held % 3 === 0) burst(c.x, c.y, 1, 0x2A, 1.2, 12, 1);
      p.tub++;
      if (c.held >= c.dur) finishAssim(c);
    }
  } else if (inp.a) {
    const c = findTarget();
    if (c) beginAssim(c);
    p.tub++;
  } else p.tub = 0;
  if (p.chan == null) convertArea(L, p.x, p.y, 1, 1);
}

// ---------- world ----------
function updateDoors() {
  const L = G.L, ents = [G.p];
  for (const c of G.crew) if (!c.dead && c.state !== "down") ents.push(c);
  for (const d of G.drones) ents.push(d);
  if (G.boss && !G.boss.dead && G.boss.state !== "sleep") ents.push(G.boss);
  for (const i of L.doors) {
    const dx = ((i % L.W) + 0.5) * TS, dy = (((i / L.W) | 0) + 0.5) * TS;
    let near = 0;
    if (!L.doorLock[i]) for (const e of ents) if (Math.abs(e.x - dx) < 26 && Math.abs(e.y - dy) < 26) { near = 1; break; }
    const before = L.doorOpen[i];
    L.doorOpen[i] += (near - before) * 0.22;
    if (L.doorOpen[i] < 0.02) L.doorOpen[i] = 0;
    if (before < 0.5 && L.doorOpen[i] >= 0.5 && inView(dx, dy, 60)) Snd.door();
  }
}
function separate() {
  const list = [G.p];
  for (const c of G.crew) if (!c.dead && c.state !== "down" && c.state !== "held" && inView(c.x, c.y, 60)) list.push(c);
  for (const d of G.drones) list.push(d);
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d >= 10 || d < 0.01) continue;
    const push = (10 - d) * 0.25, nx = dx / d, ny = dy / d, wa = a === G.p ? 0.2 : 1, wb = b === G.p ? 0.2 : 1;
    slide(G.L, a, -nx * push * wa, -ny * push * wa); slide(G.L, b, nx * push * wb, ny * push * wb);
  }
}
function updateBolts() {
  const L = G.L, p = G.p, b0 = G.boss;
  for (const b of G.bolts) {
    b.life--; b.x += b.vx; b.y += b.vy;
    const tx = Math.floor(b.x / TS), ty = Math.floor(b.y / TS), t = tileAt(L, tx, ty);
    if (t === T.WALL || t === T.CRATE || t === T.PILLAR || t === T.CONSOLE || (t === T.DOOR && L.doorOpen[ty * L.W + tx] < 0.5)) { b.life = 0; burst(b.x, b.y, 3, b.col, 1, 8, 1); continue; }
    if (b.owner === 1) {
      if (!p.dead && Math.abs(p.x - b.x) < 6 && Math.abs(p.y - b.y) < 6) { hurtPlayer(b.dmg); b.life = 0; continue; }
      for (const d of G.drones) if (!d.dead && Math.abs(d.x - b.x) < 6 && Math.abs(d.y - b.y) < 6) {
        d.hp -= b.dmg; d.flash = 6; b.life = 0; burst(d.x, d.y, 4, 0x2A, 1.5, 10, 2);
        if (d.hp <= 0) { d.dead = true; burst(d.x, d.y, 14, 0x2A, 2, 20, 2); msg("DRONE LOST", 0x27); }
        break;
      }
    } else {
      for (const c of G.crew) {
        if (c.dead || c.state === "down" || c.state === "held") continue;
        if (Math.abs(c.x - b.x) < 7 && Math.abs(c.y - b.y) < 8) { hurtCrew(c, b.dmg, p); b.life = 0; break; }
      }
      if (b.life > 0 && b0 && !b0.dead && Math.abs(b0.x - b.x) < b0.w / 2 && Math.abs(b0.y - b.y) < b0.h / 2) { if (bossHit(b.dmg)) b.life = 0; }
    }
  }
  G.bolts = G.bolts.filter((b) => b.life > 0);
  G.drones = G.drones.filter((d) => !d.dead);
}
function updateFx() {
  for (const q of G.parts) { q.x += q.vx; q.y += q.vy; q.vx *= 0.94; q.vy *= 0.94; q.life--; }
  G.parts = G.parts.filter((q) => q.life > 0);
  for (const t of G.texts) { t.life--; t.y -= 0.3; }
  G.texts = G.texts.filter((t) => t.life > 0);
  if (G.shake > 0) G.shake -= 0.5;
  if (G.flash > 0) G.flash--;
}
function collectItems() {
  const p = G.p;
  for (const it of G.items) {
    if (it.taken || Math.abs(it.x - p.x) > 10 || Math.abs(it.y - p.y) > 10) continue;
    if (it.type === "heart" && p.hp >= p.max) continue;
    it.taken = true;
    burst(it.x, it.y, 10, it.type === "key" ? it.def.a : 0x30, 1.5, 16, 2);
    if (it.type === "key") {
      G.keysGot++; addScore(250); Snd.key(); msg("GOT " + it.def.name + " " + G.keysGot + "/" + G.keysNeed, it.def.a);
      if (G.L.info.boss && G.keysGot >= G.keysNeed) { G.bossOpen = true; for (const i of G.L.doors) if (isArenaDoor(i)) G.L.doorLock[i] = 0; msg("ARENA UNLOCKED! FIND THE BOSS", 0x28); }
    } else if (it.type === "heart") { p.hp = Math.min(p.max, p.hp + 3); popText(it.x, it.y - 10, "+3 HP", 0x25); Snd.pickup(); }
    else if (it.type === "energy") { p.en = 5; popText(it.x, it.y - 10, "ENERGY", 0x28); Snd.pickup(); }
    else { G.lives++; Snd.oneup(); popText(it.x, it.y - 10, "1UP", 0x28); }
  }
}
function updateAlert() {
  if (G.alert > 0) {
    G.alert--;
    if (--G.reinT <= 0 && !G.demo) {
      G.reinT = 720;
      if (G.reinCount < 2 + G.L.info.world * 2 && !G.bossFight) spawnReinforcement();
    }
    if (G.alert === 0) { msg("ALERT CLEARED", 0x21); if (!G.bossFight && G.mode === "play") Snd.play("stage"); }
  }
}
function spawnReinforcement() {
  const L = G.L, p = G.p;
  const opts = L.rooms.filter((r) => Math.hypot(r.cx * TS - p.x, r.cy * TS - p.y) > 280 && r.spots.length && r.id !== L.arenaRoom);
  if (!opts.length) return;
  const r = pick(opts), sp = r.spots[(Math.random() * r.spots.length) | 0];
  const c = makeCrew("security", ((sp % L.W) + 0.5) * TS, (((sp / L.W) | 0) + 0.5) * TS, r);
  c.state = "search"; c.tx = G.alertPos.x; c.ty = G.alertPos.y; c.invT = 900;
  G.crew.push(c); G.reinCount++; msg("SECURITY REINFORCEMENTS", 0x27);
}

function updateCamera(snap) {
  const p = G.p, L = G.L, mw = L.W * TS, mh = L.H * TS;
  let tx = p.x - VW / 2 + p.fx * 18, ty = p.y - VH / 2 + p.fy * 12;
  tx = mw <= VW ? (mw - VW) / 2 : clamp(tx, 0, mw - VW);
  ty = mh <= VH ? (mh - VH) / 2 : clamp(ty, 0, mh - VH);
  if (snap) { G.cam.x = tx; G.cam.y = ty; } else { G.cam.x += (tx - G.cam.x) * 0.12; G.cam.y += (ty - G.cam.y) * 0.12; }
}

function checkClear() {
  const p = G.p, L = G.L, info = L.info;
  const on = info.boss ? !!(G.boss && G.boss.dead) : G.keysGot >= G.keysNeed && G.assim >= G.quota;
  if (on && !G.conduitOn) { G.conduitOn = true; if (!info.boss) { msg("TRANSWARP CONDUIT ONLINE!", 0x28); Snd.key(); } }
  G.conduitOn = on;
  if (on && Math.hypot(p.x - L.exit.x, p.y - L.exit.y) < 14 && G.mode === "play") stageClear();
}
function stageClear() {
  const bonus = Math.max(0, 3000 - Math.floor(G.stageT / 60) * 10) + G.silent * 100;
  G.clearBonus = bonus; addScore(bonus);
  G.clearStats = { assim: G.assim, silent: G.silent, time: Math.floor(G.stageT / 60), bonus, drones: G.drones.length };
  Snd.play("clear"); setMode("clear");
}

function tickWorld(inp) {
  G.stageT++; G.frame++;
  updatePlayer(inp);
  updateDoors();
  for (const c of G.crew) updateCrew(c);
  for (const d of G.drones) updateDrone(d);
  updateBoss();
  separate();
  updateBolts();
  G.crew = G.crew.filter((c) => !c.dead);
  updateFx(); updateAlert();
  if (G.warnT > 0) G.warnT--;
  if (G.mode === "play") { collectItems(); checkClear(); }
  updateCamera(false);
  if (G.frame - G.mapDirty > 20) { G.mapDirty = G.frame; mapRefresh = true; }
}
let mapRefresh = true;

// ---------- attract-mode bot ----------
function botInput() {
  const p = G.p, L = G.L, b = G.bot, inp = { x: 0, y: 0, a: false, b: false, bp: false, start: false, sel: false, pause: false };
  if (p.chan) { inp.a = true; return inp; }
  b.t--; b.shootT--;
  if (b.t <= 0 || !b.tgt || b.tgt.dead || b.tgt.state === "held") {
    b.t = 40; b.tgt = null;
    let bd = 1e9;
    for (const c of G.crew) { if (c.dead || c.state === "held") continue; const d = dist(c, p) * (c.state === "down" ? 0.6 : 1); if (d < bd) { bd = d; b.tgt = c; } }
    b.path = null;
  }
  if (!b.tgt) { if (++b.idle > 200) demoReset(); return inp; }
  b.idle = 0;
  const t = b.tgt, dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy);
  if (d < 13) { inp.a = true; p.fx = dx / d; p.fy = dy / d; p.dir = vecDir(dx, dy); return inp; }
  if (d < 90 && b.shootT <= 0 && p.en >= 2 && t.state !== "down" && rayClear(L, p.x, p.y, t.x, t.y)) {
    b.shootT = 30; p.fx = dx / d; p.fy = dy / d; inp.bp = true;
  }
  let gx = t.x, gy = t.y;
  if (!lineWalkable(L, p.x, p.y, t.x, t.y, p.h)) {
    if (!b.path || --b.rp <= 0) { b.path = findPath(L, Math.floor(p.x / TS), Math.floor(p.y / TS), Math.floor(t.x / TS), Math.floor(t.y / TS)); b.pi = 0; b.rp = 30; }
    if (b.path) { while (b.pi < b.path.length - 1 && Math.hypot(b.path[b.pi].x - p.x, b.path[b.pi].y - p.y) < 5) b.pi++; gx = b.path[b.pi].x; gy = b.path[b.pi].y; }
  }
  const gd = Math.hypot(gx - p.x, gy - p.y) || 1;
  inp.x = (gx - p.x) / gd; inp.y = (gy - p.y) / gd;
  return inp;
}

function demoReset() {
  G.demo = true; G.score = 0;
  startStage(2 + ((Math.random() * 2) | 0), { seed: (Math.random() * 1e6) | 0 });
  G.p.god = true; G.bot = { t: 0, tgt: null, path: null, pi: 0, rp: 0, shootT: 0, idle: 0 };
  Snd.play("title");
}

// ---------- flow ----------
function beginRun() {
  Snd.init();
  G.demo = false; G.seed = (Math.random() * 1e6) | 0; G.score = 0; G.lives = 3; G.nextLife = 10000;
  startStage(1);
  setMode("intro");
  Snd.stop();
}
function retryStage() {
  G.score = G.stageScore;
  startStage(G.n);
  setMode("intro"); Snd.stop();
}
function nextStage() {
  if (G.n >= MAX_STAGE) { finishRun(true); return; }
  startStage(G.n + 1);
  setMode("intro"); Snd.stop();
}
function finishRun(won) {
  if (G.score > G.hi) { G.hi = G.score; try { localStorage.setItem(HI_KEY, String(G.hi)); } catch (e) { /* storage blocked */ } }
  setMode(won ? "win" : "over");
  Snd.play(won ? "win" : "over");
}

function tick() {
  const inp = readInput();
  if (pressed.has("KeyM")) Snd.toggleMute();
  if (pressed.has("KeyF") && document.fullscreenEnabled) { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); }
  G.modeT++;
  switch (G.mode) {
    case "title":
      G.frame++;
      tickWorld(botInput());
      if (inp.start && G.modeT > 20) beginRun();
      break;
    case "intro":
      G.frame++;
      if ((inp.start && G.modeT > 30) || G.modeT > 600) { setMode("play"); Snd.play(G.L.info.boss ? "stage" : "stage"); }
      break;
    case "play":
      if (inp.pause) { setMode("pause"); break; }
      if (inp.sel) G.showMap = !G.showMap;
      tickWorld(inp);
      break;
    case "pause":
      if (inp.pause || inp.start) setMode("play");
      break;
    case "dying":
      G.frame++;
      updateFx(); updateBolts();
      if (G.modeT > 150) { if (G.lives > 0) { G.lives--; setMode("dead"); } else finishRun(false); }
      break;
    case "dead":
      G.frame++;
      if (inp.start && G.modeT > 30) retryStage();
      break;
    case "clear":
      G.frame++;
      updateFx();
      if (inp.start && G.modeT > 90) nextStage();
      break;
    case "over": case "win":
      G.frame++;
      if (inp.start && G.modeT > 90) { demoReset(); setMode("title"); }
      break;
  }
  pressed.clear();
}

let lastT = 0, acc = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000 || 0.016);
  lastT = now; acc += dt;
  let n = 0;
  while (acc >= 1 / 60 && n < 5) { tick(); acc -= 1 / 60; n++; }
  if (acc > 1 / 60) acc = 0;
  render();
  requestAnimationFrame(loop);
}

function boot() {
  try { G.hi = parseInt(localStorage.getItem(HI_KEY), 10) || 0; } catch (e) { G.hi = 0; }
  resize();
  demoReset();
  setMode("title");
  requestAnimationFrame(loop);
}
