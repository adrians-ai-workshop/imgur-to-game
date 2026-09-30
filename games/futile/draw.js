"use strict";

// ---- drawing: tiles, sprites, HUD and screens (everything lands on the low-res NES canvas) ----
const g = gfx;
const whiteCache = new WeakMap();
function whiteOf(c) { let w = whiteCache.get(c); if (!w) { w = tinted(c, WHITE); whiteCache.set(c, w); } return w; }
const greenCache = new WeakMap();
function greenOf(c) { let w = greenCache.get(c); if (!w) { w = tinted(c, 0x2A); greenCache.set(c, w); } return w; }

let camX = 0, camY = 0;
let mm = null, mmCtx = null, mmL = null;

function render() {
  g.imageSmoothingEnabled = false;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.fillStyle = NES[BLACK]; g.fillRect(0, 0, VW, VH);
  if (!G.L) return;
  drawWorld();
  const m = G.mode;
  if (m === "play" || m === "pause" || m === "dying" || m === "dead" || m === "clear") drawHud();
  if (G.warnT > 0) drawWarning();
  if (G.showMap && m === "play") drawBigMap();
  switch (m) {
    case "title": drawTitle(); break;
    case "intro": drawIntro(); break;
    case "pause": drawPause(); break;
    case "dead": drawPanel("DRONE OFFLINE", ["THE COLLECTIVE RESTORES YOU", "", "CONTINUES LEFT " + G.lives, "SCORE " + String(G.stageScore).padStart(6, "0")], "PUSH START", 0x16); break;
    case "clear": drawClear(); break;
    case "over": drawPanel("GAME OVER", ["THE COLLECTIVE HAS FALLEN", "", "SCORE " + String(G.score).padStart(6, "0"), "HI " + String(G.hi).padStart(6, "0")], "PUSH START", 0x16); break;
    case "win": drawPanel("SHIP ASSIMILATED", ["RESISTANCE WAS FUTILE", "", "SCORE " + String(G.score).padStart(6, "0"), "HI " + String(G.hi).padStart(6, "0")], "PUSH START", 0x28); break;
  }
}

// ---------- world ----------
function computeWallVis(L) {
  L.wv = new Uint8Array(L.W * L.H);
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
    const i = y * L.W + x;
    if (L.tiles[i] !== T.WALL) continue;
    let any = 0;
    for (let dy = -1; dy <= 1 && !any; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < L.W && yy < L.H && L.tiles[yy * L.W + xx] !== T.WALL) { any = 1; break; }
    }
    L.wv[i] = any;
  }
}

