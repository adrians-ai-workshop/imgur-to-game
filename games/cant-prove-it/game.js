/* I CAN'T PROVE IT — a pumpkin-stand shoplifting stealth game.
   Built from the imgur meme: "I can't prove it, but she may be shoplifting."
   Plain canvas + WebAudio, no dependencies. Everything is drawn procedurally. */
(() => {
"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const WORLD_W = 1280;
const WORLD_H = 720;
const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';
let dpr = 1, viewScale = 1, offX = 0, offY = 0;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  viewScale = Math.max(w / WORLD_W, h / WORLD_H); // cover: always fill the screen
  offX = (w - WORLD_W * viewScale) / 2;
  offY = (h - WORLD_H * viewScale) / 2;
}
window.addEventListener("resize", resize);
resize();

/* ---------------- audio (tiny WebAudio synth) ---------------- */
const Sfx = {
  ac: null, master: null, muted: localStorage.getItem("cpi-muted") === "1",
  ensure() {
    if (!this.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ac = new AC();
      this.master = this.ac.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ac.destination);
    }
    if (this.ac.state === "suspended") this.ac.resume();
    return true;
  },
  setMuted(m) {
    this.muted = m;
    localStorage.setItem("cpi-muted", m ? "1" : "0");
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  },
  tone({ type = "sine", f = 440, f2 = null, dur = 0.15, vol = 0.3, delay = 0 }) {
    if (!this.ensure()) return;
    const t0 = this.ac.currentTime + delay;
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  },
  noise({ dur = 0.2, vol = 0.25, delay = 0, low = false }) {
    if (!this.ensure()) return;
    const t0 = this.ac.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ac.sampleRate * dur));
    const buf = this.ac.createBuffer(1, len, this.ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ac.createBufferSource(); src.buffer = buf;
    const g = this.ac.createGain(); g.gain.value = vol;
    let node = src;
    if (low) {
      const f = this.ac.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 520;
      src.connect(f); node = f;
    }
    node.connect(g); g.connect(this.master);
    src.start(t0);
  },
  grabTick() { this.tone({ type: "square", f: 240, dur: 0.05, vol: 0.1 }); },
  grabDone() { this.tone({ type: "sine", f: 520, f2: 780, dur: 0.16, vol: 0.3 }); },
  stuff() { this.noise({ dur: 0.14, vol: 0.3, low: true }); this.tone({ type: "triangle", f: 150, f2: 90, dur: 0.16, vol: 0.3 }); },
  drop() { this.noise({ dur: 0.1, vol: 0.2, low: true }); },
  deliver() { [660, 880, 1100].forEach((f, i) => this.tone({ type: "sine", f, dur: 0.14, vol: 0.25, delay: i * 0.07 })); },
  bust() { this.tone({ type: "sawtooth", f: 220, f2: 60, dur: 0.6, vol: 0.4 }); this.noise({ dur: 0.3, vol: 0.25, low: true }); },
  alert() { this.tone({ type: "square", f: 880, dur: 0.09, vol: 0.18 }); this.tone({ type: "square", f: 660, dur: 0.12, vol: 0.18, delay: 0.1 }); },
  taunt() { this.tone({ type: "triangle", f: 392, dur: 0.18, vol: 0.3 }); this.tone({ type: "triangle", f: 311, dur: 0.3, vol: 0.3, delay: 0.16 }); },
  shiftUp() { [523, 659, 784, 1046].forEach((f, i) => this.tone({ type: "square", f, dur: 0.12, vol: 0.16, delay: i * 0.08 })); },
  tick() { this.tone({ type: "sine", f: 1200, dur: 0.05, vol: 0.14 }); },
  start() { this.tone({ type: "sawtooth", f: 90, f2: 340, dur: 0.35, vol: 0.22 }); },
};

/* ---------------- world layout (fixed logical space, cover-scaled) ---------------- */
const DISPLAY = { x: 640, y: 352, r: 192 };          // the tiered pumpkin tower
const RINGS = [ { r: 158, n: 12 }, { r: 118, n: 9 }, { r: 78, n: 6 }, { r: 40, n: 3 } ];
const TRUCK_RECT = { x: 1020, y: 452, w: 236, h: 196 }; // collision box for the pickup
const PAD = { x: 972, y: 560, r: 74 };               // dump zone beside the truck

