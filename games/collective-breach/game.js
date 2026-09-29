"use strict";

// ---- Collective Breach: game state, simulation and 3D scene sync ----
const glCanvas = document.getElementById("gl");
const hudCanvas = document.getElementById("hud");
const hud = hudCanvas.getContext("2d");
let VW = 1, VH = 1, DPR = 1;
const SAFE = { t: 0, r: 0, b: 0, l: 0 };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
const turnTo = (a, b, k) => a - angDiff(a, b) * Math.min(1, k);
const yawToDir = (dx, dz) => Math.atan2(-dx, -dz);

let renderer = null, glFailed = false;
try {
  renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, powerPreference: "high-performance" });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;
  renderer.autoClear = false;
} catch (e) { glFailed = true; }

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02050a);
scene.fog = new THREE.FogExp2(0x03070c, 0.026);
const fpScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(78, 1, 0.05, 160);
camera.rotation.order = "YXZ";
const ambient = new THREE.AmbientLight(0x8aa2c4, 1.05);
scene.add(ambient);
const lightPool = [];
for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xffffff, 1.4, 26, 1.6); l.position.set(0, 3, 0); scene.add(l); lightPool.push(l); }
const glowLight = new THREE.PointLight(0x4dff88, 0.9, 9, 1.5);
scene.add(glowLight);
fpScene.add(new THREE.AmbientLight(0x8fa8c0, 1.0));
const fpKey = new THREE.DirectionalLight(0xbfe8ff, 1.2); fpKey.position.set(0.5, 1, 0.8); fpScene.add(fpKey);

const HI_KEY = "collective-breach:hi";
const MAX_DRONES = 8;
const REACH = 3.6;

const WEAPON = { A: { n: 1, col: 0xffd35a }, B: { n: 2, col: 0xff6a4a }, C: { n: 3, col: 0xc48bff }, D: { n: 0, col: 0x6dff9a } };

const CREW = {
  ensign: { name: "ENSIGN", hp: 30, col: 0xe2b53c, trim: 0x7a5a0c, weapon: "A", dmg: 7, rate: 1.3, spd: 1.5, run: 4.0, assim: 0.9, score: 100, armed: true, pref: 9, dr: { hp: 45, melee: 8 } },
  security: { name: "SECURITY", hp: 65, col: 0xc8413f, trim: 0x5c1717, weapon: "B", dmg: 9, rate: 0.6, spd: 1.6, run: 4.3, assim: 1.2, score: 200, armed: true, pref: 8, dr: { hp: 80, melee: 7, ranged: 9, rate: 0.75 } },
  medic: { name: "MEDIC", hp: 30, col: 0x38c6bd, trim: 0x0d6660, spd: 1.4, run: 4.4, assim: 0.8, score: 150, armed: false, medic: true, dr: { hp: 40, melee: 5, heal: true } },
  scientist: { name: "SCIENTIST", hp: 24, col: 0x5f8dff, trim: 0x22409a, spd: 1.3, run: 4.6, assim: 0.7, score: 150, armed: false, dr: { hp: 35, melee: 5, sci: true } },
  officer: { name: "OFFICER", hp: 110, col: 0xe8dcc0, trim: 0xc9922a, weapon: "C", dmg: 12, rate: 1.3, spd: 1.5, run: 3.8, assim: 1.8, score: 500, armed: true, pref: 9, dr: { hp: 120, melee: 12, ranged: 14, rate: 1 } },
  captain: { name: "CAPTAIN", hp: 170, col: 0x2c46b5, trim: 0xf2c14e, weapon: "C", dmg: 14, rate: 1.0, spd: 1.5, run: 3.9, assim: 2.6, score: 2500, armed: true, pref: 8, big: 1.12, dr: { hp: 220, melee: 16, ranged: 18, rate: 0.85 } },
};
const SKINS = [0xf0c8a0, 0xd9a07a, 0xa9714f, 0x7a4b34, 0xe8d2b8, 0xb9d3a8];
const HAIRS = [0x2a1c14, 0x5a3b22, 0x111111, 0xb89a4a, 0x7a2c1c, 0xc9c9c9];

const KEYS = [
  { id: "coil", name: "WARP COIL", short: "COIL", col: 0xff8a3d },
  { id: "crystal", name: "DEFLECTOR CRYSTAL", short: "CRYSTAL", col: 0x5fe3ff },
  { id: "core", name: "ISOLINEAR CORE", short: "CORE", col: 0x7dff8a },
  { id: "injector", name: "PLASMA INJECTOR", short: "INJECTOR", col: 0xff5c7a },
  { id: "array", name: "SENSOR ARRAY", short: "ARRAY", col: 0x8aa4ff },
];

const ROOM_CREW = {
  QUARTERS: ["ensign", "ensign", "scientist"], MESS: ["ensign", "ensign", "medic", "ensign"], LAB: ["scientist", "scientist", "ensign"],
  SICKBAY: ["medic", "medic", "scientist"], ARMORY: ["security", "security", "security"], CARGO: ["ensign", "security"], HALL: ["ensign", "security"],
  ENGINE: ["ensign", "security", "ensign"], BRIDGE: ["officer", "officer", "security", "ensign"], TRANSPORTER: [],
};

const G = {
  mode: "attract", t: 0, modeT: 0, deckIdx: 0, lives: 3, score: 0, hi: 0, runSeed: 1, deckStartScore: 0,
  L: null, levelGroup: null, p: null, crew: [], drones: [], bolts: [], items: [],
  log: [], alert: 0, alertPos: null, reinT: 8, reinCount: 0, shake: 0, flash: 0, hurt: 0, hurtDir: 0, hs: 1,
  assimCount: 0, silentCount: 0, quota: 0, initialCrew: 0, captain: null, keyTaken: 0, keyTotal: 0, online: false,
  deckT: 0, stats: {}, cand: null, prompt: "", hintT: 0, demoT: 0, orbit: 0, locked: false, usedLock: false, lightT: 0,
  bot: { t: 0, tgt: null, scanT: 5, idle: 0 }, scanPulse: 99, dmgFlash: 0,
};

// ---------- input ----------
const keys = new Set(), pressed = new Set();
const mouse = { dx: 0, dy: 0, down: false, right: false };

addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)) e.preventDefault();
  if (!keys.has(e.code)) pressed.add(e.code);
  keys.add(e.code);
  Snd.init();
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => { keys.clear(); mouse.down = mouse.right = false; if (G.mode === "play") setMode("paused"); });
addEventListener("contextmenu", (e) => e.preventDefault());
hudCanvas.addEventListener("pointerdown", (e) => {
  Snd.init();
  pressed.add("Click");
  if (G.mode === "play" && !G.locked) lockMouse();
  if (e.button === 2) mouse.right = true; else mouse.down = true;
});
addEventListener("pointerup", (e) => { if (e.button === 2) mouse.right = false; else mouse.down = false; });
addEventListener("mousemove", (e) => {
  if (G.locked) { mouse.dx += e.movementX || 0; mouse.dy += e.movementY || 0; }
});
document.addEventListener("pointerlockchange", () => {
  const was = G.locked;
  G.locked = document.pointerLockElement === hudCanvas;
  if (was && !G.locked && G.mode === "play") setMode("paused");
});

function lockMouse() {
  try {
    const r = hudCanvas.requestPointerLock && hudCanvas.requestPointerLock();
    if (r && r.catch) r.catch(() => {});
    G.usedLock = true;
  } catch (e) { G.usedLock = false; }
}

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  VW = window.innerWidth; VH = window.innerHeight;
  if (renderer) { renderer.setPixelRatio(DPR); renderer.setSize(VW, VH, false); }
  hudCanvas.width = Math.round(VW * DPR); hudCanvas.height = Math.round(VH * DPR);
  camera.aspect = VW / VH; camera.updateProjectionMatrix();
  G.hs = clamp(Math.min(VW / 1280, VH / 720), 0.6, 1.5);
  const cs = getComputedStyle(document.getElementById("safe"));
  SAFE.t = parseFloat(cs.paddingTop) || 0; SAFE.r = parseFloat(cs.paddingRight) || 0;
  SAFE.b = parseFloat(cs.paddingBottom) || 0; SAFE.l = parseFloat(cs.paddingLeft) || 0;
}
addEventListener("resize", resize);