function drawWorld() {
  const L = G.L, th = buildTiles(L.info.theme);
  if (!L.wv) computeWallVis(L);
  const sh = G.shake > 0 ? Math.round(G.shake) : 0;
  const sx = sh ? ((G.frame & 1) ? sh : -sh) : 0, sy = sh ? ((G.frame & 2) ? sh : -sh) >> 1 : 0;
  camX = Math.round(G.cam.x) + sx; camY = Math.round(G.cam.y) + sy;
  const x0 = Math.max(0, Math.floor(camX / TS)), x1 = Math.min(L.W - 1, Math.floor((camX + VW) / TS));
  const y0 = Math.max(0, Math.floor(camY / TS)), y1 = Math.min(L.H - 1, Math.floor((camY + VH) / TS));
  const anim = G.frame >> 5;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const i = ty * L.W + tx, t = L.tiles[i], px = tx * TS - camX, py = ty * TS - camY, v = L.vari[i];
      L.seen[i] = 1;
      switch (t) {
        case T.WALL:
          if (!L.wv[i]) continue;
          g.drawImage(tileAt(L, tx, ty + 1) !== T.WALL ? th.wallFront : th.wallTop, px, py); continue;
        case T.FLOOR: g.drawImage(th.floor[v < 210 ? 0 : v < 232 ? 1 : v < 246 ? 2 : 3], px, py); break;
        case T.CORR: g.drawImage(th.corr[v & 1], px, py); break;
        case T.DOOR: g.drawImage(th.corr[0], px, py); drawDoor(L, i, px, py); break;
        case T.CONSOLE: g.drawImage(th.console[(anim + v) & 1], px, py); break;
        case T.TABLE: g.drawImage(th.table, px, py); break;
        case T.CRATE: g.drawImage(th.crate, px, py); break;
        case T.BED: g.drawImage(th.bedL, px, py); break;
        case T.BEDR: g.drawImage(th.bedR, px, py); break;
        case T.PILLAR: g.drawImage(th.pillar, px, py); break;
      }
      const cv2 = L.conv[i];
      if (cv2 && t !== T.DOOR) g.drawImage(th.conv[cv2 - 1], px, py);
    }
  }
  drawPads(L);
  drawHazards();
  const list = [];
  for (const it of G.items) if (!it.taken && inView(it.x, it.y, 20)) list.push({ y: it.y - 4, f: () => drawItem(it) });
  for (const c of G.crew) if (inView(c.x, c.y, 24)) list.push({ y: c.state === "down" ? c.y - 6 : c.y, f: () => drawCrewSprite(c) });
  for (const d of G.drones) list.push({ y: d.y, f: () => drawDrone(d) });
  if (G.boss && !G.boss.dead) list.push({ y: G.boss.y + 4, f: () => drawBoss(G.boss) });
  if (!G.p.dead) list.push({ y: G.p.y, f: drawPlayer });
  list.sort((a, b) => a.y - b.y);
  for (const e of list) e.f();
  drawBolts();
  drawParticles();
  for (const tx2 of G.texts) drawText(g, tx2.s, Math.round(tx2.x - camX), Math.round(tx2.y - camY), tx2.col, { align: "center", shadow: true });
  if (G.alert > 0 && !G.demo && ((G.frame >> 4) & 1)) { g.globalAlpha = 0.14; g.fillStyle = NES[0x16]; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
  if (G.flash > 0 && (G.flash & 2)) { g.globalAlpha = 0.5; g.fillStyle = NES[WHITE]; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
}

function drawDoor(L, i, px, py) {
  const o = L.doorOpen[i], ax = L.doorAx[i], sl = L.doorSl[i], lock = L.doorLock[i];
  const len = Math.round(TS * (1 - o));
  if (len <= 0) return;
  const body = lock ? 0x06 : 0x2D, edge = lock ? 0x16 : 0x28;
  if (ax === 0) {
    const y = sl ? py + TS - len : py;
    fillPx(g, px + 5, y, 6, len, BLACK); fillPx(g, px + 6, y, 4, len, body);
    for (let k = 0; k < len; k += 4) fillPx(g, px + 6, y + k, 4, 2, edge);
    fillPx(g, px + 4, sl ? py : py + TS - 2, 8, 2, BLACK);
  } else {
    const x = sl ? px + TS - len : px;
    fillPx(g, x, py + 5, len, 6, BLACK); fillPx(g, x, py + 6, len, 4, body);
    for (let k = 0; k < len; k += 4) fillPx(g, x + k, py + 6, 2, 4, edge);
    fillPx(g, sl ? px : px + TS - 2, py + 4, 2, 8, BLACK);
  }
  if (lock && ((G.frame >> 4) & 1)) fillPx(g, px + 7, py + 7, 2, 2, 0x30);
}

function drawPads(L) {
  const s = L.start, sx = Math.round(s.x - camX), sy = Math.round(s.y - camY);
  if (inView(s.x, s.y, 40)) {
    for (let r = 0; r < 3; r++) { const w = 26 - r * 8; fillPx(g, sx - w, sy - w / 2, w * 2, w, r % 2 ? 0x0B : 0x0A); }
    fillPx(g, sx - 3, sy - 2, 6, 4, ((G.frame >> 3) & 1) ? 0x2A : 0x1A);
  }
  const e = L.exit, ex = Math.round(e.x - camX), ey = Math.round(e.y - camY);
  if (!inView(e.x, e.y, 40)) return;
  const on = G.conduitOn, f = G.frame;
  fillPx(g, ex - 20, ey - 12, 40, 24, BLACK); fillPx(g, ex - 18, ey - 10, 36, 20, 0x00); fillPx(g, ex - 18, ey - 10, 36, 2, 0x10);
  if (on) {
    const cols = [0x30, 0x2C, 0x21, 0x2A];
    for (let r = 0; r < 4; r++) { const k = ((f >> 2) + r) % 4, w = 16 - r * 4; fillPx(g, ex - w, ey - w / 2, w * 2, w, cols[k]); }
    fillPx(g, ex - 2, ey - 14 - ((f >> 1) & 7), 4, 8, 0x30);
    drawText(g, "CONDUIT", ex, ey - 26, 0x28, { align: "center", shadow: true });
  } else {
    for (const [dx, dy] of [[-16, -8], [14, -8], [-16, 8], [14, 8]]) fillPx(g, ex + dx, ey + dy - 1, 3, 3, ((f >> 4) & 1) ? 0x16 : 0x06);
    fillPx(g, ex - 10, ey - 5, 20, 10, 0x0D); fillPx(g, ex - 8, ey - 3, 16, 6, 0x06);
  }
}

function drawHazards() {
  for (const h of G.hazards) {
    const x = Math.round(h.x - camX), y = Math.round(h.y - camY);
    if (h.t < 50) { if ((h.t >> 2) & 1) { fillPx(g, x - 12, y - 12, 24, 1, 0x16); fillPx(g, x - 12, y + 11, 24, 1, 0x16); fillPx(g, x - 12, y - 12, 1, 24, 0x16); fillPx(g, x + 11, y - 12, 1, 24, 0x16); } }
    else { const k = (h.t >> 1) & 1; fillPx(g, x - 12, y - 12, 24, 24, k ? 0x30 : 0x31); fillPx(g, x - 8, y - 8, 16, 16, k ? 0x21 : 0x30); }
  }
}

// ---------- sprites ----------
function blit(img, x, y) { g.drawImage(img, Math.round(x - camX) - (img.width >> 1), Math.round(y - camY) - (img.height >> 1) - 3); }

function drawPlayer() {
  const p = G.p;
  if (p.inv > 0 && ((G.frame >> 2) & 1)) return;
  const set = borgSprites(false);
  const fr = p.moving ? (p.anim >> 3) & 1 : 0;
  blit(set[DIRN[p.dir]][fr], p.x, p.y - (p.moving && fr ? 1 : 0));
  if (p.tub > 0 || p.chan) drawTubules(p);
}
function drawTubules(p) {
  const t = p.chan;
  const hx = p.x + p.fx * 8, hy = p.y + p.fy * 8 - 1;
  const tx = t ? t.x : p.x + p.fx * 15, ty = t ? t.y : p.y + p.fy * 15;
  const n = Math.max(2, Math.floor(Math.hypot(tx - hx, ty - hy) / 3));
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i <= n; i++) {
      const u = i / n, wob = Math.sin(G.frame * 0.9 + i * 0.9 + k * 2.1) * 2 * Math.sin(u * 3.14);
      const px = hx + (tx - hx) * u + (t ? -(ty - hy) / (n * 3 || 1) * wob : 0) + (k - 1) * 1.5 * (t ? 0 : 1);
      const py = hy + (ty - hy) * u + (t ? (tx - hx) / (n * 3 || 1) * wob : 0);
      fillPx(g, Math.round(px - camX), Math.round(py - camY), 2, 2, k === 1 ? 0x3A : 0x2A);
    }
  }
}
function drawCrewSprite(c) {
  const set = crewSprites(c.k, c.skin), x = c.x, y = c.y;
  if (c.state === "down") {
    const spr = set.down[0], sx = Math.round(x - camX), sy = Math.round(y - camY);
    g.save(); g.translate(sx, sy - 1); g.rotate(Math.PI / 2); g.drawImage(c.flash > 0 ? whiteOf(spr) : spr, -8, -8); g.restore();
    if ((G.frame >> 4) & 1) fillPx(g, sx - 1, sy - 15, 3, 3, 0x2A);
    return;
  }
  const fr = (c.anim >> 3) & 1;
  let spr = set[DIRN[c.dir]][fr];
  if (c.flash > 0) spr = whiteOf(spr);
  else if (c.state === "held" && ((G.frame >> 2) & 1)) spr = greenOf(spr);
  blit(spr, x, y);
  const sx = Math.round(x - camX), sy = Math.round(y - camY);
  if (c.state === "held") { const prog = c.held / c.dur; fillPx(g, sx - 7, sy - 17, 14, 3, BLACK); fillPx(g, sx - 6, sy - 16, Math.round(12 * prog), 1, 0x2A); }
  else if (c.state === "alert" || c.state === "combat") drawText(g, "!", sx - 2, sy - 20, 0x16, { shadow: true });
  else if (c.state === "flee") drawText(g, "!", sx - 2, sy - 20, 0x28, { shadow: true });
  else if (c.state === "revive") drawText(g, "+", sx - 2, sy - 20, 0x2C, { shadow: true });
  else if (c.aware > 0.25) drawText(g, "?", sx - 2, sy - 20, c.aware > 0.65 ? 0x27 : 0x28, { shadow: true });
  if (c.hp < c.max && c.state !== "held") { fillPx(g, sx - 6, sy - 15, 12, 2, BLACK); fillPx(g, sx - 6, sy - 15, Math.max(1, Math.round(12 * c.hp / c.max)), 2, 0x16); }
}
function drawDrone(d) {
  if (d.spawn > 0 && ((G.frame >> 1) & 1)) return;
  const set = borgSprites(true, d.accent), fr = (d.anim >> 3) & 1;
  let spr = set[DIRN[d.dir | 0]][fr];
  if (d.flash > 0) spr = whiteOf(spr);
  blit(spr, d.x, d.y);
  if (d.hp < d.max) { const sx = Math.round(d.x - camX), sy = Math.round(d.y - camY); fillPx(g, sx - 6, sy - 15, 12, 2, BLACK); fillPx(g, sx - 6, sy - 15, Math.max(1, Math.round(12 * d.hp / d.max)), 2, 0x2A); }
}
function drawBoss(b) {
  const flash = b.flash > 0 && (b.flash & 1);
  const img = bossArt(b.kind, b.pose, flash);
  const sx = Math.round(b.x - camX), sy = Math.round(b.y - camY);
  fillPx(g, sx - 14, sy + 14, 28, 5, 0x0D);
  let ox = 0;
  if (b.state === "telegraph") ox = (G.frame & 2) ? 1 : -1;
  if (b.state === "intro" && ((G.frame >> 2) & 1)) return;
  g.drawImage(img, sx - 20 + ox, sy - 22);
  if (b.kind === "nova") {
    for (let k = 0; k < 4; k++) { const a = G.frame * 0.06 + k * 1.571; fillPx(g, Math.round(sx + Math.cos(a) * 20) - 2, Math.round(sy + Math.sin(a) * 20) - 2, 4, 4, b.state === "open" ? 0x2D : 0x30); }
  }
  if (b.state === "stagger") {
    const prog = G.p.chan === b ? b.held / b.dur : 0;
    drawText(g, "ASSIMILATE!", sx, sy - 30, 0x28, { align: "center", shadow: true });
    fillPx(g, sx - 15, sy + 22, 30, 4, BLACK); fillPx(g, sx - 14, sy + 23, Math.round(28 * prog), 2, 0x2A);
  }
}
function drawItem(it) {
  const x = Math.round(it.x - camX), y = Math.round(it.y - camY + Math.sin(G.frame * 0.08 + it.ph) * 1.5);
  const sparkle = ((G.frame >> 3) + ((it.ph * 3) | 0)) & 3;
  if (it.type === "key") {
    const ic = keyIcon(it.def); g.drawImage(ic, x - 6, y - 8);
    if (sparkle === 0) fillPx(g, x + 5, y - 9, 2, 2, WHITE);
    fillPx(g, x - 5, y + 5, 10, 2, 0x0D);
  } else {
    const ic = cellIcon(it.type); g.drawImage(ic, x - (ic.width >> 1), y - (ic.height >> 1) - 2);
    fillPx(g, x - 4, y + 4, 8, 2, 0x0D);
  }
}
function drawBolts() {
  for (const b of G.bolts) {
    const x = Math.round(b.x - camX), y = Math.round(b.y - camY);
    if (x < -8 || y < -8 || x > VW + 8 || y > VH + 8) continue;
    const s = b.big ? 5 : 4;
    fillPx(g, x - (s >> 1) - 1, y - (s >> 1) - 1, s + 2, s + 2, BLACK);
    fillPx(g, x - (s >> 1), y - (s >> 1), s, s, b.col);
    fillPx(g, x - 1, y - 1, 2, 2, WHITE);
  }
}
function drawParticles() {
  for (const q of G.parts) fillPx(g, Math.round(q.x - camX), Math.round(q.y - camY), q.sz, q.sz, q.life < 5 && (q.life & 1) ? WHITE : q.col);
}

