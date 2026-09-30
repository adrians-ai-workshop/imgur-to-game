"use strict";

// ---- NES look: 2C02 palette, bitmap font, pixel-art sprites and tiles ----
const NES = [
  "#7C7C7C", "#0000FC", "#0000BC", "#4428BC", "#940084", "#A80020", "#A81000", "#881400", "#503000", "#007800", "#006800", "#005800", "#004058", "#000000", "#000000", "#000000",
  "#BCBCBC", "#0078F8", "#0058F8", "#6844FC", "#D800CC", "#E40058", "#F83800", "#E45C10", "#AC7C00", "#00B800", "#00A800", "#00A844", "#008888", "#000000", "#000000", "#000000",
  "#F8F8F8", "#3CBCFC", "#6888FC", "#9878F8", "#F878F8", "#F85898", "#F87858", "#FCA044", "#F8B800", "#B8F818", "#58D854", "#58F898", "#00E8D8", "#787878", "#000000", "#000000",
  "#FCFCFC", "#A4E4FC", "#B8B8F8", "#D8B8F8", "#F8B8F8", "#F8A4C0", "#F0D0B0", "#FCE0A8", "#F8D878", "#D8F878", "#B8F8B8", "#B8F8D8", "#00FCFC", "#F8D8F8", "#000000", "#000000",
];
const BLACK = 0x0F, WHITE = 0x30, GRAY = 0x2D, LGRAY = 0x10, RED = 0x16, GOLD = 0x28, GREEN = 0x2A, DGREEN = 0x0A, CYAN = 0x2C, BLUE = 0x12;

function mkCanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function fillPx(g, x, y, w, h, col) { g.fillStyle = NES[col]; g.fillRect(x, y, w, h); }

function art(rows, pal) {
  const c = mkCanvas(rows[0].length, rows.length), g = c.getContext("2d");
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const col = pal[rows[y][x]];
      if (col != null) { g.fillStyle = NES[col]; g.fillRect(x, y, 1, 1); }
    }
  }
  return c;
}
function flipped(src) {
  const c = mkCanvas(src.width, src.height), g = c.getContext("2d");
  g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
  return c;
}
function tinted(src, col) {
  const c = mkCanvas(src.width, src.height), g = c.getContext("2d");
  g.drawImage(src, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = NES[col]; g.fillRect(0, 0, c.width, c.height);
  return c;
}

// ---------- 5x7 font ----------
const GLYPH = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14],
  4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8],
  8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
  " ": [0, 0, 0, 0, 0, 0, 0], ".": [0, 0, 0, 0, 0, 12, 12], ",": [0, 0, 0, 0, 12, 4, 8], "!": [4, 4, 4, 4, 4, 0, 4], "?": [14, 17, 1, 2, 4, 0, 4],
  ":": [0, 12, 12, 0, 12, 12, 0], "-": [0, 0, 0, 31, 0, 0, 0], "/": [1, 2, 2, 4, 8, 8, 16], "+": [0, 4, 4, 31, 4, 4, 0], "%": [24, 25, 2, 4, 8, 19, 3],
  ">": [8, 4, 2, 1, 2, 4, 8], "<": [2, 4, 8, 16, 8, 4, 2], "'": [4, 4, 8, 0, 0, 0, 0], "=": [0, 0, 31, 0, 31, 0, 0], "*": [0, 4, 21, 14, 21, 4, 0],
  "(": [2, 4, 8, 8, 8, 4, 2], ")": [8, 4, 2, 2, 2, 4, 8], "#": [10, 10, 31, 10, 31, 10, 10],
};
const GLYPH_KEYS = Object.keys(GLYPH);
const fontCache = {};
function fontAtlas(col) {
  if (fontCache[col]) return fontCache[col];
  const c = mkCanvas(GLYPH_KEYS.length * 6, 7), g = c.getContext("2d");
  g.fillStyle = NES[col];
  GLYPH_KEYS.forEach((k, i) => {
    GLYPH[k].forEach((row, y) => { for (let x = 0; x < 5; x++) if (row & (16 >> x)) g.fillRect(i * 6 + x, y, 1, 1); });
  });
  return (fontCache[col] = c);
}
const glyphIdx = {}; GLYPH_KEYS.forEach((k, i) => { glyphIdx[k] = i; });
function textW(s, sc) { return s.length * 6 * (sc || 1) - (sc || 1); }
function drawText(g, s, x, y, col, o) {
  o = o || {};
  const sc = o.scale || 1;
  if (o.align === "center") x -= Math.floor(textW(s, sc) / 2);
  else if (o.align === "right") x -= textW(s, sc);
  const passes = o.shadow ? [[sc, sc, o.shadowCol == null ? BLACK : o.shadowCol], [0, 0, col]] : [[0, 0, col]];
  for (const [ox, oy, cc] of passes) {
    const at = fontAtlas(cc);
    for (let i = 0; i < s.length; i++) {
      const idx = glyphIdx[s[i].toUpperCase()];
      if (idx == null || s[i] === " ") continue;
      g.drawImage(at, idx * 6, 0, 5, 7, x + i * 6 * sc + ox, y + oy, 5 * sc, 7 * sc);
    }
  }
}

