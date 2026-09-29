"use strict";

// ---- rendering: world, sprites, HUD, screens ----
const FONT = '"Bahnschrift","Segoe UI Variable Display","Segoe UI","Helvetica Neue",Arial,sans-serif';
const MONO = '"Cascadia Mono","Consolas","SFMono-Regular",monospace';
const GREEN = "#4dff88", DIM = "rgba(150,255,195,0.62)", GOLD = "#ffe27a";
const TIPS = [
  "UNAWARE CREW CAN BE ASSIMILATED SILENTLY. APPROACH FROM OUTSIDE THEIR VIEW CONE.",
  "DOWNED CREW ASSIMILATE INSTANTLY. LET YOUR DRONES SOFTEN THE TARGETS.",
  "OUR SHIELDS ADAPT. EVERY PHASER TYPE LOSES POWER WITH EACH HIT.",
  "CABLE CLIPS ORGANIZE THE COLLECTIVE. TIDIER DRONES SCORE HIGHER.",
  "MEDICS REVIVE THE FALLEN. ASSIMILATE THEM FIRST.",
  "SCAN REVEALS CREW, COMPONENTS AND THE CONDUIT THROUGH BULKHEADS.",
  "CLOSED BULKHEAD DOORS BLOCK LINE OF SIGHT. USE THEM.",
];

let vigCanvas = null, vigRed = null, scanPat = null;
let mmCanvas = null, mmCtx = null, mmImg = null, mmMap = null, mmT = 0;

function buildOverlays() {
  if (vigCanvas) return;
  const mk = (edge) => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d"), gr = g.createRadialGradient(128, 128, 30, 128, 128, 182);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.55, "rgba(0,0,0,0)"); gr.addColorStop(1, edge);
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return c;
  };
  vigCanvas = mk("rgba(0,0,0,0.8)");
  vigRed = mk("rgba(255,20,30,0.6)");
  const sl = document.createElement("canvas"); sl.width = 4; sl.height = 3;
  const g = sl.getContext("2d"); g.fillStyle = "rgba(0,0,0,0.9)"; g.fillRect(0, 0, 4, 1);
  scanPat = ctx.createPattern(sl, "repeat");
}

// ---------- small helpers ----------
function rr(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mixHex(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return "rgb(" + Math.round(lerp(A[0], B[0], t)) + "," + Math.round(lerp(A[1], B[1], t)) + "," + Math.round(lerp(A[2], B[2], t)) + ")";
}
function txt(s, x, y, size, col, align, weight, font, ls) {
  ctx.font = (weight || "600") + " " + size + "px " + (font || FONT);
  ctx.textAlign = align || "left"; ctx.textBaseline = "alphabetic";
  if ("letterSpacing" in ctx) ctx.letterSpacing = (ls || 0) + "px";
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function textW(s, size, weight, ls) {
  ctx.font = (weight || "600") + " " + size + "px " + FONT;
  if ("letterSpacing" in ctx) ctx.letterSpacing = (ls || 0) + "px";
  return ctx.measureText(s).width;
}
function panel(x, y, w, h, acc) {
  ctx.fillStyle = "rgba(3,12,9,0.7)"; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(90,255,150,0.22)"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const k = 10 * G.hs;
  ctx.strokeStyle = acc || GREEN; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(x, y + k); ctx.lineTo(x, y); ctx.lineTo(x + k, y);
  ctx.moveTo(x + w - k, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - k);
  ctx.stroke();
}
function bar(x, y, w, h, f, col) {
  ctx.fillStyle = "rgba(255,255,255,0.09)"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(f, 0, 1), h);
}
const pad6 = (n) => String(Math.max(0, Math.floor(n))).padStart(6, "0");
const fmtTime = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

// ---------- main render ----------
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#01040a"; ctx.fillRect(0, 0, VW, VH);
  if (!G.m) return;
  drawWorld();

  // post
  ctx.globalAlpha = 1;
  ctx.drawImage(vigCanvas, 0, 0, VW, VH);
  if (G.alert > 0) {
    const pu = 0.5 + 0.5 * Math.sin(G.t * 5);
    ctx.globalAlpha = 0.35 + 0.35 * pu; ctx.drawImage(vigRed, 0, 0, VW, VH); ctx.globalAlpha = 1;
  }
  if (G.hurt > 0) { ctx.fillStyle = "rgba(255,40,20," + (G.hurt * 0.4).toFixed(3) + ")"; ctx.fillRect(0, 0, VW, VH); }
  if (G.flash > 0) { ctx.fillStyle = "rgba(90,255,150," + (G.flash * 0.28).toFixed(3) + ")"; ctx.fillRect(0, 0, VW, VH); }
  ctx.globalAlpha = 0.06; ctx.fillStyle = scanPat; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1;

  const m = G.mode;
  if (m === "play" || m === "dying" || m === "paused" || m === "clear" || m === "dead") drawHUD();
  switch (m) {
    case "attract": drawAttract(); break;
    case "briefing": drawBriefing(); break;
    case "paused": drawPause(); break;
    case "clear": drawClear(); break;
    case "dead": drawDead(); break;
    case "gameover": drawEnd(false); break;
    case "victory": drawEnd(true); break;
    case "dying": {
      ctx.fillStyle = "rgba(0,0,0," + clamp(G.modeT / 2.4, 0, 0.7).toFixed(2) + ")"; ctx.fillRect(0, 0, VW, VH);
      break;
    }
  }
  if (m === "play" && touch.on) drawTouch();
}

function drawWorld() {
  const m = G.m, p = G.p, S = TS;
  const sh = G.shake * 9;
  G.ox = VW / 2 - G.cam.x * S + (Math.random() - 0.5) * sh;
  G.oy = VH / 2 - G.cam.y * S + (Math.random() - 0.5) * sh;
  drawTiles();
  drawSpecials();
  for (const it of G.items) drawItem(it);
  for (const c of G.crew) if (c.state === "down") drawCrewEntity(c);
  for (const c of G.crew) if (c.state !== "down" && (c.state === "patrol" || c.state === "investigate") && visAt(c.x, c.y)) drawCone(c);
  for (const c of G.crew) if (c.state !== "down") drawCrewEntity(c);
  for (const d of G.drones) drawDroneEntity(d);
  if (!p.dead) {
    drawCables();
    drawBorg(G.ox + p.x * S, G.oy + p.y * S, p.ang, S * 0.34, { tub: !!p.chan, ph: 0, hurt: p.hurtT > 2.7 });
    drawTubules();
  }
  drawBolts();
  drawParts();
  drawScanRing();
  drawFloats();
  if (G.cand && !G.p.chan) drawBrackets(G.cand);
}