// ---------- helpers ----------
function logMsg(text, col) { G.log.unshift({ t: G.t, text, col: col || "#7dffa8" }); if (G.log.length > 6) G.log.pop(); }
function setMode(m) {
  G.mode = m; G.modeT = 0;
  document.body.dataset.ui = m === "attract" || m === "paused" || m === "gameover" || m === "victory" ? "menu" : "play";
  if (m !== "play" && document.pointerLockElement) document.exitPointerLock();
}
const distXZ = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const hexCss = (h) => "#" + h.toString(16).padStart(6, "0");
const listenerDist = (x, z) => Math.hypot(x - G.p.x, z - G.p.z);

// ---------- effects: particles, decals, bolts ----------
const PN = 900;
const partPos = new Float32Array(PN * 3), partCol = new Float32Array(PN * 3);
const parts = Array.from({ length: PN }, () => ({ life: 0, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, r: 0, g: 0, b: 0, max: 1, grav: 0 }));
let partHead = 0;
const partGeo = new THREE.BufferGeometry();
partGeo.setAttribute("position", new THREE.BufferAttribute(partPos, 3));
partGeo.setAttribute("color", new THREE.BufferAttribute(partCol, 3));
const partPoints = new THREE.Points(partGeo, new THREE.PointsMaterial({ size: 0.16, map: null, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
partPoints.frustumCulled = false;
scene.add(partPoints);

function spark(x, y, z, n, hex, speed, life, grav) {
  const c = new THREE.Color(hex);
  for (let i = 0; i < n; i++) {
    const q = parts[partHead = (partHead + 1) % PN], a = Math.random() * TAU, u = Math.random() * 2 - 1, s = speed * rand(0.3, 1), k = Math.sqrt(1 - u * u);
    q.x = x; q.y = y; q.z = z; q.vx = Math.cos(a) * k * s; q.vy = u * s; q.vz = Math.sin(a) * k * s;
    q.max = q.life = life * rand(0.6, 1); q.r = c.r; q.g = c.g; q.b = c.b; q.grav = grav || 0;
  }
}

function updateParts(dt) {
  for (let i = 0; i < PN; i++) {
    const q = parts[i];
    if (q.life > 0) {
      q.life -= dt; q.vy -= q.grav * dt; q.vx *= 1 - dt * 1.5; q.vz *= 1 - dt * 1.5;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      const f = Math.max(0, q.life / q.max);
      partPos[i * 3] = q.x; partPos[i * 3 + 1] = q.y; partPos[i * 3 + 2] = q.z;
      partCol[i * 3] = q.r * f; partCol[i * 3 + 1] = q.g * f; partCol[i * 3 + 2] = q.b * f;
    } else { partPos[i * 3 + 1] = -99; }
  }
  partGeo.attributes.position.needsUpdate = true; partGeo.attributes.color.needsUpdate = true;
}

const DECALS = 240;
const decalMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.85 }), DECALS);
decalMesh.frustumCulled = false; decalMesh.count = 0;
let decalHead = 0, decalCount = 0;
function addDecal(x, z, size) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.random() * TAU, 0));
  m.compose(new THREE.Vector3(x, 0.03 + Math.random() * 0.01, z), q, new THREE.Vector3(size, 1, size));
  decalMesh.setMatrixAt(decalHead, m);
  decalHead = (decalHead + 1) % DECALS; decalCount = Math.min(DECALS, decalCount + 1);
  decalMesh.count = decalCount; decalMesh.instanceMatrix.needsUpdate = true;
}
function clearDecals() { decalHead = 0; decalCount = 0; decalMesh.count = 0; }

const boltPools = {};
function boltMesh(type) {
  const pool = boltPools[type] || (boltPools[type] = { free: [], mat: new THREE.MeshBasicMaterial({ color: WEAPON[type].col }) });
  let m = pool.free.pop();
  if (!m) {
    m = new THREE.Group();
    m.add(new THREE.Mesh(gBox(0.07, 0.07, 0.7), pool.mat), glowSprite(WEAPON[type].col, 0.9, 0.9));
    m.userData.type = type;
    scene.add(m);
  }
  m.visible = true;
  return m;
}
function freeBolt(b) { b.mesh.visible = false; boltPools[b.type].free.push(b.mesh); }

function shoot(x, y, z, dx, dy, dz, speed, dmg, type, owner, src) {
  const l = Math.hypot(dx, dy, dz) || 1, mesh = boltMesh(type);
  G.bolts.push({ x, y, z, vx: (dx / l) * speed, vy: (dy / l) * speed, vz: (dz / l) * speed, dmg, type, owner, src, life: 2.6, mesh });
}

// ---------- building the level ----------
function disposeGroup(g) {
  const cachedG = new Set(Object.values(_gc)), cachedM = new Set(Object.values(_mc));
  g.traverse((o) => {
    if (o.geometry && !cachedG.has(o.geometry)) o.geometry.dispose();
    if (o.material && !cachedM.has(o.material)) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); }
  });
}

function clearLevel() {
  if (G.levelGroup) { scene.remove(G.levelGroup); disposeGroup(G.levelGroup); G.levelGroup = null; }
  for (const c of G.crew) scene.remove(c.model.g);
  for (const d of G.drones) scene.remove(d.model.g);
  for (const b of G.bolts) freeBolt(b);
  for (const it of G.items) scene.remove(it.g);
  if (G.p && G.p.model) scene.remove(G.p.model.g);
  clearDecals();
  for (const q of parts) q.life = 0;
}

function makeDroneFrom(c) {
  const dr = c.d.dr, model = buildBorg(c.d.col, c.d.big);
  scene.add(model.g);
  return { k: c.k, d: c.d, dr, x: c.x, z: c.z, r: 0.38 * (c.d.big || 1), ang: c.ang, hp: dr.hp, max: dr.hp, cd: rand(0, 1), tgt: null, scanT: 0, path: null, pi: 0, rp: 0, anim: rand(0, 6), spawn: 1, flash: 0, dead: false, model, moveSpd: 0 };
}

function makeCrew(kind, x, z, room) {
  const d = CREW[kind], model = buildCrew(d, pick(SKINS), pick(HAIRS));
  scene.add(model.g);
  return {
    k: kind, d, x, z, ang: rand(0, TAU), r: 0.38 * (d.big || 1), hp: d.hp, state: "patrol", aware: 0, anim: rand(0, 6), path: null, pi: 0, rp: 0,
    wp: null, idle: rand(0, 2), fireCD: rand(0.5, 1.5), home: room, strafe: Math.random() < 0.5 ? 1 : -1, downT: 0, held: 0, silent: false,
    lastSeen: null, lostT: 0, tgt: null, tgtT: Math.random() * 0.25, flash: 0, look: 0, inv: null, invT: 0, fleeT: 0, fleeGoal: null, rpF: 0,
    medT: Math.random(), rv: null, revT: 0, dur: d.assim, dead: false, alarmed: false, prev: "patrol", model, moveSpd: 0, fall: 0, patT: 0,
  };
}

function newPlayer(x, z) {
  const model = buildBorg(0x2a3038);
  model.g.visible = false; scene.add(model.g);
  return {
    x, z, r: 0.4, yaw: Math.PI, pitch: 0, vx: 0, vz: 0, hp: 100, max: 100, energy: 100, stamina: 100, hurtT: 0, chan: null, scanCD: 3, scanT: 0,
    adapt: { A: 0, B: 0, C: 0 }, tier: { A: 0, B: 0, C: 0 }, god: false, dead: false, bob: 0, fireCD: 0, model, moveSpd: 0, path: null, pi: 0, rp: 0,
    tubT: 0, noiseT: 0, kick: 0,
  };
}

