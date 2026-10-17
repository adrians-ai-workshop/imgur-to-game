/* ============================================================
   SIX ANGLES ON DRY WORLD -- art.js
   black & white manga renderer: screentone patterns + actors.
   Every actor draws feet-at-origin, facing +x, height = h px.
   ============================================================ */
(function () {
  "use strict";
  const DRY = window.DRY;
  const INK = "#14120f", PAPER = "#efeadf", BONE = "#faf7f0", RED = "#d2261f";

  function makeTone(cell, radius) {
    const tile = document.createElement("canvas");
    tile.width = cell; tile.height = cell;
    const c = tile.getContext("2d");
    c.fillStyle = INK;
    const spots = [[cell * 0.5, cell * 0.5], [0, 0], [cell, 0], [0, cell], [cell, cell]];
    for (let i = 0; i < spots.length; i += 1) {
      c.beginPath();
      c.arc(spots[i][0], spots[i][1], radius, 0, DRY.TAU);
      c.fill();
    }
    return tile;
  }

  const Art = DRY.Art = { INK: INK, PAPER: PAPER, BONE: BONE, RED: RED };
  let toneFineTile = null, toneCoarseTile = null, hatchTile = null;
  const patternCache = new WeakMap(); /* ctx -> Map(name -> CanvasPattern) */

  function pattern(ctx, name) {
    let perCtx = patternCache.get(ctx);
    if (!perCtx) { perCtx = new Map(); patternCache.set(ctx, perCtx); }
    if (perCtx.has(name)) return perCtx.get(name);
    let tile = null;
    if (name === "fine") { toneFineTile = toneFineTile || makeTone(6, 1.25); tile = toneFineTile; }
    else if (name === "coarse") { toneCoarseTile = toneCoarseTile || makeTone(9, 2.35); tile = toneCoarseTile; }
    else if (name === "hatch") {
      hatchTile = hatchTile || (function () {
        const t = document.createElement("canvas");
        t.width = 8; t.height = 8;
        const c = t.getContext("2d");
        c.strokeStyle = INK; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(-2, 10); c.lineTo(10, -2); c.moveTo(-2, 2); c.lineTo(2, -2); c.moveTo(6, 10); c.lineTo(10, 6);
        c.stroke();
        return t;
      })();
      tile = hatchTile;
    }
    const pat = ctx.createPattern(tile, "repeat");
    perCtx.set(name, pat);
    return pat;
  }

  function pathOf(ctx, fn) { fn(ctx); }

  /* mid-grey manga fill: paper base + clipped screentone dots */
  Art.toneFill = function (ctx, name, fn) {
    ctx.save();
    ctx.beginPath(); fn(ctx);
    ctx.fillStyle = PAPER; ctx.fill();
    ctx.clip();
    ctx.fillStyle = pattern(ctx, name);
    const v = DRY.view;
    ctx.fillRect(v.cx - v.W * 4 - v.R * 2, v.cy - v.H * 3 - v.R * 2, v.R * 8 + v.W * 6, v.H * 8 + v.R * 4);
    ctx.restore();
    ctx.save();
    ctx.beginPath(); fn(ctx); ctx.strokeStyle = INK; ctx.lineWidth = 2.1; ctx.stroke();
    ctx.restore();
  };

  Art.inkFill = function (ctx, fn) {
    ctx.beginPath(); fn(ctx); ctx.fillStyle = INK; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
  };

  Art.paperStroke = function (ctx, w, fn) {
    ctx.beginPath(); fn(ctx); ctx.fillStyle = PAPER; ctx.fill();
    ctx.lineWidth = w || 2; ctx.strokeStyle = INK; ctx.stroke();
  };

  /* shared little pieces -------------------------------------------------- */

  function boot(ctx, x, y, s, facingBack) {
    Art.inkFill(ctx, function (c) {
      c.moveTo(x - s * 0.5, y - s * 1.5);
      c.lineTo(x + s * 0.62, y - s * 1.3);
      c.lineTo(x + s * 0.72, y - s * 0.28);
      c.lineTo(x + s * 1.5, y - s * 0.2);   /* toe */
      c.lineTo(x + s * 1.46, y + s * 0.32);
      c.lineTo(x - s * 0.62, y + s * 0.32);
      c.closePath();
    });
    if (!facingBack) { /* sole lugs */
      for (let i = 0; i < 4; i += 1) {
        Art.paperStroke(ctx, 0.9, function (c) {
          const lx = x + s * (-0.28 + i * 0.42);
          c.rect(lx, y + s * 0.06, s * 0.3, s * 0.3);
        });
      }
    }
  }

  function kneePatch(ctx, x, y, r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, DRY.TAU);
    ctx.fillStyle = PAPER; ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke();
    ctx.clip();
    ctx.fillStyle = pattern(ctx, "coarse"); ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  function spikyHair(ctx, cx, cy, rx, ry, spikes) {
    Art.inkFill(ctx, function (c) {
      for (let i = 0; i <= spikes; i += 1) {
        const t = i / spikes;
        const a = Math.PI + t * Math.PI;         /* sweep across the top */
        const bx = cx + Math.cos(a) * rx;
        const by = cy + Math.sin(a) * ry * 0.72;
        if (i === 0) c.moveTo(bx, by); else c.lineTo(bx, by);
        if (i < spikes) {
          const mid = a - Math.PI / spikes * 0.55;
          const lift = 1 + (i % 2 ? 0.9 : 1.45);
          c.lineTo(cx + Math.cos(a + 0.16) * rx * lift, cy + Math.sin(mid) * ry * lift * 1.5);
        }
      }
      c.lineTo(cx + rx, cy + ry * 0.35);
      c.lineTo(cx - rx, cy + ry * 0.2);
      c.closePath();
    });
    /* paper glints through the ink */
    ctx.save();
    ctx.strokeStyle = PAPER; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(cx - rx * 0.5 + i * rx * 0.45, cy - ry * 0.1);
      ctx.lineTo(cx - rx * 0.28 + i * rx * 0.45, cy - ry * (0.62 + (i % 2) * 0.3));
      ctx.stroke();
    }
    ctx.restore();
  }

  function roundShades(ctx, cx, cy, r) {
    Art.paperStroke(ctx, 1, function (c) { c.arc(cx - r * 1.15, cy, r, 0, DRY.TAU); });
    Art.paperStroke(ctx, 1, function (c) { c.arc(cx + r * 0.95, cy, r, 0, DRY.TAU); });
    ctx.save();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.6;
    [cx - r * 1.15, cx + r * 0.95].forEach(function (lx) {
      ctx.beginPath(); ctx.arc(lx, cy, r, 0, DRY.TAU); ctx.stroke();
    });
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.2, cy - r * 0.35); ctx.lineTo(cx + r * 0.05, cy - r * 0.35); ctx.stroke();
    /* glint */
    ctx.strokeStyle = PAPER; ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.moveTo(cx - r * 1.6, cy + r * 0.4); ctx.lineTo(cx - r * 0.9, cy - r * 0.5); ctx.stroke();
    ctx.restore();
  }

  /* the oversized sidearm: drawn from the grip, pointing along +x */
  function revolver(ctx, u) {
    Art.paperStroke(ctx, 2.1, function (c) {
      c.moveTo(-u * 0.05, -u * 0.04);
      c.lineTo(u * 0.34, -u * 0.05);          /* barrel top */
      c.lineTo(u * 0.36, 0.01);
      c.lineTo(u * 0.2, 0.03);                /* under-barrel */
      c.lineTo(u * 0.19, u * 0.075);
      c.lineTo(u * 0.05, u * 0.06);
      c.closePath();
    });
    Art.toneFill(ctx, "hatch", function (c) {   /* cylinder */
      c.moveTo(u * 0.02, -u * 0.045);
      c.lineTo(u * 0.13, -u * 0.05);
      c.lineTo(u * 0.14, u * 0.06);
      c.lineTo(u * 0.03, u * 0.065);
      c.closePath();
    });
    Art.inkFill(ctx, function (c) {              /* grip */
      c.moveTo(-u * 0.02, -u * 0.01);
      c.lineTo(u * 0.05, u * 0.0);
      c.lineTo(u * 0.02, u * 0.17);
      c.lineTo(-u * 0.09, u * 0.14);
      c.closePath();
    });
    Art.inkFill(ctx, function (c) {              /* front sight */
      c.rect(u * 0.3, -u * 0.085, u * 0.04, u * 0.04);
    });
  }

  /* one inked arm holding the sidearm; aim is the local muzzle angle */
  function gunArm(ctx, u, aim) {
    const sx = u * 0.13, sy = -u * 0.68;
    const reach = u * 0.27;
    const hx = sx + Math.cos(aim) * reach, hy = sy + Math.sin(aim) * reach;
    const nx = Math.cos(aim + Math.PI / 2), ny = Math.sin(aim + Math.PI / 2);
    Art.toneFill(ctx, "fine", function (c) {     /* sleeve */
      c.moveTo(sx + nx * u * 0.055, sy + ny * u * 0.055);
      c.lineTo(hx + nx * u * 0.042, hy + ny * u * 0.042);
      c.lineTo(hx - nx * u * 0.042, hy - ny * u * 0.042);
      c.lineTo(sx - nx * u * 0.075, sy - ny * u * 0.075);
      c.closePath();
    });
    Art.paperStroke(ctx, 1.8, function (c) {     /* bracer cuff */
      const cx = hx - Math.cos(aim) * u * 0.06, cy2 = hy - Math.sin(aim) * u * 0.06;
      c.moveTo(cx + nx * u * 0.055, cy2 + ny * u * 0.055);
      c.lineTo(cx - nx * u * 0.055, cy2 - ny * u * 0.055);
      c.lineTo(hx - nx * u * 0.05, hy - ny * u * 0.05);
      c.lineTo(hx + nx * u * 0.05, hy + ny * u * 0.05);
      c.closePath();
    });
    ctx.save();
    ctx.translate(hx, hy);
    Art.inkFill(ctx, function (c) { c.arc(0, 0, u * 0.052, 0, DRY.TAU); });   /* gloved fist */
    ctx.rotate(aim);
    revolver(ctx, u);
    ctx.restore();
    return { x: hx + Math.cos(aim) * u * 0.36, y: hy + Math.sin(aim) * u * 0.36 };
  }

  /* the gunman -- tall coat, a hundred buttons, hair like broken glass */
  Art.hero = function (ctx, a) {
    const u = a.h;
    const walk = a.walk || 0;
    const swing = Math.sin(walk) * u * 0.1;
    ctx.save();

    /* back leg: solid ink, the way the panel inks the shadow side */
    ctx.save();
    ctx.translate(-u * 0.03 + swing * 0.4, 0);
    Art.toneFill(ctx, "coarse", function (c) {
      c.moveTo(-u * 0.06, -u * 0.42);
      c.lineTo(u * 0.05, -u * 0.4);
      c.lineTo(u * 0.08 + swing * 0.3, -u * 0.1);
      c.lineTo(-u * 0.09 + swing * 0.3, -u * 0.08);
      c.closePath();
    });
    boot(ctx, swing * 0.5, 0, u * 0.115, true);
    ctx.restore();

    /* coat tails snapping in the thin air */
    Art.toneFill(ctx, "coarse", function (c) {
      const f = Math.sin(a.coat || 0) * u * 0.03;
      c.moveTo(-u * 0.16, -u * 0.5);
      c.lineTo(-u * 0.52 + f, -u * (0.3 + (a.flap || 0)));
      c.lineTo(-u * 0.4 + f, -u * 0.16);
      c.lineTo(-u * 0.44, -u * 0.05);
      c.lineTo(-u * 0.28, -u * 0.13);
      c.lineTo(-u * 0.22, u * 0.02);
      c.lineTo(-u * 0.1, -u * 0.2);
      c.closePath();
    });

    /* front leg */
    Art.toneFill(ctx, "fine", function (c) {
      c.moveTo(u * 0.02, -u * 0.43);
      c.lineTo(u * 0.15, -u * 0.42);
      c.lineTo(u * 0.2 - swing * 0.35, -u * 0.1);
      c.lineTo(u * 0.02 - swing * 0.35, -u * 0.09);
      c.closePath();
    });
    kneePatch(ctx, u * 0.1 - swing * 0.2, -u * 0.24, u * 0.062);
    boot(ctx, u * 0.05 - swing * 0.35, 0, u * 0.12, false);

    /* coat body + shoulders */
    Art.toneFill(ctx, "coarse", function (c) {
      c.moveTo(-u * 0.17, -u * 0.84);
      c.lineTo(u * 0.19, -u * 0.85);           /* shoulder line */
      c.lineTo(u * 0.23, -u * 0.5);
      c.lineTo(u * 0.17, -u * 0.24);            /* front hem */
      c.lineTo(-u * 0.19, -u * 0.28);
      c.lineTo(-u * 0.2, -u * 0.6);
      c.closePath();
    });
    /* belt */
    Art.paperStroke(ctx, 1.8, function (c) { c.rect(-u * 0.2, -u * 0.47, u * 0.43, u * 0.06); });
    ctx.fillStyle = pattern(ctx, "fine");
    ctx.fillRect(-u * 0.19, -u * 0.465, u * 0.41, u * 0.05);
    for (let r = 0; r < 2; r += 1) {           /* the buttons down the chest */
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc((r ? u * 0.09 : -u * 0.06), -u * (0.78 - i * 0.1), u * 0.02, 0, DRY.TAU);
        ctx.fillStyle = INK; ctx.fill();
      }
    }

    /* collar up over the mouth, then face, shades, hair */
    Art.toneFill(ctx, "hatch", function (c) {
      c.moveTo(-u * 0.14, -u * 0.8);
      c.lineTo(u * 0.17, -u * 0.82);
      c.lineTo(u * 0.14, -u * 0.93);
      c.lineTo(-u * 0.12, -u * 0.92);
      c.closePath();
    });
    Art.paperStroke(ctx, 1.7, function (c) { c.arc(u * 0.02, -u * 0.95, u * 0.1, 0, DRY.TAU); });
    roundShades(ctx, u * 0.03, -u * 0.965, u * 0.042);
    spikyHair(ctx, u * 0.02, -u * 1.02, u * 0.13, u * 0.11, 7);

    /* free arm swings; the gun arm follows the aim */
    Art.toneFill(ctx, "fine", function (c) {
      const sw = Math.sin(walk + 2.1) * u * 0.06;
      c.moveTo(-u * 0.14, -u * 0.8);
      c.lineTo(-u * 0.22 + sw, -u * (0.53 + (a.reach || 0)));
      c.lineTo(-u * 0.1 + sw, -u * 0.52);
      c.closePath();
    });

    const muzzle = gunArm(ctx, u, a.aim);
    ctx.restore();
    return { mx: muzzle.x, my: muzzle.y };
  };

  /* ---------- the bounty crowd ---------------------------------------- */

  /* Tinker-Boots Gang: pot helmet, rivet rod, everything bolted on */
  Art.tinker = function (ctx, a) {
    const u = a.h, swing = Math.sin(a.walk || 0) * u * 0.12;
    ctx.save();
    ctx.translate(0, -(a.bob || 0));
    boot(ctx, -u * 0.05 + swing * 0.6, (a.bob || 0), u * 0.13, true);
    Art.toneFill(ctx, "coarse", function (c) {           /* patched coat */
      c.moveTo(-u * 0.24, -u * 0.68);
      c.lineTo(u * 0.26, -u * 0.7);
      c.lineTo(u * 0.3, -u * 0.16);
      c.lineTo(u * 0.05, -u * 0.05);
      c.lineTo(-u * 0.28, -u * 0.12);
      c.closePath();
    });
    boot(ctx, u * 0.1 - swing * 0.6, (a.bob || 0), u * 0.14, false);
    /* the pot on its head, bristling with stolen bolts */
    Art.paperStroke(ctx, 2.1, function (c) {
      c.moveTo(-u * 0.2, -u * 0.78);
      c.lineTo(u * 0.2, -u * 0.78);
      c.quadraticCurveTo(u * 0.22, -u * 1.06, -u * 0.02, -u * 1.05);
      c.quadraticCurveTo(-u * 0.24, -u * 1.03, -u * 0.2, -u * 0.78);
      c.closePath();
    });
    for (let i = 0; i < 3; i += 1) {                      /* bolts */
      const bx = -u * 0.14 + i * u * 0.16, by = -u * (1.02 - (i % 2) * 0.05);
      Art.paperStroke(ctx, 1.3, function (c) { c.rect(bx, by - u * 0.14, u * 0.05, u * 0.16); });
    }
    /* one wide goggle eye */
    ctx.beginPath(); ctx.arc(u * 0.08, -u * 0.87, u * 0.09, 0, DRY.TAU);
    ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.arc(u * 0.11, -u * 0.9, u * 0.026, 0, DRY.TAU);
    ctx.fillStyle = PAPER; ctx.fill();
    /* rivet rod held with both hands, rotates to the aim */
    ctx.save();
    ctx.translate(u * 0.1, -u * 0.58);
    ctx.rotate(a.aim || 0);
    Art.paperStroke(ctx, 1.9, function (c) { c.rect(-u * 0.06, -u * 0.05, u * 0.44, u * 0.1); });
    Art.toneFill(ctx, "hatch", function (c) { c.rect(u * 0.3, -u * 0.075, u * 0.1, u * 0.15); });
    ctx.restore();
    ctx.restore();
    const aim = a.aim || 0;
    return { mx: u * 0.1 + Math.cos(aim) * u * 0.42, my: -u * 0.58 + Math.sin(aim) * u * 0.42 };
  };

  /* Ash Acolyte: hood, vows, one long iron nail */
  Art.acolyte = function (ctx, a) {
    const u = a.h, sway = Math.sin((a.walk || 0) * 0.7) * u * 0.03;
    ctx.save();
    if (a.boss) ctx.translate(0, -Math.abs(Math.sin((a.walk || 0) * 0.5)) * u * 0.02);
    Art.toneFill(ctx, "coarse", function (c) {            /* robe */
      c.moveTo(-u * 0.04, -u * 1.06);
      c.lineTo(u * 0.2 + sway, -u * 0.9);
      c.lineTo(u * 0.3 + sway, -u * 0.05);                /* trailing hem */
      c.lineTo(-u * 0.34 - swingSway(a), u * 0.0);
      c.lineTo(-u * 0.26, -u * 0.62);
      c.closePath();
    });
    function swingSway(act) { return Math.sin((act.walk || 0) * 1.3) * u * 0.05; }
    /* hood + the dark where a face should be */
    Art.paperStroke(ctx, 2.2, function (c) {
      c.moveTo(u * 0.18 + sway, -u * 0.86);
      c.quadraticCurveTo(u * 0.05, -u * 1.18, -u * 0.2, -u * 1.0);
      c.lineTo(-u * 0.13, -u * 0.74);
      c.lineTo(u * 0.16 + sway, -u * 0.78);
      c.closePath();
    });
    Art.inkFill(ctx, function (c) {                       /* the void inside */
      c.moveTo(u * 0.12 + sway, -u * 0.86);
      c.lineTo(-u * 0.06, -u * 1.04);
      c.lineTo(-u * 0.05, -u * 0.8);
      c.closePath();
    });
    ctx.fillStyle = PAPER;
    ctx.fillRect(u * 0.0 + sway, -u * 0.93, u * 0.04, u * 0.025);
    ctx.fillRect(-u * 0.06, -u * 0.98, u * 0.04, u * 0.025);
    if (a.boss) {                                          /* ashen pauldron */
      Art.toneFill(ctx, "hatch", function (c) {
        c.moveTo(u * 0.16 + sway, -u * 0.94);
        c.lineTo(u * 0.42 + sway, -u * 0.86);
        c.lineTo(u * 0.3, -u * 0.66);
        c.lineTo(u * 0.1, -u * 0.76);
        c.closePath();
      });
    }
    const aim = a.aim || 0;
    ctx.save();                                            /* the nail */
    ctx.translate(u * 0.12, -u * 0.66);
    ctx.rotate(aim + Math.PI / 2);                         /* nails are thrust, not aimed level */
    Art.paperStroke(ctx, 1.8, function (c) {
      c.moveTo(-u * 0.035, 0);
      c.lineTo(u * 0.035, 0);
      c.lineTo(0, u * 0.46);
      c.closePath();
    });
    Art.inkFill(ctx, function (c) { c.rect(-u * 0.07, -u * 0.05, u * 0.14, u * 0.07); });
    ctx.restore();
    ctx.restore();
    const reach = a.boss ? u * 0.62 : u * 0.46;
    return { mx: u * 0.12 + Math.cos(aim) * reach, my: -u * 0.66 + Math.sin(aim) * reach };
  };

  /* Powder Boy: a barrel of black powder with a kid strapped to it */
  Art.powder = function (ctx, a) {
    const u = a.h, swing = Math.sin((a.walk || 0) * 1.4) * u * 0.1;
    ctx.save();
    boot(ctx, -u * 0.06 + swing * 0.5, 0, u * 0.12, true);
    Art.toneFill(ctx, "coarse", function (c) {            /* the barrel body */
      c.moveTo(-u * 0.3, -u * 0.78);
      c.lineTo(u * 0.3, -u * 0.78);
      c.quadraticCurveTo(u * 0.42, -u * 0.4, u * 0.26, -u * 0.1);
      c.lineTo(-u * 0.26, -u * 0.1);
      c.quadraticCurveTo(-u * 0.42, -u * 0.4, -u * 0.3, -u * 0.78);
      c.closePath();
    });
    boot(ctx, u * 0.1 - swing * 0.5, 0, u * 0.13, false);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4;            /* barrel hoops */
    [-u * 0.62, -u * 0.28].forEach(function (hy) {
      ctx.beginPath(); ctx.moveTo(-u * 0.35, hy); ctx.lineTo(u * 0.35, hy); ctx.stroke();
    });
    /* the head sits on top of the barrel, squinting over the rim */
    Art.paperStroke(ctx, 1.9, function (c) { c.arc(0, -u * 0.94, u * 0.16, 0, DRY.TAU); });
    ctx.fillStyle = INK;
    ctx.fillRect(-u * 0.09, -u * 0.98, u * 0.05, u * 0.03);
    ctx.fillRect(u * 0.04, -u * 0.98, u * 0.05, u * 0.03);
    Art.inkFill(ctx, function (c) {                       /* flat cap */
      c.moveTo(-u * 0.17, -u * 1.02);
      c.quadraticCurveTo(0, -u * 1.24, u * 0.19, -u * 1.0);
      c.lineTo(u * 0.3, -u * 0.99);
      c.closePath();
    });
    /* lit fuse waving off the shoulder */
    const fu = a.fuse || 0;
    ctx.save();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(u * 0.2, -u * 0.74);
    ctx.quadraticCurveTo(u * 0.34 + Math.sin(fu * 9) * u * 0.05, -u * 0.86, u * 0.28, -u * (1.0 + Math.sin(fu * 7) * 0.04));
    ctx.stroke();
    Art.inkFill(ctx, function (c) { c.arc(u * 0.28, -u * 1.0, u * 0.035 + Math.abs(Math.sin(fu * 14)) * u * 0.02, 0, DRY.TAU); });
    ctx.restore();
    const aim = a.aim || -0.6;
    return { mx: u * 0.2 + Math.cos(aim) * u * 0.3, my: -u * 0.8 + Math.sin(aim) * u * 0.3 };
  };

  /* the kid with the hand-lettered placard; never stops talking */
  Art.escort = function (ctx, a) {
    const u = a.h, swing = Math.sin((a.walk || 0) * 1.25) * u * 0.11;
    ctx.save();
    boot(ctx, -u * 0.04 + swing * 0.55, 0, u * 0.13, true);
    Art.paperStroke(ctx, 2, function (c) {                /* shirt */
      c.moveTo(-u * 0.19, -u * 0.78);
      c.lineTo(u * 0.2, -u * 0.79);
      c.lineTo(u * 0.16, -u * 0.3);
      c.lineTo(-u * 0.17, -u * 0.3);
      c.closePath();
    });
    boot(ctx, u * 0.08 - swing * 0.55, 0, u * 0.14, false);
    Art.toneFill(ctx, "fine", function (c) {              /* necktie */
      c.moveTo(u * 0.02, -u * 0.76);
      c.lineTo(u * 0.08, -u * 0.56);
      c.lineTo(0, -u * 0.4);
      c.closePath();
    });
    Art.paperStroke(ctx, 1.9, function (c) { c.arc(u * 0.02, -u * 0.92, u * 0.155, 0, DRY.TAU); });
    ctx.fillStyle = INK;                                  /* messy hair */
    ctx.beginPath();
    ctx.moveTo(-u * 0.14, -u * 0.96);
    ctx.quadraticCurveTo(u * 0.02, -u * 1.15, u * 0.17, -u * 0.93);
    ctx.lineTo(u * 0.1, -u * 0.98);
    ctx.lineTo(0, -u * 0.9);
    ctx.lineTo(-u * 0.08, -u * 1.0);
    ctx.closePath(); ctx.fill();
    roundShades(ctx, u * 0.03, -u * 0.92, u * 0.055);
    /* the placard: two boards cross-shaped, propped on one shoulder */
    ctx.save();
    const tilt = (a.placard || 0) - 0.18;
    ctx.translate(u * 0.02, -u * 1.06);
    ctx.rotate(tilt);
    Art.paperStroke(ctx, 2.2, function (c) { c.rect(-u * 0.5, -u * 0.34, u * 1.0, u * 0.3); });
    Art.toneFill(ctx, "hatch", function (c) {             /* hand-lettering, unreadable at this size */
      for (let i = 0; i < 4; i += 1) c.rect(-u * 0.42 + i * u * 0.05, -u * 0.28, u * 0.36, u * 0.035);
    });
    Art.paperStroke(ctx, 2, function (c) { c.rect(-u * 0.14, 0, u * 0.24, u * 0.5); });
    ctx.restore();
    /* free arm: always gesturing at something */
    const g = Math.sin((a.gesture || 0)) * 0.7;
    Art.paperStroke(ctx, 1.8, function (c) {
      c.moveTo(-u * 0.14, -u * 0.7);
      c.lineTo(-u * 0.3, -u * (0.6 + g * 0.12));
      c.lineTo(-u * 0.24, -u * (0.52 + g * 0.1));
      c.lineTo(-u * 0.1, -u * 0.62);
      c.closePath();
    });
    ctx.restore();
  };

  /* ---------- bits of manga furniture ---------------------------------- */

  Art.muzzleFlash = function (ctx, r, seed) {
    const spikes = 7;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i += 1) {
      const ang = (i / (spikes * 2)) * DRY.TAU + seed * 0.6;
      const rad = (i % 2 ? 0.34 : 1) * r * (0.75 + ((i * 7 + seed * 13) % 9) / 26);
      const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.34, 0, DRY.TAU);
    ctx.fillStyle = PAPER; ctx.fill();
    ctx.restore();
  };

  /* radial speed lines -- used for chain hits and the boss entrance */
  Art.speedLines = function (ctx, cx, cy, inner, outer, count, t) {
    ctx.save();
    ctx.strokeStyle = INK; ctx.lineCap = "butt";
    for (let i = 0; i < count; i += 1) {
      const ang = (i / count) * DRY.TAU + Math.sin(t + i) * 0.06;
      const a1 = inner * (0.85 + ((i * 37) % 9) / 40);
      const len = outer * (0.55 + ((i * 53) % 11) / 22);
      ctx.lineWidth = 1 + (i % 3) * 1.3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * a1, cy + Math.sin(ang) * a1);
      ctx.lineTo(cx + Math.cos(ang) * (a1 + len), cy + Math.sin(ang) * (a1 + len));
      ctx.stroke();
    }
    ctx.restore();
  };



})();
