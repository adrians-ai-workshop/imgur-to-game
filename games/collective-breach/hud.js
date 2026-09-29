"use strict";

// ---- 2D overlay: HUD, target brackets, minimap, menus ----
const HG = "#4dff88", HDIM = "rgba(150,255,195,0.62)", HGOLD = "#ffe27a";
const TIPS = [
  "UNAWARE CREW CAN BE ASSIMILATED SILENTLY. APPROACH FROM OUTSIDE THEIR VIEW CONE.",
  "STUN CREW WITH THE DISRUPTOR, THEN ASSIMILATE THEM INSTANTLY.",
  "OUR SHIELDS ADAPT. EVERY PHASER TYPE LOSES POWER WITH EACH HIT.",
  "MEDICS REVIVE THE FALLEN. ASSIMILATE THEM FIRST.",
  "SCAN REVEALS CREW, COMPONENTS AND THE CONDUIT THROUGH BULKHEADS.",
  "CLOSED BULKHEAD DOORS BLOCK LINE OF SIGHT. USE THEM.",
  "SERVO BOOST IS LOUD. CREW WILL HEAR IT.",
];

let mmCanvas = null, mmCtx = null, mmImg = null, mmLevel = null, mmT = -9;
let vignetteC = null, redC = null, scanPatH = null;
const _pv = new THREE.Vector3();

function makeHudAssets() {
  const mk = (edge) => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d"), gr = g.createRadialGradient(128, 128, 40, 128, 128, 182);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, edge); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return c;
  };
  vignetteC = mk("rgba(0,10,4,0.7)"); redC = mk("rgba(255,20,30,0.55)");
  const sl = document.createElement("canvas"); sl.width = 4; sl.height = 3;
  const g = sl.getContext("2d"); g.fillStyle = "rgba(0,0,0,0.9)"; g.fillRect(0, 0, 4, 1);
  scanPatH = hud.createPattern(sl, "repeat");
}

function txt(s, x, y, size, col, align, weight, font, ls) {
  hud.font = (weight || "600") + " " + size + "px " + (font || '"Bahnschrift","Segoe UI",Arial,sans-serif');
  hud.textAlign = align || "left"; hud.textBaseline = "alphabetic";
  if ("letterSpacing" in hud) hud.letterSpacing = (ls || 0) + "px";
  hud.fillStyle = col; hud.fillText(s, x, y);
}
function textW(s, size, weight, ls) {
  hud.font = (weight || "600") + " " + size + "px " + '"Bahnschrift","Segoe UI",Arial,sans-serif';
  if ("letterSpacing" in hud) hud.letterSpacing = (ls || 0) + "px";
  return hud.measureText(s).width;
}
const MONOF = '"Cascadia Mono",Consolas,monospace';
function panel(x, y, w, h, acc) {
  hud.fillStyle = "rgba(3,12,9,0.66)"; hud.fillRect(x, y, w, h);
  hud.strokeStyle = "rgba(90,255,150,0.22)"; hud.lineWidth = 1; hud.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const k = 10 * G.hs;
  hud.strokeStyle = acc || HG; hud.lineWidth = 2; hud.beginPath();
  hud.moveTo(x, y + k); hud.lineTo(x, y); hud.lineTo(x + k, y);
  hud.moveTo(x + w - k, y + h); hud.lineTo(x + w, y + h); hud.lineTo(x + w, y + h - k); hud.stroke();
}
function bar(x, y, w, h, f, col) { hud.fillStyle = "rgba(255,255,255,0.09)"; hud.fillRect(x, y, w, h); hud.fillStyle = col; hud.fillRect(x, y, w * clamp(f, 0, 1), h); }
const pad6 = (n) => String(Math.max(0, Math.floor(n))).padStart(6, "0");
const fmtTime = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

function scr(x, y, z) {
  _pv.set(x - camera.position.x, y - camera.position.y, z - camera.position.z);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  if (_pv.dot(fwd) < 0.3) return null;
  _pv.set(x, y, z).project(camera);
  return { x: (_pv.x * 0.5 + 0.5) * VW, y: (-_pv.y * 0.5 + 0.5) * VH };
}