// ---------- HUD ----------
function panelBox(x, y, w, h, col) {
  fillPx(g, x, y, w, h, BLACK); fillPx(g, x, y, w, 1, col); fillPx(g, x, y + h - 1, w, 1, col); fillPx(g, x, y, 1, h, col); fillPx(g, x + w - 1, y, 1, h, col);
}
function drawHud() {
  const p = G.p, L = G.L, info = L.info;
  const l = SAFE.l + 4, r = VW - SAFE.r - 4, t = SAFE.t;
  fillPx(g, 0, 0, VW, t + 24, BLACK); fillPx(g, 0, t + 24, VW, 1, 0x00);
  drawText(g, "SCORE", l, t + 3, 0x00);
  drawText(g, String(G.score).padStart(6, "0"), l, t + 12, WHITE);
  const hx = l + 44;
  for (let i = 0; i < p.max; i++) g.drawImage(i < p.hp ? HEART_SMALL : HEART_EMPTY, hx + i * 8, t + 3);
  for (let i = 0; i < 5; i++) {
    const full = clamp(p.en - i, 0, 1);
    fillPx(g, hx + i * 9, t + 13, 8, 5, 0x0D); fillPx(g, hx + i * 9 + 1, t + 14, 6, 3, 0x00);
    if (full > 0) fillPx(g, hx + i * 9 + 1, t + 14, Math.max(1, Math.round(6 * full)), 3, full >= 1 ? 0x28 : 0x18);
  }
  // right block
  const rw = 64;
  drawText(g, "WORLD " + info.world + "-" + info.stage, r, t + 3, WHITE, { align: "right" });
  drawText(g, "LIVES", r - 24, t + 12, 0x00, { align: "right" });
  drawText(g, "x" + G.lives, r, t + 12, WHITE, { align: "right" });
  // centre: objective
  const cx = Math.floor(VW / 2);
  const chips = G.items.filter((i) => i.type === "key");
  const cw = chips.length * 12;
  if (VW >= 300) {
    const oy = t + 2;
    if (info.boss) drawText(g, G.boss && G.boss.dead ? "BOSS ASSIMILATED" : G.bossOpen ? "DEFEAT THE BOSS" : "FIND THE PARTS", cx, oy, G.bossOpen ? 0x16 : 0x28, { align: "center" });
    else drawText(g, "CREW " + String(G.assim).padStart(2, "0") + "/" + String(G.quota).padStart(2, "0"), cx, oy, G.assim >= G.quota ? 0x28 : WHITE, { align: "center" });
    chips.forEach((it, i) => {
      const x = cx - cw / 2 + i * 12, ic = keyIcon(it.def);
      g.drawImage(ic, 0, 0, 12, 12, x, t + 11, 10, 10);
      if (!it.taken) { g.globalAlpha = 0.72; fillPx(g, x, t + 11, 10, 10, BLACK); g.globalAlpha = 1; }
    });
  }
  // bottom: messages
  const l0 = SAFE.l + 4, b = VH - SAFE.b - 4;
  G.msgs.forEach((m, i) => {
    const age = G.frame - m.t;
    if (age > 420 || G.mode === "pause") return;
    drawText(g, m.s, l0, b - 8 - i * 9, i === 0 && age < 90 ? m.col : age > 300 ? 0x00 : 0x10, { shadow: true });
  });
  // prompt
  let prompt = "", pc = 0x2A;
  if (p.chan) prompt = "HOLD Z: ASSIMILATING " + Math.floor((p.chan.held / p.chan.dur) * 100) + "%";
  else {
    const c = findTargetPeek();
    if (c) prompt = c === G.boss ? "HOLD Z: ASSIMILATE THE BOSS" : c.state === "down" ? "HOLD Z: ASSIMILATE" : c.aware < 0.5 && (c.state === "patrol" || c.state === "search") ? "HOLD Z: SNEAK ASSIMILATE" : "HOLD Z: ASSIMILATE";
    else if (!G.conduitOn && Math.hypot(p.x - L.exit.x, p.y - L.exit.y) < 40) { prompt = missingText(); pc = 0x27; }
  }
  if (prompt) drawText(g, prompt, Math.floor(VW / 2), VH - SAFE.b - 26, pc, { align: "center", shadow: true });
  // boss bar
  const bo = G.boss;
  if (bo && !bo.dead && bo.state !== "sleep") {
    const w = Math.min(140, VW - 80), x = Math.floor(VW / 2 - w / 2), y = VH - SAFE.b - 16;
    drawText(g, bo.def.name, Math.floor(VW / 2), y - 9, 0x16, { align: "center", shadow: true });
    panelBox(x - 1, y - 1, w + 2, 8, WHITE);
    fillPx(g, x, y, w, 6, 0x06);
    fillPx(g, x, y, Math.round(w * bo.hp / bo.max), 6, bo.state === "stagger" ? 0x28 : 0x16);
  }
  drawMinimap();
}
function findTargetPeek() { return G.p.dead ? null : findTarget(); }
function missingText() {
  const bits = [];
  if (G.L.info.boss) return "DEFEAT THE BOSS FIRST";
  if (G.keysGot < G.keysNeed) bits.push((G.keysNeed - G.keysGot) + " PARTS");
  if (G.assim < G.quota) bits.push((G.quota - G.assim) + " CREW");
  return "NEED " + bits.join(" + ");
}