// ---------- 16x16 humanoids assembled from parts ----------
const HEAD_DOWN = [
  "................", ".....KKKKKK.....", "....KHHHHHHK....", "...KHHHHHHHHK...", "...KHHSSSSHHK...", "...KHSESSESHK...", "...KSSSSSSSSK...", "....KSSSSSSK....",
  "...KKKUUUUKKK...", "..KUUUUUUUUUUK..", ".KSKUUTTTTUUKSK.", ".KSKUUUUUUUUKSK.",
];
const HEAD_UP = [
  "................", ".....KKKKKK.....", "....KHHHHHHK....", "...KHHHHHHHHK...", "...KHHHHHHHHK...", "...KHHHHHHHHK...", "...KHHHHHHHHK...", "....KSHHHHSK....",
  "...KKKUUUUKKK...", "..KUUUUUUUUUUK..", ".KSKUUUUUUUUKSK.", ".KSKUUTTTTUUKSK.",
];
const HEAD_SIDE = [
  "................", ".....KKKKKK.....", "....KHHHHHHK....", "...KHHHHHHHHK...", "...KHHHHSSSSK...", "...KHHHHSSESK...", "...KHHHSSSSSK...", "....KHSSSSSK....",
  "....KKUUUUKK....", "...KUUUUUUUUK...", "...KUUUUUUUSK...", "...KUUTTUUUSK...",
];
const LEGS_FRONT = [
  ["...KKUUUUUUKK...", "...KUUKKKKUUK...", "...KBBK..KBBK...", "...KKKK..KKKK..."],
  ["...KKUUUUUUKK...", "....KUUKKUUK....", "....KBBKKBBK....", "....KKKKKKKK...."],
];
const LEGS_SIDE = [
  ["....KUUUUUUK....", "....KUUKKUUK....", "...KBBK..KBBK...", "...KKKK..KKKK..."],
  ["....KUUUUUUK....", "....KUUKKUUK....", "....KBBKKBBK....", "....KKKKKKKK...."],
];
const humanCache = {};
// returns { down:[a,b], up:[a,b], right:[a,b], left:[a,b] }
function humanSet(key, pal, extras) {
  if (humanCache[key]) return humanCache[key];
  const set = { down: [], up: [], right: [], left: [] };
  const P = Object.assign({ K: BLACK, W: WHITE }, pal);
  for (let f = 0; f < 2; f++) {
    const d = art(HEAD_DOWN.concat(LEGS_FRONT[f]), P), u = art(HEAD_UP.concat(LEGS_FRONT[f]), P), r = art(HEAD_SIDE.concat(LEGS_SIDE[f]), P);
    if (extras) { extras(d.getContext("2d"), "down", f); extras(u.getContext("2d"), "up", f); extras(r.getContext("2d"), "right", f); }
    set.down.push(d); set.up.push(u); set.right.push(r); set.left.push(flipped(r));
  }
  return (humanCache[key] = set);
}

