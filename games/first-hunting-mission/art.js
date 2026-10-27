/* First Hunting Mission — hand-drawn canvas art.
   Everything here is procedural: no image assets. */
(function () {
  "use strict";

  const FHM = (window.FHM = window.FHM || {});
  const TAU = Math.PI * 2;

  const FUR = {
    light: "#e3c096",
    mid: "#c99b6c",
    dark: "#a97c53",
    stripe: "#81603f",
    belly: "#f6e8d2",
    pink: "#e8a3ad",
    eye: "#140f14",
  };

  /* ------------------------------------------------------------ helpers --- */

  function rr(ctx, x, y, w, h, r) {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function ellipse(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
  }

  function glow(ctx, x, y, radius, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  /* -------------------------------------------------------------- kitten --- */

  function paw(ctx, x, y, size, tone) {
    ctx.fillStyle = tone || FUR.mid;
    rr(ctx, x - size / 2, y - size * 0.75, size, size * 0.85, size * 0.42);
    ctx.fill();
  }

  function drawKitten(ctx, k, time) {
    const face = (k.facing || 1) >= 0 ? 1 : -1;
    const crouch = Math.max(0, Math.min(1, k.crouch || 0));
    const charge = Math.max(0, Math.min(1, k.charge || 0));
    const air = k.air ? 1 : 0;
    const sx = k.sx || 1;
    const sy = k.sy || 1;
    const moving = k.moving || 0;

    /* ground shadow (world space) */
    ctx.save();
    ctx.globalAlpha = air ? 0.12 : 0.3;
    ctx.fillStyle = "#050a16";
    ellipse(ctx, k.x, (k.shadowY == null ? k.y : k.shadowY) + 3, 25 * sx, 6, 0);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(k.x + (k.wiggle || 0), k.y);
    if (k.invuln && Math.floor(time * 16) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.scale(face, 1);
    ctx.scale(sx, sy);

    const breathe = Math.sin(time * 3.4) * 0.9;
    const gait = moving ? Math.sin(time * (k.trot ? 20 : 12)) * 2.6 : 0;
    const bodyK = 1 - crouch * 0.3;
    const headBob = Math.sin(time * 3.4) * 0.6;

    /* tail — straight up and quivering when she winds up */
    const tailWig = Math.sin(time * 6.5) * 2.2 + charge * Math.sin(time * 47) * 7.5;
    ctx.save();
    ctx.lineCap = "round";
    const baseX = -17;
    const baseY = -19;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    if (air) {
      ctx.quadraticCurveTo(baseX - 14, baseY - 4, baseX - 30, baseY - 14 + Math.sin(time * 22) * 2);
    } else {
      ctx.quadraticCurveTo(
        baseX - 8 + tailWig * 0.25,
        baseY - 26,
        baseX - 1 + tailWig,
        baseY - 54 - crouch * 4
      );
    }
    ctx.lineWidth = 9.5;
    ctx.strokeStyle = FUR.dark;
    ctx.stroke();
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = FUR.mid;
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(246,232,210,0.35)";
    ctx.stroke();
    const tipX = air ? baseX - 30 : baseX - 1 + tailWig;
    const tipY = air ? baseY - 14 : baseY - 54 - crouch * 4;
    ctx.fillStyle = FUR.dark;
    ellipse(ctx, tipX, tipY, 5.6, 5, 0.2);
    ctx.fill();
    ctx.restore();

    /* back legs */
    const backLift = air ? -4 : 0;
    paw(ctx, -12 + gait, backLift, 9, FUR.dark);
    paw(ctx, -3 - gait, backLift, 8, FUR.mid);

    /* body */
    ctx.save();
    ctx.scale(1 + crouch * 0.17, bodyK * (air ? 1.05 : 1));
    ctx.beginPath();
    ctx.moveTo(-21, -2);
    ctx.bezierCurveTo(-28, -14, -21, -27, -6, -29 + breathe * 0.4);
    ctx.bezierCurveTo(7, -31, 17, -27, 22, -19);
    ctx.bezierCurveTo(27, -10, 23, -1, 14, -1);
    ctx.bezierCurveTo(2, -1, -10, -1, -21, -2);
    ctx.closePath();
    const furGrad = ctx.createLinearGradient(-20, -30, 18, 0);
    furGrad.addColorStop(0, FUR.dark);
    furGrad.addColorStop(0.45, FUR.mid);
    furGrad.addColorStop(1, FUR.light);
    ctx.fillStyle = furGrad;
    ctx.fill();

    /* tabby stripes along the back */
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = "rgba(110,80,52,0.55)";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    [-16, -9, -2, 5].forEach((x, i) => {
      ctx.beginPath();
      ctx.moveTo(x, -29 + i * 0.4);
      ctx.quadraticCurveTo(x + 4, -22, x + 1.5, -14 + i * 0.8);
      ctx.stroke();
    });
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = FUR.belly;
    ellipse(ctx, 4, -7, 17, 7, -0.06);
    ctx.fill();
    ctx.restore();
    ctx.restore();

    /* front legs */
    if (air) {
      paw(ctx, 20, -12, 8.5, FUR.light);
      paw(ctx, 12, -14, 8, FUR.mid);
    } else {
      paw(ctx, 19, crouch > 0.2 ? -1 : 0, 9, FUR.light);
      paw(ctx, 10.5, 0, 8.5, FUR.mid);
    }

    /* head */
    const headX = 17 + crouch * 3;
    const headY = -33 - crouch * 3 + headBob + (air ? 1 : 0);
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate((air ? -0.16 : 0) + crouch * 0.08 + Math.sin(time * 2.2) * 0.015);

    /* ears */
    const earTwitch = Math.sin(time * 2.7 + 1) * 0.12 + charge * 0.16;
    ctx.fillStyle = FUR.dark;
    ctx.save();
    ctx.rotate(-0.12 - earTwitch * 0.4);
    ctx.beginPath();
    ctx.moveTo(-9, -7);
    ctx.quadraticCurveTo(-9, -22, -2, -22);
    ctx.quadraticCurveTo(3, -15, 3, -6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(232,163,173,0.75)";
    ctx.beginPath();
    ctx.moveTo(-7, -9);
    ctx.quadraticCurveTo(-7, -19, -2, -19.5);
    ctx.quadraticCurveTo(1, -14, 1, -8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = FUR.mid;
    ctx.save();
    ctx.rotate(0.1 + earTwitch * 0.5);
    ctx.beginPath();
    ctx.moveTo(2, -10);
    ctx.quadraticCurveTo(3, -25, 12, -24);
    ctx.quadraticCurveTo(15, -16, 11, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(232,163,173,0.7)";
    ctx.beginPath();
    ctx.moveTo(4.5, -11);
    ctx.quadraticCurveTo(5, -21.5, 10.6, -21.4);
    ctx.quadraticCurveTo(12.6, -15.6, 9.6, -10.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    /* head shape */
    const hg = ctx.createLinearGradient(-10, -18, 14, 10);
    hg.addColorStop(0, FUR.light);
    hg.addColorStop(1, FUR.mid);
    ctx.fillStyle = hg;
    ellipse(ctx, 0, 0, 13.6, 12, -0.05);
    ctx.fill();

    /* cheek fluff */
    ctx.fillStyle = "rgba(246,232,210,0.85)";
    ellipse(ctx, 4, 5.4, 8.5, 5.4, 0.04);
    ctx.fill();

    /* forehead stripes */
    ctx.strokeStyle = "rgba(110,80,52,0.6)";
    ctx.lineWidth = 2.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-2, -10.5);
    ctx.lineTo(-1, -4);
    ctx.moveTo(4.5, -11);
    ctx.lineTo(5.2, -5);
    ctx.stroke();

    /* eyes — enormous, as in the photograph */
    const eyeR = 6.1 + charge * 1.5 + (crouch > 0.4 ? 0.7 : 0);
    const eyeY = -0.5;
    const blink = k.blink || 0;
    if (blink > 0.55) {
      ctx.strokeStyle = FUR.eye;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(4.2, eyeY, 4.6, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(11.2, eyeY + 0.5, 3.4, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else {
      ctx.fillStyle = FUR.eye;
      ellipse(ctx, 3.6, eyeY, eyeR * 0.78, eyeR, 0);
      ctx.fill();
      ellipse(ctx, 11.4, eyeY + 0.6, eyeR * 0.62, eyeR * 0.86, 0);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ellipse(ctx, 5.4, eyeY - 2.4, 2, 2.3, 0);
      ctx.fill();
      ellipse(ctx, 12.6, eyeY - 2.1, 1.5, 1.8, 0);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ellipse(ctx, 2.2, eyeY + 2.6, 1, 1.1, 0);
      ctx.fill();
    }

    /* nose + mouth */
    ctx.fillStyle = FUR.pink;
    ctx.beginPath();
    ctx.moveTo(9.6, 5.6);
    ctx.lineTo(12.4, 5.6);
    ctx.lineTo(11, 7.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(90,66,52,0.7)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(11, 7.8);
    ctx.quadraticCurveTo(11.4, 9.4, 13, 9.2);
    ctx.moveTo(11, 7.8);
    ctx.quadraticCurveTo(10.6, 9.4, 9, 9.2);
    ctx.stroke();

    /* whiskers */
    ctx.strokeStyle = "rgba(255,246,232,0.62)";
    ctx.lineWidth = 0.9;
    [0, 3.2, 6.4].forEach((dy, i) => {
      ctx.beginPath();
      ctx.moveTo(13, 5.4 + dy * 0.4);
      ctx.quadraticCurveTo(22, 3.6 + dy, 27 - i, 2.6 + dy * 1.15);
      ctx.stroke();
    });

    ctx.restore(); /* head */
    ctx.restore(); /* kitten */
  }

  /* --------------------------------------------------------------- prey --- */

  function drawPrey(ctx, p, time) {
    const art = {
      bunny: drawDustBunny,
      sock: drawSock,
      moth: drawMoth,
      beetle: drawBeetle,
      yarn: drawYarn,
    }[p.type] || drawDustBunny;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.dir < 0 ? -1 : 1, 1);
    if (p.caught) {
      ctx.rotate(p.tilt || 0);
      ctx.globalAlpha = Math.max(0, p.alpha);
    }
    art(ctx, p, time);
    ctx.restore();

    if (p.state === "flee" && !p.caught) {
      ctx.save();
      ctx.globalAlpha = 0.75 + Math.sin(time * 18) * 0.25;
      ctx.fillStyle = "#ffcf7a";
      ctx.font = "700 20px Outfit, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("!", p.x, p.y - p.h - 16);
      ctx.restore();
    }
  }

  function drawDustBunny(ctx, p, time) {
    const hop = p.caught ? 0 : Math.abs(Math.sin(time * 3.1 + p.seed * 6)) * 2.2;
    ctx.translate(0, -hop);
    ctx.fillStyle = "rgba(5,10,22,0.28)";
    ellipse(ctx, 0, hop + 2, 16, 4, 0);
    ctx.fill();

    const lumps = [
      [-9, -8, 8],
      [3, -11, 9],
      [10, -5, 7],
      [-2, -5, 9],
      [0, -14, 6],
    ];
    lumps.forEach(([x, y, r], i) => {
      ctx.fillStyle = i % 2 ? "#a9b2c4" : "#bcc4d4";
      ellipse(ctx, x, y, r, r * 0.92, i * 0.4);
      ctx.fill();
    });
    /* lint flecks */
    ctx.strokeStyle = "rgba(236,241,250,0.55)";
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    [
      [-7, -12],
      [4, -16],
      [9, -3],
      [-4, -2],
    ].forEach(([x, y], i) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 3 + (i % 2), y - 3);
      ctx.stroke();
    });
    /* eyes */
    const look = p.state === "flee" ? 2 : Math.sin(time * 1.6 + p.seed * 9) * 1.2;
    ctx.fillStyle = "#111827";
    ellipse(ctx, 6 + look, -8, 1.9, 2.1, 0);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ellipse(ctx, 6.6 + look, -8.8, 0.7, 0.8, 0);
    ctx.fill();
  }

  function drawSock(ctx, p, time) {
    const hop = p.caught ? 0 : Math.abs(Math.sin(time * 4 + p.seed * 7)) * 3;
    ctx.translate(0, -hop);
    ctx.fillStyle = "rgba(5,10,22,0.26)";
    ellipse(ctx, -2, hop + 2, 16, 3.6, 0);
    ctx.fill();

    ctx.save();
    ctx.rotate(-0.24 + Math.sin(time * 4 + p.seed) * 0.05);
    ctx.fillStyle = "#f3e6e2";
    rr(ctx, -16, -14, 22, 13, 6);
    ctx.fill();
    ctx.fillStyle = "#f0a6b4";
    rr(ctx, -16, -14, 6, 13, 4);
    ctx.fill();
    rr(ctx, -9, -14, 4, 13, 2);
    ctx.fill();
    ellipse(ctx, 7, -9, 9, 8, 0.1);
    ctx.fillStyle = "#f3e6e2";
    ctx.fill();
    ctx.fillStyle = "#f0a6b4";
    ellipse(ctx, 12.5, -9.5, 3.6, 6.4, 0.15);
    ctx.fill();
    ctx.strokeStyle = "#9c7f88";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-2, -12);
    ctx.lineTo(-2, -4);
    ctx.stroke();
    ctx.fillStyle = "#2b2130";
    ellipse(ctx, 5.5, -11.5, 1.6, 1.9, 0);
    ctx.fill();
    ellipse(ctx, 10, -11.8, 1.5, 1.8, 0);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ellipse(ctx, 6.1, -12.1, 0.6, 0.7, 0);
    ctx.fill();
    ctx.restore();
  }

  function drawMoth(ctx, p, time) {
    const flap = Math.sin(time * 22 + p.seed * 5);
    const bob = p.caught ? 0 : Math.sin(time * 3 + p.seed * 4) * 4;
    ctx.translate(0, bob);

    const wingW = 13 * (0.45 + Math.abs(flap) * 0.6);
    ctx.fillStyle = "rgba(198,176,146,0.9)";
    ctx.save();
    ctx.rotate(0.2 - flap * 0.12);
    ellipse(ctx, 2, -6, wingW * 0.82, 9, -0.4);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(226,208,178,0.85)";
    ctx.save();
    ctx.rotate(-0.2 + flap * 0.12);
    ellipse(ctx, -2, -6, wingW, 10, 0.4);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#6b5744";
    ellipse(ctx, 0, -3, 3.6, 9, 0);
    ctx.fill();
    ctx.fillStyle = "#4a3a2c";
    ellipse(ctx, 0, -11, 3.4, 3.2, 0);
    ctx.fill();
    ctx.strokeStyle = "#4a3a2c";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.quadraticCurveTo(-5, -19, -8, -17);
    ctx.moveTo(0, -13);
    ctx.quadraticCurveTo(5, -19, 8, -17);
    ctx.stroke();
    ctx.fillStyle = "#0f0d12";
    ellipse(ctx, -1.4, -11.4, 0.9, 1, 0);
    ctx.fill();
    ellipse(ctx, 1.4, -11.4, 0.9, 1, 0);
    ctx.fill();
  }

  function drawBeetle(ctx, p, time) {
    const scuttle = Math.sin(time * 16 + p.seed * 4) * 1.4;
    ctx.fillStyle = "rgba(5,10,22,0.3)";
    ellipse(ctx, 0, 2, 11, 3, 0);
    ctx.fill();

    ctx.strokeStyle = "#20181a";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    [-1, 1].forEach((side) => {
      [0, 1, 2].forEach((i) => {
        const x = -4 + i * 5;
        ctx.beginPath();
        ctx.moveTo(x, -4);
        ctx.lineTo(x + side * 3 + scuttle * side, 1.5);
        ctx.stroke();
      });
    });
    ctx.fillStyle = "#31262a";
    ellipse(ctx, 0, -5.5, 10, 6.5, -0.06);
    ctx.fill();
    ctx.fillStyle = "rgba(160,190,210,0.28)";
    ellipse(ctx, -3, -8, 5, 2.2, -0.5);
    ctx.fill();
    ctx.strokeStyle = "#17110f";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -11.6);
    ctx.lineTo(0, 0);
    ctx.stroke();
    ctx.fillStyle = "#1d1518";
    ellipse(ctx, 8.5, -6, 4, 3.6, 0);
    ctx.fill();
    ctx.strokeStyle = "#1d1518";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(11, -7);
    ctx.quadraticCurveTo(16, -12, 18, -9);
    ctx.moveTo(11, -5.4);
    ctx.quadraticCurveTo(16.5, -5, 18.5, -2.4);
    ctx.stroke();
  }

  function drawYarn(ctx, p, time) {
    const roll = p.caught ? 2 : Math.sin(time * 2.4 + p.seed * 5) * 1.6;
    ctx.save();
    ctx.fillStyle = "rgba(5,10,22,0.26)";
    ellipse(ctx, 0, 2, 12, 3.2, 0);
    ctx.fill();
    ctx.rotate(roll * 0.05);
    const g = ctx.createRadialGradient(-4, -10, 2, 0, -7, 14);
    g.addColorStop(0, "#ffb7a1");
    g.addColorStop(1, "#c2635f");
    ctx.fillStyle = g;
    ellipse(ctx, 0, -8, 11.5, 10.5, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,232,214,0.42)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, -8, 4 + i * 3, 0.3 + i, 3.4 + i);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(9, -3);
    ctx.quadraticCurveTo(17, 0, 24, 1.5);
    ctx.stroke();
    ctx.restore();
  }

  /* ------------------------------------------------------- the "hazards" --- */

  function drawSlipper(ctx, h, time) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(h.dir < 0 ? -1 : 1, 1);

    ctx.fillStyle = "rgba(4,8,18,0.42)";
    ellipse(ctx, 0, 3, 74, 11, 0);
    ctx.fill();

    /* dust plume behind */
    ctx.fillStyle = "rgba(210,220,240,0.1)";
    for (let i = 0; i < 4; i += 1) {
      const px = -58 - i * 16 - ((time * 60) % 18);
      ellipse(ctx, px, -8 - i * 3, 12 + i * 3, 8 + i * 2, 0);
      ctx.fill();
    }

    /* sole */
    ctx.fillStyle = "#2a2233";
    rr(ctx, -64, -13, 134, 14, 7);
    ctx.fill();

    /* body */
    const g = ctx.createLinearGradient(0, -44, 0, -8);
    g.addColorStop(0, "#8d6678");
    g.addColorStop(1, "#5c3f52");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-60, -10);
    ctx.quadraticCurveTo(-64, -34, -30, -40);
    ctx.quadraticCurveTo(18, -49, 58, -30);
    ctx.quadraticCurveTo(74, -22, 66, -10);
    ctx.closePath();
    ctx.fill();

    /* fleece cuff */
    ctx.fillStyle = "#efe2e8";
    ctx.beginPath();
    ctx.moveTo(-58, -12);
    ctx.quadraticCurveTo(-60, -30, -40, -36);
    ctx.quadraticCurveTo(-24, -40, -18, -28);
    ctx.quadraticCurveTo(-30, -20, -30, -12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(154,123,140,0.6)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(-52 + i * 6, -25 + (i % 2) * 2, 3, 0, Math.PI);
      ctx.stroke();
    }

    /* sheen */
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, -40);
    ctx.quadraticCurveTo(30, -42, 56, -28);
    ctx.stroke();
    ctx.restore();
  }

  const VAC = { w: 78, h: 120 };

  function drawVacuum(ctx, v, time) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.scale(v.dir < 0 ? -1 : 1, 1);

    /* shadow */
    ctx.fillStyle = "rgba(4,8,18,0.5)";
    ellipse(ctx, 0, 3, 52, 11, 0);
    ctx.fill();

    const angry = v.state === "windup" || v.state === "charge";
    const shake = v.state === "windup" ? Math.sin(time * 60) * 1.8 : 0;
    ctx.translate(shake, 0);

    /* suction cone */
    if (angry || v.state === "stun") {
      const reach = 120 + Math.sin(time * 9) * 10;
      ctx.save();
      ctx.globalAlpha = v.state === "stun" ? 0.12 : 0.3;
      const cg = ctx.createRadialGradient(46, -16, 6, 46, -16, reach);
      cg.addColorStop(0, "rgba(255,190,120,0.55)");
      cg.addColorStop(1, "rgba(255,150,90,0)");
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(30, -46);
      ctx.quadraticCurveTo(46 + reach, -70, 46 + reach, -6);
      ctx.quadraticCurveTo(46 + reach, 10, 30, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = "rgba(255,214,160,0.35)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i += 1) {
        const a = (time * 2.2 + i / 3) % 1;
        ctx.beginPath();
        ctx.arc(40, -22, 30 + a * 80, -0.8, 0.8);
        ctx.globalAlpha = 1 - a;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    /* hose */
    ctx.strokeStyle = "#3b3f4d";
    ctx.lineWidth = 11;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-28, -74);
    ctx.bezierCurveTo(-56, -86, -54, -34, -34, -22);
    ctx.stroke();
    ctx.strokeStyle = "#5a6072";
    ctx.lineWidth = 5;
    ctx.stroke();
    /* nozzle */
    ctx.fillStyle = "#4a4f60";
    ctx.save();
    ctx.translate(-34, -20);
    ctx.rotate(-0.5);
    rr(ctx, -6, -12, 12, 26, 4);
    ctx.fill();
    ctx.restore();

    /* wheels */
    ctx.fillStyle = "#1c2029";
    ellipse(ctx, -30, -6, 13, 13, 0);
    ctx.fill();
    ellipse(ctx, 30, -6, 11, 11, 0);
    ctx.fill();
    ctx.fillStyle = "#3d4452";
    ellipse(ctx, -30, -6, 5, 5, 0);
    ctx.fill();
    ellipse(ctx, 30, -6, 4, 4, 0);
    ctx.fill();

    /* canister */
    const body = ctx.createLinearGradient(-36, -120, 36, 0);
    body.addColorStop(0, "#7a8496");
    body.addColorStop(0.45, "#596274");
    body.addColorStop(1, "#343b49");
    ctx.fillStyle = body;
    rr(ctx, -38, -108, 76, 100, 24);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    rr(ctx, -32, -101, 64, 86, 20);
    ctx.stroke();

    /* panel + angry eye */
    ctx.fillStyle = "#222834";
    rr(ctx, -24, -86, 48, 34, 12);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(time * 6) * 0.25;
    ctx.fillStyle = angry ? "#ff6a5a" : "#8fd7c7";
    ellipse(ctx, 0, -69, 7, 5, 0);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = angry ? "#ff8f7a" : "#7fc9b8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, -62);
    ctx.lineTo(12, -62);
    ctx.stroke();

    /* top power button */
    const blink = angry ? 1 : 0.55 + Math.sin(time * 2.4) * 0.12;
    ctx.save();
    ctx.shadowBlur = angry ? 26 : 12;
    ctx.shadowColor = "rgba(255,190,100,0.9)";
    ctx.fillStyle = angry ? "#ffd694" : "#c9a25e";
    rr(ctx, -19, VAC.h * -1 - 10, 38, 13, 6);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = blink;
    ctx.fillStyle = "rgba(255,247,220,0.95)";
    rr(ctx, -13, -VAC.h - 6, 26, 5, 2.5);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (v.state === "stun") {
      ctx.fillStyle = "rgba(255,229,160,0.9)";
      ctx.font = "700 18px Outfit, system-ui, sans-serif";
      ctx.textAlign = "center";
      for (let i = 0; i < 3; i += 1) {
        const a = time * 2 + i * 2.1;
        ctx.fillText("\u2726", Math.cos(a) * 26, -VAC.h - 26 + Math.sin(a) * 9);
      }
    }
    ctx.restore();
  }
  /* ------------------------------------------------------------ scenery --- */

  function wallBase(ctx, v, top, bottom) {
    const g = ctx.createLinearGradient(0, 0, 0, v.groundY);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, v.w, v.groundY);
  }

  function moonWindow(ctx, x, y, w, h, time, tint) {
    glow(ctx, x + w * 0.5, y + h * 0.5, w * 1.15, "rgba(146,186,255,0.3)", 1);

    ctx.fillStyle = tint || "#0b1322";
    rr(ctx, x - 12, y - 12, w + 24, h + 24, 10);
    ctx.fill();

    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, "#1a3159");
    g.addColorStop(0.55, "#264a7c");
    g.addColorStop(1, "#3c699b");
    ctx.fillStyle = g;
    rr(ctx, x, y, w, h, 4);
    ctx.fill();

    ctx.save();
    rr(ctx, x, y, w, h, 4);
    ctx.clip();

    const mx = x + w * 0.66;
    const my = y + h * 0.3;
    const mr = Math.min(w, h) * 0.11;
    glow(ctx, mx, my, mr * 4.2, "rgba(226,238,255,0.5)", 1);
    ctx.fillStyle = "#f3f2e2";
    ellipse(ctx, mx, my, mr, mr, 0);
    ctx.fill();
    ctx.fillStyle = "rgba(205,208,190,0.5)";
    ellipse(ctx, mx - mr * 0.3, my - mr * 0.2, mr * 0.22, mr * 0.18, 0);
    ctx.fill();
    ellipse(ctx, mx + mr * 0.4, my + mr * 0.35, mr * 0.16, mr * 0.13, 0);
    ctx.fill();

    /* distant rooftops */
    let bx = x - 12;
    let i = 0;
    while (bx < x + w + 12) {
      const bw = 24 + ((i * 37) % 34);
      const bh = 20 + ((i * 53) % 58);
      ctx.fillStyle = "rgba(10,20,38,0.75)";
      ctx.fillRect(bx, y + h - bh, bw, bh);
      if (i % 3 === 0) ctx.fillRect(bx + bw * 0.3, y + h - bh - 10, 5, 10);
      if (i % 2 === 0) {
        ctx.fillStyle = "rgba(255,214,150,0.5)";
        ctx.fillRect(bx + 7, y + h - bh + 9, 3, 3);
      }
      bx += bw + 5;
      i += 1;
    }

    ctx.fillStyle = "rgba(214,230,255,0.12)";
    const cx = x - 40 + ((time * 7) % (w + 90));
    ellipse(ctx, cx, y + h * 0.24, w * 0.16, h * 0.05, 0);
    ctx.fill();
    ellipse(ctx, cx + 20, y + h * 0.22, w * 0.1, h * 0.04, 0);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(9,15,27,0.9)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w / 2, y + h);
    ctx.moveTo(x, y + h * 0.45);
    ctx.lineTo(x + w, y + h * 0.45);
    ctx.stroke();
    ctx.strokeStyle = "rgba(150,180,220,0.28)";
    ctx.lineWidth = 1.4;
    rr(ctx, x + 2, y + 2, w - 4, h - 4, 3);
    ctx.stroke();

    ctx.fillStyle = "#101a2c";
    rr(ctx, x - 20, y + h + 8, w + 40, 10, 4);
    ctx.fill();
  }

  function curtain(ctx, x, y, w, h, color, flip) {
    ctx.save();
    ctx.translate(x, 0);
    ctx.scale(flip ? -1 : 1, 1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, y - 16);
    ctx.quadraticCurveTo(w * 0.2, y + h * 0.3, w * 0.08, y + h);
    ctx.lineTo(w * 1.25, y + h);
    ctx.quadraticCurveTo(w * 0.75, y + h * 0.4, w * 0.9, y - 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let i = 1; i <= 3; i += 1) {
      const fx = w * (0.14 + i * 0.19);
      ctx.beginPath();
      ctx.moveTo(fx, y - 10);
      ctx.quadraticCurveTo(fx + 6, y + h * 0.5, fx - 4, y + h);
      ctx.lineTo(fx + 7, y + h);
      ctx.quadraticCurveTo(fx + 14, y + h * 0.45, fx + 10, y - 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function pictureFrame(ctx, x, y, w, h, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(5, 6, w, h);
    ctx.fillStyle = "#422f2a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#8d6c50";
    ctx.fillRect(3, 3, w - 6, h - 6);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#3f5a63");
    g.addColorStop(1, "#7d8f7c");
    ctx.fillStyle = g;
    ctx.fillRect(7, 7, w - 14, h - 14);
    ctx.fillStyle = "rgba(20,30,35,0.7)";
    ctx.beginPath();
    ctx.moveTo(7, h * 0.7);
    ctx.quadraticCurveTo(w * 0.35, h * 0.42, w * 0.6, h * 0.66);
    ctx.quadraticCurveTo(w * 0.8, h * 0.5, w - 7, h * 0.62);
    ctx.lineTo(w - 7, h - 7);
    ctx.lineTo(7, h - 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,244,214,0.85)";
    ellipse(ctx, w * 0.3, h * 0.3, 4, 4, 0);
    ctx.fill();
    ctx.restore();
  }



  function stringLights(ctx, w, y, time) {
    ctx.strokeStyle = "rgba(20,28,44,0.9)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-10, y - 14);
    ctx.quadraticCurveTo(w * 0.5, y + 40, w + 10, y - 22);
    ctx.stroke();

    const bulbs = Math.max(7, Math.round(w / 130));
    for (let i = 0; i < bulbs; i += 1) {
      const t = (i + 0.5) / bulbs;
      const bx = t * w;
      const by = (1 - t) * (1 - t) * (y - 14) + 2 * (1 - t) * t * (y + 40) + t * t * (y - 22);
      const flick = 0.72 + Math.sin(time * 1.6 + i * 1.7) * 0.18;
      glow(ctx, bx, by + 10, 26, "rgba(255,205,130,0.5)", flick);
      ctx.fillStyle = "rgba(255,221,160,0.95)";
      ellipse(ctx, bx, by + 10, 2.8, 3.6, 0);
      ctx.fill();
    }
  }

  function floorPlanks(ctx, v, base, line) {
    ctx.fillStyle = base;
    ctx.fillRect(0, v.groundY, v.w, v.h - v.groundY);
    const step = 26;
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    for (let y = v.groundY + step; y < v.h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(v.w, y);
      ctx.stroke();
    }
    for (let y = v.groundY; y < v.h; y += step) {
      const row = Math.round((y - v.groundY) / step);
      for (let x = row % 2 === 0 ? -40 : 60; x < v.w; x += 180) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + step);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(0, v.groundY, v.w, 3);
  }

  function rug(ctx, v, x, w, color, accent) {
    const top = v.groundY + 4;
    const bottom = v.h;
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, color);
    g.addColorStop(1, "#1b1520");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + w, top);
    ctx.lineTo(x + w + 18, bottom);
    ctx.lineTo(x - 18, bottom);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(x + 10, top + 8, w - 20, 3);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.24;
    for (let r = 0; r < 3; r += 1) {
      const y = top + 18 + r * 13;
      ctx.beginPath();
      for (let i = 0; i <= 12; i += 1) {
        const px = x + (i / 12) * w;
        const py = y + (i % 2 === 0 ? 0 : 5);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function motes(ctx, v, time, count, color) {
    ctx.save();
    for (let i = 0; i < count; i += 1) {
      const seed = i * 127.1;
      const rx = (Math.sin(seed) * 0.5 + 0.5) * v.w;
      const drift = (time * (7 + (i % 5) * 3) + i * 41) % (v.groundY + 60);
      const y = v.groundY + 40 - drift;
      const x = rx + Math.sin(time * 0.6 + i) * 16;
      const size = 0.9 + (i % 4) * 0.5;
      ctx.globalAlpha = 0.1 + Math.abs(Math.sin(time * 0.9 + i)) * 0.26;
      ctx.fillStyle = color;
      ellipse(ctx, x, y, size, size, 0);
      ctx.fill();
    }
    ctx.restore();
  }


  /* -------------------------------------------------------------- rooms --- */

  function bedroom(ctx, v, t) {
    wallBase(ctx, v, "#0c162e", "#26385f");

    ctx.fillStyle = "rgba(160,190,240,0.035)";
    for (let x = 0; x < v.w; x += 54) ctx.fillRect(x, 0, 22, v.groundY);

    const ww = Math.min(340, v.w * 0.3);
    const wh = Math.min(250, v.groundY * 0.44);
    const wx = v.w * 0.58;
    const wy = v.groundY - wh - 92;
    moonWindow(ctx, wx, wy, ww, wh, t);
    curtain(ctx, wx - 62, wy - 24, 78, wh + 88, "#1d2a49");
    curtain(ctx, wx + ww + 24, wy - 24, 78, wh + 88, "#1d2a49", true);

    stringLights(ctx, v.w, Math.max(46, v.groundY * 0.1), t);
    pictureFrame(ctx, v.w * 0.1, v.groundY - Math.max(210, v.groundY * 0.34), 96, 74, -0.05);

    /* the hoodie, dropped on the duvet — a landmark from the photograph */
    ctx.save();
    ctx.translate(v.w * 0.03, v.groundY + 6);
    ctx.fillStyle = "#161b28";
    ctx.beginPath();
    ctx.moveTo(-v.w * 0.05, 0);
    ctx.quadraticCurveTo(-v.w * 0.038, -58, -v.w * 0.004, -70);
    ctx.quadraticCurveTo(v.w * 0.024, -79, v.w * 0.042, -48);
    ctx.quadraticCurveTo(v.w * 0.062, -16, v.w * 0.05, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(190,205,235,0.12)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-v.w * 0.026, -52);
    ctx.quadraticCurveTo(0, -32, v.w * 0.008, -6);
    ctx.moveTo(v.w * 0.016, -60);
    ctx.quadraticCurveTo(v.w * 0.028, -32, v.w * 0.024, -4);
    ctx.stroke();
    ctx.restore();

    motes(ctx, v, t, 30, "#d3e4ff");

    /* the duvet */
    const g = ctx.createLinearGradient(0, v.groundY - 6, 0, v.h);
    g.addColorStop(0, "#9db2da");
    g.addColorStop(0.22, "#849bc6");
    g.addColorStop(0.7, "#5b7099");
    g.addColorStop(1, "#334366");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, v.groundY + 2);
    for (let x = 0; x <= v.w; x += 40) {
      ctx.lineTo(x, v.groundY + Math.sin(x * 0.014 + 0.8) * 3);
    }
    ctx.lineTo(v.w, v.h);
    ctx.lineTo(0, v.h);
    ctx.closePath();
    ctx.fill();

    /* quilting and folds */
    ctx.save();
    ctx.strokeStyle = "rgba(236,244,255,0.16)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) {
      const x = v.w * (0.08 + i * 0.17);
      ctx.beginPath();
      ctx.moveTo(x, v.groundY + 14);
      ctx.quadraticCurveTo(x + 40, v.h * 0.82, x - 18, v.h);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(30,44,74,0.28)";
    ctx.lineWidth = 5;
    for (let i = 0; i < 4; i += 1) {
      const y = v.groundY + 46 + i * 46;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(v.w * 0.6, y - 16, v.w, y + 8);
      ctx.stroke();
    }
    ctx.restore();

    /* dotted fabric texture */
    ctx.save();
    ctx.fillStyle = "rgba(240,246,255,0.12)";
    for (let i = 0; i < 90; i += 1) {
      const x = (((i * 97) % 1000) / 1000) * v.w;
      const y = v.groundY + 18 + ((i * 53) % 220);
      if (y > v.h) continue;
      ctx.fillRect(x, y, 1.6, 1.6);
    }
    ctx.restore();

    /* foreground fold ridge */
    const ridge = ctx.createLinearGradient(0, v.h - 120, 0, v.h);
    ridge.addColorStop(0, "rgba(168,189,226,0.55)");
    ridge.addColorStop(1, "rgba(44,58,92,0.15)");
    ctx.fillStyle = ridge;
    ctx.beginPath();
    ctx.moveTo(-30, v.h + 10);
    ctx.quadraticCurveTo(v.w * 0.18, v.h - 120, v.w * 0.48, v.h - 44);
    ctx.quadraticCurveTo(v.w * 0.8, v.h + 20, v.w + 30, v.h - 20);
    ctx.lineTo(v.w + 30, v.h + 20);
    ctx.lineTo(-30, v.h + 20);
    ctx.closePath();
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(226,238,255,0.3)";
    ctx.beginPath();
    ctx.moveTo(-20, v.h - 6);
    ctx.quadraticCurveTo(v.w * 0.2, v.h - 118, v.w * 0.47, v.h - 40);
    ctx.stroke();
  }

  function hallway(ctx, v, t) {
    wallBase(ctx, v, "#221b2c", "#3b2c3d");

    ctx.fillStyle = "rgba(255,228,206,0.045)";
    for (let x = 0; x < v.w; x += 64) ctx.fillRect(x, 0, 24, v.groundY);

    /* wainscot */
    const railY = v.groundY - 106;
    ctx.fillStyle = "#2a2030";
    ctx.fillRect(0, railY, v.w, v.groundY - railY);
    ctx.fillStyle = "#4a3745";
    ctx.fillRect(0, railY - 5, v.w, 7);
    ctx.strokeStyle = "rgba(214,184,168,0.13)";
    ctx.lineWidth = 2;
    for (let x = 18; x < v.w; x += 128) {
      rr(ctx, x, railY + 22, 96, v.groundY - railY - 46, 4);
      ctx.stroke();
    }

    /* tall window on the left, moonlight on the boards */
    const ww = Math.min(196, v.w * 0.17);
    const wh = Math.min(300, v.groundY * 0.46);
    const wx = v.w * 0.08;
    const wy = v.groundY - wh - 62;
    moonWindow(ctx, wx, wy, ww, wh, t);
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = "#cfe4ff";
    ctx.beginPath();
    ctx.moveTo(wx + 6, wy + 20);
    ctx.lineTo(wx + ww - 6, wy + 20);
    ctx.lineTo(wx + ww + 210, v.groundY + 60);
    ctx.lineTo(wx + 130, v.groundY + 60);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    pictureFrame(ctx, v.w * 0.34, v.groundY - 236, 82, 62, 0.03);
    pictureFrame(ctx, v.w * 0.47, v.groundY - 288, 62, 84, -0.04);
    pictureFrame(ctx, v.w * 0.37, v.groundY - 148, 58, 46, 0.06);

    /* coat on a hook */
    ctx.save();
    ctx.translate(v.w * 0.55, railY - 10);
    ctx.strokeStyle = "rgba(200,180,170,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -12, 5, Math.PI * 0.15, Math.PI * 0.85, true);
    ctx.stroke();
    ctx.fillStyle = "rgba(30,24,37,0.92)";
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.quadraticCurveTo(-28, 42, -20, 96);
    ctx.lineTo(16, 96);
    ctx.quadraticCurveTo(24, 44, 18, 0);
    ctx.quadraticCurveTo(0, -14, -22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(196,168,166,0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.quadraticCurveTo(-10, 40, -6, 90);
    ctx.stroke();
    ctx.fillStyle = "rgba(44,36,52,0.9)";
    ctx.beginPath();
    ctx.moveTo(-10, 2);
    ctx.lineTo(0, 12);
    ctx.lineTo(9, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    floorPlanks(ctx, v, "#3b2b28", "rgba(20,12,14,0.35)");
    rug(ctx, v, v.w * 0.2, v.w * 0.62, "#5c3a45", "#d2a08f");

    /* standing lamp at the far end */
    const lampX = v.w * 0.245;
    const lampTop = v.groundY - 214;
    glow(ctx, lampX, lampTop + 40, 230, "rgba(255,196,128,0.24)", 1);
    ctx.strokeStyle = "#8a6a52";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lampX, lampTop + 26);
    ctx.lineTo(lampX, v.groundY - 2);
    ctx.stroke();
    ctx.fillStyle = "#6b523f";
    ellipse(ctx, lampX, v.groundY - 2, 20, 5, 0);
    ctx.fill();
    ctx.fillStyle = "rgba(255,219,163,0.85)";
    ctx.beginPath();
    ctx.moveTo(lampX - 30, lampTop);
    ctx.lineTo(lampX + 30, lampTop);
    ctx.lineTo(lampX + 20, lampTop + 30);
    ctx.lineTo(lampX - 20, lampTop + 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,246,224,0.7)";
    ctx.fillRect(lampX - 20, lampTop + 28, 40, 2);

    motes(ctx, v, t, 16, "#ffe6c4");
  }

  function livingRoom(ctx, v, t, mood) {
    const night = mood === "night";
    wallBase(ctx, v, night ? "#140f22" : "#152529", night ? "#251a30" : "#20363b");

    ctx.fillStyle = "rgba(200,230,230,0.03)";
    for (let x = 0; x < v.w; x += 96) ctx.fillRect(x, 0, 42, v.groundY);

    /* television, right-hand wall */
    const tvW = Math.min(300, v.w * 0.24);
    const tvH = tvW * 0.56;
    const tvX = v.w * 0.66;
    const tvY = v.groundY - tvH - 150;
    glow(
      ctx,
      tvX + tvW / 2,
      tvY + tvH / 2,
      tvW * 1.2,
      night ? "rgba(90,120,200,0.22)" : "rgba(110,190,230,0.32)",
      1
    );
    ctx.fillStyle = "#080c14";
    rr(ctx, tvX - 8, tvY - 8, tvW + 16, tvH + 16, 8);
    ctx.fill();
    const screen = ctx.createLinearGradient(tvX, tvY, tvX + tvW, tvY + tvH);
    screen.addColorStop(0, "#2b5a7a");
    screen.addColorStop(0.5, "#417f9c");
    screen.addColorStop(1, "#1f3f5e");
    ctx.fillStyle = screen;
    rr(ctx, tvX, tvY, tvW, tvH, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(220,246,255,0.16)";
    for (let i = 0; i < 5; i += 1) {
      const y = tvY + 18 + i * (tvH / 6) + Math.sin(t * 1.5 + i) * 4;
      ctx.fillRect(tvX + 14, y, tvW * (0.3 + ((i * 7) % 5) / 10), 5);
    }

    /* bookshelf, left */
    ctx.fillStyle = "#1b1512";
    rr(ctx, v.w * 0.03, v.groundY - 268, v.w * 0.13, 268, 4);
    ctx.fill();
    for (let shelf = 0; shelf < 3; shelf += 1) {
      const y = v.groundY - 250 + shelf * 82;
      ctx.fillStyle = "rgba(140,110,84,0.55)";
      ctx.fillRect(v.w * 0.035, y, v.w * 0.12, 4);
      let bx = v.w * 0.042;
      let i = 0;
      while (bx < v.w * 0.15) {
        const bw = 7 + ((i * 5 + shelf * 3) % 9);
        const bh = 32 + ((i * 13 + shelf * 7) % 30);
        ctx.fillStyle = ["#8d5546", "#6a7a5a", "#59658a", "#a2804f", "#6b4a62"][(i + shelf) % 5];
        ctx.fillRect(bx, y + 4 - bh, bw, bh);
        bx += bw + 2;
        i += 1;
      }
    }

    /* sofa back */
    const sofaY = v.groundY - 128;
    const sg = ctx.createLinearGradient(0, sofaY, 0, v.groundY);
    sg.addColorStop(0, night ? "#2f2740" : "#31525a");
    sg.addColorStop(1, night ? "#221c31" : "#223b42");
    ctx.fillStyle = sg;
    rr(ctx, v.w * 0.1, sofaY, v.w * 0.7, 140, 30);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    for (let i = 0; i < 4; i += 1) {
      for (let j = 0; j < 2; j += 1) {
        ellipse(ctx, v.w * (0.19 + i * 0.17), sofaY + 34 + j * 46, 4, 4, 0);
        ctx.fill();
      }
    }
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 2;
    rr(ctx, v.w * 0.115, sofaY + 12, v.w * 0.67, 112, 22);
    ctx.stroke();

    /* floor */
    if (night) {
      floorPlanks(ctx, v, "#2a2030", "rgba(10,6,14,0.4)");
      rug(ctx, v, v.w * 0.12, v.w * 0.76, "#33263a", "#b98f86");
    } else {
      floorPlanks(ctx, v, "#2c2a2a", "rgba(10,10,12,0.35)");
      rug(ctx, v, v.w * 0.12, v.w * 0.76, "#4a3540", "#d9a48d");
    }

    /* plant in the corner */
    ctx.save();
    ctx.translate(v.w * 0.075, v.groundY + 26);
    ctx.fillStyle = "#2c2420";
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(26, 0);
    ctx.lineTo(19, 44);
    ctx.lineTo(-19, 44);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(-24, 2, 48, 4);
    ctx.strokeStyle = "#2f4a3f";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (let i = 0; i < 7; i += 1) {
      const a = -2.5 + i * 0.36;
      const reach = 78 + (i % 3) * 22;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(a) * reach * 0.5, Math.sin(a) * reach * 0.7, Math.cos(a) * reach, Math.sin(a) * reach);
      ctx.stroke();
      ctx.save();
      ctx.translate(Math.cos(a) * reach, Math.sin(a) * reach);
      ctx.rotate(a + 1.35);
      ctx.fillStyle = i % 2 ? "rgba(43,70,58,0.95)" : "rgba(56,88,70,0.95)";
      ellipse(ctx, 0, 0, 26, 12, 0);
      ctx.fill();
      ctx.strokeStyle = "rgba(180,220,190,0.16)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(20, 0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    motes(ctx, v, t, night ? 34 : 18, night ? "#e2d5ff" : "#ffeccf");
  }

  function kitchen(ctx, v, t) {
    wallBase(ctx, v, "#182632", "#2b4050");

    /* tiles */
    const tile = 54;
    ctx.strokeStyle = "rgba(190,215,235,0.1)";
    ctx.lineWidth = 1.6;
    for (let x = 0; x < v.w; x += tile) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, v.groundY);
      ctx.stroke();
    }
    for (let y = v.groundY % tile; y < v.groundY; y += tile) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(v.w, y);
      ctx.stroke();
    }

    /* upper cabinets */
    const cabTop = Math.max(0, v.groundY - 420);
    const cabH = Math.min(120, v.groundY * 0.17);
    ctx.fillStyle = "#20323f";
    ctx.fillRect(0, cabTop, v.w * 0.3, cabH);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let x = 14; x < v.w * 0.29; x += 96) {
      rr(ctx, x, cabTop + 14, 78, cabH - 28, 4);
      ctx.fill();
    }
    ctx.fillStyle = "#2a3d4b";
    ctx.fillRect(v.w * 0.72, cabTop + 30, v.w * 0.28, cabH - 30);

    /* moonlit window over the sink */
    const ww = Math.min(230, v.w * 0.19);
    const wh = Math.min(190, v.groundY * 0.3);
    const wx = v.w * 0.43;
    const wy = v.groundY - wh - 120;
    moonWindow(ctx, wx, wy, ww, wh, t);

    /* hanging pots */
    ctx.save();
    ctx.strokeStyle = "rgba(160,175,190,0.6)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      const x = v.w * (0.755 + i * 0.075);
      const len = 46 + i * 16;
      ctx.beginPath();
      ctx.moveTo(x, cabTop + 30);
      ctx.lineTo(x, cabTop + 30 + len);
      ctx.stroke();
      ctx.fillStyle = i % 2 ? "#5c6675" : "#4a5563";
      ellipse(ctx, x, cabTop + 40 + len, 18 - i * 3, 7 - i, 0);
      ctx.fill();
    }
    ctx.restore();

    /* counter on the left */
    const counterY = v.groundY - 120;
    ctx.fillStyle = "#2d4250";
    ctx.fillRect(0, counterY, v.w * 0.3, v.groundY - counterY);
    ctx.fillStyle = "#8fa3ae";
    ctx.fillRect(0, counterY, v.w * 0.3, 10);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(0, counterY, v.w * 0.3, 2);
    ctx.fillStyle = "#c9d6dd";
    ctx.beginPath();
    ctx.ellipse(v.w * 0.13, counterY - 2, 34, 20, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = "#a9bcc6";
    ctx.beginPath();
    ctx.ellipse(v.w * 0.13, counterY - 2, 34, 7, 0, 0, TAU);
    ctx.fill();

    /* fridge on the right */
    const fx = v.w * 0.79;
    const fw = Math.min(170, v.w * 0.17);
    const fy = v.groundY - Math.min(330, v.groundY * 0.52);
    ctx.fillStyle = "#394c59";
    rr(ctx, fx, fy, fw, v.groundY - fy + 10, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    rr(ctx, fx + 8, fy + 10, fw - 16, 60, 4);
    ctx.fill();
    ctx.fillStyle = "#27353f";
    ctx.fillRect(fx + fw - 16, fy + 80, 5, 54);
    ctx.fillStyle = "#f0d37a";
    ellipse(ctx, fx + 34, fy + 104, 5, 5, 0);
    ctx.fill();
    ctx.fillStyle = "#ef9f9f";
    ellipse(ctx, fx + 52, fy + 130, 4, 4, 0);
    ctx.fill();
    ctx.fillStyle = "#9fd2b4";
    ctx.fillRect(fx + 30, fy + 150, 26, 18);

    /* warm under-cabinet light */
    glow(ctx, v.w * 0.15, cabTop + cabH + 16, 200, "rgba(255,206,140,0.26)", 1);
    ctx.fillStyle = "rgba(255,214,150,0.6)";
    ctx.fillRect(v.w * 0.02, cabTop + cabH, v.w * 0.26, 3);

    /* checkered floor */
    const rowH = 22;
    for (let y = v.groundY, r = 0; y < v.h; y += rowH, r += 1) {
      const cell = 56;
      for (let x = (r % 2) * -28; x < v.w; x += cell) {
        ctx.fillStyle = (r + Math.round(x / cell)) % 2 === 0 ? "#39444b" : "#2c363d";
        ctx.fillRect(x, y, cell, rowH);
      }
    }
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(0, v.groundY, v.w, 3);

    motes(ctx, v, t, 18, "#d7ecff");
  }


  /* ----------------------------------------------------------- platforms --- */

  function drawPlatform(ctx, p) {
    const w = p.right - p.left;
    const h = p.base - p.top;
    const x = p.left;

    if (p.kind === "pillow") {
      ctx.save();
      ctx.fillStyle = "rgba(20,30,55,0.28)";
      ellipse(ctx, x + w / 2, p.base - 2, w * 0.5, 10, 0);
      ctx.fill();
      ctx.restore();
      const g = ctx.createLinearGradient(0, p.top, 0, p.base);
      g.addColorStop(0, "#f6efe3");
      g.addColorStop(0.6, "#e6dbc9");
      g.addColorStop(1, "#c3b5a1");
      ctx.fillStyle = g;
      rr(ctx, x, p.top, w, h, Math.min(26, h / 2));
      ctx.fill();
      ctx.strokeStyle = "rgba(120,104,86,0.35)";
      ctx.lineWidth = 2;
      rr(ctx, x + 10, p.top + 9, w - 20, h - 18, Math.min(20, h / 2));
      ctx.stroke();
      /* corner tufts */
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ellipse(ctx, x + 14, p.top + 10, 3, 2.4, 0);
      ctx.fill();
      ellipse(ctx, x + w - 14, p.top + 10, 3, 2.4, 0);
      ctx.fill();
      ctx.fillStyle = "rgba(222,150,160,0.6)";
      ellipse(ctx, x + w * 0.3, p.top + h * 0.42, 7, 5, 0.4);
      ctx.fill();
      ellipse(ctx, x + w * 0.72, p.top + h * 0.6, 5, 4, -0.3);
      ctx.fill();
      ellipse(ctx, x + w * 0.52, p.top + h * 0.3, 4, 3.4, 0.2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(x + 16, p.top + 4, w - 32, 2);
      return;
    }

    if (p.kind === "fold") {
      ctx.save();
      ctx.fillStyle = "rgba(18,28,52,0.32)";
      ellipse(ctx, x + w / 2, p.base - 2, w * 0.5, 9, 0);
      ctx.fill();
      ctx.restore();
      const g = ctx.createLinearGradient(0, p.top, 0, p.base);
      g.addColorStop(0, "#b3c6e6");
      g.addColorStop(0.5, "#8ba3cc");
      g.addColorStop(1, "#4b5f88");
      ctx.fillStyle = g;
      rr(ctx, x, p.top + 8, w, h - 8, 26);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.26)";
      ellipse(ctx, x + w * 0.45, p.top + 12, w * 0.42, 9, -0.02);
      ctx.fill();
      ctx.strokeStyle = "rgba(38,52,82,0.4)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 18, p.top + 24);
      ctx.quadraticCurveTo(x + w * 0.5, p.top + 42, x + w - 18, p.top + 22);
      ctx.stroke();
      ctx.strokeStyle = "rgba(236,244,255,0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 26, p.top + 12);
      ctx.quadraticCurveTo(x + w * 0.5, p.top + 4, x + w - 26, p.top + 14);
      ctx.stroke();
      return;
    }

    if (p.kind === "cushion") {
      ctx.save();
      ctx.fillStyle = "rgba(5,10,16,0.35)";
      ellipse(ctx, x + w / 2, p.base - 2, w * 0.48, 9, 0);
      ctx.fill();
      ctx.restore();
      const g = ctx.createLinearGradient(0, p.top, 0, p.base);
      g.addColorStop(0, "#c97b5f");
      g.addColorStop(0.55, "#a8604c");
      g.addColorStop(1, "#7d4538");
      ctx.fillStyle = g;
      rr(ctx, x + 3, p.top + 5, w - 6, h - 5, 20);
      ctx.fill();
      ctx.strokeStyle = "rgba(38,16,12,0.5)";
      ctx.lineWidth = 2;
      rr(ctx, x + 3, p.top + 5, w - 6, h - 5, 20);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,226,198,0.5)";
      ctx.lineWidth = 2;
      rr(ctx, x + 13, p.top + 14, w - 26, h - 24, 13);
      ctx.stroke();
      ctx.fillStyle = "rgba(45,20,14,0.5)";
      ellipse(ctx, x + w / 2, p.top + h * 0.52, 4.5, 4.5, 0);
      ctx.fill();
      ctx.fillStyle = "rgba(255,236,214,0.4)";
      rr(ctx, x + 16, p.top + 6, w - 32, 3, 2);
      ctx.fill();
      return;
    }

    if (p.kind === "stair") {
      const sg = ctx.createLinearGradient(0, p.top, 0, p.base);
      sg.addColorStop(0, "#4a3644");
      sg.addColorStop(1, "#2b1f2b");
      ctx.fillStyle = sg;
      ctx.fillRect(x, p.top + 10, w, h - 10);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(x + w - 8, p.top + 10, 8, h - 10);
      ctx.fillStyle = "#7d4d58";
      ctx.fillRect(x, p.top, w, 13);
      ctx.fillStyle = "rgba(255,230,220,0.22)";
      ctx.fillRect(x, p.top, w, 2);
      ctx.fillStyle = "rgba(240,200,180,0.14)";
      for (let sx = x + 6; sx < x + w; sx += 12) ctx.fillRect(sx, p.top + 4, 1.5, 6);
      return;
    }

    if (p.kind === "box") {
      ctx.fillStyle = "#8a6540";
      rr(ctx, x, p.top + 6, w, h - 6, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(255,236,200,0.16)";
      ctx.fillRect(x, p.top + 6, w, 4);
      ctx.fillStyle = "rgba(60,40,22,0.35)";
      ctx.fillRect(x + w * 0.5 - 2, p.top + 8, 4, h - 8);
      ctx.fillStyle = "#a57b4e";
      ctx.beginPath();
      ctx.moveTo(x + 4, p.top + 8);
      ctx.lineTo(x + w * 0.3, p.top - 12);
      ctx.lineTo(x + w * 0.42, p.top + 8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + w - 4, p.top + 8);
      ctx.lineTo(x + w * 0.72, p.top - 12);
      ctx.lineTo(x + w * 0.6, p.top + 8);
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (p.kind === "stool") {
      ctx.fillStyle = "#4a3325";
      ctx.fillRect(x + 14, p.top + 14, 9, h - 14);
      ctx.fillRect(x + w - 23, p.top + 14, 9, h - 14);
      ctx.fillStyle = "#7d5a3c";
      rr(ctx, x, p.top, w, 15, 5);
      ctx.fill();
      ctx.fillStyle = "rgba(255,240,220,0.2)";
      ctx.fillRect(x + 6, p.top + 2, w - 12, 2);
      return;
    }

    if (p.kind === "books") {
      const colors = ["#8c4b43", "#48607e", "#7a6a45", "#5d4460"];
      let y = p.base;
      for (let i = 0; i < 4; i += 1) {
        const bh = Math.max(9, (h / 4) * (0.8 + (i % 3) * 0.12));
        y -= bh;
        ctx.fillStyle = colors[i % colors.length];
        rr(ctx, x + i * 3, y, w - i * 6, bh, 3);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(x + i * 3 + 5, y + 3, w - i * 6 - 10, 1.6);
      }
      return;
    }

    ctx.fillStyle = "rgba(30,44,60,0.9)";
    rr(ctx, x, p.top, w, h, 8);
    ctx.fill();
  }

  /* --------------------------------------------------------------- scenes --- */

  function drawScene(ctx, scene, time) {
    const v = scene.view;
    const style = scene.level.style;
    ctx.save();
    if (style === "bed") bedroom(ctx, v, time);
    else if (style === "hall") hallway(ctx, v, time);
    else if (style === "sofa") livingRoom(ctx, v, time, "warm");
    else if (style === "kitchen") kitchen(ctx, v, time);
    else livingRoom(ctx, v, time, "night");
    ctx.restore();
  }

  FHM.Art = { drawScene, drawPlatform, drawKitten, drawPrey, drawSlipper, drawVacuum };
})();