const spots = [];
RINGS.forEach((ring, ri) => {
  for (let i = 0; i < ring.n; i++) {
    const a = (i / ring.n) * Math.PI * 2 + ri * 0.35;
    spots.push({ x: DISPLAY.x + Math.cos(a) * ring.r, y: DISPLAY.y + Math.sin(a) * ring.r, has: true, pop: 1 });
  }
});

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/* ---------------- static background (painted once to an offscreen canvas) ---------------- */
const bg = document.createElement("canvas");
bg.width = WORLD_W * 2; bg.height = WORLD_H * 2;
(function paintBg() {
  const b = bg.getContext("2d");
  b.scale(2, 2);

  // dirt ground
  b.fillStyle = "#ad7f4e";
  b.fillRect(0, 0, WORLD_W, WORLD_H);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * WORLD_W, y = Math.random() * WORLD_H;
    const r = 24 + Math.random() * 70;
    b.fillStyle = `rgba(${150 + (Math.random() * 40 | 0)}, ${110 + (Math.random() * 30 | 0)}, 60, 0.18)`;
    b.beginPath(); b.ellipse(x, y, r, r * 0.7, Math.random() * 3, 0, 7); b.fill();
  }
  // grass patches near the edges (like the farm-stand photo)
  for (let i = 0; i < 26; i++) {
    const edge = Math.random();
    let x, y;
    if (edge < 0.45) { x = Math.random() * WORLD_W; y = Math.random() < 0.5 ? Math.random() * 90 : WORLD_H - Math.random() * 90; }
    else { x = Math.random() < 0.5 ? Math.random() * 120 : WORLD_W - Math.random() * 120; y = Math.random() * WORLD_H; }
    const r = 34 + Math.random() * 60;
    b.fillStyle = "rgba(122, 150, 78, 0.5)";
    b.beginPath(); b.ellipse(x, y, r, r * 0.65, Math.random() * 3, 0, 7); b.fill();
  }
  // dirt speckles
  for (let i = 0; i < 320; i++) {
    b.fillStyle = `rgba(70, 45, 20, ${0.08 + Math.random() * 0.1})`;
    const s = 1 + Math.random() * 2.5;
    b.fillRect(Math.random() * WORLD_W, Math.random() * WORLD_H, s, s);
  }
  // worn path from the bottom toward the truck
  b.strokeStyle = "rgba(214, 184, 132, 0.3)";
  b.lineWidth = 56; b.lineCap = "round";
  b.beginPath(); b.moveTo(700, WORLD_H + 20); b.quadraticCurveTo(820, 660, PAD.x - 40, PAD.y + 30); b.stroke();

  // tiered display platform (top-down view of the spiral tower)
  b.fillStyle = "rgba(40, 22, 6, 0.28)";
  b.beginPath(); b.ellipse(DISPLAY.x + 5, DISPLAY.y + 12, DISPLAY.r + 10, DISPLAY.r * 0.96, 0, 0, 7); b.fill();
  const plat = b.createRadialGradient(DISPLAY.x - 40, DISPLAY.y - 50, 30, DISPLAY.x, DISPLAY.y, DISPLAY.r + 8);
  plat.addColorStop(0, "#f6efdc"); plat.addColorStop(1, "#e2d5b4");
  b.fillStyle = plat;
  b.beginPath(); b.arc(DISPLAY.x, DISPLAY.y, DISPLAY.r + 6, 0, 7); b.fill();
  b.strokeStyle = "#c9b78d"; b.lineWidth = 6;
  b.beginPath(); b.arc(DISPLAY.x, DISPLAY.y, DISPLAY.r + 3, 0, 7); b.stroke();
  b.strokeStyle = "rgba(150, 128, 88, 0.5)"; b.lineWidth = 2;
  RINGS.forEach((ring) => { b.beginPath(); b.arc(DISPLAY.x, DISPLAY.y, ring.r + 16, 0, 7); b.stroke(); });

  // "PUMPKINS $2" sign
  b.save();
  b.translate(352, 566); b.rotate(-0.06);
  b.fillStyle = "#8a5a33";
  rr(b, -74, -19, 148, 38, 6); b.fill();
  b.strokeStyle = "#5f3d20"; b.lineWidth = 3; b.stroke();
  b.fillStyle = "#ffe9c4";
  b.font = `900 19px ${FONT}`; b.textAlign = "center"; b.textBaseline = "middle";
  b.fillText("PUMPKINS $2", 0, 1);
  b.restore();

  // pickup truck (top-down), parked at the right edge
  const T = TRUCK_RECT;
  b.fillStyle = "rgba(40, 22, 6, 0.3)";
  rr(b, T.x + 18, T.y + 14, T.w - 24, T.h - 16, 18); b.fill();
  b.fillStyle = "#c14b32";
  rr(b, T.x + 24, T.y + 10, 176, 176, 16); b.fill();
  b.strokeStyle = "#7e2f1d"; b.lineWidth = 3; b.stroke();
  b.fillStyle = "#8f3522";
  rr(b, T.x + 32, T.y + 6, 160, 9, 4); b.fill(); // front bumper
  b.fillStyle = "#2e3a4a";
  rr(b, T.x + 36, T.y + 22, 152, 34, 8); b.fill(); // cab glass
  b.strokeStyle = "rgba(190, 220, 240, 0.5)"; b.lineWidth = 2;
  b.beginPath(); b.moveTo(T.x + 46, T.y + 39); b.lineTo(T.x + 178, T.y + 39); b.stroke();
  b.fillStyle = "#6b4a33"; // open bed
  rr(b, T.x + 36, T.y + 68, 152, 104, 8); b.fill();
  b.strokeStyle = "#4c3323"; b.lineWidth = 3; b.stroke();
  b.strokeStyle = "rgba(60, 40, 24, 0.7)"; b.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    b.beginPath(); b.moveTo(T.x + 42, T.y + 68 + i * 26); b.lineTo(T.x + 182, T.y + 68 + i * 26); b.stroke();
  }
  b.fillStyle = "#8f3522";
  rr(b, T.x + 36, T.y + 174, 152, 9, 4); b.fill(); // tailgate
  b.fillStyle = "#201812";
  [[T.x + 12, T.y + 34], [T.x + 210, T.y + 34], [T.x + 12, T.y + 124], [T.x + 210, T.y + 124]].forEach(([wx, wy]) => {
    rr(b, wx, wy, 14, 36, 5); b.fill();
  });

  // vignette
  const v = b.createRadialGradient(WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.45, WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.95);
  v.addColorStop(0, "rgba(20, 10, 0, 0)");
  v.addColorStop(1, "rgba(20, 10, 0, 0.4)");
  b.fillStyle = v;
  b.fillRect(0, 0, WORLD_W, WORLD_H);
})();

/* ---------------- game state ---------------- */
const player = { x: 640, y: 620, r: 15, facing: -Math.PI / 2, carrying: false, bag: 0, acting: false };
let guards = [];
let state = "attract"; // attract | playing | paused | busted | bagcheck | shiftcomplete | gameover
let stateT = 0;
let shift = 1, quota = 8, delivered = 0, timeLeft = 95;
let score = 0, best = +(localStorage.getItem("cpi-best") || 0), lives = 3;
let suspicion = 0, graceT = 0, flashT = 0, restockT = 2, lastTickSec = -1;
let floats = []; // {x, y, text, color, t}
let bagCheckGuard = null;
let gameOverReason = "";
let newBest = false;
let grabSpot = null, grabT = 0, stuffT = 0, dumpT = 0;

