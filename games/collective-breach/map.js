"use strict";

// ---- level data: procedural deck layout, collision, sight, pathing ----
const TILE = 2.5, WALL_H = 3.6, EYE = 1.65, TAU = Math.PI * 2;
const TT = { WALL: 0, FLOOR: 1, DOOR: 2, CONSOLE: 3, TABLE: 4, CRATE: 5, BED: 6, PILLAR: 7 };
const TT_H = [WALL_H, 0, 0, 1.35, 1.0, 1.5, 0.6, WALL_H];
const isSolidT = (t) => t === 0 || t >= 3;

const ROOM_DEF = {
  TRANSPORTER: { name: "TRANSPORTER ROOM", acc: 0x6dffa0, tint: [0.7, 1.0, 0.9] },
  HALL: { name: "ATRIUM", acc: 0x4fd1ff, tint: [0.85, 0.95, 1.05] },
  QUARTERS: { name: "CREW QUARTERS", acc: 0xb48cff, tint: [0.95, 0.85, 1.1] },
  MESS: { name: "MESS HALL", acc: 0xffb14f, tint: [1.1, 0.95, 0.8] },
  LAB: { name: "SCIENCE LAB", acc: 0x5bff9a, tint: [0.8, 1.05, 0.9] },
  SICKBAY: { name: "SICKBAY", acc: 0x7ff3ff, tint: [0.9, 1.05, 1.1] },
  ARMORY: { name: "ARMORY", acc: 0xff5a5a, tint: [1.1, 0.85, 0.85] },
  CARGO: { name: "CARGO BAY", acc: 0xffd24f, tint: [1.0, 0.95, 0.8] },
  ENGINE: { name: "ENGINEERING", acc: 0xff8a3d, tint: [1.1, 0.9, 0.8] },
  BRIDGE: { name: "BRIDGE", acc: 0x6aa8ff, tint: [0.85, 0.9, 1.15] },
};

const DECKS = [
  { name: "CARGO DECK", cols: 3, rows: 3, crew: 10, keys: 3 },
  { name: "HABITAT RING", cols: 4, rows: 3, crew: 15, keys: 3 },
  { name: "ENGINEERING SPINE", cols: 4, rows: 4, crew: 20, keys: 4 },
  { name: "COMMAND DECK", cols: 5, rows: 4, crew: 26, keys: 4 },
];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genLevel(deckIdx, seed) {
  const cfg = DECKS[deckIdx], rng = mulberry32(seed);
  const R = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const CW = 18, CH = 14, cols = cfg.cols, rows = cfg.rows;
  const W = cols * CW, H = rows * CH, N = W * H;
  const L = {
    W, H, N, deckIdx, cfg, rng, tiles: new Uint8Array(N), roomAt: new Int16Array(N).fill(-1),
    dir: new Uint8Array(N), rnd: new Uint8Array(N), doors: [], doorOpen: new Float32Array(N), doorAxis: new Uint8Array(N),
    seen: new Uint8Array(N), rooms: [], startRoom: 0, exitRoom: 0, bridgeRoom: -1,
    pStamp: new Int32Array(N), pPar: new Int32Array(N), pCount: 0,
  };
  for (let i = 0; i < N; i++) L.rnd[i] = (rng() * 256) | 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * CW + 9, cy = r * CH + 7, w = R(4, 6) * 2, h = R(7, 10);
      const x0 = cx - (w >> 1), y0 = cy - (h >> 1);
      const rm = { id: r * cols + c, c, r, cx, cy, x0, y0, x1: x0 + w - 1, y1: y0 + h - 1, type: "HALL", links: [], spots: [], itemSpots: [], dist: 0 };
      for (let y = rm.y0; y <= rm.y1; y++) for (let x = rm.x0; x <= rm.x1; x++) { L.tiles[y * W + x] = TT.FLOOR; L.roomAt[y * W + x] = rm.id; }
      L.rooms.push(rm);
    }
  }

  // random spanning tree plus some loops
  const ek = (a, b) => (a < b ? a * 1000 + b : b * 1000 + a);
  const nbrs = (id) => {
    const c = id % cols, r = (id / cols) | 0, o = [];
    if (c > 0) o.push(id - 1); if (c < cols - 1) o.push(id + 1);
    if (r > 0) o.push(id - cols); if (r < rows - 1) o.push(id + cols);
    return o;
  };
  const edges = new Set(), vis = new Uint8Array(cols * rows), stack = [0];
  vis[0] = 1;
  while (stack.length) {
    const cur = stack[stack.length - 1], opts = nbrs(cur).filter((n) => !vis[n]);
    if (!opts.length) { stack.pop(); continue; }
    const n = opts[(rng() * opts.length) | 0];
    vis[n] = 1; edges.add(ek(cur, n)); stack.push(n);
  }
  for (let id = 0; id < cols * rows; id++) for (const n of nbrs(id)) if (n > id && !edges.has(ek(id, n)) && rng() < 0.3) edges.add(ek(id, n));

  const door = (x, y, axis) => { const i = y * W + x; L.tiles[i] = TT.DOOR; L.doorAxis[i] = axis; L.doors.push(i); };
  for (const k of edges) {
    const a = L.rooms[Math.floor(k / 1000)], b = L.rooms[k % 1000];
    a.links.push(b.id); b.links.push(a.id);
    if (a.r === b.r) {
      for (let x = a.cx; x <= b.cx + 1; x++) for (let d = 0; d < 2; d++) { const i = (a.cy + d) * W + x; if (L.tiles[i] === TT.WALL) L.tiles[i] = TT.FLOOR; }
      for (let d = 0; d < 2; d++) { door(a.x1 + 1, a.cy + d, 0); door(b.x0 - 1, b.cy + d, 0); }
    } else {
      for (let y = a.cy; y <= b.cy + 1; y++) for (let d = 0; d < 2; d++) { const i = y * W + a.cx + d; if (L.tiles[i] === TT.WALL) L.tiles[i] = TT.FLOOR; }
      for (let d = 0; d < 2; d++) { door(a.cx + d, a.y1 + 1, 1); door(b.cx + d, b.y0 - 1, 1); }
    }
  }

  const corners = [0, cols - 1, (rows - 1) * cols, rows * cols - 1];
  L.startRoom = corners[(rng() * 4) | 0];
  const q = [L.startRoom], seenR = new Set(q);
  for (let h = 0; h < q.length; h++) {
    const cur = L.rooms[q[h]];
    for (const n of cur.links) if (!seenR.has(n)) { seenR.add(n); L.rooms[n].dist = cur.dist + 1; q.push(n); }
  }
  const far = L.rooms.slice().sort((a, b) => b.dist - a.dist);
  L.exitRoom = far[0].id;
  if (deckIdx === 3) L.bridgeRoom = far[1].id;
  const pool = ["QUARTERS", "MESS", "LAB", "SICKBAY", "ARMORY", "CARGO", "HALL", "QUARTERS", "MESS", "LAB", "CARGO", "ARMORY"];
  for (const rm of L.rooms) rm.type = pool[(rng() * pool.length) | 0];
  L.rooms[L.startRoom].type = "TRANSPORTER";
  L.rooms[L.exitRoom].type = "ENGINE";
  if (L.bridgeRoom >= 0) L.rooms[L.bridgeRoom].type = "BRIDGE";
  for (const rm of L.rooms) furnish(L, rm);
  return L;
}

