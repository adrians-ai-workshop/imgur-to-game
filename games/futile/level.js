"use strict";

// ---- stage generation (BSP rooms + corridors), collision, pathing, sight ----
const TS = 16;
const T = { WALL: 0, FLOOR: 1, CORR: 2, DOOR: 3, CONSOLE: 4, TABLE: 5, CRATE: 6, BED: 7, PILLAR: 8, BEDR: 9 };
const ROOM_KINDS = ["QUARTERS", "MESS", "LAB", "SICKBAY", "ARMORY", "CARGO", "HALL", "QUARTERS", "MESS", "CARGO", "LAB"];

function rng32(a) {
  return function () {
    a |= 0; a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16); t = Math.imul(t, 0x21f0aaad); t ^= t >>> 15; t = Math.imul(t, 0x735a2d97); t ^= t >>> 15;
    return (t >>> 0) / 4294967296;
  };
}

function stageInfo(n) {
  const world = Math.ceil(n / 4), stage = ((n - 1) % 4) + 1, boss = stage === 4;
  return {
    n, world, stage, boss, theme: (world - 1) % THEMES.length, bossIdx: (world - 1) % BOSS_DEFS.length,
    w: Math.min(160, 84 + (n - 1) * 7), h: Math.min(112, 66 + (n - 1) * 4),
    crew: boss ? 10 + n : 13 + 2 * n, keys: boss ? 3 : n >= 5 ? 4 : 3,
  };
}

