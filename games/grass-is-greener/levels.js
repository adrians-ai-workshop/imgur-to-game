/* Level generation + palettes. Every level is a lusher meadow than the last:
   "the grass is greener wherever I am." */
(function () {
  const PALETTES = [
    { sky0: '#cfe9ff', sky1: '#eaf7d8', hill0: '#b7d9a0', hill1: '#8fc47f', grass: '#6fb85f', grass2: '#4f9b43', trunk: '#8a6242', bloom: '#ff9ecb', bloomCore: '#ffe066', name: 'Meadow at Dawn' },
    { sky0: '#ffe1ef', sky1: '#fff5d6', hill0: '#a8d98c', hill1: '#7cc36b', grass: '#5fb44f', grass2: '#3e8a36', trunk: '#7d583c', bloom: '#ff7fb8', bloomCore: '#fff2a8', name: 'Blossom Hollow' },
    { sky0: '#dff3ff', sky1: '#d9ffe9', hill0: '#9edf9a', hill1: '#6cc77e', grass: '#4fb85e', grass2: '#31834b', trunk: '#6f4e34', bloom: '#c78bff', bloomCore: '#ffe066', name: 'Dewfall Terrace' },
    { sky0: '#fff0d4', sky1: '#ffd9ec', hill0: '#bfe08a', hill1: '#8ecb6f', grass: '#57bd52', grass2: '#2f7f3e', trunk: '#835b39', bloom: '#ff7f7f', bloomCore: '#fff0b0', name: 'Antler Ridge' },
    { sky0: '#d8ecff', sky1: '#ffe9f6', hill0: '#8fd9c0', hill1: '#5fc4a8', grass: '#3fb87e', grass2: '#227c5b', trunk: '#6b4b33', bloom: '#ffb0d8', bloomCore: '#fff6cf', name: 'Fernlit Glade' },
    { sky0: '#ffe9f2', sky1: '#dfffe6', hill0: '#a6e3a1', hill1: '#5fd47f', grass: '#3ec96b', grass2: '#1d8a4c', trunk: '#7a5232', bloom: '#ffd45e', bloomCore: '#ff7fb8', name: 'Wherever I Am' },
  ];

  const rnd = window.GGG.mulberry32;
  const clamp = window.GGG.clamp;

  /* Build one level. Layout grows longer & airier as levels advance. */
  function make(index) {
    const seed = 1337 + index * 9173;
    const R = rnd(seed);
    const pal = PALETTES[index % PALETTES.length];
    const height = 1020 + Math.min(index, 4) * 60;
    const groundY = height - 120;
    const segs = 5 + Math.round(index * 0.8);   // islands to cross (short meadows)
    const gapBase = 120 + index * 6;            // grows a little each meadow

    const platforms = [];                        // {x,y,w,h,kind}
    const blossoms = [];                         // {x,y,r,golden}
    const bees = [];                             // {x0,x1,y,speed,dir,t}
    const movers = [];                           // {x,y,w,h,axis,amp,speed,phase}
    const brambles = [];                         // {x,y,w,h}

    let x = 0;
    // opening safe lawn (also the spawn island)
    platforms.push({ x: -260, y: groundY, w: 780, h: height - groundY + 240, kind: 'ground' });
    const spawn = { x: 90, y: groundY - 90 };
    x = 560;

    let floor = groundY;
    let beeSpacing = 0, brambleSpacing = 0;     // keeps hazards from clustering
    // gaps stay well inside one jump (hold-jump reach is ~390px): forgiving hops
    const gapMax = 240 + index * 10;            // cap climbs a touch each meadow
    for (let i = 0; i < segs; i++) {
      const gap = clamp(gapBase + R() * 90 - 36, 96, gapMax);
      x += gap;
      // vertical placement wanders up and down but stays reachable (climbs stay modest)
      floor = clamp(floor + (R() < 0.55 ? -1 : 1) * (48 + R() * 76), height * 0.42, groundY);
      const w = 250 + Math.round(R() * 260);
      const floating = floor < groundY - 20;
      platforms.push({ x: x, y: floor, w: w, h: floating ? 46 : height - floor + 220, kind: floating ? 'isle' : 'ground' });

      // blossoms sprinkled above the island and over the gap (encourages arcs)
      const nb = 2 + Math.floor(R() * 2);
      for (let b = 0; b < nb; b++) {
        const bx = x + 40 + R() * (w - 80);
        const by = floor - (56 + R() * 170);
        blossoms.push({ x: bx, y: clamp(by, height * 0.24, floor - 42), r: 17, golden: R() < 0.08 });
      }
      if (R() < 0.6) {   // a reward line across the previous gap
        const gx = x - gap * 0.5;
        for (let k = 0; k < 3; k++) {
          blossoms.push({ x: gx + (k - 1) * 42, y: floor - 176 - Math.abs(k - 1) * 18, r: 17, golden: false });
        }
      }

      // hazards stay sparse and never back-to-back; the last island is always clear
      const open = i >= segs - 1;
      const beeChance = (index < 1 || open) ? 0 : clamp(0.2 + index * 0.05, 0, 0.34);
      if (!beeSpacing && i > 0 && R() < beeChance) {
        bees.push({ x0: x + 50, x1: x + w - 50, y: floor - 132 - R() * 70, speed: 46 + index * 5 + R() * 20, dir: R() < 0.5 ? 1 : -1, t: R() });
        beeSpacing = 3;                      // skip the next two islands after a hive
      } else if (beeChance > 0) { R(); }     // keep the dice roll per island
      beeSpacing = Math.max(0, beeSpacing - 1);   // never let the counter go negative

      const brambleChance = (index === 0 || open) ? 0 : clamp(0.24 + index * 0.05, 0, 0.4);
      if (!brambleSpacing && R() < brambleChance && w > 320) { // a patch to hop over
        const bw = 80 + R() * 44;
        brambles.push({ x: x + 80 + R() * (w - bw - 160), y: floor - 30, w: bw, h: 30 });
        brambleSpacing = 3;
      } else if (brambleChance > 0 && w <= 320) { R(); }
      brambleSpacing = Math.max(0, brambleSpacing - 1);

      x += w;
    }

    // movers introduced from level 2 on
    if (index >= 1) {
      const nm = Math.min(2 + index, 6);
      for (let m = 0; m < nm; m++) {
        const mx = 900 + R() * Math.max(400, x - 1100);
        movers.push({
          x: mx, y: height * (0.35 + R() * 0.3), w: 158, h: 42,
          axis: R() < 0.55 ? 'h' : 'v', amp: 130 + R() * 160, speed: 0.35 + R() * 0.35, phase: R() * 6.28,
        });
      }
    }

    // closing meadow with the gate
    x += clamp(gapBase + 80, 140, 360);
    platforms.push({ x: x, y: groundY, w: 760, h: height - groundY + 240, kind: 'ground' });
    const gate = { x: x + 380, y: groundY - 190, w: 150, h: 190 };
    for (let b = 0; b < 6; b++) blossoms.push({ x: x + 120 + b * 70, y: groundY - 70, r: 17, golden: false });

    // decorative trees & flowers positions (draw-only)
    const props = [];
    for (let p = 0; p < platforms.length; p++) {
      const pl = platforms[p];
      if (pl.kind !== 'ground') continue;
      const n = Math.floor(pl.w / 260);
      for (let k = 0; k < n; k++) props.push({ x: pl.x + 60 + R() * (pl.w - 120), y: pl.y, t: R() < 0.45 ? 'tree' : 'bush', s: 0.7 + R() * 0.6 });
    }

    return { index, name: pal.name, palette: pal, width: x + 900, height, spawn, gate, platforms, blossoms, bees, movers, brambles, props };
  }

  window.Levels = { count: PALETTES.length, make, palettes: PALETTES };
})();