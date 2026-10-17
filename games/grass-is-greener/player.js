/* Player physics (a fawn) plus a small particle system. */
(function () {
  const GRAV = 2150, MAXSPD = 350, ACC = 2450, FRIC_G = 2100, FRIC_AIR = 620;
  const JUMP_V = -830, FLUTTER_V = -640;

  function hit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  class Deer {
    constructor(x, y) { this.spawn = { x: x, y: y }; this.reset(x, y); }
    reset(x, y) {
      this.x = x; this.y = y; this.w = 56; this.h = 74;
      this.vx = 0; this.vy = 0;
      this.onGround = false; this.coyote = 0; this.buffer = 0;
      this.flutters = 1; this.facing = 1; this.anim = 0;
      this.iframes = 0; this.hopSquash = 0; this.alive = true;
    }
    /* ctl: {left,right,jumpPressed,jumpHeld}   solids: array of rects */
    step(dt, ctl, solids) {
      const wasGround = this.onGround;
      this.landed = false;
      const target = (ctl.right ? MAXSPD : 0) - (ctl.left ? MAXSPD : 0);
      if (target !== 0) {
        const a = this.onGround ? ACC : ACC * 0.82;
        this.vx += Math.sign(target - this.vx) * Math.min(a * dt, Math.abs(target - this.vx));
        this.facing = Math.sign(this.vx) || this.facing;
      } else {
        const fr = (this.onGround ? FRIC_G : FRIC_AIR) * dt;
        if (Math.abs(this.vx) <= fr) this.vx = 0; else this.vx -= Math.sign(this.vx) * fr;
      }

      // coyote time + jump buffering, plus one mid-air "leap of joy"
      this.coyote = this.onGround ? 0.1 : Math.max(0, this.coyote - dt);
      if (ctl.jumpPressed) this.buffer = 0.13; else this.buffer = Math.max(0, this.buffer - dt);
      let jumped = null;
      if (this.buffer > 0) {
        if (this.coyote > 0) {
          this.vy = JUMP_V; this.buffer = 0; this.coyote = 0; this.onGround = false; jumped = 'jump';
        } else if (this.flutters > 0) {
          this.vy = FLUTTER_V; this.flutters--; this.buffer = 0; jumped = 'flutter';
        }
      }
      const g = (ctl.jumpHeld && this.vy < 0) ? GRAV * 0.62 : GRAV;
      this.vy = Math.min(this.vy + g * dt, 1500);

      this.x += this.vx * dt;
      for (const s of solids) if (hit(this, s)) {
        if (this.vx > 0) this.x = s.x - this.w; else if (this.vx < 0) this.x = s.x + s.w;
        this.vx = 0;
      }
      this.y += this.vy * dt;
      this.onGround = false;
      for (const s of solids) if (hit(this, s)) {
        if (this.vy > 0) { this.y = s.y - this.h; this.onGround = true; this.flutters = 1; }
        else if (this.vy < 0) this.y = s.y + s.h;
        this.vy = 0;
      }
      if (!wasGround && this.onGround) { this.hopSquash = 1; this.landed = true; }

      this.anim += dt * (2 + Math.abs(this.vx) / 34);
      this.hopSquash = Math.max(0, this.hopSquash - dt * 5);
      this.iframes = Math.max(0, this.iframes - dt);
      return jumped;
    }
    shrink(pad) {
      const p = pad || 0;
      return { x: this.x + p, y: this.y + p, w: this.w - p * 2, h: this.h - p * 2 };
    }
  }

  /* --- Particles: petal bursts, dust puffs, sparkle trails. --- */
  const parts = [];
  function spawn(o) {
    if (parts.length < 460) parts.push(Object.assign({ t: 0, life: 0.8, size: 5, grav: 900 }, o));
  }
  function burst(x, y, n, cols, spd) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, s = (spd || 190) * (0.4 + Math.random());
      spawn({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 70, life: 0.55 + Math.random() * 0.6,
        size: 3 + Math.random() * 5, col: cols[i % cols.length], grav: 620 });
    }
  }
  function puff(x, y) {
    spawn({ x: x, y: y, vx: (Math.random() - 0.5) * 70, vy: -30 - Math.random() * 40, life: 0.42,
      size: 8 + Math.random() * 6, col: 'rgba(240,255,225,0.9)', grav: -40 });
  }
  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt; if (p.t > p.life) { parts.splice(i, 1); continue; }
      p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }
  function drawParts(ctx) {
    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      ctx.fillStyle = p.col || '#fff';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + (1 - p.t / p.life) * 0.6), 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  window.Ent = { Deer: Deer, hit: hit, parts: parts, spawn: spawn, burst: burst, puff: puff, updateParts: updateParts, drawParts: drawParts };
})();