function drawHud() {
  hud.setTransform(DPR, 0, 0, DPR, 0, 0);
  hud.clearRect(0, 0, VW, VH);
  if (glFailed) { hud.fillStyle = "#000"; hud.fillRect(0, 0, VW, VH); txt("WEBGL IS REQUIRED FOR THIS GAME", VW / 2, VH / 2, 24, "#fff", "center"); return; }
  if (!vignetteC) makeHudAssets();
  const m = G.mode, play = m === "play" || m === "dying" || m === "paused" || m === "briefing" || m === "clear" || m === "dead";
  if (play && m !== "clear" && m !== "dead") drawVision();
  if (m === "play" || m === "dying" || m === "paused") { drawMarkers(); drawCrosshair(); drawHudPanels(); }
  switch (m) {
    case "attract": drawAttract(); break;
    case "briefing": drawBriefing(); break;
    case "paused": drawPause(); break;
    case "clear": drawClear(); break;
    case "dead": drawDead(); break;
    case "gameover": drawEnd(false); break;
    case "victory": drawEnd(true); break;
    case "dying": hud.fillStyle = "rgba(0,0,0," + clamp(G.modeT / 2.6, 0, 0.75).toFixed(2) + ")"; hud.fillRect(0, 0, VW, VH); break;
  }
}

function drawVision() {
  hud.globalAlpha = 1;
  hud.drawImage(vignetteC, 0, 0, VW, VH);
  if (G.alert > 0) { hud.globalAlpha = 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(G.t * 5)); hud.drawImage(redC, 0, 0, VW, VH); hud.globalAlpha = 1; }
  hud.fillStyle = "rgba(40,255,110,0.035)"; hud.fillRect(0, 0, VW, VH);
  if (G.hurt > 0) { hud.fillStyle = "rgba(255,40,20," + (G.hurt * 0.45).toFixed(3) + ")"; hud.fillRect(0, 0, VW, VH); }
  if (G.flash > 0) { hud.fillStyle = "rgba(90,255,150," + (G.flash * 0.3).toFixed(3) + ")"; hud.fillRect(0, 0, VW, VH); }
  hud.globalAlpha = 0.05; hud.fillStyle = scanPatH; hud.fillRect(0, 0, VW, VH); hud.globalAlpha = 1;
  if (G.mode === "play" && G.scanPulse < 1.2) {
    const t = G.scanPulse / 1.2;
    hud.strokeStyle = "rgba(110,255,160," + (1 - t).toFixed(2) + ")"; hud.lineWidth = 3 * (1 - t) + 1;
    hud.beginPath(); hud.arc(VW / 2, VH / 2, t * Math.hypot(VW, VH) * 0.6, 0, TAU); hud.stroke();
  }
  if (G.hurt > 0.05) {
    const p = G.p, rel = angDiff(G.hurtDir, p.yaw + Math.PI), r = Math.min(VW, VH) * 0.28;
    const a = -rel;
    hud.strokeStyle = "rgba(255,60,40," + clamp(G.hurt * 2, 0, 1).toFixed(2) + ")"; hud.lineWidth = 8 * G.hs;
    hud.beginPath(); hud.arc(VW / 2, VH / 2, r, -Math.PI / 2 + a - 0.3, -Math.PI / 2 + a + 0.3); hud.stroke();
  }
}

function drawCrosshair() {
  const p = G.p, hs = G.hs, cx = VW / 2, cy = VH / 2, c = G.cand, ch = p.chan;
  hud.lineWidth = 2;
  const col = ch ? "#6dff9a" : c ? (c.state === "down" ? HGOLD : "#9dffb8") : "rgba(150,255,195,0.75)";
  hud.strokeStyle = col;
  const gap = (c || ch ? 7 : 11) * hs, len = 9 * hs;
  hud.beginPath();
  hud.moveTo(cx - gap - len, cy); hud.lineTo(cx - gap, cy); hud.moveTo(cx + gap, cy); hud.lineTo(cx + gap + len, cy);
  hud.moveTo(cx, cy - gap - len); hud.lineTo(cx, cy - gap); hud.moveTo(cx, cy + gap); hud.lineTo(cx, cy + gap + len); hud.stroke();
  hud.fillStyle = col; hud.fillRect(cx - 1.5, cy - 1.5, 3, 3);
  if (ch) {
    hud.lineWidth = 4 * hs; hud.beginPath(); hud.arc(cx, cy, 28 * hs, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(ch.held, 0, 1)); hud.stroke();
  }
}

