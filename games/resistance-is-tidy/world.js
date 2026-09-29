"use strict";

// ---- tiles, decks, generation, pathing, sight ----
const TAU = Math.PI * 2;
const TL = { WALL: 0, FLOOR: 1, CORR: 2, DOOR: 3, CONSOLE: 4, TABLE: 5, CRATE: 6, BED: 7, PILLAR: 8 };

const ROOM_DEF = {
  TRANSPORTER: { name: "TRANSPORTER ROOM", acc: "#6dffa0", floor: "#18272a" },
  HALL: { name: "ATRIUM", acc: "#4fd1ff", floor: "#1b2834" },
  QUARTERS: { name: "CREW QUARTERS", acc: "#b48cff", floor: "#211f33" },
  MESS: { name: "MESS HALL", acc: "#ffb14f", floor: "#2a2620" },
  LAB: { name: "SCIENCE LAB", acc: "#5bff9a", floor: "#172a29" },
  SICKBAY: { name: "SICKBAY", acc: "#7ff3ff", floor: "#1d2b31" },
  ARMORY: { name: "ARMORY", acc: "#ff5a5a", floor: "#2b1f22" },
  CARGO: { name: "CARGO BAY", acc: "#ffd24f", floor: "#252620" },
  ENGINE: { name: "ENGINEERING", acc: "#ff8a3d", floor: "#2a2019" },
  BRIDGE: { name: "BRIDGE", acc: "#6aa8ff", floor: "#191f36" },
};

const DECKS = [
  { name: "CARGO DECK", cols: 4, rows: 3, crew: 11, keys: 3 },
  { name: "HABITAT RING", cols: 5, rows: 3, crew: 16, keys: 3 },
  { name: "ENGINEERING SPINE", cols: 5, rows: 4, crew: 22, keys: 4 },
  { name: "COMMAND DECK", cols: 6, rows: 4, crew: 28, keys: 4 },
];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const isSolidTile = (t) => t === 0 || t >= 4;

function generateDeck(deckIdx, seed) {
  const cfg = DECKS[deckIdx];
  const rng = mulberry32(seed);
  const R = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const CW = 20, CH = 15, cols = cfg.cols, rows = cfg.rows;
  const W = cols * CW, H = rows * CH, N = W * H;
  const m = {
    W, H, deckIdx, cfg, tiles: new Uint8Array(N), roomAt: new Int16Array(N).fill(-1),
    variant: new Uint8Array(N), doorInfo: new Uint8Array(N), doorOpen: new Float32Array(N),
    seen: new Uint8Array(N), vis: new Int32Array(N), conv: new Float32Array(N), wallVis: new Uint8Array(N),
    rooms: [], doors: [], startRoom: 0, exitRoom: 0, bridgeRoom: -1,
    pStamp: new Int32Array(N), pPar: new Int32Array(N), pCount: 0, rng,
  };
  for (let i = 0; i < N; i++) m.variant[i] = (rng() * 256) | 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * CW + 10, cy = r * CH + 7;
      const w = R(4, 7) * 2, h = R(7, 10);
      const x0 = cx - (w >> 1), y0 = cy - (h >> 1);
      const room = { id: r * cols + c, c, r, cx, cy, x0, y0, x1: x0 + w - 1, y1: y0 + h - 1, w, h, type: "HALL", links: [], spots: [], itemSpots: [], dist: 0 };
      for (let y = room.y0; y <= room.y1; y++) {
        for (let x = room.x0; x <= room.x1; x++) { m.tiles[y * W + x] = TL.FLOOR; m.roomAt[y * W + x] = room.id; }
      }
      m.rooms.push(room);
    }
  }

  // spanning tree plus a few loops
  const key = (a, b) => (a < b ? a * 1000 + b : b * 1000 + a);
  const nbrs = (id) => {
    const c = id % cols, r = (id / cols) | 0, o = [];
    if (c > 0) o.push(id - 1);
    if (c < cols - 1) o.push(id + 1);
    if (r > 0) o.push(id - cols);
    if (r < rows - 1) o.push(id + cols);
    return o;
  };
  const linked = new Set();
  const mark = new Uint8Array(cols * rows);
  const st = [0]; mark[0] = 1;
  while (st.length) {
    const cur = st[st.length - 1];
    const opts = nbrs(cur).filter((n) => !mark[n]);
    if (!opts.length) { st.pop(); continue; }
    const n = opts[(rng() * opts.length) | 0];
    mark[n] = 1; linked.add(key(cur, n)); st.push(n);
  }
  for (let id = 0; id < cols * rows; id++) {
    for (const n of nbrs(id)) if (n > id && !linked.has(key(id, n)) && rng() < 0.3) linked.add(key(id, n));
  }

  const setDoor = (x, y, axis, dir) => {
    const i = y * W + x;
    m.tiles[i] = TL.DOOR; m.doorInfo[i] = axis | (dir << 1); m.doors.push(i);
  };
  for (const k of linked) {
    const a = m.rooms[Math.floor(k / 1000)], b = m.rooms[k % 1000];
    a.links.push(b.id); b.links.push(a.id);
    if (a.r === b.r) {
      for (let x = a.cx; x <= b.cx + 1; x++) {
        for (let d = 0; d < 2; d++) { const i = (a.cy + d) * W + x; if (m.tiles[i] === TL.WALL) m.tiles[i] = TL.CORR; }
      }
      for (let d = 0; d < 2; d++) { setDoor(a.x1 + 1, a.cy + d, 0, d); setDoor(b.x0 - 1, b.cy + d, 0, d); }
    } else {
      for (let y = a.cy; y <= b.cy + 1; y++) {
        for (let d = 0; d < 2; d++) { const i = y * W + a.cx + d; if (m.tiles[i] === TL.WALL) m.tiles[i] = TL.CORR; }
      }
      for (let d = 0; d < 2; d++) { setDoor(a.cx + d, a.y1 + 1, 1, d); setDoor(b.cx + d, b.y0 - 1, 1, d); }
    }
  }

  // room graph distances from a corner start
  const corners = [0, cols - 1, (rows - 1) * cols, rows * cols - 1];
  m.startRoom = corners[(rng() * 4) | 0];
  const q = [m.startRoom]; const seen = new Set(q);
  for (let h = 0; h < q.length; h++) {
    const cur = m.rooms[q[h]];
    for (const n of cur.links) if (!seen.has(n)) { seen.add(n); m.rooms[n].dist = cur.dist + 1; q.push(n); }
  }
  const byDist = m.rooms.slice().sort((a, b) => b.dist - a.dist);
  m.exitRoom = byDist[0].id;
  if (deckIdx === 3) m.bridgeRoom = byDist[1].id;

  const pool = ["QUARTERS", "MESS", "LAB", "SICKBAY", "ARMORY", "CARGO", "HALL", "QUARTERS", "MESS", "LAB", "CARGO", "ARMORY"];
  for (const rm of m.rooms) rm.type = pool[(rng() * pool.length) | 0];
  m.rooms[m.startRoom].type = "TRANSPORTER";
  m.rooms[m.exitRoom].type = "ENGINE";
  if (m.bridgeRoom >= 0) m.rooms[m.bridgeRoom].type = "BRIDGE";
  for (const rm of m.rooms) decorate(m, rm, rng);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (m.tiles[i] !== 0) continue;
      let any = false;
      for (let dy = -1; dy <= 1 && !any; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && m.tiles[ny * W + nx] !== 0) { any = true; break; }
        }
      }
      m.wallVis[i] = any ? 1 : 0;
    }
  }
  return m;
}