// ---------- tiles ----------
function drawTiles() {
  const m = G.m, S = TS, ox = G.ox, oy = G.oy, W = m.W, p = G.p, now = G.t;
  const x0 = Math.max(0, Math.floor(-ox / S) - 1), x1 = Math.min(W - 1, Math.ceil((VW - ox) / S) + 1);
  const y0 = Math.max(0, Math.floor(-oy / S) - 1), y1 = Math.min(m.H - 1, Math.ceil((VH - oy) / S) + 1);
  const sz = Math.ceil(S) + 1, line = Math.max(1, Math.round(S * 0.05));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * W + x, vis = m.vis[i] === G.stamp;
      if (!vis && !m.seen[i]) continue;
      const t = m.tiles[i];
      if (t === 0 && !m.wallVis[i]) continue;
      const sx = Math.round(ox + x * S), sy = Math.round(oy + y * S), v = m.variant[i];
      const roomId = m.roomAt[i], rd = roomId >= 0 ? ROOM_DEF[m.rooms[roomId].type] : null;

      if (t === 0) {
        ctx.fillStyle = "#31445a"; ctx.fillRect(sx, sy, sz, sz);
        if (tileAtM(m, x, y + 1) !== 0) {
          ctx.fillStyle = "#16202b"; ctx.fillRect(sx, sy + S * 0.5, sz, S * 0.5 + 1);
          const below = m.roomAt[(y + 1) * W + x];
          ctx.fillStyle = below >= 0 ? ROOM_DEF[m.rooms[below].type].acc : "#4fd1ff";
          ctx.globalAlpha = 0.55; ctx.fillRect(sx + S * 0.08, sy + S * 0.66, S * 0.84, line); ctx.globalAlpha = 1;
        } else { ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(sx, sy, sz, 2); }
        ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(sx, sy, 1, sz);
      } else {
        ctx.fillStyle = rd ? rd.floor : "#131b24"; ctx.fillRect(sx, sy, sz, sz);
        if ((v & 7) === 0) { ctx.fillStyle = "rgba(255,255,255,0.025)"; ctx.fillRect(sx, sy, sz, sz); }
        ctx.fillStyle = "rgba(130,190,230,0.06)"; ctx.fillRect(sx, sy, sz, 1); ctx.fillRect(sx, sy, 1, sz);
        if (rd) {
          ctx.fillStyle = rd.acc; ctx.globalAlpha = 0.3;
          if (tileAtM(m, x, y - 1) === 0) ctx.fillRect(sx, sy, sz, line);
          if (tileAtM(m, x - 1, y) === 0) ctx.fillRect(sx, sy, line, sz);
          if (tileAtM(m, x + 1, y) === 0) ctx.fillRect(sx + S - line, sy, line, sz);
          ctx.globalAlpha = 1;
        } else if (((x + y) & 3) === 0) {
          ctx.fillStyle = "rgba(255,205,90,0.16)"; ctx.fillRect(sx + S * 0.42, sy + S * 0.42, S * 0.16, S * 0.16);
        }
        if (t === TL.DOOR) drawDoor(m, i, sx, sy, S);
        else if (t >= 4) drawDecor(t, v, sx, sy, S, rd, now);
      }

      const cv2 = m.conv[i];
      if (cv2 > 0.02) {
        const pulse = 0.75 + 0.25 * Math.sin(now * 2 + v);
        ctx.fillStyle = "rgba(6,44,20," + (cv2 * 0.55).toFixed(2) + ")"; ctx.fillRect(sx, sy, sz, sz);
        ctx.fillStyle = "rgba(90,255,140," + (cv2 * 0.3 * pulse).toFixed(2) + ")";
        ctx.fillRect(sx + S * 0.1, sy + S * (((v % 5) + 1) / 6), S * (0.4 + ((v >> 3) % 5) / 10), line);
        ctx.fillRect(sx + S * (((v >> 2) % 5 + 1) / 6), sy + S * 0.1, line, S * (0.4 + ((v >> 5) % 5) / 10));
        if (v & 1) ctx.fillRect(sx + S * 0.6, sy + S * 0.6, S * 0.12, S * 0.12);
      }

      let a;
      if (vis) {
        const d = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y);
        a = rd ? clamp((d - 8) / 7, 0, 1) * 0.55 : 0.16 + clamp((d - 4) / 8, 0, 1) * 0.6;
      } else a = 0.72;
      if (a > 0.01) { ctx.fillStyle = "#02070c"; ctx.globalAlpha = a; ctx.fillRect(sx, sy, sz, sz); ctx.globalAlpha = 1; }
    }
  }
}

function drawDoor(m, i, sx, sy, S) {
  const o = m.doorOpen[i], info = m.doorInfo[i], axis = info & 1, dir = (info >> 1) & 1;
  const full = S * (1 - o);
  ctx.fillStyle = "#4b6076";
  if (axis === 0) {
    const y = dir === 0 ? sy : sy + S - full;
    ctx.fillRect(sx + S * 0.32, y, S * 0.36, full);
    ctx.fillStyle = "#ffcf5a"; ctx.fillRect(sx + S * 0.32, y, S * 0.36, Math.min(full, 2));
  } else {
    const x = dir === 0 ? sx : sx + S - full;
    ctx.fillRect(x, sy + S * 0.32, full, S * 0.36);
    ctx.fillStyle = "#ffcf5a"; ctx.fillRect(x, sy + S * 0.32, Math.min(full, 2), S * 0.36);
  }
}

function drawDecor(t, v, sx, sy, S, rd, now) {
  const acc = rd ? rd.acc : "#4fd1ff";
  switch (t) {
    case TL.CONSOLE:
      ctx.fillStyle = "#0d141b"; ctx.fillRect(sx + S * 0.06, sy + S * 0.08, S * 0.88, S * 0.84);
      ctx.fillStyle = acc; ctx.globalAlpha = 0.55 + 0.3 * Math.sin(now * 3 + v);
      ctx.fillRect(sx + S * 0.16, sy + S * 0.16, S * 0.68, S * 0.4); ctx.globalAlpha = 1;
      ctx.fillStyle = "#e8f4ff"; ctx.globalAlpha = 0.6;
      ctx.fillRect(sx + S * 0.22, sy + S * (0.24 + (v % 3) * 0.08), S * 0.4, Math.max(1, S * 0.03));
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#28343f"; ctx.fillRect(sx + S * 0.16, sy + S * 0.64, S * 0.68, S * 0.2);
      break;
    case TL.TABLE:
      ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(sx + S * 0.06, sy + S * 0.12, S, S * 0.9);
      ctx.fillStyle = "#6b7c8e"; ctx.fillRect(sx + 1, sy + 1, S, S - 1);
      ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(sx + 1, sy + 1, S, 2);
      break;
    case TL.CRATE:
      ctx.fillStyle = "#6f6238"; ctx.fillRect(sx + S * 0.04, sy + S * 0.04, S * 0.94, S * 0.94);
      ctx.strokeStyle = "#3f3720"; ctx.lineWidth = Math.max(1, S * 0.05); ctx.strokeRect(sx + S * 0.08, sy + S * 0.08, S * 0.86, S * 0.86);
      ctx.beginPath(); ctx.moveTo(sx + S * 0.1, sy + S * 0.1); ctx.lineTo(sx + S * 0.9, sy + S * 0.9); ctx.stroke();
      break;
    case TL.BED:
      ctx.fillStyle = "#3c4b68"; ctx.fillRect(sx + 1, sy + S * 0.08, S, S * 0.84);
      ctx.fillStyle = "#dfe5f0"; ctx.fillRect(sx + S * 0.1, sy + S * 0.2, S * 0.3, S * 0.6);
      break;
    case TL.PILLAR:
      ctx.fillStyle = "#54687d"; ctx.beginPath(); ctx.arc(sx + S / 2, sy + S / 2, S * 0.42, 0, TAU); ctx.fill();
      ctx.strokeStyle = acc; ctx.globalAlpha = 0.7; ctx.lineWidth = Math.max(1, S * 0.05); ctx.stroke(); ctx.globalAlpha = 1;
      break;
  }
}