function initDeck(idx, opts) {
  opts = opts || {};
  clearLevel();
  const seed = opts.seed != null ? opts.seed : G.runSeed * 31 + idx * 7919 + 13;
  const L = genLevel(idx, seed), rng = L.rng, cfg = L.cfg;
  const rpick = (a) => a[(rng() * a.length) | 0];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  G.L = L; G.deckIdx = idx;
  G.levelGroup = buildLevelMeshes(L);
  scene.add(G.levelGroup);
  if (!decalMesh.parent) { decalMesh.material.map = TEX.nanite; decalMesh.material.needsUpdate = true; scene.add(decalMesh); }

  const sr = L.rooms[L.startRoom], sc = roomCentre(sr);
  G.p = newPlayer(sc.x, sc.z);
  Object.assign(G, { crew: [], drones: [], bolts: [], items: [], log: [], alert: 0, alertPos: null, reinT: 8, reinCount: 0, shake: 0, flash: 0, hurt: 0, assimCount: 0, silentCount: 0, deckT: 0, online: false, captain: null, keyTaken: 0, hintT: 0, cand: null, scanPulse: 99, prompt: "" });

  let pool = [];
  for (const rm of L.rooms) for (let k of ROOM_CREW[rm.type]) {
    if (idx === 0 && k === "officer") k = "security";
    if (k === "ensign" && rm.type === "ENGINE" && idx >= 1) k = "officer";
    if (k === "ensign" && idx >= 2 && rng() < 0.3) k = "security";
    pool.push([k, rm]);
  }
  shuffle(pool); pool = pool.slice(0, cfg.crew);
  const avail = L.rooms.filter((r) => r.id !== L.startRoom);
  while (pool.length < cfg.crew) pool.push([rng() < 0.6 ? "ensign" : "security", rpick(avail)]);
  for (const [k, rm] of pool) { const s = spotPos(L, rpick(rm.spots)); G.crew.push(makeCrew(k, s.x, s.z, rm)); }
  if (L.bridgeRoom >= 0) {
    const br = L.rooms[L.bridgeRoom], bc = roomCentre(br);
    G.captain = makeCrew("captain", bc.x, bc.z - 3 * TILE, br); G.captain.ang = 0;
    G.crew.push(G.captain);
  }
  G.initialCrew = G.crew.length; G.quota = Math.ceil(G.initialCrew * 0.55);

  const withSpots = shuffle(avail.filter((r) => r.itemSpots.length > 0));
  const ks = shuffle(KEYS.slice()).slice(0, cfg.keys);
  const addItem = (type, def, rm) => {
    const s = spotPos(L, rpick(rm.itemSpots)), col = def ? def.col : type === "cell" ? 0x3dff7a : 0x39c8ff;
    const g = buildItem(def ? def.id : type, col);
    if (def) { const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 9, 8, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })); beam.position.y = 4; g.add(beam); }
    scene.add(g);
    G.items.push({ type, def, x: s.x, z: s.z, taken: false, g, ph: rng() * 6 });
  };
  ks.forEach((kd, i) => addItem("key", kd, withSpots[i % withSpots.length]));
  G.keyTotal = ks.length;
  for (let i = 0; i < 3; i++) addItem("cell", null, rpick(withSpots));
  for (let i = 0; i < 3; i++) addItem("ecell", null, rpick(withSpots));

  G.lightT = 0;
  revealFrom(L, G.p.x, G.p.z, 40);
  camSnap();
}

function objDone() {
  return G.keyTaken >= G.keyTotal && G.assimCount >= G.quota && (!G.captain || G.captain.assimilated);
}

// ---------- flow ----------
function enterAttract() {
  G.runSeed = (Math.random() * 1e6) | 0;
  initDeck(1, { seed: (Math.random() * 1e6) | 0 });
  G.p.god = true; G.p.model.g.visible = true;
  G.bot = { t: 0, tgt: null, scanT: 5, idle: 0 }; G.demoT = 0;
  setMode("attract");
}

function startRun() {
  Snd.init();
  G.runSeed = (Math.random() * 1e6) | 0;
  G.score = 0; G.lives = 3; G.deckStartScore = 0;
  initDeck(0); setMode("briefing");
  Snd.speak("Resistance is futile.");
}
function retryDeck() { G.score = G.deckStartScore; initDeck(G.deckIdx); setMode("briefing"); }
function nextDeck() {
  if (G.deckIdx >= DECKS.length - 1) { finishRun(true); return; }
  G.deckStartScore = G.score; initDeck(G.deckIdx + 1); setMode("briefing");
  Snd.speak("Proceed to the next deck.");
}
function finishRun(won) {
  if (G.score > G.hi) { G.hi = G.score; try { localStorage.setItem(HI_KEY, String(G.hi)); } catch (e) { /* storage blocked */ } }
  setMode(won ? "victory" : "gameover");
  if (won) Snd.speak("Efficiency achieved.");
}
function deckClear() {
  let conv = 0, tot = 0;
  for (let i = 0; i < G.L.N; i++) if (G.L.tiles[i] === TT.FLOOR) { tot++; if (G.L.seen[i]) conv++; }
  const bonus = Math.max(0, Math.round(3000 - G.deckT * 8)) + Math.round((tot ? conv / tot : 0) * 1500);
  G.score += bonus;
  G.stats = { assim: G.assimCount, total: G.initialCrew, silent: G.silentCount, time: G.deckT, explored: tot ? conv / tot : 0, bonus, drones: G.drones.length };
  Snd.warp(); setMode("clear");
}
function killPlayer() {
  const p = G.p; p.dead = true; p.hp = 0;
  if (p.chan) releaseTarget();
  Snd.channel(null); Snd.death();
  spark(p.x, 1.2, p.z, 60, 0x6dff9a, 6, 1.2, 4);
  G.shake = 1.4; setMode("dying");
}

function handleMenus() {
  const go = pressed.has("Enter") || pressed.has("Space") || pressed.has("Click");
  if (pressed.has("KeyM")) Snd.toggleMute();
  if (pressed.has("KeyF") && document.fullscreenEnabled && G.mode !== "play") {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
  }
  switch (G.mode) {
    case "attract": if (go && G.modeT > 0.3) startRun(); break;
    case "briefing": if ((go && G.modeT > 0.5) || G.modeT > 25) { setMode("play"); lockMouse(); Snd.blip(); } break;
    case "play": if (pressed.has("Escape") || pressed.has("KeyP")) setMode("paused"); break;
    case "paused": if (pressed.has("Enter") || pressed.has("Click") || pressed.has("Escape")) { setMode("play"); lockMouse(); } break;
    case "clear": if (go && G.modeT > 0.8) nextDeck(); break;
    case "dead": if (go && G.modeT > 0.6) retryDeck(); break;
    case "gameover": case "victory": if (go && G.modeT > 1.2) enterAttract(); break;
  }
}

// ---------- assimilation ----------
function camForward() { const p = G.p, cp = Math.cos(p.pitch); return { x: -Math.sin(p.yaw) * cp, y: Math.sin(p.pitch), z: -Math.cos(p.yaw) * cp }; }

function findTarget() {
  const p = G.p, f = camForward();
  let best = null, bt = 1e9;
  for (const c of G.crew) {
    if (c.dead || c.state === "held") continue;
    const cy = c.state === "down" ? 0.35 : 1.2, vx = c.x - p.x, vy = cy - EYE, vz = c.z - p.z;
    const t = vx * f.x + vy * f.y + vz * f.z;
    if (t < 0.2 || t > REACH) continue;
    const px = vx - f.x * t, py = vy - f.y * t, pz = vz - f.z * t;
    if (Math.hypot(px, py, pz) > (c.state === "down" ? 0.9 : 0.62)) continue;
    if (!hasLOS(G.L, p.x, p.z, c.x, c.z)) continue;
    if (t < bt) { bt = t; best = c; }
  }
  return best;
}

function beginAssim(c) {
  const p = G.p, wasDown = c.state === "down";
  c.prev = c.state;
  c.silent = !wasDown && c.aware < 0.5 && (c.state === "patrol" || c.state === "investigate" || c.state === "revive");
  c.dur = c.d.assim * (wasDown ? 0.25 : c.silent ? 0.55 : 1);
  c.state = "held"; c.held = 0; p.chan = c;
  if (!c.silent && !wasDown) makeNoise(c.x, c.z, 28);
  Snd.thud();
}

function releaseTarget() {
  const p = G.p, c = p.chan;
  if (c) {
    c.state = c.prev === "down" ? "down" : c.d.armed ? "combat" : "flee";
    c.held = 0; c.aware = 1;
    if (c.state !== "down") raiseAlert();
    c.model.shell.material.opacity = 0;
  }
  p.chan = null; Snd.channel(null);
}

function finishAssim(c) {
  const p = G.p;
  c.dead = true; c.assimilated = true; p.chan = null;
  Snd.channel(null); Snd.assimilated(0);
  const pts = Math.round(c.d.score * (c.silent ? 1.5 : 1));
  G.score += pts; G.assimCount++;
  if (c.silent) G.silentCount++;
  if (G.drones.length < MAX_DRONES) G.drones.push(makeDroneFrom(c));
  p.hp = Math.min(p.max, p.hp + 8); p.energy = Math.min(100, p.energy + 12);
  spark(c.x, 1.2, c.z, 60, 0x6dff9a, 5, 1.0, 1);
  for (let i = 0; i < 7; i++) addDecal(c.x + rand(-3, 3), c.z + rand(-3, 3), rand(1.2, 2.6));
  logMsg(c.d.name + " ASSIMILATED" + (c.silent ? " - SILENT (+" + pts + ")" : " (+" + pts + ")"));
  G.flash = 0.35; G.shake = Math.max(G.shake, 0.5);
  if (c.k === "captain") { logMsg("THE CAPTAIN IS ONE OF US", "#ffe27a"); Snd.speak("The captain has joined the collective."); }
}