function decorate(m, rm, rng) {
  const W = m.W, { cx, cy, x0, y0, x1, y1 } = rm;
  const onCross = (x, y) => (x >= cx && x <= cx + 1) || (y >= cy && y <= cy + 1);
  const put = (x, y, t) => { const i = y * W + x; if (m.tiles[i] === TL.FLOOR) m.tiles[i] = t; };
  const T = rm.type;
  if (T !== "TRANSPORTER") {
    for (let x = x0 + 1; x <= x1 - 1; x += 2) if (!(x >= cx - 1 && x <= cx + 2) && rng() < 0.85) put(x, y0, TL.CONSOLE);
    if (T !== "ENGINE" && rng() < 0.5) for (let x = x0 + 1; x <= x1 - 1; x += 2) if (!(x >= cx - 1 && x <= cx + 2) && rng() < 0.7) put(x, y1, TL.CONSOLE);
  }
  const quads = [
    [x0 + 1, cx - 2, y0 + 2, cy - 2], [cx + 3, x1 - 1, y0 + 2, cy - 2],
    [x0 + 1, cx - 2, cy + 3, y1 - 2], [cx + 3, x1 - 1, cy + 3, y1 - 2],
  ];
  const fill = (qd, iw, ih, type, prob) => {
    for (let y = qd[2]; y + ih - 1 <= qd[3]; y += ih + 1) {
      for (let x = qd[0]; x + iw - 1 <= qd[1]; x += iw + 1) {
        if (rng() < prob) for (let dy = 0; dy < ih; dy++) for (let dx = 0; dx < iw; dx++) put(x + dx, y + dy, type);
      }
    }
  };
  for (const qd of quads) {
    switch (T) {
      case "QUARTERS": fill(qd, 2, 1, TL.BED, 0.9); break;
      case "MESS": fill(qd, 2, 2, TL.TABLE, 0.85); break;
      case "LAB": fill(qd, 2, 1, TL.TABLE, 0.85); break;
      case "SICKBAY": fill(qd, 2, 1, TL.BED, 0.75); break;
      case "ARMORY": fill(qd, 1, 2, TL.CRATE, 0.85); break;
      case "CARGO": fill(qd, 2, 2, TL.CRATE, 0.85); break;
      case "HALL": fill(qd, 1, 1, TL.PILLAR, 0.3); break;
      case "ENGINE": fill(qd, 1, 1, TL.PILLAR, 0.4); break;
      case "BRIDGE": fill(qd, 3, 1, TL.TABLE, 0.6); break;
    }
  }
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * W + x;
      if (m.tiles[i] !== TL.FLOOR) continue;
      rm.spots.push(i);
      if (!onCross(x, y)) rm.itemSpots.push(i);
    }
  }
}