// ---------- specials ----------
function drawSpecials() {
  const m = G.m, S = TS, ox = G.ox, oy = G.oy, now = G.t;
  const sr = m.rooms[m.startRoom];
  const px = ox + (sr.cx + 1) * S, py = oy + (sr.cy + 1) * S;
  if (m.seen[(sr.cy + 1) * m.W + sr.cx + 1]) {
    ctx.strokeStyle = "rgba(109,255,160,0.45)"; ctx.lineWidth = Math.max(1.5, S * 0.05);
    ctx.beginPath(); ctx.arc(px, py, S * 1.0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, S * 0.6, 0, TAU); ctx.stroke();
  }
  const c = G.conduit, cx = ox + c.x * S, cy = oy + c.y * S;
  if (!m.seen[Math.floor(c.y) * m.W + Math.floor(c.x)]) return;
  const vis = visAt(c.x, c.y);
  ctx.save(); ctx.globalAlpha = vis ? 1 : 0.5;
  ctx.fillStyle = "#0a0f16"; ctx.beginPath(); ctx.arc(cx, cy, S * 1.15, 0, TAU); ctx.fill();
  if (G.online) {
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 1.6);
    gr.addColorStop(0, "rgba(255,240,170,0.9)"); gr.addColorStop(0.4, "rgba(255,200,80,0.35)"); gr.addColorStop(1, "rgba(255,180,40,0)");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, S * 1.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#ffe27a"; ctx.lineWidth = Math.max(2, S * 0.06);
    for (let k = 0; k < 3; k++) {
      ctx.beginPath(); ctx.arc(cx, cy, S * (0.35 + k * 0.28), now * (1.6 - k * 0.5) + k, now * (1.6 - k * 0.5) + k + 3.2); ctx.stroke();
    }
    txt("TRANSWARP CONDUIT", cx, cy - S * 1.35, Math.max(9, S * 0.2), GOLD, "center", "700", FONT, 1.5);
  } else {
    ctx.strokeStyle = "#7a2b25"; ctx.lineWidth = Math.max(2, S * 0.06);
    ctx.setLineDash([S * 0.15, S * 0.12]); ctx.beginPath(); ctx.arc(cx, cy, S * 1.0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = Math.sin(now * 3) > 0 ? "#ff5a4a" : "#5a1c18";
    for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + 0.78; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * S * 1.0, cy + Math.sin(a) * S * 1.0, S * 0.07, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}

function drawItem(it) {
  if (it.taken) return;
  const p = G.p, vis = visAt(it.x, it.y), scanned = p.scanT > 0;
  if (!vis && !scanned) return;
  const S = TS, x = G.ox + it.x * S, y = G.oy + it.y * S + Math.sin(G.t * 2 + it.ph) * S * 0.05;
  const col = it.type === "key" ? it.def.col : it.type === "cell" ? "#7dff9a" : "#d8dee8";
  const a = vis ? 1 : 0.6 + 0.3 * Math.sin(G.t * 6);
  const gr = ctx.createRadialGradient(x, y, 0, x, y, S * (it.type === "key" ? 0.75 : 0.5));
  gr.addColorStop(0, col + "88"); gr.addColorStop(1, col + "00");
  ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.fillRect(x - S, y - S, S * 2, S * 2);
  ctx.save(); ctx.translate(x, y); ctx.lineWidth = Math.max(1.5, S * 0.06);
  if (it.type === "key") {
    ctx.strokeStyle = col; ctx.fillStyle = col;
    switch (it.def.id) {
      case "coil": for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.ellipse(0, k * S * 0.13, S * 0.2, S * 0.07, 0, 0, TAU); ctx.stroke(); } break;
      case "crystal": ctx.beginPath(); ctx.moveTo(0, -S * 0.26); ctx.lineTo(S * 0.16, 0); ctx.lineTo(0, S * 0.26); ctx.lineTo(-S * 0.16, 0); ctx.closePath(); ctx.globalAlpha = a * 0.5; ctx.fill(); ctx.globalAlpha = a; ctx.stroke(); break;
      case "core": ctx.fillStyle = "#0e2418"; ctx.fillRect(-S * 0.18, -S * 0.18, S * 0.36, S * 0.36); ctx.strokeRect(-S * 0.18, -S * 0.18, S * 0.36, S * 0.36); ctx.fillStyle = col; ctx.fillRect(-S * 0.08, -S * 0.08, S * 0.16, S * 0.16); break;
      case "injector": ctx.fillRect(-S * 0.09, -S * 0.22, S * 0.18, S * 0.44); ctx.fillStyle = "#fff"; ctx.fillRect(-S * 0.13, -S * 0.24, S * 0.26, S * 0.05); break;
      default: ctx.beginPath(); ctx.arc(0, 0, S * 0.2, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, S * 0.2); ctx.stroke(); break;
    }
  } else if (it.type === "cell") {
    ctx.fillStyle = "#0d2a17"; ctx.strokeStyle = col; rr(-S * 0.2, -S * 0.11, S * 0.4, S * 0.22, S * 0.1); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.fillRect(-S * 0.03, -S * 0.07, S * 0.06, S * 0.14); ctx.fillRect(-S * 0.08, -S * 0.02, S * 0.16, S * 0.04);
  } else {
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, S * 0.08);
    ctx.beginPath(); ctx.arc(0, 0, S * 0.13, 0.5, TAU - 0.5); ctx.stroke();
    ctx.fillStyle = "#8b95a3"; ctx.fillRect(S * 0.08, -S * 0.04, S * 0.13, S * 0.08);
  }
  ctx.restore(); ctx.globalAlpha = 1;
}