function buildMap() {
  const L = G.L;
  if (mmL !== L) { mm = mkCanvas(L.W, L.H); mmCtx = mm.getContext("2d"); mmL = L; }
  const img = mmCtx.createImageData(L.W, L.H), d = img.data;
  for (let i = 0; i < L.tiles.length; i++) {
    if (!L.seen[i]) continue;
    const t = L.tiles[i];
    if (t === T.WALL) continue;
    const c = t === T.CORR ? 0x2D : t === T.DOOR ? 0x28 : L.conv[i] > 1 ? 0x0A : L.room[i] >= 0 ? 0x1C : 0x2D;
    const hex = NES[c], o = i * 4;
    d[o] = parseInt(hex.slice(1, 3), 16); d[o + 1] = parseInt(hex.slice(3, 5), 16); d[o + 2] = parseInt(hex.slice(5, 7), 16); d[o + 3] = 255;
  }
  mmCtx.putImageData(img, 0, 0);
}
function drawMinimap() {
  const L = G.L;
  if (mapRefresh || mmL !== L) { buildMap(); mapRefresh = false; }
  const k = Math.max(1, Math.ceil(L.W / 72)), w = Math.floor(L.W / k), h = Math.floor(L.H / k);
  const x = VW - SAFE.r - w - 5, y = VH - SAFE.b - h - 5;
  panelBox(x - 1, y - 1, w + 2, h + 2, 0x00);
  g.globalAlpha = 0.9; g.drawImage(mm, 0, 0, L.W, L.H, x, y, w, h); g.globalAlpha = 1;
  const dot = (px, py, col) => fillPx(g, x + Math.floor(px / TS / k), y + Math.floor(py / TS / k), 2, 2, col);
  dot(L.exit.x, L.exit.y, G.conduitOn ? (((G.frame >> 3) & 1) ? 0x28 : WHITE) : 0x16);
  for (const it of G.items) if (!it.taken && it.type === "key" && L.seen[Math.floor(it.y / TS) * L.W + Math.floor(it.x / TS)]) dot(it.x, it.y, it.def.a);
  for (const d2 of G.drones) dot(d2.x, d2.y, 0x2A);
  if ((G.frame >> 3) & 1) dot(G.p.x, G.p.y, WHITE);
}
function drawBigMap() {
  const L = G.L;
  g.globalAlpha = 0.86; fillPx(g, 0, 0, VW, VH, BLACK); g.globalAlpha = 1;
  const k = Math.max(1, Math.min(Math.floor((VW - 20) / L.W), Math.floor((VH - 50) / L.H)));
  const w = L.W * k, h = L.H * k, x = Math.floor((VW - w) / 2), y = Math.floor((VH - h) / 2) + 6;
  g.drawImage(mm, 0, 0, L.W, L.H, x, y, w, h);
  const dot = (px, py, col, s) => fillPx(g, x + Math.floor((px / TS) * k) - 1, y + Math.floor((py / TS) * k) - 1, s || 3, s || 3, col);
  dot(L.exit.x, L.exit.y, G.conduitOn ? 0x28 : 0x16);
  for (const it of G.items) if (!it.taken && it.type === "key" && L.seen[Math.floor(it.y / TS) * L.W + Math.floor(it.x / TS)]) dot(it.x, it.y, it.def.a);
  for (const c of G.crew) if (inView(c.x, c.y, 120)) dot(c.x, c.y, 0x16, 2);
  if ((G.frame >> 3) & 1) dot(G.p.x, G.p.y, WHITE);
  drawText(g, "MAP - PRESS SELECT (TAB)", Math.floor(VW / 2), y - 12, WHITE, { align: "center" });
}