function makeNoise(x, z, r) {
  for (const c of G.crew) {
    if (c.dead || c.state === "down" || c.state === "held" || c.state === "combat" || c.state === "flee") continue;
    if (Math.hypot(c.x - x, c.z - z) < r) setInvestigate(c, x, z, 0.45);
  }
}
function setInvestigate(c, x, z, aware) {
  c.state = "investigate"; c.inv = { x, z }; c.path = null; c.invT = 14; c.look = 0;
  if (aware) c.aware = Math.max(c.aware, aware);
}
function raiseAlert() {
  const p = G.p;
  if (G.alert <= 0) { logMsg("RED ALERT - INTRUDER ON BOARD", "#ff6a5a"); Snd.alarm(); }
  G.alert = Math.max(G.alert, 16); G.alertPos = { x: p.x, z: p.z };
}
function enterCombat(c) {
  c.state = c.d.armed ? "combat" : "flee";
  c.lostT = 0; c.aware = 1; c.fleeT = 5; c.path = null;
  if (!c.alarmed) { c.alarmed = true; Snd.spot(listenerDist(c.x, c.z)); }
  raiseAlert();
}

// ---------- damage ----------
function hurtPlayer(dmg, type, fromX, fromZ) {
  const p = G.p;
  if (p.dead) return;
  const eff = dmg * (1 - p.adapt[type]);
  if (!p.god) p.hp -= eff;
  p.adapt[type] = Math.min(0.8, p.adapt[type] + 0.1);
  const tier = Math.floor(p.adapt[type] / 0.3);
  if (tier > p.tier[type]) { p.tier[type] = tier; logMsg("ADAPTED TO TYPE-" + WEAPON[type].n + " PHASERS: -" + Math.round(p.adapt[type] * 100) + "% DAMAGE", "#9dd6ff"); }
  p.hurtT = 3; G.hurt = 0.4; G.shake = Math.max(G.shake, 0.4);
  if (fromX != null) G.hurtDir = Math.atan2(fromX - p.x, fromZ - p.z);
  Snd.hit();
  if (p.god && p.hp < 50) p.hp = p.max;
  if (p.hp <= 0 && G.mode === "play") killPlayer();
}
function hurtDrone(d, dmg) {
  if (d.dead) return;
  d.hp -= dmg; d.flash = 0.12; spark(d.x, 1.2, d.z, 5, 0x6dff9a, 3, 0.3);
  if (d.hp <= 0) { d.dead = true; spark(d.x, 1.0, d.z, 30, 0x6dff9a, 4, 0.8, 3); logMsg("DRONE LOST", "#ffb08a"); }
}
function downCrew(c) {
  if (c === G.p.chan) { G.p.chan = null; Snd.channel(null); }
  c.state = "down"; c.downT = 11; c.hp = 0; c.path = null;
}
function hurtCrew(c, dmg, src) {
  if (c.dead || c.state === "down" || c.state === "held") return;
  c.hp -= dmg; c.flash = 0.15; spark(c.x, 1.3, c.z, 6, 0xffd0a0, 2.5, 0.3);
  Snd.hurtCrew(listenerDist(c.x, c.z));
  if (c.hp <= 0) { downCrew(c); return; }
  if (c.state !== "combat" && c.state !== "flee") { if (src && src !== G.p) c.tgt = src; enterCombat(c); }
}

// ---------- movement helpers ----------
function goTo(e, tx, tz, spd, dt) {
  const L = G.L;
  let gx = tx, gz = tz;
  e.rp -= dt;
  if (!clearLine(L, e.x, e.z, tx, tz, e.r)) {
    if (e.rp <= 0 || !e.path) { e.path = findPath(L, e.x, e.z, tx, tz); e.pi = 0; e.rp = 0.5 + Math.random() * 0.3; }
    if (e.path) {
      while (e.pi < e.path.length - 1 && Math.hypot(e.path[e.pi].x - e.x, e.path[e.pi].z - e.z) < 0.9) e.pi++;
      gx = e.path[e.pi].x; gz = e.path[e.pi].z;
    }
  } else e.path = null;
  const dx = gx - e.x, dz = gz - e.z, d = Math.hypot(dx, dz);
  if (d > 0.05) {
    slide(L, e, (dx / d) * spd * dt, (dz / d) * spd * dt, e.r);
    e.ang = turnTo(e.ang, Math.atan2(dx, dz), dt * 8);
    e.moveSpd = spd;
  }
  return Math.hypot(tx - e.x, tz - e.z);
}
function pickWaypoint(c) {
  const L = G.L; let rm = c.home;
  if (Math.random() < 0.25 && rm.links.length) rm = L.rooms[pick(rm.links)];
  return rm.spots.length ? spotPos(L, pick(rm.spots)) : { x: c.x, z: c.z };
}
function chooseTarget(c, sees) {
  if (sees) return G.p;
  let best = null, bd = 22;
  for (const d of G.drones) {
    if (d.dead) continue;
    const dd = Math.hypot(d.x - c.x, d.z - c.z);
    if (dd < bd && hasLOS(G.L, c.x, c.z, d.x, d.z)) { bd = dd; best = d; }
  }
  return best;
}

// ---------- crew AI ----------
function updateCrew(c, dt) {
  const p = G.p, L = G.L;
  c.anim += dt; c.flash = Math.max(0, c.flash - dt); c.moveSpd = 0;
  if (c.state === "down") {
    c.downT -= dt;
    if (c.downT <= 0) { c.hp = c.d.hp * 0.45; setInvestigate(c, p.x, p.z, 0.5); }
    return;
  }
  if (c.state === "held") return;
  c.fireCD -= dt;

  const dx = p.x - c.x, dz = p.z - c.z, dP = Math.hypot(dx, dz), engaged = c.state === "combat" || c.state === "flee";
  let sees = false;
  if (!p.dead && dP < (G.alert > 0 ? 32 : 24) && hasLOS(L, c.x, c.z, p.x, p.z)) {
    if (engaged || dP < 5 || (G.alert > 0 && dP < 18) || Math.abs(angDiff(Math.atan2(dx, dz), c.ang)) < 1.1) sees = true;
  }
  if (sees) {
    c.aware = Math.min(1, c.aware + dt * (dP < 7 ? 3 : dP < 14 ? 1.5 : 0.8) * (G.alert > 0 ? 2 : 1));
    c.lastSeen = { x: p.x, z: p.z };
    if (c.aware >= 1 && !engaged) enterCombat(c);
    if (c.state === "combat" || c.state === "flee") { G.alert = Math.max(G.alert, 14); G.alertPos = { x: p.x, z: p.z }; }
  } else c.aware = Math.max(0, c.aware - dt * 0.3);

  c.tgtT -= dt;
  if (c.tgtT <= 0) {
    c.tgtT = 0.25; c.tgt = chooseTarget(c, sees);
    if (c.tgt && c.tgt !== p && !engaged) enterCombat(c);
  }

  switch (c.state) {
    case "patrol": {
      if (G.alert > 0 && G.alertPos) { setInvestigate(c, G.alertPos.x, G.alertPos.z, 0); break; }
      if (c.d.medic) {
        c.medT -= dt;
        if (c.medT <= 0) {
          c.medT = 1;
          let best = null, bd = 40;
          for (const o of G.crew) if (!o.dead && o.state === "down") { const d = Math.hypot(o.x - c.x, o.z - c.z); if (d < bd) { bd = d; best = o; } }
          if (best) { c.state = "revive"; c.rv = best; c.revT = 0; c.path = null; break; }
        }
      }
      if (!c.wp) {
        if (c.idle > 0) { c.idle -= dt; c.ang += Math.sin(c.anim * 1.3) * dt * 0.6; break; }
        c.wp = pickWaypoint(c); c.path = null; c.patT = 16;
      }
      c.patT -= dt;
      const d = goTo(c, c.wp.x, c.wp.z, c.d.spd, dt);
      if (d < 1.0 || c.patT <= 0) { c.wp = null; c.idle = rand(1, 3.5); }
      break;
    }
    case "investigate": {
      c.invT -= dt;
      if (c.look > 0) { c.look -= dt; c.ang += Math.sin(c.anim * 2.2) * dt * 1.6; if (c.look <= 0) { c.state = "patrol"; c.wp = null; } break; }
      const d = goTo(c, c.inv.x, c.inv.z, c.d.spd * 1.7, dt);
      if (d < 1.4) c.look = 1.8; else if (c.invT <= 0) { c.state = "patrol"; c.wp = null; }
      break;
    }
    case "revive": {
      const o = c.rv;
      if (!o || o.dead || o.state !== "down") { c.state = "patrol"; c.wp = null; break; }
      goTo(c, o.x, o.z, c.d.run * 0.8, dt);
      if (Math.hypot(o.x - c.x, o.z - c.z) < 1.5) {
        c.revT += dt;
        if (Math.random() < dt * 14) spark(o.x, 0.4, o.z, 1, 0x7ff3ff, 1.4, 0.6);
        if (c.revT > 1.6) { o.hp = o.d.hp * 0.5; setInvestigate(o, p.x, p.z, 0.6); logMsg("A MEDIC REVIVED A CREWMAN", "#7ff3ff"); c.state = "patrol"; c.wp = null; }
      }
      break;
    }
    case "flee": {
      c.rpF -= dt; c.fleeT -= dt;
      if (sees) c.fleeT = 4;
      if (!c.fleeGoal || c.rpF <= 0) {
        let best = null, bd = -1;
        for (let i = 0; i < 5; i++) { const rm = pick(L.rooms), d = Math.hypot((rm.cx + 1) * TILE - p.x, (rm.cy + 1) * TILE - p.z); if (d > bd) { bd = d; best = rm; } }
        c.fleeGoal = roomCentre(best); c.rpF = 3;
      }
      goTo(c, c.fleeGoal.x, c.fleeGoal.z, c.d.run, dt);
      if (!sees && c.fleeT <= 0) { c.state = "patrol"; c.wp = null; c.fleeGoal = null; }
      break;
    }
    case "combat": {
      const t = c.tgt;
      if (t) {
        const tx = t.x - c.x, tz = t.z - c.z, d = Math.hypot(tx, tz), a = Math.atan2(tx, tz);
        c.ang = turnTo(c.ang, a, dt * 9); c.lostT = 0;
        const pref = c.d.pref;
        if (d > pref + 2.5) goTo(c, t.x, t.z, c.d.run, dt);
        else if (d < pref - 3.5) { slide(L, c, -Math.sin(a) * c.d.spd * dt * 1.5, -Math.cos(a) * c.d.spd * dt * 1.5, c.r); c.moveSpd = c.d.spd; }
        else {
          slide(L, c, Math.cos(a) * c.strafe * 2.4 * dt, -Math.sin(a) * c.strafe * 2.4 * dt, c.r); c.moveSpd = 2.4;
          if (Math.random() < dt * 0.5) c.strafe *= -1;
        }
        if (c.fireCD <= 0 && Math.abs(angDiff(a, c.ang)) < 0.25 && d < 26) crewFire(c, t, d);
      } else {
        c.lostT += dt;
        if (c.lastSeen) goTo(c, c.lastSeen.x, c.lastSeen.z, c.d.run * 0.8, dt);
        if (c.lostT > 3) { const ls = c.lastSeen || { x: c.x, z: c.z }; setInvestigate(c, ls.x, ls.z, 0.4); }
      }
      break;
    }
  }
}