function addFloat(x, y, text, color) { floats.push({ x, y, text, color, t: 1.6 }); }
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------------- guards ---------------- */
function makeOrbit(radius, angSpeed, phase) {
  const g = { kind: "orbit", radius, angSpeed, angle: phase, x: 0, y: 0, facing: 0, range: 280, fov: 1.35, proof: 0, seen: false, chase: false, chaseT: 0, loseT: 0, lastSeen: null };
  g.x = DISPLAY.x + Math.cos(g.angle) * radius;
  g.y = DISPLAY.y + Math.sin(g.angle) * radius;
  return g;
}
function makeWaypoint(points, speed) {
  const g = { kind: "way", points, idx: 0, speed, x: points[0][0], y: points[0][1], facing: 0, range: 280, fov: 1.35, proof: 0, seen: false, chase: false, chaseT: 0, loseT: 0, lastSeen: null };
  return g;
}
function setupShift(n) {
  shift = n;
  quota = 8 + (n - 1) * 4;
  delivered = 0;
  timeLeft = Math.max(60, 95 - (n - 1) * 5);
  lastTickSec = Math.ceil(timeLeft) + 1;
  const sp = 1 + (n - 1) * 0.07;
  guards = [ makeOrbit(268, 0.34 * sp, Math.random() * Math.PI * 2) ];
  if (n >= 2) guards.push(makeWaypoint([[150, 140], [1120, 140], [880, 676], [250, 676]], 108 * sp));
  if (n >= 3) guards.push(makeOrbit(322, -0.4 * sp, Math.random() * Math.PI * 2));
  guards.forEach((g) => { g.range = 272 + n * 8; });
  grabT = stuffT = dumpT = 0;
}

/* ---------------- line of sight & vision cone ---------------- */
function segCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1;
  const a = dx * dx + dy * dy || 1e-9;
  let t = (-(x1 - cx) * dx - (y1 - cy) * dy) / a;
  t = clamp(t, 0, 1);
  const px = x1 + dx * t - cx, py = y1 + dy * t - cy;
  return px * px + py * py < r * r;
}
function segRect(x1, y1, x2, y2, rc) {
  let tmin = 0, tmax = 1;
  const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - rc.x, rc.x + rc.w - x1, y1 - rc.y, rc.y + rc.h - y1];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-9) { if (q[i] < 0) return false; }
    else {
      const t = q[i] / p[i];
      if (p[i] < 0) { if (t > tmax) return false; if (t > tmin) tmin = t; }
      else { if (t < tmin) return false; if (t < tmax) tmax = t; }
    }
  }
  return true;
}
function lineOfSight(g) {
  // the pumpkin tower and the truck block sightlines — hide behind them!
  if (segCircle(g.x, g.y, player.x, player.y, DISPLAY.x, DISPLAY.y, DISPLAY.r - 4)) return false;
  if (segRect(g.x, g.y, player.x, player.y, TRUCK_RECT)) return false;
  return true;
}
function guardSeesPlayer(g) {
  const dx = player.x - g.x, dy = player.y - g.y;
  const d = Math.hypot(dx, dy);
  if (d > g.range || d < 1) return false;
  let da = Math.atan2(dy, dx) - g.facing;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  if (Math.abs(da) > g.fov / 2) return false;
  return lineOfSight(g);
}

/* ---------------- update ---------------- */
function tickFloats(dt) {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.t -= dt; f.y -= 26 * dt;
    if (f.t <= 0) floats.splice(i, 1);
  }
}

function update(dt) {
  tickFloats(dt);
  flashT = Math.max(0, flashT - dt);
  graceT = Math.max(0, graceT - dt);

  if (state === "attract") { restock(dt); guards.forEach((g) => patrolGuard(g, dt)); return; }
  if (state === "paused" || state === "gameover") return;

  if (state === "busted") {
    stateT -= dt;
    guards.forEach((g) => patrolGuard(g, dt));
    if (stateT <= 0) {
      if (lives <= 0) endRun("BUSTED");
      else { state = "playing"; graceT = 1.6; }
    }
    return;
  }
  if (state === "bagcheck") {
    stateT -= dt;
    if (stateT <= 0) finishBagCheck();
    return; // dramatic freeze while the guard checks your bag
  }
  if (state === "shiftcomplete") {
    stateT -= dt;
    guards.forEach((g) => patrolGuard(g, dt));
    if (stateT <= 0) { setupShift(shift + 1); state = "playing"; graceT = 2; suspicion = 0; }
    return;
  }

  // ---- playing ----
  timeLeft -= dt;
  const sec = Math.ceil(timeLeft);
  if (sec !== lastTickSec) { lastTickSec = sec; if (timeLeft <= 10 && timeLeft > 0) Sfx.tick(); }
  if (timeLeft <= 0) { endRun("SHIFT OVER"); return; }

  movePlayer(dt);
  handleActs(dt);
  restock(dt);
  updateGuardsPlaying(dt);
}

function movePlayer(dt) {
  let mx = ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0);
  let my = ((keys.KeyS || keys.ArrowDown) ? 1 : 0) - ((keys.KeyW || keys.ArrowUp) ? 1 : 0);
  if (mx || my) {
    const l = Math.hypot(mx, my);
    mx /= l; my /= l;
    const sp = player.carrying ? 175 : 235; // heavy pumpkins slow you down
    player.x += mx * sp * dt;
    player.y += my * sp * dt;
    player.facing = Math.atan2(my, mx);
  }
  player.x = clamp(player.x, 26, WORLD_W - 26);
  player.y = clamp(player.y, 26, WORLD_H - 26);
  // can't walk through the display tower
  const dx = player.x - DISPLAY.x, dy = player.y - DISPLAY.y;
  const d = Math.hypot(dx, dy), minD = DISPLAY.r + 14;
  if (d < minD && d > 0.001) {
    player.x = DISPLAY.x + (dx / d) * minD;
    player.y = DISPLAY.y + (dy / d) * minD;
  }
  collideRect(player, TRUCK_RECT, 12); // can't walk through the truck
}

function collideRect(o, rc, pad) {
  const x0 = rc.x - pad, y0 = rc.y - pad, x1 = rc.x + rc.w + pad, y1 = rc.y + rc.h + pad;
  if (o.x > x0 && o.x < x1 && o.y > y0 && o.y < y1) {
    const dl = o.x - x0, dr = x1 - o.x, dtp = o.y - y0, db = y1 - o.y;
    const m = Math.min(dl, dr, dtp, db);
    if (m === dl) o.x = x0; else if (m === dr) o.x = x1; else if (m === dtp) o.y = y0; else o.y = y1;
  }
}

function nearestPumpkin(maxD) {
  let found = null, bd = maxD;
  for (const s of spots) {
    if (!s.has) continue;
    const d = dist(player.x, player.y, s.x, s.y);
    if (d < bd) { bd = d; found = s; }
  }
  return found;
}