function drawBrackets(x, y, w, h, col, lw) {
  const k = Math.min(w, h) * 0.28;
  hud.strokeStyle = col; hud.lineWidth = lw; hud.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const px = x + (sx * w) / 2, py = y + (sy * h) / 2;
    hud.moveTo(px, py - sy * k); hud.lineTo(px, py); hud.lineTo(px - sx * k, py);
  }
  hud.stroke();
}

function drawMarkers() {
  const p = G.p, L = G.L, hs = G.hs, scanned = p.scanT > 0;
  const seenBy = (x, z) => hasLOS(L, p.x, p.z, x, z);
  for (const c of G.crew) {
    const d = Math.hypot(c.x - p.x, c.z - p.z), vis = d < 38 && seenBy(c.x, c.z);
    const H = c.d.big || 1;
    const top = scr(c.x, c.state === "down" ? 0.5 : 1.9 * H, c.z), bot = scr(c.x, 0, c.z);
    if (!top || !bot) continue;
    const h = Math.max(14, Math.abs(bot.y - top.y)), w = h * (c.state === "down" ? 1.6 : 0.55), cy = (top.y + bot.y) / 2;
    const col = c.state === "down" ? "#ffe27a" : c.state === "combat" ? "#ff5a4a" : c.state === "held" ? "#6dff9a" : c.aware > 0.4 ? "#ffa04a" : "#5cf59a";
    if (vis) {
      drawBrackets(top.x, cy, w, h, col, 2);
      const fs = Math.max(9, 10.5 * hs);
      txt(c.d.name + (c.k === "captain" ? " (TARGET)" : ""), top.x, top.y - 6 * hs, fs, col, "center", "700", null, 1);
      if (c.hp < c.d.hp && c.state !== "down") bar(top.x - w / 2, bot.y + 4, w, 4 * hs, c.hp / c.d.hp, "#ff6a5a");
      if (c.state === "patrol" || c.state === "investigate") if (c.aware > 0.05) bar(top.x - w / 2, bot.y + 4 + 6 * hs, w, 3 * hs, c.aware, c.aware > 0.5 ? "#ff8a4a" : "#ffe27a");
      if (c.state === "down") txt("ASSIMILATE", top.x, bot.y + 16 * hs, fs, "#ffe27a", "center", "700", null, 1);
    } else if (scanned) {
      const a = 0.5 + 0.4 * Math.sin(G.t * 6);
      hud.strokeStyle = "rgba(255,90,80," + a.toFixed(2) + ")"; hud.lineWidth = 2;
      const r = 8 * hs; hud.beginPath(); hud.moveTo(top.x, cy - r); hud.lineTo(top.x + r, cy); hud.lineTo(top.x, cy + r); hud.lineTo(top.x - r, cy); hud.closePath(); hud.stroke();
      txt(Math.round(d) + "m", top.x, cy + r + 12 * hs, 9.5 * hs, "rgba(255,120,110," + a.toFixed(2) + ")", "center", "700");
    }
  }
  for (const d of G.drones) {
    const top = scr(d.x, 2.0, d.z);
    if (!top || Math.hypot(d.x - p.x, d.z - p.z) > 30) continue;
    hud.fillStyle = "#6dff9a"; hud.beginPath(); hud.moveTo(top.x, top.y); hud.lineTo(top.x - 5 * hs, top.y - 8 * hs); hud.lineTo(top.x + 5 * hs, top.y - 8 * hs); hud.fill();
  }
  for (const it of G.items) {
    if (it.taken || (it.type !== "key" && !scanned)) continue;
    const s = scr(it.x, 1.2, it.z);
    if (!s) continue;
    const d = Math.hypot(it.x - p.x, it.z - p.z), vis = seenBy(it.x, it.z);
    if (!vis && !scanned && it.type !== "key") continue;
    const col = it.def ? hexCss(it.def.col) : it.type === "cell" ? "#7dff9a" : "#7fe3ff";
    hud.strokeStyle = col; hud.lineWidth = 2; const r = 9 * hs;
    hud.strokeRect(s.x - r, s.y - r, r * 2, r * 2);
    txt((it.def ? it.def.short + " " : "") + Math.round(d) + "m", s.x, s.y - r - 5 * hs, 10 * hs, col, "center", "700", null, 1);
  }
  const cc = roomCentre(L.rooms[L.exitRoom]), cs = scr(cc.x, 2.0, cc.z);
  if (cs && (scanned || G.online || L.seen[tileOf(cc.z) * L.W + tileOf(cc.x)])) {
    const col = G.online ? "#ffe27a" : "#ff6a5a", d = Math.hypot(cc.x - p.x, cc.z - p.z), r = 12 * hs;
    hud.strokeStyle = col; hud.lineWidth = 2; hud.beginPath(); hud.arc(cs.x, cs.y, r, 0, TAU); hud.stroke();
    txt("CONDUIT " + Math.round(d) + "m", cs.x, cs.y - r - 6 * hs, 10 * hs, col, "center", "700", null, 1);
  }
}

