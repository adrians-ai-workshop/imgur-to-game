/* Procedural painting part 1: sky, sun, parallax hills, distant trees. */
(function () {
  const G = window.GGG;
  const D = {};

  function sky(ctx, pal, W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, pal.sky0); g.addColorStop(1, pal.sky1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function sun(ctx, W, H, t) {
    const cx = W * 0.78, cy = H * 0.2 + Math.sin(t * 0.3) * 4;
    const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 190);
    g.addColorStop(0, 'rgba(255,250,214,0.95)');
    g.addColorStop(0.35, 'rgba(255,238,170,0.35)');
    g.addColorStop(1, 'rgba(255,238,170,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 190, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.arc(cx, cy, 40, 0, 6.283); ctx.fill();
  }

  /* Rolling hill bands from cheap deterministic sines. */
  function hills(ctx, camx, W, H, pal) {
    const bands = [
      { f: 0.18, base: 0.60, amp: 44, col: pal.hill0, step: 900 },
      { f: 0.38, base: 0.74, amp: 30, col: pal.hill1, step: 700 },
    ];
    for (const b of bands) {
      const off = -camx * b.f;
      ctx.fillStyle = b.col;
      ctx.beginPath();
      const y0 = H * b.base;
      ctx.moveTo(-400, H + 60);
      for (let x = -400; x < W + 400; x += 18) {
        const wx = x - off;
        const y = y0 + Math.sin(wx / b.step * 6.2) * b.amp + Math.sin(wx / (b.step * 0.37) * 6.2) * b.amp * 0.4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W + 400, H + 60); ctx.closePath(); ctx.fill();
    }
  }

  /* Distant conifers drifting by (draw-only background props). */
  function farTrees(ctx, camx, W, H, pal) {
    const f = 0.55, sp = 320;
    for (let i = -1; i < Math.ceil((W + 400) / sp) + 1; i++) {
      const wx = (i * sp) + ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 60;
      const sx = wx - camx * f;
      if (sx < -220 || sx > W + 220) continue;
      const y = H * 0.78, s = 0.8 + ((i % 3) + 1) * 0.12;
      ctx.fillStyle = pal.trunk;
      ctx.fillRect(sx - 6 * s, y - 60 * s, 12 * s, 66 * s);
      ctx.fillStyle = 'rgba(40,110,50,0.75)';
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(sx - (52 - k * 8) * s, y - (60 + k * 40) * s);
        ctx.lineTo(sx, y - (128 + k * 34) * s);
        ctx.lineTo(sx + (52 - k * 8) * s, y - (60 + k * 40) * s);
        ctx.closePath(); ctx.fill();
      }
    }
  }

  /* Mid-ground meadow props: trees and bushes sitting on ground platforms. */
  function props(ctx, list, pal, t) {
    for (const p of list) {
      const s = p.s, sway = Math.sin(t * 0.9 + p.x * 0.01) * 4 * s;
      if (p.t === 'tree') {
        ctx.strokeStyle = pal.trunk; ctx.lineWidth = 16 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y - 6); ctx.quadraticCurveTo(p.x + sway * 0.4, p.y - 90 * s, p.x + sway, p.y - 150 * s); ctx.stroke();
        const cx = p.x + sway, cy = p.y - 172 * s;
        ctx.fillStyle = 'rgba(60,140,70,0.95)';
        for (let k = 0; k < 4; k++) {
          const a = k * 1.8 + Math.sin(t + p.x) * 0.03;
          ctx.beginPath(); ctx.arc(cx - Math.cos(a) * 46 * s, cy - Math.sin(a) * 30 * s, (46 - k * 5) * s, 0, 6.283); ctx.fill();
        }
        ctx.fillStyle = 'rgba(150,220,150,0.5)';
        ctx.beginPath(); ctx.arc(cx - 22 * s, cy - 24 * s, 24 * s, 0, 6.283); ctx.fill();
      } else {
        ctx.fillStyle = pal.grass2;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(p.x + (k - 1) * 26 * s + sway * 0.5, p.y - 18 * s, (24 - Math.abs(k - 1) * 6) * s, 0, 6.283);
          ctx.fill();
        }
        for (let k = 0; k < 3; k++) {
          const fx = p.x + (k - 1) * 26 * s + sway * 0.5, fy = p.y - 44 * s;
          ctx.fillStyle = 'rgba(255,180,220,0.9)';
          ctx.beginPath(); ctx.arc(fx, fy, 6 * s, 0, 6.283); ctx.fill();
        }
      }
    }
  }

  window.Draw = Object.assign(window.Draw || {}, D, { sky, sun, hills, farTrees, props });
})();