function genLevel(n, seed) {
  const info = stageInfo(n), rnd = rng32(seed), W = info.w, H = info.h, N = W * H;
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const L = {
    W, H, info, tiles: new Uint8Array(N), room: new Int16Array(N).fill(-1), vari: new Uint8Array(N),
    doorOpen: new Float32Array(N), doorAx: new Uint8Array(N), doorSl: new Uint8Array(N), doorLock: new Uint8Array(N), doors: [],
    seen: new Uint8Array(N), conv: new Uint8Array(N), near: new Uint8Array(N), rooms: [], rnd,
  };
  for (let i = 0; i < N; i++) L.vari[i] = (rnd() * 256) | 0;

  // BSP
  const leaves = [];
  const split = (x, y, w, h, depth) => {
    const minW = 22, minH = 18, cw = w >= minW * 2, ch = h >= minH * 2;
    let go = cw || ch;
    if (go && depth > 0 && rnd() < 0.18 && w * h < minW * minH * 5) go = false;
    if (!go) { const lf = { x, y, w, h }; leaves.push(lf); return { leaf: lf }; }
    const vertical = cw && ch ? (w / h > 1.2 ? true : h / w > 1.2 ? false : rnd() < 0.5) : cw;
    if (vertical) { const s = ri(minW, w - minW); return { a: split(x, y, s, h, depth + 1), b: split(x + s, y, w - s, h, depth + 1) }; }
    const s = ri(minH, h - minH);
    return { a: split(x, y, w, s, depth + 1), b: split(x, y + s, w, h - s, depth + 1) };
  };
  const root = split(0, 0, W, H, 0);

  // pick start (a corner-ish leaf) and arena (largest leaf far from it)
  const corner = [[0, 0], [W, 0], [0, H], [W, H]][ri(0, 3)];
  const cen = (lf) => ({ x: lf.x + lf.w / 2, y: lf.y + lf.h / 2 });
  let startLeaf = leaves[0], bd = 1e9;
  for (const lf of leaves) { const c = cen(lf), d = Math.hypot(c.x - corner[0], c.y - corner[1]); if (d < bd) { bd = d; startLeaf = lf; } }
  const sc = cen(startLeaf);
  let far = leaves[0], fd = -1;
  for (const lf of leaves) {
    if (lf === startLeaf) continue;
    const c = cen(lf), d = Math.hypot(c.x - sc.x, c.y - sc.y) * (info.boss ? Math.sqrt(lf.w * lf.h) : 1);
    if (d > fd) { fd = d; far = lf; }
  }
  const arenaLeaf = info.boss ? far : null;

  // rooms
  for (const lf of leaves) {
    let rw = ri(12, lf.w - 4), rh = ri(10, lf.h - 4), x0 = lf.x + 2 + ri(0, lf.w - rw - 4), y0 = lf.y + 2 + ri(0, lf.h - rh - 4);
    if (lf === arenaLeaf) { rw = Math.min(lf.w - 4, 28); rh = Math.min(lf.h - 4, 20); x0 = lf.x + ((lf.w - rw) >> 1); y0 = lf.y + ((lf.h - rh) >> 1); }
    const id = L.rooms.length;
    const rm = { id, x0, y0, x1: x0 + rw - 1, y1: y0 + rh - 1, w: rw, h: rh, cx: x0 + (rw >> 1), cy: y0 + (rh >> 1), kind: "HALL", leaf: lf, spots: [] };
    lf.room = rm;
    for (let y = rm.y0; y <= rm.y1; y++) for (let x = rm.x0; x <= rm.x1; x++) { L.tiles[y * W + x] = T.FLOOR; L.room[y * W + x] = id; }
    L.rooms.push(rm);
  }
  const startRoom = startLeaf.room, arena = arenaLeaf ? arenaLeaf.room : null;
  L.startRoom = startRoom.id; L.arenaRoom = arena ? arena.id : -1;

  // corridors
  const set = (x, y) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && L.tiles[y * W + x] === T.WALL) L.tiles[y * W + x] = T.CORR; };
  const carveH = (x1, x2, y) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2) + 1; x++) { set(x, y); set(x, y + 1); } };
  const carveV = (y1, y2, x) => { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2) + 1; y++) { set(x, y); set(x + 1, y); } };
  const link = (a, b) => {
    if (rnd() < 0.5) { carveH(a.cx, b.cx, a.cy); carveV(a.cy, b.cy, b.cx); } else { carveV(a.cy, b.cy, a.cx); carveH(a.cx, b.cx, b.cy); }
  };
  const anyRoom = (node) => (node.leaf ? node.leaf.room : anyRoom(rnd() < 0.5 ? node.a : node.b));
  const connect = (node) => { if (node.leaf) return; connect(node.a); connect(node.b); link(anyRoom(node.a), anyRoom(node.b)); };
  connect(root);
  for (let i = 0; i < Math.floor(L.rooms.length * 0.3); i++) {
    const a = L.rooms[ri(0, L.rooms.length - 1)], b = L.rooms[ri(0, L.rooms.length - 1)];
    if (a !== b && Math.hypot(a.cx - b.cx, a.cy - b.cy) < 48) link(a, b);
  }

  // bulkhead doors on room rings
  const isW = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (L.tiles[y * W + x] === T.CORR);
  const isC = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (L.tiles[y * W + x] === T.CORR || L.tiles[y * W + x] === T.DOOR);
  const mkDoor = (x, y, axis) => {
    const i = y * W + x;
    if (L.tiles[i] !== T.CORR) return;
    const side = axis === 1 ? isC(x - 1, y) + isC(x + 1, y) : isC(x, y - 1) + isC(x, y + 1);
    if (side > 1) return;
    L.tiles[i] = T.DOOR; L.doorAx[i] = axis; L.doors.push(i);
  };
  for (const r of L.rooms) {
    for (let x = r.x0; x <= r.x1; x++) {
      if (isW(x, r.y0 - 1) && isW(x, r.y0 - 2)) mkDoor(x, r.y0 - 1, 1);
      if (isW(x, r.y1 + 1) && isW(x, r.y1 + 2)) mkDoor(x, r.y1 + 1, 1);
    }
    for (let y = r.y0; y <= r.y1; y++) {
      if (isW(r.x0 - 1, y) && isW(r.x0 - 2, y)) mkDoor(r.x0 - 1, y, 0);
      if (isW(r.x1 + 1, y) && isW(r.x1 + 2, y)) mkDoor(r.x1 + 1, y, 0);
    }
  }
  for (const i of L.doors) {
    const x = i % W, y = (i / W) | 0;
    const nb = L.doorAx[i] === 0 ? L.tiles[(y - 1) * W + x] : L.tiles[y * W + x - 1];
    L.doorSl[i] = nb === T.DOOR ? 1 : 0;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) L.near[yy * W + xx] = 1; }
  }
  if (arena) {
    for (const i of L.doors) {
      const x = i % W, y = (i / W) | 0;
      if (x >= arena.x0 - 1 && x <= arena.x1 + 1 && y >= arena.y0 - 1 && y <= arena.y1 + 1) L.doorLock[i] = 1;
    }
  }

  // room kinds and decoration
  L.rooms.forEach((r) => { r.kind = ROOM_KINDS[ri(0, ROOM_KINDS.length - 1)]; });
  startRoom.kind = "TRANSPORTER";
  if (arena) arena.kind = "ARENA";
  let exitRoom = arena;
  if (!exitRoom) {
    let best = -1;
    for (const r of L.rooms) { const d = Math.hypot(r.cx - startRoom.cx, r.cy - startRoom.cy); if (r !== startRoom && d > best) { best = d; exitRoom = r; } }
    exitRoom.kind = "ENGINE";
  }
  L.exitRoom = exitRoom.id;
  L.start = { x: (startRoom.cx + 0.5) * TS, y: (startRoom.cy + 0.5) * TS };
  L.exit = { x: (exitRoom.cx + 0.5) * TS, y: (exitRoom.cy + 0.5) * TS };
  for (const r of L.rooms) decorate(L, r, rnd);

  for (const r of L.rooms) {
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
      const i = y * W + x;
      if (L.tiles[i] === T.FLOOR && !L.near[i] && Math.hypot(x - r.cx, y - r.cy) > 2.5) r.spots.push(i);
    }
  }
  return L;
}

