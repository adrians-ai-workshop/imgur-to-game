/* First Hunting Mission — game logic.
   One level = one room, drawn across the whole browser viewport. */
(function () {
  "use strict";

  const FHM = window.FHM || (window.FHM = {});
  const Art = FHM.Art;
  const Sound = FHM.Sound;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);

  const ui = {
    hud: $("hud"),
    score: $("hud-score"),
    combo: $("hud-combo"),
    mult: $("hud-mult"),
    comboNote: $("hud-combo-note"),
    mission: $("hud-mission"),
    pips: $("hud-pips"),
    lives: $("hud-lives"),
    time: $("hud-time"),
    timerFill: $("hud-timer-fill"),
    attract: $("screen-attract"),
    card: $("screen-card"),
    pause: $("screen-pause"),
    cardEyebrow: $("card-eyebrow"),
    cardTitle: $("card-title"),
    cardSub: $("card-sub"),
    cardStats: $("card-stats"),
    cardFlavor: $("card-flavor"),
    cardPrimary: $("card-primary"),
    cardSecondary: $("card-secondary"),
    cardHint: $("card-hint"),
    touch: $("touch"),
    sound: $("btn-sound"),
    attractFoot: $("attract-foot"),
    live: $("live-region"),
  };

  const view = { w: 1000, h: 560, groundY: 392, scale: 1 };
  const GRAV = 1750;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = () =>
    window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

  const unit = () => view.w / 1000;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function roundRect(target, x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    target.beginPath();
    target.moveTo(x + r, y);
    target.lineTo(x + w - r, y);
    target.quadraticCurveTo(x + w, y, x + w, y + r);
    target.lineTo(x + w, y + h - r);
    target.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    target.lineTo(x + r, y + h);
    target.quadraticCurveTo(x, y + h, x, y + h - r);
    target.lineTo(x, y + r);
    target.quadraticCurveTo(x, y, x + r, y);
    target.closePath();
  }

  /* --------------------------------------------------------------- data --- */

  const PREY = {
    bunny: {
      h: 26,
      wander: 44,
      flee: 168,
      aware: 120,
      pts: 100,
      lines: ["oh no", "a monster", "i am TERRIFIED", "help", "so scary"],
    },
    sock: {
      h: 24,
      wander: 34,
      flee: 140,
      aware: 112,
      pts: 120,
      lines: ["the horror", "please, no", "very fearsome", "mercy"],
    },
    moth: {
      h: 30,
      wander: 62,
      flee: 200,
      aware: 150,
      pts: 150,
      flying: true,
      lines: ["ahhh", "i'm flying off", "not the cat", "eep"],
    },
    beetle: {
      h: 18,
      wander: 86,
      flee: 250,
      aware: 170,
      pts: 140,
      lines: ["yikes", "run run run", "not today", "eek"],
    },
    yarn: {
      h: 26,
      wander: 30,
      flee: 120,
      aware: 104,
      pts: 110,
      lines: ["unravelled", "oh dear", "tangled fate", "eep"],
    },
  };

  /* -------------------------------------------------------------- levels --- */

  const LEVELS = [
    {
      key: "duvet",
      name: "THE DUVET SEA",
      where: "Mission 01 · the big bed",
      style: "bed",
      time: 78,
      line: "Three intruders on the duvet. One tail, rigid with purpose.",
      tip: "A / D to sneak. Hold SPACE to wind up. Release to pounce.",
      hint: "A / D sneak  ·  hold SPACE to wind up  ·  release to pounce",
      platforms: [
        { nx: 0.34, top: -66, w: 0.24, kind: "pillow" },
        { nx: 0.76, top: -58, w: 0.2, kind: "fold" },
      ],
      prey: [
        { type: "bunny", nx: 0.14 },
        { type: "sock", nx: 0.52 },
        { type: "bunny", nx: 0.92 },
      ],
      hazards: [],
    },
    {
      key: "hall",
      name: "THE LANDING",
      where: "Mission 02 · the long hallway",
      style: "hall",
      time: 74,
      line: "An enormous hallway. Something enormous is wearing slippers in it.",
      tip: "Shift trots — fast, but every prey in earshot will bolt.",
      hint: "SHIFT trots. It is loud. They will bolt.",
      platforms: [
        { nx: 0.7, top: -58, w: 0.19, kind: "stair" },
        { nx: 0.88, top: -116, w: 0.13, kind: "stair" },
        { nx: 0.28, top: -52, w: 0.12, kind: "box" },
      ],
      prey: [
        { type: "bunny", nx: 0.12 },
        { type: "beetle", nx: 0.4 },
        { type: "sock", nx: 0.56 },
        { type: "moth", nx: 0.8, hover: 70 },
      ],
      hazards: [{ dir: 1, speed: 210, period: 9.5, warn: 1.1, timer: 4 }],
    },
    {
      key: "sofa",
      name: "THE SOFA JUNGLE",
      where: "Mission 03 · cushions like cliffs",
      style: "sofa",
      time: 76,
      line: "Cushions like cliffs. Crumbs like boulders. The television is very loud.",
      tip: "Pounce onto the furniture to reach the high ground.",
      hint: "Pounce onto the furniture for the high ground.",
      platforms: [
        { nx: 0.26, top: -70, w: 0.2, kind: "cushion" },
        { nx: 0.52, top: -112, w: 0.16, kind: "cushion" },
        { nx: 0.82, top: -62, w: 0.18, kind: "cushion" },
      ],
      prey: [
        { type: "bunny", nx: 0.1 },
        { type: "sock", nx: 0.38 },
        { type: "moth", nx: 0.52, plat: 1, hover: 46 },
        { type: "beetle", nx: 0.82, plat: 2 },
        { type: "yarn", nx: 0.95 },
      ],
      hazards: [{ dir: -1, speed: 235, period: 8.4, warn: 1.1, timer: 3 }],
    },
    {
      key: "kitchen",
      name: "THE TILE KITCHEN",
      where: "Mission 04 · cold paws, loud echoes",
      style: "kitchen",
      time: 74,
      line: "Cold tiles, a humming fridge, and two enormous feet with somewhere to be.",
      tip: "Land quietly: a heavy landing sends everything running.",
      hint: "Land quietly. Heavy landings send everything running.",
      platforms: [
        { nx: 0.18, top: -64, w: 0.11, kind: "stool" },
        { nx: 0.48, top: -100, w: 0.1, kind: "books" },
        { nx: 0.8, top: -68, w: 0.12, kind: "stool" },
      ],
      prey: [
        { type: "beetle", nx: 0.1 },
        { type: "bunny", nx: 0.3 },
        { type: "moth", nx: 0.46, hover: 72 },
        { type: "sock", nx: 0.63 },
        { type: "beetle", nx: 0.9 },
      ],
      hazards: [
        { dir: 1, speed: 240, period: 8.2, warn: 1, timer: 2.4 },
        { dir: -1, speed: 200, period: 10.5, warn: 1, timer: 6.5 },
      ],
    },
    {
      key: "vacuum",
      name: "THE GREAT VACUUM",
      where: "Mission 05 · it has no soul",
      style: "room",
      time: 96,
      line: "The beast is awake, and it is louder than she is. It must be scared anyway.",
      tip: "Pounce its glowing button four times. Mind the suction.",
      hint: "Pounce the glowing button. Four times. Mind the suction.",
      boss: true,
      platforms: [{ nx: 0.14, top: -60, w: 0.18, kind: "cushion" }],
      prey: [
        { type: "bunny", nx: 0.36 },
        { type: "moth", nx: 0.6, hover: 80 },
        { type: "sock", nx: 0.9 },
      ],
      hazards: [],
    },
  ];

  /* -------------------------------------------------------------- state --- */

  const game = {
    mode: "attract",
    demo: true,
    levelIndex: 0,
    level: LEVELS[0],
    platforms: [],
    prey: [],
    hazards: [],
    vacuum: null,
    kitten: null,
    particles: [],
    floaters: [],
    bubbles: [],
    rings: [],
    score: 0,
    lives: 9,
    combo: 0,
    bestCombo: 0,
    time: 0,
    timeMax: 1,
    now: 0,
    shake: 0,
    hitstop: 0,
    flash: 0,
    timesUp: false,
    endTimer: 0,
    demoCooldown: 0,
    levelCaught: 0,
    levelBestCombo: 0,
    hintTimer: 0,
    best: 0,
  };

  try {
    game.best = Number(window.localStorage.getItem("fhm-best")) || 0;
  } catch {
    game.best = 0;
  }

  function saveBest() {
    if (game.score > game.best) {
      game.best = game.score;
      try {
        window.localStorage.setItem("fhm-best", String(game.best));
      } catch {
        /* private mode: the hunt goes on */
      }
    }
  }

  /* ------------------------------------------------------ view / layout --- */

  function resize() {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    const scale = Math.min(cssW / 960, cssH / 560);
    const w = cssW / scale;
    const h = cssH / scale;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    view.prevW = view.w;
    view.w = w;
    view.h = h;
    view.scale = scale;
    view.groundY = Math.round(h * 0.7);

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    if (game.level) {
      const ratio = w / view.prevW;
      rebuildPlatforms();
      game.prey.forEach((p) => {
        p.x = clamp((p.x * ratio) || p.x, 26, w - 26);
        p.baseY = p.plat == null ? view.groundY : game.platforms[p.plat].top;
        p.bounds = preyBounds(p);
      });
      if (game.kitten) {
        const k = game.kitten;
        k.x = clamp(k.x * ratio, 30, w - 30);
        const ground = game.platforms[game.platforms.length - 1];
        k.support = ground;
        k.y = ground.top;
        k.vy = 0;
        k.onGround = true;
        k.air = false;
      }
      if (game.vacuum) {
        game.vacuum.x = clamp(game.vacuum.x * ratio, 80, w - 80);
        game.vacuum.y = view.groundY;
        game.vacuum.top = view.groundY - 120;
      }
      game.hazards.forEach((h) => {
        h.y = view.groundY;
      });
    }
  }

  function rebuildPlatforms() {
    game.platforms = game.level.platforms.map((def) => {
      const w = def.w * view.w;
      const cx = def.nx * view.w;
      return {
        left: cx - w / 2,
        right: cx + w / 2,
        top: view.groundY + def.top,
        base: view.groundY,
        kind: def.kind,
      };
    });
    game.platforms.push({
      left: -400,
      right: view.w + 400,
      top: view.groundY,
      base: view.h,
      kind: "ground",
    });
  }

  function preyBounds(p) {
    const pad = 16;
    if (p.plat == null) return { min: 42, max: view.w - 42 };
    const plat = game.platforms[p.plat];
    return { min: plat.left + pad, max: plat.right - pad };
  }

  function makeKitten(x) {
    return {
      x,
      y: view.groundY,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: true,
      air: false,
      support: null,
      charging: false,
      charge: 0,
      crouch: 0,
      wiggle: 0,
      sx: 1,
      sy: 1,
      moving: false,
      trot: false,
      recover: 0,
      invuln: 0,
      blink: 0,
      blinkTimer: rand(1.4, 3.6),
      shadowY: view.groundY,
      pounceWas: false,
      didCatch: false,
    };
  }

  function layoutLevel(index, demo) {
    const def = LEVELS[index];
    game.levelIndex = index;
    game.level = def;
    game.demo = Boolean(demo);
    rebuildPlatforms();

    game.prey = def.prey.map((item, i) => {
      const stats = PREY[item.type];
      const plat = item.plat == null ? null : item.plat;
      const baseY = plat == null ? view.groundY : game.platforms[plat].top;
      const p = {
        type: item.type,
        stats,
        seed: i * 0.37 + 0.11,
        plat,
        x: item.nx * view.w,
        y: baseY,
        baseY,
        hover: item.hover || 0,
        hoverBob: 0,
        dir: Math.random() < 0.5 ? -1 : 1,
        vx: 0,
        h: stats.h,
        state: "wander",
        timer: rand(0.6, 2),
        phase: rand(0, 6),
        caught: false,
        escaped: false,
        alpha: 1,
        tilt: 0,
        bounds: null,
      };
      p.bounds = preyBounds(p);
      return p;
    });

    game.hazards = (def.hazards || []).map((h) => ({
      ...h,
      dir: h.dir,
      x: h.dir > 0 ? -160 : view.w + 160,
      y: view.groundY,
      active: false,
      timer: h.timer,
      speed: h.speed * (view.w / 1000),
      warned: false,
    }));

    game.vacuum = def.boss
      ? {
          x: view.w * 0.74,
          y: view.groundY,
          top: view.groundY - 120,
          dir: -1,
          hp: 4,
          maxHp: 4,
          state: "patrol",
          timer: 3.4,
        }
      : null;

    game.kitten = makeKitten(view.w * (demo ? 0.62 : 0.12));
    game.kitten.support = game.platforms[game.platforms.length - 1];
    input.left = false;
    input.right = false;
    input.trot = false;
    game.particles.length = 0;
    game.floaters.length = 0;
    game.bubbles.length = 0;
    game.rings.length = 0;
    game.combo = 0;
    game.levelCaught = 0;
    game.levelBestCombo = 0;
    game.timesUp = false;
    game.endTimer = 0;
    game.demoCooldown = 0;
    game.time = def.time;
    game.timeMax = def.time;
    game.hintTimer = 5.5;
    game.shake = 0;
    game.flash = 0;
    buildPips();
    updateHud();
  }

  function buildPips() {
    ui.pips.textContent = "";
    game.prey.forEach(() => {
      const dot = document.createElement("span");
      ui.pips.append(dot);
    });
    game.prey.forEach((p, i) => {
      p.pip = ui.pips.children[i];
    });
  }


  /* ----------------------------------------------------------------- ui --- */

  let cardAction = null;
  let cardLock = 0;

  const fmt = (n) => n.toLocaleString("en-US");

  function buildLives() {
    ui.lives.textContent = "";
    for (let i = 0; i < 9; i += 1) ui.lives.append(document.createElement("i"));
    [...ui.lives.children].forEach((el, i) => {
      el.classList.toggle("is-live", i < game.lives);
    });
  }

  function updateHud() {
    ui.score.textContent = fmt(game.score);
    const mult = Math.min(Math.max(game.combo, 1), 9);
    ui.mult.textContent = `×${mult}`;
    ui.combo.classList.toggle("is-hot", game.combo >= 3);
    ui.comboNote.textContent =
      game.combo >= 6
        ? "the room is buying it"
        : game.combo >= 3
          ? "they're pretending"
          : game.combo >= 1
            ? "politely terrified"
            : "unnoticed";
    ui.mission.textContent =
      `MISSION ${String(game.levelIndex + 1).padStart(2, "0")} · ${game.level.name}` +
      (game.vacuum
        ? `  ·  BEAST ${Math.max(0, game.vacuum.maxHp - game.vacuum.hp)}/${game.vacuum.maxHp}`
        : "");
    ui.time.textContent = String(Math.max(0, Math.ceil(game.time)));
    ui.time.classList.toggle("is-low", game.time <= 10 && game.mode === "play");
    ui.timerFill.style.transform = `scaleX(${clamp(game.time / game.timeMax, 0, 1)})`;
    game.prey.forEach((p) => {
      if (p.pip) p.pip.classList.toggle("is-caught", p.caught || p.escaped);
    });
  }

  function showCard(opts) {
    game.mode = "card";
    ui.card.hidden = false;
    ui.attract.hidden = true;
    ui.pause.hidden = true;
    ui.hud.hidden = true;
    ui.touch.hidden = true;

    ui.cardEyebrow.textContent = opts.eyebrow || "";
    ui.cardTitle.textContent = opts.title || "";
    ui.cardSub.textContent = opts.sub || "";
    ui.cardFlavor.textContent = opts.flavor || "";
    ui.cardStats.textContent = "";
    (opts.stats || []).forEach(([label, value, note]) => {
      const wrap = document.createElement("div");
      wrap.className = "stat";
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      if (note) {
        const small = document.createElement("small");
        small.textContent = note;
        dd.append(small);
      }
      wrap.append(dt, dd);
      ui.cardStats.append(wrap);
    });

    cardAction = opts.onPrimary || null;
    ui.cardPrimary.textContent = opts.primary || "Continue";
    ui.cardPrimary.onclick = () => {
      Sound.unlock();
      Sound.ui();
      const action = cardAction;
      if (action) action();
    };

    if (opts.secondary) {
      ui.cardSecondary.hidden = false;
      ui.cardSecondary.textContent = opts.secondary;
      ui.cardSecondary.onclick = () => {
        Sound.ui();
        (opts.onSecondary || startAttract)();
      };
    } else {
      ui.cardSecondary.hidden = true;
    }

    ui.cardHint.textContent = opts.hint || "Space / Enter to continue";
    cardLock = performance.now() + 380;
    window.setTimeout(() => ui.cardPrimary.focus({ preventScroll: true }), 40);
  }

  function advanceCard() {
    if (performance.now() < cardLock || game.mode !== "card") return;
    if (document.activeElement && document.activeElement.tagName === "BUTTON") return;
    if (cardAction) cardAction();
  }

  function updateAttractFoot() {
    ui.attractFoot.textContent = game.best
      ? `Best scare points: ${fmt(game.best)}`
      : "Best scare points: not yet recorded";
  }

  /* --------------------------------------------------------------- flow --- */

  function startAttract() {
    Sound.vacuumStop();
    Sound.musicStart();
    Sound.musicLevel(0.22);
    game.demo = true;
    game.score = 0;
    game.lives = 9;
    game.bestCombo = 0;
    layoutLevel(0, true);
    game.mode = "attract";
    ui.attract.hidden = false;
    ui.card.hidden = true;
    ui.pause.hidden = true;
    ui.hud.hidden = true;
    ui.touch.hidden = true;
    updateAttractFoot();
  }

  function startRun() {
    Sound.unlock();
    Sound.ui();
    game.demo = false;
    game.score = 0;
    game.lives = 9;
    game.bestCombo = 0;
    ui.attract.hidden = true;
    showBriefing(0);
  }

  function showBriefing(index) {
    Sound.vacuumStop();
    game.demo = false;
    layoutLevel(index, false);
    const def = LEVELS[index];
    const stats = [["PREY", def.boss ? "3 + BEAST" : String(def.prey.length), "to terrify"]];
    stats.push(["PATIENCE", `${def.time}s`, "of human attention"]);
    stats.push(["LIVES", String(game.lives), "of nine"]);
    stats.push(["SCARE POINTS", fmt(game.score)]);
    showCard({
      eyebrow: def.where.toUpperCase(),
      title: def.name,
      sub: def.line,
      stats,
      flavor: def.tip,
      primary: index === 0 ? "Start the hunt" : "Enter the room",
      onPrimary: () => beginLevel(index),
    });
  }

  function beginLevel(index) {
    layoutLevel(index, false);
    game.mode = "play";
    ui.card.hidden = true;
    ui.attract.hidden = true;
    ui.pause.hidden = true;
    ui.hud.hidden = false;
    ui.touch.hidden = !isTouch();
    buildLives();
    updateHud();
    Sound.unlock();
    Sound.musicStart();
    Sound.musicLevel(0.16);
    if (game.vacuum) Sound.vacuumStart();
    ui.live.textContent = `Mission ${index + 1}. ${game.level.name}.`;
  }

  function togglePause(forceResume) {
    if (game.mode === "play") {
      game.mode = "paused";
      ui.pause.hidden = false;
      ui.touch.hidden = true;
      Sound.musicLevel(0.07);
      if (game.vacuum) Sound.vacuumSet(0, false);
      window.setTimeout(() => $("btn-resume").focus({ preventScroll: true }), 30);
    } else if (game.mode === "paused" && !forceResume) {
      game.mode = "play";
      ui.pause.hidden = true;
      ui.touch.hidden = !isTouch();
      Sound.musicLevel(0.16);
      if (game.vacuum) Sound.vacuumSet(game.vacuum.state === "charge" ? 1 : 0.4, true);
    }
  }

  function endLevel(timedOut) {
    if (game.mode !== "play" && !(game.demo && (game.mode === "attract" || game.mode === "levelend"))) return;
    game.mode = "levelend";
    game.timesUp = timedOut;
    game.endTimer = timedOut ? 1.5 : 0.8;
    ui.touch.hidden = true;
    if (game.vacuum) Sound.vacuumStop();
    if (!game.demo) {
      saveBest();
      if (timedOut) Sound.sadTrombone();
      else Sound.fanfare();
    }
  }


  function showResults(timedOut) {
    const def = game.level;
    const total = game.prey.length;
    const perfect = game.levelCaught === total;
    const convincing = clamp(
      Math.round(34 + game.levelCaught * 9 + game.levelBestCombo * 7 + game.lives * 2),
      0,
      100
    );
    let flavor;
    if (timedOut) {
      flavor = "The human got bored and wandered off. Several intruders remain, thoroughly unimpressed.";
    } else if (perfect && convincing >= 95) {
      flavor = `Fear report: ${convincing}% convincing. The whole household is shaking. A little. Sort of.`;
    } else if (perfect) {
      flavor = `Fear report: ${convincing}% convincing. Excellent tail work. Somebody definitely pretended to scream.`;
    } else {
      flavor = `Fear report: ${convincing}% convincing. The survivors have agreed not to mention it.`;
    }

    const stats = [
      ["CAUGHT", String(game.levelCaught), `of ${total}`],
      ["BEST CHAIN", `×${Math.min(Math.max(game.levelBestCombo, 1), 9)}`],
      ["FEAR", `${convincing}%`, "convincing"],
      ["SCARE POINTS", fmt(game.score)],
    ];

    const isLast = game.levelIndex === LEVELS.length - 1;
    showCard({
      eyebrow: timedOut ? "PATIENCE EXPIRED" : "ROOM CLEARED",
      title: timedOut ? "THEY LOST INTEREST." : def.name,
      sub: timedOut
        ? "She will simply have to be scarier on the next pass."
        : "They were only pretending.",
      stats,
      flavor,
      primary: isLast ? "The final report" : "Next room",
      onPrimary: () => (isLast ? showFinalReport() : showBriefing(game.levelIndex + 1)),
      hint: "Space / Enter to continue",
    });
  }

  function rankFor(score) {
    if (score >= 9000) return { grade: "S", text: "household terror" };
    if (score >= 6500) return { grade: "A", text: "credibly feral" };
    if (score >= 4000) return { grade: "B", text: "promising predator" };
    if (score >= 2000) return { grade: "C", text: "suspiciously cute" };
    return { grade: "D", text: "adorable, honestly" };
  }

  function showFinalReport() {
    saveBest();
    const rank = rankFor(game.score);
    showCard({
      eyebrow: "FIRST MISSION COMPLETE",
      title: "SHE WAS TERRIFYING.",
      sub: "They were pretending. Every single one of them.",
      stats: [
        ["SCARE POINTS", fmt(game.score), `best ${fmt(game.best)}`],
        ["RANK", rank.grade, rank.text],
        ["LIVES LEFT", String(game.lives), "of nine"],
        ["LONGEST CHAIN", `×${Math.min(Math.max(game.bestCombo, 1), 9)}`],
      ],
      flavor:
        "She padded back to the duvet, tail up, absolutely certain she had done it. Tomorrow: the kitchen bin.",
      primary: "Hunt again",
      onPrimary: startRun,
      secondary: "Attract screen",
      onSecondary: startAttract,
      hint: "Space / Enter to hunt again",
    });
    Sound.fanfare();
  }

  function gameOver() {
    if (game.mode === "card") return;
    game.mode = "card";
    if (game.vacuum) Sound.vacuumStop();
    saveBest();
    Sound.sadTrombone();
    ui.touch.hidden = true;
    ui.hud.hidden = true;
    showCard({
      eyebrow: "MISSION OVER",
      title: "SHE FELL ASLEEP.",
      sub: "Nine lives, all of them spent on drama.",
      stats: [
        ["SCARE POINTS", fmt(game.score), `best ${fmt(game.best)}`],
        ["ROOM", String(game.levelIndex + 1), game.level.name.toLowerCase()],
        ["CAUGHT", String(game.levelCaught), `of ${game.prey.length}`],
      ],
      flavor: "By the time she woke up, the slippers had gone and the whole thing felt like a dream.",
      primary: "Try the room again",
      onPrimary: () => {
        game.lives = 9;
        game.bestCombo = 0;
        showBriefing(game.levelIndex);
      },
      secondary: "Attract screen",
      onSecondary: startAttract,
      hint: "Space / Enter to try again",
    });
  }


  /* ------------------------------------------------------------- input --- */

  const input = { left: false, right: false, trot: false };
  const demo = { hold: 0, targetX: 0 };

  function onPounceDown() {
    if (game.mode !== "play" && game.mode !== "attract") return;
    const k = game.kitten;
    if (!k || k.air || !k.onGround || k.charging || k.recover > 0) return;
    k.charging = true;
    k.charge = 0;
  }

  function onPounceUp() {
    if (game.mode !== "play" && game.mode !== "attract") return;
    const k = game.kitten;
    if (!k || !k.charging) return;
    launchPounce(k);
  }

  function pounceVelocity(power, facing) {
    const u = unit();
    const p = Math.max(0.14, Math.min(1, power || 0));
    return { vx: (facing || 1) * (175 + 295 * p) * u, vy: -(470 + 200 * p) * u };
  }

  function pounceDistance(power) {
    const v = pounceVelocity(power, 1);
    return Math.abs(v.vx) * ((2 * Math.abs(v.vy)) / (GRAV * unit()));
  }

  function launchPounce(k) {
    const power = Math.max(0.14, k.charge);
    const v = pounceVelocity(power, k.facing);
    k.charging = false;
    k.charge = 0;
    k.onGround = false;
    k.air = true;
    k.support = null;
    k.vx = v.vx;
    k.vy = v.vy;
    k.sx = 1.14;
    k.sy = 0.9;
    k.pounceWas = true;
    k.didCatch = false;
    Sound.pounce(power);
    puff(k.x, k.y, 5);
    addShake(2 + power * 3);
  }

  /* ----------------------------------------------------------- surfaces --- */

  function surfaceBelow(x, y) {
    let best = view.groundY;
    for (const s of game.platforms) {
      if (s.kind === "ground") continue;
      if (x >= s.left && x <= s.right && s.top >= y - 4 && s.top < best) best = s.top;
    }
    return best;
  }

  function landOn(surface) {
    const k = game.kitten;
    const u = unit();
    const impact = clamp(Math.abs(k.vy) / (900 * u), 0, 1);
    k.y = surface.top;
    k.vy = 0;
    k.onGround = true;
    k.air = false;
    k.support = surface;
    k.sx = 1.16;
    k.sy = 0.84;
    Sound.land(impact);
    puff(k.x, surface.top, 4 + Math.round(impact * 5));
    addShake(1.5 + impact * 3);
    if (k.pounceWas) {
      const caught = tryCatch(k.x, surface.top, 62 * u);
      if (!caught) missPounce();
      k.pounceWas = false;
    }
    emitNoise(k.x, surface.top, (110 + impact * 210) * u);
  }

  function preyTarget(p) {
    return p.y - p.h * 0.4;
  }

  function tryCatch(x, feetY, radius) {
    let best = null;
    let bestD = Infinity;
    for (const p of game.prey) {
      if (p.caught || p.escaped) continue;
      const dy = Math.abs(preyTarget(p) - (feetY - 12));
      const reach = p.stats.flying ? 88 : 46;
      const d = Math.abs(p.x - x);
      if (dy < reach && d < radius && d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (best) catchPrey(best);
    return Boolean(best);
  }

  function emitNoise(x, y, radius) {
    game.rings.push({ x, y, r: 8, max: radius, life: 0.5, age: 0 });
    for (const p of game.prey) {
      if (p.caught || p.escaped) continue;
      if (Math.abs(p.x - x) < radius) fleeFrom(p, x);
    }
  }

  function fleeFrom(p, sourceX) {
    const wasFleeing = p.state === "flee";
    p.state = "flee";
    p.timer = rand(1.7, 2.8);
    p.dir = p.x <= sourceX ? -1 : 1;
    if (p.x <= p.bounds.min + 3) p.dir = 1;
    if (p.x >= p.bounds.max - 3) p.dir = -1;
    if (!wasFleeing && !game.demo) Sound.panic();
  }


  /* --------------------------------------------------------------- play --- */

  function updatePlay(dt) {
    if (game.demo) runDemo(dt);
    game.demoCooldown = Math.max(0, game.demoCooldown - dt);
    game.hintTimer = Math.max(0, game.hintTimer - dt);

    if (game.time > 0) {
      game.time = Math.max(0, game.time - dt);
      if (game.time === 0 && !game.timesUp) {
        game.timesUp = true;
        endLevel(true);
        return;
      }
    }

    updateKitten(dt);
    updatePrey(dt);
    updateHazards(dt);
    updateVacuum(dt);
    updateHud();
  }

  function updateKitten(dt) {
    const k = game.kitten;
    const u = unit();

    k.invuln = Math.max(0, k.invuln - dt);
    k.recover = Math.max(0, k.recover - dt);
    k.blinkTimer -= dt;
    if (k.blinkTimer <= 0) {
      k.blink = 0.14;
      k.blinkTimer = rand(2, 5);
    }
    k.blink = Math.max(0, k.blink - dt);

    if (k.charging) {
      k.charge = Math.min(1, k.charge + dt / 0.7);
      k.crouch = Math.min(1, k.crouch + dt * 7);
      k.wiggle = Math.sin(game.now * 46) * (1.4 + k.charge * 2.4) * (reduceMotion ? 0.2 : 1);
      if (input.left) k.facing = -1;
      if (input.right) k.facing = 1;
      k.vx = 0;
      k.moving = false;
    } else {
      k.crouch = Math.max(0, k.crouch - dt * 5);
      k.wiggle *= 0.86;
    }

    if (k.air) {
      const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (dir) {
        k.vx = clamp(k.vx + dir * 620 * u * dt, -700 * u, 700 * u);
        k.facing = dir;
      }
    } else if (!k.charging) {
      const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      k.trot = Boolean(input.trot) && dir !== 0 && k.recover <= 0;
      k.moving = dir !== 0 && k.recover <= 0;
      k.noiseTimer = (k.noiseTimer || 0) - dt;
      if (k.moving) {
        k.facing = dir;
        k.vx = dir * (k.trot ? 250 : 124) * u;
      } else {
        k.vx = 0;
      }
      if (k.trot && k.noiseTimer <= 0) {
        k.noiseTimer = 0.34;
        emitNoise(k.x, k.y, 300 * u);
      }
    }

    const prevY = k.y;
    if (!k.onGround) {
      k.vy += GRAV * u * dt;
      k.air = true;
    }
    k.x = clamp(k.x + k.vx * dt, 26, view.w - 26);
    k.y += k.vy * dt;

    if (!k.onGround && k.vy >= 0) {
      let best = null;
      for (const s of game.platforms) {
        if (k.x < s.left - 8 || k.x > s.right + 8) continue;
        if (prevY <= s.top + 0.01 && k.y >= s.top) {
          if (!best || s.top < best.top) best = s;
        }
      }
      if (best) landOn(best);
    }

    if (k.onGround && k.support) {
      const s = k.support;
      if (k.x < s.left - 14 || k.x > s.right + 14) {
        k.onGround = false;
        k.air = true;
        k.support = null;
        k.vy = 0;
      } else {
        k.y = s.top;
      }
    }

    if (k.air) {
      for (const p of game.prey) {
        if (p.caught || p.escaped) continue;
        if (Math.abs(k.x - p.x) < 30 * u && Math.abs(k.y - 20 - preyTarget(p)) < 40 * u) {
          catchPrey(p);
          break;
        }
      }
    }

    k.sx += (1 - k.sx) * Math.min(1, dt * 11);
    k.sy += (1 - k.sy) * Math.min(1, dt * 11);
    k.shadowY = k.onGround && k.support ? k.support.top : surfaceBelow(k.x, k.y);
  }


  function updatePrey(dt) {
    const u = unit();
    const k = game.kitten;

    game.prey.forEach((p) => {
      const s = p.stats;

      if (p.caught) {
        p.vx *= 0.88;
        p.x += p.vx * dt;
        p.alpha = Math.max(0, p.alpha - dt * 0.22);
        return;
      }

      if (p.escaped) {
        p.x += p.dir * 260 * u * dt;
        p.alpha = Math.max(0, p.alpha - dt * 0.7);
        return;
      }

      const supportY = p.plat == null ? view.groundY : game.platforms[p.plat].top;
      p.baseY = supportY;
      if (s.flying) {
        p.hoverBob = Math.sin(game.now * 3.2 + p.phase) * 5;
        p.y = supportY - p.hover - p.hoverBob;
      } else {
        p.y = supportY;
      }

      /* she is close enough to be noticed even while standing still */
      const near = Math.abs(k.x - p.x) < 54 * u && Math.abs(k.y - supportY) < 44;
      if (near && !k.air && !k.charging) fleeFrom(p, k.x);

      if (p.state === "flee") {
        p.timer -= dt;
        p.vx = p.dir * s.flee * u * (s.flying ? 1.15 : 1);
        if (p.timer <= 0) {
          p.state = "wander";
          p.timer = rand(0.9, 2.2);
        }
      } else {
        p.timer -= dt;
        if (p.timer <= 0) {
          if (Math.random() < 0.34) {
            p.state = "idle";
            p.timer = rand(0.5, 1.4);
          } else {
            p.state = "wander";
            p.dir = Math.random() < 0.5 ? -1 : 1;
            p.timer = rand(0.8, 2.2);
          }
        }
        p.vx = p.state === "idle" ? 0 : p.dir * s.wander * u;
      }

      p.x += p.vx * dt;
      if (p.x < p.bounds.min) {
        p.x = p.bounds.min;
        p.dir = 1;
      }
      if (p.x > p.bounds.max) {
        p.x = p.bounds.max;
        p.dir = -1;
      }
      if (Math.abs(p.vx) > 1) p.dir = Math.sign(p.vx);
    });
  }

  function updateHazards(dt) {
    const u = unit();
    const k = game.kitten;

    game.hazards.forEach((h) => {
      h.timer -= dt;

      if (!h.active && h.timer < h.warn && !h.warned) {
        h.warned = true;
        Sound.rumble();
        addShake(1.6);
      }

      if (!h.active && h.timer <= 0) {
        h.active = true;
        h.x = h.dir > 0 ? -170 : view.w + 170;
        h.timer = h.period;
        h.warned = false;
        Sound.thump();
      }

      if (!h.active) return;

      h.x += h.dir * h.speed * dt;
      if (Math.random() < dt * 14) puff(h.x - h.dir * 46, view.groundY, 1);
      if (h.x < -520 || h.x > view.w + 520) {
        h.active = false;
        h.timer = h.period * 0.85;
        return;
      }

      if (!k.air && Math.abs(k.x - h.x) < 78 * u && Math.abs(k.y - view.groundY) < 36) hurt();
    });
  }

  function updateVacuum(dt) {
    const v = game.vacuum;
    if (!v) return;
    const u = unit();
    const k = game.kitten;
    v.y = view.groundY;
    v.top = view.groundY - 120;

    if (v.state === "stun") {
      v.timer -= dt;
      Sound.vacuumSet(0.04, false);
      if (v.timer <= 0) {
        v.state = "patrol";
        v.timer = 2.6;
      }
    } else if (v.state === "patrol") {
      v.x = clamp(v.x + v.dir * 78 * u * dt, 110, view.w - 110);
      if (v.x <= 110) v.dir = 1;
      if (v.x >= view.w - 110) v.dir = -1;
      v.timer -= dt;
      Sound.vacuumSet(0.24, false);
      if (v.timer <= 0) {
        v.state = "windup";
        v.timer = 0.95;
        v.dir = k.x >= v.x ? 1 : -1;
        Sound.rumble();
      }
    } else if (v.state === "windup") {
      v.timer -= dt;
      Sound.vacuumSet(1, true);
      addShake(0.7);
      if (v.timer <= 0) {
        v.state = "charge";
        v.timer = 1;
        v.dir = k.x >= v.x ? 1 : -1;
        Sound.thump();
      }
    } else if (v.state === "charge") {
      v.x += v.dir * 560 * u * dt;
      v.timer -= dt;
      Sound.vacuumSet(1, true);
      if (v.timer <= 0 || v.x < 100 || v.x > view.w - 100) {
        v.x = clamp(v.x, 100, view.w - 100);
        v.state = "recover";
        v.timer = 0.85;
      }
    } else if (v.state === "recover") {
      v.timer -= dt;
      Sound.vacuumSet(0.3, false);
      if (v.timer <= 0) {
        v.state = "patrol";
        v.timer = rand(2.5, 3.6);
      }
    }

    if (v.state !== "stun" && k.onGround) {
      const dx = v.x - k.x;
      const dist = Math.abs(dx);
      if (dist < 420 * u) {
        const strength = (v.state === "charge" ? 270 : 80) * (1 - dist / (430 * u));
        k.x = clamp(k.x + Math.sign(dx) * strength * dt, 26, view.w - 26);
      }
    }

    if (v.state !== "stun" && !k.air && Math.abs(k.x - v.x) < 60 * u) hurt();

    if (k.air && k.vy > 0 && Math.abs(k.x - v.x) < 54 * u && k.y >= v.top - 10 && k.y <= v.top + 40) {
      hitBoss();
    }
  }


  /* -------------------------------------------------------------- events --- */

  function catchPrey(p) {
    if (p.caught) return false;
    const k = game.kitten;
    const u = unit();
    const wasFleeing = p.state === "flee";
    const clean = Math.abs(k.x - p.x) < 32 * u;

    p.caught = true;
    p.state = "caught";
    p.vx = -k.facing * 70 * u;
    p.tilt = rand(-1, 1);
    p.alpha = 1;
    k.didCatch = true;

    game.combo += 1;
    game.bestCombo = Math.max(game.bestCombo, game.combo);
    game.levelBestCombo = Math.max(game.levelBestCombo || 0, game.combo);
    game.levelCaught = (game.levelCaught || 0) + 1;

    const mult = Math.min(game.combo, 9);
    let pts = p.stats.pts * mult;
    if (clean) pts = Math.round(pts * 1.25);
    if (!wasFleeing) pts = Math.round(pts * 1.5);
    game.score += pts;

    const tag = !wasFleeing ? (clean ? "SILENT PAW" : "TAKEN BY SURPRISE") : "CAUGHT";
    addFloater(p.x, p.y - p.h - 40, `+${fmt(pts)}`, "#ffcf7a", 20);
    addFloater(p.x, p.y - p.h - 20, tag, "#f6efe2", 10);
    addBubble(p.x, p.y - p.h - 30, pick(p.stats.lines));
    burst(p.x, p.y - p.h * 0.6, wasFleeing ? "#ffd6a0" : "#f2e4ff", 12);
    hitStop(0.07);
    addShake(5);
    Sound.catchPrey(clean);
    if (!wasFleeing) Sound.purr();

    if (p.pip) p.pip.classList.add("is-caught");
    updateHud();
    ui.live.textContent = `${p.type} caught. ${fmt(pts)} scare points.`;
    checkLevelDone();
    return true;
  }

  function checkLevelDone() {
    const allPrey = game.prey.every((q) => q.caught || q.escaped);
    if (!allPrey) return;
    if (game.vacuum && game.vacuum.hp > 0) return;
    endLevel(false);
  }

  function missPounce() {
    const k = game.kitten;
    if (game.demo) return;
    game.combo = 0;
    k.recover = 0.3;
    addFloater(k.x, k.y - 78, "they did not flinch", "#b9c2d6", 11);
    addShake(3);
    Sound.miss();
    updateHud();
  }

  function hurt() {
    if (game.demo || game.mode !== "play") return;
    const k = game.kitten;
    if (!k || k.invuln > 0) return;
    const u = unit();

    game.lives -= 1;
    game.combo = 0;
    k.invuln = 1.8;
    k.charging = false;
    k.charge = 0;
    k.onGround = false;
    k.air = true;
    k.support = null;
    k.vy = -270 * u;
    k.vx = -k.facing * 190 * u;
    k.sx = 1.2;
    k.sy = 0.8;
    game.flash = 1;
    addShake(14);
    burst(k.x, k.y - 20, "#ffb3a0", 16);
    Sound.hurt();
    buildLives();
    updateHud();
    addFloater(k.x, k.y - 86, "nine lives, minus one", "#ff9fb4", 12);

    if (game.lives <= 0) {
      game.mode = "downtime";
      window.setTimeout(gameOver, 700);
    }
  }

  function hitBoss() {
    const v = game.vacuum;
    const k = game.kitten;
    if (!v || v.state === "stun") return;
    v.hp -= 1;
    v.state = "stun";
    v.timer = 2;
    k.didCatch = true;
    k.pounceWas = false;
    k.vy = -430 * unit();
    k.y = v.top - 4;

    game.combo += 1;
    game.bestCombo = Math.max(game.bestCombo, game.combo);
    game.levelBestCombo = Math.max(game.levelBestCombo || 0, game.combo);
    game.score += 500;
    hitStop(0.09);
    addShake(12);
    burst(v.x, v.top - 8, "#ffd694", 22);
    addFloater(v.x, v.top - 46, `POWER BUTTON ${4 - v.hp}/4`, "#ffcf7a", 15);
    addFloater(v.x, v.top - 68, "+500", "#f6efe2", 20);
    addBubble(v.x, v.top - 92, pick(["fine. i am scared.", "please stop", "this is undignified"]));
    Sound.thump();
    Sound.catchPrey(true);
    updateHud();

    if (v.hp <= 0) {
      v.hp = 0;
      game.score += 1000;
      addFloater(v.x, v.top - 90, "+1000  SILENCED", "#ffcf7a", 18);
      addShake(18);
      burst(v.x, v.top - 20, "#ffe6b8", 30);
      Sound.fanfare();
      endLevel(false);
    }
  }


  /* ------------------------------------------------------------- effects --- */

  function addShake(n) {
    if (reduceMotion) return;
    game.shake = Math.min(22, game.shake + n);
  }

  function hitStop(t) {
    game.hitstop = Math.max(game.hitstop, t);
  }

  function puff(x, y, count, color) {
    for (let i = 0; i < count; i += 1) {
      game.particles.push({
        x: x + rand(-8, 8),
        y: y - rand(0, 6),
        vx: rand(-60, 60),
        vy: rand(-90, -20),
        gravity: 160,
        life: rand(0.35, 0.8),
        max: 0.8,
        size: rand(1.5, 3.4),
        color: color || "rgba(226,238,255,0.9)",
      });
    }
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(90, 320);
      game.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        gravity: 420,
        life: rand(0.35, 0.9),
        max: 0.9,
        size: rand(1.6, 4.2),
        color,
      });
    }
  }

  function addFloater(x, y, text, color, size) {
    game.floaters.push({ x, y, text, color, size, life: 1.1, max: 1.1 });
  }

  function addBubble(x, y, text) {
    game.bubbles.push({ x, y, text, life: 1.7, max: 1.7 });
  }

  function updateEffects(dt) {
    for (let i = game.particles.length - 1; i >= 0; i -= 1) {
      const p = game.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        game.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.99;
    }
    for (let i = game.floaters.length - 1; i >= 0; i -= 1) {
      const f = game.floaters[i];
      f.life -= dt;
      f.y -= 34 * dt;
      if (f.life <= 0) game.floaters.splice(i, 1);
    }
    for (let i = game.bubbles.length - 1; i >= 0; i -= 1) {
      const b = game.bubbles[i];
      b.life -= dt;
      b.y -= 14 * dt;
      if (b.life <= 0) game.bubbles.splice(i, 1);
    }
    for (let i = game.rings.length - 1; i >= 0; i -= 1) {
      const r = game.rings[i];
      r.age += dt;
      r.life -= dt;
      if (r.life <= 0) game.rings.splice(i, 1);
    }
    game.shake = Math.max(0, game.shake - dt * 42);
    game.flash = Math.max(0, game.flash - dt * 2.2);
    game.hitstop = Math.max(0, game.hitstop - dt);
  }

  /* ---------------------------------------------------------------- demo --- */

  function nearestPrey() {
    const k = game.kitten;
    let best = null;
    let bestD = Infinity;
    for (const p of game.prey) {
      if (p.caught || p.escaped) continue;
      const d = Math.abs(p.x - k.x);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  function runDemo(dt) {
    const k = game.kitten;
    const u = unit();
    input.left = false;
    input.right = false;
    input.trot = false;

    if (k.charging) {
      demo.hold -= dt;
      k.facing = demo.targetX > k.x ? 1 : -1;
      if (demo.hold <= 0) onPounceUp();
      return;
    }
    if (k.air || k.recover > 0) return;

    const target = nearestPrey();
    if (!target) return;
    const dx = target.x - k.x;
    const gap = Math.abs(dx);
    if (gap > 170 * u) {
      if (dx > 0) input.right = true;
      else input.left = true;
    } else if (gap < 58 * u) {
      /* too close for a leap: back up, like a real cat would */
      if (dx > 0) input.left = true;
      else input.right = true;
    } else if (game.demoCooldown <= 0) {
      k.facing = dx > 0 ? 1 : -1;
      let bestPower = 0.5;
      let bestErr = Infinity;
      for (let step = 2; step <= 20; step += 1) {
        const p = step / 20;
        const err = Math.abs(pounceDistance(p) - gap);
        if (err < bestErr) {
          bestErr = err;
          bestPower = p;
        }
      }
      onPounceDown();
      demo.hold = bestPower * 0.7 + 0.05;
      demo.targetX = target.x;
      game.demoCooldown = 1.1;
    }
  }


  /* -------------------------------------------------------------- render --- */

  function drawRings() {
    ctx.save();
    for (const r of game.rings) {
      const t = clamp(r.age / 0.5, 0, 1);
      const radius = r.max * (0.2 + t * 0.8);
      ctx.globalAlpha = (1 - t) * 0.26;
      ctx.strokeStyle = "#e8f0ff";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(r.x, r.y - 10, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    for (const p of game.particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1) * 0.9;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFloaters() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const f of game.floaters) {
      const alpha = clamp(f.life / f.max, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.font = `700 ${f.size}px Outfit, system-ui, sans-serif`;
      ctx.fillStyle = "rgba(8,12,22,0.55)";
      ctx.fillText(f.text, f.x + 1, f.y + 2);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  function drawBubbles() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const b of game.bubbles) {
      const alpha = clamp((b.life / b.max) * 1.8, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.font = "600 13px Outfit, system-ui, sans-serif";
      const w = ctx.measureText(b.text).width + 20;
      const h = 26;
      const x = clamp(b.x - w / 2, 10, view.w - w - 10);
      const y = b.y - h;
      ctx.fillStyle = "rgba(248,243,232,0.96)";
      roundRect(ctx, x, y, w, h, 11);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(b.x - 5, y + h - 1);
      ctx.lineTo(b.x + 1, y + h + 9);
      ctx.lineTo(b.x + 7, y + h - 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#241a20";
      ctx.fillText(b.text, x + w / 2, y + h / 2 + 1);
    }
    ctx.restore();
  }

  function drawAim(power) {
    const k = game.kitten;
    const u = unit();
    const shot = pounceVelocity(Math.max(0.14, power), k.facing);
    let x = k.x;
    let y = k.y;
    let vx = shot.vx;
    let vy = shot.vy;
    const step = 1 / 60;
    const pts = [];
    let landing = null;

    for (let i = 0; i < 90; i += 1) {
      const prevY = y;
      vy += GRAV * u * step;
      x += vx * step;
      y += vy * step;
      pts.push([x, y]);
      if (x < 0 || x > view.w) break;
      if (vy > 0) {
        for (const s of game.platforms) {
          if (x >= s.left && x <= s.right && prevY <= s.top && y >= s.top) {
            if (!landing || s.top < landing.top) landing = { x, top: s.top };
          }
        }
        if (landing) break;
      }
    }

    ctx.save();
    for (let i = 0; i < pts.length; i += 2) {
      const a = 0.45 * (1 - i / pts.length) + 0.1;
      ctx.fillStyle = `rgba(255,207,122,${a})`;
      ctx.beginPath();
      ctx.arc(pts[i][0], pts[i][1] - 14, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (landing) {
      ctx.strokeStyle = "rgba(255,207,122,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(landing.x, landing.top, 21, 6.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (const prey of game.prey) {
        if (prey.caught || prey.escaped) continue;
        if (
          Math.abs(prey.x - landing.x) < 48 * u &&
          Math.abs(preyTarget(prey) - (landing.top - 12)) < 52
        ) {
          ctx.strokeStyle = "rgba(255,159,180,0.95)";
          ctx.beginPath();
          ctx.ellipse(prey.x, landing.top + 1, 26, 8, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    ctx.strokeStyle = "rgba(255,207,122,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(k.x, k.y - 2, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * power);
    ctx.stroke();
    ctx.restore();
  }

  function drawHint() {
    if (game.demo || game.hintTimer <= 0) return;
    const text = game.level.hint;
    if (!text) return;
    const alpha = Math.min(1, game.hintTimer / 0.7);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "600 12px Outfit, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(text).width + 34;
    const x = view.w / 2 - w / 2;
    const y = view.groundY + 34;
    ctx.fillStyle = "rgba(7,11,20,0.62)";
    roundRect(ctx, x, y, w, 30, 15);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,207,122,0.26)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "rgba(246,239,226,0.88)";
    ctx.fillText(text, view.w / 2, y + 15.5);
    ctx.restore();
  }

  function drawHazardWarnings() {
    ctx.save();
    for (const h of game.hazards) {
      if (h.active || h.timer > h.warn) continue;
      const a = 1 - h.timer / h.warn;
      const w = 180;
      const x0 = h.dir > 0 ? 0 : view.w;
      const grad = ctx.createLinearGradient(x0, 0, x0 + (h.dir > 0 ? w : -w), 0);
      grad.addColorStop(0, `rgba(10,6,14,${0.42 * a})`);
      grad.addColorStop(1, "rgba(10,6,14,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(h.dir > 0 ? 0 : view.w - w, view.groundY - 90, w, 90);
      ctx.globalAlpha = a * 0.7;
      ctx.fillStyle = "#ffcf7a";
      ctx.font = "700 11px Outfit, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SLIPPERS", h.dir > 0 ? 56 : view.w - 56, view.groundY - 96);
    }
    ctx.restore();
  }

  function render() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const scale = view.scale * dpr;
    const shake = game.shake;
    const ox = shake ? rand(-shake, shake) * scale : 0;
    const oy = shake ? rand(-shake, shake) * scale : 0;
    ctx.setTransform(scale, 0, 0, scale, ox, oy);

    ctx.clearRect(-80, -80, view.w + 160, view.h + 160);
    if (!game.level) return;

    Art.drawScene(ctx, { view, level: game.level }, game.now);
    game.platforms.forEach((p) => {
      if (p.kind !== "ground") Art.drawPlatform(ctx, p);
    });
    drawHazardWarnings();
    game.hazards.forEach((h) => {
      if (h.active) Art.drawSlipper(ctx, h, game.now);
    });
    if (game.vacuum) Art.drawVacuum(ctx, game.vacuum, game.now);
    game.prey.forEach((p) => Art.drawPrey(ctx, p, game.now));

    if (game.kitten && game.kitten.charging) drawAim(game.kitten.charge);
    if (game.kitten) Art.drawKitten(ctx, game.kitten, game.now);

    drawRings();
    drawParticles();
    drawFloaters();
    drawBubbles();
    drawHint();

    if (game.flash > 0) {
      ctx.fillStyle = `rgba(255,120,96,${game.flash * 0.16})`;
      ctx.fillRect(0, 0, view.w, view.h);
    }
  }


  /* ---------------------------------------------------------------- loop --- */

  let lastTime = 0;

  function tick(dt) {
    game.now += dt;
    updateEffects(dt);
    if (game.hitstop > 0) return;

    if (game.mode === "play" || game.mode === "attract") {
      updatePlay(dt);
    } else if (game.mode === "levelend") {
      game.endTimer -= dt;
      if (game.endTimer <= 0) {
        if (game.demo) {
          layoutLevel(0, true);
          game.mode = "attract";
        } else {
          showResults(game.timesUp);
        }
      }
    }
  }

  function frame(timestamp) {
    const dt = lastTime ? Math.min(0.034, (timestamp - lastTime) / 1000) : 0.016;
    lastTime = timestamp;
    tick(dt);
    render();
    window.requestAnimationFrame(frame);
  }

  /* --------------------------------------------------------------- input --- */

  function toggleSound() {
    const muted = Sound.toggleMute();
    ui.sound.textContent = muted ? "SOUND OFF" : "SOUND ON";
    ui.sound.setAttribute("aria-pressed", String(muted));
  }

  function toggleFullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch {
      /* not available in this browser */
    }
  }

  function primaryAction() {
    if (game.mode === "attract") {
      Sound.unlock();
      Sound.musicStart();
      startRun();
    } else if (game.mode === "card") {
      advanceCard();
    }
  }

  window.addEventListener("keydown", (event) => {
    const code = event.code;
    if (code === "Space" && game.mode !== "card") event.preventDefault();
    if (code.startsWith("Arrow")) event.preventDefault();

    switch (code) {
      case "ArrowLeft":
      case "KeyA":
        input.left = true;
        break;
      case "ArrowRight":
      case "KeyD":
        input.right = true;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        input.trot = true;
        break;
      case "Space":
        if (game.mode === "play") {
          if (!event.repeat) onPounceDown();
        } else if (game.mode !== "card") {
          primaryAction();
        }
        break;
      case "Enter":
        if (game.mode !== "play" && game.mode !== "paused") primaryAction();
        break;
      case "Escape":
      case "KeyP":
        if (game.mode === "play" || game.mode === "paused") togglePause();
        break;
      case "KeyM":
        toggleSound();
        break;
      case "KeyF":
        toggleFullscreen();
        break;
      default:
        break;
    }
  });

  window.addEventListener("keyup", (event) => {
    switch (event.code) {
      case "ArrowLeft":
      case "KeyA":
        input.left = false;
        break;
      case "ArrowRight":
      case "KeyD":
        input.right = false;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        input.trot = false;
        break;
      case "Space":
        onPounceUp();
        break;
      default:
        break;
    }
  });

  window.addEventListener("blur", () => {
    input.left = false;
    input.right = false;
    input.trot = false;
    if (game.mode === "play") togglePause();
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (game.mode !== "play") return;
    event.preventDefault();
    Sound.unlock();
    onPounceDown();
  });
  window.addEventListener("pointerup", () => onPounceUp());
  window.addEventListener("pointercancel", () => onPounceUp());

  function bindHold(id, press, release) {
    const el = $(id);
    el.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      el.classList.add("is-held");
      Sound.unlock();
      press();
    });
    const end = (event) => {
      if (event) event.preventDefault();
      el.classList.remove("is-held");
      release();
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("pointerleave", end);
  }

  bindHold(
    "t-left",
    () => {
      input.left = true;
    },
    () => {
      input.left = false;
    }
  );
  bindHold(
    "t-right",
    () => {
      input.right = true;
    },
    () => {
      input.right = false;
    }
  );
  bindHold("t-pounce", onPounceDown, onPounceUp);

  $("btn-start").addEventListener("click", () => {
    Sound.unlock();
    Sound.musicStart();
    startRun();
  });
  $("btn-sound").addEventListener("click", () => {
    Sound.unlock();
    toggleSound();
  });
  $("btn-pause").addEventListener("click", () => togglePause());
  $("btn-resume").addEventListener("click", () => {
    Sound.ui();
    togglePause();
  });
  $("btn-restart").addEventListener("click", () => {
    Sound.ui();
    ui.pause.hidden = true;
    showBriefing(game.levelIndex);
  });
  $("btn-quit").addEventListener("click", () => {
    Sound.ui();
    startAttract();
  });

  document.addEventListener("fullscreenchange", () => {
    resize();
  });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 120);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game.mode === "play") togglePause();
  });

  /* ---------------------------------------------------------------- boot --- */

  if (isTouch()) ui.touch.hidden = false;
  resize();
  startAttract();
  window.requestAnimationFrame(frame);
})();