const SKINS = [0x36, 0x27, 0x17, 0x08, 0x37, 0x3B];
const HAIRS = [0x0F, 0x08, 0x18, 0x06, 0x10, 0x28];
const CREW_LOOK = {
  ensign: { U: GOLD, T: 0x18, B: 0x0F },
  security: { U: 0x16, T: 0x06, B: 0x0F, H: 0x2D },
  medic: { U: 0x2C, T: 0x1C, B: 0x0F },
  scientist: { U: 0x11, T: 0x12, B: 0x0F },
  officer: { U: 0x30, T: 0x28, B: 0x0F },
};
function crewSprites(kind, skinIdx) {
  const look = CREW_LOOK[kind], hairIdx = skinIdx % HAIRS.length;
  const pal = { S: SKINS[skinIdx % SKINS.length], H: look.H != null ? look.H : HAIRS[hairIdx], U: look.U, T: look.T, B: look.B, E: BLACK };
  return humanSet("c" + kind + skinIdx, pal, (g, dir) => {
    if (kind === "medic" && dir !== "up") { fillPx(g, 7, 9, 2, 3, WHITE); fillPx(g, 6, 10, 4, 1, WHITE); }
    if (kind === "scientist") { fillPx(g, 7, 8, 2, 4, WHITE); }
    if (kind === "officer") fillPx(g, 5, 8, 6, 1, GOLD);
    if (kind === "security" && dir === "down") fillPx(g, 5, 5, 6, 1, 0x0D);
  });
}
function borgSprites(ally, accent) {
  const pal = ally
    ? { S: 0x3A, H: 0x0B, U: 0x0A, T: accent != null ? accent : 0x0B, B: BLACK, E: RED }
    : { S: 0x30, H: 0x0F, U: GRAY, T: 0x00, B: BLACK, E: RED };
  return humanSet("b" + (ally ? "a" + accent : "p"), pal, (g, dir) => {
    fillPx(g, 4, 8, 2, 1, ally ? 0x1B : GREEN); fillPx(g, 10, 8, 2, 1, ally ? 0x1B : GREEN);
    if (dir === "down") { fillPx(g, 6, 5, 1, 1, RED); fillPx(g, 9, 5, 1, 1, 0x0F); fillPx(g, 5, 4, 1, 2, 0x0F); }
    if (dir === "right") { fillPx(g, 11, 5, 1, 1, RED); }
    if (dir === "left") { fillPx(g, 4, 5, 1, 1, RED); }
  });
}