function respawnPumpkin() {
  const empty = spots.filter((s) => !s.has);
  if (!empty.length) return;
  const s = empty[(Math.random() * empty.length) | 0];
  s.has = true; s.pop = 0;
}

function restock(dt) {
  for (const s of spots) if (s.has && s.pop < 1) s.pop = Math.min(1, s.pop + dt * 3);
  restockT -= dt;
  if (restockT <= 0) {
    const present = spots.filter((s) => s.has).length;
    if (present < spots.length - 2) respawnPumpkin(); // the farmer keeps restocking
    restockT = 1.9 + Math.random() * 0.8;
  }
}

/* The golden rule of this game: the guard can only PROVE it if he sees your
   hands on a pumpkin. Grabbing, stuffing and dumping are all "acts" — get seen
   mid-act for half a second and you're busted. Carrying is safe (suspicious). */
function handleActs(dt) {
  // grab from the display
  grabSpot = player.carrying ? null : nearestPumpkin(38);
  if (keys.Space && grabSpot) {
    const prev = grabT;
    grabT += dt / 1.05;
    if (Math.floor(prev * 6) !== Math.floor(grabT * 6)) Sfx.grabTick();
    if (grabT >= 1) {
      player.carrying = true;
      grabSpot.has = false;
      grabT = 0;
      Sfx.grabDone();
    }
  } else grabT = Math.max(0, grabT - dt * 3);

  // stuff into the tote bag
  if (keys.KeyF && player.carrying && player.bag < 4) {
    stuffT += dt / 0.8;
    if (stuffT >= 1) {
      player.bag++;
      player.carrying = false;
      stuffT = 0;
      Sfx.stuff();
    }
  } else stuffT = Math.max(0, stuffT - dt * 3);

  // dump at the truck pad
  const onPad = dist(player.x, player.y, PAD.x, PAD.y) < PAD.r && player.bag > 0;
  if (keys.KeyE && onPad) {
    dumpT += dt / 0.9;
    if (dumpT >= 1) {
      const n = player.bag;
      player.bag = 0;
      delivered += n;
      const pts = n * 10 + (n === 4 ? 50 : 0);
      score += pts;
      addFloat(PAD.x, PAD.y - 76, "+" + pts + (n === 4 ? " FULL BAG!" : ""), "#ffd23e");
      Sfx.deliver();
      dumpT = 0;
      if (delivered >= quota) {
        state = "shiftcomplete";
        stateT = 2.4;
        const bonus = Math.ceil(timeLeft) * 2;
        score += bonus;
        addFloat(PAD.x, PAD.y - 108, "TIME BONUS +" + bonus, "#9fe870");
        Sfx.shiftUp();
      }
    }
  } else dumpT = Math.max(0, dumpT - dt * 3);

  player.acting = grabT > 0 || stuffT > 0 || dumpT > 0;
}

/* ---------------- guard AI ---------------- */
function patrolGuard(g, dt) {
  if (g.kind === "orbit") {
    g.angle += g.angSpeed * dt;
    const r = g.radius + Math.sin(g.angle * 3) * 14;
    g.x = DISPLAY.x + Math.cos(g.angle) * r;
    g.y = DISPLAY.y + Math.sin(g.angle) * r;
    g.facing = g.angle + (g.angSpeed > 0 ? Math.PI / 2 : -Math.PI / 2); // face along the path
  } else {
    const p = g.points[g.idx];
    const dx = p[0] - g.x, dy = p[1] - g.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) g.idx = (g.idx + 1) % g.points.length;
    else {
      g.x += (dx / d) * g.speed * dt;
      g.y += (dy / d) * g.speed * dt;
      g.facing = Math.atan2(dy, dx);
    }
  }
}

function moveGuardTo(g, target, step) {
  const dx = target.x - g.x, dy = target.y - g.y;
  const d = Math.hypot(dx, dy);
  if (d > 1) {
    const s = Math.min(step, d);
    g.x += (dx / d) * s;
    g.y += (dy / d) * s;
    g.facing = Math.atan2(dy, dx);
  }
}

function endChase(g) {
  g.chase = false;
  g.proof = 0;
  if (g.kind === "orbit") g.angle = Math.atan2(g.y - DISPLAY.y, g.x - DISPLAY.x);
  else {
    let bi = 0, bd = Infinity;
    g.points.forEach((p, i) => {
      const d = (p[0] - g.x) ** 2 + (p[1] - g.y) ** 2;
      if (d < bd) { bd = d; bi = i; }
    });
    g.idx = bi;
  }
}

function updateGuardsPlaying(dt) {
  let seenCarrying = false;
  for (const g of guards) {
    const sees = guardSeesPlayer(g);
    g.seen = sees && state === "playing";

    // PROOF: he must see your hands on a pumpkin
    if (sees && player.acting && graceT <= 0) {
      if (g.proof > 0 && g.proof < 0.12) Sfx.alert();
      g.proof += dt;
      if (g.proof >= 0.5) { doBust(g); return; }
    } else g.proof = Math.max(0, g.proof - dt * 2.5);

    if (sees && (player.carrying || player.bag > 0)) seenCarrying = true;

    // CHASE: suspicion maxed out and he's coming for you
    if (g.chase) {
      g.chaseT -= dt;
      const target = sees ? { x: player.x, y: player.y } : g.lastSeen;
      if (sees) { g.lastSeen = { x: player.x, y: player.y }; g.loseT = 0; }
      else g.loseT += dt;
      moveGuardTo(g, target, (215 + shift * 8) * dt);
      if (dist(g.x, g.y, player.x, player.y) < 30 && state === "playing") { startBagCheck(g); return; }
      if (g.chaseT <= 0 || g.loseT > 3) endChase(g);
    } else patrolGuard(g, dt);
  }

  // SUSPICION: he can't prove it, but he's watching you carry pumpkins
  if (seenCarrying && graceT <= 0) suspicion = Math.min(100, suspicion + dt * 24);
  else suspicion = Math.max(0, suspicion - dt * 13);

  if (suspicion >= 100) {
    let g = guards[0];
    for (const o of guards) if (!o.chase && dist(o.x, o.y, player.x, player.y) < dist(g.x, g.y, player.x, player.y)) g = o;
    if (!g.chase) {
      g.chase = true;
      g.chaseT = 7;
      g.loseT = 0;
      Sfx.alert();
      addFloat(g.x, g.y - 48, "HE'S ONTO YOU!", "#ff5d49");
    }
  }
}

