/* ============================================================
   SIX ANGLES ON DRY WORLD -- combat.js
   arc-space physics, the six-shot cylinder, bounty waves.
   ============================================================ */
(function () {
  "use strict";
  const DRY = window.DRY, W = DRY.World, Art = DRY.Art, view = DRY.view;
  const C = {}; DRY.Combat = C;

  /* every entity lives in arc space: phi (world angle) + alt (px above crust) */
  function g() { return 1560 * view.unit; }

  C.KINDS = {
    tinker: { h: 74, hp: 1, speed: 96, points: 100, fire: [2.3, 1.4], wind: 0.62, range: 860, style: "tinker", name: "TINKER-BOOT" },
    powder: { h: 88, hp: 2, speed: 72, points: 150, fire: [3.2, 2.2], wind: 0.86, range: 640, style: "powder", name: "POWDER BOY" },
    acolyte: { h: 104, hp: 3, speed: 56, points: 300, fire: [2.9, 1.8], wind: 1.15, range: 720, style: "acolyte", name: "ASH ACOLYTE" },
    boss: { h: 112, hp: 34, speed: 44, points: 5000, fire: [1.9, 1.05], wind: 0.78, range: 980, style: "acolyte", name: "THE GRIM ARGUER" },
  };

  const L = { player: null, enemies: [], shots: [], bolts: [], timers: [], waveIndex: 0, score: 0, best: 0, combo: 0, comboTimer: 0, bestCombo: 0, kills: 0, ricochets: 0, bankedShots: 0 };
  C.L = L;

  C.reset = function () {
    L.shots.length = 0; L.enemies.length = 0; L.bolts.length = 0; L.timers.length = 0;
    L.waveIndex = 0; L.score = 0; L.combo = 0; L.comboTimer = 0; L.bestCombo = 0;
    L.kills = 0; L.ricochets = 0; L.bankedShots = 0;
    L.player = null;
    try {
      L.best = parseInt(window.localStorage.getItem("dryworld-best") || "0", 10) || 0;
    } catch (err) { L.best = parseInt(DRY.forgeBest || "0", 10) || 0; }
  };

  C.saveBest = function (score) {
    if (score > L.best) {
      L.best = score;
      try { window.localStorage.setItem("dryworld-best", String(score)); } catch (err) { DRY.forgeBest = String(score); }
    }
  };

  /* ---------- the gunman --------------------------------------------- */
  C.makePlayer = function () {
    const p = {
      phi: -Math.PI / 2, alt: 0, vAlt: 0, air: 0,
      aim: -0.5, facing: 1, walk: 0, coat: 0, hurt: 0, dashT: 0, invuln: 0,
      hide: 5, maxHide: 5, cylinder: 6, reload: 0, cool: 0, focus: 0, alive: true, dead: 0,
    };
    L.player = p;
    return p;
  };

  C.updatePlayer = function (dt, demo) {
    const p = L.player;
    if (!p || !p.alive) return;
    const R = view.R, u = view.unit;
    const input = DRY.input;
    let move = demo ? (demo.move !== undefined ? demo.move : 0) : input.moveAxis;

    /* the aim: mouse in screen space, or a scripted sweep for the attract loop */
    const origin = W.pointAt(p.phi, p.alt + 62 * u);
    if (demo && demo.aimTo) {
      const tgt = W.pointAt(demo.aimTo.phi, demo.aimTo.alt || 70 * u);
      p.targetAim = Math.atan2(tgt.y - origin.y, tgt.x - origin.x);
    } else if (input.mouseSeen) {
      p.targetAim = Math.atan2(input.my - origin.y, input.mx - origin.x);
    } else {
      p.targetAim = p.facing > 0 ? -0.35 : Math.PI + 0.35;
    }

    if (input.dashWish && !demo) doDash(p, move || p.facing);
    if (demo && demo.dash && p.dashT <= 0) doDash(p, move || p.facing);

    /* walk / air-strafe along the crust */
    const target = move * 268 * u * (p.dashT > 0 ? 2.9 : 1);
    p.vTan = DRY.damp(p.vTan || 0, target, p.dashT > 0 ? 24 : 12, dt);
    if (Math.abs(p.vTan) > 6) p.facing = p.vTan > 0 ? 1 : -1;
    p.phi += ((p.vTan || 0) / R) * dt;

    /* low-moon jump: a big floaty arc */
    const wantJump = demo ? !!demo.jump : input.jumpWish;
    if (wantJump && p.air <= 0) {
      p.vAlt = 700 * u; p.air = 0.34; p.alt = 1;
      W.puff(origin.x, view.groundY + 4, 0, 1, 8, { min: 40, max: 150, spread: 2.6, life: [0.2, 0.5], scale: 1.1 });
      DRY.Audio.click();
    }
    p.alt += p.vAlt * dt;
    if (p.alt > 0) { p.vAlt -= g() * dt; p.air = Math.max(0.02, p.air - dt); }
    if (p.alt <= 0) {
      if (p.vAlt < -190 * u) {
        W.puff(origin.x, view.groundY + 2, 0, 1, 7, { min: 40, max: 170, spread: 2.8, life: [0.2, 0.45] });
      }
      p.alt = 0; p.vAlt = 0; if (p.air > 0) { input.jumpWish = false; }
    }

    /* cylinder + reload */
    p.cool -= dt;
    if (p.reload > 0) { p.reload -= dt; if (p.reload <= 0) { p.reload = 0; p.cylinder = 6; DRY.Audio.cylClose(5); } }
    if (p.dashT > 0) p.dashT -= dt;
    if (p.invuln > 0) p.invuln -= dt;
    if (p.hurt > 0) p.hurt -= dt;
    if (p.reload < -900) p.reload = 0;
    if ((demo ? demo.fire : (input.firing || input.down("Space") || input.down("KeyJ"))) && p.cool <= 0 && p.reload <= 0 && p.cylinder > 0) {
      fire(p);
    }
    if ((demo ? !!demo.reload : (input.down("KeyR") || (p.cylinder === 0))) && p.reload <= 0 && p.cylinder < 6) startReload(p);

    /* focus: chain quickly or the crowd shrugs it off */
    if (L.comboTimer > 0) { L.comboTimer -= dt; if (L.comboTimer <= 0) L.combo = 0; }
    p.walk += Math.abs(p.vTan || 0) * dt * 0.115;
    p.coat += dt * (1.6 + Math.abs(p.vTan) / 220);
    if (Math.abs(p.vTan) > 40 && p.air <= 0 && DRY.rng.chance(Math.min(0.9, dt * 22))) {
      const foot = W.pointAt(p.phi, 0);
      W.puff(foot.x, foot.y, -p.facing * 0.6, -0.3, 1, { min: 20, max: 70, spread: 1.4, life: [0.18, 0.4], scale: 0.8 });
    }
    if (demo) demo.tick(dt);
  };

  function doDash(p, move) {
    p.dashT = 0.2; p.invuln = Math.max(p.invuln, 0.36);
    p.facing = move >= 0 ? 1 : -1;
    const back = W.pointAt(p.phi, p.alt + 40 * view.unit);
    W.puff(back.x, back.y, -p.facing, -0.25, 12, { min: 90, max: 330, spread: 1.1, life: [0.2, 0.5], kind: "shard", scale: 1.2 });
    DRY.Audio.click();
  }

  function startReload(p) {
    p.reload = 1.4;
    DRY.Audio.cylOpen();
    const o = W.pointAt(p.phi, p.alt + 92 * view.unit);
    W.callout("RELOAD", o.x, o.y - 6, { size: 18, life: 0.7 });
  }

  function fire(p) {
    p.cool = 0.19; p.cylinder -= 1;
    const tilt = p.phi + Math.PI / 2;
    /* the slug flies exactly where the arm is drawn (p.targetAim): no lagged pass */
    const aimL = (p.targetAim === undefined ? -0.4 : p.targetAim) - tilt;
    const u = 118 * view.unit;
    p.renderAim = aimL;                                   /* kept in sync for any reader */
    const dirScreen = tilt + aimL;
    const c = Math.cos(dirScreen), s = Math.sin(dirScreen);
    const origin = W.pointAt(p.phi, p.alt + 66 * view.unit);
    const mx = origin.x + c * u * 0.62, my = origin.y + s * u * 0.62;
    const spread = (DRY.rng() - 0.5) * (p.muzzleT > 1 ? 0.07 : 0.022);
    const speed = (p.heavyShot ? 2380 : 1990) * view.unit;
    const a = dirScreen + spread - p.phi;                 /* muzzle screen angle in the actor frame: sin -> along the arc, cos -> off the crust */
    L.shots.push({
      phi: p.phi, alt: Math.max(4, p.alt + 66 * view.unit),
      vAlt: Math.cos(a) * speed * 0.92,
      vx: Math.sin(a) * speed,
      life: 1.5, rico: !!p.heavyShot, chain: 0, owner: "player", x: mx, y: my, flash: 1, hitList: [],
    });
    W.puff(mx, my, c, s, p.heavyShot ? 12 : 7, { min: 130, max: 560, spread: 0.95, life: [0.1, 0.3], scale: 1.3 });
    W.puff(mx, my, c, s, 3, { min: 240, max: 700, spread: 1.3, kind: "shard", life: [0.15, 0.4] });
    W.shake(p.heavyShot ? 8 : 2.6);
    DRY.Audio.shoot(p.heavyShot);
    if (p.cylinder === 0) startReload(p);
    C.onPlayerShot = { x: mx, y: my, heavy: !!p.heavyShot };
  }

  /* ---------- bounty wave ------------------------------------------- */
  function queueSpawn(delay, kind, side) { L.timers.push({ t: delay, kind: kind, side: side }); }
  C.queueSpawn = queueSpawn;

  function chooseKind(w, spent) {
    if (w >= 4 && spent > w * 2.2 + 3 && DRY.rng.chance(0.32)) return "acolyte";
    if (spent > w + 1 && DRY.rng.chance(0.36)) return "powder";
    return "tinker";
  }

  C.spawnWave = function (index) {
    const w = DRY.clamp(index, 1, 8);
    const budget = Math.min(2 + index * 3, 20);
    let spent = 0, n = 0;
    while (spent < budget && n < 7) {
      const kind = chooseKind(w, spent);
      queueSpawn(0.6 + n * DRY.lerp(1.55, 0.85, w / 8) + DRY.rng() * 0.45, kind, DRY.rng() < 0.5 ? -1 : 1);
      spent += C.KINDS[kind].hp; n += 1;
    }
    return n;
  };

  C.spawnBoss = function () { queueSpawn(1.8, "boss", -1); return 1; };

  C.remaining = function () { return L.enemies.length + L.timers.length; };

  C.updateSpawns = function (dt) {
    for (let i = L.timers.length - 1; i >= 0; i -= 1) {
      const t = L.timers[i];
      t.t -= dt;
      if (t.t <= 0) { L.timers.splice(i, 1); spawnEnemy(t.kind, t.side); }
    }
  };

  function spawnEnemy(kind, side) {
    const def = C.KINDS[kind], R = view.R;
    const horizon = Math.asin(DRY.clamp(view.W * 0.6 / R, -1, 1));
    const dist = DRY.lerp(horizon + 0.26, horizon + 0.5, DRY.rng());
    const phi = (L.player ? L.player.phi : W.cam.phi) + side * dist;
    const e = {
      kind: kind, def: def, phi: phi, hp: def.hp, maxHp: def.hp, alt: 0, vAlt: 0, vTan: 0,
      walk: DRY.rng() * 6, fuseT: DRY.rng() * 3, fireIn: (side > 0 ? 1.4 : 0.8) + def.fire[0] * 0.4 * DRY.rng(),
      side: side, flash: 1, screenAim: 0, boss: kind === "boss", phase: 0, staggered: 0,
    };
    L.enemies.push(e);
    if (!e.boss) {
      const p = W.pointAt(phi, def.h * view.unit * 0.95);
      W.callout(def.name, DRY.clamp(p.x, 74, view.W - 74), p.y, { size: 15, life: 0.9 });
    }
    return e;
  }

  function pickTarget(e) {
    const p = L.player;
    if (!p || !p.alive) return null;
    let best = p;
    const escort = C.escort;
    if (escort && escort.alive) {
      const dp = arcDist(p.phi, e.phi), de = arcDist(escort.phi, e.phi);
      if (de < dp * 0.72) best = escort;
    }
    return best;
  }

  function arcDist(a, b) { return Math.abs(DRY.shortAngle(a, b)) * view.R; }
  C.arcDist = arcDist;

  /* ---------- enemy firepower --------------------------------------- */
  function enemyFire(e, origin) {
    const u = view.unit, R = view.R;
    const target = pickTarget(e);                     /* the gunman can die mid-frame */
    if (!target) return;
    const aimL = (e.screenAim || 0);
    const tilt = e.phi + Math.PI / 2;
    if (e.kind === "powder") {
      const t = DRY.clamp(arcDist(e.phi, target.phi) / (250 * u), 0.75, 2.4);
      const dirSign = DRY.sign(target.phi - e.phi) || 1;
      L.bolts.push({
        kind: "crate", phi: e.phi, alt: 34 * u, x: origin.x, y: origin.y,
        vxT: dirSign * arcDist(e.phi, target.phi) / t,      /* tangential px/s */
        vAlt: 0.5 * CRATE_G * u * t + (260 + 140 * DRY.rng()) * u,   /* lob apex scales with time */
        life: t + 0.5, fuse: t + 0.28, spin: (DRY.rng() - 0.5) * 12, rot: 0, hitList: [],
      });
      DRY.Audio.click();
      W.callout("POWDER!", DRY.clamp(origin.x, 90, view.W - 90), origin.y - 40 * u, { size: 16, life: 0.7, danger: true });
      return;
    }
    const dirScreen = tilt + aimL + (DRY.rng() - 0.5) * 0.06;
    const c = Math.cos(dirScreen), s = Math.sin(dirScreen);
    const speed = (e.kind === "acolyte" ? 1240 : 1130) * u;
    const a = dirScreen + (DRY.rng() - 0.5) * 0.07 - e.phi;   /* muzzle screen angle in the actor frame: sin -> along the arc, cos -> off the crust */
    L.shots.push({
      phi: e.phi, alt: 60 * u, vx: Math.sin(a) * speed, vAlt: Math.cos(a) * speed,
      life: 1.2, owner: "enemy", kindName: e.kind, x: origin.x + c * 34 * u, y: origin.y + s * 34 * u, flash: 1, hitList: [],
    });
    W.puff(origin.x + c * 34 * u, origin.y + s * 34 * u, c, s, 4, { min: 90, max: 280, spread: 1.1, life: [0.08, 0.24] });
    if (e.boss) W.shake(3);
    DRY.Audio.shoot(false);
  }

  /* ---------- projectiles ------------------------------------------- */
  const BULLET_G = 250;             /* slugs drop a little: banking shots is a skill */
  const CRATE_G = 1350;

  function pointOfPhiAlt(phi, alt) { return W.pointAt(phi, alt); }

  /* does the segment (x1,y1)-(x2,y2) touch the circle? keeps fast slugs honest */
  function segCircle(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((cx - x1) * dx + (cy - y1) * dy) / len2 : 0;
    t = DRY.clamp(t, 0, 1);
    const ex = cx - (x1 + dx * t), ey = cy - (y1 + dy * t);
    return ex * ex + ey * ey <= r * r;
  }

  C.updateShots = function (dt) {
    const R = view.R, u = view.unit;
    for (let i = L.shots.length - 1; i >= 0; i -= 1) {
      const s = L.shots[i];
      s.life -= dt;
      if (s.flash > 0) s.flash -= dt * 8;
      const prevX = s.x, prevY = s.y;
      const speedPx = Math.hypot(s.vx, s.vAlt);
      s.phi += (s.vx / R) * dt;                             /* tangential travel along the arc */
      s.alt += s.vAlt * dt;
      if (s.alt > 0) s.vAlt -= BULLET_G * u * dt * (s.owner === "player" ? 1 : 0.6);
      const p = pointOfPhiAlt(s.phi, Math.max(0, s.alt));
      s.x = p.x; s.y = p.y;
      /* segment-vs-target so fast bullets cannot tunnel */
      let done = false;
      if (s.owner === "player") {
        for (let j = L.enemies.length - 1; j >= 0 && !done; j -= 1) {
          const e = L.enemies[j];
          if (e.staggered > 0.25 || s.hitList.indexOf(e) >= 0) continue;
          const hgt = C.KINDS[e.kind].h * u;
          const cx = W.pointAt(e.phi, Math.max(0, e.alt) + hgt * 0.5);
          if (segCircle(prevX, prevY, s.x, s.y, cx.x, cx.y, hgt * (e.boss ? 0.42 : 0.3))) {
            hitEnemy(e, s);
            s.hitList.push(e);
            if (!s.rico) done = true;
          }
        }
      } else if (L.player && L.player.alive && L.player.invuln <= 0) {
        const cp = pointOfPhiAlt(L.player.phi, Math.max(0, L.player.alt) + 62 * u);
        if (segCircle(prevX, prevY, s.x, s.y, cp.x, cp.y, 44 * u)) {
          hurtPlayer(1, null, s);
          done = true;
        }
      }
      /* the crust: bullets either bank off it or die in the dust */
      if (!done && s.alt <= 0) {
        const impact = pointOfPhiAlt(s.phi, 0);
        if (s.rico && s.owner === "player") {              /* the one-in-six bank shot keeps flying */
          C.bounceShot(s, impact.x, impact.y);
        } else {
          W.puff(impact.x, impact.y, DRY.sign(s.vx || 1), -0.6, 7, { min: 60, max: 240, spread: 1.9, life: [0.15, 0.4], scale: 0.9 });
          done = true;
        }
      }
      if (done || s.life <= 0) L.shots.splice(i, 1);
    }
  };

  /* a banked slug keeps flying along the moon: it can walk into a bounty */
  C.bounceShot = function (s, x, y) {
    const u = view.unit;
    s.alt = 16 * u;
    s.vAlt = 250 * u;
    s.vx = (s.vx >= 0 ? 1 : -1) * Math.max(900 * u, Math.abs(s.vx) * 0.82);
    s.life = 1.1;
    s.chain = (s.chain || 0) + 1;
    s.rico = s.chain < 2;                                     /* a slug may walk the crust twice, no more */
    W.puff(x, y, DRY.sign(s.vx), -0.35, 9, { min: 120, max: 460, spread: 1.5, life: [0.15, 0.4], kind: "shard", scale: 1.2 });
    W.puff(x, y, 0, -1, 5, { min: 60, max: 200, spread: 3, life: [0.2, 0.5] });
    if (s.chain === 1) {
      L.bankedShots += 1;
      W.callout("BANK SHOT", DRY.clamp(x, 90, view.W - 90), y - 46 * u, { size: 20, life: 0.8 });
    }
    C.onBank = (C.onBank || 0) + 1;
  };

  function hitEnemy(e, s) {
    const u = view.unit;
    e.hp -= 1; e.flash = 1; e.staggered = Math.max(e.staggered, 0.2);
    const p = W.pointAt(e.phi, Math.max(0, e.alt) + C.KINDS[e.kind].h * u * 0.55);
    W.puff(p.x, p.y, DRY.sign(s.vx || 1), -0.4, 8, { min: 90, max: 340, spread: 1.6, life: [0.12, 0.36], kind: "shard", scale: 1.1 });
    W.shake(e.boss ? 4 : 2);
    if (e.kind === "powder" && e.hp <= 0) { detonate(e); return; }
    if (e.hp <= 0) killEnemy(e, s.chain || 0);
    else DRY.Audio.kill(0);
    if (s.rico && s.chain > 0) registerCombo();
  }

  /* ---------- dying, scoring, chains -------------------------------- */
  function registerCombo() {
    L.combo += 1;
    L.bestCombo = Math.max(L.bestCombo, L.combo);
    L.comboTimer = 3.6;
  }

  function addScore(base, x, y, tag) {
    const mult = 1 + Math.min(L.combo, 12) * 0.25;
    const gain = Math.round(base * mult);
    L.score += gain;
    if (L.best < L.score) C.saveBest(L.score);
    W.callout("+" + gain, x, y, { size: 20, life: 0.8 });
    if (tag) W.callout(tag, x, y - 30 * view.unit, { size: 15, life: 0.95, danger: true });
    return gain;
  }

  function killEnemy(e, bankChain) {
    const u = view.unit;
    const p = W.pointAt(e.phi, Math.max(0, e.alt) + C.KINDS[e.kind].h * u * 0.5);
    e.dead = true;
    L.kills += 1;
    registerCombo();
    let pts = C.KINDS[e.kind].points;
    if (bankChain > 0) {
      pts *= Math.pow(2, bankChain);
      L.ricochets += 1;
      W.puff(p.x, p.y, 0, -1, 14, { min: 160, max: 700, spread: 6.28, life: [0.2, 0.6], kind: "star", scale: 1.5 });
      addScore(pts, p.x, p.y - 34 * u, bankChain > 1 ? "MULTI-BANK x" + (bankChain + 1) : "BANK HIT");
    } else {
      addScore(pts, p.x, p.y - 24 * u);
    }
    W.puff(p.x, p.y, 0, -1, e.boss ? 58 : 22, { min: 80, max: e.boss ? 900 : 520, spread: 6.28, life: [0.25, 0.9], kind: "shard", scale: e.boss ? 1.9 : 1.3 });
    W.puff(p.x, p.y, 0, -0.4, 10, { min: 40, max: 260, spread: 3.4, life: [0.3, 0.8] });
    W.shake(e.boss ? 22 : (5 + C.KINDS[e.kind].hp * 1.5));
    DRY.Audio.kill(L.combo);
    if (e.boss) { L.bossDown = true; }
  }

  function detonateChain(e) {
    if (e.chainBoom) return;
    e.chainBoom = true;
    const p0 = W.pointAt(e.phi, Math.max(0, e.alt));
    W.puff(p0.x, p0.y - 24 * view.unit, 0, -1, 30, { min: 100, max: 700, spread: 6.28, life: [0.2, 0.7], kind: "star", scale: 1.6 });
    killEnemy(e, 2);
  }

  function detonate(e) {
    const u = view.unit, R = view.R;
    const p0 = W.pointAt(e.phi, Math.max(0, e.alt));
    const blastArc = (250 * u) / R;
    W.puff(p0.x, p0.y - 30 * u, 0, -1, 44, { min: 120, max: 900, spread: 6.28, life: [0.25, 0.8], kind: "star", scale: 2 });
    W.shake(20);
    DRY.Audio.hurt();
    for (let i = L.enemies.length - 1; i >= 0; i -= 1) {
      const o = L.enemies[i];
      if (o === e || o.dead) continue;
      if (Math.abs(DRY.shortAngle(o.phi, e.phi)) < blastArc) {
        o.hp -= 2; o.flash = 1; o.staggered = 0.45;
        const pp = W.pointAt(o.phi, Math.max(0, o.alt) + C.KINDS[o.kind].h * u * 0.5);
        if (o.hp <= 0) { if (o.kind === "powder") detonateChain(o); else killEnemy(o, 1); }
        else W.puff(pp.x, pp.y, 0, -0.6, 7, { min: 90, max: 320, spread: 2, life: [0.15, 0.4], kind: "shard" });
      }
    }
    if (L.player && L.player.alive && Math.abs(DRY.shortAngle(L.player.phi, e.phi)) * R < 250 * u) hurtPlayer(1, e);
    e.dead = true;
    addScore(C.KINDS.powder.points * 2, p0.x, p0.y - 60 * u, "POWDER CHAIN");
  }

  function hurtPlayer(amount, source, shot) {
    const p = L.player;
    if (!p || !p.alive || p.invuln > 0 || p.dashT > 0) return false;
    p.hide -= amount;
    p.hurt = 0.55; p.invuln = 1.05;
    const o = W.pointAt(p.phi, p.alt + 62 * view.unit);
    const dirX = source ? DRY.sign(o.x - W.pointAt(source.phi || p.phi, 40).x) : (shot ? DRY.sign(-(shot.vx || 1)) : 1);
    W.puff(o.x, o.y, dirX || 1, -0.3, 16, { min: 90, max: 420, spread: 2.2, life: [0.2, 0.6], kind: "shard", scale: 1.2 });
    W.shake(14);
    L.combo = 0; L.comboTimer = 0; C.flash = 0.5;
    DRY.Audio.hurt();
    if (C.escort && C.escort.alive) { C.escort.spooked = 1.2; C.sayLine("duck"); }
    if (p.hide <= 0) {
      p.hide = 0; p.alive = false; p.dead = 0;
      W.puff(o.x, o.y, 0, -1, 46, { min: 120, max: 800, spread: 6.28, life: [0.3, 1], kind: "shard", scale: 1.7 });
      W.shake(26);
    }
    return true;
  }
  C.hurtPlayer = hurtPlayer;

  /* ---------- thrown powder crates ---------------------------------- */
  C.updateBolts = function (dt) {
    const u = view.unit, R = view.R;
    for (let i = L.bolts.length - 1; i >= 0; i -= 1) {
      const b = L.bolts[i];
      b.life -= dt; b.fuse -= dt; b.rot += b.spin * dt;
      b.phi += (b.vxT / R) * dt;
      b.alt += b.vAlt * dt;
      b.vAlt -= CRATE_G * u * dt;
      if (b.alt <= 0) { b.alt = 0; explodeCrate(b); }
      else if (b.fuse <= 0 || b.life <= 0) explodeCrate(b);
      if (!b.dead && L.player && L.player.alive && L.player.invuln <= 0) {
        const dArc = Math.abs(DRY.shortAngle(b.phi, L.player.phi)) * R;
        if (dArc < 46 * u && b.alt < 150 * u && b.alt > -20) hurtPlayer(1, null, { vx: b.vxT });
      }
      if (b.dead || b.life <= 0) L.bolts.splice(i, 1);
    }
  };

  function explodeCrate(b) {
    const u = view.unit, R = view.R;
    const p0 = W.pointAt(b.phi, Math.max(0, b.alt));
    b.dead = true;
    W.puff(p0.x, p0.y - 12 * u, 0, -1, 34, { min: 90, max: 640, spread: 6.28, life: [0.2, 0.7], kind: "star", scale: 1.5 });
    W.puff(p0.x, p0.y - 8 * u, 0, -0.6, 14, { min: 60, max: 340, spread: 4, life: [0.25, 0.7], kind: "shard" });
    W.shake(13);
    DRY.Audio.hurt();
    if (L.player && L.player.alive && Math.abs(DRY.shortAngle(b.phi, L.player.phi)) * R < 190 * u) hurtPlayer(1, null, { vx: b.vxT });
  }

  /* ---------- the kid with the placard ------------------------------- */
  const CHATTER = {
    hello: ["TWELVE DUELS SCHEDULED.", "HOLD THE LINE PLEASE.", "I BROKE TWO PLACARDS.", "STAY ON THE MOON, EVERYONE."],
    warn: ["THAT ONE HAS FUSES.", "HOODS ON THE HORIZON!", "MORE CAME OVER THE CURVE!", "COUNTING SLOWLY: SEVEN!"],
    duck: ["DUCK IS NOT OPTIONAL.", "BEHIND YOU. BEHIND YOU!", "THAT WAS NOT A CRATE OF TEA."],
    praise: ["NICE BANK.", "HE DID IT TWICE.", "THE PLACARD APPROVES.", "FOUR IN A ROW?!"],
  };

  C.initEscort = function () {
    C.escort = { phi: (L.player ? L.player.phi : W.cam.phi) + 0.3, alt: 0, vTan: 0, walk: 1.2, gesture: 0, placard: 0, alive: true, side: 1, talkT: 2.4, spooked: 0 };
    return C.escort;
  };

  C.sayLine = function (kind) {
    const e = C.escort;
    if (!e || !e.alive) return null;
    const list = CHATTER[kind] || CHATTER.hello;
    const line = DRY.rng.pick(list);
    const p = W.pointAt(e.phi, 150 * view.unit);
    W.callout(line, DRY.clamp(p.x, 92, view.W - 92), p.y, { size: 14, life: 1.7 });
    DRY.Audio.chatter(kind === "warn" ? 640 : kind === "duck" ? 380 : 520);
    return line;
  };

  C.updateEscort = function (dt) {
    const e = C.escort, p = L.player, u = view.unit;
    if (!e || !p) return;
    let side = e.side;
    const offsetArc = DRY.clamp(165 * u / view.R, 0.03, 0.4);
    for (let i = 0; i < L.enemies.length; i += 1) {
      if (Math.abs(DRY.shortAngle(L.enemies[i].phi, p.phi + side * offsetArc)) * view.R < 250 * u) { side = -side; break; }
    }
    e.side = side;
    const wantPhi = p.phi + side * offsetArc;
    const diff = DRY.shortAngle(e.phi, wantPhi);
    e.vTan = DRY.damp(e.vTan || 0, DRY.clamp(diff * 26 * u, -300 * u, 300 * u), 9, dt);
    e.phi += (e.vTan / view.R) * dt;
    e.walk += Math.abs(e.vTan) * dt * 0.1 + dt * 2;
    e.placard = Math.sin(e.walk * 0.6) * 0.14;
    e.gesture += dt * (e.spooked > 0 ? 9 : 2.4);
    if (e.spooked > 0) {
      e.spooked -= dt;
      if (DRY.rng.chance(dt * 7)) {
        const pt = W.pointAt(e.phi, 36 * u);
        W.puff(pt.x, pt.y, DRY.sign(-e.vTan || 1), -1, 2, { min: 50, max: 190, spread: 2.4, life: [0.15, 0.4] });
      }
    }
    e.talkT -= dt;
    if (e.talkT <= 0) {
      e.talkT = DRY.lerp(3.8, 8, DRY.rng());
      let kind = "hello";
      const threats = C.remaining();
      for (let i = 0; i < L.enemies.length; i += 1) if (L.enemies[i].kind === "powder") { kind = "warn"; break; }
      if (kind !== "warn" && threats >= 5) kind = "warn";
      else if (L.combo > 3) kind = "praise";
      C.sayLine(kind);
    }
  };

  /* ---------- the bounty crowd walks the arc ------------------------ */
  function wrapPi(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  C.wrapAngle = wrapPi;

  /* how far off-level, in the actor's own frame, a muzzle has to be to
     hit the player from this bounty's perch. used for both aiming and
     for deciding when it is worth shooting at all. */
  function aimAt(e, target, origin) {
    const u = view.unit;
    const foot = W.pointAt(target.phi, Math.max(0, target.alt || 0));
    let best = null;
    const samples = [62 * u, 40 * u];
    for (let i = 0; i < samples.length; i += 1) {
      const t = W.pointAt(target.phi, Math.max(0, target.alt || 0) + samples[i]);
      const a = Math.atan2(t.y - origin.y, t.x - origin.x);
      if (best === null || Math.abs(wrapPi(a)) < Math.abs(wrapPi(best))) best = a;
    }
    return { screen: best, local: wrapPi(best - (e.phi + Math.PI / 2)), foot: foot };
  }

  C.updateEnemies = function (dt) {
    const u = view.unit, R = view.R;
    for (let i = 0; i < L.enemies.length; i += 1) {
      const e = L.enemies[i];
      if (e.dead) continue;
      const def = C.KINDS[e.kind];

      /* a hit bounty stops dead for a beat -- that is the bank-shot window */
      if (e.staggered > 0) e.staggered -= dt;
      if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 4.5);
      const frozen = e.staggered > 0.25;

      /* walk the crust: close to duelling range, then shuffle in it */
      const target = pickTarget(e) || L.player;
      let wantV = 0;
      if (target) {
        const toTarget = DRY.shortAngle(e.phi, target.phi);
        const arc = Math.abs(toTarget) * R;
        const hold = def.range * u * 0.72;
        const dir = DRY.sign(toTarget) || 1;
        e.side = -dir;                                   /* which way is home */
        if (arc > hold) wantV = dir * def.speed * u;
        else if (arc < hold * 0.55) wantV = -dir * def.speed * u * 0.7;
        else {
          e.fuseT += dt;
          wantV = Math.sin(e.fuseT * 0.8 + e.walk * 0.12) * def.speed * u * 0.55;
        }
      }
      if (e.boss && !frozen) {
        /* the Grim Arguer never stops coming, and argues in phases */
        const frac = e.hp / e.maxHp;
        const phase = frac < 0.34 ? 2 : frac < 0.7 ? 1 : 0;
        if (phase !== e.phase) {
          e.phase = phase;
          e.staggered = 0.55;                             /* a beat of rage */
          W.callout(phase === 2 ? "ARGUMENT FINISHED" : "ARGUES BACK",
            DRY.clamp(W.pointAt(e.phi, def.h * u).x, 110, view.W - 110),
            W.pointAt(e.phi, def.h * u * 1.25).y, { size: 18, life: 1, danger: true });
          W.shake(9);
        }
        wantV = (target ? DRY.sign(DRY.shortAngle(e.phi, target.phi)) || 1 : 1) * def.speed * u * (1 + phase * 0.42);
      }
      const maxV = def.speed * u * 2;
      e.vTan = DRY.damp(e.vTan || 0, frozen ? 0 : DRY.clamp(wantV, -maxV, maxV), 7, dt);
      e.phi += (e.vTan / R) * dt;
      e.walk += Math.abs(e.vTan) * dt * 0.1 + dt * (e.boss ? 2.4 : 3.4);

      /* aim: tracked in screen space first, then handed to the actor frame */
      if (!target) continue;
      const origin = W.pointAt(e.phi, (e.kind === "powder" ? 96 : def.h * 0.62) * u);
      const a = aimAt(e, target, origin);
      /* short-range powder boys lob regardless of the level line */
      const arcToTarget = Math.abs(DRY.shortAngle(e.phi, target.phi)) * R;
      const flatOk = e.kind === "powder" || arcToTarget < 150 * u;
      if (!frozen) {
        const trackSpeed = e.boss ? 9 : (e.kind === "acolyte" ? 7.2 : 8.4);
        /* e.screenAim stores the aim in the actor frame (a.local); damp along the
           shortest arc so the arm never sweeps the long way round the seam */
        const dAim = e.screenAim === undefined ? 0 : DRY.shortAngle(e.screenAim, a.local);
        e.screenAim = e.screenAim === undefined ? a.local : e.screenAim + dAim * (1 - Math.exp(-(Math.abs(dAim) > 1.6 ? trackSpeed * 2.4 : trackSpeed) * dt));
      }

      /* fire when the aim is roughly level and inside the reach of whatever they carry.
         level = local aim near the tangent (0 or +/-PI in the actor frame). the +/-PI/2
         local angles are radial (sky up / crust down) and were what this gate used to
         test, so level targets never got shot. */
      const levelOk = Math.abs(DRY.shortAngle(a.local, 0)) < 0.42 || Math.abs(DRY.shortAngle(a.local, Math.PI)) < 0.42;
      const rate = (e.boss && e.phase === 2) ? 1.7 : 1;
      e.fireIn -= dt * rate;
      const reach = def.range * u;
      const volleyLeft = e.volleyLeft || 0;
      if (!frozen && e.fireIn <= 0 && volleyLeft > 0) {
        e.screenAim = a.local;                            /* volley shots snap level */
        enemyFire(e, origin);
        e.volleyLeft = volleyLeft - 1;
        e.fireIn = e.boss ? 0.22 : 0.34;
      } else if (!frozen && e.fireIn <= 0 && arcToTarget < reach && (flatOk || levelOk)) {
        e.screenAim = a.local;                            /* the first of a volley */
        enemyFire(e, origin);
        e.volleyLeft = (e.kind === "acolyte" || e.boss ? 2 : 1) - 1;
        const cadence = DRY.lerp(def.fire[0], def.fire[1], DRY.rng());
        e.fireIn = (e.boss && e.phase > 0 ? cadence / (1 + e.phase * 0.35) : cadence) * DRY.lerp(0.8, 1.25, DRY.rng());
      } else if (!frozen && e.fireIn <= 0) {
        e.fireIn = 0.16;                                   /* still lining it up */
      }

      /* powder boys: the fuse on their back hisses as they get close */
      if (e.kind === "powder") {
        e.fuseT += dt;
        C.warnCool = Math.max(0, (C.warnCool || 0) - dt);
        if (arcToTarget < 320 * u && C.warnCool <= 0) {
          C.warnCool = DRY.lerp(6, 12, DRY.rng());
          C.sayLine("warn");
        }
      }
    }
  };


  /* ---------- removals ---------------------------------------------- */
  C.cleanup = function () {
    for (let i = L.enemies.length - 1; i >= 0; i -= 1) if (L.enemies[i].dead || L.enemies[i].hp <= 0) L.enemies.splice(i, 1);
    for (let i = L.bolts.length - 1; i >= 0; i -= 1) if (L.bolts[i].dead || L.bolts[i].life <= 0) L.bolts.splice(i, 1);
  };




})();
