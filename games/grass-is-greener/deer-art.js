/* Painting the fawn: dappled coat, velvet antler nubs, a lily by the ear. */
(function () {
  function drawDeer(ctx, p, t) {
    const cx = p.x + p.w / 2, by = p.y + p.h;         // center-x and feet line
    const run = Math.abs(p.vx) > 30 && p.onGround;
    const air = !p.onGround;
    const coat = '#c69a64', cream = '#f3e5cf', dark = '#8a6337';

    ctx.save();
    if (p.iframes > 0 && Math.floor(t * 14) % 2 === 0) ctx.globalAlpha = 0.35;
    ctx.translate(cx, by);
    ctx.scale(p.facing, 1);
    ctx.scale(1 + p.hopSquash * 0.12, 1 - p.hopSquash * 0.18);

    // legs (back pair drawn first)
    const swing = run ? Math.sin(p.anim * 1.9) : 0;
    ctx.lineCap = 'round';
    const legs = [[-16, 0.9], [-6, -0.85], [14, -0.75], [22, 0.8]];
    for (let i = 0; i < 4; i++) {
      const lx = legs[i][0];
      const ph = run ? swing * legs[i][1] : air ? (i < 2 ? -0.35 : 0.3) : 0;
      ctx.strokeStyle = (i === 0 || i === 3) ? coat : dark;
      ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(lx, -34);
      ctx.quadraticCurveTo(lx + ph * 8, -18, lx + ph * 15, -2);
      ctx.stroke();
      ctx.fillStyle = '#4a331d';                       // hooves
      ctx.beginPath(); ctx.ellipse(lx + ph * 15, -1, 5, 3.5, 0, 0, 6.283); ctx.fill();
    }

    // body + cream belly
    ctx.fillStyle = coat;
    ctx.beginPath(); ctx.ellipse(0, -46, 30, 22, -0.05, 0, 6.283); ctx.fill();
    ctx.fillStyle = cream;
    ctx.beginPath(); ctx.ellipse(-2, -38, 22, 12, -0.05, 0, 6.283); ctx.fill();

    // dappled spots, like the deer in the photo
    ctx.fillStyle = 'rgba(247,236,214,0.9)';
    const spots = [[-16, -54], [-6, -60], [6, -58], [16, -50], [-10, -44], [10, -40], [22, -58]];
    for (const s of spots) { ctx.beginPath(); ctx.arc(s[0], s[1], 3.1, 0, 6.283); ctx.fill(); }

    // tail nub
    ctx.fillStyle = cream;
    ctx.beginPath(); ctx.ellipse(-30, -52, 7, 9, 0.4, 0, 6.283); ctx.fill();

    // neck + head
    ctx.strokeStyle = coat; ctx.lineWidth = 20;
    ctx.beginPath(); ctx.moveTo(16, -56); ctx.quadraticCurveTo(30, -74, 34, -86); ctx.stroke();
    ctx.fillStyle = coat;
    ctx.save();
    ctx.translate(36, -92);
    ctx.rotate(0.22 + (air ? -0.12 : Math.sin(t * 1.6) * 0.03));
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 15, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = cream;                                     // muzzle
    ctx.beginPath(); ctx.ellipse(13, 5, 9, 8, 0.3, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#3a2a1c';                                 // nose
    ctx.beginPath(); ctx.arc(19, 4, 3.2, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#22150d';                                 // eye
    ctx.beginPath(); ctx.arc(8, -4, 4.1, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(9.4, -5.4, 1.5, 0, 6.283); ctx.fill();

    for (const e of [[-8, -12, -0.7], [6, -14, 0.5]]) {        // ears
      ctx.save(); ctx.translate(e[0], e[1]); ctx.rotate(e[2] + Math.sin(t * 1.3) * 0.06);
      ctx.fillStyle = coat;
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#e7a8bd';
      ctx.beginPath(); ctx.ellipse(1, 0, 5, 3.2, 0, 0, 6.283); ctx.fill();
      ctx.restore();
    }

    // velvet antler nubs (this one is only starting to grow them)
    ctx.strokeStyle = '#a78158'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (const a of [[-2, -13, -0.2], [9, -14, 0.25]]) {
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + a[2] * 10, a[1] - 12); ctx.stroke();
      ctx.fillStyle = '#d8c39b';
      ctx.beginPath(); ctx.arc(a[0] + a[2] * 10, a[1] - 13, 3.4, 0, 6.283); ctx.fill();
    }

    // a lily tucked by the ear - it carries flowers wherever it goes
    if (window.Draw) window.Draw.flower(ctx, -14, -6, 5, '#ff9ecb', '#ffe066', t * 1.2);
    ctx.restore();
    ctx.restore();
  }

  /* Soft ground shadow so the deer reads against busy grass. */
  function shadow(ctx, p) {
    ctx.fillStyle = 'rgba(30,60,25,0.22)';
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, p.y + p.h + 4, p.w * 0.45, 7, 0, 0, 6.283);
    ctx.fill();
  }

  window.DeerArt = { drawDeer: drawDeer, shadow: shadow };
})();