function startBagCheck(g) {
  state = "bagcheck";
  stateT = 2.3;
  bagCheckGuard = g;
  g.chase = false;
  Sfx.taunt();
}

function finishBagCheck() {
  const had = player.bag + (player.carrying ? 1 : 0);
  if (had > 0) { score += 25; addFloat(player.x, player.y - 48, "GETAWAY +25", "#ffd23e"); }
  suspicion = 35; // he's still suspicious...
  bagCheckGuard = null;
  state = "playing";
  graceT = 1.8;
}

function doBust(g) {
  lives--;
  g.proof = 0;
  guards.forEach((o) => { o.chase = false; o.proof = 0; });
  if (player.carrying) { player.carrying = false; respawnPumpkin(); } // the pumpkin goes back on display
  grabT = stuffT = dumpT = 0;
  state = "busted";
  stateT = 1.7;
  flashT = 0.5;
  Sfx.bust();
  addFloat(player.x, player.y - 48, "BUSTED!", "#ff3b2f");
}

function endRun(reason) {
  state = "gameover";
  gameOverReason = reason;
  newBest = score > best;
  if (newBest) { best = score; localStorage.setItem("cpi-best", String(best)); }
}

function startGame() {
  Sfx.ensure();
  score = 0; lives = 3; suspicion = 0; floats = [];
  grabT = stuffT = dumpT = 0;
  player.x = 640; player.y = 620;
  player.carrying = false; player.bag = 0; player.facing = -Math.PI / 2;
  spots.forEach((s) => { s.has = true; s.pop = 1; });
  setupShift(1);
  state = "playing";
  graceT = 2;
  Sfx.start();
}

/* ---------------- rendering ---------------- */
function drawPumpkin(c, x, y, r) {
  c.save();
  c.translate(x, y);
  c.fillStyle = "rgba(40, 20, 5, 0.3)";
  c.beginPath(); c.ellipse(1.5, 2.5, r * 0.95, r * 0.8, 0, 0, 7); c.fill();
  const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.2, 0, 0, r);
  g.addColorStop(0, "#ff9a4d"); g.addColorStop(0.65, "#e8722a"); g.addColorStop(1, "#c2551d");
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  c.strokeStyle = "rgba(150, 64, 18, 0.55)";
  c.lineWidth = Math.max(1, r * 0.1);
  c.beginPath(); c.arc(0, 0, r * 0.62, 0, 7); c.stroke();
  c.beginPath(); c.arc(0, 0, r * 0.34, 0, 7); c.stroke();
  c.fillStyle = "#5f7d31";
  c.beginPath(); c.arc(0, 0, r * 0.2, 0, 7); c.fill();
  c.strokeStyle = "rgba(60, 80, 25, 0.8)"; c.lineWidth = 1; c.stroke();
  c.fillStyle = "rgba(255, 235, 200, 0.28)";
  c.beginPath(); c.ellipse(-r * 0.35, -r * 0.4, r * 0.3, r * 0.18, -0.6, 0, 7); c.fill();
  c.restore();
}

function drawPlayer(c) {
  const p = player;
  c.save();
  c.translate(p.x, p.y);
  c.fillStyle = "rgba(30, 15, 5, 0.3)";
  c.beginPath(); c.ellipse(2, 4, 16, 12, 0, 0, 7); c.fill();
  c.rotate(p.facing + Math.PI / 2); // local "up" now points where she's facing

  // tote bag on her back — it bulges as it fills
  const bh = 15 + p.bag * 4;
  c.fillStyle = "#c89a5e";
  rr(c, -10, 7, 20, bh, 5); c.fill();
  c.strokeStyle = "#7a5a30"; c.lineWidth = 2; c.stroke();
  for (let i = 0; i < p.bag; i++) {
    const bx = -5 + (i % 2) * 10, by = 14 + Math.floor(i / 2) * 9;
    c.fillStyle = "#e8722a";
    c.beginPath(); c.arc(bx, by, 3.6, 0, 7); c.fill();
    c.strokeStyle = "rgba(120, 50, 10, 0.7)"; c.lineWidth = 1; c.stroke();
  }

  // shoulders (gray top, like the photo)
  c.fillStyle = "#8d8779";
  c.beginPath(); c.ellipse(0, -1, 13, 11, 0, 0, 7); c.fill();
  c.strokeStyle = "rgba(60, 55, 45, 0.5)"; c.lineWidth = 1.5; c.stroke();

  // arms reach forward while acting
  if (p.acting) {
    c.fillStyle = "#e8b98d";
    c.beginPath(); c.arc(-7, -13, 3.6, 0, 7); c.fill();
    c.beginPath(); c.arc(7, -13, 3.6, 0, 7); c.fill();
  }

  // head (long brown hair from above)
  c.fillStyle = "#a06a3c";
  c.beginPath(); c.arc(0, -2, 8.5, 0, 7); c.fill();
  c.strokeStyle = "rgba(70, 42, 18, 0.7)"; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(0, -10); c.lineTo(0, 6); c.stroke();
  c.beginPath(); c.arc(0, -2, 5.5, -2.4, -0.8); c.stroke();
  c.beginPath(); c.arc(0, -2, 5.5, 0.8, 2.4); c.stroke();

  // the pumpkin she's carrying, held out in front
  if (p.carrying) drawPumpkin(c, 0, -17, 12);
  c.restore();
}