function crewFire(c, t, d) {
  const df = c.d, diff = 1 + G.deckIdx * 0.12;
  c.fireCD = (df.rate * rand(1, 1.4)) / (0.9 + G.deckIdx * 0.08);
  const sx = c.x + Math.sin(c.ang) * 0.5, sz = c.z + Math.cos(c.ang) * 0.5, sy = 1.35 * (c.d.big || 1);
  const ty = t === G.p ? 1.25 : 1.2, dx = t.x - sx, dz = t.z - sz, dy = ty - sy;
  const fire = (ox) => {
    const a = Math.atan2(dx, dz) + ox + rand(-0.03, 0.03), h = Math.hypot(dx, dz);
    shoot(sx, sy, sz, Math.sin(a) * h + rand(-0.15, 0.15), dy + rand(-0.15, 0.15), Math.cos(a) * h, 20, df.dmg * diff, df.weapon, "crew", c);
  };
  if (df.weapon === "C") { fire(-0.09); fire(0); fire(0.09); } else fire(rand(-0.03, 0.03));
  Snd.phaser(df.weapon, listenerDist(c.x, c.z));
}

// ---------- drones ----------
function updateDrone(d, dt) {
  const p = G.p, L = G.L;
  d.anim += dt; d.flash = Math.max(0, d.flash - dt); d.spawn = Math.max(0, d.spawn - dt * 1.5); d.cd -= dt; d.scanT -= dt; d.moveSpd = 0;
  if (d.scanT <= 0) {
    d.scanT = 0.2 + Math.random() * 0.1;
    let best = null, bd = 24;
    for (const c of G.crew) {
      if (c.dead || c.state === "down" || c.state === "held") continue;
      const dd = Math.hypot(c.x - d.x, c.z - d.z);
      if (dd < bd && hasLOS(L, d.x, d.z, c.x, c.z)) { bd = dd; best = c; }
    }
    d.tgt = best;
  }
  if (d.tgt && (d.tgt.dead || d.tgt.state === "down" || d.tgt.state === "held")) d.tgt = null;
  const t = d.tgt;
  if (t) {
    const dx = t.x - d.x, dz = t.z - d.z, dist = Math.hypot(dx, dz), a = Math.atan2(dx, dz);
    if (d.dr.ranged) {
      d.ang = turnTo(d.ang, a, dt * 9);
      if (dist > 10) goTo(d, t.x, t.z, 4.2, dt);
      else if (dist < 5) { slide(L, d, -Math.sin(a) * 2.5 * dt, -Math.cos(a) * 2.5 * dt, d.r); d.moveSpd = 2.5; }
      if (d.cd <= 0 && dist < 22 && Math.abs(angDiff(a, d.ang)) < 0.3) {
        d.cd = d.dr.rate * rand(1, 1.3);
        shoot(d.x + Math.sin(d.ang) * 0.5, 1.35, d.z + Math.cos(d.ang) * 0.5, dx, 1.2 - 1.35, dz, 24, d.dr.ranged, "D", "drone", d);
        Snd.dronePulse(listenerDist(d.x, d.z));
      }
    } else {
      goTo(d, t.x, t.z, 4.6, dt);
      if (dist < 1.6 && d.cd <= 0) { d.cd = 0.7; hurtCrew(t, d.dr.melee, d); d.ang = a; spark(t.x, 1.2, t.z, 6, 0x9dffb8, 3, 0.3); }
    }
  } else {
    const idx = G.drones.indexOf(d), n = G.drones.length;
    const ang = p.yaw + (idx - (n - 1) / 2) * 0.5, rad = 3 + (idx % 3) * 1.2;
    const tx = p.x + Math.sin(ang) * rad, tz = p.z + Math.cos(ang) * rad;
    if (Math.hypot(tx - d.x, tz - d.z) > 1.0) goTo(d, tx, tz, 5, dt); else d.ang = turnTo(d.ang, p.yaw + Math.PI, dt * 4);
  }
  if (d.dr.heal && !p.dead && Math.hypot(p.x - d.x, p.z - d.z) < 8) p.hp = Math.min(p.max, p.hp + 3 * dt);
}

// ---------- player ----------
function doScan() {
  const p = G.p;
  p.scanCD = 12; p.scanT = 5; G.scanPulse = 0; Snd.scan();
  revealFrom(G.L, p.x, p.z, 80);
}

