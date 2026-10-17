/* Painting a whole meadow (world) and the attract-mode vignette. */
(function () {
  const G = window.GGG;
  const S = {};

  /* ---- the animated title scene: a fawn strolling an endless flower field ---- */
  let idleDeer = null;

  function attract(ctx, t, vw, vh) {
    if (!idleDeer) idleDeer = new window.Ent.Deer(240, 560);
    const pal = window.Levels.palettes[1];
    window.Draw.sky(ctx, pal, vw, vh);
    window.Draw.sun(ctx, vw, vh, t);
    window.Draw.hills(ctx, t * 26, vw, vh, pal);
    window.Draw.farTrees(ctx, t * 26, vw, vh, pal);

    // rolling flower bank the deer walks across
    const gy = vh - 150;
    ctx.fillStyle = pal.grass2;
    ctx.fillRect(0, gy + 40, vw, vh - gy);
    ctx.fillStyle = pal.grass;
    ctx.beginPath(); ctx.moveTo(-40, gy + 90);
    for (let x = -40; x <= vw + 40; x += 30) {
      ctx.lineTo(x, gy + Math.sin((x + t * 26) / 180) * 22 + Math.sin((x + t * 18) / 63) * 7);
    }
    ctx.lineTo(vw + 40, vh + 40); ctx.lineTo(-40, vh + 40); ctx.closePath(); ctx.fill();

    const step = ((t * 52) % (vw + 420)) - 210;      // deer paces across the field
    idleDeer.x = step - 28;
    idleDeer.y = gy - 62;
    idleDeer.vx = 90; idleDeer.onGround = true; idleDeer.anim = t * 3.4; idleDeer.facing = 1;
    idleDeer.hopSquash = 0; idleDeer.iframes = 0;

    // a wall of pink lilies in front (the picture's framing)
    for (let i = 0; i < Math.ceil(vw / 96); i++) {
      const fx = ((i * 137 + t * 26) % (vw + 160)) - 80;
      const fy = gy + 44 + (i % 4) * 26;
      window.Draw.flower(ctx, fx, fy, 26 + (i % 3) * 9, pal.bloom, pal.bloomCore, t * 0.8 + i);
    }

    // butterflies drifting about
    for (let i = 0; i < 7; i++) {
      const bx = vw * 0.5 + Math.sin(t * 0.42 + i * 1.9) * vw * 0.44;
      const by = vh * 0.45 + Math.cos(t * 0.63 + i * 2.3) * vh * 0.2;
      ctx.fillStyle = i % 2 ? 'rgba(255,190,225,0.9)' : 'rgba(255,248,210,0.9)';
      const f = Math.abs(Math.sin(t * 6 + i)) * 8 + 3;
      ctx.beginPath(); ctx.ellipse(bx - 5, by, f, 6, -0.4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bx + 5, by, f, 6, 0.4, 0, 6.283); ctx.fill();
    }

    window.DeerArt.drawDeer(ctx, idleDeer, t);

    // soft light wash at the bottom so overlay text stays readable
    const g = ctx.createLinearGradient(0, vh * 0.45, 0, vh);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0.35)');
    ctx.fillStyle = g; ctx.fillRect(0, vh * 0.45, vw, vh * 0.55);
  }

  /* ---- the real thing ---- */
  function world(R) {
    const ctx = G.ctx, lv = R.level, t = R.t, cam = R.cam;
    const vw = R.vw, vh = R.vh;

    window.Draw.sky(ctx, lv.palette, vw, vh);
    window.Draw.sun(ctx, vw, vh, t);
    window.Draw.hills(ctx, cam.x, vw, vh, lv.palette);
    window.Draw.farTrees(ctx, cam.x, vw, vh, lv.palette);

    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

    // only touch what is near the camera
    const L = cam.x - 200, Rr = cam.x + vw + 200, T = cam.y - 240, B = cam.y + vh + 300;
    const vis = (o) => o.x + (o.w || 60) > L && o.x < Rr && o.y + (o.h || 60) > T && o.y < B;

    // trees and bushes are tall, so give props a taller visibility box
    const propVis = (p) => p.x + 140 > L && p.x - 140 < Rr && p.y > T && p.y < B;
    window.Draw.props(ctx, lv.props.filter(propVis), lv.palette, t);
    if (vis(lv.gate)) window.Draw.gate(ctx, lv.gate, t, lv.palette);

    for (let i = 0; i < lv.platforms.length; i++) {
      const p = lv.platforms[i];
      if (vis(p)) window.Draw.platform(ctx, p, lv.palette, t, i * 31 + R.levelIdx * 977);
    }
    for (const m of lv.movers) if (vis(m)) {
      ctx.fillStyle = '#6f4c2e';
      window.Draw.roundTop(ctx, m.x, m.y, m.w, m.h, 18); ctx.fill();
      const gg = ctx.createLinearGradient(0, m.y, 0, m.y + 30);
      gg.addColorStop(0, lv.palette.grass); gg.addColorStop(1, lv.palette.grass2);
      ctx.fillStyle = gg; window.Draw.roundTop(ctx, m.x - 4, m.y - 8, m.w + 8, 26, 14); ctx.fill();
      for (let k = 0; k < 3; k++) {
        window.Draw.flower(ctx, m.x + 26 + k * ((m.w - 52) / 2), m.y - 20, 9, lv.palette.bloomCore, lv.palette.bloom, t + k);
      }
    }

    for (const b of lv.brambles) if (vis(b)) window.Draw.bramble(ctx, b, t);

    // blossoms still to pick
    for (const b of lv.blossoms) {
      if (!b.taken && vis({ x: b.x - 20, y: b.y - 20, w: 40, h: 40 })) window.Draw.blossom(ctx, b, t, lv.palette);
    }

    for (const bee of lv.bees) if (vis(bee)) window.Draw.bee(ctx, bee, t);

    window.DeerArt.shadow(ctx, R.player);
    window.DeerArt.drawDeer(ctx, R.player, t);

    // grass fringe that the fawn pushes through
    for (let x = Math.floor(L / 70) * 70; x < Rr; x += 70) {
      const sway = Math.sin(t * 1.5 + x * 0.02) * 6;
      ctx.strokeStyle = lv.palette.grass2; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, B - 40);
      ctx.quadraticCurveTo(x + sway * 0.5, B - 90, x + sway, B - 130);
      ctx.stroke();
    }

    window.Ent.drawParts(ctx);
    ctx.restore();
  }

  S.attractUnits = function () { const vh = G.viewUnitsH; return { vw: G.W / G.scale, vh }; };

  S.attractDraw = function (t) {
    const a = S.attractUnits();
    attract(G.ctx, t, a.vw, a.vh);
  };
  S.world = world;
  window.Scene = S;
})();