function updateMinimap() {
  const L = G.L;
  if (mmLevel !== L) {
    mmCanvas = document.createElement("canvas"); mmCanvas.width = L.W; mmCanvas.height = L.H;
    mmCtx = mmCanvas.getContext("2d"); mmImg = mmCtx.createImageData(L.W, L.H); mmLevel = L; mmT = -9;
  }
  if (G.t - mmT < 0.3) return;
  mmT = G.t;
  const d = mmImg.data;
  for (let i = 0; i < L.N; i++) {
    const o = i * 4;
    if (!L.seen[i]) { d[o + 3] = 0; continue; }
    const t = L.tiles[i];
    let r, g, b;
    if (t === 0) { r = 78; g = 108; b = 128; }
    else if (t === TT.DOOR) { r = 220; g = 180; b = 80; }
    else if (t >= 3) { r = 52; g = 72; b = 88; }
    else { const rid = L.roomAt[i], acc = rid >= 0 ? ROOM_DEF[L.rooms[rid].type].acc : 0x3a5a78; r = 24 + ((acc >> 16) & 255) * 0.16; g = 44 + ((acc >> 8) & 255) * 0.16; b = 66 + (acc & 255) * 0.14; }
    d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
  }
  mmCtx.putImageData(mmImg, 0, 0);
}

