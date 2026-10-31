// pixel.js — hand-authored pixel art, palette, sprite baking and a 5x7 bitmap font.
// Every sprite is a string grid; one character = one pixel, mapped through PAL.
(function () {
  'use strict';

  const PAL = {
    '.': null,
    'k': '#0b0914', 'K': '#1b1626', 'B': '#2d2742', 'L': '#413a5c',
    'p': '#6a3fa3', 'P': '#a97bf2', 'v': '#3a2a6a',
    'g': '#35c96a', 'G': '#9cf26a',
    'o': '#ff8a1f', 'O': '#ffc247', 'y': '#ffe76b',
    'w': '#f3eddd', 'W': '#ffffff',
    'r': '#d1303d', 'R': '#ff6f6f',
    'h': '#e9582b', 'b': '#f4d67e', 'n': '#5c3a21', 'N': '#3a2314',
    's': '#f2caa6', 'S': '#d9a07f',
    't': '#7e7e94', 'T': '#c6c6d6', 'd': '#46465a', 'D': '#2c2c3a',
    'e': '#2e6b3b', 'E': '#1c4727',
    'm': '#7c5331', 'M': '#4f331d',
    'c': '#3ab8d8', 'C': '#a2f0ff',
    'x': '#ff46f0', 'X': '#ffa8f8',
    'u': '#8a6bd0', 'U': '#d7ccff',
    'a': '#a8a890', 'A': '#d8d8c8',
    'f': '#6e9a3a', 'F': '#b6d94a',
    'i': '#ff5a3c', 'I': '#ffd23c',
    'q': '#1a1f3a', 'z': '#0f2a1a',
    'Q': '#5a1d2a', 'Z': '#243b55'
  };

  // Bake a grid into an offscreen canvas. `sub` remaps placeholder chars to palette chars.
  function bake(rows, sub) {
    const h = rows.length;
    let w = 0;
    for (const r of rows) w = Math.max(w, r.length);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        let ch = row[x];
        if (sub && sub[ch] !== undefined) ch = sub[ch];
        const col = PAL[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  function flipX(src) {
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d');
    ctx.translate(src.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0);
    return c;
  }

  // White silhouette version for hit flashes.
  function silhouette(src, color) {
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color || '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // ---------------------------------------------------------------- FONT
  const FONT_SRC = {
    A: '.###./#...#/#...#/#####/#...#/#...#/#...#',
    B: '####./#...#/#...#/####./#...#/#...#/####.',
    C: '.####/#..../#..../#..../#..../#..../.####',
    D: '####./#...#/#...#/#...#/#...#/#...#/####.',
    E: '#####/#..../#..../####./#..../#..../#####',
    F: '#####/#..../#..../####./#..../#..../#....',
    G: '.####/#..../#..../#.###/#...#/#...#/.####',
    H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
    I: '#####/..#../..#../..#../..#../..#../#####',
    J: '..###/...#./...#./...#./...#./#..#./.##..',
    K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
    L: '#..../#..../#..../#..../#..../#..../#####',
    M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
    N: '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',
    O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
    P: '####./#...#/#...#/####./#..../#..../#....',
    Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
    R: '####./#...#/#...#/####./#.#../#..#./#...#',
    S: '.####/#..../#..../.###./....#/....#/####.',
    T: '#####/..#../..#../..#../..#../..#../..#..',
    U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
    V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
    W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',
    X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
    Y: '#...#/#...#/.#.#./..#../..#../..#../..#..',
    Z: '#####/....#/...#./..#../.#.../#..../#####',
    '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
    '1': '..#../.##../..#../..#../..#../..#../.###.',
    '2': '.###./#...#/....#/...#./..#../.#.../#####',
    '3': '#####/...#./..#../...#./....#/#...#/.###.',
    '4': '...#./..##./.#.#./#..#./#####/...#./...#.',
    '5': '#####/#..../####./....#/....#/#...#/.###.',
    '6': '..##./.#.../#..../####./#...#/#...#/.###.',
    '7': '#####/....#/...#./..#../.#.../.#.../.#...',
    '8': '.###./#...#/#...#/.###./#...#/#...#/.###.',
    '9': '.###./#...#/#...#/.####/....#/...#./.##..',
    '!': '..#../..#../..#../..#../..#../...../..#..',
    '?': '.###./#...#/....#/...#./..#../...../..#..',
    '.': '...../...../...../...../...../..##./..##.',
    ',': '...../...../...../...../..##./..##./.#...',
    "'": '.##../.##../..#../...../...../...../.....',
    ':': '...../..##./..##./...../..##./..##./.....',
    '-': '...../...../...../#####/...../...../.....',
    '/': '....#/....#/...#./..#../.#.../#..../#....',
    '&': '.##../#..#./#..#./.##../#.#.#/#..#./.##.#',
    '(': '...#./..#../.#.../.#.../.#.../..#../...#.',
    ')': '.#.../..#../...#./...#./...#./..#../.#...',
    '%': '##..#/##.#./...#./..#../.#.../#.##./#..##',
    '+': '...../..#../..#../#####/..#../..#../.....',
    '"': '.#.#./.#.#./...../...../...../...../.....',
    '<': '...#./..#../.#.../#..../.#.../..#../...#.',
    '>': '.#.../..#../...#./....#/...#./..#../.#...',
    '=': '...../...../#####/...../#####/...../.....',
    '*': '...../#.#.#/.###./#####/.###./#.#.#/.....',
    '_': '...../...../...../...../...../...../#####'
  };
  const FONT = {};
  for (const k in FONT_SRC) FONT[k] = FONT_SRC[k].split('/');
  const glyphCache = new Map();
  function glyph(ch, color) {
    const key = ch + '|' + color;
    let g = glyphCache.get(key);
    if (g) return g;
    const rows = FONT[ch];
    if (!rows) return null;
    const c = document.createElement('canvas');
    c.width = 5; c.height = 7;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (rows[y][x] === '#') ctx.fillRect(x, y, 1, 1);
    glyphCache.set(key, c);
    return g = c;
  }
  function textWidth(str, scale) {
    scale = scale || 1;
    return str.length * 6 * scale - scale;
  }
  // Draws text; align: 'left' | 'center' | 'right'. Optional shadow color.
  function drawText(ctx, str, x, y, color, scale, align, shadow) {
    scale = scale || 1;
    str = String(str).toUpperCase();
    const w = textWidth(str, scale);
    if (align === 'center') x -= Math.floor(w / 2);
    else if (align === 'right') x -= w;
    x = Math.round(x); y = Math.round(y);
    if (shadow) {
      for (let i = 0; i < str.length; i++) {
        const g = glyph(str[i], shadow);
        if (g) ctx.drawImage(g, 0, 0, 5, 7, x + i * 6 * scale + scale, y + scale, 5 * scale, 7 * scale);
      }
    }
    for (let i = 0; i < str.length; i++) {
      const g = glyph(str[i], color);
      if (g) ctx.drawImage(g, 0, 0, 5, 7, x + i * 6 * scale, y, 5 * scale, 7 * scale);
    }
    return w;
  }

  // ---------------------------------------------------------------- SPRITES
  const S = {};

  // Player convertible, top-down, no witches (seats are drawn separately).
  S.carBase = bake([
    '......KKKKKKKK......',
    '....KKLLLLLLLLKK....',
    '...KOLBBBBBBBBLOK...',
    '...KLBBBBBBBBBBLK...',
    '...KLBBBBBBBBBBLK...',
    '...KLBBBBBBBBBBLK...',
    '..tKLBBBBBBBBBBLKt..',
    '.ttKKKKKKKKKKKKKKtt.',
    '.ttKCCCCCCCCCCCCKtt.',
    '.ttKCcCCCCCCCCcCKtt.',
    '..tKKKKKKKKKKKKKKt..',
    '...KDDDDDDDDDDDDK...',
    '...KDDDDDDDDDDDDK...',
    '...KDDDDDDDDDDDDK...',
    '...KDDDDDDDDDDDDK...',
    '...KDDDDDDDDDDDDK...',
    '...KKKKKKKKKKKKKK...',
    '...KDDDDDDDmMmMmK...',
    '...KDDDDDDDMmMmMK...',
    '...KDDDDDDDmMmMmK...',
    '...KDDDDDDDMmMmMK...',
    '...KDDDDDDDmMmMmK...',
    '..tKKKKKKKKKKKKKKt..',
    '.ttKLBBBBBBBBBBLKtt.',
    '.ttKLBBBwwwwwBBLKtt.',
    '.ttKLBBBwkwkwBBLKtt.',
    '..tKrBBBBBBBBBBrKt..',
    '...KKKKKKKKKKKKKK...'
  ]);
  S.carBaseHit = silhouette(S.carBase);
  // Seat offsets inside carBase for the three witches: driver, passenger, back-left.
  S.SEATS = [{ x: 4, y: 11 }, { x: 11, y: 11 }, { x: 4, y: 17 }];

  const HAT_TOP = [
    '.HHH.',
    'HKKKH',
    'HKLKH',
    'HKKKH',
    '.HHH.'
  ];
  S.hatTop = { b: bake(HAT_TOP, { H: 'b' }), h: bake(HAT_TOP, { H: 'h' }), n: bake(HAT_TOP, { H: 'n' }) };

  // Side-view witch bust (for attract/ending). `eyes`: 'shades' or default.
  function witchSide(hair, shades) {
    const eyeRow = shades ? '..HHkkkHH...' : '..HHsksHH...';
    return bake([
      '.....k......',
      '.....k......',
      '....kk......',
      '....kkk.....',
      '...kkkk.....',
      '...kkkkk....',
      '..kkkPkk....',
      '.kkkkkkkkkk.',
      '..HHsssHH...',
      eyeRow,
      '..HHsssHH...',
      '..HHHsHHH...',
      '..HHkkkHH...',
      '...kkkkk....'
    ], { H: hair });
  }
  S.witchSide = { b: witchSide('b', true), h: witchSide('h', false), n: witchSide('n', false) };

  // Side-view car body for attract scene (faces left). Door swirl echoes the drawing.
  S.carSide = bake([
    '..........KKK............................................',
    '.........KCCCK...........................................',
    '........KCCCCCK..........................................',
    '....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK....',
    '...KLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLK..',
    '..KLBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBLK.',
    '.KOOBBBBBBBBKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBPPPBBBBBBBBBrrK',
    '.KOOBBBBBBBBKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBPBBBBBBBBrrK',
    '.KBBBBBBBBBBKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBPPPBBBBBBBBBBBK',
    '.KwwwwwBBBBBKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBPBBBBBBBBBBBBBK',
    '.KwkwkwBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBK',
    '.KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
    '....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...'
  ]);
  const WHEEL0 = [
    '..tttt..',
    '.tTTTTt.',
    'tTttttTt',
    'tTtTTtTt',
    'tTtTttTt',
    'tTtTTTTt',
    '.ttttttt',
    '..tttt..'
  ];
  const WHEEL1 = [
    '..tttt..',
    '.ttTTtt.',
    'tTtttTtt',
    'tTTTtTTt',
    'ttttTttt',
    'tTTTtTTt',
    '.ttTTtt.',
    '..tttt..'
  ];
  S.wheel = [bake(WHEEL0), bake(WHEEL1)];

  // Generic top-down vehicle template. 1=body 2=highlight 3=glass
  const CAR_T = [
    '.....111111.....',
    '...1122222211...',
    '..1O2222222O1...',
    '..122222222221..',
    '.t122222222221t.',
    'tt111111111111tt',
    'tt133333333331tt',
    '.t133333333331t.',
    '..122222222221..',
    '..122222222221..',
    '..122222222221..',
    '..122222222221..',
    '..122222222221..',
    '..122222222221..',
    '..133333333331..',
    '.t133333333331t.',
    'tt111111111111tt',
    'tt122222222221tt',
    '.t122222222221t.',
    '..1r22222222r1..',
    '...1111111111...'
  ];
  S.sedan = bake(CAR_T, { '1': 'D', '2': 'd', '3': 'c' });
  S.sedan2 = bake(CAR_T, { '1': 'Q', '2': 'r', '3': 'c' });
  S.cop = [
    bake(CAR_T.map((r, i) => i === 6 ? 'tt1rrrr33cccc1tt' : i === 7 ? '.t1kkkkkkkkkk1t.' : r), { '1': 'K', '2': 'w', '3': 'c' }),
    bake(CAR_T.map((r, i) => i === 6 ? 'tt1cccc33rrrr1tt' : i === 7 ? '.t1kkkkkkkkkk1t.' : r), { '1': 'K', '2': 'w', '3': 'c' })
  ];
  // Jock jeep: open top with two letterman jackets.
  S.jeep = bake([
    '....11111111....',
    '..112222222211..',
    '..1O22222222O1..',
    '..122222222221..',
    '.t122222222221t.',
    'tt111111111111tt',
    'tt133333333331tt',
    '.t1KKKKKKKKKKK1t.',
    '..1KyyykKyyykK1..',
    '..1KyssyKyssyK1..',
    '..1KyskyKyskyK1..',
    '..1KyssyKyssyK1..',
    '..1KKrrKKKKrrKK1..',
    '..1KrrrrKKrrrrK1..',
    '..1KKKKKKKKKKKK1..',
    '.t1KKKKKKKKKKKK1t.',
    'tt111111111111tt',
    'tt122222222221tt',
    '.t122222222221t.',
    '..1r22222222r1..',
    '...1111111111...'
  ].map(r => r.length > 16 ? r.slice(0, 16) : r), { '1': 'r', '2': 'R', '3': 'C' });
  // Witch-hunter van: long, green, back doors.
  S.van = bake([
    '....11111111....',
    '..112222222211..',
    '..1O22222222O1..',
    '.t122222222221t.',
    'tt111111111111tt',
    'tt133333333331tt',
    '.t133333333331t.',
    '..122222222221..',
    '..122222222221..',
    '..122222222221..',
    '..1222wwwwww221..',
    '..1222wkkwkw221..',
    '..1222wwwwww221..',
    '..122222222221..',
    '..122222222221..',
    '..122222222221..',
    '..122222222221..',
    '..122222222221..',
    '..122222222221..',
    '..122222222221..',
    '..122222222221..',
    '..122222222221..',
    '.t122222222221t.',
    'tt111111111111tt',
    'tt122222222221tt',
    '.t122221122221t.',
    '..1r2221122r21..',
    '...1111111111...'
  ].map(r => r.length > 16 ? r.slice(0, 16) : r), { '1': 'E', '2': 'e', '3': 'T' });
  // Hay wagon: wide, slow.
  S.hay = bake([
    '...MMMMMMMMMMMMMM...',
    '..MOyOyOyOyOyOyOyM..',
    '..MyOyOyOyOyOyOyOM..',
    '.tMOyOyOyOyOyOyOyMt.',
    'ttMyOyOyOyOyOyOyOMtt',
    'ttMOyOyOyOyOyOyOyMtt',
    '.tMyOyOyOyOyOyOyOMt.',
    '..MOyOyOyOyOyOyOyM..',
    '..MyOyOyOyOyOyOyOM..',
    '..MOyOyOyOyOyOyOyM..',
    '.tMyOyOyOyOyOyOyOMt.',
    'ttMOyOyOyOyOyOyOyMtt',
    'ttMyOyOyOyOyOyOyOMtt',
    '.tMOyOyOyOyOyOyOyMt.',
    '..MMMMMMMMMMMMMMMM..',
    '....mmmmmmmmmmmm....'
  ]);
  // Pumpkin truck: pickup with cargo.
  S.truck = bake([
    '.....111111.....',
    '...1122222211...',
    '..1O2222222O1...',
    '.t122222222221t.',
    'tt111111111111tt',
    'tt133333333331tt',
    '.t133333333331t.',
    '..122222222221..',
    '..1MMMMMMMMMMM1..',
    '..1MoOooMooOoM1..',
    '..1MOooOMOooOM1..',
    '..1MooOoMoOooM1..',
    '..1MMMMMMMMMMM1..',
    '..1MoOooMooOoM1..',
    '..1MOooOMOooOM1..',
    '.t1MooOoMoOooM1t.',
    'tt1MMMMMMMMMMM1tt',
    'tt122222222221tt',
    '.t122222222221t.',
    '..1r22222222r1..',
    '...1111111111...'
  ].map(r => r.length > 16 ? r.slice(0, 16) : r), { '1': 'Z', '2': 'c', '3': 'C' });

  // Critters & transformations
  S.frog = [
    bake([
      '.f....f.',
      'fGffffGf',
      'fFFFFFFf',
      '.ffffff.',
      'f.ffff.f',
      'f......f'
    ]),
    bake([
      '.f....f.',
      'fGffffGf',
      'fFFFFFFf',
      '.ffffff.',
      '..f..f..',
      '.f....f.'
    ])
  ];
  S.pumpkin = bake([
    '....m....',
    '...Mm....',
    '.oooOooo.',
    'oOoOoOoOo',
    'oOkOoOkOo',
    'oOoOoOoOo',
    'oOkkkkkOo',
    '.ooOoOoo.',
    '..ooooo..'
  ]);
  S.pumpkinLit = bake([
    '....m....',
    '...Mm....',
    '.oooOooo.',
    'oOoOoOoOo',
    'oOyOoOyOo',
    'oOoOoOoOo',
    'oOyyyyyOo',
    '.ooOoOoo.',
    '..ooooo..'
  ]);
  S.pie = bake([
    '..OOOOOO..',
    '.OyyyyyyO.',
    'OyOyOyOyyO',
    'OmmmmmmmmO',
    '.mmmmmmmm.',
    '..MMMMMM..'
  ]);
  S.bat = [
    bake([
      'k.........k',
      'kk..k.k..kk',
      'kkkkRkRkkkk',
      '.kkk.k.kkk.',
      '..k.....k..'
    ]),
    bake([
      '...........',
      '....k.k....',
      'kkkkRkRkkkk',
      'kkkk.k.kkkk',
      'k....k....k'
    ])
  ];
  S.ghost = [
    bake([
      '...UUUU...',
      '..UUUUUU..',
      '.UUkUUkUU.',
      '.UUUUUUUU.',
      '.UUUkkUUU.',
      '.UUUUUUUU.',
      '.UUUUUUUU.',
      '.UUUUUUUU.',
      '.UUUUUUUU.',
      '.UU.UU.UU.',
      '.U...U..U.',
      '..........'
    ]),
    bake([
      '...UUUU...',
      '..UUUUUU..',
      '.UUkUUkUU.',
      '.UUUUUUUU.',
      '.UUUkkUUU.',
      '.UUUUUUUU.',
      '.UUUUUUUU.',
      '.UUUUUUUU.',
      '.UUUUUUUU.',
      '.UUUUUUUU.',
      '.U.UU.UU..',
      '.U.U..U...'
    ])
  ];
  S.cat = [
    bake([
      'k.k.......',
      'kkkk....k.',
      'kGkG....k.',
      'kkkkkkkkk.',
      '.kkkkkkk..',
      '.k.k.k.k..'
    ]),
    bake([
      'k.k......k',
      'kkkk.....k',
      'kGkG....k.',
      'kkkkkkkkk.',
      '.kkkkkkk..',
      'k.k...k.k.'
    ])
  ];
  // Hitchhiker witch standing (front view), hair placeholder H; two frames (thumb up / wave).
  const HITCH0 = [
    '.....k.....',
    '.....k.....',
    '....kkk....',
    '....kkk....',
    '...kkkkk...',
    '...kPkkk...',
    '.kkkkkkkkk.',
    '..HHsssHH..',
    '..HHkskHH..',
    '..HHsssHH..',
    '...HkkkH...',
    '...kkkkk.s.',
    '...kkkkkss.',
    '..kkkkkkk..',
    '.kkkkkkkkk.',
    '.kkkkkkkkk.'
  ];
  const HITCH1 = [
    '.....k.....',
    '.....k.....',
    '....kkk....',
    '....kkk....',
    '...kkkkk...',
    '...kPkkk...',
    '.kkkkkkkkk.',
    '..HHsssHH..',
    '..HHkskHH..',
    '..HHsssHH.s',
    '...HkkkH.s.',
    '...kkkkkk..',
    '...kkkkk...',
    '..kkkkkkk..',
    '.kkkkkkkkk.',
    '.kkkkkkkkk.'
  ];
  S.hitch = {};
  for (const h of ['b', 'h', 'n']) S.hitch[h] = [bake(HITCH0, { H: h }), bake(HITCH1, { H: h })];

  // Ejected witch tumbling (just hat + hair blob)
  S.tumble = {};
  for (const h of ['b', 'h', 'n']) S.tumble[h] = bake([
    '..kkk..',
    '.kkkkk.',
    'kkkkkkk',
    '.HHsHH.',
    '.HHHHH.',
    '..kkk..'
  ], { H: h });

  // Projectiles
  S.hex = [
    bake(['.G.', 'GgG', 'gXg', 'GgG', '.g.', '.g.', '.g.']),
    bake(['.g.', 'gGg', 'GXG', 'gGg', '.G.', '.g.', '.g.'])
  ];
  S.net = bake([
    '.TtTtT.',
    'TtTtTtT',
    'tTtTtTt',
    'TtTtTtT',
    'tTtTtTt',
    'TtTtTtT',
    '.TtTtT.'
  ]);
  S.pompom = [
    bake(['.rWr.', 'rWrWr', 'WrWrW', 'rWrWr', '.rWr.']),
    bake(['.WrW.', 'WrWrW', 'rWrWr', 'WrWrW', '.WrW.'])
  ];
  S.cone = bake([
    '..oo..',
    '..oo..',
    '.wwww.',
    '.oooo.',
    '.wwww.',
    'oooooo',
    'oooooo'
  ]);
  S.firePumpkin = [
    bake([
      '..i.I..',
      '.IiIiI.',
      '.oOoOo.',
      'oOyOyOo',
      'oOoOoOo',
      'oOyyyOo',
      '.ooooo.'
    ]),
    bake([
      '.I.i.I.',
      '.iIiIi.',
      '.oOoOo.',
      'oOyOyOo',
      'oOoOoOo',
      'oOyyyOo',
      '.ooooo.'
    ])
  ];
  S.oil = bake([
    '...ooOOoo...',
    '.ooOyyyyOoo.',
    'ooOyywwyyOoo',
    'oOyywwwwyyOo',
    'ooOyywwyyOoo',
    '.ooOyyyyOoo.',
    '...ooOOoo...'
  ]);
  S.candy = {
    x: bake(['x...x', '.xXx.', 'xXXXx', '.xXx.', 'x...x']),
    o: bake(['o...o', '.oOo.', 'oOOOo', '.oOo.', 'o...o']),
    c: bake(['c...c', '.cCc.', 'cCCCc', '.cCc.', 'c...c'])
  };
  S.broom = bake([
    '......mmmmmmmmmmmmmmmmm',
    'OyOyOmmmmmmmmmmmmmmmmmm',
    'yOyOyOm................',
    'OyOyO..................'
  ]);
  S.heart = bake(['.r.r.', 'rRrRr', 'rrrrr', '.rrr.', '..r..']);

  // Scenery (top-down-ish / 3/4)
  S.house = [
    bake([
      '....ddd.....................',
      '....dTd.....................',
      'mmmmmmmmmmmmmmmmmmmmmmmmmmmm',
      'mMmMmMmMmMmMmMmMmMmMmMmMmMmM',
      'mmmmmmmmmmmmmmmmmmmmmmmmmmmm',
      'MMMMMMMMMMMMMMMMMMMMMMMMMMMM',
      'mmmmmmmmmmmmmmmmmmmmmmmmmmmm',
      'mMmMmMmMmMmMmMmMmMmMmMmMmMmM',
      'mmmmmmmmmmmmmmmmmmmmmmmmmmmm',
      'MMMMMMMMMMMMMMMMMMMMMMMMMMMM',
      'mmmmmmmmmmmmmmmmmmmmmmmmmmmm',
      'NNNNNNNNNNNNNNNNNNNNNNNNNNNN',
      'NssssNyyyNssssssNyyyNsssssNN',
      'NssssNyOyNssssssNyOyNsssssNN',
      'NssssNyyyNssssssNyyyNsssssNN',
      'NssssNNNNNssNNssNNNNNsssssNN',
      'NssssssssssNyyNsssssssssssNN',
      'NssssssssssNyyNsssssssssssNN',
      'NNNNNNNNNNNNNNNNNNNNNNNNNNNN',
      '.....o........o........o....',
      '....oOo......oOo......oOo...',
      '....oyo......oyo......oyo...',
      '.....o........o........o....'
    ]),
    bake([
      '.................ddd........',
      '.................dTd........',
      'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
      'ZqZqZqZqZqZqZqZqZqZqZqZqZqZq',
      'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
      'qqqqqqqqqqqqqqqqqqqqqqqqqqqq',
      'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
      'ZqZqZqZqZqZqZqZqZqZqZqZqZqZq',
      'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
      'qqqqqqqqqqqqqqqqqqqqqqqqqqqq',
      'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
      'dddddddddddddddddddddddddddd',
      'dAAAAdyyydAAAAAAAAAAAdyyydAd',
      'dAAAAdyOydAAAAAAAAAAAdyOydAd',
      'dAAAAdyyydAAAAAAAAAAAdyyydAd',
      'dAAAAdddddAAAAAAAAAAAdddddAd',
      'dAAAAAAAAAAAAAmmmAAAAAAAAAAd',
      'dAAAAAAAAAAAAAmmmAAAAAAAAAAd',
      'dddddddddddddddddddddddddddd',
      '..............o.............',
      '.............oOo............',
      '.............oyo............',
      '..............o.............'
    ])
  ];
  S.tree = bake([
    '....EEEE....',
    '..EEeeeeEE..',
    '.EeeeeeeeeE.',
    '.EeeeFeeeeE.',
    'EeeeFFeeeeeE',
    'EeeeeeeeeeeE',
    'EeeeeeeeeeeE',
    'EeeeeeeeeeeE',
    '.EeeeeeeeeE.',
    '.EeeeeeeeeE.',
    '..EEeeeeEE..',
    '....EEEE....'
  ]);
  S.pine = bake([
    '......EE......',
    '.....EeeE.....',
    '....EeeeeE....',
    '...EeeeeeeE...',
    '..EeeEeeEeeE..',
    '.EeeeeeeeeeeE.',
    'EeeeeeeeeeeeeE',
    '.EeeeeeeeeeeE.',
    '..EeeEeeEeeE..',
    '...EeeeeeeE...',
    '....EeeeeE....',
    '.....EeeE.....',
    '......EE......',
    '......MM......'
  ]);
  S.deadTree = bake([
    'N....N....N.',
    '.N...N...N..',
    '..N..N..N...',
    '...N.N.N....',
    '....NNN.....',
    '.....N......',
    '....NN......',
    '.....N......',
    '.....N......',
    '.....N......',
    '....NNN.....',
    '...NNNNN....'
  ]);
  S.grave = [
    bake([
      '..AAA..',
      '.AaaaA.',
      '.AaAaA.',
      '.AAAAA.',
      '.AaAaA.',
      '.AaaaA.',
      '.aaaaa.',
      'aaaaaaa'
    ]),
    bake([
      '..AAA..',
      '.AaaaA.',
      '.AaaaA.',
      '.AaaaA.',
      '.AaaaA.',
      '.aaaaa.',
      'aaaaaaa'
    ]),
    bake([
      '..A....',
      '.AAA...',
      'AAAAA..',
      '.AAA...',
      '.AaA...',
      '.AaA...',
      '.aaa...',
      'aaaaa..'
    ])
  ];
  S.lamp = bake([
    '..yyy..',
    '.yyOyy.',
    'yyOWOyy',
    '.yyOyy.',
    '..yyy..',
    '...t...',
    '...t...',
    '...t...',
    '...t...',
    '...t...',
    '..ttt..'
  ]);
  S.fence = bake([
    'wwwwwwwwwwwwwwww',
    'w.w.w.w.w.w.w.w.',
    'wwwwwwwwwwwwwwww',
    'w.w.w.w.w.w.w.w.'
  ]);
  S.ironFence = bake([
    't.t.t.t.t.t.t.t.',
    'tttttttttttttttt',
    't.t.t.t.t.t.t.t.',
    'tttttttttttttttt',
    't.t.t.t.t.t.t.t.'
  ]);
  S.rock = bake([
    '...ddtt....',
    '.ddtttTdd..',
    'dtttttTttd.',
    'dtttdtttttd',
    'ddtdddttttd',
    '.ddddddddd.'
  ]);
  S.cauldron = [
    bake([
      '..i.I.i..',
      '.IiIiIiI.',
      '.iIiIiIi.',
      'KKKKKKKKK',
      '.KKgGgKK.',
      '.KKKKKKK.',
      '..KKKKK..',
      '..K...K..'
    ]),
    bake([
      '.I.i.I.i.',
      '.iIiIiIi.',
      '.IiIiIiI.',
      'KKKKKKKKK',
      '.KKGgGKK.',
      '.KKKKKKK.',
      '..KKKKK..',
      '..K...K..'
    ])
  ];
  S.stone = bake([
    '..aaa..',
    '.aAAAa.',
    '.aAaAa.',
    '.aAAAa.',
    '.aAaAa.',
    '.aAAAa.',
    '.aAAAa.',
    '.aaaaa.',
    'aaaaaaa'
  ]);
  S.candles = [
    bake(['.I.y.I.', '.w.w.w.', '.w.w.w.', '.w.w.w.']),
    bake(['.y.I.y.', '.w.w.w.', '.w.w.w.', '.w.w.w.'])
  ];
  S.mushroom = bake([
    '.rRrRr.',
    'rRWrRWr',
    'rrrrrrr',
    '..www..',
    '..www..'
  ]);
  S.eyes = bake(['y.y', 'y.y']);
  S.scarecrow = bake([
    '...mmm...',
    '..mOOOm..',
    '..mOkOm..',
    '..mOOOm..',
    'mmmmkmmmm',
    'mmmmkmmmm',
    '....k....',
    '...kkk...',
    '...kkk...',
    '....m....',
    '....m....',
    '....m....'
  ]);
  S.moon = bake([
    '......wwwwww......',
    '....wwwwwwwwww....',
    '...wwwwwwTwwwww...',
    '..wwwwwwwwwwwwww..',
    '.wwwTwwwwwwwwwwww.',
    '.wwwwwwwwwwwTwwww.',
    'wwwwwwwwwwwwwwwwww',
    'wwwwwwwTTwwwwwwwww',
    'wwwwwwwTwwwwwwwwww',
    'wwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwTwww',
    'wwwTwwwwwwwwwwwwww',
    '.wwwwwwwwwwwwwwww.',
    '.wwwwwwwwwTwwwwww.',
    '..wwwwwwwwwwwwww..',
    '...wwwwwwwwwwww...',
    '....wwwwwwwwww....',
    '......wwwwww......'
  ]);

  // ---------------------------------------------------------------- BOSSES
  // Homecoming float: wide flatbed with cheer squad and stripes.
  S.bossFloat = bake([
    '......KKKKKKKKKKKKKKKKKKKKKK......',
    '....KKwwwwwwwwwwwwwwwwwwwwwwKK....',
    '...KOwwwwwwwwwwwwwwwwwwwwwwwwOK...',
    '...KwwwwwwwwwwwwwwwwwwwwwwwwwwK...',
    '..tKCCCCCCCCCCCCCCCCCCCCCCCCCCKt..',
    'tttKKKKKKKKKKKKKKKKKKKKKKKKKKKKttt',
    'tttKrWrWrWrWrWrWrWrWrWrWrWrWrWKttt',
    '..tKWrWrWrWrWrWrWrWrWrWrWrWrWrKt..',
    '...KrWrWrWrWrWrWrWrWrWrWrWrWrWK...',
    '...KWrbbbWrWrWrnnnWrWrWrWbbbWrK...',
    '...KrWsssrWrWrWsssrWrWrWrsssrWK...',
    '...KWrsksWrWrWrsksWrWrWrWsksWrK...',
    '...KrWsssrWrWrWsssrWrWrWrsssrWK...',
    '...KWrrrrWrWrWrrrrrWrWrWWrrrrWrK...',
    '...KrWrrrrWrWrWrrrrrWrWrWrrrrrWK...',
    '...KWrWrWrWrWrWrWrWrWrWrWrWrWrK...',
    '...KyyyyyyyyyyyyyyyyyyyyyyyyyyyK...',
    '...KyWWyyWWyyWWyyWWyyWWyyWWyyyK...',
    '...KyyyyyyyyyyyyyyyyyyyyyyyyyyyK...',
    '..tKKKKKKKKKKKKKKKKKKKKKKKKKKKKt..',
    'tttKrWrWrWrWrWrWrWrWrWrWrWrWrWKttt',
    'tttKWrWrWrWrWrWrWrWrWrWrWrWrWrKttt',
    '..tKrWrWrWrWrWrWrWrWrWrWrWrWrWKt..',
    '...KKKKKKKKKKKKKKKKKKKKKKKKKKKK...'
  ].map(r => r.length > 34 ? r.slice(0, 34) : r));
  // Hearse: long black with purple curtains and a coffin hatch.
  S.bossHearse = bake([
    '.......KKKKKKKKKK.......',
    '.....KKLLLLLLLLLLKK.....',
    '....KOLBBBBBBBBBBLOK....',
    '....KLBBBBBBBBBBBBLK....',
    '...tKLBBBBBBBBBBBBLKt...',
    '..ttKKKKKKKKKKKKKKKKtt..',
    '..ttKCCCCCCCCCCCCCCKtt..',
    '...tKCCCCCCCCCCCCCCKt...',
    '....KKKKKKKKKKKKKKKK....',
    '....KLppLBBBBBBLppLK....',
    '....KLppLBBBBBBLppLK....',
    '....KLppLBmmmmBLppLK....',
    '....KLppLBmMMmBLppLK....',
    '....KLppLBmMMmBLppLK....',
    '....KLppLBmMMmBLppLK....',
    '....KLppLBmMMmBLppLK....',
    '....KLppLBmMMmBLppLK....',
    '....KLppLBmmmmBLppLK....',
    '....KLppLBBBBBBLppLK....',
    '....KLppLBBBBBBLppLK....',
    '....KLppLBBBBBBLppLK....',
    '....KKKKKKKKKKKKKKKK....',
    '...tKLBBBBBBBBBBBBLKt...',
    '..ttKLBBBBBBBBBBBBLKtt..',
    '..ttKLBBBBwwwwBBBBLKtt..',
    '...tKrBBBBBBBBBBBBrKt...',
    '....KKKKKKKKKKKKKKKK....'
  ]);
  // Headless horseman: black horse galloping, rider with flaming pumpkin.
  const HORSE0 = [
    '........kk......',
    '.......kkkk.....',
    '......kkkkkk....',
    '......kkRkkR....',
    '......kkkkkk....',
    '.......kkkk.....',
    '.....kkkkkkkk...',
    '....kkkkkkkkkk..',
    '...kkkkkkkkkkkk.',
    '..kkkkKKKKKKkkkk',
    '..kkkKKpppKKkkkk',
    '..kkkKKpppKKkkkk',
    '..kkkKKKKKKKkkkk',
    '..kkkkKKKKKkkkkk',
    '...kkkkkkkkkkkk.',
    '....kkkkkkkkkk..',
    '....kk.kk.kk.kk.',
    '...kk..kk..kk.kk',
    '..kk...kk...kk..',
    '.kk....kk....kk.'
  ];
  const HORSE1 = [
    '........kk......',
    '.......kkkk.....',
    '......kkkkkk....',
    '......kkRkkR....',
    '......kkkkkk....',
    '.......kkkk.....',
    '.....kkkkkkkk...',
    '....kkkkkkkkkk..',
    '...kkkkkkkkkkkk.',
    '..kkkkKKKKKKkkkk',
    '..kkkKKpppKKkkkk',
    '..kkkKKpppKKkkkk',
    '..kkkKKKKKKKkkkk',
    '..kkkkKKKKKkkkkk',
    '...kkkkkkkkkkkk.',
    '....kkkkkkkkkk..',
    '....kkkkkkkkkk..',
    '....kk.kk.kk.kk.',
    '....kk.kk.kk.kk.',
    '....kk.kk.kk.kk.'
  ];
  S.bossHorse = [bake(HORSE0), bake(HORSE1)];
  // Warlock limo: stretch, neon magenta trim.
  S.bossLimo = bake([
    '.......KKKKKKKKKK.......',
    '.....KKxxxxxxxxxxKK.....',
    '....KxLBBBBBBBBBBLxK....',
    '....KLBBBBBBBBBBBBLK....',
    '...tKLBBBBBBBBBBBBLKt...',
    '..ttKKKKKKKKKKKKKKKKtt..',
    '..ttKxxxxxxxxxxxxxxKtt..',
    '...tKXXXXXXXXXXXXXXKt...',
    '....KKKKKKKKKKKKKKKK....',
    '....KLBBBBBBBBBBBBLK....',
    '....KLBxxBBBBBBxxBLK....',
    '....KLBBBBBBBBBBBBLK....',
    '....KLBBBBBBBBBBBBLK....',
    '....KLBxxBBBBBBxxBLK....',
    '....KLBBBBBBBBBBBBLK....',
    '....KLBBBBBBBBBBBBLK....',
    '....KLBxxBBBBBBxxBLK....',
    '....KLBBBBBBBBBBBBLK....',
    '....KLBBBBBBBBBBBBLK....',
    '....KLBxxBBBBBBxxBLK....',
    '....KLBBBBBBBBBBBBLK....',
    '....KLBBBBBBBBBBBBLK....',
    '....KLBxxBBBBBBxxBLK....',
    '....KLBBBBBBBBBBBBLK....',
    '....KLBBBBBBBBBBBBLK....',
    '....KLBBBBBBBBBBBBLK....',
    '....KKKKKKKKKKKKKKKK....',
    '....KxxxxxxxxxxxxxxK....',
    '...tKLBBBBBBBBBBBBLKt...',
    '..ttKLBBBBBBBBBBBBLKtt..',
    '..ttKLBBBBwwwwBBBBLKtt..',
    '...tKxBBBBBBBBBBBBxKt...',
    '....KKKKKKKKKKKKKKKK....'
  ]);
  S.bossHit = {
    float: silhouette(S.bossFloat), hearse: silhouette(S.bossHearse),
    horse: silhouette(S.bossHorse[0]), limo: silhouette(S.bossLimo)
  };
  S.bigFrog = bake([
    '..ff..........ff..',
    '.fGGf........fGGf.',
    '.fGkf........fGkf.',
    '.ffffffffffffffff.',
    'ffFFFFFFFFFFFFFFff',
    'ffFFFFFFFFFFFFFFff',
    'ffFFFkkkkkkkkFFFff',
    'fffFFFFFFFFFFFFfff',
    '.ffffffffffffffff.',
    'ff.ffff......ffff.ff',
    'ff..ff........ff..ff'
  ].map(r => r.slice(0, 18)));

  window.PX = { PAL, bake, flipX, silhouette, drawText, textWidth, S };
})();