// ---------- characters ----------
function drawBorg(x, y, ang, r, o) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 1.3, r * 1.0, 0, 0, TAU); ctx.fill();
  ctx.rotate(ang);
  const lw = Math.max(1, r * 0.1);
  ctx.fillStyle = "#171b20"; ctx.strokeStyle = "#414d59"; ctx.lineWidth = lw;
  rr(-0.75 * r, -1.25 * r, 1.5 * r, 2.5 * r, 0.55 * r); ctx.fill(); ctx.stroke();
  if (o.col) { ctx.globalAlpha = 0.3; ctx.fillStyle = o.col; rr(-0.75 * r, -1.25 * r, 1.5 * r, 2.5 * r, 0.55 * r); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.strokeStyle = "rgba(120,255,160,0.28)"; ctx.beginPath();
  ctx.moveTo(-0.25 * r, -1.05 * r); ctx.lineTo(-0.25 * r, 1.05 * r); ctx.moveTo(0.28 * r, -0.85 * r); ctx.lineTo(0.28 * r, 0.85 * r); ctx.stroke();
  ctx.fillStyle = "#2a323a"; ctx.strokeStyle = "#4b5966";
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(-0.05 * r, s * 1.15 * r, 0.42 * r, 0, TAU); ctx.fill(); ctx.stroke(); }
  // left arm with claw, right arm with tubules
  ctx.fillStyle = "#232b32"; ctx.fillRect(0.2 * r, -1.35 * r, 1.0 * r, 0.36 * r); ctx.fillRect(0.2 * r, 0.99 * r, 0.9 * r, 0.36 * r);
  ctx.fillStyle = "#95a0a8"; ctx.beginPath(); ctx.moveTo(1.2 * r, -1.35 * r); ctx.lineTo(1.6 * r, -1.22 * r); ctx.lineTo(1.2 * r, -1.0 * r); ctx.fill();
  ctx.strokeStyle = "#6dff9a"; ctx.lineWidth = Math.max(1, r * 0.07);
  const len = o.tub ? 0.85 * r : 0.25 * r;
  ctx.globalAlpha = o.tub ? 1 : 0.6;
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath(); ctx.moveTo(1.1 * r, 1.17 * r);
    ctx.lineTo(1.1 * r + len, 1.17 * r + k * 0.28 * r + Math.sin(G.t * 30 + k) * (o.tub ? 0.1 * r : 0));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // head
  const hg = ctx.createRadialGradient(0.2 * r, -0.15 * r, 0.05 * r, 0.1 * r, 0, 0.65 * r);
  hg.addColorStop(0, "#e2e9e1"); hg.addColorStop(1, "#8f9b92");
  ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0.1 * r, 0, 0.6 * r, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#191d20"; ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.beginPath(); ctx.moveTo(-0.45 * r, -0.35 * r); ctx.quadraticCurveTo(0.1 * r, -0.05 * r, 0.6 * r, -0.4 * r);
  ctx.moveTo(-0.5 * r, 0.05 * r); ctx.quadraticCurveTo(0.1 * r, 0.3 * r, 0.55 * r, 0.1 * r);
  ctx.moveTo(-0.35 * r, 0.42 * r); ctx.quadraticCurveTo(0.1 * r, 0.6 * r, 0.4 * r, 0.42 * r);
  ctx.stroke();
  const ex = 0.52 * r, ey = -0.22 * r, pu = 0.6 + 0.4 * Math.sin(G.t * 5 + (o.ph || 0));
  const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 0.55 * r);
  eg.addColorStop(0, "rgba(120,255,160," + (0.6 * pu).toFixed(2) + ")"); eg.addColorStop(1, "rgba(120,255,160,0)");
  ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, 0.55 * r, 0, TAU); ctx.fill();
  ctx.fillStyle = "#ff5a1f"; ctx.beginPath(); ctx.arc(ex, ey, 0.15 * r, 0, TAU); ctx.fill();
  ctx.fillStyle = "#ffd9a0"; ctx.beginPath(); ctx.arc(ex, ey, 0.06 * r, 0, TAU); ctx.fill();
  if (o.hurt) { ctx.globalAlpha = 0.5; ctx.fillStyle = "#fff"; rr(-0.75 * r, -1.25 * r, 1.5 * r, 2.5 * r, 0.55 * r); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.restore();
}

function drawCables() {
  const p = G.p, S = TS;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass ? "#33493c" : "#050607";
    ctx.lineWidth = Math.max(1, S * (pass ? 0.022 : 0.06));
    for (const c of p.cables) {
      ctx.beginPath(); ctx.moveTo(G.ox + c.pts[0].x * S, G.oy + c.pts[0].y * S);
      for (let i = 1; i < c.pts.length - 1; i++) {
        const a = c.pts[i], b = c.pts[i + 1];
        ctx.quadraticCurveTo(G.ox + a.x * S, G.oy + a.y * S, G.ox + (a.x + b.x) / 2 * S, G.oy + (a.y + b.y) / 2 * S);
      }
      ctx.stroke();
    }
  }
  const clips = Math.min(3, G.tidy), idxs = [2, 4, 6];
  for (let k = 0; k < clips; k++) {
    const i = idxs[k];
    let sx = 0, sy = 0;
    for (const c of p.cables) { sx += c.pts[i].x; sy += c.pts[i].y; }
    sx /= p.cables.length; sy /= p.cables.length;
    ctx.save(); ctx.translate(G.ox + sx * S, G.oy + sy * S); ctx.rotate(p.ang);
    ctx.fillStyle = "#d8dee8"; rr(-S * 0.04, -S * 0.3, S * 0.09, S * 0.6, S * 0.03); ctx.fill();
    ctx.restore();
  }
}