function drawHudPanels() {
  const hs = G.hs, p = G.p, L = G.L;
  const Lx = SAFE.l + 16 * hs, T = SAFE.t + 14 * hs, Rt = VW - SAFE.r - 16 * hs, B = VH - SAFE.b - 14 * hs;
  const alert = G.alert > 0, acc = alert ? "#ff5a4a" : HG;

  const pw = 250 * hs, ph = 150 * hs;
  panel(Lx, T, pw, ph, acc);
  let y = T + 22 * hs;
  const row = (label, val, f, col) => {
    txt(label, Lx + 12 * hs, y, 10.5 * hs, HDIM, "left", "700", null, 2 * hs);
    txt(val, Lx + pw - 12 * hs, y, 10.5 * hs, "#fff", "right", "700");
    bar(Lx + 12 * hs, y + 5 * hs, pw - 24 * hs, 7 * hs, f, col); y += 29 * hs;
  };
  row("INTEGRITY", Math.ceil(p.hp) + "%", p.hp / p.max, p.hp / p.max > 0.3 ? HG : "#ff5a4a");
  row("DISRUPTOR [RMB]", Math.floor(p.energy) + "%", p.energy / 100, "#7fe3ff");
  row("SERVO BOOST [SHIFT]", Math.floor(p.stamina) + "%", p.stamina / 100, "#c8ff7a");
  txt("ADAPTATION", Lx + 12 * hs, y, 10.5 * hs, HDIM, "left", "700", null, 2 * hs);
  const bw = (pw - 24 * hs - 16 * hs) / 3;
  ["A", "B", "C"].forEach((k, i) => {
    const bx = Lx + 12 * hs + i * (bw + 8 * hs);
    bar(bx, y + 5 * hs, bw, 6 * hs, p.adapt[k] / 0.8, hexCss(WEAPON[k].col));
    txt("T" + WEAPON[k].n + " " + Math.round(p.adapt[k] * 100) + "%", bx, y + 22 * hs, 9 * hs, HDIM, "left", "600");
  });

  const cw = clamp(VW - 2 * (pw + 46 * hs), 250 * hs, 430 * hs), cx = VW / 2 - cw / 2, ch = 116 * hs;
  panel(cx, T, cw, ch, acc);
  let cy = T + 21 * hs;
  txt("DECK " + (G.deckIdx + 1) + " / " + DECKS.length + "  //  " + L.cfg.name, VW / 2, cy, 11.5 * hs, acc, "center", "700", null, 2 * hs);
  cy += 24 * hs;
  const done = G.assimCount >= G.quota;
  txt("ASSIMILATED", cx + 14 * hs, cy, 10.5 * hs, HDIM, "left", "700", null, 2 * hs);
  txt(G.assimCount + " / " + G.quota, cx + cw - 14 * hs, cy, 14 * hs, done ? HGOLD : "#fff", "right", "800", MONOF);
  bar(cx + 14 * hs, cy + 6 * hs, cw - 28 * hs, 6 * hs, G.assimCount / G.quota, done ? HGOLD : HG);
  cy += 30 * hs;
  const chips = G.items.filter((i) => i.type === "key").map((i) => ({ label: i.def.short, col: hexCss(i.def.col), ok: i.taken }));
  if (G.captain) chips.push({ label: "CAPTAIN", col: "#f2c14e", ok: !!G.captain.assimilated });
  let chipX = cx + 14 * hs; const fs = 10 * hs;
  for (const c of chips) {
    const w = textW(c.label, fs, "700", 1) + 20 * hs;
    if (chipX + w > cx + cw - 10 * hs) { chipX = cx + 14 * hs; cy += 18 * hs; }
    hud.fillStyle = c.ok ? c.col : "rgba(255,255,255,0.07)"; hud.fillRect(chipX, cy - 11 * hs, w, 16 * hs);
    hud.strokeStyle = c.col; hud.lineWidth = 1; hud.strokeRect(chipX + 0.5, cy - 10.5 * hs, w - 1, 15 * hs);
    txt(c.label, chipX + w / 2, cy + hs, fs, c.ok ? "#04110a" : c.col, "center", "800", null, 1);
    chipX += w + 6 * hs;
  }
  cy += 24 * hs;
  if (G.online) txt("CONDUIT ONLINE > ENGINEERING", VW / 2, cy, 11.5 * hs, Math.sin(G.t * 6) > -0.3 ? HGOLD : "#a08840", "center", "800", null, 2 * hs);
  else txt("CONDUIT OFFLINE", VW / 2, cy, 11.5 * hs, "#ff8a7a", "center", "700", null, 2 * hs);
  if (alert) {
    const ay = T + ch + 10 * hs;
    hud.fillStyle = "rgba(160,10,10," + (0.55 + 0.25 * Math.sin(G.t * 8)).toFixed(2) + ")"; hud.fillRect(VW / 2 - 110 * hs, ay, 220 * hs, 26 * hs);
    txt("RED ALERT", VW / 2, ay + 19 * hs, 14 * hs, "#fff", "center", "800", null, 4 * hs);
    bar(VW / 2 - 110 * hs, ay + 26 * hs, 220 * hs, 3 * hs, G.alert / 16, "#ff6a5a");
  }

  updateMinimap();
  const mw = 190 * hs, mx = Rt - mw, my = T;
  panel(mx, my, mw, mw, acc);
  hud.save(); hud.beginPath(); hud.rect(mx + 4, my + 4, mw - 8, mw - 8); hud.clip();
  hud.translate(mx + mw / 2, my + mw / 2); hud.rotate(p.yaw);
  const sc = 3.1 * hs, px = p.x / TILE, pz = p.z / TILE;
  hud.scale(sc, sc); hud.translate(-px, -pz);
  hud.imageSmoothingEnabled = false; hud.drawImage(mmCanvas, 0, 0); hud.imageSmoothingEnabled = true;
  const dot = (x, z, r, col) => { hud.fillStyle = col; hud.fillRect(x / TILE - r / 2, z / TILE - r / 2, r, r); };
  const scanned = p.scanT > 0, dr = 1.6;
  const cc = roomCentre(L.rooms[L.exitRoom]); dot(cc.x, cc.z, dr * 1.8, G.online ? HGOLD : "#ff6a5a");
  for (const it of G.items) if (!it.taken && it.type === "key") dot(it.x, it.z, dr * 1.4, hexCss(it.def.col));
  for (const c of G.crew) if (scanned || hasLOS(L, p.x, p.z, c.x, c.z)) dot(c.x, c.z, dr, c.state === "down" ? HGOLD : "#ff5a4a");
  for (const d of G.drones) dot(d.x, d.z, dr, "#6dff9a");
  hud.restore();
  hud.fillStyle = "#fff"; hud.beginPath(); hud.moveTo(mx + mw / 2, my + mw / 2 - 6 * hs); hud.lineTo(mx + mw / 2 - 4 * hs, my + mw / 2 + 4 * hs); hud.lineTo(mx + mw / 2 + 4 * hs, my + mw / 2 + 4 * hs); hud.fill();

  let sy = my + mw + 26 * hs;
  txt(pad6(G.score), Rt, sy, 26 * hs, "#fff", "right", "800", MONOF);
  sy += 19 * hs; txt("HI " + pad6(Math.max(G.hi, G.score)), Rt, sy, 11 * hs, HDIM, "right", "700", MONOF, 1);
  sy += 19 * hs; txt("COLLECTIVE " + G.drones.length + "/" + MAX_DRONES + "   CYCLES " + "\u25CF".repeat(G.lives) + "\u25CB".repeat(Math.max(0, 3 - G.lives)), Rt, sy, 10.5 * hs, HDIM, "right", "700", null, 1);
  sy += 18 * hs; txt("SCAN [Q] " + (p.scanCD <= 0 ? "READY" : Math.ceil(p.scanCD) + "s"), Rt, sy, 10.5 * hs, p.scanCD <= 0 ? HG : HDIM, "right", "700", null, 1);

  let ly = B - (G.mode === "paused" ? 40 * hs : 0);
  for (let i = 0; i < G.log.length; i++) {
    const l = G.log[i], age = G.t - l.t;
    if (age > 8) continue;
    hud.globalAlpha = clamp(1 - (age - 5) / 3, 0, 1) * (1 - i * 0.12);
    txt(l.text, Lx, ly, 12 * hs, l.col, "left", "700", null, 1); ly -= 20 * hs;
  }
  hud.globalAlpha = 1;

  let prompt = "", pcol = HG;
  if (G.cand) { const c = G.cand; prompt = c.state === "down" ? "HOLD [LMB] - ASSIMILATE (INSTANT)" : c.aware < 0.5 && (c.state === "patrol" || c.state === "investigate") ? "HOLD [LMB] - SILENT ASSIMILATION" : "HOLD [LMB] - ASSIMILATE"; }
  else if (G.prompt) { prompt = G.prompt; pcol = "#ff9a7a"; }
  else if (p.chan) prompt = "ASSIMILATING... " + Math.round(p.chan.held * 100) + "%";
  if (prompt) {
    const w = textW(prompt, 13 * hs, "700", 2 * hs) + 36 * hs;
    panel(VW / 2 - w / 2, B - 40 * hs, w, 30 * hs, pcol);
    txt(prompt, VW / 2, B - 20 * hs, 13 * hs, pcol, "center", "700", null, 2 * hs);
  }
  if (G.mode === "play" && !G.locked) txt("CLICK TO CAPTURE MOUSE  /  ARROW KEYS ALSO TURN", VW / 2, B - 56 * hs, 11 * hs, HGOLD, "center", "700", null, 2);
  if (G.hintT < 30 && G.mode === "play") {
    hud.globalAlpha = clamp((30 - G.hintT) / 4, 0, 1) * 0.85;
    txt("WASD MOVE / MOUSE LOOK / LMB ASSIMILATE / RMB DISRUPTOR / Q SCAN / SHIFT BOOST / ESC PAUSE", Rt, B, 10 * hs, HDIM, "right", "700", null, 1);
    hud.globalAlpha = 1;
  }
}

