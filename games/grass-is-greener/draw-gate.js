/* Procedural painting part 3: brambles (hazards) and the leafy goal gate. */
(function () {
  function bramble(ctx, b, t) {
    const rt = window.Draw.roundTop;
    ctx.fillStyle = '#2c5130';
    rt(ctx, b.x, b.y, b.w, b.h + 8, 12); ctx.fill();
    ctx.strokeStyle = '#1f3d24'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < b.w / 16; i++) {
      const tx = b.x + 8 + i * 16, s = Math.sin(t * 2.2 + i) * 2;
      ctx.beginPath(); ctx.moveTo(tx, b.y + 4); ctx.lineTo(tx + s, b.y - 15); ctx.stroke();
    }
    ctx.fillStyle = '#d9364f';
    for (let i = 0; i < b.w / 28; i++) {
      const bx = b.x + 20 + i * 28, by = b.y - 12 - ((i % 3) * 5);
      ctx.beginPath(); ctx.arc(bx + Math.sin(t * 1.6 + i) * 2, by, 4.5, 0, 6.283); ctx.fill();
    }
  }

  /* The goal: a glowing arch of leaves - the greener pasture you walk toward. */
  function gate(ctx, g, t, pal) {
    const rt = window.Draw.roundTop;
    const cx = g.x + g.w / 2;
    const glow = 0.45 + Math.sin(t * 2) * 0.12;
    const rg = ctx.createRadialGradient(cx, g.y + g.h * 0.6, 12, cx, g.y + g.h * 0.6, g.w * 1.7);
    rg.addColorStop(0, 'rgba(180,255,190,' + glow.toFixed(3) + ')');
    rg.addColorStop(1, 'rgba(180,255,190,0)');
    ctx.fillStyle = rg; ctx.fillRect(cx - g.w * 1.7, g.y - g.h * 0.6, g.w * 3.4, g.h * 2.2);

    const ig = ctx.createLinearGradient(0, g.y, 0, g.y + g.h);
    ig.addColorStop(0, '#eafff0'); ig.addColorStop(1, '#9ff0b6');
    ctx.fillStyle = ig; rt(ctx, g.x + 24, g.y + 26, g.w - 48, g.h - 26, 30); ctx.fill();

    ctx.strokeStyle = '#2f7a45'; ctx.lineWidth = 16; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(g.x + 18, g.y + g.h);
    ctx.lineTo(g.x + 18, g.y + 46);
    ctx.quadraticCurveTo(cx, g.y - 34, g.x + g.w - 18, g.y + 46);
    ctx.lineTo(g.x + g.w - 18, g.y + g.h);
    ctx.stroke();

    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (i / 8) + Math.sin(t + i) * 0.05;
      const lx = cx - Math.cos(a) * (g.w / 2 - 6), ly = g.y + 46 - Math.sin(a) * 78;
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(-a + 1.57);
      ctx.fillStyle = i % 2 ? '#3f9d5c' : pal.grass;
      ctx.beginPath(); ctx.ellipse(0, 0, 26, 11, 0, 0, 6.283); ctx.fill(); ctx.restore();
    }
    for (let i = 0; i < 5; i++) {
      window.Draw.flower(ctx, g.x + 24 + i * ((g.w - 48) / 4), g.y + g.h - 12, 9, pal.bloom, pal.bloomCore, t + i);
    }
    for (let i = 0; i < 7; i++) {
      const sx = cx + Math.sin(t * 1.3 + i * 2.4) * g.w * 0.55;
      const sy = g.y + g.h - ((t * 60 + i * 90) % (g.h + 80));
      ctx.globalAlpha = 0.75; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(sx, sy, 2.4 + Math.sin(t * 3 + i) * 1.2, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /* A grumpy little bee on patrol. */
  function bee(ctx, b, t) {
    const bob = Math.sin(t * 7 + b.t * 9) * 4;
    ctx.save(); ctx.translate(b.x, b.y + bob);
    if (b.angry) {
      ctx.fillStyle = 'rgba(255,120,90,0.35)';
      ctx.beginPath(); ctx.arc(0, 0, 40, 0, 6.283); ctx.fill();
    }
    const d = b.dir > 0 ? 1 : -1;
    ctx.scale(d, 1);
    // wings
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let k = 0; k < 2; k++) {
      ctx.save(); ctx.translate(-4 + k * 12, -16); ctx.rotate(Math.sin(t * 30 + k) * 0.5);
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 7, -0.4, 0, 6.283); ctx.fill(); ctx.restore();
    }
    // body
    ctx.fillStyle = '#f5c542';
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 16, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#2b2b2b';
    for (let k = 0; k < 3; k++) {
      ctx.save(); ctx.translate(-8 + k * 9, 0); ctx.rotate(0.15);
      ctx.fillRect(-3, -15, 6, 30); ctx.restore();
    }
    ctx.beginPath(); ctx.ellipse(-22, 0, 7, 8, 0, 0, 6.283); ctx.fill(); // stinger end
    // eye + smile
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(12, -4, 5.5, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(13.5, -4, 2.6, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(9, 4, 4, 0.2, 1.4); ctx.stroke();
    ctx.restore();
  }

  window.Draw = Object.assign(window.Draw || {}, { bramble, gate, bee });
})();