// ---------- items ----------
const ITEM_PLATE = [
  "..KKKKKKKK..", ".KBBBBBBBBK.", "KBAAAAAAAABK", "KBAAAAAAAABK", "KBAAAAAAAABK", "KBAAAAAAAABK", "KBAAAAAAAABK", "KBAAAAAAAABK", "KBAAAAAAAABK", "KBAAAAAAAABK", ".KCCCCCCCCK.", "..KKKKKKKK..",
];
const KEY_DEFS = [
  { id: "coil", name: "WARP COIL", short: "COIL", a: 0x27, b: 0x37, c: 0x17 },
  { id: "crystal", name: "DEFLECTOR CRYSTAL", short: "CRYSTAL", a: 0x21, b: 0x31, c: 0x11 },
  { id: "core", name: "ISOLINEAR CORE", short: "CORE", a: 0x2A, b: 0x3A, c: 0x1A },
  { id: "injector", name: "PLASMA INJECTOR", short: "INJECTOR", a: 0x25, b: 0x35, c: 0x15 },
  { id: "array", name: "SENSOR ARRAY", short: "ARRAY", a: 0x23, b: 0x33, c: 0x13 },
];
const itemCache = {};
function keyIcon(def) {
  if (itemCache[def.id]) return itemCache[def.id];
  const c = art(ITEM_PLATE, { K: BLACK, A: def.a, B: def.b, C: def.c }), g = c.getContext("2d");
  const W = WHITE, K = BLACK;
  switch (def.id) {
    case "coil": for (let i = 0; i < 3; i++) { fillPx(g, 3, 3 + i * 2, 6, 1, W); fillPx(g, 3 + (i & 1) * 5, 4 + i * 2, 1, 1, W); } break;
    case "crystal": fillPx(g, 5, 3, 2, 1, W); fillPx(g, 4, 4, 4, 1, W); fillPx(g, 3, 5, 6, 2, W); fillPx(g, 4, 7, 4, 1, W); fillPx(g, 5, 8, 2, 1, W); break;
    case "core": fillPx(g, 3, 3, 6, 6, K); fillPx(g, 4, 4, 4, 4, W); fillPx(g, 5, 5, 2, 2, K); for (let i = 0; i < 3; i++) { fillPx(g, 2, 4 + i * 2, 1, 1, W); fillPx(g, 9, 4 + i * 2, 1, 1, W); } break;
    case "injector": fillPx(g, 3, 5, 5, 2, W); fillPx(g, 8, 5, 1, 2, K); fillPx(g, 9, 6, 1, 1, W); fillPx(g, 2, 4, 1, 4, W); fillPx(g, 4, 5, 2, 2, K); break;
    default: fillPx(g, 3, 3, 6, 1, W); fillPx(g, 2, 4, 1, 2, W); fillPx(g, 9, 4, 1, 2, W); fillPx(g, 4, 6, 4, 1, W); fillPx(g, 6, 7, 1, 2, W); fillPx(g, 4, 9, 4, 1, W); break;
  }
  return (itemCache[def.id] = c);
}
function cellIcon(kind) {
  if (itemCache[kind]) return itemCache[kind];
  let c;
  if (kind === "heart") c = art(["..KK..KK..", ".KRRKKRRK.", "KRWRRRRRRK", "KRRRRRRRRK", ".KRRRRRRK.", "..KRRRRK..", "...KRRK...", "....KK...."], { K: BLACK, R: 0x16, W: 0x36 });
  else if (kind === "energy") c = art(["....KK....", "...KYYK...", "..KYYK....", ".KYYYYYK..", "...KYYK...", "..KYYK....", "..KYK.....", "...K......"], { K: BLACK, Y: 0x28 });
  else c = art(["..KKKKKK..", ".KGGGGGGK.", "KGKKKKKKGK", "KGKDDDDKGK", "KGKDGGDKGK", "KGKDDDDKGK", "KGKKKKKKGK", ".KGGGGGGK.", "..KKKKKK.."], { K: BLACK, G: 0x2A, D: 0x0A });
  return (itemCache[kind] = c);
}
const HEART_SMALL = art([".KK.KK.", "KRRKRRK", "KRRRRRK", ".KRRRK.", "..KRK..", "...K..."], { K: BLACK, R: 0x16 });
const HEART_EMPTY = art([".KK.KK.", "K..K..K", "K.....K", ".K...K.", "..K.K..", "...K..."], { K: 0x2D });

