// game.js — GET IN LOSER, WE'RE GOING HEXING
// A pixel-art night-drive hex-'em-up. Three witches, one black convertible, four stages, four bosses.
(function () {
  'use strict';
  const { S, drawText, textWidth } = window.PX;
  const A = window.AUDIO;

  // ---------------------------------------------------------------- DISPLAY
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  let W = 320, H = 180, SCALE = 3;
  let ROAD_X = 100, ROAD_W = 120;
  let SAFE = { t: 0, b: 0, l: 0, r: 0 };

  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    SCALE = Math.max(2, Math.floor(Math.min(vh / 215, vw / 150)));
    W = Math.ceil(vw / SCALE); H = Math.ceil(vh / SCALE);
    canvas.width = W; canvas.height = H;
    canvas.style.width = (W * SCALE) + 'px';
    canvas.style.height = (H * SCALE) + 'px';
    ctx.imageSmoothingEnabled = false;
    ROAD_W = Math.max(104, Math.min(168, Math.round(W * 0.42)));
    ROAD_X = Math.floor((W - ROAD_W) / 2);
    const cs = getComputedStyle(document.body);
    SAFE = {
      t: Math.ceil(parseFloat(cs.paddingTop || '0') / SCALE),
      b: Math.ceil(parseFloat(cs.paddingBottom || '0') / SCALE),
      l: Math.ceil(parseFloat(cs.paddingLeft || '0') / SCALE),
      r: Math.ceil(parseFloat(cs.paddingRight || '0') / SCALE)
    };
    if (G.player) {
      G.player.x = clamp(G.player.x, ROAD_X + 10, ROAD_X + ROAD_W - 10);
      G.player.y = clamp(G.player.y, playerYMin(), playerYMax());
    }
  }
  window.addEventListener('resize', resize);

  // ---------------------------------------------------------------- UTIL
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rndi = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  function weighted(table) {
    let total = 0; for (const e of table) total += e[1];
    let r = Math.random() * total;
    for (const e of table) { r -= e[1]; if (r <= 0) return e[0]; }
    return table[table.length - 1][0];
  }
  function blit(img, x, y) { ctx.drawImage(img, Math.round(x), Math.round(y)); }
  function blitC(img, cx, cy) { ctx.drawImage(img, Math.round(cx - img.width / 2), Math.round(cy - img.height / 2)); }
  function blitScaled(img, x, y, s) { ctx.drawImage(img, Math.round(x), Math.round(y), img.width * s, img.height * s); }
  const silCache = new Map();
  function sil(img) { let s = silCache.get(img); if (!s) { s = window.PX.silhouette(img); silCache.set(img, s); } return s; }
  function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh;
  }
  function fmt(n, d) { let s = String(Math.floor(n)); while (s.length < (d || 6)) s = '0' + s; return s; }
  // Pixel-stepped circle of light.
  function glow(cx, cy, r, color, alpha) {
    ctx.globalAlpha = alpha; ctx.fillStyle = color;
    cx = Math.round(cx); cy = Math.round(cy);
    for (let dy = -r; dy <= r; dy++) {
      const hw = Math.round(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- DATA
  const HAIR = ['b', 'n', 'h']; // seat 0 driver (blonde), 1 passenger (brunette), 2 back (redhead)
  const WITCH_NAMES = ['MORGANA', 'HAZEL', 'ROWAN'];

  const STAGES = [
    {
      name: 'SUBURBIA', sub: 'ROUTE 13, PAST CURFEW', base: 64, length: 4200, boss: 'float',
      ground: '#14261a', curb: '#3b3b4a', road: '#2b2b37', fog: false,
      far: [['house', 5], ['tree', 3], ['scarecrow', 1]],
      near: [['lamp', 3], ['fence', 3], ['jack', 2], ['tree', 1]],
      enemies: [['sedan', 10], ['cop', 3], ['jeep', 4], ['truck', 3], ['bat', 4], ['cone', 3], ['candy', 6], ['cat', 2], ['oil', 1]]
    },
    {
      name: 'THE BONEYARD', sub: 'ST. HECATE CEMETERY', base: 72, length: 4800, boss: 'hearse',
      ground: '#171722', curb: '#2a2a36', road: '#2a2a35', fog: true,
      far: [['deadTree', 4], ['grave', 6], ['stone', 1]],
      near: [['ironFence', 3], ['grave', 4], ['candles', 2]],
      enemies: [['sedan', 6], ['cop', 3], ['jeep', 3], ['van', 3], ['hay', 2], ['bat', 4], ['ghost', 5], ['cone', 2], ['candy', 6], ['cat', 2], ['oil', 1]]
    },
    {
      name: 'THE BLACK WOOD', sub: 'NO SIGNAL OUT HERE', base: 80, length: 5200, boss: 'horse',
      ground: '#0b1a0f', curb: '#132515', road: '#28282f', fog: false,
      far: [['pine', 7], ['tree', 2], ['deadTree', 2]],
      near: [['pine', 3], ['mushroom', 2], ['eyes', 3], ['rock', 2]],
      enemies: [['sedan', 4], ['jeep', 4], ['van', 4], ['hay', 3], ['truck', 3], ['bat', 6], ['ghost', 3], ['cone', 2], ['candy', 6], ['cat', 2], ['oil', 2]]
    },
    {
      name: 'SABBATH PEAK', sub: 'EVERYONE WHO IS ANYONE IS HERE', base: 90, length: 5600, boss: 'limo',
      ground: '#2a2030', curb: '#3a3040', road: '#302a38', fog: true,
      far: [['rock', 4], ['stone', 3], ['cauldron', 3], ['deadTree', 2]],
      near: [['candles', 3], ['stone', 2], ['rock', 2], ['jack', 2]],
      enemies: [['sedan', 3], ['cop', 4], ['jeep', 5], ['van', 5], ['hay', 3], ['truck', 3], ['bat', 6], ['ghost', 5], ['cone', 2], ['candy', 7], ['cat', 2], ['oil', 2]]
    }
  ];

  const VEHICLES = {
    sedan: { hp: 1, v: 0.55, w: 12, h: 19, score: 100, result: 'frog' },
    cop: { hp: 2, v: 0.72, w: 12, h: 19, score: 300, result: 'frog' },
    jeep: { hp: 2, v: 1.45, w: 12, h: 19, score: 250, result: 'pumpkin', behind: true },
    van: { hp: 3, v: 0.98, w: 12, h: 26, score: 500, result: 'frog' },
    hay: { hp: 4, v: 0.38, w: 16, h: 15, score: 400, result: 'pumpkins' },
    truck: { hp: 3, v: 0.6, w: 12, h: 19, score: 350, result: 'pie' }
  };

  // ---------------------------------------------------------------- STATE
  const G = {
    state: 'attract', t: 0, st: 0,
    score: 0, hi: 0, stage: 0, loop: 0, dist: 0, spd: 0,
    player: null,
    enemies: [], bullets: [], shots: [], hazards: [], pickups: [], critters: [], scenery: [], particles: [], popups: [], beams: [],
    hitcher: null, hitchTimer: 0,
    boss: null, bossState: 'none', bossT: 0,
    storm: 0, stormActive: 0, stormBrooms: [],
    combo: 0, comboT: 0,
    shake: 0, flash: null, flashT: 0, banner: null, bannerT: 0,
    spawnGap: 0, nearGap: [0, 0], farGap: [0, 0], lampGap: 0,
    paused: false, attractPage: 0, fogOff: 0, slowmo: 0
  };
  try { G.hi = parseInt(localStorage.getItem('getinloser.hi') || '0', 10) || 0; } catch (e) { G.hi = 0; }

  function playerYMin() { return Math.floor(H * 0.34); }
  function playerYMax() { return H - 24 - SAFE.b; }

  function newPlayer() {
    return {
      x: ROAD_X + ROAD_W / 2, y: H - 50, w: 14, h: 22,
      seats: [true, true, true], inv: 0, cool: 0, spin: 0, snag: 0, skid: 0, skidDir: 1,
      vx: 0, tilt: 0
    };
  }

  // ---------------------------------------------------------------- INPUT
  const keys = {};
  let touch = { active: false, x: 0, y: 0, fire: false };
  let anyPress = false, firePress = false, stormPress = false;
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    keys[e.code] = true;
    A.resume();
    if (['Enter', 'Space', 'KeyZ', 'KeyJ', 'KeyX', 'KeyK'].includes(e.code)) anyPress = true;
    if (['Space', 'KeyZ', 'KeyJ'].includes(e.code)) firePress = true;
    if (['KeyX', 'KeyK', 'ShiftLeft', 'ShiftRight'].includes(e.code)) stormPress = true;
    if (e.code === 'KeyM') { A.setMuted(!A.isMuted()); }
    if ((e.code === 'KeyP' || e.code === 'Escape') && (G.state === 'play')) { G.paused = !G.paused; A.SFX.select(); }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  canvas.addEventListener('pointerdown', e => {
    A.resume();
    touch.active = true; touch.x = e.clientX / SCALE; touch.y = e.clientY / SCALE; touch.fire = true;
    anyPress = true;
    if (G.state === 'play' && G.storm >= 13 && touch.x > W - 40 && touch.y > H - 40) stormPress = true;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => { if (touch.active) { touch.x = e.clientX / SCALE; touch.y = e.clientY / SCALE; } });
  canvas.addEventListener('pointerup', () => { touch.active = false; touch.fire = false; });
  canvas.addEventListener('pointercancel', () => { touch.active = false; touch.fire = false; });

  // ---------------------------------------------------------------- FX HELPERS
  function burst(x, y, n, colors, speed, life, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rnd(speed * 0.3, speed);
      G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(life * 0.5, life), t: 0, color: pick(colors), size: size || 1, g: 0 });
    }
  }
  function popup(x, y, text, color, scale) {
    G.popups.push({ x, y, text, color: color || '#f3eddd', life: 0.9, t: 0, scale: scale || 1 });
  }
  function banner(text, sub, time, color) {
    G.banner = { text, sub, color: color || '#ffe76b' }; G.bannerT = time || 1.6;
  }
  function flash(color, t) { G.flash = color; G.flashT = t || 0.12; }
  function addScore(n) {
    G.score += n;
    if (G.score > G.hi) { G.hi = G.score; try { localStorage.setItem('getinloser.hi', String(G.hi)); } catch (e) { } }
  }

  // ---------------------------------------------------------------- GAME FLOW
  function startGame() {
    G.score = 0; G.stage = 0; G.loop = 0;
    G.player = newPlayer();
    G.storm = 0;
    beginStage();
    A.SFX.start();
  }
  function beginStage() {
    const st = STAGES[G.stage];
    G.enemies = []; G.bullets = []; G.shots = []; G.hazards = []; G.pickups = []; G.critters = []; G.scenery = []; G.particles = []; G.popups = []; G.beams = [];
    G.hitcher = null; G.hitchTimer = 4;
    G.boss = null; G.bossState = 'none'; G.bossT = 0;
    G.dist = 0; G.spawnGap = 120; G.nearGap = [0, 0]; G.farGap = [0, 0]; G.lampGap = 0;
    G.combo = 0; G.stormActive = 0; G.stormBrooms = [];
    G.player.x = ROAD_X + ROAD_W / 2; G.player.y = H + 40; G.player.inv = 2.5; G.player.spin = 0; G.player.snag = 0; G.player.skid = 0;
    // pre-fill scenery
    for (let y = -40; y < H + 40; y += 6) stepScenery(6, y);
    setState('intro');
    A.playMusic('stage');
  }
  function setState(s) { G.state = s; G.st = 0; }

  // ---------------------------------------------------------------- SCENERY
  function sceneryItem(kind, side, far) {
    const o = { kind, side, t: Math.random() * 10, y: 0, x: 0, s: 1 };
    switch (kind) {
      case 'house': o.img = pick(S.house); break;
      case 'tree': o.img = S.tree; break;
      case 'pine': o.img = S.pine; break;
      case 'deadTree': o.img = S.deadTree; break;
      case 'grave': o.img = pick(S.grave); break;
      case 'stone': o.img = S.stone; break;
      case 'lamp': o.img = S.lamp; o.glow = true; break;
      case 'fence': o.img = S.fence; break;
      case 'ironFence': o.img = S.ironFence; break;
      case 'jack': o.img = S.pumpkinLit; o.glow = true; break;
      case 'candles': o.anim = S.candles; o.img = S.candles[0]; o.glow = true; break;
      case 'cauldron': o.anim = S.cauldron; o.img = S.cauldron[0]; o.glow = true; break;
      case 'mushroom': o.img = S.mushroom; break;
      case 'rock': o.img = S.rock; break;
      case 'eyes': o.img = S.eyes; o.blink = true; break;
      case 'scarecrow': o.img = S.scarecrow; break;
    }
    if (far && (kind === 'pine' || kind === 'tree' || kind === 'deadTree' || kind === 'rock') && Math.random() < 0.6) o.s = 2;
    o.w = o.img.width * o.s; o.h = o.img.height * o.s;
    return o;
  }
  function stepScenery(dy, forceY) {
    const st = STAGES[G.stage];
    const stripW = ROAD_X;
    for (let side = 0; side < 2; side++) {
      // near lane
      G.nearGap[side] -= dy;
      if (G.nearGap[side] <= 0 && stripW > 9) {
        const kind = weighted(st.near);
        const o = sceneryItem(kind, side, false);
        if (o.w <= stripW - 2) {
          const lane = Math.min(stripW - o.w - 2, 4 + rndi(0, 18));
          o.x = side === 0 ? ROAD_X - lane - o.w : ROAD_X + ROAD_W + lane;
          o.y = forceY !== undefined ? forceY : -o.h - 2;
          G.scenery.push(o);
        }
        G.nearGap[side] = o.h + rndi(10, 36);
      }
      // far lane
      G.farGap[side] -= dy;
      if (G.farGap[side] <= 0 && stripW > 44) {
        const kind = weighted(st.far);
        const o = sceneryItem(kind, side, true);
        const span = stripW - 30 - o.w;
        if (span > 0) {
          const off = 30 + rndi(0, span);
          o.x = side === 0 ? ROAD_X - off - o.w : ROAD_X + ROAD_W + off;
          o.y = forceY !== undefined ? forceY : -o.h - 2;
          G.scenery.push(o);
        }
        G.farGap[side] = Math.max(8, o.h * 0.6) + rndi(2, 20);
      }
    }
  }

  // ---------------------------------------------------------------- SPAWNING
  function spawnEnemy(kind) {
    const st = STAGES[G.stage];
    const rx = () => rndi(ROAD_X + 12, ROAD_X + ROAD_W - 12);
    switch (kind) {
      case 'sedan': case 'cop': case 'jeep': case 'van': case 'hay': case 'truck': {
        const d = VEHICLES[kind];
        const e = { kind, x: rx(), y: d.behind ? H + 30 : -30, w: d.w, h: d.h, hp: d.hp + (G.loop > 0 ? 1 : 0), v: d.v * (1 + G.loop * 0.08), t: 0, flash: 0, dir: 0, timer: rnd(1, 2), score: d.score, result: d.result, vehicle: true };
        if (kind === 'sedan') e.img = Math.random() < 0.5 ? S.sedan : S.sedan2;
        else if (kind === 'cop') e.anim = S.cop;
        else e.img = S[kind];
        G.enemies.push(e);
        break;
      }
      case 'bat': {
        const n = rndi(2, 4);
        for (let i = 0; i < n; i++) G.enemies.push({ kind: 'bat', x: rx(), y: -10 - i * 14, w: 9, h: 4, hp: 1, t: i * 0.4, flying: true, anim: S.bat, ph: Math.random() * 6, score: 50, result: 'poof', flash: 0 });
        break;
      }
      case 'ghost': G.enemies.push({ kind: 'ghost', x: Math.random() < 0.5 ? ROAD_X - 12 : ROAD_X + ROAD_W + 12, y: rnd(-20, H * 0.4), w: 8, h: 10, hp: 1, t: 0, flying: true, anim: S.ghost, dir: 0, score: 150, result: 'poof', flash: 0 }); break;
      case 'cone': {
        const n = rndi(2, 4), x0 = rx();
        for (let i = 0; i < n; i++) G.hazards.push({ kind: 'cone', x: clamp(x0 + (i - 1) * 9, ROAD_X + 6, ROAD_X + ROAD_W - 6), y: -10 - i * 2, w: 5, h: 6, img: S.cone });
        break;
      }
      case 'oil': G.hazards.push({ kind: 'oil', x: rx(), y: -10, w: 10, h: 5, img: S.oil }); break;
      case 'cat': {
        const fromLeft = Math.random() < 0.5;
        G.hazards.push({ kind: 'cat', x: fromLeft ? ROAD_X - 10 : ROAD_X + ROAD_W + 10, y: rnd(-20, H * 0.3), w: 8, h: 5, vx: fromLeft ? 38 : -38, t: 0, anim: S.cat, hexed: false, hp: 1 });
        break;
      }
      case 'candy': {
        const n = rndi(3, 6), x0 = rx(), col = pick(['x', 'o', 'c']);
        const zig = Math.random() < 0.4;
        for (let i = 0; i < n; i++) G.pickups.push({ kind: 'candy', x: clamp(x0 + (zig ? Math.sin(i * 1.2) * 16 : 0), ROAD_X + 8, ROAD_X + ROAD_W - 8), y: -8 - i * 12, w: 5, h: 5, img: S.candy[col], t: i * 0.3 });
        break;
      }
    }
  }
  function spawnHitcher() {
    const p = G.player;
    let seat = -1;
    for (let i = 2; i >= 0; i--) if (!p.seats[i]) { seat = i; break; }
    if (seat < 0) return;
    const side = Math.random() < 0.5 ? 0 : 1;
    G.hitcher = { seat, hair: HAIR[seat], side, x: side === 0 ? ROAD_X - 7 : ROAD_X + ROAD_W + 7, y: -20, t: 0 };
  }

  // ---------------------------------------------------------------- TRANSFORMS
  function transform(e) {
    const x = e.x, y = e.y;
    switch (e.result) {
      case 'frog':
        G.critters.push({ kind: 'frog', x, y, t: 0, dir: x < ROAD_X + ROAD_W / 2 ? -1 : 1, life: 2.4 });
        burst(x, y, 14, ['#35c96a', '#9cf26a', '#f3eddd'], 60, 0.5);
        A.SFX.ribbit();
        break;
      case 'pumpkin':
        G.critters.push({ kind: 'pumpkin', x, y, t: 0, dir: x < ROAD_X + ROAD_W / 2 ? -1 : 1, life: 2.2 });
        burst(x, y, 14, ['#ff8a1f', '#ffc247', '#35c96a'], 60, 0.5);
        A.SFX.pumpkin();
        break;
      case 'pumpkins':
        for (let i = 0; i < 3; i++) G.critters.push({ kind: 'pumpkin', x: x + (i - 1) * 8, y: y + rnd(-4, 4), t: -i * 0.1, dir: i === 0 ? -1 : i === 2 ? 1 : (Math.random() < 0.5 ? -1 : 1), life: 2.2 });
        burst(x, y, 24, ['#ff8a1f', '#ffc247', '#ffe76b'], 70, 0.6);
        A.SFX.pumpkin();
        break;
      case 'pie':
        G.critters.push({ kind: 'pie', x, y, t: 0, dir: 0, life: 1.6 });
        burst(x, y, 14, ['#ffc247', '#f3eddd', '#7c5331'], 50, 0.5);
        A.SFX.poof();
        break;
      default:
        burst(x, y, 12, ['#d7ccff', '#a97bf2', '#f3eddd'], 50, 0.4);
        A.SFX.poof();
    }
    if (!e.score) return;
    G.comboT = 1.3; G.combo = Math.min(G.combo + 1, 8);
    const mult = Math.max(1, G.combo);
    const pts = e.score * mult;
    addScore(pts);
    popup(x, y - 8, String(pts), mult > 1 ? '#ffe76b' : '#f3eddd');
    if (mult > 1) popup(x, y - 16, 'X' + mult, '#ff46f0');
    if (e.kind === 'jeep') popup(x, y + 6, 'LOSER!', '#ff6f6f');
    if (e.kind === 'cop') popup(x, y + 6, 'RIBBIT', '#9cf26a');
  }

  // ---------------------------------------------------------------- PLAYER DAMAGE
  function crash(fromWhat) {
    const p = G.player;
    if (p.inv > 0 || G.stormActive > 0) return false;
    const alive = p.seats.filter(Boolean).length;
    G.shake = 0.45; flash('#ff6f6f', 0.1);
    A.SFX.crash();
    burst(p.x, p.y, 20, ['#ff8a1f', '#ffc247', '#c6c6d6', '#1b1626'], 90, 0.7, 1);
    G.combo = 0;
    if (alive > 1) {
      let seat = -1;
      for (let i = 2; i >= 1; i--) if (p.seats[i]) { seat = i; break; }
      p.seats[seat] = false;
      p.inv = 2.4; p.spin = 1.0;
      G.critters.push({ kind: 'tumble', x: p.x, y: p.y, t: 0, dir: Math.random() < 0.5 ? -1 : 1, hair: HAIR[seat], life: 1.5, vx: rnd(40, 70) * (Math.random() < 0.5 ? -1 : 1) });
      A.SFX.eject();
      banner(WITCH_NAMES[seat] + ' FELL OUT!', 'SHE\'LL THUMB A RIDE UP AHEAD', 1.8, '#ff6f6f');
      G.hitchTimer = 3.5;
      G.slowmo = 0.5;
      return true;
    }
    // driver alone: game over
    p.spin = 2.5; p.inv = 99;
    G.slowmo = 1.2;
    setState('over');
    A.stopMusic();
    A.SFX.gameOver();
    A.engine(false, 0);
    return true;
  }
  function bump() {
    const p = G.player;
    if (p.inv > 0 || G.stormActive > 0) return;
    G.shake = Math.max(G.shake, 0.15);
    A.SFX.bump();
    p.y = Math.min(playerYMax(), p.y + 14);
    p.inv = 0.5;
    G.combo = 0;
  }

  // ---------------------------------------------------------------- BOSSES
  const BOSS_DEF = {
    float: { hp: 30, w: 56, h: 40, name: 'THE HOMECOMING FLOAT', taunt: 'YOU CAN\'T HEX WITH US' },
    hearse: { hp: 36, w: 30, h: 48, name: 'THE LATE HEARSE', taunt: 'GOT ROOM FOR THREE MORE' },
    horse: { hp: 42, w: 24, h: 34, name: 'THE HEADLESS HORSEMAN', taunt: 'LOST HIS HEAD OVER YOU' },
    limo: { hp: 52, w: 30, h: 60, name: 'THE WARLOCK LIMO', taunt: 'VIP ONLY. YOU\'RE NOT ON THE LIST' }
  };
  function startBoss() {
    const st = STAGES[G.stage], d = BOSS_DEF[st.boss];
    G.boss = { kind: st.boss, x: ROAD_X + ROAD_W / 2, y: -70, w: d.w, h: d.h, hp: d.hp + G.loop * 8, maxHp: d.hp + G.loop * 8, t: 0, flash: 0, a1: 1.5, a2: 3, tx: ROAD_X + ROAD_W / 2, ty: st.boss === 'limo' ? 44 : st.boss === 'float' ? 50 : 56, phase: 0, dead: 0, vx: 0 };
    G.bossState = 'enter'; G.bossT = 0;
    banner(d.name, d.taunt, 2.6, '#ff46f0');
    A.playMusic('boss');
  }
  function updateBoss(dt) {
    const b = G.boss, p = G.player;
    b.t += dt; b.flash = Math.max(0, b.flash - dt);
    const cx = ROAD_X + ROAD_W / 2, half = ROAD_W / 2 - 22;
    if (b.dead > 0) {
      b.dead -= dt;
      b.y += 10 * dt;
      if (Math.random() < 0.5) burst(b.x + rnd(-14, 14), b.y + rnd(-14, 14), 6, ['#ff8a1f', '#ffe76b', '#f3eddd', '#35c96a'], 60, 0.5, 1);
      if (b.dead <= 0) {
        G.critters.push({ kind: 'bigfrog', x: b.x, y: b.y, t: 0, dir: Math.random() < 0.5 ? -1 : 1, life: 3 });
        burst(b.x, b.y, 50, ['#35c96a', '#9cf26a', '#ffe76b', '#ff46f0'], 120, 1, 1);
        flash('#f3eddd', 0.25);
        G.boss = null; G.bossState = 'done';
        const bonus = 2000 * (G.stage + 1) + p.seats.filter(Boolean).length * 1000;
        addScore(bonus);
        popup(cx, H * 0.4, 'HEXED! +' + bonus, '#ffe76b', 1);
        A.SFX.stageClear();
        A.playMusic('clear', false);
        setState('clear');
      }
      return;
    }
    if (G.bossState === 'enter') {
      b.y += (b.ty - b.y) * Math.min(1, dt * 1.5);
      if (Math.abs(b.y - b.ty) < 2) { G.bossState = 'fight'; }
      return;
    }
    const low = b.hp < b.maxHp * 0.5;
    switch (b.kind) {
      case 'float': {
        b.x = cx + Math.sin(b.t * (low ? 1.5 : 0.9)) * half;
        b.a1 -= dt;
        if (b.a1 <= 0) {
          b.a1 = low ? 1.0 : 1.5;
          for (let i = -1; i <= 1; i++) G.shots.push({ kind: 'pompom', x: b.x + i * 14, y: b.y + 18, vx: i * 32, vy: 80, t: 0, w: 4, h: 4 });
          A.SFX.net();
        }
        b.a2 -= dt;
        if (b.a2 <= 0) {
          b.a2 = low ? 2.2 : 3.2;
          for (let i = 0; i < 2; i++) G.hazards.push({ kind: 'cone', x: clamp(b.x + rnd(-24, 24), ROAD_X + 6, ROAD_X + ROAD_W - 6), y: b.y + 20 + i * 8, w: 5, h: 6, img: S.cone });
        }
        break;
      }
      case 'hearse': {
        if (b.phase === 0) {
          b.x += clamp(p.x - b.x, -1, 1) * 48 * dt;
          b.y += (56 - b.y) * Math.min(1, dt * 2);
          b.a1 -= dt;
          if (b.a1 <= 0) {
            b.a1 = low ? 1.8 : 2.6;
            const n = low ? 2 : 1;
            for (let i = 0; i < n; i++) G.enemies.push({ kind: 'ghost', x: b.x + (i ? 10 : -10), y: b.y + 24, w: 8, h: 10, hp: 1, t: 0, flying: true, anim: S.ghost, dir: 0, score: 150, result: 'poof', flash: 0, homing: true });
            A.SFX.poof();
          }
          b.a2 -= dt;
          if (b.a2 <= 0) { b.a2 = low ? 3.5 : 5; b.phase = 1; b.tx = p.x; A.SFX.skid(); }
        } else if (b.phase === 1) {
          b.y += 160 * dt;
          b.x += clamp(b.tx - b.x, -1, 1) * 30 * dt;
          if (b.y > playerYMax() + 10) b.phase = 2;
        } else {
          b.y -= 110 * dt;
          if (b.y <= 56) { b.y = 56; b.phase = 0; }
        }
        break;
      }
      case 'horse': {
        b.y = 60 + Math.sin(b.t * 6) * 3;
        const sp = low ? 150 : 110;
        if (Math.abs(b.tx - b.x) < 3) b.tx = cx + rnd(-half, half);
        b.x += clamp(b.tx - b.x, -1, 1) * sp * dt;
        b.a1 -= dt;
        if (b.a1 <= 0) {
          b.a1 = low ? 0.85 : 1.25;
          const n = low ? 2 : 1;
          for (let i = 0; i < n; i++) {
            const ang = Math.atan2(p.y - b.y, p.x - b.x) + (n === 2 ? (i - 0.5) * 0.35 : 0);
            const s = low ? 150 : 115;
            G.shots.push({ kind: 'fire', x: b.x + 21, y: b.y - 3, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, t: 0, w: 5, h: 5 });
          }
          A.SFX.fireball();
        }
        break;
      }
      case 'limo': {
        b.y = 44;
        b.x += clamp(p.x - b.x, -1, 1) * (low ? 40 : 26) * dt;
        b.x = clamp(b.x, cx - half, cx + half);
        b.a1 -= dt;
        if (b.a1 <= 0) {
          b.a1 = low ? 2.4 : 3.3;
          const xs = low ? [b.x, b.x - 44, b.x + 44] : [b.x];
          for (const x of xs) if (x > ROAD_X + 4 && x < ROAD_X + ROAD_W - 4) G.beams.push({ x, y: b.y + 30, t: 0, charge: 0.9, dur: 0.55 });
          A.SFX.beamCharge();
        }
        b.a2 -= dt;
        if (b.a2 <= 0) {
          b.a2 = low ? 1.6 : 2.4;
          const n = low ? 3 : 2;
          for (let i = 0; i < n; i++) G.enemies.push({ kind: 'bat', x: b.x + (i - 1) * 14, y: b.y + 26, w: 9, h: 4, hp: 1, t: i * 0.3, flying: true, anim: S.bat, ph: Math.random() * 6, score: 50, result: 'poof', flash: 0 });
        }
        break;
      }
    }
    // collision with player
    if (overlap(p.x, p.y, p.w, p.h, b.x, b.y, b.w, b.h)) crash('boss');
  }
  function hitBoss(dmg) {
    const b = G.boss;
    if (!b || b.dead > 0 || G.bossState !== 'fight') return;
    b.hp -= dmg; b.flash = 0.08;
    A.SFX.bossHit();
    if (b.hp <= 0) {
      b.hp = 0; b.dead = 2.2;
      G.shake = 0.8;
      A.SFX.bossDie();
      A.stopMusic();
      G.shots = []; G.beams = [];
      for (const e of G.enemies) if (e.hp > 0) { e.hp = 0; transform(e); }
      G.enemies = [];
    }
  }

  // ---------------------------------------------------------------- UPDATE: PLAY
  function update(dt) {
    G.t += dt; G.st += dt;
    if (G.shake > 0) G.shake -= dt;
    if (G.flashT > 0) G.flashT -= dt;
    if (G.bannerT > 0) G.bannerT -= dt;
    if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
    G.fogOff += dt * 6;

    switch (G.state) {
      case 'attract': updateAttract(dt); break;
      case 'intro': updateIntro(dt); break;
      case 'play': if (!G.paused) updatePlay(dt); break;
      case 'clear': updateClear(dt); break;
      case 'over': updateOver(dt); break;
      case 'ending': updateEnding(dt); break;
    }
    anyPress = false; firePress = false; stormPress = false;
  }

  function updateAttract(dt) {
    G.attractPage = Math.floor(G.st / 7) % 2;
    if (A.currentSong() !== 'attract') A.playMusic('attract');
    if (anyPress) startGame();
  }
  function updateIntro(dt) {
    const p = G.player;
    const targetY = H - 50;
    p.y += (targetY - p.y) * Math.min(1, dt * 2.5);
    G.spd = STAGES[G.stage].base;
    scrollWorld(dt);
    A.engine(true, 1);
    if (G.st > 2.6 || (G.st > 0.8 && anyPress)) { p.y = targetY; setState('play'); }
  }
  function updateClear(dt) {
    scrollWorld(dt);
    updateEntities(dt, true);
    A.engine(true, 1.2);
    if (G.st > 3.4) {
      G.stage++;
      if (G.stage >= STAGES.length) { G.stage = 0; G.loop++; setState('ending'); A.playMusic('ending'); A.engine(false, 0); }
      else beginStage();
    }
  }
  function updateOver(dt) {
    const p = G.player;
    p.spin = Math.max(0, p.spin - dt);
    G.spd = Math.max(0, G.spd - 40 * dt);
    scrollWorld(dt);
    updateEntities(dt, true);
    if (G.st > 1.2 && anyPress) { setState('attract'); G.player = null; }
    if (G.st > 14) { setState('attract'); G.player = null; }
  }
  function updateEnding(dt) {
    if (G.st > 2 && anyPress) {
      // next loop
      G.player.seats = [true, true, true];
      beginStage();
      banner('LOOP ' + (G.loop + 1), 'THE COVEN RIDES AGAIN', 2.2, '#ff46f0');
    }
  }

  function scrollWorld(dt) {
    const dy = G.spd * dt;
    G.dist += dy;
    for (const o of G.scenery) { o.y += dy; o.t += dt; }
    G.scenery = G.scenery.filter(o => o.y < H + 40);
    stepScenery(dy);
    for (const h of G.hazards) h.y += dy;
    for (const c of G.pickups) c.y += dy;
    for (const c of G.critters) if (c.kind !== 'tumble') c.y += dy;
    if (G.hitcher) G.hitcher.y += dy;
  }

  function updatePlay(dt) {
    const p = G.player, st = STAGES[G.stage];
    if (G.slowmo > 0) { G.slowmo -= dt; dt *= 0.45; }

    // ---- movement
    let dx = 0, dy = 0;
    if (keys.ArrowLeft || keys.KeyA) dx -= 1;
    if (keys.ArrowRight || keys.KeyD) dx += 1;
    if (keys.ArrowUp || keys.KeyW) dy -= 1;
    if (keys.ArrowDown || keys.KeyS) dy += 1;
    if (touch.active) {
      const tx = clamp(touch.x, ROAD_X + 10, ROAD_X + ROAD_W - 10), ty = clamp(touch.y - 20, playerYMin(), playerYMax());
      dx = clamp((tx - p.x) / 6, -1, 1); dy = clamp((ty - p.y) / 6, -1, 1);
    }
    if (p.snag > 0) { p.snag -= dt; dx *= 0.25; dy *= 0.25; }
    if (p.skid > 0) { p.skid -= dt; dx = p.skidDir * 0.9 + dx * 0.3; }
    if (p.spin > 0) { p.spin -= dt; dx *= 0.4; }
    const mv = 95;
    p.vx += (dx * mv - p.vx) * Math.min(1, dt * 10);
    p.x = clamp(p.x + p.vx * dt, ROAD_X + 8, ROAD_X + ROAD_W - 8);
    p.y = clamp(p.y + dy * 70 * dt, playerYMin(), playerYMax());
    p.tilt = clamp(p.vx / mv, -1, 1);
    if (p.inv > 0) p.inv -= dt;
    // speed from y position: higher on screen = faster
    const yr = 1 - (p.y - playerYMin()) / (playerYMax() - playerYMin());
    const speedMul = 0.7 + 0.8 * yr;
    const stormMul = G.stormActive > 0 ? 1.4 : 1;
    const bossMul = G.bossState === 'fight' || G.bossState === 'enter' ? 0.9 : 1;
    G.spd = st.base * (1 + G.loop * 0.1) * speedMul * stormMul * bossMul;
    A.engine(true, speedMul);

    // ---- fire
    p.cool -= dt;
    const wantFire = keys.Space || keys.KeyZ || keys.KeyJ || touch.active;
    const witches = p.seats.filter(Boolean).length;
    if (wantFire && p.cool <= 0 && p.snag <= 0) {
      p.cool = witches >= 3 ? 0.17 : witches === 2 ? 0.2 : 0.24;
      const spread = witches === 3 ? [-4, 0, 4] : witches === 2 ? [-3, 3] : [0];
      spread.forEach((sx, i) => {
        const vx = witches === 3 ? (i - 1) * 24 : 0;
        G.bullets.push({ x: p.x + sx, y: p.y - 14, vx, vy: -260, t: 0 });
      });
      A.SFX.hex();
    }
    if (stormPress && G.storm >= 13 && G.stormActive <= 0) {
      G.storm = 0; G.stormActive = 2.6;
      G.stormBrooms = [];
      for (let i = 0; i < 7; i++) G.stormBrooms.push({ x: -40 - i * 30, y: 20 + i * ((H - 60) / 7), vx: 260 + i * 10, dir: i % 2 ? -1 : 1 });
      A.SFX.storm(); A.SFX.cackle();
      flash('#a97bf2', 0.2);
      banner('BROOM STORM!', 'EVERYBODY OUT OF THE POOL', 1.6, '#a97bf2');
      p.inv = Math.max(p.inv, 2.8);
    }
    if (G.stormActive > 0) {
      G.stormActive -= dt;
      for (const b of G.stormBrooms) {
        b.x += b.vx * dt;
        for (const e of G.enemies) if (e.hp > 0 && Math.abs(e.x - (b.dir > 0 ? b.x : W - b.x)) < 18 && Math.abs(e.y - b.y) < 24) { e.hp = 0; transform(e); }
        if (G.boss && G.bossState === 'fight' && Math.abs(G.boss.y - b.y) < 20 && Math.random() < 0.04) hitBoss(1);
      }
      G.enemies = G.enemies.filter(e => e.hp > 0);
      G.shots = [];
      G.beams = [];
    }

    // ---- scroll
    scrollWorld(dt);

    // ---- spawning
    if (G.bossState === 'none') {
      G.spawnGap -= G.spd * dt;
      if (G.spawnGap <= 0) {
        const diff = 1 + G.dist / st.length * 0.6 + G.loop * 0.3;
        G.spawnGap = rnd(70, 120) / diff;
        spawnEnemy(weighted(st.enemies));
      }
      if (G.dist >= st.length) { G.bossState = 'warning'; G.bossT = 0; A.SFX.warning(); banner('WARNING', 'SOMETHING LOSER THIS WAY COMES', 2.5, '#ff6f6f'); }
    } else if (G.bossState === 'warning') {
      G.bossT += dt;
      if (G.bossT > 2.6) startBoss();
    }
    if (G.boss) updateBoss(dt);

    // ---- hitchhiker
    if (!G.hitcher && witches < 3) {
      G.hitchTimer -= dt;
      if (G.hitchTimer <= 0) { spawnHitcher(); G.hitchTimer = 7; }
    }
    if (G.hitcher) {
      const h = G.hitcher; h.t += dt;
      if (Math.abs(p.x - h.x) < 19 && Math.abs(p.y - h.y) < 16 && !p.seats[h.seat]) {
        p.seats[h.seat] = true;
        G.hitcher = null;
        A.SFX.getIn();
        addScore(500);
        banner('GET IN LOSER!', 'WE\'RE GOING HEXING', 1.8, '#9cf26a');
        burst(h.x, h.y, 20, ['#a97bf2', '#ff46f0', '#f3eddd'], 70, 0.6);
        p.inv = Math.max(p.inv, 1.2);
        flash('#a97bf2', 0.1);
        G.hitchTimer = 7;
      } else if (h.y > H + 20) { G.hitcher = null; G.hitchTimer = 5; }
    }

    updateEntities(dt, false);
  }

  function updateEntities(dt, passive) {
    const p = G.player, st = STAGES[G.stage];
    const base = st.base * (1 + G.loop * 0.1);

    // bullets
    for (const b of G.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.t += dt; if (Math.random() < 0.5) G.particles.push({ x: b.x + rnd(-1, 1), y: b.y + 4, vx: 0, vy: 30, life: 0.25, t: 0, color: Math.random() < 0.5 ? '#35c96a' : '#9cf26a', size: 1 }); }
    G.bullets = G.bullets.filter(b => b.y > -10 && b.x > 0 && b.x < W);

    // enemies
    for (const e of G.enemies) {
      e.t += dt; if (e.flash > 0) e.flash -= dt;
      if (e.vehicle) {
        e.y += (G.spd - e.v * base) * dt;
        if (e.kind === 'cop' && !passive) { e.x += clamp(p.x - e.x, -1, 1) * 36 * dt; }
        else if (e.kind === 'jeep' && !passive) { e.x += clamp(p.x - e.x, -1, 1) * 48 * dt; }
        else if (e.kind === 'van' && !passive) {
          e.y += (56 + Math.sin(e.t) * 10 - e.y) * Math.min(1, dt * 0.8) * 0.5;
          e.x += clamp(p.x - e.x, -1, 1) * 22 * dt;
          e.timer -= dt;
          if (e.timer <= 0 && e.y > 0 && e.y < p.y - 30) { e.timer = rnd(1.6, 2.6); G.shots.push({ kind: 'net', x: e.x, y: e.y + 12, vx: clamp((p.x - e.x) * 0.5, -40, 40), vy: 95, t: 0, w: 5, h: 5 }); A.SFX.net(); }
        } else if (e.kind === 'truck' && !passive) {
          e.timer -= dt;
          if (e.timer <= 0 && e.y > -10) { e.timer = rnd(1.4, 2.4); G.hazards.push({ kind: 'pumpkin', x: e.x + rnd(-5, 5), y: e.y + 10, w: 7, h: 7, img: S.pumpkin, hp: 1, roll: 0 }); }
        } else if (e.kind === 'sedan') {
          e.timer -= dt;
          if (e.timer <= 0) { e.timer = rnd(1.5, 3); e.dir = rndi(-1, 1); }
          e.x += e.dir * 18 * dt;
        }
        e.x = clamp(e.x, ROAD_X + 10, ROAD_X + ROAD_W - 10);
      } else if (e.kind === 'bat') {
        e.y += (G.spd * 0.5 + 40) * dt;
        e.x += Math.sin(e.t * 4 + e.ph) * 50 * dt;
      } else if (e.kind === 'ghost') {
        if (e.homing && !passive) {
          const ang = Math.atan2(p.y - e.y, p.x - e.x);
          e.x += Math.cos(ang) * 34 * dt; e.y += Math.sin(ang) * 34 * dt + G.spd * 0.2 * dt;
          if (e.t > 7) e.hp = 0;
        } else {
          const toRight = e.x < ROAD_X + ROAD_W / 2;
          if (e.t < 0.1 && e.dir === 0) e.dir = toRight ? 1 : -1;
          e.x += e.dir * 28 * dt;
          e.y += (G.spd * 0.35) * dt + Math.sin(e.t * 3) * 10 * dt;
          if (e.dir > 0 && e.x > ROAD_X + ROAD_W + 16) e.hp = 0;
          if (e.dir < 0 && e.x < ROAD_X - 16) e.hp = 0;
        }
      }
      // bullets vs enemy
      if (e.hp > 0) {
        for (const b of G.bullets) {
          if (b.dead) continue;
          const hw = e.w + 3, hh = e.h + 3;
          if (Math.abs(b.x - e.x) * 2 < hw && Math.abs(b.y - e.y) * 2 < hh) {
            b.dead = true; e.hp--; e.flash = 0.06;
            burst(b.x, b.y, 4, ['#9cf26a', '#f3eddd'], 40, 0.2);
            if (e.hp <= 0) { transform(e); break; }
            else A.SFX.hit();
          }
        }
      }
      // enemy vs player
      if (e.hp > 0 && !passive && overlap(p.x, p.y, p.w, p.h, e.x, e.y, e.w, e.h)) {
        if (e.flying) { if (e.kind === 'ghost') { crash('ghost'); e.hp = 0; } else { bump(); e.hp = 0; burst(e.x, e.y, 6, ['#1b1626', '#ff6f6f'], 40, 0.3); } }
        else if (crash(e.kind)) { e.hp = 0; transform({ x: e.x, y: e.y, result: 'poof', score: 0, kind: e.kind }); }
      }
    }
    G.bullets = G.bullets.filter(b => !b.dead);
    G.enemies = G.enemies.filter(e => e.hp > 0 && e.y < H + 40 && e.y > -120);

    // boss vs bullets
    if (G.boss && G.bossState === 'fight' && G.boss.dead <= 0) {
      const b = G.boss;
      for (const s of G.bullets) {
        if (!s.dead && Math.abs(s.x - b.x) * 2 < b.w + 6 && Math.abs(s.y - b.y) * 2 < b.h + 6) { s.dead = true; hitBoss(1); burst(s.x, s.y, 5, ['#9cf26a', '#f3eddd', '#ff46f0'], 50, 0.25); }
      }
      G.bullets = G.bullets.filter(s => !s.dead);
    }

    // enemy shots
    for (const s of G.shots) {
      s.t += dt; s.x += s.vx * dt; s.y += (s.vy + G.spd * 0.3) * dt;
      if (s.kind === 'fire' && Math.random() < 0.6) G.particles.push({ x: s.x + rnd(-2, 2), y: s.y + rnd(-2, 2), vx: 0, vy: -20, life: 0.3, t: 0, color: pick(['#ff5a3c', '#ffd23c', '#ff8a1f']), size: 1 });
      if (!passive && overlap(p.x, p.y, p.w, p.h, s.x, s.y, s.w, s.h)) {
        s.dead = true;
        if (s.kind === 'fire') crash('fire');
        else if (s.kind === 'net') { if (p.inv <= 0 && G.stormActive <= 0) { p.snag = 1.1; A.SFX.snag(); popup(p.x, p.y - 16, 'TANGLED', '#c6c6d6'); G.combo = 0; } }
        else bump();
      }
      // hex vs shot: pompoms/nets can be hexed away
      for (const b of G.bullets) if (!b.dead && !s.dead && Math.abs(b.x - s.x) < 5 && Math.abs(b.y - s.y) < 6) { b.dead = true; s.dead = true; burst(s.x, s.y, 6, ['#9cf26a', '#f3eddd'], 40, 0.25); addScore(25); }
    }
    G.shots = G.shots.filter(s => !s.dead && s.y < H + 10 && s.y > -20 && s.x > -10 && s.x < W + 10);
    G.bullets = G.bullets.filter(b => !b.dead);

    // beams (limo)
    for (const bm of G.beams) {
      bm.t += dt;
      if (bm.t > bm.charge && !bm.fired) { bm.fired = true; A.SFX.beam(); G.shake = Math.max(G.shake, 0.2); }
      if (bm.fired && bm.t < bm.charge + bm.dur && !passive) {
        if (Math.abs(p.x - bm.x) < 7 + p.w / 2 && p.y > bm.y) crash('beam');
      }
    }
    G.beams = G.beams.filter(bm => bm.t < bm.charge + bm.dur);

    // hazards
    for (const h of G.hazards) {
      if (h.kind === 'cat') {
        h.t += dt; h.x += h.vx * dt; h.y += G.spd * 0.1 * dt;
        if ((h.vx > 0 && h.x > ROAD_X + ROAD_W + 12) || (h.vx < 0 && h.x < ROAD_X - 12)) {
          h.gone = true;
          if (!h.hexed && !passive && h.y > 0 && h.y < H) { addScore(200); popup(h.x, h.y - 8, 'LUCKY +200', '#9cf26a'); A.SFX.lucky(); G.storm = Math.min(13, G.storm + 1); }
        }
        for (const b of G.bullets) if (!b.dead && Math.abs(b.x - h.x) < 6 && Math.abs(b.y - h.y) < 6) {
          b.dead = true; h.hexed = true; h.gone = true;
          A.SFX.badLuck(); flash('#6a3fa3', 0.3); G.shake = 0.3;
          addScore(-300); G.storm = Math.max(0, G.storm - 4); G.combo = 0;
          popup(h.x, h.y - 10, 'BAD LUCK! -300', '#ff46f0');
          banner('YOU HEXED A BLACK CAT', 'THAT IS SO NOT FETCH', 1.8, '#ff46f0');
          G.critters.push({ kind: 'frog', x: h.x, y: h.y, t: 0, dir: h.vx > 0 ? 1 : -1, life: 2 });
        }
        continue;
      }
      if (h.kind === 'pumpkin') {
        h.roll += dt;
        for (const b of G.bullets) if (!b.dead && Math.abs(b.x - h.x) < 6 && Math.abs(b.y - h.y) < 7) { b.dead = true; h.gone = true; transform({ x: h.x, y: h.y, result: 'pie', score: 50, kind: 'pumpkin' }); popup(h.x, h.y + 6, 'PIE!', '#ffc247'); }
      }
      if (h.kind === 'cone') {
        for (const b of G.bullets) if (!b.dead && Math.abs(b.x - h.x) < 5 && Math.abs(b.y - h.y) < 6) { b.dead = true; h.gone = true; burst(h.x, h.y, 8, ['#ff8a1f', '#f3eddd'], 40, 0.3); G.pickups.push({ kind: 'candy', x: h.x, y: h.y, w: 5, h: 5, img: S.candy[pick(['x', 'o', 'c'])], t: 0 }); A.SFX.poof(); addScore(20); }
      }
      if (!passive && !h.gone && overlap(p.x, p.y, p.w, p.h, h.x, h.y, h.w, h.h)) {
        h.gone = true;
        if (h.kind === 'oil') { if (p.inv <= 0 && G.stormActive <= 0) { p.skid = 0.9; p.skidDir = Math.random() < 0.5 ? -1 : 1; A.SFX.skid(); popup(p.x, p.y - 16, 'SKID!', '#ffe76b'); h.gone = false; } }
        else { bump(); burst(h.x, h.y, 8, h.kind === 'cone' ? ['#ff8a1f', '#f3eddd'] : ['#ff8a1f', '#ffc247'], 50, 0.3); }
      }
    }
    G.bullets = G.bullets.filter(b => !b.dead);
    G.hazards = G.hazards.filter(h => !h.gone && h.y < H + 20);

    // pickups
    for (const c of G.pickups) {
      c.t += dt;
      if (!passive && overlap(p.x, p.y, p.w + 4, p.h + 4, c.x, c.y, c.w, c.h)) {
        c.gone = true; addScore(50);
        G.storm = Math.min(13, G.storm + 1);
        A.SFX.candy();
        burst(c.x, c.y, 5, ['#ff46f0', '#ffa8f8', '#f3eddd'], 30, 0.3);
        if (G.storm === 13) { popup(p.x, p.y - 20, 'STORM READY!', '#a97bf2'); A.SFX.lucky(); }
      }
    }
    G.pickups = G.pickups.filter(c => !c.gone && c.y < H + 10);

    // critters
    for (const c of G.critters) {
      c.t += dt; c.life -= dt;
      if (c.kind === 'frog') { if (c.t > 0) { c.x += c.dir * 55 * dt; c.y += G.spd * 0.15 * dt; } }
      else if (c.kind === 'pumpkin') { if (c.t > 0) { c.x += c.dir * 40 * dt; } }
      else if (c.kind === 'bigfrog') { c.x += c.dir * 50 * dt; c.y += Math.sin(c.t * 8) * 20 * dt; }
      else if (c.kind === 'tumble') { c.x += c.vx * dt; c.y += (G.spd + 40) * dt; }
    }
    G.critters = G.critters.filter(c => c.life > 0 && c.y < H + 30);

    // particles & popups
    for (const q of G.particles) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g || 0) * dt; }
    G.particles = G.particles.filter(q => q.t < q.life);
    for (const q of G.popups) { q.t += dt; q.y -= 18 * dt; }
    G.popups = G.popups.filter(q => q.t < q.life);
  }

  // ---------------------------------------------------------------- DRAW
  function draw() {
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (G.shake > 0) ctx.translate(rndi(-2, 2), rndi(-2, 2));
    switch (G.state) {
      case 'attract': drawAttract(); break;
      case 'ending': drawEnding(); break;
      default: drawWorld(); drawHUD(); break;
    }
    ctx.restore();
    if (G.flashT > 0 && G.flash) {
      ctx.globalAlpha = Math.min(1, G.flashT * 4);
      ctx.fillStyle = G.flash; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  function drawRoad() {
    const st = STAGES[G.stage];
    ctx.fillStyle = st.ground; ctx.fillRect(0, 0, W, H);
    // curb strips
    ctx.fillStyle = st.curb;
    ctx.fillRect(ROAD_X - 5, 0, 5, H); ctx.fillRect(ROAD_X + ROAD_W, 0, 5, H);
    // road
    ctx.fillStyle = st.road; ctx.fillRect(ROAD_X, 0, ROAD_W, H);
    // headlight cone
    if (G.player && G.state !== 'over') {
      const p = G.player;
      ctx.fillStyle = G.stage === 3 ? '#352f3e' : '#30303c';
      for (let i = 0; i < 80; i++) {
        const y = Math.round(p.y - 14 - i);
        if (y < 0) break;
        const hw = 7 + i * 0.32;
        const x0 = Math.max(ROAD_X, Math.round(p.x - hw)), x1 = Math.min(ROAD_X + ROAD_W, Math.round(p.x + hw));
        if (x1 > x0) ctx.fillRect(x0, y, x1 - x0, 1);
      }
      ctx.fillStyle = G.stage === 3 ? '#3b3546' : '#363643';
      for (let i = 0; i < 40; i++) {
        const y = Math.round(p.y - 14 - i);
        if (y < 0) break;
        const hw = 5 + i * 0.2;
        const x0 = Math.max(ROAD_X, Math.round(p.x - hw)), x1 = Math.min(ROAD_X + ROAD_W, Math.round(p.x + hw));
        if (x1 > x0) ctx.fillRect(x0, y, x1 - x0, 1);
      }
    }
    // edge lines
    ctx.fillStyle = '#c6c6d6';
    ctx.fillRect(ROAD_X + 2, 0, 1, H); ctx.fillRect(ROAD_X + ROAD_W - 3, 0, 1, H);
    // center dashes
    ctx.fillStyle = '#c9a63a';
    const off = Math.floor(G.dist) % 24;
    const cx = Math.floor(ROAD_X + ROAD_W / 2);
    for (let y = -24 + off; y < H; y += 24) ctx.fillRect(cx, y, 1, 12);
    if (ROAD_W > 150) { ctx.fillStyle = '#5a5a68'; for (let y = -24 + off; y < H; y += 24) { ctx.fillRect(Math.floor(ROAD_X + ROAD_W / 4), y + 6, 1, 10); ctx.fillRect(Math.floor(ROAD_X + ROAD_W * 3 / 4), y + 6, 1, 10); } }
  }

  function drawScenery() {
    for (const o of G.scenery) {
      let img = o.img;
      if (o.anim) img = o.anim[Math.floor(o.t * 6) % o.anim.length];
      if (o.blink && Math.floor(o.t * 1.3) % 5 === 0) continue;
      if (o.glow) {
        const r = o.kind === 'lamp' ? 12 : o.kind === 'cauldron' ? 10 : 7;
        const gy = o.kind === 'lamp' ? o.y + 2 : o.y + o.h / 2;
        glow(o.x + o.w / 2, gy, r, o.kind === 'cauldron' ? '#35c96a' : '#ffe76b', 0.09 + 0.03 * Math.sin(o.t * 5));
        glow(o.x + o.w / 2, gy, Math.round(r / 2), '#ffe76b', 0.08);
      }
      if (o.s > 1) blitScaled(img, o.x, o.y, o.s); else blit(img, o.x, o.y);
    }
  }

  function drawFog() {
    if (!STAGES[G.stage].fog) return;
    ctx.fillStyle = '#d7ccff';
    for (let i = 0; i < 5; i++) {
      const y = Math.round(((i * 53 + G.fogOff * (0.6 + i * 0.1)) % (H + 30)) - 15);
      const x = Math.round(Math.sin(G.t * 0.3 + i) * 30);
      ctx.globalAlpha = 0.07;
      ctx.fillRect(x - 20, y, W + 40, 6);
      ctx.globalAlpha = 0.05;
      ctx.fillRect(x - 20, y - 3, W + 40, 12);
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer() {
    const p = G.player;
    if (!p) return;
    if (p.inv > 0 && p.inv < 90 && Math.floor(G.t * 16) % 2 === 0 && G.state === 'play') return;
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    if (p.spin > 0) ctx.rotate(p.spin * Math.PI * 4);
    const img = S.carBase;
    ctx.drawImage(img, -10, -14);
    for (let i = 0; i < 3; i++) if (p.seats[i]) {
      const s = S.SEATS[i];
      ctx.drawImage(S.hatTop[HAIR[i]], -10 + s.x, -14 + s.y);
    }
    if (p.snag > 0) ctx.drawImage(S.net, -4, -8);
    ctx.restore();
    // exhaust sparkle
    if (G.state === 'play' && Math.random() < 0.6) G.particles.push({ x: p.x + rnd(-3, 3), y: p.y + 14, vx: 0, vy: 40, life: 0.3, t: 0, color: Math.random() < 0.3 ? '#a97bf2' : '#46465a', size: 1 });
  }

  function drawWorld() {
    drawRoad();
    drawScenery();
    // road-level objects
    for (const h of G.hazards) {
      if (h.kind === 'cat') blitC(h.anim[Math.floor(h.t * 8) % 2], h.x, h.y);
      else if (h.kind === 'pumpkin') blitC(h.img, h.x, h.y);
      else blitC(h.img, h.x, h.y);
    }
    for (const c of G.pickups) blitC(c.img, c.x, c.y + Math.sin(c.t * 6) * 1.5);
    for (const c of G.critters) {
      if (c.kind === 'frog') blitC(S.frog[Math.floor(c.t * 8) % 2], c.x, c.y - Math.abs(Math.sin(c.t * 8)) * 4);
      else if (c.kind === 'pumpkin') blitC(S.pumpkin, c.x, c.y);
      else if (c.kind === 'pie') blitC(S.pie, c.x, c.y);
      else if (c.kind === 'bigfrog') blitC(S.bigFrog, c.x, c.y - Math.abs(Math.sin(c.t * 6)) * 8);
      else if (c.kind === 'tumble') { ctx.save(); ctx.translate(Math.round(c.x), Math.round(c.y)); ctx.rotate(c.t * 9); ctx.drawImage(S.tumble[c.hair], -3, -3); ctx.restore(); }
    }
    if (G.hitcher) {
      const h = G.hitcher;
      const img = S.hitch[h.hair][Math.floor(h.t * 3) % 2];
      // sparkle so she's noticeable
      if (Math.random() < 0.3) G.particles.push({ x: h.x + rnd(-6, 6), y: h.y + rnd(-10, 6), vx: 0, vy: -15, life: 0.5, t: 0, color: '#ffe76b', size: 1 });
      blitC(img, h.x, h.y);
      if (Math.floor(G.t * 2) % 2 === 0) drawText(ctx, '!', h.x - 2, h.y - 18, '#ffe76b', 1, 'left', '#0b0914');
    }
    // vehicles
    for (const e of G.enemies) if (!e.flying) {
      let img = e.img || (e.anim ? e.anim[Math.floor(e.t * 6) % e.anim.length] : null);
      if (e.flash > 0) img = sil(img);
      blitC(img, e.x, e.y);
    }
    // beams
    for (const bm of G.beams) {
      if (!bm.fired) {
        ctx.fillStyle = Math.floor(bm.t * 12) % 2 ? '#ff46f0' : '#6a3fa3';
        for (let y = Math.round(bm.y); y < H; y += 4) ctx.fillRect(Math.round(bm.x), y, 1, 2);
      } else {
        const k = (bm.t - bm.charge) / bm.dur;
        const w = Math.round(14 * (1 - k * 0.5));
        ctx.fillStyle = '#6a3fa3'; ctx.fillRect(Math.round(bm.x - w / 2), Math.round(bm.y), w, H);
        ctx.fillStyle = '#ff46f0'; ctx.fillRect(Math.round(bm.x - w / 2) + 2, Math.round(bm.y), w - 4, H);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(bm.x) - 1, Math.round(bm.y), 3, H);
      }
    }
    // boss
    if (G.boss) {
      const b = G.boss;
      let img = b.kind === 'float' ? S.bossFloat : b.kind === 'hearse' ? S.bossHearse : b.kind === 'horse' ? S.bossHorse[Math.floor(b.t * 10) % 2] : S.bossLimo;
      if (b.flash > 0) img = S.bossHit[b.kind];
      const bx = Math.round(b.x - img.width), byy = Math.round(b.y - img.height);
      ctx.drawImage(img, bx, byy, img.width * 2, img.height * 2);
      if (b.kind === 'horse') {
        const fp = S.firePumpkin[Math.floor(b.t * 10) % 2];
        ctx.drawImage(fp, Math.round(b.x + 14), Math.round(b.y - 10), fp.width * 2, fp.height * 2);
        glow(b.x + 21, b.y - 3, 10, '#ff8a1f', 0.12);
      }
      if (b.kind === 'limo') glow(b.x, b.y, 40, '#ff46f0', 0.05);
    }
    drawPlayer();
    // shots
    for (const s of G.shots) {
      if (s.kind === 'net') blitC(S.net, s.x, s.y);
      else if (s.kind === 'pompom') blitC(S.pompom[Math.floor(s.t * 10) % 2], s.x, s.y);
      else blitC(S.firePumpkin[Math.floor(s.t * 12) % 2], s.x, s.y);
    }
    // bullets
    for (const b of G.bullets) blitC(S.hex[Math.floor(b.t * 20) % 2], b.x, b.y);
    // flying enemies
    for (const e of G.enemies) if (e.flying) {
      let img = e.anim[Math.floor(e.t * (e.kind === 'bat' ? 10 : 4)) % 2];
      if (e.flash > 0) img = sil(img);
      blitC(img, e.x, e.y);
    }
    // storm brooms
    if (G.stormActive > 0) {
      for (const b of G.stormBrooms) {
        const x = b.dir > 0 ? b.x : W - b.x;
        ctx.save(); ctx.translate(Math.round(x), Math.round(b.y));
        if (b.dir < 0) ctx.scale(-1, 1);
        ctx.drawImage(S.broom, -11, -2);
        ctx.restore();
        G.particles.push({ x: x + rnd(-10, 10), y: b.y + rnd(-2, 4), vx: -b.dir * 40, vy: rnd(-10, 10), life: 0.4, t: 0, color: pick(['#a97bf2', '#ff46f0', '#9cf26a']), size: 1 });
      }
    }
    drawFog();
    // particles
    for (const q of G.particles) {
      ctx.globalAlpha = 1 - q.t / q.life;
      ctx.fillStyle = q.color;
      ctx.fillRect(Math.round(q.x), Math.round(q.y), q.size, q.size);
    }
    ctx.globalAlpha = 1;
    for (const q of G.popups) {
      ctx.globalAlpha = q.t < q.life - 0.3 ? 1 : (q.life - q.t) / 0.3;
      drawText(ctx, q.text, q.x, q.y, q.color, q.scale, 'center', '#0b0914');
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    const p = G.player;
    const top = 3 + SAFE.t, left = 3 + SAFE.l, right = W - 3 - SAFE.r, bottom = H - 3 - SAFE.b;
    drawText(ctx, 'SCORE ' + fmt(G.score), left, top, '#f3eddd', 1, 'left', '#0b0914');
    drawText(ctx, 'HI ' + fmt(G.hi), right, top, '#ffe76b', 1, 'right', '#0b0914');
    const st = STAGES[G.stage];
    const narrow = W < 260;
    drawText(ctx, 'STAGE ' + (G.stage + 1) + (G.loop ? ' LOOP ' + (G.loop + 1) : ''), W / 2, narrow ? top + 9 : top, '#a97bf2', 1, 'center', '#0b0914');
    if (G.combo > 1 && G.state === 'play') drawText(ctx, 'COMBO X' + G.combo, W / 2, top + (narrow ? 18 : 9), '#ff46f0', 1, 'center', '#0b0914');

    // coven seats (bottom-left)
    if (p) {
      drawText(ctx, 'COVEN', left, bottom - 15, '#a97bf2', 1, 'left', '#0b0914');
      for (let i = 0; i < 3; i++) {
        const x = left + i * 9, y = bottom - 6;
        if (p.seats[i]) blit(S.hatTop[HAIR[i]], x, y);
        else { ctx.fillStyle = '#2c2c3a'; ctx.fillRect(x + 1, y + 1, 3, 3); }
      }
    }
    // storm meter (bottom-right)
    const mx = right - 13 * 3;
    drawText(ctx, G.storm >= 13 ? (Math.floor(G.t * 4) % 2 ? 'STORM READY (X)' : '') : 'STORM', right, bottom - 15, G.storm >= 13 ? '#ffe76b' : '#a97bf2', 1, 'right', '#0b0914');
    for (let i = 0; i < 13; i++) {
      ctx.fillStyle = i < G.storm ? (G.storm >= 13 ? '#ffe76b' : '#ff46f0') : '#2c2c3a';
      ctx.fillRect(mx + i * 3, bottom - 5, 2, 4);
    }
    // progress bar (bottom center)
    const bw = Math.min(90, ROAD_W - 20), bx = Math.round(W / 2 - bw / 2), by = bottom - 3;
    ctx.fillStyle = '#2c2c3a'; ctx.fillRect(bx, by, bw, 2);
    const prog = clamp(G.dist / st.length, 0, 1);
    ctx.fillStyle = '#9cf26a'; ctx.fillRect(bx, by, Math.round(bw * prog), 2);
    ctx.fillStyle = '#ff46f0'; ctx.fillRect(bx + bw - 1, by - 1, 2, 4);
    if (G.boss && G.bossState !== 'none') {
      const b = G.boss, d = BOSS_DEF[b.kind];
      const hbw = Math.min(120, ROAD_W - 10), hbx = Math.round(W / 2 - hbw / 2), hby = top + 18;
      drawText(ctx, d.name, W / 2, hby - 8, '#ff6f6f', 1, 'center', '#0b0914');
      ctx.fillStyle = '#0b0914'; ctx.fillRect(hbx - 1, hby - 1, hbw + 2, 5);
      ctx.fillStyle = '#5a1d2a'; ctx.fillRect(hbx, hby, hbw, 3);
      ctx.fillStyle = b.flash > 0 ? '#ffffff' : '#ff6f6f'; ctx.fillRect(hbx, hby, Math.round(hbw * b.hp / b.maxHp), 3);
    }
    // banner
    if (G.bannerT > 0 && G.banner) {
      const a = Math.min(1, G.bannerT * 3);
      ctx.globalAlpha = a;
      const y = Math.round(H * 0.28);
      ctx.fillStyle = '#0b0914'; ctx.fillRect(0, y - 4, W, 26);
      ctx.fillStyle = G.banner.color; ctx.fillRect(0, y - 5, W, 1); ctx.fillRect(0, y + 22, W, 1);
      drawText(ctx, G.banner.text, W / 2, y, G.banner.color, W >= 300 ? 2 : 1, 'center');
      if (G.banner.sub) drawText(ctx, G.banner.sub, W / 2, y + (W >= 300 ? 15 : 9), '#f3eddd', 1, 'center');
      ctx.globalAlpha = 1;
    }
    // state cards
    if (G.state === 'intro') {
      const st2 = STAGES[G.stage];
      const y = Math.round(H * 0.45);
      ctx.fillStyle = '#0b0914'; ctx.fillRect(0, y - 8, W, 36);
      drawText(ctx, 'STAGE ' + (G.stage + 1), W / 2, y - 4, '#a97bf2', 1, 'center');
      drawText(ctx, st2.name, W / 2, y + 6, '#ffe76b', W >= 300 ? 2 : 1, 'center');
      if (W >= 200) drawText(ctx, st2.sub, W / 2, y + (W >= 300 ? 22 : 16), '#f3eddd', 1, 'center');
    }
    if (G.state === 'clear') {
      const y = Math.round(H * 0.45);
      ctx.fillStyle = '#0b0914'; ctx.fillRect(0, y - 8, W, 30);
      drawText(ctx, 'STAGE CLEAR', W / 2, y - 2, '#9cf26a', W >= 300 ? 2 : 1, 'center');
      drawText(ctx, 'THAT WAS SO FETCH', W / 2, y + (W >= 300 ? 14 : 8), '#f3eddd', 1, 'center');
    }
    if (G.state === 'over') {
      const y = Math.round(H * 0.4);
      ctx.globalAlpha = Math.min(1, G.st / 1.5);
      ctx.fillStyle = '#0b0914'; ctx.fillRect(0, y - 10, W, 52);
      drawText(ctx, 'GAME OVER', W / 2, y - 4, '#ff6f6f', W >= 300 ? 2 : 1, 'center');
      if (W >= 170) drawText(ctx, 'SHE DOESN\'T EVEN GO HERE.', W / 2, y + (W >= 300 ? 14 : 8), '#f3eddd', 1, 'center');
      else { drawText(ctx, 'SHE DOESN\'T', W / 2, y + 8, '#f3eddd', 1, 'center'); drawText(ctx, 'EVEN GO HERE.', W / 2, y + 16, '#f3eddd', 1, 'center'); }
      drawText(ctx, 'SCORE ' + fmt(G.score), W / 2, y + 26, '#ffe76b', 1, 'center');
      if (G.st > 1.2 && Math.floor(G.t * 2) % 2 === 0) drawText(ctx, 'PRESS START', W / 2, y + 36, '#a97bf2', 1, 'center');
      ctx.globalAlpha = 1;
    }
    if (G.paused) {
      ctx.fillStyle = 'rgba(11,9,20,0.7)'; ctx.fillRect(0, 0, W, H);
      drawText(ctx, 'PAUSED', W / 2, H / 2 - 8, '#ffe76b', 2, 'center');
      drawText(ctx, 'P TO RESUME  M TO MUTE', W / 2, H / 2 + 12, '#f3eddd', 1, 'center');
    }
    if (A.isMuted()) drawText(ctx, 'MUTED', right, top + 9, '#46465a', 1, 'right');
  }

  // ---------------------------------------------------------------- ATTRACT / ENDING SCENES
  const stars = [];
  for (let i = 0; i < 90; i++) stars.push({ x: Math.random(), y: Math.random() * 0.6, ph: Math.random() * 6, c: Math.random() < 0.2 ? '#a97bf2' : '#f3eddd' });
  const attractBats = [];
  for (let i = 0; i < 6; i++) attractBats.push({ x: Math.random(), y: 0.1 + Math.random() * 0.4, sp: 0.04 + Math.random() * 0.05, ph: Math.random() * 6 });

  function drawSkyScene(t, driving) {
    // sky bands
    const bands = ['#0b0914', '#0e0b1c', '#120e24', '#17112c', '#1b1433', '#20183a'];
    const horizon = Math.round(H * 0.62);
    for (let i = 0; i < bands.length; i++) {
      const y0 = Math.round(horizon * i / bands.length), y1 = Math.round(horizon * (i + 1) / bands.length);
      ctx.fillStyle = bands[i]; ctx.fillRect(0, y0, W, y1 - y0);
    }
    for (const s of stars) {
      if (Math.sin(t * 2 + s.ph) < -0.6) continue;
      ctx.fillStyle = s.c; ctx.fillRect(Math.round(s.x * W), Math.round(s.y * horizon), 1, 1);
    }
    // moon
    const moonS = W >= 360 ? 3 : 2;
    blitScaled(S.moon, W - 18 * moonS - 14 - SAFE.r, 10 + SAFE.t, moonS);
    // bats
    for (const b of attractBats) {
      b.x += b.sp * 0.016 * (driving ? 1.5 : 1);
      if (b.x > 1.1) { b.x = -0.1; b.y = 0.1 + Math.random() * 0.4; }
      const img = S.bat[Math.floor(t * 8 + b.ph) % 2];
      blit(img, b.x * W, b.y * horizon + Math.sin(t * 3 + b.ph) * 4);
    }
    // far hills
    const scroll = driving ? t * 12 : 0;
    ctx.fillStyle = '#1a1230';
    for (let x = 0; x < W; x++) {
      const h = 26 + Math.sin((x + scroll) * 0.03) * 14 + Math.sin((x + scroll) * 0.011 + 2) * 10;
      ctx.fillRect(x, horizon - Math.round(h), 1, Math.round(h) + 1);
    }
    // near hills with pines
    const scroll2 = driving ? t * 30 : 0;
    ctx.fillStyle = '#0f1a14';
    for (let x = 0; x < W; x++) {
      const h = 10 + Math.sin((x + scroll2) * 0.05 + 1) * 6 + Math.sin((x + scroll2) * 0.017) * 5;
      ctx.fillRect(x, horizon - Math.round(h), 1, Math.round(h) + 1);
    }
    for (let i = 0; i < 18; i++) {
      const px = ((i * 73 - scroll2 * 1.4) % (W + 60) + W + 60) % (W + 60) - 30;
      const img = i % 3 === 0 ? S.deadTree : i % 3 === 1 ? S.pine : S.tree;
      blit(img, px, horizon - img.height - 4 + Math.sin(i) * 3);
    }
    // ground & road
    ctx.fillStyle = '#132515'; ctx.fillRect(0, horizon, W, H - horizon);
    const roadH = 34;
    const roadY = horizon + Math.round((H - horizon) * 0.3);
    ctx.fillStyle = '#2b2b37'; ctx.fillRect(0, roadY, W, roadH);
    ctx.fillStyle = '#c6c6d6'; ctx.fillRect(0, roadY + 1, W, 1); ctx.fillRect(0, roadY + roadH - 2, W, 1);
    ctx.fillStyle = '#c9a63a';
    const off = driving ? Math.floor(t * 120) % 24 : 0;
    for (let x = -24 + off; x < W; x += 24) ctx.fillRect(x, roadY + Math.floor(roadH / 2), 12, 1);
    // jack-o-lanterns on the verge
    for (let i = 0; i < 6; i++) {
      const px = ((i * 141 - scroll2 * 2.5) % (W + 40) + W + 40) % (W + 40) - 20;
      blit(S.pumpkinLit, px, roadY + roadH + 3);
    }
    return roadY;
  }

  function drawCarSide(x, y, t, bob, scale, empty) {
    scale = scale || 1;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    const by = bob ? Math.round(Math.sin(t * 14) * 0.8) : 0;
    // witches first so the body hides their laps: brunette (front), blonde (driver, shades), redhead (back)
    const bobs = bob ? [Math.round(Math.sin(t * 14 + 1)), Math.round(Math.sin(t * 14 + 2)), Math.round(Math.sin(t * 14 + 3))] : [0, 0, 0];
    if (!empty) {
      ctx.drawImage(S.witchSide.n, 13, by - 11 + bobs[0]);
      ctx.drawImage(S.witchSide.b, 24, by - 11 + bobs[1]);
      ctx.drawImage(S.witchSide.h, 37, by - 11 + bobs[2]);
    }
    ctx.drawImage(S.carSide, 0, by);
    const wf = Math.floor(t * 16) % 2;
    ctx.drawImage(S.wheel[wf], 6, by + 8);
    ctx.drawImage(S.wheel[wf], 43, by + 8);
    // headlight beam
    ctx.globalAlpha = 0.12 + 0.03 * Math.sin(t * 30);
    ctx.fillStyle = '#ffe76b';
    for (let i = 0; i < 40; i++) ctx.fillRect(-i, by + 6 - Math.round(i * 0.25), 1, 2 + Math.round(i * 0.5));
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawAttract() {
    const t = G.t;
    const roadY = drawSkyScene(t, true);
    const cs = W >= 300 ? 2 : 1;
    const carX = Math.round(W / 2 - 28 * cs), carY = roadY + 34 - 16 * cs;
    drawCarSide(carX, carY, t, true, cs);
    // dust
    if (Math.random() < 0.8) G.particles.push({ x: carX + 57 * cs, y: carY + 14 * cs, vx: 60, vy: rnd(-8, 2), life: 0.5, t: 0, color: '#46465a', size: 1 });
    for (const q of G.particles) { q.t += 0.016; q.x += q.vx * 0.016; q.y += q.vy * 0.016; ctx.globalAlpha = 1 - q.t / q.life; ctx.fillStyle = q.color; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); }
    ctx.globalAlpha = 1;
    G.particles = G.particles.filter(q => q.t < q.life);

    const big = W >= 240 ? 3 : 2;
    const ty = 18 + SAFE.t;
    if (G.attractPage === 0) {
      // title drop-in
      const k = Math.min(1, G.st % 7 / 0.6);
      const ease = 1 - Math.pow(1 - k, 3);
      const yy = Math.round(ty - 40 * (1 - ease));
      const hot = Math.floor(t * 6) % 7 === 0 ? '#ffffff' : '#ff8a1f';
      let subY;
      if (W >= 240) {
        drawText(ctx, 'GET IN LOSER', W / 2 + 1, yy + 2, '#6a3fa3', big, 'center');
        drawText(ctx, 'GET IN LOSER', W / 2, yy, hot, big, 'center', '#0b0914');
        subY = yy + 8 * big + 4;
      } else {
        drawText(ctx, 'GET IN', W / 2 + 1, yy + 2, '#6a3fa3', big, 'center');
        drawText(ctx, 'GET IN', W / 2, yy, hot, big, 'center', '#0b0914');
        drawText(ctx, 'LOSER', W / 2 + 1, yy + 18, '#6a3fa3', big, 'center');
        drawText(ctx, 'LOSER', W / 2, yy + 16, hot, big, 'center', '#0b0914');
        subY = yy + 36;
      }
      drawText(ctx, 'WE\'RE GOING HEXING', W / 2, subY, '#a97bf2', W >= 320 ? 2 : 1, 'center', '#0b0914');
      if (Math.floor(t * 2) % 2 === 0) drawText(ctx, W >= 200 ? 'PRESS ENTER OR TAP TO START' : 'TAP TO START', W / 2, H - 30 - SAFE.b, '#ffe76b', 1, 'center', '#0b0914');
      drawText(ctx, 'HI ' + fmt(G.hi), W / 2, H - 20 - SAFE.b, '#f3eddd', 1, 'center', '#0b0914');
    } else {
      drawText(ctx, 'HOW TO HEX', W / 2, ty, '#ff8a1f', 2, 'center', '#0b0914');
      const lines = [
        ['ARROWS / WASD', 'DRIVE. HIGHER = FASTER'],
        ['Z / SPACE', 'HEX. MORE WITCHES, MORE HEX'],
        ['X / SHIFT', 'BROOM STORM (13 CANDIES)'],
        ['CRASH', 'A WITCH FALLS OUT'],
        ['HITCHHIKER', 'PULL UP. GET IN LOSER'],
        ['BLACK CATS', 'DO NOT HEX THE CAT']
      ];
      const wide = W >= 300;
      const colW = Math.min(W - 20, 260), x0 = Math.round(W / 2 - colW / 2);
      lines.forEach((l, i) => {
        if (wide) {
          const y = ty + 22 + i * 10;
          drawText(ctx, l[0], x0, y, '#9cf26a', 1, 'left', '#0b0914');
          drawText(ctx, l[1], x0 + colW, y, '#f3eddd', 1, 'right', '#0b0914');
        } else {
          const y = ty + 22 + i * 18;
          drawText(ctx, l[0], W / 2, y, '#9cf26a', 1, 'center', '#0b0914');
          drawText(ctx, l[1], W / 2, y + 8, '#f3eddd', 1, 'center', '#0b0914');
        }
      });
      if (Math.floor(t * 2) % 2 === 0) drawText(ctx, W >= 200 ? 'PRESS ENTER OR TAP TO START' : 'TAP TO START', W / 2, H - 30 - SAFE.b, '#ffe76b', 1, 'center', '#0b0914');
    }
    drawText(ctx, 'M: MUTE   P: PAUSE', W / 2, H - 11 - SAFE.b, '#46465a', 1, 'center');
  }

  function drawEnding() {
    const t = G.t;
    const roadY = drawSkyScene(t, false);
    // bonfire
    const cs = W >= 300 ? 2 : 1;
    const fx = Math.round(W / 2 + 50 * cs), fy = roadY - 6 * cs;
    for (let i = 0; i < 6; i++) { G.particles.push({ x: fx + rnd(-5, 5) * cs, y: fy, vx: rnd(-6, 6), vy: rnd(-50, -25), life: rnd(0.3, 0.9), t: 0, color: pick(['#ff5a3c', '#ffd23c', '#ff8a1f', '#ffe76b']), size: cs }); }
    glow(fx, fy, 26 * cs, '#ff8a1f', 0.08 + 0.03 * Math.sin(t * 9));
    glow(fx, fy, 12 * cs, '#ffe76b', 0.1);
    blitScaled(S.cauldron[Math.floor(t * 6) % 2], fx - 4 * cs, fy - 6 * cs, cs);
    // car parked
    const carX = Math.round(W / 2 - 90 * cs / 2 - 40), carY = roadY + 34 - 16 * cs;
    drawCarSide(carX, carY, 0, false, cs, true);
    // witches dancing around fire
    const names = ['n', 'b', 'h'];
    names.forEach((h, i) => {
      const a = t * 1.5 + i * Math.PI * 2 / 3;
      const x = fx + Math.cos(a) * 24 * cs, y = fy + 2 * cs + Math.sin(a) * 7 * cs - Math.abs(Math.sin(t * 6 + i)) * 3 * cs;
      blitScaled(S.hitch[h][Math.floor(t * 4 + i) % 2], x - 5 * cs, y - 16 * cs, cs);
    });
    for (const q of G.particles) { q.t += 0.016; q.x += q.vx * 0.016; q.y += q.vy * 0.016; ctx.globalAlpha = 1 - q.t / q.life; ctx.fillStyle = q.color; ctx.fillRect(Math.round(q.x), Math.round(q.y), q.size, q.size); }
    ctx.globalAlpha = 1;
    G.particles = G.particles.filter(q => q.t < q.life);
    const ty = 14 + SAFE.t;
    drawText(ctx, 'WE\'RE HERE.', W / 2, ty, '#ff8a1f', W >= 240 ? 3 : W >= 150 ? 2 : 1, 'center', '#0b0914');
    drawText(ctx, 'LET THE HEXING BEGIN', W / 2, ty + 28, '#a97bf2', W >= 320 ? 2 : 1, 'center', '#0b0914');
    drawText(ctx, W >= 220 ? 'THE COVEN MADE IT TO SABBATH PEAK' : 'SABBATH PEAK REACHED', W / 2, ty + 48, '#f3eddd', 1, 'center', '#0b0914');
    drawText(ctx, 'SCORE ' + fmt(G.score), W / 2, ty + 60, '#ffe76b', 1, 'center', '#0b0914');
    drawText(ctx, 'HI ' + fmt(G.hi), W / 2, ty + 70, '#ffe76b', 1, 'center', '#0b0914');
    if (G.st > 2 && Math.floor(t * 2) % 2 === 0) drawText(ctx, W >= 200 ? 'PRESS START FOR LOOP ' + (G.loop + 1) : 'LOOP ' + (G.loop + 1) + ': TAP', W / 2, H - 20 - SAFE.b, '#9cf26a', 1, 'center', '#0b0914');
  }

  // ---------------------------------------------------------------- LOOP
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.1) dt = 0.1;
    if (dt < 0) dt = 0;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  resize();
  requestAnimationFrame(frame);

  window.GAME = G;
  G.jumpToStage = n => { if (!G.player) G.player = newPlayer(); G.stage = clamp(n, 0, STAGES.length - 1); beginStage(); };
})();