function furnish(L, rm) {
  const W = L.W, { cx, cy, x0, y0, x1, y1 } = rm, rng = L.rng, T = rm.type;
  const put = (x, y, t, dir) => { const i = y * W + x; if (L.tiles[i] === TT.FLOOR) { L.tiles[i] = t; L.dir[i] = dir || 0; } };
  const centre = (x) => x >= cx - 1 && x <= cx + 2;
  if (T !== "TRANSPORTER") {
    for (let x = x0 + 1; x <= x1 - 1; x += 2) if (!centre(x) && rng() < 0.85) put(x, y0, TT.CONSOLE, 0);
    if (T !== "ENGINE" && T !== "BRIDGE" && rng() < 0.5) for (let x = x0 + 1; x <= x1 - 1; x += 2) if (!centre(x) && rng() < 0.7) put(x, y1, TT.CONSOLE, 2);
  }
  const quads = [[x0 + 1, cx - 2, y0 + 2, cy - 2], [cx + 3, x1 - 1, y0 + 2, cy - 2], [x0 + 1, cx - 2, cy + 3, y1 - 2], [cx + 3, x1 - 1, cy + 3, y1 - 2]];
  const fill = (qd, iw, ih, type, prob) => {
    for (let y = qd[2]; y + ih - 1 <= qd[3]; y += ih + 1) for (let x = qd[0]; x + iw - 1 <= qd[1]; x += iw + 1) {
      if (rng() < prob) for (let dy = 0; dy < ih; dy++) for (let dx = 0; dx < iw; dx++) put(x + dx, y + dy, type, 0);
    }
  };
  for (const qd of quads) {
    if (T === "QUARTERS" || T === "SICKBAY") fill(qd, 2, 1, TT.BED, T === "SICKBAY" ? 0.75 : 0.9);
    else if (T === "MESS") fill(qd, 2, 2, TT.TABLE, 0.85);
    else if (T === "LAB") fill(qd, 2, 1, TT.TABLE, 0.85);
    else if (T === "ARMORY") fill(qd, 1, 2, TT.CRATE, 0.85);
    else if (T === "CARGO") fill(qd, 2, 2, TT.CRATE, 0.85);
    else if (T === "HALL") fill(qd, 1, 1, TT.PILLAR, 0.3);
    else if (T === "ENGINE") fill(qd, 1, 1, TT.PILLAR, 0.4);
    else if (T === "BRIDGE") fill(qd, 3, 1, TT.TABLE, 0.6);
  }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x;
    if (L.tiles[i] !== TT.FLOOR) continue;
    rm.spots.push(i);
    if (!((x >= cx && x <= cx + 1) || (y >= cy && y <= cy + 1))) rm.itemSpots.push(i);
  }
}

