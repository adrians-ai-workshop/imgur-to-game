"use strict";

// ---- procedural textures and meshes (three.js r149, no external assets) ----
const _trand = mulberry32(90210);

function canvasTex(w, h, draw, opts) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  if (opts && opts.clamp) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function speckle(g, w, h, n, a) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = "rgba(" + (_trand() > 0.5 ? "255,255,255" : "0,0,0") + "," + (_trand() * a).toFixed(3) + ")";
    g.fillRect(_trand() * w, _trand() * h, 1 + _trand() * 2, 1 + _trand() * 2);
  }
}

const TEX = {};
function makeTextures() {
  TEX.hull = canvasTex(256, 368, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#5d6e83"); gr.addColorStop(1, "#3a4858");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#1c2631"; g.lineWidth = 4;
    g.strokeRect(6, 6, w - 12, h - 12); g.beginPath(); g.moveTo(6, h * 0.46); g.lineTo(w - 6, h * 0.46); g.moveTo(w / 2, 6); g.lineTo(w / 2, h * 0.46); g.stroke();
    g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(10, 10, w - 20, 5); g.fillRect(10, h * 0.46 + 6, w - 20, 5);
    g.fillStyle = "#151d26"; g.fillRect(24, h * 0.66, w - 48, 22);
    g.fillStyle = "#c9ecff"; g.fillRect(28, h * 0.66 + 5, w - 56, 12);
    g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(28, h * 0.66 + 5, w - 56, 3);
    for (let i = 0; i < 7; i++) { g.fillStyle = "#161e27"; g.fillRect(40, h * 0.80 + i * 9, w - 80, 4); }
    g.fillStyle = "#8b9aad";
    for (const [x, y] of [[16, 16], [w - 16, 16], [16, h * 0.46 - 10], [w - 16, h * 0.46 - 10], [16, h - 16], [w - 16, h - 16]]) { g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill(); }
    g.fillStyle = "#ffb14f"; g.font = "700 15px monospace"; g.fillText("D-" + ((_trand() * 90 + 10) | 0), 30, h * 0.2);
    speckle(g, w, h, 500, 0.08);
  });
  TEX.floor = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#334152"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#151c25"; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    g.strokeStyle = "rgba(255,255,255,0.07)"; g.lineWidth = 2; g.strokeRect(9, 9, w - 18, h - 18);
    g.fillStyle = "#1a222c"; for (const [x, y] of [[20, 20], [w - 20, 20], [20, h - 20], [w - 20, h - 20]]) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); }
    g.strokeStyle = "rgba(255,210,90,0.16)"; g.lineWidth = 6;
    for (let i = -h; i < w; i += 22) { g.beginPath(); g.moveTo(i, h); g.lineTo(i + 40, h - 40); g.stroke(); }
    g.fillStyle = "#334152"; g.fillRect(44, 44, w - 88, h - 88);
    g.strokeStyle = "rgba(0,0,0,0.25)"; g.strokeRect(44, 44, w - 88, h - 88);
    speckle(g, w, h, 700, 0.09);
  });
  TEX.ceil = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = "#28313d"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#10161d"; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    g.strokeStyle = "rgba(255,255,255,0.05)"; g.strokeRect(14, 14, w - 28, h - 28);
    speckle(g, w, h, 200, 0.07);
  });
  TEX.crate = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = "#6b6135"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#3a331a"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    g.lineWidth = 5; g.beginPath(); g.moveTo(8, 8); g.lineTo(w - 8, h - 8); g.moveTo(w - 8, 8); g.lineTo(8, h - 8); g.stroke();
    g.fillStyle = "#d9c26a"; g.fillRect(w / 2 - 16, h / 2 - 8, 32, 16);
    g.fillStyle = "#3a331a"; g.font = "700 11px monospace"; g.fillText("SUP", w / 2 - 12, h / 2 + 4);
    speckle(g, w, h, 300, 0.12);
  });
  TEX.hazard = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = "#59697b"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#e8b53a";
    for (let i = -h; i < w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 16 + h, h); g.lineTo(i + h, h); g.fill(); }
    g.fillStyle = "rgba(20,28,38,0.85)"; g.fillRect(0, 20, w, h - 40);
    g.fillStyle = "rgba(255,255,255,0.1)"; g.fillRect(0, 20, w, 3);
  });
  TEX.nanite = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#2cff6a"; g.lineWidth = 2; g.lineCap = "round";
    for (let i = 0; i < 16; i++) {
      let x = _trand() * w, y = _trand() * h;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { if (_trand() > 0.5) x += (_trand() - 0.5) * 60; else y += (_trand() - 0.5) * 60; g.lineTo(x, y); }
      g.stroke();
      g.fillStyle = "#9dffb8"; g.fillRect(x - 2, y - 2, 4, 4);
    }
    const rg = g.createRadialGradient(w / 2, h / 2, w * 0.15, w / 2, h / 2, w / 2);
    rg.addColorStop(0, "rgba(0,0,0,0)"); rg.addColorStop(1, "rgba(0,0,0,1)");
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
  }, { clamp: true });
  TEX.stars = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = "#020410"; g.fillRect(0, 0, w, h);
    for (const [x, y, r, c] of [[130, 100, 130, "rgba(90,60,200,0.45)"], [380, 150, 150, "rgba(30,140,200,0.35)"], [260, 60, 90, "rgba(200,60,120,0.25)"]]) {
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
    for (let i = 0; i < 500; i++) { g.fillStyle = "rgba(255,255,255," + (0.3 + _trand() * 0.7).toFixed(2) + ")"; const s = _trand() > 0.95 ? 2 : 1; g.fillRect(_trand() * w, _trand() * h, s, s); }
    g.strokeStyle = "rgba(120,200,255,0.5)"; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
  }, { clamp: true });
  TEX.swirl = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    g.translate(w / 2, h / 2); g.lineCap = "round";
    for (let arm = 0; arm < 5; arm++) {
      g.beginPath();
      for (let t = 0; t < 1; t += 0.02) { const a = t * 9 + arm * (TAU / 5), r = t * w * 0.48; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.strokeStyle = "rgba(255,255,255," + 0.55 + ")"; g.lineWidth = 9; g.stroke();
    }
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, w / 2);
    rg.addColorStop(0, "rgba(255,255,255,0.9)"); rg.addColorStop(0.35, "rgba(255,255,255,0.15)"); rg.addColorStop(1, "rgba(0,0,0,1)");
    g.fillStyle = rg; g.fillRect(-w / 2, -h / 2, w, h);
  }, { clamp: true });
  TEX.glow = canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { clamp: true });
}