// ---- collision, pathing, sight ----
function tileAtM(m, x, y) { return x < 0 || y < 0 || x >= m.W || y >= m.H ? 0 : m.tiles[y * m.W + x]; }

function collides(m, x, y, r) {
  const x0 = Math.floor(x - r), x1 = Math.floor(x + r), y0 = Math.floor(y - r), y1 = Math.floor(y + r);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!isSolidTile(tileAtM(m, tx, ty))) continue;
      const nx = x < tx ? tx : x > tx + 1 ? tx + 1 : x;
      const ny = y < ty ? ty : y > ty + 1 ? ty + 1 : y;
      if ((x - nx) * (x - nx) + (y - ny) * (y - ny) < r * r) return true;
    }
  }
  return false;
}

function blocksSight(m, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= m.W || ty >= m.H) return true;
  const i = ty * m.W + tx, t = m.tiles[i];
  if (t === 0 || t === 6 || t === 8) return true;
  if (t === 3) return m.doorOpen[i] < 0.35;
  return false;
}

function blocksShot(t) { return t === 0 || t === 4 || t === 6 || t === 8; }

function los(m, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.hypot(dx, dy) / 0.25);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (blocksSight(m, Math.floor(x0 + dx * t), Math.floor(y0 + dy * t))) return false;
  }
  return true;
}

// true when a body of radius r can slide straight from A to B
function walkLine(m, x0, y0, x1, y1, r) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.hypot(dx, dy) / 0.3);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (collides(m, x0 + dx * t, y0 + dy * t, r)) return false;
  }
  return true;
}

const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function walkableT(m, x, y) {
  if (x < 0 || y < 0 || x >= m.W || y >= m.H) return false;
  const t = m.tiles[y * m.W + x];
  return t === 1 || t === 2 || t === 3;
}

function findPath(m, sx, sy, tx, ty) {
  if (!walkableT(m, tx, ty)) {
    let ok = false;
    for (const [dx, dy] of DIRS8) if (walkableT(m, tx + dx, ty + dy)) { tx += dx; ty += dy; ok = true; break; }
    if (!ok) return null;
  }
  if (!walkableT(m, sx, sy)) return null;
  const W = m.W, stamp = ++m.pCount, goal = ty * W + tx, start = sy * W + sx;
  const q = [start];
  m.pStamp[start] = stamp; m.pPar[start] = -1;
  let found = start === goal;
  for (let h = 0; h < q.length && !found; h++) {
    const cur = q[h], cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy] of DIRS8) {
      const nx = cx + dx, ny = cy + dy;
      if (!walkableT(m, nx, ny)) continue;
      if (dx && dy && (!walkableT(m, cx + dx, cy) || !walkableT(m, cx, cy + dy))) continue;
      const ni = ny * W + nx;
      if (m.pStamp[ni] === stamp) continue;
      m.pStamp[ni] = stamp; m.pPar[ni] = cur;
      if (ni === goal) { found = true; break; }
      q.push(ni);
    }
  }
  if (!found) return null;
  const out = [];
  for (let c = goal; c !== -1; c = m.pPar[c]) out.push({ x: (c % W) + 0.5, y: ((c / W) | 0) + 0.5 });
  return out.reverse();
}

function computeVis(m, px, py, R, stamp) {
  const rays = 420, step = 0.3, W = m.W, H = m.H, steps = Math.ceil(R / step);
  const ptx = Math.floor(px), pty = Math.floor(py);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = ptx + dx, y = pty + dy;
      if (x >= 0 && y >= 0 && x < W && y < H) { m.vis[y * W + x] = stamp; m.seen[y * W + x] = 1; }
    }
  }
  for (let k = 0; k < rays; k++) {
    const a = (k / rays) * TAU, sx = Math.cos(a) * step, sy = Math.sin(a) * step;
    let x = px, y = py;
    for (let s = 0; s < steps; s++) {
      const tx = Math.floor(x), ty = Math.floor(y);
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) break;
      const i = ty * W + tx;
      m.vis[i] = stamp; m.seen[i] = 1;
      if (s > 0 && blocksSight(m, tx, ty)) break;
      x += sx; y += sy;
    }
  }
}

function convertArea(m, x, y, r, amt) {
  const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(m.W - 1, Math.ceil(x + r));
  const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(m.H - 1, Math.ceil(y + r));
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const i = ty * m.W + tx;
      if (m.tiles[i] === 0 && !m.wallVis[i]) continue;
      const d = Math.hypot(tx + 0.5 - x, ty + 0.5 - y);
      if (d < r) m.conv[i] = Math.min(1, m.conv[i] + amt * (1 - d / r));
    }
  }
}