function drawGuard(c, g) {
  c.save();
  c.translate(g.x, g.y);
  c.fillStyle = "rgba(30, 15, 5, 0.3)";
  c.beginPath(); c.ellipse(2, 4, 16, 12, 0, 0, 7); c.fill();
  c.rotate(g.facing + Math.PI / 2);

  // navy uniform shoulders
  c.fillStyle = g.chase ? "#5a3048" : "#33456b";
  c.beginPath(); c.ellipse(0, -1, 13, 11, 0, 0, 7); c.fill();
  c.strokeStyle = "rgba(20, 28, 48, 0.7)"; c.lineWidth = 1.5; c.stroke();

  // cap with brim pointing forward
  c.fillStyle = "#26365a";
  c.beginPath(); c.arc(0, -2, 8, 0, 7); c.fill();
  c.fillStyle = "#1b2743";
  rr(c, -7, -14, 14, 5, 2.5); c.fill();

  // gold badge
  c.fillStyle = "#ffd23e";
  c.beginPath(); c.arc(9, 3, 2.2, 0, 7); c.fill();
  c.restore();

  // "!" when he's building proof on you
  if (g.proof > 0.1 || g.chase) {
    c.save();
    c.font = `900 30px ${FONT}`;
    c.textAlign = "center"; c.textBaseline = "middle";
    const pulse = 1 + Math.sin(performance.now() / 70) * 0.12;
    c.translate(g.x, g.y - 40);
    c.scale(pulse, pulse);
    c.lineWidth = 5; c.strokeStyle = "#3a0d08";
    c.strokeText("!", 0, 0);
    c.fillStyle = g.chase ? "#ff2e1f" : "#ffb02e";
    c.fillText("!", 0, 0);
    c.restore();
  }
}

function drawCone(c, g) {
  let fill = "rgba(255, 214, 90, 0.13)", stroke = "rgba(255, 214, 90, 0.3)";
  if (g.chase) { fill = "rgba(255, 80, 60, 0.2)"; stroke = "rgba(255, 80, 60, 0.55)"; }
  else if (g.proof > 0) { fill = `rgba(255, 90, 60, ${0.14 + g.proof * 0.3})`; stroke = "rgba(255, 90, 60, 0.6)"; }
  else if (g.seen) { fill = "rgba(255, 230, 120, 0.2)"; stroke = "rgba(255, 230, 120, 0.45)"; }
  c.beginPath();
  c.moveTo(g.x, g.y);
  c.arc(g.x, g.y, g.range, g.facing - g.fov / 2, g.facing + g.fov / 2);
  c.closePath();
  c.fillStyle = fill; c.fill();
  c.strokeStyle = stroke; c.lineWidth = 1.5; c.stroke();
}

function progressRing(c, x, y, r, frac, color) {
  c.save();
  c.lineWidth = 5;
  c.strokeStyle = "rgba(30, 18, 6, 0.75)";
  c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
  c.strokeStyle = color;
  c.lineCap = "round";
  c.beginPath(); c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); c.stroke();
  c.restore();
}

function drawWorld(c, t) {
  c.drawImage(bg, 0, 0, WORLD_W, WORLD_H);

  // dump pad beside the truck
  const padActive = player.bag > 0 && state === "playing";
  c.save();
  c.setLineDash([10, 8]);
  c.lineDashOffset = -t * 30;
  c.lineWidth = 3;
  c.strokeStyle = padActive ? `rgba(255, 210, 62, ${0.55 + Math.sin(t * 5) * 0.25})` : "rgba(255, 210, 62, 0.22)";
  c.beginPath(); c.arc(PAD.x, PAD.y, PAD.r, 0, 7); c.stroke();
  c.setLineDash([]);
  if (padActive) {
    c.fillStyle = "rgba(255, 210, 62, 0.08)";
    c.beginPath(); c.arc(PAD.x, PAD.y, PAD.r, 0, 7); c.fill();
  }
  c.font = `900 13px ${FONT}`;
  c.textAlign = "center"; c.textBaseline = "middle";
  c.fillStyle = padActive ? "rgba(255, 233, 196, 0.95)" : "rgba(255, 233, 196, 0.4)";
  c.fillText("TRUCK DUMP", PAD.x, PAD.y - PAD.r - 14);
  c.restore();

  // pumpkins on the display (with restock pop-in)
  for (const s of spots) {
    if (!s.has) continue;
    let sc = 1;
    if (s.pop < 1) { const p = s.pop; sc = p < 0.7 ? (p / 0.7) * 1.15 : 1.15 - ((p - 0.7) / 0.3) * 0.15; }
    drawPumpkin(c, s.x, s.y, 16 * sc);
  }
  if (grabSpot && grabT > 0) progressRing(c, grabSpot.x, grabSpot.y, 24, grabT, "#ffd23e");

  // vision cones under the characters
  guards.forEach((g) => drawCone(c, g));

  if ((stuffT > 0 || dumpT > 0) && state === "playing") {
    progressRing(c, player.x, player.y, 24, stuffT > 0 ? stuffT : dumpT, "#9fe870");
  }

  drawPlayer(c);
  guards.forEach((g) => drawGuard(c, g));

  // comic speech bubble during a bag check
  if (state === "bagcheck" && bagCheckGuard) {
    const g = bagCheckGuard;
    c.save();
    c.font = `900 17px ${FONT}`;
    const label = "I CAN'T PROVE IT.";
    const w = c.measureText(label).width + 28;
    const bx = clamp(g.x - w / 2, 8, WORLD_W - w - 8), by = g.y - 78;
    c.fillStyle = "rgba(255, 253, 246, 0.96)";
    rr(c, bx, by, w, 34, 10); c.fill();
    c.strokeStyle = "#3a2c18"; c.lineWidth = 2; c.stroke();
    c.beginPath();
    c.moveTo(g.x - 7, by + 34); c.lineTo(g.x + 9, by + 34); c.lineTo(g.x, by + 50);
    c.closePath(); c.fill();
    c.fillStyle = "#2c1f0e";
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(label, bx + w / 2, by + 18);
    c.restore();
  }

  // floating score texts
  for (const f of floats) {
    c.save();
    c.globalAlpha = Math.min(1, f.t);
    c.font = `900 21px ${FONT}`;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = 4; c.strokeStyle = "rgba(30, 16, 4, 0.85)";
    c.strokeText(f.text, f.x, f.y);
    c.fillStyle = f.color;
    c.fillText(f.text, f.x, f.y);
    c.restore();
  }

  // red flash on a bust
  if (flashT > 0) {
    c.fillStyle = `rgba(255, 40, 30, ${flashT * 0.4})`;
    c.fillRect(0, 0, WORLD_W, WORLD_H);
  }
}