function drawTubules() {
  const p = G.p, c = p.chan;
  if (!c) return;
  const S = TS, r = S * 0.34, ca = Math.cos(p.ang), sa = Math.sin(p.ang);
  const hx = G.ox + p.x * S + ca * 1.1 * r - sa * 1.17 * r, hy = G.oy + p.y * S + sa * 1.1 * r + ca * 1.17 * r;
  const tx = G.ox + c.x * S, ty = G.oy + c.y * S;
  ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
  for (let k = 0; k < 3; k++) {
    const w = Math.sin(G.t * 18 + k * 2) * S * 0.12;
    ctx.strokeStyle = k === 1 ? "rgba(190,255,210,0.9)" : "rgba(80,255,140,0.7)"; ctx.lineWidth = Math.max(1.5, S * 0.035);
    ctx.beginPath(); ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo((hx + tx) / 2 - sa * w, (hy + ty) / 2 + ca * w, tx, ty); ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "#6dff9a"; ctx.lineWidth = Math.max(2, S * 0.07);
  ctx.beginPath(); ctx.arc(tx, ty, S * 0.62, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(c.held, 0, 1)); ctx.stroke();
}

function drawCone(c) {
  const m = G.m, S = TS, x = G.ox + c.x * S, y = G.oy + c.y * S;
  const R = 7.5, fov = 1.15, n = 14;
  ctx.beginPath(); ctx.moveTo(x, y);
  for (let k = 0; k <= n; k++) {
    const a = c.ang - fov + (2 * fov * k) / n, ca = Math.cos(a), sa = Math.sin(a);
    let d = 0;
    while (d < R) { d += 0.35; if (blocksSight(m, Math.floor(c.x + ca * d), Math.floor(c.y + sa * d))) break; }
    ctx.lineTo(x + ca * d * S, y + sa * d * S);
  }
  ctx.closePath();
  ctx.fillStyle = c.aware > 0.4 ? "rgba(255,90,60,0.14)" : "rgba(255,230,130,0.09)"; ctx.fill();
}

function drawCrewEntity(c) {
  const p = G.p, vis = visAt(c.x, c.y), S = TS;
  const x = G.ox + c.x * S, y = G.oy + c.y * S;
  if (!vis) {
    if (p.scanT > 0) {
      const a = 0.5 + 0.4 * Math.sin(G.t * 6), r = S * 0.2;
      ctx.strokeStyle = c.state === "down" ? "rgba(255,226,122," + a + ")" : "rgba(255,90,80," + a + ")"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.stroke();
    }
    return;
  }
  const r = S * 0.34 * (c.d.big || 1), down = c.state === "down", held = c.state === "held";
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 1.2, r * 0.95, 0, 0, TAU); ctx.fill();
  ctx.rotate(down ? c.fall : c.ang);
  if (down) ctx.globalAlpha = 0.85;
  const gray = held ? clamp(c.held, 0, 1) : 0;
  const col = held ? mixHex(c.d.col, "#6f7b74", gray) : c.d.col;
  ctx.fillStyle = col; ctx.strokeStyle = c.d.trim; ctx.lineWidth = Math.max(1, r * 0.12);
  rr(-0.7 * r, -1.2 * r, 1.4 * r, 2.4 * r, 0.5 * r); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c.d.trim; ctx.fillRect(0.18 * r, -1.05 * r, 0.14 * r, 2.1 * r);
  ctx.fillStyle = c.skin;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(0.5 * r, s * 1.1 * r, 0.24 * r, 0, TAU); ctx.fill(); }
  if (c.d.armed && (c.state === "combat" || c.k === "captain" && c.state === "combat")) {
    ctx.fillStyle = "#1c1f24"; ctx.fillRect(0.5 * r, 0.95 * r, 1.0 * r, 0.24 * r);
    ctx.fillStyle = WEAPON[c.d.weapon].col; ctx.fillRect(1.45 * r, 0.98 * r, 0.12 * r, 0.18 * r);
  }
  ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(0.05 * r, 0, 0.56 * r, 0, TAU); ctx.fill();
  ctx.fillStyle = c.hair; ctx.beginPath(); ctx.arc(0.05 * r, 0, 0.57 * r, Math.PI / 2, Math.PI * 1.5); ctx.fill();
  if (c.d.medic) { ctx.fillStyle = "#fff"; ctx.fillRect(-0.45 * r, -0.08 * r, 0.3 * r, 0.16 * r); ctx.fillRect(-0.38 * r, -0.15 * r, 0.16 * r, 0.3 * r); }
  if (held) {
    ctx.strokeStyle = "rgba(110,255,160," + (0.3 + gray * 0.7).toFixed(2) + ")"; ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath(); ctx.moveTo(-0.6 * r, -0.9 * r); ctx.lineTo(0.1 * r, -0.2 * r); ctx.lineTo(0.5 * r, 0.6 * r); ctx.moveTo(-0.5 * r, 0.9 * r); ctx.lineTo(0.0 * r, 0.3 * r); ctx.stroke();
  }
  if (c.flash > 0) { ctx.globalAlpha = 0.6; ctx.fillStyle = "#fff"; rr(-0.7 * r, -1.2 * r, 1.4 * r, 2.4 * r, 0.5 * r); ctx.fill(); }
  ctx.restore();

  if (down) {
    const a = 0.5 + 0.4 * Math.sin(G.t * 5);
    ctx.strokeStyle = "rgba(255,226,122," + a.toFixed(2) + ")"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, S * 0.5, 0, TAU); ctx.stroke();
    return;
  }
  // status glyphs
  const gy = y - r * 1.9;
  if (c.hp < c.d.hp && !held) { bar(x - S * 0.3, gy - S * 0.16, S * 0.6, Math.max(2, S * 0.06), c.hp / c.d.hp, "#ff6a5a"); }
  if (c.state === "combat") txt("!", x, gy, S * 0.4, "#ff4a3a", "center", "800");
  else if (c.state === "flee") txt("!", x, gy, S * 0.4, GOLD, "center", "800");
  else if (c.state === "revive") txt("+", x, gy, S * 0.4, "#7ff3ff", "center", "800");
  else if (c.aware > 0.12 && !held) {
    ctx.globalAlpha = clamp(c.aware * 1.4, 0, 1);
    txt("?", x, gy, S * 0.4, c.aware > 0.6 ? "#ff8a4a" : GOLD, "center", "800");
    ctx.globalAlpha = 1;
  }
}

function drawDroneEntity(d) {
  if (!visAt(d.x, d.y) && G.p.scanT <= 0 && Math.hypot(d.x - G.p.x, d.y - G.p.y) > 3) return;
  const S = TS, x = G.ox + d.x * S, y = G.oy + d.y * S;
  drawBorg(x, y, d.ang, S * 0.3 * (d.d.big || 1) * (1 - d.spawn * 0.3), { col: d.d.col, ph: d.anim, hurt: d.flash > 0 });
  if (d.hp < d.max) bar(x - S * 0.3, y - S * 0.62, S * 0.6, Math.max(2, S * 0.06), d.hp / d.max, "#6dff9a");
  if (d.spawn > 0) {
    ctx.strokeStyle = "rgba(109,255,160," + d.spawn.toFixed(2) + ")"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, S * (0.4 + (1 - d.spawn) * 0.9), 0, TAU); ctx.stroke();
  }
}

function drawBrackets(c) {
  const S = TS, x = G.ox + c.x * S, y = G.oy + c.y * S, r = S * 0.55, k = S * 0.18;
  const col = c.state === "down" ? GOLD : GREEN;
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(G.t * 8);
  ctx.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    ctx.moveTo(x + sx * r, y + sy * (r - k)); ctx.lineTo(x + sx * r, y + sy * r); ctx.lineTo(x + sx * (r - k), y + sy * r);
  }
  ctx.stroke(); ctx.globalAlpha = 1;
}

// ---------- effects ----------
function drawBolts() {
  const S = TS;
  ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
  for (const b of G.bolts) {
    if (!visAt(b.x, b.y)) continue;
    const x = G.ox + b.x * S, y = G.oy + b.y * S, l = 0.05;
    ctx.strokeStyle = b.col; ctx.lineWidth = Math.max(3, S * 0.13); ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - b.vx * l * S, y - b.vy * l * S); ctx.stroke();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1.5, S * 0.05); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - b.vx * l * S * 0.7, y - b.vy * l * S * 0.7); ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
}

function drawParts() {
  const S = TS;
  ctx.globalCompositeOperation = "lighter";
  for (const q of G.parts) {
    if (!visAt(q.x, q.y)) continue;
    ctx.globalAlpha = clamp(q.life / q.max, 0, 1); ctx.fillStyle = q.col;
    const s = Math.max(1.5, q.size * S * 2);
    ctx.fillRect(G.ox + q.x * S - s / 2, G.oy + q.y * S - s / 2, s, s);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
}

function drawScanRing() {
  const p = G.p;
  if (p.scanAge > 1.1) return;
  const S = TS, t = p.scanAge / 1.1;
  ctx.strokeStyle = "rgba(110,255,160," + (1 - t).toFixed(2) + ")"; ctx.lineWidth = Math.max(2, S * 0.1 * (1 - t));
  ctx.beginPath(); ctx.arc(G.ox + p.x * S, G.oy + p.y * S, t * S * 22, 0, TAU); ctx.stroke();
}

function drawFloats() {
  const S = TS;
  ctx.lineJoin = "round";
  for (const f of G.floats) {
    const x = G.ox + f.x * S, y = G.oy + f.y * S, sz = S * 0.3 * f.size;
    ctx.globalAlpha = clamp(f.life / 0.5, 0, 1);
    ctx.font = "800 " + sz + "px " + FONT; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.8)";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "1px";
    ctx.strokeText(f.text, x, y); ctx.fillStyle = f.col; ctx.fillText(f.text, x, y);
  }
  ctx.globalAlpha = 1;
}

