/* Procedural painting part 2: grassy islands + the pink lilies from the picture. */
(function () {
  const G = window.GGG;

  function roundTop(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x, y + Math.min(r, h));
    ctx.quadraticCurveTo(x, y, x + Math.min(r, w * 0.5), y);
    ctx.lineTo(x + w - Math.min(r, w * 0.5), y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + Math.min(r, h));
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  }

  /* Foreground platforms: dirt body + bright grass lip with tufts & flowers. */
  function platform(ctx, p, pal, t, seedn) {
    const isle = p.kind === 'isle';
    const h = p.h;
    ctx.fillStyle = isle ? '#8a6039' : '#7b5230';
    roundTop(ctx, p.x, p.y, p.w, h, isle ? 22 : 14); ctx.fill();

    ctx.fillStyle = 'rgba(255,220,170,0.16)';
    const R = G.mulberry32((seedn + 7) * 977);
    for (let i = 0; i < Math.min(18, p.w / 40); i++) {
      ctx.beginPath();
      ctx.arc(p.x + 10 + R() * (p.w - 20), p.y + 24 + R() * Math.max(10, h - 34), 3 + R() * 3, 0, 6.283);
      ctx.fill();
    }

    const gg = ctx.createLinearGradient(0, p.y, 0, p.y + 34);
    gg.addColorStop(0, pal.grass); gg.addColorStop(1, pal.grass2);
    ctx.fillStyle = gg;
    roundTop(ctx, p.x - 5, p.y - 8, p.w + 10, 36, 18); ctx.fill();

    ctx.strokeStyle = pal.grass2; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const R2 = G.mulberry32((seedn + 3) * 601);
    for (let i = 0; i < p.w / 26; i++) {
      const gx = p.x + 14 + i * 26 + R2() * 8, sway = Math.sin(t * 1.7 + i) * 3;
      ctx.beginPath(); ctx.moveTo(gx, p.y - 4);
      ctx.quadraticCurveTo(gx + sway, p.y - 16, gx + sway * 2.2, p.y - 24 - R2() * 6);
      ctx.stroke();
    }

    const R3 = G.mulberry32((seedn + 5) * 313);
    for (let i = 0; i < p.w / 95; i++) {
      const fx = p.x + 46 + i * 95 + R3() * 28, fy = p.y - 22 - R3() * 8;
      flower(ctx, fx, fy, 11, pal.bloom, pal.bloomCore, t * 0.7 + i);
    }

    if (isle) {   // dangling roots under floating isles
      ctx.strokeStyle = 'rgba(90,60,35,0.8)'; ctx.lineWidth = 3;
      const R4 = G.mulberry32((seedn + 11) * 181);
      for (let i = 0; i < p.w / 46; i++) {
        const rx = p.x + 24 + i * 46 + R4() * 10, rl = 14 + R4() * 30;
        ctx.beginPath(); ctx.moveTo(rx, p.y + h - 8);
        ctx.quadraticCurveTo(rx + Math.sin(t * 1.1 + i) * 5, p.y + h + rl * 0.6, rx + Math.sin(t + i) * 8, p.y + h + rl);
        ctx.stroke();
      }
    }
  }

  /* Pink lilies: six pointed petals around a golden core (as in the photo). */
  function flower(ctx, x, y, r, col, core, t) {
    const n = Math.max(2, r * (0.5 + 0.45 * Math.sin(t * 0.9)));
    ctx.strokeStyle = 'rgba(60,120,50,0.85)'; ctx.lineWidth = Math.max(2, r * 0.18);
    ctx.beginPath(); ctx.moveTo(x, y + r * 2.4); ctx.quadraticCurveTo(x - r * 0.35, y + r, x, y); ctx.stroke();
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.7) * 0.06);
    for (let i = 0; i < 6; i++) {
      ctx.save(); ctx.rotate((i / 6) * 6.283 + Math.sin(t * 1.5 + i) * 0.04);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(n * 1.1, -n * 0.9, n * 0.32, -n * 2.0);
      ctx.quadraticCurveTo(0, -n * 1.45, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, r * 0.38, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  /* Floating pickup blossom: a lily that gently turns in the breeze. */
  function blossom(ctx, b, t, pal) {
    const sway = Math.sin(t * 1.4 + b.x * 0.02);
    ctx.save(); ctx.translate(b.x, b.y + sway * 5);
    if (b.golden) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
      g.addColorStop(0, 'rgba(255,240,180,0.7)'); g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 6.283); ctx.fill();
    }
    const s = 0.72 + Math.abs(Math.sin(t * 0.9)) * 0.28;
    ctx.scale(b.golden ? 1.15 : 1, 1);
    flower(ctx, 0, 0, b.r * (b.golden ? 1.2 : 1), b.golden ? pal.bloomCore : pal.bloom,
      b.golden ? pal.bloom : pal.bloomCore, t + sway);
    ctx.restore();
  }

  window.Draw = Object.assign(window.Draw || {}, { roundTop, platform, flower, blossom });
})();