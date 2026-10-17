/* Run/level lifecycle, play-state simulation, damage and camera. */
(function () {
  const G = window.GGG, clamp = G.clamp;
  const LIVES = 5;

  let run = null, level = null, player = null;
  const cam = { x: 0, y: 0 };
  let collected = 0, total = 0, timeOnLevel = 0, safe = null, safeTimer = 0, prevTouchJump = false;

  function view() { return { vw: G.W / G.scale, vh: G.H / G.scale }; }
  const levelBlossomCount = (i) => window.Levels.make(i).blossoms.length;
  function totalBlossoms() {
    let n = 0; for (let i = 0; i < window.Levels.count; i++) n += levelBlossomCount(i);
    return n;
  }

  function loadLevel(idx) {
    const lv = window.Levels.make(idx);
    lv.blossoms.forEach(b => { b.taken = false; });
    lv.movers.forEach(m => { m.bx = m.x; m.by = m.y; });
    lv.bees.forEach(b => {
      b.x = (b.x0 + b.x1) / 2; b.chase = 0; b.angry = false;
      if (Math.random() < 0.5) b.dir *= -1;
    });
    level = lv; run.levelIdx = idx;
    player = new window.Ent.Deer(lv.spawn.x, lv.spawn.y);
    safe = { x: lv.spawn.x, y: lv.spawn.y };
    collected = 0; total = lv.blossoms.length; timeOnLevel = 0; safeTimer = 0; prevTouchJump = false;

    const v = view();
    cam.x = clamp(player.x - v.vw * 0.5, -180, Math.max(-180, lv.width - v.vw));
    const lo = Math.min(0, lv.height - v.vh), hi = Math.max(0, lv.height - v.vh);
    cam.y = clamp(player.y - v.vh * 0.52, lo, hi);
    hud();
  }

  function newRun(levelIdx) {
    run = { levelIdx: 0, lives: LIVES, collectedTotal: 0, totalTime: 0 };
    loadLevel(levelIdx || 0);
  }

  function hud() {
    window.UI.setHud({ blossom: collected, total: total, levelIdx: run.levelIdx,
      levelName: level.name, lives: run.lives });
  }
  const solids = () => level.platforms.concat(level.movers);

  /* returns true when that hit was the last life */
  function hurt(fromX) {
    if (player.iframes > 0 || run.lives <= 0) return false;
    run.lives--; player.iframes = 1.8;
    // gentle nudge: enough to signal a brush, never enough to fling you off the isle
    const away = player.x + player.w / 2 < fromX ? -1 : 1;
    player.vx = Math.min(Math.abs(player.vx) * 0.4, 150) * away;
    if (player.vy > 0) player.vy = -260;
    window.Ent.burst(player.x + player.w / 2, player.y + player.h / 2, 16, ['#ff9ecb', '#ffd45e', '#fff'], 230);
    window.Sfx.bump(); hud();
    return run.lives <= 0;
  }

  function fell() {
    run.lives--; window.Sfx.fall(); hud();
    if (run.lives <= 0) return true;
    window.Ent.burst(safe.x + player.w / 2, safe.y + player.h * 0.8, 14, ['#eaf7d8', '#fff'], 190);
    player.reset(safe.x, safe.y);
    player.iframes = 1.1;
    return false;
  }


  /* Each fresh meadow cheers the fawn along: gentle lives top-up so one bad
     morning does not end the whole walk. */
  function refill(n) {
    if (!run) return;
    run.lives = clamp(run.lives + (n || 1), 0, LIVES);
    hud();
  }

  function update(dt, t) {
    const v = view();
    timeOnLevel += dt;

    // moving isles carry whatever rides them
    for (const m of level.movers) {
      if (m.bx == null) { m.bx = m.x; m.by = m.y; }
      const s = Math.sin(t * m.speed + m.phase) * m.amp;
      const nx = m.axis === 'h' ? m.bx + s : m.bx;
      const ny = m.axis === 'v' ? m.by + s : m.by;
      if (player.onGround && player.x < m.x + m.w + 2 && player.x + player.w > m.x - 2 &&
        Math.abs(player.y + player.h - m.y) <= 16) { player.x += nx - m.x; player.y += ny - m.y; }
      m.x = nx; m.y = ny;
    }

    // bees patrol, and chase briefly after being brushed
    for (const b of level.bees) {
      b.chase = Math.max(0, b.chase - dt);
      const sp = b.speed * (b.chase > 0 ? 1.75 : 1);
      b.x += b.dir * sp * dt;
      if (b.x < b.x0) { b.x = b.x0; b.dir = 1; } else if (b.x > b.x1) { b.x = b.x1; b.dir = -1; }
      b.angry = b.chase > 0;
    }

    // input -> fawn
    const k = G.keys, pc = G.pressedCodes, tc = G.touch;
    const jumpPressed = pc.indexOf('Space') >= 0 || pc.indexOf('KeyW') >= 0 || pc.indexOf('ArrowUp') >= 0 ||
      (!!tc.jump && !prevTouchJump);
    prevTouchJump = !!tc.jump;
    const jumped = player.step(dt, {
      left: !!(k['ArrowLeft'] || k['KeyA'] || tc.left),
      right: !!(k['ArrowRight'] || k['KeyD'] || tc.right),
      jumpPressed: jumpPressed,
      jumpHeld: !!(k['Space'] || k['KeyW'] || k['ArrowUp'] || tc.jump),
    }, solids());

    if (jumped === 'jump') { window.Sfx.jump(); window.Ent.puff(player.x + player.w / 2, player.y + player.h); }
    else if (jumped === 'flutter') {
      window.Sfx.leap();
      window.Ent.burst(player.x + player.w / 2, player.y + player.h * 0.6, 9, ['#ffe9f7', '#fff'], 150);
    }
    else if (player.landed) { window.Sfx.land(); window.Ent.puff(player.x + player.w / 2, player.y + player.h); }

    // remember safe footing for respawns
    safeTimer -= dt;
    if (player.onGround && safeTimer <= 0) {
      const cx = player.x + player.w / 2;
      if (!level.brambles.some(b => cx > b.x - 46 && cx < b.x + b.w + 46)) {
        safe.x = player.x; safe.y = player.y; safeTimer = 0.35;
      }
    }

    // blossoms
    const hb = player.shrink(12), hx = hb.x + hb.w / 2, hy = hb.y + hb.h / 2;
    for (const b of level.blossoms) {
      if (b.taken || Math.abs(b.x - hx) > hb.w / 2 + 26 || Math.abs(b.y - hy) > hb.h / 2 + 30) continue;
      b.taken = true; collected++; run.collectedTotal++;
      window.Ent.burst(b.x, b.y, b.golden ? 18 : 10,
        b.golden ? ['#ffd45e', '#fff6cf', '#ff9ecb'] : ['#ff9ecb', '#ffe9f7', '#fff'], b.golden ? 235 : 170);
      if (b.golden) window.Sfx.golden(); else window.Sfx.collect(collected);
      hud();
    }

    // hazards: brambles, bees, and the long way down.  Hitboxes are deliberately
    // smaller than the art so a near-miss on a hop is never punished.  Bramble boxes
    // shrink from the top (base stays on the ground) so clearing them takes less lift.
    let dead = false;
    for (const br of level.brambles) {
      const soft = { x: br.x + 12, y: br.y + 8, w: Math.max(16, br.w - 24), h: Math.max(12, br.h - 8) };
      if (window.Ent.hit(hb, soft)) dead = hurt(br.x + br.w / 2) || dead;
    }
    for (const b of level.bees) {
      const box = { x: b.x - 17, y: b.y - 14, w: 34, h: 26 };
      if (player.iframes <= 1 && window.Ent.hit(hb, box)) { dead = hurt(b.x) || dead; b.chase = 1.2; }
    }
    if (!dead && player.y > level.height + 260) dead = fell();

    // camera follows gently and stays inside the meadow
    const tx = clamp(player.x + player.w / 2 - v.vw * 0.5, -180, Math.max(-180, level.width - v.vw));
    const lo = Math.min(0, level.height - v.vh), hi = Math.max(0, level.height - v.vh);
    const ty = clamp(player.y + player.h / 2 - v.vh * 0.54, Math.min(lo, hi), Math.max(lo, hi));
    cam.x += (tx - cam.x) * Math.min(1, dt * 7);
    cam.y += (ty - cam.y) * Math.min(1, dt * 6);

    window.Ent.updateParts(dt);
    return { dead: dead, goal: window.Ent.hit(hb, level.gate), finished: collected === total };
  }

  const info = () => ({
    collected: collected, total: total, time: timeOnLevel, perfect: collected === total,
    last: run.levelIdx + 1 >= window.Levels.count,
  });

  window.Rules = {
    newRun: newRun, loadLevel: loadLevel, update: update, info: info, hud: hud, refill: refill,
    levelBlossomCount: levelBlossomCount, totalBlossoms: totalBlossoms, cam: cam, timeOn: () => timeOnLevel,
    get run() { return run; }, get level() { return level; }, get player() { return player; },
  };
})();