// ---- geometry helpers ----
const _gc = {};
const gBox = (w, h, d) => _gc["b" + w + "," + h + "," + d] || (_gc["b" + w + "," + h + "," + d] = new THREE.BoxGeometry(w, h, d));
const gSph = (r, a, b) => _gc["s" + r + "," + a + "," + b] || (_gc["s" + r + "," + a + "," + b] = new THREE.SphereGeometry(r, a || 14, b || 10));
const gCyl = (rt, rb, h, s) => _gc["c" + rt + "," + rb + "," + h + "," + s] || (_gc["c" + rt + "," + rb + "," + h + "," + s] = new THREE.CylinderGeometry(rt, rb, h, s || 12));
const _mc = {};
const gCap = (r, l) => _gc["k" + r + "," + l] || (_gc["k" + r + "," + l] = new THREE.CapsuleGeometry(r, l, 4, 8));
function mStd(color, rough, metal, extra) {
  const k = color + "," + rough + "," + metal + JSON.stringify(extra || {});
  return _mc[k] || (_mc[k] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough == null ? 0.7 : rough, metalness: metal || 0 }, extra || {})));
}
const mBasic = (color, extra) => new THREE.MeshBasicMaterial(Object.assign({ color }, extra || {}));
const mesh = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); return m; };
function pivot(x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); return g; }
function glowSprite(color, size, opacity) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: opacity == null ? 1 : opacity }));
  s.scale.set(size, size, 1);
  return s;
}