// ---------- HUD ----------
function updateMinimap() {
  const m = G.m;
  if (mmMap !== m) {
    mmCanvas = document.createElement("canvas"); mmCanvas.width = m.W; mmCanvas.height = m.H;
    mmCtx = mmCanvas.getContext("2d"); mmImg = mmCtx.createImageData(m.W, m.H); mmMap = m; mmT = 0;
  }
  if (G.t - mmT < 0.25) return;
  mmT = G.t;
  const d = mmImg.data;
  for (let i = 0; i < m.tiles.length; i++) {
    const o = i * 4;
    if (!m.seen[i]) { d[o + 3] = 0; continue; }
    const t = m.tiles[i];
    let r, g, b;
    if (t === 0) { if (!m.wallVis[i]) { d[o + 3] = 0; continue; } r = 70; g = 100; b = 120; }
    else if (m.conv[i] > 0.4) { r = 40; g = 170; b = 80; }
    else if (t === 3) { r = 210; g = 170; b = 80; }
    else if (t >= 4) { r = 50; g = 70; b = 84; }
    else { r = 30; g = 62; b = 86; }
    d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
  }
  mmCtx.putImageData(mmImg, 0, 0);
}

function drawHUD() {
  const hs = G.hs, p = G.p, m = G.m;
  const L = SAFE.l + 16 * hs, T = SAFE.t + 14 * hs, Rt = VW - SAFE.r - 16 * hs, B = VH - SAFE.b - 14 * hs;
  const alert = G.alert > 0, acc = alert ? "#ff5a4a" : GREEN;

  // status
  const pw = 250 * hs, ph = 128 * hs;
  panel(L, T, pw, ph, acc);
  let y = T + 22 * hs;
  txt("INTEGRITY", L + 12 * hs, y, 11 * hs, DIM, "left", "700", FONT, 2 * hs);
  txt(Math.ceil(p.hp) + "%", L + pw - 12 * hs, y, 11 * hs, "#fff", "right", "700");
  bar(L + 12 * hs, y + 6 * hs, pw - 24 * hs, 9 * hs, p.hp / p.max, p.hp / p.max > 0.3 ? GREEN : "#ff5a4a");
  y += 34 * hs;
  txt("ADAPTATION", L + 12 * hs, y, 11 * hs, DIM, "left", "700", FONT, 2 * hs);
  const bw = (pw - 24 * hs - 16 * hs) / 3;
  ["A", "B", "C"].forEach((k, i) => {
    const bx = L + 12 * hs + i * (bw + 8 * hs);
    bar(bx, y + 6 * hs, bw, 7 * hs, p.adapt[k] / 0.8, WEAPON[k].col);
    txt("TYPE-" + WEAPON[k].n + " " + Math.round(p.adapt[k] * 100) + "%", bx, y + 26 * hs, 9.5 * hs, DIM, "left", "600");
  });
  y += 46 * hs;
  const ready = p.scanCD <= 0;
  txt("SCAN [Q]", L + 12 * hs, y, 11 * hs, DIM, "left", "700", FONT, 2 * hs);
  txt(ready ? "READY" : Math.ceil(p.scanCD) + "s", L + pw - 12 * hs, y, 11 * hs, ready ? GREEN : "#fff", "right", "700");
  bar(L + 12 * hs, y + 6 * hs, pw - 24 * hs, 6 * hs, ready ? 1 : 1 - p.scanCD / 12, ready ? GREEN : "#3a8f5c");

  // objectives
  const cw = clamp(VW - 2 * (pw + 46 * hs), 250 * hs, 430 * hs), cx = VW / 2 - cw / 2, ch = 116 * hs;
  panel(cx, T, cw, ch, acc);
  let cy = T + 21 * hs;
  txt("DECK " + (G.deckIdx + 1) + " / " + DECKS.length + "  //  " + G.m.cfg.name, VW / 2, cy, 11.5 * hs, acc, "center", "700", FONT, 2 * hs);
  cy += 24 * hs;
  txt("ASSIMILATED", cx + 14 * hs, cy, 11 * hs, DIM, "left", "700", FONT, 2 * hs);
  const done = G.assimCount >= G.quota;
  txt(G.assimCount + " / " + G.quota, cx + cw - 14 * hs, cy, 14 * hs, done ? GOLD : "#fff", "right", "800", MONO);
  bar(cx + 14 * hs, cy + 6 * hs, cw - 28 * hs, 6 * hs, G.assimCount / G.quota, done ? GOLD : GREEN);
  cy += 30 * hs;
  const chips = G.items.filter((i) => i.type === "key").map((i) => ({ label: i.def.short, col: i.def.col, ok: i.taken }));
  if (G.captain) chips.push({ label: "CAPTAIN", col: "#f2c14e", ok: !!G.captain.assimilated });
  let chipX = cx + 14 * hs;
  const fs = 10 * hs;
  for (const c of chips) {
    const w = textW(c.label, fs, "700", 1) + 20 * hs;
    if (chipX + w > cx + cw - 10 * hs) { chipX = cx + 14 * hs; cy += 18 * hs; }
    ctx.fillStyle = c.ok ? c.col : "rgba(255,255,255,0.07)"; ctx.fillRect(chipX, cy - 11 * hs, w, 16 * hs);
    ctx.strokeStyle = c.col; ctx.lineWidth = 1; ctx.strokeRect(chipX + 0.5, cy - 10.5 * hs, w - 1, 15 * hs);
    txt(c.label, chipX + w / 2, cy + 1 * hs, fs, c.ok ? "#04110a" : c.col, "center", "800", FONT, 1);
    chipX += w + 6 * hs;
  }
  cy += 24 * hs;
  if (G.online) txt("CONDUIT ONLINE > ENGINEERING", VW / 2, cy, 11.5 * hs, Math.sin(G.t * 6) > -0.3 ? GOLD : "#a08840", "center", "800", FONT, 2 * hs);
  else txt("CONDUIT OFFLINE", VW / 2, cy, 11.5 * hs, "#ff8a7a", "center", "700", FONT, 2 * hs);
  if (alert) {
    const ay = T + ch + 10 * hs;
    ctx.fillStyle = "rgba(160,10,10," + (0.55 + 0.25 * Math.sin(G.t * 8)).toFixed(2) + ")"; ctx.fillRect(VW / 2 - 110 * hs, ay, 220 * hs, 26 * hs);
    txt("RED ALERT", VW / 2, ay + 19 * hs, 14 * hs, "#fff", "center", "800", FONT, 4 * hs);
    bar(VW / 2 - 110 * hs, ay + 26 * hs, 220 * hs, 3 * hs, G.alert / 16, "#ff6a5a");
  }

  // minimap + score
  updateMinimap();
  const mw = 220 * hs, sc = Math.min((mw - 16 * hs) / m.W, (140 * hs) / m.H);
  const mapW = m.W * sc, mapH = m.H * sc, pw2 = Math.max(mapW + 16 * hs, 150 * hs), ph2 = mapH + 16 * hs;
  const mx = Rt - pw2, my = T;
  panel(mx, my, pw2, ph2, acc);
  const ix = mx + (pw2 - mapW) / 2, iy = my + 8 * hs;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mmCanvas, ix, iy, mapW, mapH);
  ctx.imageSmoothingEnabled = true;
  const dot = (x, y, r, col) => { ctx.fillStyle = col; ctx.fillRect(ix + x * sc - r / 2, iy + y * sc - r / 2, r, r); };
  const scanned = p.scanT > 0, dr = Math.max(2, 3 * hs);
  dot(G.conduit.x, G.conduit.y, dr * 1.6, G.online ? GOLD : "#ff6a5a");
  for (const it of G.items) if (!it.taken && it.type === "key" && (scanned || m.seen[Math.floor(it.y) * m.W + Math.floor(it.x)])) dot(it.x, it.y, dr * 1.3, it.def.col);
  for (const c of G.crew) if (scanned || visAt(c.x, c.y)) dot(c.x, c.y, dr, c.state === "down" ? GOLD : "#ff5a4a");
  for (const d of G.drones) dot(d.x, d.y, dr, "#6dff9a");
  dot(p.x, p.y, dr * 1.5, Math.sin(G.t * 8) > 0 ? "#fff" : "#6dff9a");

  let sy2 = my + ph2 + 24 * hs;
  txt(pad6(G.score), Rt, sy2, 26 * hs, "#fff", "right", "800", MONO);
  sy2 += 20 * hs;
  txt("HI " + pad6(Math.max(G.hi, G.score)), Rt, sy2, 11 * hs, DIM, "right", "700", MONO, 1);
  sy2 += 20 * hs;
  txt("COLLECTIVE " + G.drones.length + "/" + MAX_DRONES + "   TIDY x" + (1 + 0.1 * G.tidy).toFixed(1), Rt, sy2, 11 * hs, DIM, "right", "700", FONT, 1);
  sy2 += 18 * hs;
  txt("CYCLES " + "\u25CF".repeat(G.lives) + "\u25CB".repeat(Math.max(0, 3 - G.lives)), Rt, sy2, 11 * hs, DIM, "right", "700", FONT, 1);

  // log
  let ly = B - (G.mode === "paused" ? 40 * hs : 0);
  for (let i = 0; i < G.log.length; i++) {
    const l = G.log[i], age = G.t - l.t;
    if (age > 8) continue;
    ctx.globalAlpha = clamp(1 - (age - 5) / 3, 0, 1) * (1 - i * 0.12);
    txt(l.text, L, ly, 12 * hs, l.col, "left", "700", FONT, 1);
    ly -= 20 * hs;
  }
  ctx.globalAlpha = 1;

  // prompt
  let prompt = "", pcol = GREEN;
  if (G.cand) {
    const c = G.cand;
    prompt = c.state === "down" ? "HOLD [SPACE] / CLICK  -  ASSIMILATE (INSTANT)" : (c.aware < 0.5 && (c.state === "patrol" || c.state === "investigate") ? "HOLD [SPACE] / CLICK  -  SILENT ASSIMILATION" : "HOLD [SPACE] / CLICK  -  ASSIMILATE");
  } else if (G.prompt) { prompt = G.prompt; pcol = "#ff9a7a"; }
  else if (p.chan) { prompt = "ASSIMILATING... " + Math.round(p.chan.held * 100) + "%"; }
  if (prompt) {
    const w = textW(prompt, 13 * hs, "700", 2 * hs) + 36 * hs;
    panel(VW / 2 - w / 2, B - 34 * hs, w, 30 * hs, pcol);
    txt(prompt, VW / 2, B - 14 * hs, 13 * hs, pcol, "center", "700", FONT, 2 * hs);
  }
  if (G.hintT < 30 && G.mode === "play" && !touch.on) {
    ctx.globalAlpha = clamp((30 - G.hintT) / 4, 0, 1) * 0.85;
    txt("WASD MOVE  /  MOUSE AIM  /  SPACE OR CLICK: ASSIMILATE  /  Q: SCAN  /  ESC: PAUSE  /  M: MUTE", Rt, B, 10.5 * hs, DIM, "right", "700", FONT, 1);
    ctx.globalAlpha = 1;
  }
}

