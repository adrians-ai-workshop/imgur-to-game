/* ============================================================
   SIX ANGLES ON DRY WORLD -- game.js
   the panel loop: attract, duel cards, play, held panels, tally.
   ============================================================ */
(function () {
  "use strict";
  const DRY = window.DRY, W = DRY.World, Art = DRY.Art, C = DRY.Combat, U = DRY.UI, view = DRY.view;
  const ctx = DRY.ctx, input = DRY.input, L = C.L;

  const TOTAL_DUELS = 12;
  const CARD_TIME = 1.9;

  const G = { state: "boot", duel: 1, cardT: 0, overT: 0, won: false, t: 0, speedT: 0, demo: null };
  DRY.game = G;

  /* ---------- HUD ---------------------------------------------------- */
  const hudState = { duel: 1, score: 0, best: 0, combo: 0, focus: 0, player: null };
  function pushHud() {
    hudState.duel = DRY.clamp(G.duel, 1, TOTAL_DUELS);
    hudState.score = L.score;
    hudState.best = Math.max(L.best, L.score);
    hudState.combo = L.combo;
    hudState.focus = DRY.clamp(Math.max(L.combo / 8, L.comboTimer / 3.6), 0, 1);
    hudState.player = L.player;
    U.hud(hudState);
  }

  /* ---------- the attract-mode autopilot ---------------------------- */
  /* it walks the arc, shoots at whatever wanders in, hops now and then */
  function makeDemo() {
    const d = { move: 0, jump: false, fire: false, reload: false, dash: false, aimTo: null };
    d.think = 0; d.spawnT = 1.4; d.hopT = 2.6 + DRY.rng() * 3; d.side = 1; d.wantPhi = -Math.PI / 2;
    d.tick = function (dt) {
      const p = L.player, u = view.unit, R = view.R;
      if (!p) return;

      /* keep one or two bounties walking in the background */
      d.spawnT -= dt;
      if (d.spawnT <= 0 && L.enemies.length < 2) {
        d.spawnT = DRY.lerp(1.8, 3.4, DRY.rng());
        const side = DRY.rng() < 0.5 ? -1 : 1;
        C.queueSpawn(0.2 + DRY.rng() * 0.6, "tinker", side);
      }

      /* nearest bounty in front of us */
      let best = null, bestArc = 1e9;
      for (let i = 0; i < L.enemies.length; i += 1) {
        const e = L.enemies[i];
        if (e.dead) continue;
        const arc = Math.abs(DRY.shortAngle(p.phi, e.phi)) * R;
        if (arc < bestArc) { bestArc = arc; best = e; }
      }

      d.hopT -= dt;
      let hop = false;
      if (d.hopT <= 0) { d.hopT = DRY.lerp(2.4, 5.5, DRY.rng()); hop = true; }
      const boltNear = L.bolts.length > 0;
      d.jump = hop || boltNear;

      if (best) {
        const def = C.KINDS[best.kind];
        const toE = DRY.shortAngle(p.phi, best.phi);
        const dir = DRY.sign(toE) || 1;
        const arc = Math.abs(toE) * R;
        /* stand off a little so the shot reads on screen */
        if (arc > 420 * u) d.move = dir * 0.55; else if (arc < 240 * u) d.move = -dir * 0.7; else d.move = 0;
        d.aimTo = { phi: best.phi, alt: Math.max(0, best.alt || 0) + def.h * u * 0.5 };
        d.fire = arc < 900 * u;
      } else {
        /* patrol the face of the moon */
        d.think -= dt;
        if (d.think <= 0) { d.think = DRY.lerp(2.4, 5, DRY.rng()); d.wantPhi = p.phi + DRY.sign(d.side || 1) * DRY.lerp(0.25, 0.7, DRY.rng()) * (d.side || 1); d.side = -d.side; }
        const drift = DRY.shortAngle(p.phi, d.wantPhi);
        d.move = Math.abs(drift) < 0.02 ? 0 : DRY.sign(drift);
        d.aimTo = null;
        d.fire = false;
      }
      if (p.cool <= 0 && p.reload > 0) d.fire = false;
    };
    return d;
  }

  /* ---------- state transitions ------------------------------------- */
  function toAttract() {
    C.reset(); W.resetParts(); W.resetCamera(-Math.PI / 2);
    const p = C.makePlayer();
    p.phi = -Math.PI / 2;
    G.demo = makeDemo();
    G.duel = 1; G.state = "attract"; G.overT = 0; G.won = false;
    U.attract();
    pushHud();
  }

  function startRun() {
    C.reset(); W.resetParts();
    const p = C.makePlayer();
    p.phi = -Math.PI / 2; p.alt = 0;
    W.resetCamera(p.phi);
    G.demo = null;
    G.duel = 1; G.won = false; G.overT = 0;
    beginCard(CARD_TIME + 0.5);
    DRY.Audio.uiBlip(true);
    pushHud();
  }

  function isBossDuel() { return G.duel >= TOTAL_DUELS; }

  function beginCard(seconds) {
    G.state = "card";
    G.cardT = seconds || CARD_TIME;
    U.duelCard(G.duel, TOTAL_DUELS, isBossDuel(), G.cardT);
    if (C.escort && C.escort.alive) C.sayLine("hello");
    DRY.Audio.uiBlip(false);
  }

  function beginPlay() {
    G.state = "play";
    U.clearPanel();
    const p = L.player;
    if (p) { p.cylinder = 6; p.reload = 0; p.hide = Math.max(p.hide, 1); }
    if (!C.escort || !C.escort.alive) C.initEscort();
    if (isBossDuel()) {
      C.spawnBoss();
      G.speedT = 1.1;
      W.shake(10);
      DRY.Audio.uiBlip(true);
    } else {
      C.spawnWave(G.duel);
    }
    L.waveIndex = G.duel;
  }

  function duelCleared() {
    G.duel += 1;
    if (G.duel > TOTAL_DUELS) { G.duel = TOTAL_DUELS; finishRun(true); return; }
    const p = L.player;
    if (p) { p.cylinder = 6; p.reload = 0; if (p.hide < p.maxHide) p.hide += 1; }
    beginCard(CARD_TIME);
  }

  function finishRun(won) {
    G.state = "results";
    G.won = !!won;
    G.overT = won ? 2.1 : 1.9;                       /* held before the panel lands */
    resultsShown = false;
    U.clearPanel();
    G.speedT = won ? 1.4 : 0;
    W.shake(won ? 6 : 18);
    DRY.Audio.uiBlip(won);
    pushHud();
  }

  /* ---------- held panels ------------------------------------------- */
  let resumeTo = "play";
  function pauseGame() {
    if (G.state === "paused" || G.state === "results" || G.state === "boot") return;
    resumeTo = G.state;
    G.state = "paused";
    U.pause(DRY.Audio.muted);
  }
  function resumeGame() {
    G.state = resumeTo;
    input.clear();
    if (G.state === "card") U.duelCard(G.duel, TOTAL_DUELS, isBossDuel(), G.cardT);
    else U.clearPanel();
    DRY.Audio.uiBlip(false);
  }

  /* ---------- global keys ------------------------------------------- */
  function globalInput() {
    if (input.muteWish) {
      input.muteWish = false;
      DRY.Audio.setMuted(!DRY.Audio.muted);
      if (G.state === "paused") U.pause(DRY.Audio.muted);
    }
    if (input.pauseWish) {
      input.pauseWish = false;
      if (G.state === "paused") resumeGame();
      else if (G.state === "results") toAttract();          /* Escape on the tally: back to the title */
      else pauseGame();
    }
    if (G.state === "paused" && input.down("KeyT")) { toAttract(); return; }

    /* confirm advances the attract screen and the tally */
    if (input.confirmWish) {
      if (G.state === "attract") { startRun(); input.confirmWish = false; }
      else if (G.state === "results" && G.overT > 0) {
        G.overT = 0.016;                                 /* impatient: jump straight to the numbers */
        input.confirmWish = false;
      } else if (G.state === "results") {
        if (input.down("Escape")) toAttract(); else startRun();
        input.confirmWish = false;
      }
    }
  }

  /* ---------- per-state updates ------------------------------------- */
  function updateWorld(dt, demo) {
    const p = L.player;
    if (!p) return;

    C.updatePlayer(dt, demo);
    C.updateSpawns(dt);
    C.updateEnemies(dt);
    C.updateShots(dt);
    C.updateBolts(dt);
    C.updateEscort(dt);
    C.cleanup();
    W.updateParts(dt);

    /* the sixth chamber is the bank shot: load it as we come up on it */
    p.heavyShot = (p.reload <= 0 && p.cylinder === 1);

    const lean = DRY.clamp((p.vTan || 0) / (320 * view.unit), -1, 1) * 26;
    W.followCamera(p.phi, lean, dt);

    if (!p.alive) {
      p.dead += dt;
      if (p.dead > 1.5 && G.state === "play") finishRun(false);
    } else if (G.state === "play" && C.remaining() === 0) {
      G.clearT = (G.clearT || 0) + dt;
      if (L.bossDown) { G.bossT = (G.bossT || 0) + dt; if (G.bossT > 1.8) finishRun(true); }
      else if (G.clearT > 0.85) { G.clearT = 0; duelCleared(); }
    }
  }

  function update(dt) {
    globalInput();

    if (G.state === "attract") {
      const p = L.player;
      if (p) p.hide = p.maxHide;                        /* the demo gunman cannot die */
      updateWorld(dt, G.demo);
      if (p && !p.alive) { toAttract(); return; }
      if (input.confirmWish) startRun();
    } else if (G.state === "card") {
      const p = L.player;
      if (!p || p.alive) updateWorld(dt, null);         /* stretch the legs between duels */
      G.cardT -= dt;
      U.cardCountdown(Math.max(0, G.cardT));
      if (G.cardT <= 0) beginPlay();
    } else if (G.state === "play") {
      updateWorld(dt, null);                          /* runs on: bullets and the escort still move as he dies */
    } else if (G.state === "results") {
      W.updateParts(dt);
      C.updateEnemies(dt * 0.25);
      C.cleanup();
      const p = L.player;
      if (p) W.followCamera(p.phi, 0, dt);
      if (G.overT > 0) {
        G.overT -= dt;
        if (G.overT <= 0) showResults();
      }
    } else if (G.state === "paused") {
      /* a held panel: nothing moves */
    }

    if (input.confirmWish && (G.state === "card" || G.state === "play")) input.confirmWish = false;
  }

  let resultsShown = false;
  function showResults() {
    U.results({
      won: G.won, score: L.score, best: Math.max(L.best, L.score), kills: L.kills,
      banked: L.bankedShots, bestCombo: L.bestCombo,
    });
    resultsShown = true;
  }

  /* ---------- drawing ------------------------------------------------- */
  /* an actor stands on the crust with its local -y pointing off the moon.
     flip it when it must look back along decreasing phi, mirroring the aim. */
  function drawActor(fnName, phi, alt, flip, args) {
    const pt = W.pointAt(phi, Math.max(0, alt || 0));
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(phi + Math.PI / 2);
    if (flip) { ctx.scale(-1, 1); args.aim = -(args.aim || 0); }
    const m = Art[fnName](ctx, args);
    ctx.restore();
    return m;
  }

  /* the flash that makes a bullet read on black-and-white paper */
  function slugTrail(s) {
    const u = view.unit, phi = s.phi;
    const tx = -Math.sin(phi), ty = Math.cos(phi);          /* along increasing phi */
    const nx = Math.cos(phi), ny = Math.sin(phi);           /* away from the core   */
    let dx = tx * DRY.sign(s.vx || 1) + nx * DRY.sign(s.vAlt || 1);
    let dy = ty * DRY.sign(s.vx || 1) + ny * DRY.sign(s.vAlt || 1);
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const tail = (s.rico ? 42 : 26) * u;
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = Art.INK;
    ctx.lineWidth = (s.owner === "enemy" ? 1.9 : 2.5) * u;
    ctx.globalAlpha = DRY.clamp(s.life * 2.4, 0.35, 1);
    ctx.beginPath();
    ctx.moveTo(s.x - dx * tail, s.y - dy * tail);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
    if (s.flash > 0) {                                      /* the shot line itself */
      const lw = ctx.lineWidth;
      ctx.globalAlpha = DRY.clamp(s.flash, 0, 1) * 0.45;
      ctx.lineWidth = lw * 2.6;
      ctx.stroke();
      ctx.lineWidth = lw;
    }
    if (s.owner === "player" && s.flash > 0.45) {
      ctx.globalAlpha = DRY.clamp(s.flash - 0.2, 0, 1);
      ctx.save();
      ctx.translate(s.x + dx * 6 * u, s.y + dy * 6 * u);
      Art.muzzleFlash(ctx, (s.rico ? 15 : 11) * u, Math.round(Math.abs(s.phi * 40)));
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawCrate(b) {
    const u = view.unit, pt = W.pointAt(b.phi, Math.max(0, b.alt)), s = 26 * u;
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(b.rot + b.phi + Math.PI / 2);
    Art.toneFill(ctx, "coarse", function (c) { c.rect(-s * 0.5, -s * 0.5, s, s); });
    ctx.strokeStyle = Art.INK;
    ctx.lineWidth = 2.2 * u;
    ctx.strokeRect(-s * 0.5, -s * 0.5, s, s);
    ctx.beginPath();                                        /* barrel hoops */
    ctx.moveTo(-s * 0.5, -s * 0.14); ctx.lineTo(s * 0.5, -s * 0.14);
    ctx.moveTo(-s * 0.5, s * 0.16); ctx.lineTo(s * 0.5, s * 0.16);
    ctx.stroke();
    ctx.lineWidth = 1.7 * u;
    ctx.beginPath();                                        /* the lit fuse */
    ctx.moveTo(0, -s * 0.5);
    ctx.quadraticCurveTo(s * 0.28, -s * 0.86, s * 0.1, -s * 1.02);
    ctx.stroke();
    Art.inkFill(ctx, function (c) { c.arc(s * 0.1, -s * 1.04, s * (0.1 + Math.abs(Math.sin((b.fuse || 0) * 18)) * 0.06), 0, DRY.TAU); });
    ctx.restore();
  }

  function drawWorld() {
    const u = view.unit, p = L.player;
    W.drawBackground(ctx, G.t);

    let i;
    for (i = 0; i < L.bolts.length; i += 1) drawCrate(L.bolts[i]);

    /* the escort kid walks beside the gunman, placard over his shoulder */
    const e2 = C.escort;
    if (e2 && e2.alive !== false) {
      drawActor("escort", e2.phi, e2.alt || 0, DRY.sign((p ? p.phi : W.cam.phi) - e2.phi) > 0, {
        h: 64 * u, walk: e2.walk, gesture: e2.gesture, placard: e2.placard + Math.sin(e2.walk * 0.3) * 0.05, aim: 0,
      });
    }

    for (i = 0; i < L.enemies.length; i += 1) {
      const e = L.enemies[i], def = C.KINDS[e.kind];
      const args = {
        h: def.h * u, walk: e.walk, aim: e.screenAim || 0,   /* e.screenAim is already actor-frame (a.local) */
        boss: !!e.boss, reach: 0, bob: Math.sin(e.walk * 1.6) * u * 0.02, flap: 0,
      };
      if (e.kind === "powder") args.fuse = e.fuseT || 0;
      /* they look the way they are walking unless we are between them */
      const facingUs = DRY.sign((p ? p.phi : W.cam.phi) - e.phi);
      const flip = (e.vTan || 0) < 0 ? facingUs < 0 : facingUs > 0;
      drawActor(e.kind === "tinker" ? "tinker" : (e.kind === "powder" ? "powder" : "acolyte"),
        e.phi, e.alt || 0, flip, args);
      if (e.flash > 0.05) {                                        /* hit flash */
        const c = W.pointAt(e.phi, Math.max(0, e.alt || 0) + def.h * u * 0.52);
        ctx.save();
        ctx.globalAlpha = DRY.clamp(e.flash, 0, 1) * 0.8;
        ctx.fillStyle = Art.BONE;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, def.h * u * 0.3, def.h * u * 0.5, e.phi + Math.PI / 2, 0, DRY.TAU);
        ctx.fill();
        ctx.restore();
      }
    }

    if (p) {
      const blink = p.invuln > 0 && Math.floor(G.t * 26) % 2 === 0;
      if (!blink) {
        drawActor("hero", p.phi, p.alt, p.facing < 0, {
          h: (p.heavyShot ? 98 : 96) * u, walk: p.walk * 1.5, coat: p.coat,
          aim: C.wrapAngle((p.targetAim === undefined ? -0.4 : p.targetAim) - (p.phi + Math.PI / 2)),
          reach: p.reload > 0 ? 0.3 : (p.cool > 0.02 ? 0.12 : 0),
          bob: Math.sin(p.walk * 1.5) * u * 0.02, flap: p.dashT > 0 ? 1 : 0,
        });
      }
      if (!p.alive) {                                    /* the panel closes on him */
        const c = W.pointAt(p.phi, 40 * u);
        ctx.save();
        ctx.globalAlpha = DRY.clamp(1.2 - p.dead * 0.5, 0, 0.9);
        Art.speedLines(ctx, c.x, c.y, 30 * u, Math.max(view.W, view.H) * 0.8, 44, p.dead * 6);
        ctx.restore();
      }
    }

    for (i = 0; i < L.shots.length; i += 1) slugTrail(L.shots[i]);

    W.drawParts(ctx);
  }

  /* ---------- overlays drawn on the canvas ---------------------------- */
  function drawOverlays(dt) {
    if ((C.flash || 0) > 0) {
      ctx.save();
      ctx.globalAlpha = DRY.clamp(C.flash, 0, 1) * 0.45;
      ctx.fillStyle = Art.RED;
      ctx.fillRect(0, 0, view.W, view.H);
      ctx.restore();
      C.flash -= dt * 1.4;
    }

    if (G.speedT > 0) {
      G.speedT -= dt;
      const c = L.player ? W.pointAt(L.player.phi, 90 * view.unit) : { x: view.W * 0.5, y: view.H * 0.5 };
      ctx.save();
      ctx.globalAlpha = DRY.clamp(G.speedT, 0, 1) * 0.7;
      Art.speedLines(ctx, c.x, c.y, Math.min(view.W, view.H) * 0.32, Math.max(view.W, view.H) * 0.95, 60, G.t * 2.4);
      ctx.restore();
    }

    /* a long chain gets the manga speed-line treatment */
    if (L.combo > 2 && (G.state === "play" || G.state === "card")) {
      ctx.save();
      ctx.globalAlpha = DRY.clamp((L.combo - 1) * 0.06, 0, 0.34);
      Art.speedLines(ctx, view.W * 0.5, view.H * 0.5, Math.min(view.W, view.H) * 0.62, Math.max(view.W, view.H), 30, G.t * 3);
      ctx.restore();
    }

    W.drawVignette(ctx);
  }

  /* ---------- the frame loop ------------------------------------------ */
  let last = 0;
  function frame(now) {
    const dtReal = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now || 0;

    DRY.readInput();

    /* fixed-ish steps so a hitch never tunnels a bullet through a bounty */
    let remaining = dtReal;
    while (remaining > 0.0001) {
      const step = Math.min(1 / 60, remaining);
      remaining -= step;
      G.t += step;
      update(step);
    }

    pushHud();

    ctx.save();
    ctx.translate(W.cam.sx, W.cam.sy);
    if (Math.abs(W.cam.roll) > 0.0004) {
      ctx.translate(view.W * 0.5, view.groundY);
      ctx.rotate(W.cam.roll);
      ctx.translate(-view.W * 0.5, -view.groundY);
    }
    drawWorld();
    ctx.restore();

    drawOverlays(dtReal);
    requestAnimationFrame(frame);
  }

  /* ---------- go ------------------------------------------------------ */
  U.init();
  C.reset();
  toAttract();
  requestAnimationFrame(frame);
})();