function updatePlayer(dt, inp) {
  const p = G.p, L = G.L;
  if (p.dead) { p.vx = p.vz = 0; return; }
  if (inp.yaw != null) p.yaw = turnTo(p.yaw, inp.yaw, dt * 8);
  const boosting = inp.boost && p.stamina > 4 && (inp.wx || inp.wz);
  p.stamina = clamp(p.stamina + (boosting ? -32 : 16) * dt, 0, 100);
  const spd = (boosting ? 7.0 : 4.4) * (p.chan ? 0.4 : 1), k = 1 - Math.exp(-dt * 10);
  p.vx += (inp.wx * spd - p.vx) * k; p.vz += (inp.wz * spd - p.vz) * k;
  slide(L, p, p.vx * dt, p.vz * dt, p.r);
  p.moveSpd = Math.hypot(p.vx, p.vz);
  p.bob += p.moveSpd * dt * 1.6;
  p.noiseT -= dt;
  if (boosting && p.noiseT <= 0 && !p.god) { p.noiseT = 0.6; makeNoise(p.x, p.z, 14); }

  const sci = G.drones.filter((d) => d.dr.sci).length;
  p.scanCD = Math.max(0, p.scanCD - dt * (1 + 0.35 * sci)); p.scanT = Math.max(0, p.scanT - dt); G.scanPulse += dt;
  if (inp.scan && p.scanCD <= 0) doScan();
  if (p.hurtT > 0) p.hurtT -= dt; else p.hp = Math.min(p.max, p.hp + 3 * dt);
  for (const t of ["A", "B", "C"]) p.adapt[t] = Math.max(0, p.adapt[t] - dt * 0.01);
  p.energy = Math.min(100, p.energy + 5 * dt);
  p.fireCD -= dt; p.kick = Math.max(0, p.kick - dt * 6);

  if (inp.fire && p.fireCD <= 0 && p.energy >= 6 && !p.chan) {
    p.fireCD = 0.26; p.energy -= 6; p.kick = 1;
    const f = camForward(), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    shoot(p.x + f.x * 0.7 - rx * 0.3, EYE - 0.25, p.z + f.z * 0.7 - rz * 0.3, f.x, f.y + 0.02, f.z, 34, 18, "D", "player", p);
    Snd.disruptor(); makeNoise(p.x, p.z, 26);
  }

  if (p.chan) {
    const c = p.chan, d = Math.hypot(c.x - p.x, c.z - p.z);
    if (!inp.assim || c.state !== "held" || d > REACH + 1.4) releaseTarget();
    else {
      const f = camForward(), tx = p.x + f.x * 1.9, tz = p.z + f.z * 1.9;
      if (!blockedAt(L, tx, tz, c.r)) { c.x += (tx - c.x) * Math.min(1, dt * 8); c.z += (tz - c.z) * Math.min(1, dt * 8); }
      c.ang = turnTo(c.ang, Math.atan2(p.x - c.x, p.z - c.z), dt * 8);
      c.held += dt / c.dur; Snd.channel(c.held);
      if (Math.random() < dt * 40) spark(c.x, rand(0.8, 1.6), c.z, 1, 0x6dff9a, 2, 0.4);
      if (c.held >= 1) finishAssim(c);
    }
    G.cand = null;
  } else {
    G.cand = findTarget();
    if (inp.assim && G.cand) beginAssim(G.cand);
  }
}

// ---------- world update ----------
function updateDoors(dt) {
  const L = G.L, ents = [G.p];
  for (const c of G.crew) if (!c.dead) ents.push(c);
  for (const d of G.drones) ents.push(d);
  const k = Math.min(1, dt * 6);
  for (const i of L.doors) {
    const dx = ((i % L.W) + 0.5) * TILE, dz = (((i / L.W) | 0) + 0.5) * TILE;
    let near = 0;
    for (const e of ents) if (Math.abs(e.x - dx) < 3.6 && Math.abs(e.z - dz) < 3.6) { near = 1; break; }
    const before = L.doorOpen[i];
    L.doorOpen[i] += (near - before) * k;
    if (before < 0.5 && L.doorOpen[i] >= 0.5) { const dd = listenerDist(dx, dz); if (dd < 25) Snd.door(); }
  }
}

function updateDoorMeshes() {
  const L = G.L;
  if (!L || !L.doorMeshes) return;
  for (const i of L.doors) {
    const m = L.doorMeshes[i], o = L.doorOpen[i];
    if (!m) continue;
    m.visible = o < 0.98;
    m.position.y = WALL_H / 2 + o * WALL_H;
  }
}

function separate() {
  const all = [G.p];
  for (const c of G.crew) if (!c.dead && c.state !== "down" && c.state !== "held") all.push(c);
  for (const d of G.drones) all.push(d);
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = 0.85;
    if (d >= min || d < 0.001) continue;
    const push = (min - d) * 0.5, nx = dx / d, nz = dz / d, wa = a === G.p ? 0.15 : 1, wb = b === G.p ? 0.15 : 1;
    slide(G.L, a, -nx * push * wa, -nz * push * wa, a.r); slide(G.L, b, nx * push * wb, nz * push * wb, b.r);
  }
}

function updateBolts(dt) {
  const L = G.L, p = G.p;
  for (const b of G.bolts) {
    b.life -= dt;
    for (let s = 0; s < 3 && b.life > 0; s++) {
      b.x += (b.vx * dt) / 3; b.y += (b.vy * dt) / 3; b.z += (b.vz * dt) / 3;
      const tx = tileOf(b.x), tz = tileOf(b.z), t = tileAt(L, tx, tz);
      if (b.y < 0 || b.y > WALL_H || t === 0 || (TT_H[t] > b.y && t !== TT.FLOOR) || (t === TT.DOOR && L.doorOpen[tz * L.W + tx] < 0.5)) {
        b.life = 0; spark(b.x, clamp(b.y, 0.05, WALL_H), b.z, 5, WEAPON[b.type].col, 3, 0.35); break;
      }
      if (b.owner === "crew") {
        if (!p.dead && b.y > 0.2 && b.y < 1.95 && Math.hypot(p.x - b.x, p.z - b.z) < 0.45) { hurtPlayer(b.dmg, b.type, b.src.x, b.src.z); b.life = 0; break; }
        let hit = false;
        for (const d of G.drones) if (!d.dead && b.y < 1.9 && Math.hypot(d.x - b.x, d.z - b.z) < 0.45) { hurtDrone(d, b.dmg); hit = true; break; }
        if (hit) { b.life = 0; break; }
      } else {
        let hit = false;
        for (const c of G.crew) {
          if (c.dead || c.state === "down" || c.state === "held") continue;
          if (b.y < 1.95 * (c.d.big || 1) && Math.hypot(c.x - b.x, c.z - b.z) < 0.5) { hurtCrew(c, b.dmg, b.src); hit = true; break; }
        }
        if (hit) { b.life = 0; spark(b.x, b.y, b.z, 6, 0x6dff9a, 3, 0.3); break; }
      }
    }
    if (b.life <= 0) freeBolt(b);
  }
  G.bolts = G.bolts.filter((b) => b.life > 0);
}

function collectItems() {
  const p = G.p;
  for (const it of G.items) {
    if (it.taken || Math.hypot(it.x - p.x, it.z - p.z) > 1.4) continue;
    if (it.type === "cell" && p.hp >= p.max) continue;
    if (it.type === "ecell" && p.energy >= 100) continue;
    it.taken = true; it.g.visible = false;
    spark(it.x, 1.2, it.z, 24, it.def ? it.def.col : 0x9dffb8, 3.5, 0.7);
    if (it.type === "key") { G.keyTaken++; G.score += 250; logMsg("RECOVERED: " + it.def.name + " (" + G.keyTaken + "/" + G.keyTotal + ")", hexCss(it.def.col)); Snd.key(); }
    else if (it.type === "cell") { p.hp = Math.min(p.max, p.hp + 40); logMsg("NANO-CELL: +40 INTEGRITY", "#9dffb8"); Snd.pickup(); }
    else { p.energy = 100; logMsg("ENERGY CELL: DISRUPTOR RECHARGED", "#7fe3ff"); Snd.pickup(); }
  }
}

function spawnReinforcement() {
  const L = G.L, p = G.p;
  const opts = L.rooms.filter((r) => Math.hypot((r.cx + 1) * TILE - p.x, (r.cy + 1) * TILE - p.z) > 40 && r.spots.length);
  if (!opts.length) return;
  const rm = pick(opts), s = spotPos(L, pick(rm.spots)), c = makeCrew("security", s.x, s.z, rm);
  setInvestigate(c, G.alertPos.x, G.alertPos.z, 0.5);
  G.crew.push(c); G.reinCount++;
  logMsg("SECURITY REINFORCEMENTS INBOUND", "#ff9a7a");
}

function missingText() {
  const b = [];
  if (G.keyTaken < G.keyTotal) b.push(G.keyTotal - G.keyTaken + " COMPONENT" + (G.keyTotal - G.keyTaken > 1 ? "S" : ""));
  if (G.assimCount < G.quota) b.push(G.quota - G.assimCount + " ASSIMILATIONS");
  if (G.captain && !G.captain.assimilated) b.push("THE CAPTAIN");
  return b.join(" + ") + " REQUIRED";
}