// ---- level geometry ----
class GB {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; }
  quad(pts, n, col, uv) {
    const o = this.p.length / 3, u = uv || [0, 0, 1, 1];
    for (const q of pts) { this.p.push(q[0], q[1], q[2]); this.n.push(n[0], n[1], n[2]); this.c.push(col[0], col[1], col[2]); }
    this.u.push(u[0], u[1], u[2], u[1], u[2], u[3], u[0], u[3]);
    this.i.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.u, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i);
    return g;
  }
}

function buildLevelMeshes(L) {
  const root = new THREE.Group(), W = L.W, H = WALL_H;
  const hull = new GB(), flo = new GB(), cei = new GB(), trim = new GB();
  const tintOf = (id) => (id >= 0 ? ROOM_DEF[L.rooms[id].type].tint : [0.82, 0.9, 1.0]);
  const accOf = (id) => (id >= 0 ? ROOM_DEF[L.rooms[id].type].acc : 0x3fa8d8);
  const rgb = (hex, m) => [(((hex >> 16) & 255) / 255) * m, (((hex >> 8) & 255) / 255) * m, ((hex & 255) / 255) * m];
  const panels = [], consoles = [], tables = [], crates = [], beds = [], pillars = [];

  for (let tz = 0; tz < L.H; tz++) {
    for (let tx = 0; tx < W; tx++) {
      const i = tz * W + tx, t = L.tiles[i], x0 = tx * TILE, x1 = x0 + TILE, z0 = tz * TILE, z1 = z0 + TILE;
      if (t === TT.WALL) {
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (tileAt(L, tx + dx, tz + dz) === 0) continue;
          const rid = L.roomAt[(tz + dz) * W + tx + dx], shade = 0.86 + (L.rnd[i] / 255) * 0.16, tint = tintOf(rid);
          const face = (ya, yb, off) => {
            if (dx === 1) { const X = x1 + off; return [[X, ya, z1], [X, ya, z0], [X, yb, z0], [X, yb, z1]]; }
            if (dx === -1) { const X = x0 - off; return [[X, ya, z0], [X, ya, z1], [X, yb, z1], [X, yb, z0]]; }
            if (dz === 1) { const Z = z1 + off; return [[x0, ya, Z], [x1, ya, Z], [x1, yb, Z], [x0, yb, Z]]; }
            const Z = z0 - off; return [[x1, ya, Z], [x0, ya, Z], [x0, yb, Z], [x1, yb, Z]];
          };
          hull.quad(face(0, H, 0), [dx, 0, dz], [tint[0] * shade, tint[1] * shade, tint[2] * shade]);
          const ac = rgb(accOf(rid), 0.85);
          trim.quad(face(3.12, 3.2, 0.012), [dx, 0, dz], ac);
          trim.quad(face(0.04, 0.1, 0.012), [dx, 0, dz], ac);
        }
        continue;
      }
      const rid = L.roomAt[i], tint = tintOf(rid), sh = 0.85 + (L.rnd[i] / 255) * 0.2;
      flo.quad([[x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0]], [0, 1, 0], [tint[0] * sh, tint[1] * sh, tint[2] * sh]);
      cei.quad([[x0, H, z0], [x1, H, z0], [x1, H, z1], [x0, H, z1]], [0, -1, 0], [0.8, 0.85, 0.9]);
      const cxm = x0 + TILE / 2, czm = z0 + TILE / 2;
      if (rid >= 0) {
        const rm = L.rooms[rid];
        if ((tx - rm.x0) % 4 === 2 && (tz - rm.y0) % 4 === 2) panels.push({ x: cxm, z: czm, c: tint });
      } else if (tx % 2 === 0 && tz % 2 === 0 && ((tx >> 1) + (tz >> 1)) % 3 === 0) panels.push({ x: cxm, z: czm, c: [0.75, 0.9, 1.1] });
      if (t === TT.CONSOLE) consoles.push({ x: cxm, z: czm, dir: L.dir[i], acc: accOf(rid), r: L.rnd[i] });
      else if (t === TT.TABLE) tables.push({ x: cxm, z: czm });
      else if (t === TT.CRATE) crates.push({ x: cxm, z: czm, r: L.rnd[i] });
      else if (t === TT.BED) beds.push({ x: cxm, z: czm, r: L.rnd[i] });
      else if (t === TT.PILLAR) pillars.push({ x: cxm, z: czm, acc: accOf(rid) });
    }
  }

  const wallMat = new THREE.MeshStandardMaterial({ map: TEX.hull, vertexColors: true, roughness: 0.6, metalness: 0.35 });
  const floorMat = new THREE.MeshStandardMaterial({ map: TEX.floor, vertexColors: true, roughness: 0.75, metalness: 0.2 });
  const ceilMat = new THREE.MeshStandardMaterial({ map: TEX.ceil, vertexColors: true, roughness: 0.8, metalness: 0.2 });
  root.add(new THREE.Mesh(hull.build(), wallMat), new THREE.Mesh(flo.build(), floorMat), new THREE.Mesh(cei.build(), ceilMat), new THREE.Mesh(trim.build(), new THREE.MeshBasicMaterial({ vertexColors: true })));

  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1), E = new THREE.Euler();
  const inst = (geo, mat, list, place, colorFn) => {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((o, k) => { place(o, k); im.setMatrixAt(k, M4); if (colorFn) im.setColorAt(k, colorFn(o)); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    root.add(im);
    return im;
  };
  const put = (x, y, z, ry, rx) => { E.set(rx || 0, ry || 0, 0); Q.setFromEuler(E); P.set(x, y, z); M4.compose(P, Q, S1); };
  const C = new THREE.Color();

  // light panels
  inst(gBox(1.6, 0.06, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff }), panels, (o) => put(o.x, H - 0.03, o.z, 0), (o) => C.setRGB(0.9 * o.c[0], 0.95 * o.c[1], 1.0 * o.c[2]));

  // consoles
  const cbody = gBox(2.2, 1.1, 0.9).clone(); cbody.translate(0, 0.55, 0);
  inst(cbody, mStd(0x1a222c, 0.5, 0.6), consoles, (o) => { const f = o.dir === 0 ? 1 : -1; put(o.x, 0, o.z - f * 0.8, o.dir === 0 ? 0 : Math.PI); });
  const scr = new THREE.PlaneGeometry(1.9, 0.5);
  inst(scr, new THREE.MeshBasicMaterial({ color: 0xffffff }), consoles, (o) => {
    const f = o.dir === 0 ? 1 : -1, ry = o.dir === 0 ? 0 : Math.PI;
    E.set(-0.6, ry, 0, "YXZ"); Q.setFromEuler(E); P.set(o.x, 1.18, o.z - f * 0.8 + f * 0.36); M4.compose(P, Q, S1);
  }, (o) => C.setHex(o.acc).multiplyScalar(0.7 + (o.r % 5) * 0.08));

  const tslab = gBox(2.3, 0.1, 2.3).clone(); tslab.translate(0, 0.95, 0);
  inst(tslab, mStd(0x8b9bad, 0.4, 0.5), tables, (o) => put(o.x, 0, o.z, 0));
  const tped = gBox(0.7, 0.9, 0.7).clone(); tped.translate(0, 0.45, 0);
  inst(tped, mStd(0x2c3642, 0.6, 0.5), tables, (o) => put(o.x, 0, o.z, 0));
  const bbox = gBox(2.3, 0.5, 2.3).clone(); bbox.translate(0, 0.25, 0);
  inst(bbox, mStd(0x3c4f78, 0.9, 0), beds, (o) => put(o.x, 0, o.z, 0));
  const pil = gBox(0.9, 0.16, 0.9).clone(); pil.translate(-0.7, 0.55, 0);
  inst(pil, mStd(0xe4e9f2, 0.9, 0), beds, (o) => put(o.x, 0, o.z, 0));
  const cbx = gBox(2.0, 1.5, 2.0).clone(); cbx.translate(0, 0.75, 0);
  inst(cbx, new THREE.MeshStandardMaterial({ map: TEX.crate, roughness: 0.9 }), crates, (o) => put(o.x, 0, o.z, ((o.r % 21) - 10) * 0.012));
  inst(gCyl(0.55, 0.6, H, 16).clone().translate(0, H / 2, 0), mStd(0x54687d, 0.4, 0.7), pillars, (o) => put(o.x, 0, o.z, 0));
  inst(new THREE.TorusGeometry(0.6, 0.05, 6, 20).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff }), pillars, (o) => put(o.x, 2.6, o.z, 0), (o) => C.setHex(o.acc));
  inst(new THREE.TorusGeometry(0.6, 0.05, 6, 20).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff }), pillars, (o) => put(o.x, 0.3, o.z, 0), (o) => C.setHex(o.acc));

  // doors
  L.doorMeshes = {};
  const dmat = new THREE.MeshStandardMaterial({ map: TEX.hazard, roughness: 0.65, metalness: 0.35 });
  const dgeoA = new THREE.BoxGeometry(0.22, H, TILE * 0.995), dgeoB = new THREE.BoxGeometry(TILE * 0.995, H, 0.22);
  for (const di of L.doors) {
    const p = spotPos(L, di), m = new THREE.Mesh(L.doorAxis[di] === 0 ? dgeoA : dgeoB, dmat);
    m.position.set(p.x, H / 2, p.z); root.add(m); L.doorMeshes[di] = m;
  }

  // special rooms
  const props = { swirl: null, ring: null, conduitLight: null, beam: null, pad: null, screens: [] };
  const ex = L.rooms[L.exitRoom], ec = roomCentre(ex);
  const gate = new THREE.Group(); gate.position.set(ec.x, 0, ec.z);
  gate.add(mesh(gCyl(1.9, 2.1, 0.16, 32), mStd(0x1b232d, 0.4, 0.8), 0, 0.08, 0));
  const ring = mesh(new THREE.TorusGeometry(1.75, 0.13, 10, 40), new THREE.MeshBasicMaterial({ color: 0xff4a3a }), 0, 1.95, 0);
  const swirl = mesh(new THREE.CircleGeometry(1.7, 40), new THREE.MeshBasicMaterial({ map: TEX.swirl, color: 0xff4a3a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide }), 0, 1.95, 0);
  const beam = mesh(new THREE.CylinderGeometry(1.5, 1.5, H, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 0, H / 2, 0);
  gate.add(ring, swirl, beam);
  for (const s of [-1, 1]) gate.add(mesh(gBox(0.3, 2.4, 0.3), mStd(0x2a3440, 0.4, 0.8), s * 1.95, 1.2, 0));
  root.add(gate);
  Object.assign(props, { swirl, ring, beam, gate });

  const sr = L.rooms[L.startRoom], sc = roomCentre(sr);
  const pad = new THREE.Group(); pad.position.set(sc.x, 0, sc.z);
  pad.add(mesh(gCyl(2.6, 2.7, 0.12, 40), mStd(0x14201c, 0.6, 0.4), 0, 0.06, 0));
  pad.add(mesh(new THREE.TorusGeometry(2.3, 0.04, 6, 48).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2f9a58 }), 0, 0.14, 0));
  pad.add(mesh(new THREE.TorusGeometry(1.3, 0.03, 6, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2f9a58 }), 0, 0.14, 0));
  root.add(pad); props.pad = pad;

  if (L.bridgeRoom >= 0) {
    const br = L.rooms[L.bridgeRoom], bc = roomCentre(br);
    const vs = mesh(new THREE.PlaneGeometry(16, 3.0), new THREE.MeshBasicMaterial({ map: TEX.stars }), bc.x, 2.1, br.y0 * TILE + 0.04);
    root.add(vs);
    const chair = new THREE.Group(); chair.position.set(bc.x, 0, bc.z - 3.2);
    chair.add(mesh(gCyl(0.35, 0.45, 0.5, 12), mStd(0x2a3345, 0.5, 0.3), 0, 0.25, 0), mesh(gBox(0.7, 0.2, 0.7), mStd(0x3a4a70, 0.8, 0), 0, 0.6, 0), mesh(gBox(0.7, 0.9, 0.15), mStd(0x3a4a70, 0.8, 0), 0, 1.1, -0.3));
    root.add(chair);
  }

  // scattered light spots for the dynamic light pool
  L.lightSpots = [];
  for (const rm of L.rooms) { const c = roomCentre(rm); L.lightSpots.push({ x: c.x, z: c.z, color: ROOM_DEF[rm.type].acc, k: 1 }); }
  for (const rm of L.rooms) for (const n of rm.links) if (n > rm.id) {
    const a = roomCentre(rm), b = roomCentre(L.rooms[n]);
    L.lightSpots.push({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, color: 0x9fd8ff, k: 0.8 });
  }
  L.props = props;
  return root;
}