// ---------- screens ----------
function drawCard(title, sub, lines, foot, acc, w) {
  const hs = G.hs, cw = Math.min(w || 620 * hs, VW - 40 * hs), lh = 26 * hs, ch = 96 * hs + lines.length * lh + 44 * hs;
  const x = VW / 2 - cw / 2, y = VH / 2 - ch / 2;
  hud.fillStyle = "rgba(0,4,3,0.5)"; hud.fillRect(0, 0, VW, VH);
  panel(x, y, cw, ch, acc); hud.fillStyle = "rgba(2,10,7,0.6)"; hud.fillRect(x, y, cw, ch);
  txt(title, VW / 2, y + 44 * hs, 30 * hs, acc, "center", "800", null, 4 * hs);
  if (sub) txt(sub, VW / 2, y + 68 * hs, 12 * hs, HDIM, "center", "700", null, 3 * hs);
  let ly = y + 108 * hs;
  for (const l of lines) {
    if (l.length === 2 && l[1][0] !== "#") { txt(l[0], x + 30 * hs, ly, 13 * hs, HDIM, "left", "700", null, 2 * hs); txt(l[1], x + cw - 30 * hs, ly, 15 * hs, "#fff", "right", "800", MONOF); }
    else txt(l[0], VW / 2, ly, 12 * hs, l[1] || HDIM, "center", "700", null, 1);
    ly += lh;
  }
  hud.globalAlpha = 0.55 + 0.45 * Math.sin(G.t * 5);
  txt(foot, VW / 2, y + ch - 20 * hs, 13 * hs, "#fff", "center", "800", null, 3 * hs); hud.globalAlpha = 1;
}