function updateWorld(dt, inp) {
  const p = G.p, L = G.L;
  G.deckT += dt;
  updatePlayer(dt, inp);
  updateDoors(dt);
  for (const c of G.crew) updateCrew(c, dt);
  for (const d of G.drones) updateDrone(d, dt);
  separate();
  updateBolts(dt);
  for (const c of G.crew) if (c.dead) scene.remove(c.model.g);
  for (const d of G.drones) if (d.dead) scene.remove(d.model.g);
  G.crew = G.crew.filter((c) => !c.dead); G.drones = G.drones.filter((d) => !d.dead);
  G.shake *= Math.exp(-dt * 6); G.flash = Math.max(0, G.flash - dt * 1.5); G.hurt = Math.max(0, G.hurt - dt * 1.2);

  if (G.alert > 0) {
    G.alert -= dt; G.reinT -= dt;
    if (G.reinT <= 0) { G.reinT = 12; if (G.reinCount < 3 + G.deckIdx * 2) spawnReinforcement(); }
    if (G.alert <= 0) { logMsg("ALERT STANDING DOWN", "#9dd6ff"); G.alertPos = null; }
  }
  Snd.tension(G.alert > 0 ? 1 : 0);

  G.revealT = (G.revealT || 0) - dt;
  if (G.revealT <= 0) { G.revealT = 0.2; revealFrom(L, p.x, p.z, 42); }

  if (G.mode !== "play") return;
  collectItems();
  const was = G.online;
  G.online = objDone();
  if (G.online && !was) { logMsg("TRANSWARP CONDUIT ONLINE - REACH ENGINEERING", "#ffe27a"); Snd.online(); }
  const c = roomCentre(L.rooms[L.exitRoom]), dc = Math.hypot(p.x - c.x, p.z - c.z);
  G.prompt = "";
  if (dc < 7 && !G.online) G.prompt = "CONDUIT OFFLINE: " + missingText();
  if (G.online && dc < 2.2) deckClear();
}

// ---------- attract-mode bot ----------
function botInput(dt) {
  const p = G.p, L = G.L, b = G.bot;
  const inp = { wx: 0, wz: 0, yaw: null, assim: false, fire: false, scan: false, boost: false };
  b.t -= dt; b.scanT -= dt;
  if (b.scanT <= 0) { b.scanT = 16; inp.scan = true; }
  if (p.chan) { inp.assim = true; inp.yaw = yawToDir(p.chan.x - p.x, p.chan.z - p.z); return inp; }
  if (b.t <= 0 || !b.tgt || b.tgt.dead || b.tgt.state === "held") {
    b.t = 0.7; b.tgt = null;
    let bd = 1e9;
    for (const c of G.crew) {
      if (c.dead || c.state === "held" || (c.botSkip || 0) > G.t) continue;
      const d = Math.hypot(c.x - p.x, c.z - p.z) * (c.state === "down" ? 0.6 : 1);
      if (d < bd) { bd = d; b.tgt = c; }
    }
  }
  if (!b.tgt) { b.idle += dt; if (b.idle > 4) enterAttract(); return inp; }
  b.idle = 0;
  b.stuckT = (b.stuckT || 0) + dt;
  if (!b.mark || Math.hypot(b.mark.x - p.x, b.mark.z - p.z) > 0.6) { b.mark = { x: p.x, z: p.z }; b.stuckT = 0; }
  if (b.stuckT > 3) { b.tgt.botSkip = G.t + 12; b.tgt = null; b.stuckT = 0; return inp; }
  const t = b.tgt, dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
  inp.yaw = yawToDir(dx, dz);
  if (d < 2.6 && hasLOS(L, p.x, p.z, t.x, t.z)) { inp.assim = true; if (d > 1.8) { inp.wx = dx / d * 0.6; inp.wz = dz / d * 0.6; } return inp; }
  let gx = t.x, gz = t.z;
  p.rp -= dt;
  if (!clearLine(L, p.x, p.z, t.x, t.z, p.r)) {
    if (p.rp <= 0 || !p.path) { p.path = findPath(L, p.x, p.z, t.x, t.z); p.pi = 0; p.rp = 0.5; }
    if (p.path) {
      while (p.pi < p.path.length - 1 && Math.hypot(p.path[p.pi].x - p.x, p.path[p.pi].z - p.z) < 1.0) p.pi++;
      gx = p.path[p.pi].x; gz = p.path[p.pi].z;
    }
  } else p.path = null;
  const gd = Math.hypot(gx - p.x, gz - p.z) || 1;
  inp.wx = (gx - p.x) / gd; inp.wz = (gz - p.z) / gd;
  inp.yaw = yawToDir(inp.wx, inp.wz);
  return inp;
}

function playerInput(dt) {
  const p = G.p;
  const look = (keys.has("ArrowLeft") ? 1 : 0) - (keys.has("ArrowRight") ? 1 : 0);
  const lookV = (keys.has("ArrowUp") ? 1 : 0) - (keys.has("ArrowDown") ? 1 : 0);
  p.yaw += look * dt * 2.2 - mouse.dx * 0.0022;
  p.pitch = clamp(p.pitch + lookV * dt * 1.6 - mouse.dy * 0.0022, -1.35, 1.35);
  mouse.dx = mouse.dy = 0;
  const f = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0), s = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
  let wx = -Math.sin(p.yaw) * f + Math.cos(p.yaw) * s, wz = -Math.cos(p.yaw) * f - Math.sin(p.yaw) * s;
  const l = Math.hypot(wx, wz); if (l > 1) { wx /= l; wz /= l; }
  return { wx, wz, yaw: null, assim: mouse.down || keys.has("Space") || keys.has("KeyE"), fire: mouse.right || keys.has("KeyF"), scan: pressed.has("KeyQ"), boost: keys.has("ShiftLeft") || keys.has("ShiftRight") };
}

// ---------- scene sync ----------
const camState = { x: 0, y: EYE, z: 0 };
function camSnap() { camState.x = G.p.x; camState.z = G.p.z; }
const tmpV = new THREE.Vector3();
let orbitAngle = 0;

function poseFigure(m, moveSpd, anim, combat) {
  const ph = anim * 6, k = Math.min(1, moveSpd / 3);
  m.legL.rotation.x = Math.sin(ph) * 0.7 * k; m.legR.rotation.x = -Math.sin(ph) * 0.7 * k;
  m.armL.rotation.x = -Math.sin(ph) * 0.5 * k;
  m.armR.rotation.x = combat ? -1.45 : Math.sin(ph) * 0.5 * k;
  if (m.gun) m.gun.visible = combat;
}

function syncEntities(dt) {
  for (const c of G.crew) {
    const m = c.model, g = m.g;
    g.position.set(c.x, 0, c.z); g.rotation.y = c.ang;
    const down = c.state === "down", held = c.state === "held";
    c.fall = lerp(c.fall, down ? 1 : 0, Math.min(1, dt * 8));
    g.rotation.x = -c.fall * Math.PI / 2; g.position.y = c.fall * 0.17;
    poseFigure(m, c.moveSpd, c.anim, c.state === "combat" && c.d.armed);
    if (down) { m.armL.rotation.x = 0.3; m.legL.rotation.x = 0.1; }
    m.shell.material.opacity = held ? 0.04 + c.held * 0.26 : 0;
    m.head.rotation.y = c.state === "investigate" ? Math.sin(c.anim * 2) * 0.5 : 0;
  }
  for (const d of G.drones) {
    const m = d.model, g = m.g, sc = 1 - d.spawn * 0.4;
    g.position.set(d.x, 0, d.z); g.rotation.y = d.ang; g.scale.setScalar((d.d.big || 1) * sc);
    poseFigure(m, d.moveSpd, d.anim, !!d.tgt && !!d.dr.ranged);
    m.eyeGlow.material.opacity = 0.6 + 0.4 * Math.sin(G.t * 5 + d.anim);
  }
  const p = G.p, mm = p.model;
  mm.g.visible = G.mode === "attract" || G.mode === "clear" || G.mode === "dead" || G.mode === "gameover" || G.mode === "victory";
  mm.g.position.set(p.x, 0, p.z); mm.g.rotation.y = p.yaw + Math.PI;
  poseFigure(mm, p.moveSpd, G.t, false);
  if (p.chan) mm.armR.rotation.x = -1.3;
  for (const it of G.items) if (!it.taken) { it.g.position.set(it.x, 1.15 + Math.sin(G.t * 2 + it.ph) * 0.12, it.z); it.g.rotation.y = G.t * 0.9 + it.ph; }
  for (const b of G.bolts) {
    b.mesh.position.set(b.x, b.y, b.z); b.mesh.lookAt(b.x + b.vx, b.y + b.vy, b.z + b.vz);
    b.mesh.children[1].material.opacity = clamp((Math.hypot(b.x - camera.position.x, b.z - camera.position.z) - 1.5) / 4, 0, 0.8);
  }
  const pr = G.L.props, on = G.online;
  pr.swirl.rotation.z += dt * (on ? 2.5 : 0.4);
  const col = on ? 0xffd060 : 0xff4a3a;
  pr.ring.material.color.setHex(col); pr.swirl.material.color.setHex(col);
  pr.beam.material.opacity = on ? 0.18 + 0.06 * Math.sin(G.t * 4) : 0;
  pr.pad.children[1].rotation.z = G.t * 0.5;
}