// ---------- screens ----------
function bigText(s, cx, y, sc, colA, colB, shadowCol) {
  const w = textW(s, sc), x = Math.floor(cx - w / 2), h = 7 * sc;
  const draw = (ox, oy, col) => drawText(g, s, x + ox, y + oy, col, { scale: sc });
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) draw(ox * (sc >> 1), oy * (sc >> 1), BLACK);
  draw(sc, sc, shadowCol);
  g.save(); g.beginPath(); g.rect(x - 4, y - 2, w + 8, Math.floor(h / 2) + 1); g.clip(); draw(0, 0, colA); g.restore();
  g.save(); g.beginPath(); g.rect(x - 4, y + Math.floor(h / 2) + 1, w + 8, h); g.clip(); draw(0, 0, colB); g.restore();
}
function dimRect(y0, y1, a) { g.globalAlpha = a; fillPx(g, 0, y0, VW, y1 - y0, BLACK); g.globalAlpha = 1; }
function blink(period) { return ((G.frame / period) | 0) % 2 === 0; }

function drawTitle() {
  const cx = Math.floor(VW / 2), sc = Math.max(3, Math.min(8, Math.floor(VW / 76)));
  dimRect(0, Math.floor(VH * 0.5), 0.72);
  dimRect(Math.floor(VH * 0.5), Math.floor(VH * 0.5) + 6, 0.4);
  dimRect(VH - 38 - SAFE.b, VH, 0.72);
  const ty = SAFE.t + 16;
  bigText("FUTILE", cx, ty, sc, 0x3A, 0x2A, 0x0A);
  drawText(g, "8-BIT BORG ASSIMILATION", cx, ty + 7 * sc + 8, 0x30, { align: "center", shadow: true });
  drawText(g, "INVADE THE SHIP. ASSIMILATE THE CREW.", cx, ty + 7 * sc + 20, 0x2C, { align: "center", shadow: true });
  if (blink(30)) drawText(g, "PUSH START", cx, VH - SAFE.b - 30, WHITE, { align: "center", shadow: true, scale: 2 });
  drawText(g, "ARROWS/WASD MOVE   Z ASSIMILATE   X SHOOT   ENTER START", cx, VH - SAFE.b - 10, 0x10, { align: "center", shadow: true });
  drawText(g, "HI " + String(G.hi).padStart(6, "0"), VW - SAFE.r - 6, SAFE.t + 4, 0x28, { align: "right", shadow: true });
  drawText(g, "DEMO PLAY", VW - SAFE.r - 6, SAFE.t + 14, 0x00, { align: "right", shadow: true });
  if (Snd.muted) drawText(g, "MUTE", VW - SAFE.r - 6, SAFE.t + 24, 0x00, { align: "right" });
}
function drawIntro() {
  const info = G.L.info, cx = Math.floor(VW / 2);
  fillPx(g, 0, 0, VW, VH, BLACK);
  const th = THEMES[info.theme];
  bigText("WORLD " + info.world + "-" + info.stage, cx, Math.floor(VH * 0.16), 3, 0x38, 0x28, 0x18);
  drawText(g, th.name + (info.boss ? "  -  BOSS STAGE" : ""), cx, Math.floor(VH * 0.16) + 30, info.boss ? 0x16 : 0x2C, { align: "center" });
  let y = Math.floor(VH * 0.16) + 52;
  const lines = info.boss
    ? ["FIND " + info.keys + " SHIP PARTS", "UNLOCK THE ARENA", "DEFEAT " + BOSS_DEFS[info.bossIdx].name, "THEN ASSIMILATE HIM"]
    : ["ASSIMILATE " + G.quota + " CREW MEMBERS", "FIND " + info.keys + " SHIP PARTS", "REACH THE TRANSWARP CONDUIT"];
  for (const s of lines) { drawText(g, s, cx, y, WHITE, { align: "center" }); y += 12; }
  y += 6;
  G.items.filter((i) => i.type === "key").forEach((it, i) => { g.drawImage(keyIcon(it.def), cx - (G.keysNeed * 44) / 2 + i * 44 + 15, y); });
  y += 18;
  G.items.filter((i) => i.type === "key").forEach((it, i) => drawText(g, it.def.short, cx - (G.keysNeed * 44) / 2 + i * 44 + 21, y, it.def.a, { align: "center" }));
  drawText(g, "LIVES x" + G.lives + "     SCORE " + String(G.score).padStart(6, "0"), cx, VH - SAFE.b - 40, 0x10, { align: "center" });
  if (blink(30)) drawText(g, "PUSH START", cx, VH - SAFE.b - 22, WHITE, { align: "center", scale: 2 });
}
function drawPanel(title, lines, foot, col) {
  const cx = Math.floor(VW / 2), w = 220, h = 30 + lines.length * 11 + 22, x = cx - w / 2, y = Math.floor(VH / 2 - h / 2);
  dimRect(0, VH, 0.5);
  panelBox(x, y, w, h, col); panelBox(x + 3, y + 3, w - 6, h - 6, 0x00);
  drawText(g, title, cx, y + 11, col, { align: "center", shadow: true, scale: 2 });
  lines.forEach((s, i) => drawText(g, s, cx, y + 32 + i * 11, WHITE, { align: "center" }));
  if (blink(30)) drawText(g, foot, cx, y + h - 14, 0x28, { align: "center" });
}
function drawClear() {
  const s = G.clearStats || {};
  drawPanel("STAGE CLEAR", ["CREW ASSIMILATED " + s.assim, "SNEAK TAKEDOWNS " + s.silent, "DRONES " + s.drones, "TIME " + s.time + "S", "BONUS +" + s.bonus, "EFFICIENCY ACHIEVED"], G.n >= MAX_STAGE ? "PUSH START" : "PUSH START: NEXT", 0x28);
}
function drawPause() {
  drawPanel("PAUSE", ["ARROWS/WASD  MOVE", "Z / J / SPACE  ASSIMILATE", "X / K  DISRUPTOR", "TAB  MAP    M  MUTE", "F  FULLSCREEN"], "ENTER: RESUME", 0x2C);
}
function drawWarning() {
  const cx = Math.floor(VW / 2), y = Math.floor(VH / 2) - 12;
  if ((G.frame >> 2) & 1) { g.globalAlpha = 0.8; fillPx(g, 0, y - 6, VW, 30, 0x06); g.globalAlpha = 1; drawText(g, "WARNING!!", cx, y + 2, WHITE, { align: "center", scale: 3, shadow: true }); }
}

boot();
