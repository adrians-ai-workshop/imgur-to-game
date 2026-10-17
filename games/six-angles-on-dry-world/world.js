/* ============================================================
   SIX ANGLES ON DRY WORLD -- world.js
   the dry world is one big circle; actors walk its top arc.
   ============================================================ */
(function () {
  "use strict";
  const DRY = window.DRY, Art = DRY.Art;
  const view = DRY.view;
  const W = {}; DRY.World = W;

  /* ---------- surface maths ------------------------------------------- */
  /* a position on the moon is an angle phi plus an altitude ABOVE the crust.
     +alt is up into the sky, so it pushes the radius OUT from the core:
     r = R + alt.  A minus sign here silently buries jumps, slugs and crates
     inside the moon's fill (everything "above ground" was drawn underground). */
  W.pointAt = function (phi, alt) {
    const r = view.R + (alt || 0);
    return { x: view.cx + Math.cos(phi) * r, y: view.cy + Math.sin(phi) * r };
  };

  /* screen point + outward normal for an arc offset from the camera */
  W.arcPoint = function (deltaFromCam, alt) {
    const phi = W.cam.phi + deltaFromCam;
    const p = W.pointAt(phi, alt);
    return { x: p.x, y: p.y, nx: Math.cos(phi), ny: Math.sin(phi), phi: phi };
  };

  /* translate/rotate so local -y points away from the moon's core */
  W.placeOnSurface = function (ctx, deltaFromCam, alt) {
    const a = W.arcPoint(deltaFromCam, alt);
    ctx.translate(a.x, a.y);
    ctx.rotate(a.phi + Math.PI / 2);
    return a;
  };

  /* ---------- camera -------------------------------------------------- */
  W.cam = { phi: -Math.PI / 2, lean: 0, shake: 0, sx: 0, sy: 0, roll: 0 };

  W.resetCamera = function (phi) {
    W.cam.phi = phi === undefined ? -Math.PI / 2 : phi;
    W.cam.lean = 0; W.cam.shake = 0; W.cam.sx = 0; W.cam.sy = 0; W.cam.roll = 0;
  };

  W.followCamera = function (phi, lean, dt) {
    W.cam.phi = DRY.damp(W.cam.phi, phi, 16, dt);
    W.cam.lean = DRY.damp(W.cam.lean, lean || 0, 8, dt);
    view.playerPhi = W.cam.phi;
    DRY.placeCamera(W.cam.phi, W.cam.lean + (W.cam.roll || 0) * 34);
    if (W.cam.shake > 0.05) {
      const m = W.cam.shake;
      W.cam.sx = (DRY.rng() - 0.5) * m * 2;
      W.cam.sy = (DRY.rng() - 0.5) * m * 2;
      W.cam.roll = DRY.lerp(W.cam.roll, (DRY.rng() - 0.5) * m * 0.0016, 0.4);
      W.cam.shake = Math.max(0, W.cam.shake * Math.pow(0.02, dt) - 7 * dt);
    } else {
      W.cam.shake = 0; W.cam.sx = 0; W.cam.sy = 0;
      W.cam.roll = DRY.damp(W.cam.roll, 0, 12, dt);
    }
  };

  W.shake = function (mag) { W.cam.shake = Math.min(34, W.cam.shake + mag); };

  /* ---------- particles + floating text ------------------------------- */
  const parts = [];
  const callouts = [];
  W.parts = parts; W.callouts = callouts;
  W.resetParts = function () { parts.length = 0; callouts.length = 0; };

  W.puff = function (x, y, nx, ny, count, opts) {
    const o = opts || {};
    for (let i = 0; i < count; i += 1) {
      const spread = o.spread === undefined ? 1 : o.spread;
      const dir = Math.atan2(ny, nx) + (DRY.rng() - 0.5) * spread;
      const speed = DRY.lerp(o.min || 30, o.max || 200, DRY.rng());
      const life = DRY.lerp(o.life ? o.life[0] : 0.25, o.life ? o.life[1] : 0.7, DRY.rng());
      parts.push({
        x: x, y: y, vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed - (o.lift || 0),
        life: life, max: life, size: DRY.lerp(1.6, 5.4, DRY.rng()) * (o.scale || 1),
        kind: o.kind || "dot", spin: (DRY.rng() - 0.5) * 9, rot: DRY.rng() * DRY.TAU,
      });
    }
    if (parts.length > 760) parts.splice(0, parts.length - 760);
  };

  W.updateParts = function (dt) {
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += (p.kind === "star" ? 240 : 520) * dt;
      p.vx *= Math.pow(0.35, dt);
      p.rot += p.spin * dt;
    }
    for (let i = callouts.length - 1; i >= 0; i -= 1) {
      const c = callouts[i];
      c.life -= dt;
      if (c.life <= 0) { callouts.splice(i, 1); continue; }
      c.y += c.vy * dt; c.vy *= Math.pow(0.45, dt);
    }
  };

  W.drawParts = function (ctx) {
    ctx.save();
    for (let i = 0; i < parts.length; i += 1) {
      const p = parts[i];
      const t = DRY.clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = Math.min(1, t * 1.6);
      if (p.kind === "star") {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        Art.muzzleFlash(ctx, p.size * 2.3, i % 5);
        ctx.restore();
      } else if (p.kind === "shard") {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = Art.INK;
        ctx.beginPath();
        ctx.moveTo(-p.size * 1.8, -p.size * 0.5); ctx.lineTo(p.size * 1.8, -p.size * 0.3); ctx.lineTo(0, p.size);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = Art.INK;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.6, p.size * (0.4 + t * 0.8)), 0, DRY.TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < callouts.length; i += 1) {
      const c = callouts[i];
      const t = DRY.clamp(c.life / c.max, 0, 1);
      const size = Math.round((c.size || 26) * view.unit);
      ctx.globalAlpha = Math.min(1, t * 2.4);
      ctx.font = "700 " + size + 'px "Trebuchet MS", Impact, sans-serif';
      ctx.textAlign = "center";
      const w = ctx.measureText(c.text).width;
      ctx.fillStyle = Art.BONE;
      ctx.fillRect(c.x - w / 2 - 7, c.y - size, w + 14, size * 1.3);
      ctx.strokeStyle = Art.INK; ctx.lineWidth = 2;
      ctx.strokeRect(c.x - w / 2 - 7, c.y - size, w + 14, size * 1.3);
      ctx.fillStyle = c.danger ? Art.RED : Art.INK;
      ctx.fillText(c.text, c.x, c.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  W.callout = function (text, x, y, opts) {
    const o = opts || {};
    callouts.push({
      text: text, x: x, y: y, vy: -74 - (o.rise || 0),
      life: o.life || 0.85, max: o.life || 0.85, size: o.size || 26, danger: !!o.danger,
    });
    if (callouts.length > 20) callouts.shift();
  };

  /* ---------- background --------------------------------------------- */
  function hashOf(n) { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }
  W.hashOf = hashOf;

  const cloudRng = DRY.makeRng(90817);
  const clouds = [];
  for (let i = 0; i < 9; i += 1) {
    clouds.push({
      u: cloudRng(), y: cloudRng.range(0.06, 0.4), s: cloudRng.range(0.55, 1.5),
      puff: cloudRng() * 3, tone: i % 3 === 0 ? "fine" : "coarse",
    });
  }

  function drawClouds(ctx, t) {
    const scroll = W.cam.phi * view.R * 0.16;
    for (let i = 0; i < clouds.length; i += 1) {
      const c = clouds[i];
      const x = DRY.fract(c.u - scroll / (view.W * 2.4)) * (view.W + view.H * 0.8) - view.H * 0.4;
      ctx.save();
      ctx.translate(x, view.H * c.y);
      Art.toneFill(ctx, c.tone, function (k) {          /* manga cloud: bumpy top, flat underside */
        const r = view.unit * 34 * c.s;
        k.moveTo(-r * 1.6, 0);
        k.lineTo(r * 1.45, 0);
        k.quadraticCurveTo(r * 1.7, -r * 0.42, r * 0.85, -r * 0.6);
        k.quadraticCurveTo(r * 0.1, -r * (1.3 + Math.sin(t * 0.5 + c.puff) * 0.1), -r * 0.5, -r * 0.72);
        k.quadraticCurveTo(-r * 1.5, -r * 0.9, -r * 1.6, 0);
        k.closePath();
      });
      ctx.restore();
    }
  }

  /* the crust: one huge circle, its top arc is the horizon */
  function drawCrust(ctx) {
    const cx = view.cx, cy = view.cy, R = view.R;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, DRY.TAU);
    ctx.fillStyle = Art.BONE; ctx.fill();

    const span = Math.asin(DRY.clamp(view.W * 0.62 / R, -1, 1)) + 0.3;
    ctx.beginPath(); ctx.arc(cx, cy, R - 8, -Math.PI / 2 - span, -Math.PI / 2 + span);
    ctx.lineWidth = 15; ctx.strokeStyle = "rgba(20,18,15,0.14)"; ctx.stroke();

    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2 - span, -Math.PI / 2 + span);
    ctx.lineWidth = 3.2; ctx.strokeStyle = Art.INK; ctx.stroke();

    /* surface detail is nailed to the moon and scrolls as we walk it */
    const step = 108 * view.unit;
    const s0 = W.cam.phi * R;
    const kStart = Math.floor((s0 - view.W) / step);
    for (let k = kStart; k <= kStart + 24 && (k * step) < s0 + view.W; k += 1) {
      if (!isFinite(k)) continue;
      const phiK = (k * step) / R;
      const delta = DRY.shortAngle(W.cam.phi, phiK);
      if (Math.abs(delta) > 0.75) continue;
      const h = hashOf(Math.abs(k) + 1);
      const p = W.pointAt(phiK, 0);
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(phiK + Math.PI / 2);
      ctx.strokeStyle = Art.INK;
      if (h < 0.34) {                                    /* shallow crater */
        const r = step * (0.16 + h * 0.5);
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, DRY.TAU); ctx.stroke();
        ctx.globalAlpha = 0.35; ctx.fillStyle = Art.INK;
        ctx.fillRect(-r * 0.5, -1.4, r, 2.6);
      } else if (h < 0.6) {                              /* pebble stack */
        for (let i = 0; i < 3; i += 1) {
          const pr = step * (0.03 + hashOf(Math.abs(k) * 7 + i) * 0.05);
          ctx.beginPath(); ctx.arc(step * (i - 1) * 0.14, -pr, pr, 0, DRY.TAU);
          ctx.fillStyle = Art.INK; ctx.globalAlpha = 0.8; ctx.fill();
        }
      } else if (h < 0.78) {                              /* dry scrub */
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i += 1) {
          const a2 = -0.5 + i * 0.36;
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(Math.cos(a2) * 8, -step * 0.1, Math.cos(a2) * step * 0.11, -step * 0.2);
          ctx.stroke();
        }
      } else {                                            /* a bleached rib */
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, -6, 7, Math.PI, DRY.TAU); ctx.stroke();
        ctx.fillStyle = Art.INK;
        ctx.fillRect(-9, -8, 4, 8); ctx.fillRect(5, -8, 4, 8);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  W.drawBackground = function (ctx, t) {
    const grd = ctx.createLinearGradient(0, 0, 0, view.H);
    grd.addColorStop(0, "#e4ddd0");
    grd.addColorStop(0.52, Art.PAPER);
    grd.addColorStop(1, "#efe9dd");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, view.W, view.H);

    ctx.save();                                          /* drifting dust motes */
    ctx.globalAlpha = 0.22; ctx.fillStyle = Art.INK;
    for (let i = 0; i < 42; i += 1) {
      const x = DRY.fract(hashOf(i * 3.1) + t * 0.006 + W.cam.phi * 0.02) * view.W;
      const y = hashOf(i * 7.7) * view.H * 0.55;
      ctx.fillRect(x, y, 1.6, 1.6);
    }
    ctx.restore();

    drawClouds(ctx, t);
    drawCrust(ctx);
  };

  /* ink vignette so the panel edges read as printed paper + ink */
  W.drawVignette = function (ctx) {
    const g = ctx.createRadialGradient(view.W * 0.5, view.H * 0.52, Math.min(view.W, view.H) * 0.34,
      view.W * 0.5, view.H * 0.52, Math.max(view.W, view.H) * 0.8);
    g.addColorStop(0, "rgba(20,18,15,0)");
    g.addColorStop(1, "rgba(20,18,15,0.34)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.W, view.H);
  };


})();