let lastLightP = { x: 1e9, z: 1e9 };
function updateLights(dt) {
  const L = G.L, cx = camera.position.x, cz = camera.position.z;
  G.lightT -= dt;
  if (G.lightT <= 0 && (Math.abs(cx - lastLightP.x) + Math.abs(cz - lastLightP.z) > 0.5 || G.lightT < -2)) {
    G.lightT = 0.2; lastLightP = { x: cx, z: cz };
    const list = L.lightSpots.map((s) => ({ s, d: (s.x - cx) ** 2 + (s.z - cz) ** 2 })).sort((a, b) => a.d - b.d);
    for (let i = 0; i < lightPool.length; i++) {
      const l = lightPool[i], e = list[i];
      if (!e) { l.intensity = 0; continue; }
      l.position.set(e.s.x, 3.0, e.s.z); l.color.setHex(e.s.color).lerp(new THREE.Color(0xffffff), 0.55); l.intensity = 1.9 * e.s.k;
    }
  }
  const al = G.alert > 0, k = al ? 0.5 + 0.5 * Math.sin(G.t * 5) : 0;
  ambient.color.setRGB(lerp(0.54, 0.9, k * 0.6), lerp(0.64, 0.2, k * 0.6), lerp(0.77, 0.2, k * 0.6));
  scene.fog.color.setRGB(lerp(0.012, 0.16, k * 0.5), 0.027 - k * 0.015, 0.047 - k * 0.03);
  glowLight.position.set(G.p.x, 1.6, G.p.z);
}

let tubeGroup = null;
function updateTubes() {
  if (tubeGroup) { scene.remove(tubeGroup); tubeGroup.traverse((o) => o.geometry && o.geometry.dispose()); tubeGroup = null; }
  const p = G.p, c = p.chan;
  if (!c || G.mode === "clear") return;
  const start = new THREE.Vector3();
  if (G.mode === "play") { fp.tip.getWorldPosition(start); } else { p.model.armR.getWorldPosition(start); start.y -= 0.5; }
  const end = new THREE.Vector3(c.x, 1.3, c.z);
  tubeGroup = new THREE.Group();
  const side = new THREE.Vector3().subVectors(end, start).cross(new THREE.Vector3(0, 1, 0)).normalize();
  for (let k = 0; k < 3; k++) {
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6, w = Math.sin(t * Math.PI) * (0.18 + 0.05 * k) * Math.sin(G.t * 14 + k * 2 + i);
      pts.push(new THREE.Vector3().lerpVectors(start, end, t).addScaledVector(side, w).add(new THREE.Vector3(0, Math.sin(t * Math.PI) * 0.12 * (k - 1), 0)));
    }
    tubeGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.014, 4), new THREE.MeshBasicMaterial({ color: k === 1 ? 0xc8ffd8 : 0x4dff88, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })));
  }
  scene.add(tubeGroup);
}

const fp = {};

function updateCamera(dt) {
  const p = G.p, L = G.L;
  const first = G.mode === "play" || G.mode === "briefing" || G.mode === "paused" || (G.mode === "dying");
  if (first) {
    let y = EYE + Math.sin(p.bob * 2) * 0.045 * Math.min(1, p.moveSpd / 4), roll = 0;
    if (G.mode === "dying") { y = Math.max(0.3, EYE - G.modeT * 0.9); roll = Math.min(0.9, G.modeT * 0.5); }
    if (G.mode === "briefing") p.yaw += Math.sin(G.t * 0.4) * dt * 0.05;
    const sh = G.shake * 0.05;
    camera.position.set(p.x + (Math.random() - 0.5) * sh, y + (Math.random() - 0.5) * sh, p.z + (Math.random() - 0.5) * sh);
    camera.rotation.set(p.pitch + p.kick * 0.012, p.yaw, roll);
    camera.fov = lerp(camera.fov, 78 + (p.moveSpd > 5.5 ? 7 : 0), Math.min(1, dt * 6)); camera.clearViewOffset(); camera.updateProjectionMatrix();
  } else {
    orbitAngle += dt * (G.mode === "attract" ? 0.16 : 0.25);
    let r = G.mode === "attract" ? 6.2 : 4, h = G.mode === "attract" ? 3.0 : 1.7;
    const tx = p.x, tz = p.z;
    let cx = tx + Math.sin(orbitAngle) * r, cz = tz + Math.cos(orbitAngle) * r;
    while (r > 1.2 && !clearLine(L, tx, tz, cx, cz, 0.35)) { r -= 0.4; cx = tx + Math.sin(orbitAngle) * r; cz = tz + Math.cos(orbitAngle) * r; }
    camState.x = lerp(camState.x, cx, Math.min(1, dt * 4)); camState.z = lerp(camState.z, cz, Math.min(1, dt * 4));
    camera.position.set(camState.x, h, camState.z);
    camera.lookAt(tx, 1.0, tz);
    camera.fov = 66;
    if (G.mode === "attract") camera.setViewOffset(VW, VH, 0, -VH * 0.2, VW, VH); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
}

function renderScene() {
  if (!renderer) return;
  const showFP = G.mode === "play" || G.mode === "paused" || G.mode === "briefing";
  renderer.clear();
  renderer.render(scene, camera);
  if (showFP && fp.rig) {
    const f = G.p, k = Math.min(1, f.moveSpd / 4), t = G.t;
    fp.rig.position.copy(camera.position); fp.rig.quaternion.copy(camera.quaternion);
    fp.right.position.set(0.3 + Math.sin(f.bob) * 0.012 * k, -0.27 + Math.abs(Math.sin(f.bob)) * 0.014 * k + Math.sin(t * 1.6) * 0.004, -0.55 + (f.chan ? -0.08 : 0));
    fp.left.position.set(-0.32 - Math.sin(f.bob) * 0.012 * k, -0.27 + Math.abs(Math.sin(f.bob + 1)) * 0.014 * k + Math.sin(t * 1.6 + 1) * 0.004, -0.55 + f.kick * 0.05);
    fp.left.rotation.x = f.kick * 0.1;
    const ext = f.chan ? 0.9 : 0;
    fp.tubes.forEach((tb, i) => { const len = f.chan ? 0.5 + Math.sin(t * 20 + i) * 0.04 : 0.02; tb.m.scale.y = len; tb.m.position.z = -len / 2; tb.g.rotation.y = f.chan ? (i - 1) * 0.08 : 0; });
    fp.muzzleGlow.material.opacity = f.kick * 0.9; fp.muzzleGlow.scale.setScalar(0.1 + f.kick * 0.25);
    renderer.clearDepth();
    renderer.render(fpScene, camera);
  }
}

function boot() {
  makeTextures();
  const rigData = buildFPRig();
  Object.assign(fp, rigData);
  fpScene.add(fp.rig);
  const ptex = TEX.glow; partPoints.material.map = ptex; partPoints.material.needsUpdate = true;
  try { G.hi = parseInt(localStorage.getItem(HI_KEY), 10) || 0; } catch (e) { G.hi = 0; }
  resize();
  if (glFailed) return;
  enterAttract();
  requestAnimationFrame(loop);
}

let lastT = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
  lastT = now;
  update(dt);
  renderFrame(dt);
  pressed.clear();
  requestAnimationFrame(loop);
}

function update(dt) {
  G.t += dt; G.modeT += dt;
  handleMenus();
  const idle = { wx: 0, wz: 0, yaw: null, assim: false, fire: false, scan: false, boost: false };
  switch (G.mode) {
    case "attract": G.demoT += dt; updateWorld(dt, botInput(dt)); if (G.demoT > 100) enterAttract(); break;
    case "play": updateWorld(dt, playerInput(dt)); G.hintT += dt; break;
    case "dying": updateWorld(dt * 0.4, idle); if (G.modeT > 2.6) { if (G.lives > 0) { G.lives--; setMode("dead"); } else finishRun(false); } break;
    default: { const e = 1; G.hurt = Math.max(0, G.hurt - dt); G.flash = Math.max(0, G.flash - dt); break; }
  }
  if (G.mode !== "play" && G.mode !== "attract" && G.mode !== "dying") Snd.channel(null);
}

function renderFrame(dt) {
  updateCamera(dt);
  updateDoorMeshes();
  syncEntities(dt);
  updateLights(dt);
  updateParts(dt);
  updateTubes();
  renderScene();
  drawHud();
}