function decorate(L, r, rnd) {
  const W = L.W, kind = r.kind;
  const free = (x, y) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1 && L.tiles[y * W + x] === T.FLOOR && !L.near[y * W + x];
  const clearAround = (x, y, w) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= w; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < r.x0 - 1 || xx > r.x1 + 1 || yy < r.y0 - 1 || yy > r.y1 + 1) continue;
      if (L.tiles[yy * W + xx] >= T.CONSOLE) return false;
    }
    return true;
  };
  const put = (x, y, t) => { L.tiles[y * W + x] = t; };
  if (kind !== "HALL" && kind !== "TRANSPORTER") {
    for (let x = r.x0 + 1; x <= r.x1 - 1; x += 2) if (free(x, r.y0) && rnd() < 0.7) put(x, r.y0, T.CONSOLE);
  }
  const attempts = Math.floor((r.w * r.h) / 6);
  const place = (t, wide) => {
    for (let k = 0; k < attempts; k++) {
      const x = r.x0 + 2 + Math.floor(rnd() * (r.w - 4 - (wide ? 1 : 0))), y = r.y0 + 2 + Math.floor(rnd() * (r.h - 4));
      if (!free(x, y) || (wide && !free(x + 1, y)) || !clearAround(x, y, wide ? 2 : 1)) continue;
      if (Math.abs(x - r.cx) < 2 && Math.abs(y - r.cy) < 2) continue;
      if (wide) { put(x, y, T.BED); put(x + 1, y, T.BEDR); } else put(x, y, t);
    }
  };
  switch (kind) {
    case "QUARTERS": case "SICKBAY": place(T.BED, true); break;
    case "MESS": place(T.TABLE, false); break;
    case "LAB": place(T.TABLE, false); place(T.CONSOLE, false); break;
    case "ARMORY": case "CARGO": place(T.CRATE, false); break;
    case "HALL": case "ENGINE": case "ARENA": {
      const ox = Math.max(3, (r.w >> 2)), oy = Math.max(3, (r.h >> 2));
      for (const [px, py] of [[r.x0 + ox, r.y0 + oy], [r.x1 - ox, r.y0 + oy], [r.x0 + ox, r.y1 - oy], [r.x1 - ox, r.y1 - oy]]) if (free(px, py)) put(px, py, T.PILLAR);
      break;
    }
  }
}