function render(t) {
  const W = window.innerWidth, H = window.innerHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#171009";
  ctx.fillRect(0, 0, W, H);

  // world space (cover-scaled so the playfield always fills the screen)
  ctx.setTransform(dpr * viewScale, 0, 0, dpr * viewScale, dpr * offX, dpr * offY);
  drawWorld(ctx, t);

  // screen-space overlays
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (state === "attract") drawAttract(ctx, W, H, t);
  else {
    drawHud(ctx, W, H, t);
    if (state === "shiftcomplete") drawShiftBanner(ctx, W, H);
    if (state === "busted") drawBustedText(ctx, W, H, t);
    if (state === "paused") drawPause(ctx, W, H);
    if (state === "gameover") drawGameOver(ctx, W, H, t);
  }
}

/* ---------------- HUD (screen-space overlay) ---------------- */
function panel(c, x, y, w, h) {
  c.fillStyle = "rgba(24, 15, 7, 0.62)";
  rr(c, x, y, w, h, 10); c.fill();
  c.strokeStyle = "rgba(255, 233, 196, 0.14)"; c.lineWidth = 1; c.stroke();
}

function fmtTime(v) {
  const t = Math.max(0, v);
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
}

function hintText() {
  if (state !== "playing") return "";
  if (player.bag >= 4) return "BAG FULL — RUN TO THE TRUCK AND HOLD E";
  if (grabSpot && !player.carrying) return "HOLD SPACE TO GRAB A PUMPKIN";
  if (player.carrying) {
    return player.bag < 4 ? "HOLD F TO STUFF IT IN YOUR BAG" : "BAG FULL — DROP IT (X) OR RUN FOR THE TRUCK";
  }
  if (dist(player.x, player.y, PAD.x, PAD.y) < PAD.r + 70 && player.bag > 0) return "HOLD E AT THE TRUCK TO DUMP";
  return "WASD MOVE · SPACE GRAB · F STUFF · E DUMP · X DROP · P PAUSE · M MUTE";
}

function drawHud(c, W, H, t) {
  // score — top left
  panel(c, 14, 14, 196, 66);
  c.textAlign = "left"; c.textBaseline = "alphabetic";
  c.font = `700 12px ${FONT}`; c.fillStyle = "rgba(255,233,196,.6)";
  c.fillText("SCORE", 30, 40);
  c.font = `900 27px ${FONT}`; c.fillStyle = "#fff";
  c.fillText(String(score).padStart(6, "0"), 30, 68);
  c.textAlign = "right";
  c.font = `700 12px ${FONT}`; c.fillStyle = "rgba(255,233,196,.5)";
  c.fillText("BEST " + String(best).padStart(6, "0"), 194, 40);

  // shift / quota / timer — top center
  const cw = 280;
  panel(c, W / 2 - cw / 2, 14, cw, 78);
  c.textAlign = "center";
  c.font = `900 15px ${FONT}`; c.fillStyle = "#ffd23e";
  c.fillText(`SHIFT ${shift}`, W / 2, 36);
  c.font = `900 17px ${FONT}`; c.fillStyle = "#fff";
  c.fillText(`PUMPKINS ${delivered} / ${quota}`, W / 2, 58);
  const low = timeLeft <= 10 && state === "playing";
  c.font = `900 21px ${FONT}`;
  c.fillStyle = low ? (Math.sin(t * 8) > 0 ? "#ff3b2f" : "#ffb0a4") : "#ffe9c4";
  c.fillText(fmtTime(timeLeft), W / 2, 82);

  // lives + suspicion — top right
  const rx = W - 226;
  panel(c, rx, 14, 212, 78);
  for (let i = 0; i < 3; i++) {
    c.save();
    if (i >= lives) c.globalAlpha = 0.22;
    drawPumpkin(c, rx + 60 + i * 44, 38, 11);
    c.restore();
  }
  c.font = `700 11px ${FONT}`; c.fillStyle = "rgba(255,233,196,.6)"; c.textAlign = "left";
  c.fillText("SUSPICION", rx + 18, 64);
  const bw = 176;
  c.fillStyle = "rgba(255,255,255,.12)";
  rr(c, rx + 18, 70, bw, 10, 5); c.fill();
  if (suspicion > 0.5) {
    const frac = suspicion / 100;
    let col = "#ffd23e";
    if (frac > 0.8) col = "#ff3b2f"; else if (frac > 0.5) col = "#ff9d2e";
    c.save();
    if (frac > 0.7) c.globalAlpha = 0.7 + Math.sin(t * 10) * 0.3;
    c.fillStyle = col;
    rr(c, rx + 18, 70, bw * frac, 10, 5); c.fill();
    c.restore();
  }

  // contextual hint — bottom center
  const hint = hintText();
  if (hint) {
    c.font = `900 15px ${FONT}`;
    c.textAlign = "center"; c.textBaseline = "middle";
    const hw = c.measureText(hint).width + 36;
    panel(c, W / 2 - hw / 2, H - 48, hw, 30);
    c.fillStyle = "rgba(255, 233, 196, 0.9)";
    c.fillText(hint, W / 2, H - 32);
  }

  if (Sfx.muted) {
    c.font = `700 12px ${FONT}`; c.textAlign = "right"; c.textBaseline = "alphabetic";
    c.fillStyle = "rgba(255,233,196,.45)";
    c.fillText("MUTED (M)", W - 18, H - 16);
  }
}