function drawBriefing() {
  const keys2 = G.items.filter((i) => i.type === "key").map((i) => i.def.name);
  const lines = [["VESSEL", "ISS MERIDIAN"], ["ASSIMILATE", G.quota + " CREW"], ["RECOVER", G.keyTotal + " COMPONENTS"], [keys2.join("  /  "), "#c8d8d0"], ["EXTRACT VIA", "TRANSWARP CONDUIT"]];
  if (G.captain) lines.splice(3, 0, ["PRIORITY TARGET", "THE CAPTAIN"]);
  lines.push([TIPS[(G.deckIdx * 2 + G.runSeed) % TIPS.length], "#9fe8bd"]);
  drawCard("DECK " + (G.deckIdx + 1) + " - " + G.L.cfg.name, "INFILTRATION BRIEFING", lines, "[ENTER] BEAM IN", HG, 700 * G.hs);
}
function drawPause() {
  drawCard("PAUSED", "THE COLLECTIVE WAITS", [["MOVE", "WASD"], ["LOOK", "MOUSE / ARROWS"], ["ASSIMILATE", "HOLD LMB / SPACE"], ["DISRUPTOR", "RMB / F"], ["SCAN / BOOST", "Q / SHIFT"], ["MUTE / FULLSCREEN", "M / F (MENUS)"]], "[CLICK] RESUME", HG, 560 * G.hs);
}
function drawClear() {
  const s = G.stats;
  drawCard("DECK " + (G.deckIdx + 1) + " SECURED", "EFFICIENCY ACHIEVED", [["ASSIMILATED", s.assim + " / " + s.total], ["SILENT TAKEDOWNS", String(s.silent)], ["DRONES IN COLLECTIVE", String(s.drones)], ["DECK EXPLORED", Math.round(s.explored * 100) + "%"], ["TIME", fmtTime(s.time)], ["BONUS", "+" + s.bonus], ["SCORE", pad6(G.score)]], G.deckIdx >= DECKS.length - 1 ? "[ENTER] FINISH" : "[ENTER] NEXT DECK", HGOLD, 620 * G.hs);
}
function drawDead() {
  drawCard("DRONE OFFLINE", "THE COLLECTIVE RESTORES YOU", [["CYCLES REMAINING", String(G.lives)], ["SCORE RESTORED TO", pad6(G.deckStartScore)]], "[ENTER] RETRY DECK " + (G.deckIdx + 1), "#ff6a5a", 560 * G.hs);
}
function drawEnd(won) {
  drawCard(won ? "SHIP ASSIMILATED" : "COLLECTIVE LOST", won ? "RESISTANCE WAS FUTILE" : "THE MISSION FAILED", [["FINAL SCORE", pad6(G.score)], ["HI-SCORE", pad6(G.hi)], [won ? "EFFICIENCY ACHIEVED." : "THE COLLECTIVE ADAPTS.", HGOLD]], "[ENTER] RETURN", won ? HGOLD : "#ff6a5a", 620 * G.hs);
}