// ---------- geometry ----------
const tileAt = (L, x, y) => (x < 0 || y < 0 || x >= L.W || y >= L.H ? 0 : L.tiles[y * L.W + x]);
function tileSolid(L, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= L.W || ty >= L.H) return true;
  const i = ty * L.W + tx, t = L.tiles[i];
  if (t === T.FLOOR || t === T.CORR) return false;
  if (t === T.DOOR) return L.doorLock[i] === 1 || L.doorOpen[i] < 0.7;
  return true;
}
function boxHit(L, x, y, h) {
  const x0 = Math.floor((x - h) / TS), x1 = Math.floor((x + h - 0.01) / TS), y0 = Math.floor((y - h) / TS), y1 = Math.floor((y + h - 0.01) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (tileSolid(L, tx, ty)) return true;
  return false;
}
function slide(L, e, dx, dy) {
  const h = e.h;
  if (dx && !boxHit(L, e.x + dx, e.y, h)) e.x += dx;
  if (dy && !boxHit(L, e.x, e.y + dy, h)) e.y += dy;
}
function sightBlocked(L, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= L.W || ty >= L.H) return true;
  const i = ty * L.W + tx, t = L.tiles[i];
  if (t === T.WALL || t === T.CRATE || t === T.PILLAR) return true;
  return t === T.DOOR && (L.doorLock[i] === 1 || L.doorOpen[i] < 0.4);
}
function rayClear(L, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.hypot(dx, dy) / 6);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (sightBlocked(L, Math.floor((x0 + dx * t) / TS), Math.floor((y0 + dy * t) / TS))) return false;
  }
  return true;
}
function lineWalkable(L, x0, y0, x1, y1, h) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.hypot(dx, dy) / 4);
  for (let i = 1; i <= n; i++) { const t = i / n; if (boxHit(L, x0 + dx * t, y0 + dy * t, h)) return false; }
  return true;
}

// ---------- pathing (tile BFS, returns pixel waypoints) ----------
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
let pStamp = null, pPar = null, pCount = 0, pCap = 0;
function walkTile(L, x, y) {
  if (x < 0 || y < 0 || x >= L.W || y >= L.H) return false;
  const i = y * L.W + x, t = L.tiles[i];
  return t === T.FLOOR || t === T.CORR || (t === T.DOOR && L.doorLock[i] === 0);
}
function findPath(L, sx, sy, tx, ty) {
  const N = L.W * L.H;
  if (pCap !== N) { pStamp = new Int32Array(N); pPar = new Int32Array(N); pCap = N; pCount = 0; }
  if (!walkTile(L, tx, ty)) {
    let ok = false;
    for (const [dx, dy] of DIRS) if (walkTile(L, tx + dx, ty + dy)) { tx += dx; ty += dy; ok = true; break; }
    if (!ok) return null;
  }
  if (!walkTile(L, sx, sy)) return null;
  const W = L.W, stamp = ++pCount, goal = ty * W + tx, start = sy * W + sx, q = [start];
  pStamp[start] = stamp; pPar[start] = -1;
  let found = start === goal;
  for (let h = 0; h < q.length && !found; h++) {
    const cur = q[h], cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (!walkTile(L, nx, ny)) continue;
      if (dx && dy && (!walkTile(L, cx + dx, cy) || !walkTile(L, cx, cy + dy))) continue;
      const ni = ny * W + nx;
      if (pStamp[ni] === stamp) continue;
      pStamp[ni] = stamp; pPar[ni] = cur;
      if (ni === goal) { found = true; break; }
      q.push(ni);
    }
  }
  if (!found) return null;
  const out = [];
  for (let c = goal; c !== -1; c = pPar[c]) out.push({ x: ((c % W) + 0.5) * TS, y: (((c / W) | 0) + 0.5) * TS });
  return out.reverse();
}

function convertArea(L, px, py, rad, lv) {
  const cx = Math.floor(px / TS), cy = Math.floor(py / TS);
  for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
    const x = cx + dx, y = cy + dy;
    if (x < 0 || y < 0 || x >= L.W || y >= L.H) continue;
    const i = y * L.W + x;
    if (L.tiles[i] === T.WALL) continue;
    const d = Math.hypot(dx, dy);
    if (d > rad) continue;
    const v = Math.max(1, Math.round(lv * (1 - d / (rad + 1))));
    if (L.conv[i] < v) L.conv[i] = Math.min(4, v);
  }
}