function drawTouch() {
  const b = touchBtns(), hs = G.hs;
  const btn = (o, label, on) => {
    ctx.fillStyle = on ? "rgba(90,255,150,0.45)" : "rgba(10,40,25,0.55)"; ctx.strokeStyle = GREEN; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill(); ctx.stroke();
    txt(label, o.x, o.y + 4 * hs, 11 * hs, "#fff", "center", "800", FONT, 1);
  };
  btn(b.assim, "ASSIMILATE", touch.assim); btn(b.scan, "SCAN", false);
  if (touch.stick) {
    ctx.strokeStyle = "rgba(90,255,150,0.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(touch.stick.ox, touch.stick.oy, 55 * hs, 0, TAU); ctx.stroke();
    ctx.fillStyle = "rgba(90,255,150,0.4)"; ctx.beginPath(); ctx.arc(touch.stick.x, touch.stick.y, 22 * hs, 0, TAU); ctx.fill();
  }
}

// ---------- screens ----------
function drawCard(title, sub, lines, foot, acc, w) {
  const hs = G.hs, cw = Math.min(w || 620 * hs, VW - 40 * hs);
  const lh = 26 * hs, ch = 96 * hs + lines.length * lh + 44 * hs;
  const x = VW / 2 - cw / 2, y = VH / 2 - ch / 2;
  ctx.fillStyle = "rgba(0,4,3,0.55)"; ctx.fillRect(0, 0, VW, VH);
  panel(x, y, cw, ch, acc); ctx.fillStyle = "rgba(2,10,7,0.6)"; ctx.fillRect(x, y, cw, ch);
  txt(title, VW / 2, y + 44 * hs, 30 * hs, acc, "center", "800", FONT, 4 * hs);
  if (sub) txt(sub, VW / 2, y + 68 * hs, 12 * hs, DIM, "center", "700", FONT, 3 * hs);
  let ly = y + 108 * hs;
  for (const l of lines) {
    if (l.length === 2 && l[1][0] !== "#") {
      txt(l[0], x + 30 * hs, ly, 13 * hs, DIM, "left", "700", FONT, 2 * hs);
      txt(l[1], x + cw - 30 * hs, ly, 15 * hs, "#fff", "right", "800", MONO);
    } else txt(l[0], VW / 2, ly, 12 * hs, l[1] || DIM, "center", "700", FONT, 1);
    ly += lh;
  }
  const blink = 0.55 + 0.45 * Math.sin(G.t * 5);
  ctx.globalAlpha = blink; txt(foot, VW / 2, y + ch - 20 * hs, 13 * hs, "#fff", "center", "800", FONT, 3 * hs); ctx.globalAlpha = 1;
}