// ---- helpers (world units are metres) ----
const tileOf = (v) => Math.floor(v / TILE);
function tileAt(L, tx, tz) { return tx < 0 || tz < 0 || tx >= L.W || tz >= L.H ? 0 : L.tiles[tz * L.W + tx]; }
const spotPos = (L, i) => ({ x: ((i % L.W) + 0.5) * TILE, z: (((i / L.W) | 0) + 0.5) * TILE });
const roomCentre = (rm) => ({ x: (rm.cx + 1) * TILE, z: (rm.cy + 1) * TILE });

function blockedAt(L, x, z, r) {
  const x0 = tileOf(x - r), x1 = tileOf(x + r), z0 = tileOf(z - r), z1 = tileOf(z + r);
  for (let tz = z0; tz <= z1; tz++) for (let tx = x0; tx <= x1; tx++) {
    if (!isSolidT(tileAt(L, tx, tz)) && !(tileAt(L, tx, tz) === TT.DOOR && L.doorOpen[tz * L.W + tx] < 0.7)) continue;
    const nx = Math.max(tx * TILE, Math.min(x, (tx + 1) * TILE)), nz = Math.max(tz * TILE, Math.min(z, (tz + 1) * TILE));
    if ((x - nx) * (x - nx) + (z - nz) * (z - nz) < r * r) return true;
  }
  return false;
}

function slide(L, e, dx, dz, r) {
  if (!blockedAt(L, e.x + dx, e.z, r)) e.x += dx;
  if (!blockedAt(L, e.x, e.z + dz, r)) e.z += dz;
}

function sightBlocked(L, tx, tz) {
  if (tx < 0 || tz < 0 || tx >= L.W || tz >= L.H) return true;
  const i = tz * L.W + tx, t = L.tiles[i];
  if (t === 0 || t === TT.CRATE || t === TT.PILLAR) return true;
  return t === TT.DOOR && L.doorOpen[i] < 0.4;
}

function hasLOS(L, x0, z0, x1, z1) {
  const dx = x1 - x0, dz = z1 - z0, n = Math.ceil(Math.hypot(dx, dz) / 0.6);
  for (let i = 1; i < n; i++) if (sightBlocked(L, tileOf(x0 + (dx * i) / n), tileOf(z0 + (dz * i) / n))) return false;
  return true;
}

function clearLine(L, x0, z0, x1, z1, r) {
  const dx = x1 - x0, dz = z1 - z0, n = Math.ceil(Math.hypot(dx, dz) / 0.5);
  for (let i = 1; i <= n; i++) if (blockedAt(L, x0 + (dx * i) / n, z0 + (dz * i) / n, r)) return false;
  return true;
}

const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function walkTile(L, x, z) { const t = tileAt(L, x, z); return t === 1 || t === 2; }

function findPath(L, x0, z0, x1, z1) {
  const W = L.W, sx = tileOf(x0), sz = tileOf(z0);
  let tx = tileOf(x1), tz = tileOf(z1);
  if (!walkTile(L, tx, tz)) {
    let ok = false;
    for (const [dx, dz] of DIRS8) if (walkTile(L, tx + dx, tz + dz)) { tx += dx; tz += dz; ok = true; break; }
    if (!ok) return null;
  }
  if (!walkTile(L, sx, sz)) return null;
  const stamp = ++L.pCount, start = sz * W + sx, goal = tz * W + tx, qu = [start];
  L.pStamp[start] = stamp; L.pPar[start] = -1;
  let found = start === goal;
  for (let h = 0; h < qu.length && !found; h++) {
    const cur = qu[h], cx = cur % W, cz = (cur / W) | 0;
    for (const [dx, dz] of DIRS8) {
      const nx = cx + dx, nz = cz + dz;
      if (!walkTile(L, nx, nz)) continue;
      if (dx && dz && (!walkTile(L, cx + dx, cz) || !walkTile(L, cx, cz + dz))) continue;
      const ni = nz * W + nx;
      if (L.pStamp[ni] === stamp) continue;
      L.pStamp[ni] = stamp; L.pPar[ni] = cur;
      if (ni === goal) { found = true; break; }
      qu.push(ni);
    }
  }
  if (!found) return null;
  const out = [];
  for (let c = goal; c !== -1; c = L.pPar[c]) out.push({ x: ((c % W) + 0.5) * TILE, z: (((c / W) | 0) + 0.5) * TILE });
  return out.reverse();
}

// mark tiles the player can see (drives the map)
function revealFrom(L, px, pz, radius) {
  const rays = 300, step = 0.9, steps = Math.ceil(radius / step), W = L.W;
  for (let k = 0; k < rays; k++) {
    const a = (k / rays) * TAU, sx = Math.cos(a) * step, sz = Math.sin(a) * step;
    let x = px, z = pz;
    for (let s = 0; s < steps; s++) {
      const tx = tileOf(x), tz = tileOf(z);
      if (tx < 0 || tz < 0 || tx >= W || tz >= L.H) break;
      L.seen[tz * W + tx] = 1;
      if (s > 0 && sightBlocked(L, tx, tz)) break;
      x += sx; z += sz;
    }
  }
}