// ---------- tiles ----------
const THEMES = [
  { name: "CARGO DECKS", base: 0x0C, dot: 0x1C, corr: 0x0F, wallTop: 0x2D, wallHi: 0x10, wallFace: 0x00, wallDark: 0x0F, strip: 0x2C },
  { name: "HABITAT RING", base: 0x02, dot: 0x03, corr: 0x0F, wallTop: 0x13, wallHi: 0x23, wallFace: 0x03, wallDark: 0x0F, strip: 0x2B },
  { name: "ENGINE SPINE", base: 0x07, dot: 0x17, corr: 0x0F, wallTop: 0x08, wallHi: 0x27, wallFace: 0x17, wallDark: 0x0F, strip: 0x28 },
];
const tileCache = {};
function buildTiles(theme) {
  if (tileCache[theme]) return tileCache[theme];
  const th = THEMES[theme], out = {};
  const mk = () => { const c = mkCanvas(16, 16); return [c, c.getContext("2d")]; };
  out.floor = [];
  for (let v = 0; v < 4; v++) {
    const [c, g] = mk();
    fillPx(g, 0, 0, 16, 16, th.base);
    fillPx(g, 15, 0, 1, 16, BLACK); fillPx(g, 0, 15, 16, 1, BLACK);
    if (v === 1) fillPx(g, 7, 7, 2, 2, th.dot);
    if (v === 2) { fillPx(g, 3, 3, 1, 1, th.dot); fillPx(g, 12, 12, 1, 1, th.dot); }
    if (v === 3) { fillPx(g, 2, 2, 4, 1, th.dot); fillPx(g, 2, 2, 1, 4, th.dot); }
    out.floor.push(c);
  }
  out.corr = [];
  for (let v = 0; v < 2; v++) {
    const [c, g] = mk();
    fillPx(g, 0, 0, 16, 16, th.corr);
    fillPx(g, 0, 0, 16, 1, th.base); fillPx(g, 0, 8, 16, 1, 0x0D);
    if (v) { fillPx(g, 2, 3, 3, 1, 0x28); fillPx(g, 11, 12, 3, 1, 0x28); } else fillPx(g, 7, 12, 2, 1, th.dot);
    out.corr.push(c);
  }
  { // wall top (solid mass)
    const [c, g] = mk();
    fillPx(g, 0, 0, 16, 16, th.wallTop); fillPx(g, 0, 0, 16, 1, th.wallHi); fillPx(g, 0, 15, 16, 1, th.wallDark);
    fillPx(g, 0, 0, 1, 16, th.wallHi); fillPx(g, 15, 0, 1, 16, th.wallDark);
    fillPx(g, 2, 2, 2, 2, th.wallDark); fillPx(g, 12, 2, 2, 2, th.wallDark); fillPx(g, 2, 12, 2, 2, th.wallDark); fillPx(g, 12, 12, 2, 2, th.wallDark);
    out.wallTop = c;
  }
  { // wall front (faces the room)
    const [c, g] = mk();
    fillPx(g, 0, 0, 16, 5, th.wallTop); fillPx(g, 0, 0, 16, 1, th.wallHi);
    fillPx(g, 0, 5, 16, 11, th.wallFace); fillPx(g, 0, 5, 16, 1, th.wallDark);
    fillPx(g, 0, 6, 1, 10, th.wallDark); fillPx(g, 15, 6, 1, 10, th.wallDark);
    fillPx(g, 3, 8, 10, 2, th.strip); fillPx(g, 3, 8, 10, 1, WHITE);
    fillPx(g, 0, 15, 16, 1, BLACK);
    out.wallFront = c;
  }
  { const [c, g] = mk(); fillPx(g, 0, 0, 16, 16, BLACK); out.void = c; }
  { // console (2 blink frames)
    out.console = [];
    for (let f = 0; f < 2; f++) {
      const [c, g] = mk();
      fillPx(g, 0, 0, 16, 16, th.base); fillPx(g, 15, 0, 1, 16, BLACK); fillPx(g, 0, 15, 16, 1, BLACK);
      fillPx(g, 1, 2, 14, 13, 0x0D); fillPx(g, 2, 3, 12, 8, 0x2D);
      fillPx(g, 3, 4, 10, 6, f ? 0x1C : 0x0C);
      fillPx(g, 4, 5, f ? 6 : 3, 1, WHITE); fillPx(g, 4, 7, f ? 3 : 6, 1, th.strip);
      fillPx(g, 2, 12, 2, 2, RED); fillPx(g, 6, 12, 2, 2, GREEN); fillPx(g, 10, 12, 4, 2, 0x00);
      out.console.push(c);
    }
  }
  { const [c, g] = mk(); // table
    fillPx(g, 0, 0, 16, 16, th.base); fillPx(g, 0, 15, 16, 1, BLACK); fillPx(g, 15, 0, 1, 16, BLACK);
    fillPx(g, 1, 3, 14, 12, 0x0D); fillPx(g, 1, 2, 14, 11, 0x10); fillPx(g, 1, 2, 14, 1, WHITE); fillPx(g, 3, 5, 4, 3, 0x00); fillPx(g, 9, 6, 3, 2, 0x2D);
    out.table = c; }
  { const [c, g] = mk(); // crate
    fillPx(g, 0, 0, 16, 16, th.base); fillPx(g, 0, 15, 16, 1, BLACK); fillPx(g, 15, 0, 1, 16, BLACK);
    fillPx(g, 1, 1, 14, 14, 0x0D); fillPx(g, 2, 2, 12, 12, 0x18); fillPx(g, 2, 2, 12, 1, 0x28); fillPx(g, 2, 13, 12, 1, 0x08);
    for (let i = 0; i < 10; i++) { fillPx(g, 3 + i, 3 + i, 1, 1, 0x08); fillPx(g, 12 - i, 3 + i, 1, 1, 0x08); }
    out.crate = c; }
  { const [c, g] = mk(); // bed left (pillow)
    fillPx(g, 0, 0, 16, 16, th.base); fillPx(g, 0, 15, 16, 1, BLACK);
    fillPx(g, 1, 2, 15, 13, 0x0D); fillPx(g, 2, 3, 14, 11, 0x12); fillPx(g, 2, 3, 14, 1, 0x22); fillPx(g, 3, 5, 6, 7, WHITE); fillPx(g, 3, 5, 6, 1, 0x30);
    out.bedL = c; }
  { const [c, g] = mk(); // bed right
    fillPx(g, 0, 0, 16, 16, th.base); fillPx(g, 0, 15, 16, 1, BLACK); fillPx(g, 15, 0, 1, 16, BLACK);
    fillPx(g, 0, 2, 15, 13, 0x0D); fillPx(g, 0, 3, 14, 11, 0x12); fillPx(g, 0, 3, 14, 1, 0x22); fillPx(g, 0, 6, 14, 1, 0x02);
    out.bedR = c; }
  { const [c, g] = mk(); // pillar
    fillPx(g, 0, 0, 16, 16, th.base); fillPx(g, 0, 15, 16, 1, BLACK); fillPx(g, 15, 0, 1, 16, BLACK);
    fillPx(g, 3, 2, 10, 13, 0x0D); fillPx(g, 4, 1, 8, 12, th.wallTop); fillPx(g, 4, 1, 8, 1, th.wallHi); fillPx(g, 4, 1, 2, 12, th.wallHi);
    fillPx(g, 4, 5, 8, 2, th.strip);
    out.pillar = c; }
  // assimilation overlay levels 1-4 (dithered green circuitry)
  out.conv = [];
  for (let lv = 1; lv <= 4; lv++) {
    const [c, g] = mk();
    g.fillStyle = NES[0x0B];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const on = lv === 4 ? true : lv === 3 ? ((x + y) & 3) !== 0 : lv === 2 ? ((x + y) & 1) === 0 : ((x & 1) === 0 && (y & 1) === 0);
      if (on) g.fillRect(x, y, 1, 1);
    }
    if (lv >= 2) { fillPx(g, 2, 7, 12, 1, 0x1A); fillPx(g, 7, 2, 1, 12, 0x1A); }
    if (lv >= 3) { fillPx(g, 5, 5, 2, 2, GREEN); fillPx(g, 10, 10, 2, 2, GREEN); }
    if (lv === 4) { fillPx(g, 2, 2, 3, 1, 0x3A); fillPx(g, 11, 13, 3, 1, 0x3A); }
    out.conv.push(c);
  }
  return (tileCache[theme] = out);
}