function drawBriefing() {
  const cfg = G.m.cfg, keys2 = G.items.filter((i) => i.type === "key").map((i) => i.def.name);
  const lines = [
    ["VESSEL", "ISS MERIDIAN"],
    ["ASSIMILATE", G.quota + " CREW"],
    ["RECOVER", G.keyTotal + " COMPONENTS"],
    [keys2.join("  /  "), "#c8d8d0"],
    ["EXTRACT VIA", "TRANSWARP CONDUIT"],
  ];
  if (G.captain) lines.splice(3, 0, ["PRIORITY TARGET", "THE CAPTAIN"]);
  lines.push([TIPS[(G.deckIdx * 2 + G.runSeed) % TIPS.length], "#9fe8bd"]);
  drawCard("DECK " + (G.deckIdx + 1) + " - " + cfg.name, "INFILTRATION BRIEFING", lines, "[ENTER] BEAM IN", GREEN, 700 * G.hs);
}

function drawPause() {
  const hs = G.hs;
  drawCard("PAUSED", "THE COLLECTIVE WAITS", [
    ["MOVE", "WASD / ARROWS"], ["AIM", "MOUSE"], ["ASSIMILATE", "HOLD SPACE / CLICK"],
    ["SCAN", "Q / RIGHT CLICK"], ["MUTE / FULLSCREEN", "M / F"],
  ], "[ESC] RESUME", GREEN, 560 * hs);
}

function drawClear() {
  const s = G.stats;
  drawCard("DECK " + (G.deckIdx + 1) + " SECURED", "EFFICIENCY ACHIEVED", [
    ["ASSIMILATED", s.assim + " / " + s.total], ["SILENT TAKEDOWNS", String(s.silent)], ["DRONES IN COLLECTIVE", String(s.drones)],
    ["SHIP CONVERSION", Math.round(s.conv * 100) + "%"], ["TIME", fmtTime(s.time)], ["BONUS", "+" + s.bonus],
    ["SCORE", pad6(G.score)],
  ], G.deckIdx >= DECKS.length - 1 ? "[ENTER] FINISH" : "[ENTER] NEXT DECK", GOLD, 620 * G.hs);
}

function drawDead() {
  drawCard("DRONE OFFLINE", "THE COLLECTIVE RESTORES YOU", [
    ["CYCLES REMAINING", String(G.lives)], ["SCORE RESTORED TO", pad6(G.deckStartScore)],
  ], "[ENTER] RETRY DECK " + (G.deckIdx + 1), "#ff6a5a", 560 * G.hs);
}

function drawEnd(won) {
  const rank = G.tidy >= 5 ? "TIDY, ORGANIZED. EFFICIENCY ACHIEVED." : G.tidy >= 2 ? "MOSTLY TIDY. ACCEPTABLE." : "CABLES EVERYWHERE...";
  const lines = [["FINAL SCORE", pad6(G.score)], ["HI-SCORE", pad6(G.hi)], ["CABLE CLIPS", String(G.tidy)], [rank, GOLD]];
  drawCard(won ? "SHIP ASSIMILATED" : "COLLECTIVE LOST", won ? "RESISTANCE WAS FUTILE" : "THE MISSION FAILED", lines, "[ENTER] RETURN", won ? GOLD : "#ff6a5a", 620 * G.hs);
}

function drawAttract() {
  const hs = G.hs;
  ctx.fillStyle = "rgba(0,8,6,0.22)"; ctx.fillRect(0, 0, VW, VH);
  const cxp = VW / 2, cyp = VH * 0.26;
  const g = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, Math.max(VW, VH) * 0.5);
  g.addColorStop(0, "rgba(0,10,6,0.6)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  const barH = Math.max(SAFE.t, 0) + VH * 0.07;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, VW, barH); ctx.fillRect(0, VH - barH, VW, barH);
  ctx.fillStyle = "rgba(77,255,136,0.5)"; ctx.fillRect(0, barH, VW, 1); ctx.fillRect(0, VH - barH - 1, VW, 1);

  const size = Math.min(VW * 0.09, VH * 0.15), ls = size * 0.04;
  const glitch = (G.t % 4.3) < 0.14;
  const draw = (dx, dy, col) => {
    txt("RESISTANCE", cxp + dx, cyp - size * 0.05 + dy, size, col, "center", "800", FONT, ls);
    txt("IS TIDY", cxp + dx, cyp + size * 0.92 + dy, size, col, "center", "800", FONT, ls);
  };
  if (glitch) { draw(-size * 0.04, 0, "rgba(0,255,255,0.7)"); draw(size * 0.04, 0, "rgba(255,0,80,0.7)"); }
  ctx.shadowColor = "rgba(77,255,136,0.75)"; ctx.shadowBlur = 34 * hs;
  const tg = ctx.createLinearGradient(0, cyp - size, 0, cyp + size);
  tg.addColorStop(0, "#d6ffe4"); tg.addColorStop(1, "#22d466");
  draw(0, 0, tg);
  ctx.shadowBlur = 0;
  const fit = (s, want, ls) => { const w = textW(s, want, "700", ls); return w > VW * 0.92 ? want * (VW * 0.92) / w : want; };
  const sub = "BORG INFILTRATION  //  CABLE MANAGEMENT PROTOCOL";
  const subSize = fit(sub, clamp(size * 0.14, 11, 22), size * 0.03);
  txt(sub, cxp, cyp + size * 1.35, subSize, DIM, "center", "700", FONT, size * 0.03);
  const blink = Math.sin(G.t * 4) > -0.2;
  const go = touch.on ? "TAP TO BEGIN ASSIMILATION" : "PRESS ENTER OR CLICK TO BEGIN ASSIMILATION";
  if (blink) txt(go, cxp, cyp + size * 1.35 + clamp(size * 0.32, 26, 54), fit(go, clamp(size * 0.15, 13, 24), size * 0.03), "#fff", "center", "800", FONT, size * 0.03);

  const fy = VH - barH - 16 * hs, foot = "WASD MOVE  /  MOUSE AIM  /  SPACE OR CLICK ASSIMILATE  /  Q SCAN  /  M MUTE  /  F FULLSCREEN";
  txt(foot, cxp, fy, fit(foot, 11 * hs, 1), DIM, "center", "700", FONT, 1);
  txt("HI-SCORE " + pad6(G.hi), VW - SAFE.r - 18 * hs, barH + 26 * hs, 12 * hs, DIM, "right", "700", MONO, 1);
  txt("DEMO MODE - DRONE-7 AUTOPILOT", cxp, VH - barH + 26 * hs, 10 * hs, "rgba(150,255,195,0.4)", "center", "700", FONT, 2);
  if (Sfx.muted) txt("MUTED", VW - SAFE.r - 18 * hs, VH - barH + 26 * hs, 10 * hs, DIM, "right", "700", FONT, 2);
}

boot();
