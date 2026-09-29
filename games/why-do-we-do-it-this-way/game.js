(() => {
  "use strict";

  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const ui = {
    hud: $("hud"), attract: $("attract"), intro: $("intro"), introBar: $("intro-bar"),
    pause: $("pause"), over: $("over"), banner: $("banner"), probe: $("safe-probe"),
    start: $("start"), resume: $("resume"), restart: $("restart"), toTitle: $("to-title"),
    clock: $("clock"), wave: $("wave"), views: $("views"),
    complaints: $("complaints"), combo: $("combo"), comboWrap: $("combo-wrap"), fixed: $("fixed"),
    soul: $("soul"), goodwill: $("goodwill"), best: $("best"),
    overKicker: $("over-kicker"), overTitle: $("over-title"), overReason: $("over-reason"),
    overTime: $("over-time"), overViews: $("over-views"), overComplaints: $("over-complaints"),
    overCombo: $("over-combo"), overFixed: $("over-fixed"), overAdopted: $("over-adopted"), overBest: $("over-best"),
  };

  const ABSURD = [
    "Print the email, scan it, email the scan",
    "Schedule a meeting to plan the meeting",
    "Reply-all to confirm you got the reply-all",
    "Three signatures to requisition a stapler",
    "Fax it. Yes, fax.",
    "Submit a ticket to request a ticket form",
    "Retype the PDF into the spreadsheet by hand",
    "Daily stand-up: 90 minutes, all seated",
    "Name it FINAL_final_v7_USE_THIS",
    "Status report about the status reports",
    "Approval required to use the approval form",
    "Laminate the laminating instructions",
    "Hand-deliver the PDF on a USB stick",
    "Weekly sync. No agenda. Cameras on.",
    "Use the 2003 template. Only the 2003 one.",
    "CC the entire department. Always.",
    "Copy data between two systems manually",
    "Mail the invoice, then call to say it's mailed",
    "Print the slides so we can read the slides",
    "Timesheets in 6-minute blocks, in pen",
    "Book a room to book the other room",
    "One shared password on a sticky note",
    "Thermostat changes require a form",
    "Summarize the summary of the summary",
  ];
  const SENSIBLE = [
    "Back up the database nightly",
    "Lock your screen when you step away",
    "Wash your hands before returning to work",
    "Review code before merging",
    "Never share your password",
    "Test before deploying to production",
    "Keep receipts for expense claims",
    "Fire alarm: use the stairs, not the lift",
    "Turn on two-factor authentication",
    "Label your food in the shared fridge",
    "Report injuries the same day",
    "Keep fire exits clear",
    "Use version control for code",
    "Don't click links from unknown senders",
    "Write down how to restore the backups",
    "Wear goggles in the lab",
  ];
  const HEADERS = ["MEMO", "POLICY", "SOP", "NOTICE", "RULE"];
  const PAPER = ["#fff176", "#ffffff", "#ffd1dc", "#d4e9ff", "#dcf5cc"];
  const QUIPS = {
    right: ["...huh. Fair point.", "Nobody knows why we did that.", "Wait, we don't HAVE to?", "I've done that for 11 years.", "Ugh. You're right. I hate it.", "Someone from 2009 made that up."],
    wrong: ["That one's literally for safety.", "Did you... read it?", "That rule is actually good.", "Now you're just being difficult.", "Adding this to your review.", "Some rules are fine, new hire."],
    adopted: ["Great, it's in the handbook now.", "Per the new policy...", "Mandatory starting Monday.", "Welcome to the process.", "I'll set up a meeting about it."],
    boss: ["Because we've ALWAYS done it this way.", "Don't rock the boat.", "If it ain't broke...", "That's just how it's done here."],
    bossDown: ["...maybe we try it your way?", "Is the binder... gone?"],
  };
  const BEST_KEY = "why-do-we-do-it-this-way.best";
  const FIRE_CODES = new Set(["Space", "ArrowUp", "KeyW", "KeyZ", "KeyJ"]);
  const MAX_METER = 5;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function makeDeck(src) {
    let deck = [];
    return () => {
      if (!deck.length) {
        deck = src.slice();
        for (let i = deck.length - 1; i > 0; i--) {
          const j = (Math.random() * (i + 1)) | 0;
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
      }
      return deck.pop();
    };
  }
  const nextAbsurd = makeDeck(ABSURD);
  const nextSensible = makeDeck(SENSIBLE);

  let best = 0;
  try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch { best = 0; }

  let W = 0, H = 0, DPR = 1, S = 1, groundY = 0;
  const bg = document.createElement("canvas");
  const bgx = bg.getContext("2d");

  let mode = "attract";
  let time = 0, shake = 0, flash = 0, flashColor = "200,20,40";
  let introT = 0, overT = 0, overReady = Infinity;
  let G = null;
  const keys = { left: false, right: false, fire: false };
  let pointerX = null, pointerDown = false, usePointer = false, fireLock = false;
  const coworkers = [
    { side: -1, name: "DOUG", shirt: "#8fa7c4", bubble: null, react: 0, mood: "meh" },
    { side: 1, name: "MARJORIE", shirt: "#b784a7", bubble: null, react: 0, mood: "meh" },
  ];

  /* ---------- Audio ---------- */
  let actx = null, muted = false;
  function audioInit() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { actx = null; }
    }
    if (actx && actx.state === "suspended") actx.resume();
  }
  function tone(freq, dur, type = "square", vol = 0.06, slide = 0, delay = 0) {
    if (!actx || muted) return;
    const t = actx.currentTime + delay;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq) {
    if (!actx || muted) return;
    const len = Math.floor(actx.sampleRate * dur);
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = actx.createBufferSource();
    src.buffer = buf;
    const f = actx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = freq;
    const g = actx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(actx.destination);
    src.start();
  }
  const sfx = {
    shoot: () => tone(620, 0.08, "square", 0.035, 320),
    rip: () => { noise(0.18, 0.12, 1400); tone(880, 0.09, "triangle", 0.05, 500); },
    thunk: () => tone(190, 0.08, "square", 0.05, -70),
    buzz: () => { tone(130, 0.32, "sawtooth", 0.06, -40); tone(138, 0.32, "sawtooth", 0.04, -40); },
    stamp: () => { noise(0.12, 0.22, 200); tone(95, 0.25, "sine", 0.2, -50); },
    file: () => { tone(520, 0.06, "sine", 0.05); tone(780, 0.08, "sine", 0.05, 0, 0.06); },
    wave: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, "triangle", 0.06, 0, i * 0.09)),
    win: () => [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, "square", 0.045, 0, i * 0.08)),
    over: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, "sawtooth", 0.05, 0, i * 0.18)),
  };
  function play(name) { if (G && !G.demo) sfx[name](); }

  /* ---------- Layout ---------- */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    S = clamp(Math.min(W / 900, H / 760), 0.62, 1.25);
    const safeBottom = parseFloat(getComputedStyle(ui.probe).paddingBottom) || 0;
    groundY = H - Math.max(22, 30 * S) - safeBottom;
    buildBackground();
    if (G) {
      for (const m of G.memos) { layoutMemo(m); m.baseX = clamp(m.baseX, 6, Math.max(6, W - m.w - 6)); }
      G.player.x = clamp(G.player.x, 28 * S, W - 28 * S);
    }
  }

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  function wrap(text, maxW, font) {
    ctx.font = font;
    const words = text.split(" ");
    const lines = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /* ---------- Background ---------- */
  function buildBackground() {
    bg.width = canvas.width;
    bg.height = canvas.height;
    const b = bgx;
    b.setTransform(DPR, 0, 0, DPR, 0, 0);

    const wall = b.createLinearGradient(0, 0, 0, groundY);
    wall.addColorStop(0, "#dcd6c4");
    wall.addColorStop(1, "#c5bda6");
    b.fillStyle = wall;
    b.fillRect(0, 0, W, groundY);

    b.strokeStyle = "rgba(90,80,60,0.09)";
    b.lineWidth = 1;
    for (let x = 0; x < W; x += 130 * S) {
      b.beginPath(); b.moveTo(x + 0.5, 0); b.lineTo(x + 0.5, groundY); b.stroke();
    }

    const ceilH = 26 * S;
    b.fillStyle = "#ece9e0";
    b.fillRect(0, 0, W, ceilH);
    b.fillStyle = "rgba(0,0,0,0.08)";
    b.fillRect(0, ceilH, W, 2);
    for (let x = 60 * S; x < W; x += 300 * S) {
      const glow = b.createRadialGradient(x + 75 * S, ceilH, 4, x + 75 * S, ceilH, 200 * S);
      glow.addColorStop(0, "rgba(255,255,240,0.45)");
      glow.addColorStop(1, "rgba(255,255,240,0)");
      b.fillStyle = glow;
      b.fillRect(x - 130 * S, ceilH, 410 * S, 220 * S);
      b.fillStyle = "#fffef2";
      b.fillRect(x, 5 * S, 150 * S, ceilH - 10 * S);
    }

    drawWhiteboard(b);
    drawPoster(b);

    b.fillStyle = "#8a8270";
    b.fillRect(0, groundY - 10 * S, W, 10 * S);
    const carpet = b.createLinearGradient(0, groundY, 0, H);
    carpet.addColorStop(0, "#4f5866");
    carpet.addColorStop(1, "#353c46");
    b.fillStyle = carpet;
    b.fillRect(0, groundY, W, H - groundY);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < W * 0.8; i++) {
      b.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.14)";
      b.fillRect(rnd() * W, groundY + rnd() * (H - groundY), 2, 2);
    }
  }

  function arrow(b, x1, y1, x2, y2, u) {
    b.beginPath(); b.moveTo(x1, y1); b.lineTo(x2, y2); b.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1), s = 6 * u;
    b.beginPath();
    b.moveTo(x2, y2);
    b.lineTo(x2 - Math.cos(a - 0.5) * s, y2 - Math.sin(a - 0.5) * s);
    b.moveTo(x2, y2);
    b.lineTo(x2 - Math.cos(a + 0.5) * s, y2 - Math.sin(a + 0.5) * s);
    b.stroke();
  }

  function drawWhiteboard(b) {
    const w = Math.min(W * 0.3, 360 * S);
    if (w < 130) return;
    const h = w * 0.58, x = W * 0.06 + 10, y = clamp(H * 0.27, 150, H * 0.5);
    const u = w / 360;
    b.fillStyle = "#9aa0a6";
    rr(b, x - 6 * u, y - 6 * u, w + 12 * u, h + 12 * u, 6 * u);
    b.fill();
    b.fillStyle = "#fbfbf8";
    b.fillRect(x, y, w, h);
    b.fillStyle = "#80868c";
    b.fillRect(x + w * 0.1, y + h + 6 * u, w * 0.8, 5 * u);

    const marker = '"Segoe Print", "Comic Sans MS", "Bradley Hand", cursive';
    b.fillStyle = "#1f4fa8";
    b.textAlign = "left";
    b.textBaseline = "top";
    b.font = `700 ${Math.max(8, 13 * u)}px ${marker}`;
    b.fillText("PROCESS v14 (FINAL) (2)", x + 12 * u, y + 10 * u);

    const boxes = [["START", 0.05, 0.34], ["PRINT", 0.29, 0.34], ["SCAN", 0.53, 0.34], ["ASK BOB", 0.53, 0.7], ["PRINT AGAIN", 0.2, 0.7]];
    const bw = w * 0.21, bh = h * 0.15;
    b.strokeStyle = "#1b1b1b";
    b.lineWidth = Math.max(1, 1.8 * u);
    b.font = `700 ${Math.max(7, 10 * u)}px ${marker}`;
    b.textAlign = "center";
    b.textBaseline = "middle";
    const pos = boxes.map(([t, px, py]) => {
      const bx = x + w * px, by = y + h * py;
      b.strokeRect(bx, by, bw, bh);
      b.fillStyle = "#1b1b1b";
      b.fillText(t, bx + bw / 2, by + bh / 2);
      return [bx, by];
    });
    arrow(b, pos[0][0] + bw, pos[0][1] + bh / 2, pos[1][0], pos[1][1] + bh / 2, u);
    arrow(b, pos[1][0] + bw, pos[1][1] + bh / 2, pos[2][0], pos[2][1] + bh / 2, u);
    arrow(b, pos[2][0] + bw / 2, pos[2][1] + bh, pos[3][0] + bw / 2, pos[3][1], u);
    arrow(b, pos[3][0], pos[3][1] + bh / 2, pos[4][0] + bw, pos[4][1] + bh / 2, u);
    arrow(b, pos[4][0] + bw * 0.7, pos[4][1], pos[1][0] + bw * 0.4, pos[1][1] + bh, u);

    b.strokeStyle = "#d0142c";
    b.lineWidth = 2.4 * u;
    b.beginPath();
    b.ellipse(x + w * 0.87, y + h * 0.52, w * 0.1, h * 0.2, -0.2, 0, Math.PI * 2);
    b.stroke();
    b.fillStyle = "#d0142c";
    b.font = `700 ${Math.max(8, 14 * u)}px ${marker}`;
    b.fillText("WHY??", x + w * 0.87, y + h * 0.52);
  }

  function drawPoster(b) {
    const w = Math.min(W * 0.15, 170 * S);
    if (w < 90) return;
    const h = w * 1.3, x = W * 0.74, y = clamp(H * 0.28, 150, H * 0.5);
    b.fillStyle = "#1b1b1b";
    b.fillRect(x - 5, y - 5, w + 10, h + 10);
    const sky = b.createLinearGradient(0, y, 0, y + h * 0.72);
    sky.addColorStop(0, "#f6a04d");
    sky.addColorStop(1, "#6a3d8f");
    b.fillStyle = sky;
    b.fillRect(x, y, w, h * 0.72);
    b.fillStyle = "#2b2140";
    b.beginPath();
    b.moveTo(x, y + h * 0.72);
    b.lineTo(x + w * 0.33, y + h * 0.36);
    b.lineTo(x + w * 0.52, y + h * 0.54);
    b.lineTo(x + w * 0.74, y + h * 0.3);
    b.lineTo(x + w, y + h * 0.72);
    b.closePath();
    b.fill();
    b.fillStyle = "#0f0f12";
    b.fillRect(x, y + h * 0.72, w, h * 0.28);
    b.textAlign = "center";
    b.textBaseline = "middle";
    b.fillStyle = "#fff";
    b.font = `900 ${w * 0.15}px "Arial Black", Impact, sans-serif`;
    b.fillText("SYNERGY", x + w / 2, y + h * 0.81);
    b.fillStyle = "#bdbdbd";
    b.font = `italic ${w * 0.066}px Georgia, serif`;
    b.fillText("It has always been", x + w / 2, y + h * 0.9);
    b.fillText("done this way.", x + w / 2, y + h * 0.95);
  }

  /* ---------- Game state ---------- */
  function newGame(demo) {
    G = {
      demo, wave: 1, score: 0, soul: MAX_METER, goodwill: MAX_METER,
      combo: 0, bestCombo: 0, fixes: 0, complaints: 0, adopted: 0, clock: 9 * 60,
      memos: [], shots: [], parts: [], stamps: [], floats: [], boss: null,
      spawnLeft: 0, spawnT: 0, cfg: waveConfig(1), waveState: "idle", breakT: 0, reason: null,
      player: { x: W / 2, vx: 0, cool: 0, fireAnim: 0, hurt: 0, moving: false },
    };
    for (const c of coworkers) { c.bubble = null; c.react = 0; c.mood = "meh"; }
  }

  function waveConfig(n) {
    const fall = Math.max(3.6, 9.5 - n * 0.6);
    return {
      speed: (groundY + 60) / fall,
      interval: Math.max(0.55, 1.7 - n * 0.1),
      sensible: 0.3 + Math.min(0.15, n * 0.015),
      entrenched: n >= 3 ? Math.min(0.35, 0.08 + n * 0.03) : 0,
    };
  }

  function startWave(n) {
    G.wave = n;
    G.cfg = waveConfig(n);
    const isBoss = n % 4 === 0;
    G.spawnLeft = isBoss ? 0 : 7 + n * 2;
    G.spawnT = 0.8;
    G.waveState = "active";
    if (isBoss) {
      spawnBoss(n);
      showBanner("Performance review", "Defeat: The Way We've Always Done It");
    } else {
      showBanner(`Wave ${n}`, clockText());
    }
  }

  function waveClear() {
    const bonus = 250 * G.wave;
    addScore(bonus);
    showBanner("Wave cleared", `+${bonus} views`);
    play("wave");
    G.waveState = "break";
    G.breakT = 2.3;
  }

  function updateWave(dt) {
    if (G.waveState === "active") {
      if (G.spawnLeft > 0) {
        G.spawnT -= dt;
        if (G.spawnT <= 0) {
          spawnMemo();
          G.spawnLeft--;
          G.spawnT = G.cfg.interval * rand(0.7, 1.3);
        }
      } else if (!G.boss && G.memos.length === 0) {
        waveClear();
      }
    } else if (G.waveState === "break") {
      G.breakT -= dt;
      if (G.breakT <= 0) startWave(G.demo ? (G.wave >= 4 ? 2 : G.wave + 1) : G.wave + 1);
    }
  }

  function layoutMemo(m) {
    m.fs = Math.max(12, Math.round(15 * S));
    m.lh = Math.round(m.fs * 1.25);
    m.w = Math.max(150, Math.round(196 * S));
    m.font = `700 ${m.fs}px "Segoe UI", system-ui, -apple-system, Helvetica, Arial, sans-serif`;
    m.lines = wrap(m.text, m.w - 18 * (m.fs / 15), m.font);
    m.h = Math.round(m.fs * 1.65 + m.lines.length * m.lh + m.fs * 0.7);
  }

  function makeMemo(absurd, speed) {
    const m = {
      absurd, text: absurd ? nextAbsurd() : nextSensible(),
      header: `${pick(HEADERS)} #${100 + ((Math.random() * 899) | 0)}`,
      color: pick(PAPER), hp: 1, maxHp: 1, x: 0, baseX: 0, y: 0,
      vy: speed * rand(0.85, 1.15), t: 0, phase: rand(0, 6.28), swayF: rand(0.8, 1.6),
      sway: rand(4, 14) * S, rot: 0, flash: 0,
    };
    if (absurd && Math.random() < G.cfg.entrenched) { m.hp = m.maxHp = 2; m.vy *= 0.9; }
    layoutMemo(m);
    return m;
  }

  function spawnMemo() {
    const m = makeMemo(Math.random() > G.cfg.sensible, G.cfg.speed);
    const margin = 8 * S;
    let bestX = margin, bestGap = -1;
    for (let t = 0; t < 8; t++) {
      const x = rand(margin, Math.max(margin, W - m.w - margin));
      let gap = Infinity;
      for (const o of G.memos) if (o.y < m.h * 1.6) gap = Math.min(gap, Math.abs(o.baseX - x));
      if (gap > bestGap) { bestGap = gap; bestX = x; }
    }
    m.baseX = m.x = bestX;
    m.y = -m.h - 4;
    G.memos.push(m);
  }

  function spawnBoss(n) {
    const w = Math.min(W * 0.8, Math.max(260, 360 * S));
    const h = Math.max(120, 150 * S);
    const hp = 12 + n * 2;
    G.boss = {
      x: (W - w) / 2, y: -h - 10, w, h, ty: clamp(H * 0.14, 110, 170),
      hp, maxHp: hp, dir: Math.random() < 0.5 ? -1 : 1, fireT: 2.2, flash: 0,
      speed: (70 + n * 5) * S, taunt: 1.2, say: null,
    };
  }

  function updateBoss(dt) {
    const b = G.boss;
    if (!b) return;
    b.flash = Math.max(0, b.flash - dt);
    if (b.say) { b.say.life -= dt; if (b.say.life <= 0) b.say = null; }
    if (b.y < b.ty) { b.y = Math.min(b.ty, b.y + 160 * S * dt); return; }
    b.x += b.dir * b.speed * dt;
    if (b.x < 8) { b.x = 8; b.dir = 1; }
    if (b.x + b.w > W - 8) { b.x = W - 8 - b.w; b.dir = -1; }
    b.fireT -= dt;
    if (b.fireT <= 0) {
      b.fireT = Math.max(0.75, 1.7 - G.wave * 0.06) * rand(0.8, 1.2);
      const m = makeMemo(Math.random() > 0.3, G.cfg.speed * 1.05);
      m.baseX = m.x = clamp(b.x + rand(0, b.w - m.w), 8, Math.max(8, W - m.w - 8));
      m.y = b.y + b.h * 0.4;
      G.memos.push(m);
    }
    b.taunt -= dt;
    if (b.taunt <= 0) { b.taunt = rand(5, 8); b.say = { text: pick(QUIPS.boss), life: 2.6 }; }
  }

  function addScore(n) { if (!G.demo) G.score += n; }

  function say(c, text, mood) {
    c.bubble = { text, life: 2.8 };
    c.react = 1;
    c.mood = mood;
  }

  function shred(x, y, w, h, color, n) {
    for (let i = 0; i < n && G.parts.length < 400; i++) {
      G.parts.push({
        x: x + rand(0, w), y: y + rand(0, h), vx: rand(-260, 260) * S, vy: rand(-420, -80) * S,
        rot: rand(0, 6), vr: rand(-12, 12), w: rand(5, 12) * S, h: rand(3, 7) * S, color, life: rand(0.6, 1.2),
      });
    }
  }
  function stamp(x, y, text, color) { G.stamps.push({ x, y, text, color, life: 1.4, max: 1.4, rot: rand(-0.2, 0.2) }); }
  function floatText(x, y, text, color) { G.floats.push({ x, y, text, color, life: 1.1 }); }

  function removeMemo(m) {
    const i = G.memos.indexOf(m);
    if (i >= 0) G.memos.splice(i, 1);
  }

  function questionMemo(m) {
    const cx = m.x + m.w / 2, cy = m.y + m.h / 2;
    if (m.absurd) {
      if (m.hp > 1) {
        m.hp--;
        m.flash = 0.18;
        m.vy *= 0.85;
        shred(m.x, m.y, m.w, m.h, m.color, 6);
        floatText(cx, m.y, "STILL ENTRENCHED", "#b3261e");
        addScore(20);
        play("thunk");
        return;
      }
      removeMemo(m);
      shred(m.x, m.y, m.w, m.h, m.color, 22);
      const mult = Math.min(5, 1 + Math.floor(G.combo / 4));
      const pts = 100 * mult;
      addScore(pts);
      if (!G.demo) {
        G.combo++;
        G.bestCombo = Math.max(G.bestCombo, G.combo);
        G.fixes++;
      }
      floatText(cx, cy, mult > 1 ? `+${pts}  x${mult}` : `+${pts}`, "#0f7b3f");
      if (Math.random() < 0.35) say(pick(coworkers), pick(QUIPS.right), "happy");
      play("rip");
    } else {
      removeMemo(m);
      stamp(cx, cy, "NOTED BY HR", "#e07a00");
      say(pick(coworkers), pick(QUIPS.wrong), "annoyed");
      play("buzz");
      if (!G.demo) {
        G.goodwill--;
        G.complaints++;
        G.combo = 0;
        G.player.hurt = 0.7;
        shake = Math.max(shake, 9);
        flash = 0.45;
        flashColor = "255,150,0";
        if (G.goodwill <= 0) gameOver("goodwill");
      }
    }
  }

  function landMemo(m) {
    const cx = m.x + m.w / 2;
    if (m.absurd) {
      stamp(cx, groundY - 50 * S, "ADOPTED", "#d0142c");
      say(pick(coworkers), pick(QUIPS.adopted), "meh");
      play("stamp");
      if (!G.demo) {
        G.soul--;
        G.adopted++;
        G.combo = 0;
        G.player.hurt = 0.7;
        shake = Math.max(shake, 12);
        flash = 0.55;
        flashColor = "200,20,40";
        if (G.soul <= 0) gameOver("soul");
      }
    } else {
      addScore(50);
      floatText(cx, groundY - 40 * S, "+50 FILED", "#1d6fb8");
      play("file");
    }
  }

  function hitBoss(x, y) {
    const b = G.boss;
    b.hp--;
    b.flash = 0.1;
    addScore(15);
    shred(x - 10, y - 10, 20, 10, "#f3efe2", 4);
    play("thunk");
    if (b.hp > 0) return;
    shred(b.x, b.y, b.w, b.h, "#23315c", 40);
    shred(b.x, b.y, b.w, b.h, "#f3efe2", 40);
    stamp(b.x + b.w / 2, b.y + b.h / 2, "DEPRECATED", "#0f7b3f");
    addScore(2500);
    floatText(b.x + b.w / 2, b.y + b.h + 20 * S, "+2500  +1 SOUL", "#0f7b3f");
    if (!G.demo) G.soul = Math.min(MAX_METER, G.soul + 1);
    for (const c of coworkers) say(c, pick(QUIPS.bossDown), "happy");
    shake = Math.max(shake, 16);
    G.boss = null;
    play("win");
  }

  function shoot() {
    const p = G.player;
    p.cool = 0.24;
    p.fireAnim = 0.18;
    G.shots.push({ x: p.x + 16 * S, y: groundY - 112 * S, vy: -760 * S, wob: rand(0, 6) });
    play("shoot");
  }

  function firstInColumn(x) {
    const topY = groundY - 112 * S;
    let found = null;
    for (const m of G.memos) {
      if (x >= m.x - 6 && x <= m.x + m.w + 6 && m.y < topY && (!found || m.y + m.h > found.y + found.h)) found = m;
    }
    if (found) return found;
    const b = G.boss;
    if (b && b.y >= b.ty && x >= b.x && x <= b.x + b.w) return b;
    return null;
  }

  function demoControl(dt) {
    const p = G.player;
    let target = null;
    for (const m of G.memos) if (m.absurd && m.y > 0 && (!target || m.y > target.y)) target = m;
    let tx;
    if (target) tx = target.x + target.w / 2 - 16 * S;
    else if (G.boss) tx = G.boss.x + G.boss.w / 2 + Math.sin(time * 1.3) * G.boss.w * 0.3;
    else tx = W / 2 + Math.sin(time * 0.7) * W * 0.25;
    const maxV = 460 * S;
    p.vx = clamp((tx - p.x) * 5, -maxV, maxV);
    p.x = clamp(p.x + p.vx * dt, 28 * S, W - 28 * S);
    const first = firstInColumn(p.x + 16 * S);
    return !!first && (first === G.boss || first.absurd);
  }

  function fireInput() { return keys.fire || pointerDown; }

  function updatePlayer(dt) {
    const p = G.player;
    p.cool -= dt;
    p.fireAnim = Math.max(0, p.fireAnim - dt);
    p.hurt = Math.max(0, p.hurt - dt);
    if (mode === "over") { p.moving = false; return; }
    let want;
    if (G.demo) {
      want = demoControl(dt);
    } else {
      const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const maxV = 620 * S;
      if (dir) { p.vx = dir * maxV; usePointer = false; }
      else if (usePointer && pointerX !== null) p.vx = clamp((pointerX - p.x) * 14, -maxV * 1.8, maxV * 1.8);
      else p.vx = 0;
      p.x = clamp(p.x + p.vx * dt, 28 * S, W - 28 * S);
      want = mode === "play" && fireInput() && !fireLock;
    }
    p.moving = Math.abs(p.vx) > 30 * S;
    if (want && p.cool <= 0) shoot();
  }

  function updateMemos(dt) {
    const adoptY = groundY - 6 * S;
    for (let i = G.memos.length - 1; i >= 0; i--) {
      const m = G.memos[i];
      m.t += dt;
      m.y += m.vy * dt;
      m.x = clamp(m.baseX + Math.sin(m.t * m.swayF + m.phase) * m.sway, 6, Math.max(6, W - m.w - 6));
      m.rot = Math.sin(m.t * m.swayF * 0.8 + m.phase) * 0.05;
      m.flash = Math.max(0, m.flash - dt);
      if (m.y + m.h >= adoptY) {
        G.memos.splice(i, 1);
        landMemo(m);
        if (mode === "over") return;
      }
    }
  }

  function updateShots(dt, live) {
    const rx = 22 * S, ry = 14 * S;
    for (let i = G.shots.length - 1; i >= 0; i--) {
      const s = G.shots[i];
      s.y += s.vy * dt;
      if (s.y < -40 * S) { G.shots.splice(i, 1); continue; }
      if (!live) continue;
      let hit = null;
      for (const m of G.memos) {
        if (s.x + rx > m.x && s.x - rx < m.x + m.w && s.y - ry < m.y + m.h && s.y + ry > m.y) { hit = m; break; }
      }
      if (hit) { G.shots.splice(i, 1); questionMemo(hit); if (mode === "over") return; continue; }
      const b = G.boss;
      if (b && s.x > b.x && s.x < b.x + b.w && s.y - ry < b.y + b.h && s.y > b.y) {
        G.shots.splice(i, 1);
        hitBoss(s.x, s.y);
      }
    }
  }

  function updateFx(dt) {
    for (let i = G.parts.length - 1; i >= 0; i--) {
      const p = G.parts[i];
      p.vy += 900 * S * dt;
      p.vx *= 0.99;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life -= dt;
      if (p.life <= 0 || p.y > H + 20) G.parts.splice(i, 1);
    }
    for (let i = G.stamps.length - 1; i >= 0; i--) if ((G.stamps[i].life -= dt) <= 0) G.stamps.splice(i, 1);
    for (let i = G.floats.length - 1; i >= 0; i--) {
      const f = G.floats[i];
      f.y -= 46 * S * dt;
      if ((f.life -= dt) <= 0) G.floats.splice(i, 1);
    }
    for (const c of coworkers) {
      c.react = Math.max(0, c.react - dt);
      if (c.bubble && (c.bubble.life -= dt) <= 0) c.bubble = null;
    }
  }

  function step(dt) {
    time += dt;
    if (mode === "paused") return;
    shake = Math.max(0, shake - dt * 30);
    flash = Math.max(0, flash - dt * 1.6);

    if (mode === "intro") {
      introT -= dt;
      if (introT <= 0 || (fireInput() && !fireLock && introT < 3.2)) beginPlay();
    }
    if (mode === "over") {
      overT -= dt;
      if (overT <= 0 && ui.over.hidden) showOver();
    }

    const live = mode === "play" || mode === "attract";
    if (live) G.clock += dt * 1.25;
    updatePlayer(dt);
    if (live) { updateWave(dt); updateBoss(dt); updateMemos(dt); }
    updateShots(dt, live && mode !== "over");
    updateFx(dt);
    if (!fireInput()) fireLock = false;
  }

  /* ---------- Rendering ---------- */
  function drawClock() {
    const cx = W * 0.5, cy = clamp(H * 0.2, 120, 230), r = Math.max(18, 26 * S);
    ctx.fillStyle = "#2b2f36"; circ(cx, cy, r + 3 * S);
    ctx.fillStyle = "#fbfaf5"; circ(cx, cy, r);
    ctx.strokeStyle = "#2b2f36";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      line(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8, cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92);
    }
    const mins = G.clock % 60, hrs = (G.clock / 60) % 12;
    const ma = (mins / 60) * Math.PI * 2 - Math.PI / 2;
    const ha = (hrs / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.lineCap = "round";
    ctx.lineWidth = 3 * S;
    line(cx, cy, cx + Math.cos(ha) * r * 0.5, cy + Math.sin(ha) * r * 0.5);
    ctx.lineWidth = 2 * S;
    line(cx, cy, cx + Math.cos(ma) * r * 0.78, cy + Math.sin(ma) * r * 0.78);
    ctx.fillStyle = "#d0142c"; circ(cx, cy, 2.2 * S);
  }

  function drawFlicker() {
    const f = Math.sin(time * 23.1) * Math.sin(time * 7.7) * Math.sin(time * 1.3);
    if (f > 0.55) {
      ctx.fillStyle = "rgba(60,60,50,0.55)";
      ctx.fillRect(360 * S, 5 * S, 150 * S, 16 * S);
    }
  }

  function cubicleGeom() { return { cw: Math.min(W * 0.17, 200 * S), top: groundY - 112 * S }; }

  function drawCoworker(c, x, y, k) {
    const annoy = clamp((G.demo ? 0 : (MAX_METER - G.goodwill) / MAX_METER) + (c.mood === "annoyed" ? c.react : 0), 0, 1.3);
    const happy = c.mood === "happy" && c.react > 0;
    const bob = Math.sin(time * 2 + c.side) * 2 * k - (c.react > 0 ? Math.abs(Math.sin(c.react * 9)) * 4 * k : 0);
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = c.shirt;
    rr(ctx, -30 * k, 16 * k, 60 * k, 40 * k, 14 * k);
    ctx.fill();
    if (c.side < 0) {
      ctx.fillStyle = "#e2b48f"; circ(0, 0, 22 * k);
      ctx.fillStyle = "#b8b4ac"; ell(-19 * k, 3 * k, 5 * k, 10 * k); ell(19 * k, 3 * k, 5 * k, 10 * k);
      ctx.fillStyle = "rgba(255,255,255,0.35)"; ell(-6 * k, -13 * k, 6 * k, 3 * k);
    } else {
      ctx.fillStyle = "#3b2a20"; circ(0, -24 * k, 10 * k); ell(0, -4 * k, 24 * k, 21 * k);
      ctx.fillStyle = "#c98d66"; circ(0, 3 * k, 19 * k);
      ctx.fillStyle = "#3b2a20";
      ctx.beginPath(); ctx.ellipse(0, -8 * k, 20 * k, 10 * k, 0, Math.PI, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#1b1b1b"; circ(-8.5 * k, 1 * k, 1.8 * k); circ(8.5 * k, 1 * k, 1.8 * k);
    ctx.lineWidth = 1.8 * k;
    ctx.strokeStyle = c.side < 0 ? "#2a2a2a" : "#b3261e";
    if (c.side < 0) {
      ctx.strokeRect(-14 * k, -3 * k, 11 * k, 8 * k);
      ctx.strokeRect(3 * k, -3 * k, 11 * k, 8 * k);
      line(-3 * k, 0, 3 * k, 0);
    } else {
      ctx.beginPath(); ctx.arc(-8.5 * k, 1 * k, 6 * k, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(8.5 * k, 1 * k, 6 * k, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = "#3a2e26";
    ctx.lineWidth = 2.4 * k;
    ctx.lineCap = "round";
    const a = annoy * 4 * k;
    line(-14 * k, -8 * k, -4 * k, -8 * k + a);
    line(14 * k, -8 * k, 4 * k, -8 * k + a);
    if (c.side < 0) { ctx.fillStyle = "#6b4a33"; ell(0, 10 * k, 9 * k, 3.5 * k); }
    ctx.strokeStyle = "#5a2a22";
    ctx.lineWidth = 1.8 * k;
    const my = c.side < 0 ? 15 * k : 12 * k;
    ctx.beginPath();
    if (happy) ctx.arc(0, my - 4 * k, 5 * k, 0.2 * Math.PI, 0.8 * Math.PI);
    else if (annoy > 0.6) ctx.arc(0, my + 4 * k, 5 * k, 1.2 * Math.PI, 1.8 * Math.PI);
    else { ctx.moveTo(-4 * k, my); ctx.lineTo(4 * k, my); }
    ctx.stroke();
    ctx.restore();
  }

  function drawCubicles() {
    const { cw, top } = cubicleGeom();
    for (const c of coworkers) {
      const hx = c.side < 0 ? cw * 0.5 : W - cw * 0.5;
      drawCoworker(c, hx, top - 14 * S, S);
    }
    for (const c of coworkers) {
      const x0 = c.side < 0 ? 0 : W - cw;
      ctx.fillStyle = "#6c7c8c";
      ctx.fillRect(x0, top, cw, groundY - top);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      for (let x = x0 + 4; x < x0 + cw; x += 7 * S) ctx.fillRect(x, top, 1, groundY - top);
      ctx.fillStyle = "#bdb9ae";
      ctx.fillRect(x0, top - 5 * S, cw, 7 * S);
      const pw = Math.min(cw * 0.7, 80 * S), ph = 16 * S, px = x0 + (cw - pw) / 2, py = top + 22 * S;
      ctx.fillStyle = "#d9d4c3";
      ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = "#2b2f36";
      ctx.font = `700 ${Math.max(8, 10 * S)}px Consolas, "Courier New", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(c.name, px + pw / 2, py + ph / 2 + 1);
    }
  }

  function drawMemo(m) {
    const k = m.fs / 15;
    ctx.save();
    ctx.translate(m.x + m.w / 2, m.y + m.h / 2);
    ctx.rotate(m.rot);
    const x = -m.w / 2, y = -m.h / 2;
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(x + 4 * k, y + 6 * k, m.w, m.h);
    ctx.fillStyle = m.color;
    ctx.fillRect(x, y, m.w, m.h);
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.fillRect(x, y, m.w, m.fs * 1.35);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#6d6655";
    ctx.font = `700 ${Math.round(10 * k)}px Consolas, "Courier New", monospace`;
    ctx.fillText(m.header, x + 9 * k, y + m.fs * 0.7);
    ctx.fillStyle = "#1c1b19";
    ctx.font = m.font;
    ctx.textBaseline = "top";
    for (let i = 0; i < m.lines.length; i++) ctx.fillText(m.lines[i], x + 9 * k, y + m.fs * 1.65 + i * m.lh);
    if (m.maxHp > 1) {
      ctx.strokeStyle = "#8b1a1a";
      ctx.lineWidth = 2 * k;
      ctx.strokeRect(x + 1, y + 1, m.w - 2, m.h - 2);
      ctx.fillStyle = "#9aa0a6";
      ctx.fillRect(x + m.w * 0.18, y - 2 * k, 14 * k, 3 * k);
      ctx.fillRect(x + m.w * 0.72, y - 2 * k, 14 * k, 3 * k);
      ctx.font = `900 ${Math.round(8.5 * k)}px "Arial Black", Impact, sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const tw = ctx.measureText("ENTRENCHED").width;
      ctx.strokeStyle = "#c21d1d";
      ctx.lineWidth = 1.2 * k;
      ctx.strokeRect(x + m.w - tw - 13 * k, y + m.fs * 0.7 - 6 * k, tw + 8 * k, 12 * k);
      ctx.fillStyle = "#c21d1d";
      ctx.fillText("ENTRENCHED", x + m.w - 9 * k, y + m.fs * 0.7 + 0.5);
      if (m.hp < m.maxHp) {
        ctx.strokeStyle = "rgba(60,20,20,0.6)";
        ctx.lineWidth = 1.5 * k;
        ctx.beginPath();
        ctx.moveTo(x + m.w * 0.3, y);
        ctx.lineTo(x + m.w * 0.42, y + m.h * 0.35);
        ctx.lineTo(x + m.w * 0.34, y + m.h * 0.6);
        ctx.lineTo(x + m.w * 0.5, y + m.h);
        ctx.stroke();
      }
    }
    if (m.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.8, m.flash * 4)})`;
      ctx.fillRect(x, y, m.w, m.h);
    }
    ctx.restore();
  }

  function drawBoss(b) {
    const k = b.h / 150;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    rr(ctx, 6 * k, 10 * k, b.w, b.h, 10 * k); ctx.fill();
    ctx.fillStyle = b.flash > 0 ? "#5a6fa8" : "#23315c";
    rr(ctx, 0, 0, b.w, b.h, 10 * k); ctx.fill();
    ctx.fillStyle = "#1a2445";
    rr(ctx, 0, 0, 36 * k, b.h, 10 * k); ctx.fill();
    ctx.fillStyle = "#c9ccd3";
    for (let i = 0; i < 3; i++) { rr(ctx, 24 * k, b.h * (0.2 + i * 0.3) - 6 * k, 22 * k, 12 * k, 6 * k); ctx.fill(); }
    ctx.fillStyle = "#f3efe2";
    ctx.fillRect(44 * k, b.h - 10 * k, b.w - 54 * k, 7 * k);
    const lx = 54 * k, ly = 14 * k, lw = b.w - 68 * k, lh = b.h * 0.5;
    ctx.fillStyle = "#f6f1de";
    ctx.fillRect(lx, ly, lw, lh);
    ctx.fillStyle = "#1d1c1a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fs = Math.min(lh * 0.3, lw / 9);
    ctx.font = `900 ${fs}px "Arial Black", Impact, sans-serif`;
    ctx.fillText("THE WAY WE'VE", lx + lw / 2, ly + lh * 0.3);
    ctx.fillText("ALWAYS DONE IT", lx + lw / 2, ly + lh * 0.62);
    ctx.fillStyle = "#6d6655";
    ctx.font = `700 ${fs * 0.42}px Consolas, "Courier New", monospace`;
    ctx.fillText("EST. 1987 · DO NOT QUESTION", lx + lw / 2, ly + lh * 0.88);
    const ey = ly + lh + (b.h - 10 * k - (ly + lh)) / 2;
    const look = clamp((G.player.x - (b.x + b.w / 2)) / 300, -1, 1) * 5 * k;
    for (const ex of [lx + lw * 0.38, lx + lw * 0.62]) {
      ctx.fillStyle = "#fff"; ell(ex, ey, 13 * k, 8 * k);
      ctx.fillStyle = "#111"; circ(ex + look, ey + 1.5 * k, 4 * k);
    }
    ctx.strokeStyle = "#0b1022";
    ctx.lineWidth = 4 * k;
    ctx.lineCap = "round";
    line(lx + lw * 0.38 - 14 * k, ey - 14 * k, lx + lw * 0.38 + 10 * k, ey - 8 * k);
    line(lx + lw * 0.62 + 14 * k, ey - 14 * k, lx + lw * 0.62 - 10 * k, ey - 8 * k);
    ctx.restore();

    const bw = b.w * 0.7, bx = b.x + (b.w - bw) / 2, by = b.y + b.h + 10 * S;
    ctx.fillStyle = "rgba(15,20,25,0.45)";
    rr(ctx, bx, by, bw, 8 * S, 4 * S); ctx.fill();
    ctx.fillStyle = "#e3264b";
    rr(ctx, bx, by, Math.max(8 * S, bw * (b.hp / b.maxHp)), 8 * S, 4 * S); ctx.fill();
  }

  function drawShot(s) {
    const w = 58 * S, h = 28 * S;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(Math.sin(time * 18 + s.wob) * 0.06);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#1b1b1f";
    ctx.lineWidth = 2 * S;
    rr(ctx, -w / 2, -h / 2, w, h, 10 * S);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w * 0.2, h / 2 - 1);
    ctx.lineTo(-w * 0.32, h / 2 + 9 * S);
    ctx.lineTo(-w * 0.02, h / 2 - 1);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fillRect(-w * 0.19, h / 2 - 3 * S, w * 0.16, 3 * S);
    ctx.fillStyle = "#d61f45";
    ctx.font = `900 ${Math.round(14 * S)}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("WHY?", 0, 1);
    ctx.restore();
  }

  function drawPlayer() {
    const p = G.player;
    const st = p.moving ? Math.sin(time * 16) : 0;
    const raise = p.fireAnim > 0;
    ctx.save();
    ctx.translate(p.x, groundY);
    ctx.scale(S, S);
    ctx.fillStyle = "rgba(0,0,0,0.28)"; ell(0, 0, 26, 6);
    ctx.fillStyle = "#23232b";
    ctx.fillRect(-11 + st * 2, -38, 9, 36);
    ctx.fillRect(2 - st * 2, -38, 9, 36);
    ctx.fillStyle = "#101014"; ell(-7 + st * 2, -2, 7, 4); ell(7 - st * 2, -2, 7, 4);
    ctx.lineCap = "round";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#f0c3a4";
    line(-15, -74, -21 - st, -44);
    if (raise) line(15, -74, 16, -108); else line(15, -74, 21 + st, -44);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "rgba(60,50,90,0.6)";
    line(-17, -67, -19, -59);
    line(-19, -55, -20, -50);
    ctx.fillStyle = "#16161b";
    ctx.beginPath();
    ctx.moveTo(-15, -78); ctx.lineTo(15, -78); ctx.lineTo(13, -36); ctx.lineTo(-13, -36);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f0c3a4";
    ctx.beginPath(); ctx.moveTo(-7, -78); ctx.lineTo(7, -78); ctx.lineTo(0, -69); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e3264b";
    ell(0, -96, 19, 19); ell(-13, -84, 7, 10); ell(13, -84, 7, 10);
    ctx.fillStyle = "#f0c3a4";
    ctx.fillRect(-4, -84, 8, 7);
    circ(0, -94, 13.5);
    ctx.fillStyle = "#9aa3ad";
    for (let i = -3; i <= 3; i++) circ(i * 2.5, -74.5 - i * i * 0.3, 1.2);
    ctx.fillStyle = "#e3264b";
    ctx.beginPath(); ctx.ellipse(0, -102, 16, 9, 0, Math.PI, Math.PI * 2); ctx.fill();
    ell(-9, -100, 7, 4.5); ell(6, -101, 9, 4.5);
    ctx.fillStyle = "#7a1430"; ell(-2, -108, 6, 2.4);
    ctx.fillStyle = "#1b1b1b"; circ(-5, -94, 1.7); circ(5, -94, 1.7);
    ctx.fillStyle = "rgba(240,110,120,0.35)"; circ(-8, -89, 2.6); circ(8, -89, 2.6);
    ctx.strokeStyle = "#7a2d2d";
    ctx.lineWidth = 1.6;
    if (p.hurt > 0) {
      line(-4, -87, 4, -88.5);
    } else if (raise) {
      ctx.fillStyle = "#7a2d2d"; ell(0, -88, 2.8, 2.4);
    } else {
      ctx.beginPath(); ctx.arc(0, -90, 4.5, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBubble(text, ax, ay, below) {
    const fs = Math.max(12, Math.round(13 * S));
    const font = `600 ${fs}px "Segoe UI", system-ui, sans-serif`;
    const lines = wrap(text, Math.min(220 * S, W * 0.42), font);
    const pad = 8 * S, lh = fs * 1.25;
    let bw = 0;
    for (const l of lines) bw = Math.max(bw, ctx.measureText(l).width);
    bw += pad * 2;
    const bh = lines.length * lh + pad * 2;
    const bx = clamp(ax - bw / 2, 8, W - bw - 8);
    const by = below ? ay + 10 * S : ay - bh - 10 * S;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#1b1b1f";
    ctx.lineWidth = 1.5;
    rr(ctx, bx, by, bw, bh, 10 * S);
    ctx.fill(); ctx.stroke();
    const tx = clamp(ax, bx + 14 * S, bx + bw - 14 * S);
    const edge = below ? by : by + bh;
    ctx.beginPath();
    ctx.moveTo(tx - 6 * S, edge);
    ctx.lineTo(ax, below ? edge - 9 * S : edge + 9 * S);
    ctx.lineTo(tx + 6 * S, edge);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillRect(tx - 5 * S, below ? edge : edge - 2, 10 * S, 2);
    ctx.fillStyle = "#0f1419";
    ctx.font = font;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    lines.forEach((l, i) => ctx.fillText(l, bx + pad, by + pad + i * lh));
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawClock();
    drawFlicker();

    ctx.save();
    if (shake > 0) ctx.translate(rand(-shake, shake) * S, rand(-shake, shake) * S);
    drawCubicles();
    for (const m of G.memos) drawMemo(m);
    if (G.boss) drawBoss(G.boss);
    for (const s of G.shots) drawShot(s);
    drawPlayer();

    for (const p of G.parts) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 1;
      ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    for (const s of G.stamps) {
      const age = s.max - s.life;
      const sc = age < 0.12 ? 1.8 - (age / 0.12) * 0.8 : 1;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.scale(sc, sc);
      ctx.globalAlpha = (s.life < 0.4 ? s.life / 0.4 : 1) * 0.9;
      ctx.font = `900 ${Math.max(18, Math.round(28 * S))}px "Arial Black", Impact, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const tw = ctx.measureText(s.text).width, th = Math.max(18, 28 * S);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 3.5 * S;
      ctx.strokeRect(-tw / 2 - 10 * S, -th / 2 - 6 * S, tw + 20 * S, th + 12 * S);
      ctx.fillStyle = s.color;
      ctx.fillText(s.text, 0, 1);
      ctx.restore();
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${Math.max(14, Math.round(18 * S))}px "Segoe UI", system-ui, sans-serif`;
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    for (const f of G.floats) {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.strokeStyle = "#fff";
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    const { cw, top } = cubicleGeom();
    for (const c of coworkers) {
      if (!c.bubble) continue;
      const hx = c.side < 0 ? cw * 0.5 : W - cw * 0.5;
      drawBubble(c.bubble.text, hx, top - 44 * S, false);
    }
    if (G.boss && G.boss.say) drawBubble(G.boss.say.text, G.boss.x + G.boss.w * 0.5, G.boss.y + G.boss.h + 20 * S, true);
    ctx.restore();

    if (flash > 0) {
      ctx.fillStyle = `rgba(${flashColor},${flash * 0.35})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (!G.demo && mode === "play" && G.soul <= 1) {
      const a = 0.25 + Math.sin(time * 6) * 0.12;
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, "rgba(120,0,20,0)");
      v.addColorStop(1, `rgba(120,0,20,${a})`);
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------- HUD ---------- */
  function fmt(n) {
    if (n < 1000) return String(n);
    if (n < 1e6) return (n / 1000).toFixed(n < 1e4 ? 1 : 0).replace(/\.0$/, "") + "K";
    return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  }
  function clockText() {
    const total = Math.floor(G.clock);
    const h24 = Math.floor(total / 60) % 24, m = total % 60;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
  }

  function buildPips(el) {
    for (let i = 0; i < MAX_METER; i++) el.appendChild(document.createElement("i"));
  }
  buildPips(ui.soul);
  buildPips(ui.goodwill);

  const hudCache = {};
  function setText(el, key, val) {
    if (hudCache[key] !== val) { hudCache[key] = val; el.textContent = val; }
  }
  function setPips(el, key, n) {
    if (hudCache[key] === n) return;
    hudCache[key] = n;
    [...el.children].forEach((p, i) => p.classList.toggle("on", i < n));
    el.classList.toggle("low", n <= 1);
  }
  function updateHud() {
    if (G.demo) return;
    const mult = Math.min(5, 1 + Math.floor(G.combo / 4));
    setText(ui.clock, "clock", clockText());
    setText(ui.wave, "wave", `Wave ${G.wave}`);
    setText(ui.views, "views", fmt(G.score));
    setText(ui.complaints, "complaints", String(G.complaints));
    setText(ui.combo, "combo", mult > 1 ? `${G.combo} ×${mult}` : String(G.combo));
    setText(ui.fixed, "fixed", String(G.fixes));
    ui.comboWrap.classList.toggle("hot", mult > 1);
    setPips(ui.soul, "soul", G.soul);
    setPips(ui.goodwill, "goodwill", G.goodwill);
  }

  function showBanner(title, sub) {
    if (G.demo) return;
    ui.banner.querySelector("strong").textContent = title;
    ui.banner.querySelector("span").textContent = sub || "";
    ui.banner.classList.remove("show");
    void ui.banner.offsetWidth;
    ui.banner.classList.add("show");
  }

  /* ---------- Flow ---------- */
  function hideScreens() {
    ui.attract.hidden = ui.intro.hidden = ui.pause.hidden = ui.over.hidden = true;
  }

  function toTitle() {
    newGame(true);
    startWave(2);
    mode = "attract";
    hideScreens();
    ui.attract.hidden = false;
    ui.hud.hidden = true;
    ui.banner.classList.remove("show");
    ui.best.textContent = fmt(best);
  }

  function startGame() {
    if (mode !== "attract" && !(mode === "over" && time > overReady)) return;
    audioInit();
    newGame(false);
    mode = "intro";
    introT = 3.6;
    hideScreens();
    ui.intro.hidden = false;
    ui.introBar.style.animation = "none";
    void ui.introBar.offsetWidth;
    ui.introBar.style.animation = "";
    ui.hud.hidden = false;
    fireLock = true;
    for (const k in hudCache) delete hudCache[k];
    updateHud();
  }

  function beginPlay() {
    mode = "play";
    ui.intro.hidden = true;
    startWave(1);
  }

  function togglePause() {
    if (mode === "play") { mode = "paused"; ui.pause.hidden = false; ui.resume.focus(); }
    else if (mode === "paused") { mode = "play"; ui.pause.hidden = true; ui.resume.blur(); fireLock = true; }
  }

  function gameOver(reason) {
    if (mode !== "play") return;
    mode = "over";
    G.reason = reason;
    overT = 1.2;
    overReady = Infinity;
    if (G.score > best) {
      G.newBest = true;
      best = G.score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* storage unavailable */ }
    }
    sfx.over();
  }

  function showOver() {
    const d = new Date();
    const date = `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
    ui.overKicker.textContent = `${clockText()} · Wave ${G.wave} · Performance review`;
    if (G.reason === "soul") {
      ui.overTitle.textContent = "You now do it this way.";
      ui.overReason.textContent = `Nonsense became policy ${G.adopted} times. You've started saying "per my last email."`;
    } else {
      ui.overTitle.textContent = "HR would like a word.";
      ui.overReason.textContent = `You questioned ${G.complaints} perfectly sensible rules. Some of them were there for a reason.`;
    }
    ui.overTime.textContent = `${clockText()} · ${date}`;
    ui.overViews.textContent = fmt(G.score);
    ui.overComplaints.textContent = String(G.complaints);
    ui.overCombo.textContent = String(G.bestCombo);
    ui.overFixed.textContent = String(G.fixes);
    ui.overAdopted.textContent = String(G.adopted);
    ui.overBest.textContent = G.newBest ? "New personal best!" : `Best shift: ${fmt(best)} views`;
    ui.hud.hidden = true;
    ui.over.hidden = false;
    overReady = time + 0.7;
    ui.restart.focus();
  }

  /* ---------- Input ---------- */
  window.addEventListener("keydown", (e) => {
    const c = e.code;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(c)) e.preventDefault();
    if (c === "ArrowLeft" || c === "KeyA") keys.left = true;
    if (c === "ArrowRight" || c === "KeyD") keys.right = true;
    if (FIRE_CODES.has(c)) keys.fire = true;
    if (e.repeat) return;
    if (c === "KeyM") {
      muted = !muted;
      if (mode === "play") showBanner(muted ? "Sound off" : "Sound on", "");
    }
    if (mode === "attract" && (c === "Enter" || c === "Space")) startGame();
    else if (mode === "over" && (c === "Enter" || c === "Space")) startGame();
    else if (mode === "over" && c === "Escape" && time > overReady) toTitle();
    else if ((mode === "play" || mode === "paused") && (c === "KeyP" || c === "Escape")) togglePause();
  });
  window.addEventListener("keyup", (e) => {
    const c = e.code;
    if (c === "ArrowLeft" || c === "KeyA") keys.left = false;
    if (c === "ArrowRight" || c === "KeyD") keys.right = false;
    if (FIRE_CODES.has(c)) keys.fire = false;
  });

  window.addEventListener("pointermove", (e) => { pointerX = e.clientX; usePointer = true; });
  window.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a, button")) return;
    audioInit();
    if (mode === "attract") { startGame(); return; }
    if (mode === "play" || mode === "intro") {
      pointerDown = true;
      pointerX = e.clientX;
      usePointer = true;
    }
  });
  const release = () => { pointerDown = false; };
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  window.addEventListener("blur", () => {
    keys.left = keys.right = keys.fire = false;
    pointerDown = false;
    if (mode === "play") togglePause();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && mode === "play") togglePause(); });

  ui.start.addEventListener("click", () => { startGame(); ui.start.blur(); });
  ui.resume.addEventListener("click", togglePause);
  ui.restart.addEventListener("click", () => { startGame(); ui.restart.blur(); });
  ui.toTitle.addEventListener("click", () => { if (time > overReady) toTitle(); ui.toTitle.blur(); });
  window.addEventListener("resize", resize);

  /* ---------- Boot ---------- */
  resize();
  toTitle();
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    render();
    updateHud();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