// ---------- bosses (drawn in code, 1 pixel = 1 NES pixel) ----------
const bossCache = {};
function bossArt(kind, pose, flash) {
  const key = kind + pose + (flash ? "f" : "");
  if (bossCache[key]) return bossCache[key];
  const c = mkCanvas(40, 40), g = c.getContext("2d");
  const F = (col) => (flash ? WHITE : col);
  const R = (x, y, w, h, col) => fillPx(g, x, y, w, h, F(col));
  if (kind === "vex") {
    const sleep = pose === 2, dash = pose === 1;
    R(6, 8, 28, 30, 0x06);                         // cape
    R(6, 8, 28, 2, 0x16);
    R(10, 16, 20, 18, 0x02); R(10, 16, 20, 2, 0x12); R(10, 32, 20, 2, BLACK);   // tunic
    R(14, 18, 12, 2, GOLD); R(19, 18, 2, 14, GOLD);                              // sash
    R(5, 16, 7, 6, GOLD); R(28, 16, 7, 6, GOLD); R(5, 16, 7, 1, 0x38); R(28, 16, 7, 1, 0x38); // epaulets
    R(12, 34, 6, 5, BLACK); R(22, 34, 6, 5, BLACK); R(12, 34, 6, 2, 0x18); R(22, 34, 6, 2, 0x18);
    R(14, 4, 12, 12, 0x36); R(14, 4, 12, 1, BLACK);                              // head
    R(13, 2, 14, 5, 0x30); R(12, 4, 3, 8, 0x30); R(25, 4, 3, 8, 0x30);           // white hair
    if (sleep) { R(16, 9, 3, 1, BLACK); R(22, 9, 3, 1, BLACK); } else { R(16, 8, 3, 3, BLACK); R(22, 8, 3, 3, BLACK); R(16, 8, 1, 1, WHITE); R(22, 8, 1, 1, WHITE); }
    R(17, 13, 6, 1, 0x06);
    if (dash) { R(0, 22, 6, 4, 0x2D); R(34, 22, 6, 4, 0x2D); } else { R(2, 20, 5, 6, 0x36); R(33, 20, 5, 6, 0x36); R(0, 24, 8, 4, 0x2D); }
    R(6, 38, 28, 1, BLACK);
  } else if (kind === "kiln") {
    const slam = pose === 1, sleep = pose === 2;
    R(4, 34, 32, 6, 0x0D); R(6, 35, 28, 4, 0x00);                                 // treads
    for (let i = 0; i < 6; i++) R(7 + i * 5, 35, 2, 4, BLACK);
    R(8, 10, 24, 26, 0x2D); R(8, 10, 24, 2, 0x10); R(8, 34, 24, 2, BLACK); R(8, 10, 2, 26, 0x10);
    for (let i = 0; i < 5; i++) { R(10 + i * 5, 26, 3, 2, 0x28); R(12 + i * 5, 28, 3, 2, 0x28); } // hazard stripes
    R(12, 2, 16, 10, 0x00); R(12, 2, 16, 1, 0x10); R(12, 11, 16, 1, BLACK);        // head
    R(14, 5, 12, 4, BLACK); R(sleep ? 16 : 16, 6, sleep ? 8 : 8, 2, sleep ? 0x06 : 0x16);  // visor
    R(2, 12 - (slam ? 8 : 0), 8, 14, 0x00); R(30, 12 - (slam ? 8 : 0), 8, 14, 0x00);          // arms
    R(0, 24 - (slam ? 10 : 0), 10, 8, 0x17); R(30, 24 - (slam ? 10 : 0), 10, 8, 0x17);       // claws
    R(0, 24 - (slam ? 10 : 0), 4, 3, 0x27); R(36, 24 - (slam ? 10 : 0), 4, 3, 0x27);
    R(16, 14, 8, 8, 0x0D); R(17, 15, 6, 6, 0x16); R(19, 17, 2, 2, 0x38);            // reactor
  } else {
    const open = pose === 2;
    const cx = 20, cy = 20;
    for (let y = -14; y <= 14; y++) {
      const half = Math.round(Math.sqrt(196 - y * y));
      R(cx - half, cy + y, half * 2, 1, y < -8 ? 0x23 : y > 8 ? 0x03 : 0x13);
    }
    for (let y = -14; y <= -12; y++) { const half = Math.round(Math.sqrt(196 - y * y)); R(cx - half + 2, cy + y, half * 2 - 4, 1, 0x33); }
    R(cx - 10, cy - 4, 20, 8, BLACK);
    if (open) { R(cx - 8, cy - 3, 16, 6, 0x30); R(cx - 3, cy - 3, 6, 6, 0x16); R(cx - 1, cy - 1, 2, 2, BLACK); }
    else { R(cx - 8, cy - 1, 16, 2, 0x2C); }
    R(cx - 1, 2, 2, 5, 0x2C); R(cx - 1, 33, 2, 5, 0x2C); R(2, cy - 1, 5, 2, 0x2C); R(33, cy - 1, 5, 2, 0x2C);
  }
  return (bossCache[key] = c);
}

const BOSS_DEFS = [
  { kind: "vex", name: "CAPTAIN VEX", hp: 44, w: 28, h: 30 },
  { kind: "kiln", name: "KILNBREAKER", hp: 66, w: 30, h: 32 },
  { kind: "nova", name: "ADMIRAL NOVA", hp: 88, w: 26, h: 26 },
];