function drawAttract() {
  const hs = G.hs;
  hud.fillStyle = "rgba(0,8,6,0.2)"; hud.fillRect(0, 0, VW, VH);
  hud.drawImage(vignetteC, 0, 0, VW, VH);
  const barH = SAFE.t + VH * 0.07;
  hud.fillStyle = "#000"; hud.fillRect(0, 0, VW, barH); hud.fillRect(0, VH - barH, VW, barH);
  hud.fillStyle = "rgba(77,255,136,0.5)"; hud.fillRect(0, barH, VW, 1); hud.fillRect(0, VH - barH - 1, VW, 1);
  const cxp = VW / 2, cyp = VH * 0.25, size = Math.min(VW * 0.085, VH * 0.14), ls = size * 0.04;
  const glitch = (G.t % 4.7) < 0.14;
  const draw = (dx, col) => {
    txt("COLLECTIVE", cxp + dx, cyp, size, col, "center", "800", null, ls);
    txt("BREACH", cxp + dx, cyp + size * 0.95, size, col, "center", "800", null, ls);
  };
  if (glitch) { draw(-size * 0.04, "rgba(0,255,255,0.7)"); draw(size * 0.04, "rgba(255,0,80,0.7)"); }
  hud.shadowColor = "rgba(77,255,136,0.8)"; hud.shadowBlur = 32 * hs;
  const tg = hud.createLinearGradient(0, cyp - size, 0, cyp + size); tg.addColorStop(0, "#d6ffe4"); tg.addColorStop(1, "#22d466");
  draw(0, tg); hud.shadowBlur = 0;
  const fit = (s, want, l) => { const w = textW(s, want, "700", l); return w > VW * 0.92 ? (want * VW * 0.92) / w : want; };
  const sub = "FIRST-PERSON ASSIMILATION  //  INVADE. ADAPT. ASSIMILATE.";
  txt(sub, cxp, cyp + size * 1.4, fit(sub, clamp(size * 0.14, 11, 22), size * 0.03), HDIM, "center", "700", null, size * 0.03);
  if (Math.sin(G.t * 4) > -0.2) {
    const go = "PRESS ENTER OR CLICK TO BEGIN ASSIMILATION";
    txt(go, cxp, cyp + size * 1.4 + clamp(size * 0.34, 26, 54), fit(go, clamp(size * 0.15, 13, 24), size * 0.03), "#fff", "center", "800", null, size * 0.03);
  }
  const foot = "WASD MOVE  /  MOUSE LOOK  /  LMB ASSIMILATE  /  RMB DISRUPTOR  /  Q SCAN  /  SHIFT BOOST  /  M MUTE  /  F FULLSCREEN";
  txt(foot, cxp, VH - barH - 16 * hs, fit(foot, 11 * hs, 1), HDIM, "center", "700", null, 1);
  txt("HI-SCORE " + pad6(G.hi), VW - SAFE.r - 18 * hs, barH + 26 * hs, 12 * hs, HDIM, "right", "700", MONOF, 1);
  txt("DEMO MODE - DRONE-7 AUTOPILOT", cxp, VH - barH + 26 * hs, 10 * hs, "rgba(150,255,195,0.4)", "center", "700", null, 2);
  if (Snd.muted) txt("MUTED", VW - SAFE.r - 18 * hs, VH - barH + 26 * hs, 10 * hs, HDIM, "right", "700", null, 2);
}

boot();