/* ---------------- overlays ---------------- */
function drawAttract(c, W, H, t) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(14, 9, 4, 0.72)");
  g.addColorStop(0.45, "rgba(14, 9, 4, 0.38)");
  g.addColorStop(1, "rgba(14, 9, 4, 0.78)");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);

  const cx = W / 2;
  drawPumpkin(c, cx, H * 0.5 - 152, 36);

  c.textAlign = "center"; c.textBaseline = "middle";
  c.save();
  c.font = `900 ${Math.min(74, W * 0.058)}px ${FONT}`;
  c.shadowColor = "rgba(232, 114, 42, 0.8)"; c.shadowBlur = 26;
  c.fillStyle = "#fff7ea";
  c.fillText("I CAN'T PROVE IT", cx, H * 0.5 - 76);
  c.restore();

  c.font = `900 ${Math.min(20, W * 0.016)}px ${FONT}`;
  c.fillStyle = "#ffd23e";
  c.fillText("SHE MIGHT BE SHOPLIFTING.", cx, H * 0.5 - 32);

  c.globalAlpha = 0.55 + 0.45 * Math.sin(t * 4);
  c.font = `900 24px ${FONT}`; c.fillStyle = "#fff";
  c.fillText("PRESS ENTER TO CLOCK IN", cx, H * 0.5 + 16);
  c.globalAlpha = 1;
  c.font = `700 13px ${FONT}`; c.fillStyle = "rgba(255,233,196,.6)";
  c.fillText("(or click / tap)", cx, H * 0.5 + 42);

  const pw = Math.min(700, W - 40), ph = 96, px = cx - pw / 2, py = H * 0.5 + 76;
  panel(c, px, py, pw, ph);
  c.font = `700 14px ${FONT}`; c.fillStyle = "rgba(255,233,196,.9)";
  c.fillText("WASD / ARROWS move · hold SPACE to grab a pumpkin · hold F to stuff it in your bag", cx, py + 24);
  c.fillText("hold E at the truck to dump (full bag = bonus) · X drop · P pause · M mute", cx, py + 50);
  c.font = `700 13px ${FONT}`; c.fillStyle = "rgba(255,233,196,.55)";
  c.fillText("He can only prove it if he sees your hands on a pumpkin. Hide behind the tower.", cx, py + 76);

  c.font = `700 12px ${FONT}`; c.fillStyle = "rgba(255,233,196,.4)";
  c.fillText("AN IMGUR-TO-GAME · PUMPKIN STAND HEIST", cx, H - 18);
}

function drawShiftBanner(c, W, H) {
  const cw = Math.min(520, W - 40);
  panel(c, W / 2 - cw / 2, H * 0.36, cw, 92);
  c.textAlign = "center"; c.textBaseline = "middle";
  c.font = `900 34px ${FONT}`; c.fillStyle = "#9fe870";
  c.fillText(`SHIFT ${shift} COMPLETE!`, W / 2, H * 0.36 + 34);
  c.font = `700 15px ${FONT}`; c.fillStyle = "rgba(255,233,196,.8)";
  c.fillText("NEXT SHIFT INCOMING — MORE GUARDS", W / 2, H * 0.36 + 66);
}

function drawBustedText(c, W, H, t) {
  const pulse = 1 + Math.sin(t * 14) * 0.08;
  c.save();
  c.translate(W / 2, H * 0.4);
  c.scale(pulse, pulse);
  c.textAlign = "center"; c.textBaseline = "middle";
  c.font = `900 64px ${FONT}`;
  c.lineWidth = 10; c.strokeStyle = "#3a0d08";
  c.strokeText("BUSTED!", 0, 0);
  c.fillStyle = "#ff3b2f";
  c.fillText("BUSTED!", 0, 0);
  c.restore();
}

function drawPause(c, W, H) {
  c.fillStyle = "rgba(14, 9, 4, 0.55)";
  c.fillRect(0, 0, W, H);
  c.textAlign = "center"; c.textBaseline = "middle";
  c.font = `900 48px ${FONT}`; c.fillStyle = "#fff7ea";
  c.fillText("PAUSED", W / 2, H * 0.45);
  c.font = `700 16px ${FONT}`; c.fillStyle = "rgba(255,233,196,.7)";
  c.fillText("P to resume · M mute", W / 2, H * 0.45 + 44);
}

function drawGameOver(c, W, H, t) {
  c.fillStyle = "rgba(14, 9, 4, 0.74)";
  c.fillRect(0, 0, W, H);
  const cx = W / 2;
  c.textAlign = "center"; c.textBaseline = "middle";

  const busted = gameOverReason === "BUSTED";
  c.font = `900 ${Math.min(64, W * 0.05)}px ${FONT}`;
  c.fillStyle = busted ? "#ff3b2f" : "#ffd23e";
  c.fillText(busted ? "CASE CLOSED." : "SHIFT OVER.", cx, H * 0.3);
  c.font = `700 16px ${FONT}`; c.fillStyle = "rgba(255,233,196,.8)";
  c.fillText(busted ? "The guard finally proved it." : "Quota missed — the stand closes for the night.", cx, H * 0.3 + 40);

  const pw = Math.min(420, W - 40), py = H * 0.38;
  panel(c, cx - pw / 2, py, pw, 150);
  c.font = `700 13px ${FONT}`; c.fillStyle = "rgba(255,233,196,.6)";
  c.fillText("FINAL SCORE", cx, py + 28);
  c.font = `900 44px ${FONT}`; c.fillStyle = "#fff";
  c.fillText(String(score).padStart(6, "0"), cx, py + 66);
  c.font = `700 15px ${FONT}`; c.fillStyle = "rgba(255,233,196,.8)";
  const bestLine = newBest ? "NEW BEST!" : "BEST " + String(best).padStart(6, "0");
  c.fillText(`${bestLine}   ·   REACHED SHIFT ${shift}`, cx, py + 104);

  c.globalAlpha = 0.55 + 0.45 * Math.sin(t * 4);
  c.font = `900 22px ${FONT}`; c.fillStyle = "#fff";
  c.fillText("PRESS ENTER TO TRY AGAIN", cx, py + 196);
  c.globalAlpha = 1;
}

/* ---------------- input & boot ---------------- */
const keys = {};

window.addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  const fresh = !keys[e.code];
  keys[e.code] = true;
  if (!fresh) return;

  if ((e.code === "Enter" || (e.code === "Space" && state !== "playing")) && (state === "attract" || state === "gameover")) {
    startGame();
    return;
  }
  if ((e.code === "KeyP" || e.code === "Escape") && (state === "playing" || state === "paused")) {
    state = state === "paused" ? "playing" : "paused";
    return;
  }
  if (e.code === "KeyM") { Sfx.setMuted(!Sfx.muted); return; }
  if (e.code === "KeyX" && state === "playing" && player.carrying) {
    player.carrying = false; // dropping isn't proof — but you lose the pumpkin
    respawnPumpkin();
    Sfx.drop();
  }
});

window.addEventListener("keyup", (e) => { keys[e.code] = false; });
window.addEventListener("blur", () => {
  if (state === "playing") state = "paused";
  for (const k in keys) keys[k] = false;
});

canvas.addEventListener("pointerdown", () => {
  Sfx.ensure();
  if (state === "attract" || state === "gameover") startGame();
});

// attract-mode backdrop: one guard already patrolling the stand
setupShift(1);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  render(now / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

})();