// ---- characters ----
function buildCrew(def, skin, hair) {
  const g = new THREE.Group(), u = mStd(def.col, 0.75, 0), tr = mStd(def.trim, 0.6, 0.1), dk = mStd(0x1f2633, 0.8, 0), sk = mStd(skin, 0.8, 0);
  const legL = pivot(-0.11, 0.86, 0), legR = pivot(0.11, 0.86, 0), armL = pivot(-0.29, 1.44, 0), armR = pivot(0.29, 1.44, 0), head = pivot(0, 1.62, 0);
  legL.add(mesh(gCap(0.078, 0.7), dk, 0, -0.43, 0)); legR.add(mesh(gCap(0.078, 0.7), dk, 0, -0.43, 0));
  armL.add(mesh(gCap(0.056, 0.46), u, 0, -0.3, 0), mesh(gSph(0.058, 8, 6), sk, 0, -0.62, 0), mesh(gSph(0.08, 8, 6), u, 0, 0, 0));
  armR.add(mesh(gCap(0.056, 0.46), u, 0, -0.3, 0), mesh(gSph(0.058, 8, 6), sk, 0, -0.62, 0), mesh(gSph(0.08, 8, 6), u, 0, 0, 0));
  const gun = new THREE.Group(); gun.position.set(0, -0.62, 0.12); gun.visible = false;
  gun.add(mesh(gBox(0.06, 0.08, 0.32), mStd(0x1c2026, 0.4, 0.8), 0, 0, 0.1), mesh(gBox(0.04, 0.04, 0.05), mBasic(0xffffff), 0, 0, 0.28));
  armR.add(gun);
  head.add(mesh(gSph(0.125, 14, 10), sk, 0, 0, 0), mesh(gSph(0.132, 14, 8), mStd(hair, 0.9, 0), 0, 0.035, -0.02).setScale(1, 0.72, 1), mesh(gBox(0.03, 0.04, 0.03), sk, 0, -0.01, 0.125));
  for (const s of [-1, 1]) head.add(mesh(gBox(0.022, 0.018, 0.01), mBasic(0x141414), s * 0.045, 0.02, 0.118));
  g.add(legL, legR, mesh(gCyl(0.2, 0.17, 0.62, 12), u, 0, 1.17, 0).setScale(1.15, 1, 0.72), mesh(gCyl(0.205, 0.205, 0.06, 12), tr, 0, 0.9, 0).setScale(1.15, 1, 0.74), mesh(gCyl(0.06, 0.07, 0.1, 8), sk, 0, 1.5, 0), armL, armR, head);
  if (def.medic) g.add(mesh(gBox(0.16, 0.05, 0.02), mBasic(0xffffff), 0, 1.25, 0.14), mesh(gBox(0.05, 0.16, 0.02), mBasic(0xffffff), 0, 1.25, 0.14));
  const shell = mesh(gCyl(0.36, 0.36, 1.9, 12), new THREE.MeshBasicMaterial({ color: 0x3dff88, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.95, 0);
  g.add(shell);
  g.scale.setScalar(def.big || 1);
  return { g, legL, legR, armL, armR, head, gun, shell };
}

function buildBorg(tint, big) {
  const g = new THREE.Group(), metal = mStd(0x1a1d22, 0.45, 0.85), plate = mStd(0x2a3038, 0.4, 0.9), pale = mStd(0xc3cbc2, 0.55, 0.3);
  const legL = pivot(-0.12, 0.86, 0), legR = pivot(0.12, 0.86, 0), armL = pivot(-0.34, 1.46, 0), armR = pivot(0.34, 1.46, 0), head = pivot(0, 1.63, 0);
  legL.add(mesh(gBox(0.18, 0.86, 0.2), metal, 0, -0.43, 0)); legR.add(mesh(gBox(0.18, 0.86, 0.2), metal, 0, -0.43, 0));
  armL.add(mesh(gBox(0.14, 0.62, 0.15), plate, 0, -0.31, 0), mesh(gBox(0.06, 0.2, 0.05), mStd(0x9aa4ac, 0.3, 0.9), 0.04, -0.72, 0.03), mesh(gBox(0.06, 0.2, 0.05), mStd(0x9aa4ac, 0.3, 0.9), -0.04, -0.72, 0.03));
  armR.add(mesh(gBox(0.14, 0.62, 0.15), plate, 0, -0.31, 0));
  for (let k = -1; k <= 1; k++) armR.add(mesh(gCyl(0.012, 0.012, 0.28, 5), mBasic(0x6dff9a), k * 0.035, -0.74, 0.02));
  head.add(mesh(gSph(0.13, 14, 10), pale, 0, 0, 0));
  head.add(mesh(new THREE.TorusGeometry(0.13, 0.012, 5, 16), mStd(0x15181c, 0.5, 0.8), 0, 0.02, 0).setRot(Math.PI / 2, 0, 0));
  head.add(mesh(new THREE.TorusGeometry(0.13, 0.012, 5, 16), mStd(0x15181c, 0.5, 0.8), 0, -0.04, 0).setRot(0, Math.PI / 2, 0));
  const eye = mesh(gSph(0.03, 8, 6), mBasic(0xff5a1f), 0.055, 0.02, 0.118); head.add(eye);
  const eg = glowSprite(0x6dff9a, 0.16, 0.7); eg.position.set(0.055, 0.02, 0.13); head.add(eg);
  g.add(legL, legR, mesh(gBox(0.5, 0.66, 0.3), metal, 0, 1.17, 0), mesh(gBox(0.4, 0.2, 0.32), mStd(tint || 0x2a3038, 0.7, 0.2), 0, 1.22, 0), mesh(gBox(0.2, 0.2, 0.32), plate, -0.36, 1.45, 0), mesh(gBox(0.2, 0.2, 0.32), plate, 0.36, 1.45, 0), armL, armR, head);
  g.add(mesh(gBox(0.5, 0.04, 0.31), mBasic(0x2cff6a), 0, 0.9, 0.001));
  for (let k = 0; k < 4; k++) g.add(mesh(gCyl(0.014, 0.014, 0.6, 5), mStd(0x08090a, 0.5, 0.2), -0.15 + k * 0.1, 1.05, -0.2).setRot(0.25, 0, 0));
  g.scale.setScalar(big || 1);
  return { g, legL, legR, armL, armR, head, eyeGlow: eg };
}
THREE.Mesh.prototype.setScale = function (x, y, z) { this.scale.set(x, y, z); return this; };
THREE.Mesh.prototype.setRot = function (x, y, z) { this.rotation.set(x, y, z); return this; };

// ---- first-person arms (drawn in a separate pass so walls never clip them) ----
function buildFPRig() {
  const rig = new THREE.Group(), metal = mStd(0x1a1d22, 0.4, 0.9), plate = mStd(0x2b323b, 0.4, 0.9), pale = mStd(0xb9c2b9, 0.5, 0.3);
  const right = new THREE.Group(); right.position.set(0.3, -0.27, -0.55);
  right.add(mesh(gBox(0.075, 0.075, 0.42), plate, 0, 0, 0.16).setRot(0.12, -0.08, 0));
  right.add(mesh(gBox(0.09, 0.09, 0.14), metal, 0, -0.01, -0.06));
  right.add(mesh(gBox(0.03, 0.012, 0.2), mBasic(0x2cff6a), 0, 0.048, 0.12));
  for (let k = -1; k <= 1; k++) right.add(mesh(gCyl(0.011, 0.011, 0.14, 6), metal, k * 0.028, -0.01, -0.16).setRot(Math.PI / 2, 0, 0));
  const tubes = [];
  for (let k = 0; k < 3; k++) {
    const t = mesh(gCyl(0.009, 0.009, 1, 6), mBasic(0x6dff9a), 0, 0, 0); t.rotation.x = Math.PI / 2;
    const tg = new THREE.Group(); tg.add(t); tg.position.set((k - 1) * 0.028, -0.01, -0.23); right.add(tg); tubes.push({ g: tg, m: t });
  }
  const tip = new THREE.Object3D(); tip.position.set(0, -0.01, -0.3); right.add(tip);
  const left = new THREE.Group(); left.position.set(-0.32, -0.27, -0.55);
  left.add(mesh(gBox(0.085, 0.085, 0.46), plate, 0, 0, 0.16).setRot(0.12, 0.08, 0));
  left.add(mesh(gBox(0.075, 0.075, 0.26), metal, 0, -0.005, -0.12));
  for (const s of [-1, 1]) left.add(mesh(gBox(0.014, 0.014, 0.22), mBasic(0x2cff6a), s * 0.042, -0.005, -0.12));
  const muzzle = mesh(gBox(0.035, 0.035, 0.03), mBasic(0x6dff9a), 0, -0.005, -0.26); left.add(muzzle);
  const cg = glowSprite(0x6dff9a, 0.16, 0.0); cg.position.set(0, -0.005, -0.3); left.add(cg);
  rig.add(right, left);
  return { rig, right, left, tubes, tip, muzzle, muzzleGlow: cg };
}

// ---- pickups ----
function buildItem(kind, col) {
  const g = new THREE.Group();
  const em = (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.4 });
  if (kind === "coil") for (let k = -1; k <= 1; k++) g.add(mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 20).rotateX(Math.PI / 2), em(col), 0, k * 0.16, 0));
  else if (kind === "crystal") g.add(mesh(new THREE.OctahedronGeometry(0.3), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.7, transparent: true, opacity: 0.85, roughness: 0.1 })).setScale(0.7, 1.3, 0.7));
  else if (kind === "core") { g.add(mesh(gBox(0.42, 0.42, 0.14), mStd(0x0e2418, 0.4, 0.6))); g.add(mesh(gBox(0.22, 0.22, 0.16), em(col))); for (let k = -2; k <= 2; k++) g.add(mesh(gBox(0.03, 0.06, 0.03), mStd(0xd0d8e0, 0.3, 0.9), k * 0.08, -0.24, 0)); }
  else if (kind === "injector") { g.add(mesh(gCyl(0.1, 0.1, 0.6, 12), em(col))); g.add(mesh(gCyl(0.15, 0.15, 0.06, 12), mStd(0xdfe6ee, 0.3, 0.9), 0, 0.3, 0)); g.add(mesh(gCyl(0.15, 0.15, 0.06, 12), mStd(0xdfe6ee, 0.3, 0.9), 0, -0.3, 0)); }
  else if (kind === "array") { g.add(mesh(new THREE.SphereGeometry(0.3, 16, 8, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6, side: THREE.DoubleSide, roughness: 0.3 })).setRot(Math.PI, 0, 0)); g.add(mesh(gCyl(0.015, 0.015, 0.3, 5), mStd(0xdfe6ee, 0.3, 0.9), 0, 0.1, 0)); }
  else if (kind === "cell") { g.add(mesh(gCyl(0.13, 0.13, 0.42, 12), em(0x3dff7a))); g.add(mesh(gBox(0.05, 0.22, 0.28), mBasic(0xffffff), 0, 0, 0)); g.add(mesh(gBox(0.22, 0.05, 0.28), mBasic(0xffffff), 0, 0, 0)); }
  else { g.add(mesh(gCyl(0.15, 0.15, 0.4, 6), em(0x39c8ff))); g.add(mesh(gCyl(0.16, 0.16, 0.05, 6), mStd(0xdfe6ee, 0.3, 0.9), 0, 0.22, 0)); }
  const s = glowSprite(col, kind === "cell" || kind === "ecell" ? 1.3 : 2.2, 0.6); g.add(s);
  return g;
}
