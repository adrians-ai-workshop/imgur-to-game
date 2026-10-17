(() => {
  "use strict";

  const canvas = document.getElementById("skyline-canvas");
  const ctx = canvas.getContext("2d");
  const radarCanvas = document.getElementById("radar-canvas");
  const radarCtx = radarCanvas.getContext("2d");

  const audio = new window.RotorAudioEngine();

  // HUD DOM elements
  const hudShift = document.getElementById("hud-shift");
  const dispatchText = document.getElementById("dispatch-text");
  const hudScore = document.getElementById("hud-score");
  const hudStreak = document.getElementById("hud-streak");
  const hudDeliveries = document.getElementById("hud-deliveries");
  const hudWindLabel = document.getElementById("hud-wind-label");
  const hudAlt = document.getElementById("hud-alt");
  const barCollective = document.getElementById("bar-collective");
  const hudVsi = document.getElementById("hud-vsi");
  const hudVsiStatus = document.getElementById("hud-vsi-status");
  const hudSpeed = document.getElementById("hud-speed");
  const hudAttitude = document.getElementById("hud-attitude");
  const hudFuel = document.getElementById("hud-fuel");
  const hudHull = document.getElementById("hud-hull");
  const barFuel = document.getElementById("bar-fuel");
  const hudCabin = document.getElementById("hud-cabin");
  const hudHoistState = document.getElementById("hud-hoist-state");
  const hudDestination = document.getElementById("hud-destination");

  const btnStartFlight = document.getElementById("btn-start-flight");
  const btnCamera = document.getElementById("btn-camera");
  const btnMute = document.getElementById("btn-mute");
  const btnPause = document.getElementById("btn-pause");

  const modalOverlay = document.getElementById("modal-overlay");
  const modalEyebrow = document.getElementById("modal-eyebrow");
  const modalTitle = document.getElementById("modal-title");
  const modalDesc = document.getElementById("modal-desc");
  const modalStats = document.getElementById("modal-stats");
  const btnModalPrimary = document.getElementById("btn-modal-primary");
  const btnModalRestart = document.getElementById("btn-modal-restart");

  const WORLD_WIDTH = 5200;
  const GROUND_Y = 980;
  const CEILING_Y = 60;

  const SHIFTS = [
    {
      name: "SHIFT 01 / 06 — GOLDEN APRICOT",
      quota: 3,
      windBase: 14,
      droneCount: 2,
      skyTop: "#3d334c",
      skyMid: "#9c5e5c",
      skyHorizon: "#f79c52",
      skyGlow: "#ffd478",
      sunAzimuth: 0.66
    },
    {
      name: "SHIFT 02 / 06 — AMBER CURTAIN WALL",
      quota: 3,
      windBase: 26,
      droneCount: 3,
      skyTop: "#312945",
      skyMid: "#8f4b52",
      skyHorizon: "#f2833d",
      skyGlow: "#ffc35c",
      sunAzimuth: 0.62
    },
    {
      name: "SHIFT 03 / 06 — CANYON UPDRAFTS",
      quota: 4,
      windBase: 38,
      droneCount: 4,
      skyTop: "#27223d",
      skyMid: "#7d3d4e",
      skyHorizon: "#e66e38",
      skyGlow: "#ffb14a",
      sunAzimuth: 0.58
    },
    {
      name: "SHIFT 04 / 06 — CRIMSON HELIPORT",
      quota: 4,
      windBase: 46,
      droneCount: 5,
      skyTop: "#1f1c35",
      skyMid: "#66304a",
      skyHorizon: "#d65836",
      skyGlow: "#ff9940",
      sunAzimuth: 0.54
    },
    {
      name: "SHIFT 05 / 06 — VIOLET ALPENGLOW",
      quota: 5,
      windBase: 54,
      droneCount: 6,
      skyTop: "#16162b",
      skyMid: "#4d2745",
      skyHorizon: "#bd4939",
      skyGlow: "#ff8538",
      sunAzimuth: 0.5
    },
    {
      name: "SHIFT 06 / 06 — TWILIGHT SOVEREIGN",
      quota: 5,
      windBase: 64,
      droneCount: 7,
      skyTop: "#0e1022",
      skyMid: "#361e3d",
      skyHorizon: "#963938",
      skyGlow: "#f56e33",
      sunAzimuth: 0.46
    }
  ];

  const TOWER_NAMES = [
    "SOLARIS PLAZA",
    "MERIDIAN CROWN",
    "AURELIA FINANCIAL",
    "FENESTRON CENTER",
    "VANGUARD SPIRE",
    "CITADEL WEST",
    "HELIOS EXCHANGE",
    "PACIFICA GLASS",
    "VERIDIAN TOWER",
    "MONARCH TRUST",
    "STRATOS MED-BASE",
    "ORION OVERLOOK",
    "ZENITH CONSULATE",
    "KENSINGTON DECK"
  ];

  const state = {
    mode: "attract", // attract | playing | paused | shift_clear | gameover | victory
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    time: 0,
    shiftIndex: 0,
    score: 0,
    streak: 1.0,
    deliveriesInShift: 0,
    totalDeliveries: 0,
    cameraX: 1200,
    cameraY: 320,
    windSpeed: 12,
    windCurrent: 12,
    windPhase: 0,
    clouds: [],
    bgBuildingsFar: [],
    bgBuildingsMid: [],
    towers: [],
    updrafts: [],
    drones: [],
    particles: [],
    floatingTexts: [],
    activeContract: null,
    heli: null
  };

  function createHeli(x, y) {
    return {
      x,
      y,
      vx: 0,
      vy: 0,
      pitch: 0,
      targetPitch: 0,
      collective: 0.48,
      facing: 1, // 1 = nose right (like reference image), -1 = nose left
      visualFacing: 1,
      rotorPhase: 0,
      fenestronPhase: 0,
      skidCompress: 0,
      fuel: 100,
      hull: 100,
      onPad: null,
      passenger: null,
      hoistLength: 0,
      hoistActive: false,
      hoistTargetLength: 145,
      hoistHooked: null,
      spotlightOn: false,
      invulnTimer: 0
    };
  }
  const keys = {};

  function bindInputs() {
    window.addEventListener("keydown", (e) => {
      keys[e.code] = true;

      if (state.mode === "attract") {
        if (e.code === "Enter" || e.code === "Space") {
          e.preventDefault();
          startNewCampaign();
        }
        return;
      }

      if (e.code === "KeyM") {
        toggleAudioMute();
      } else if (e.code === "KeyF") {
        flipHelicopterYaw();
      } else if (e.code === "Escape" || e.code === "KeyP") {
        if (state.mode === "playing") {
          pauseGame();
        } else if (state.mode === "paused") {
          resumeGame();
        }
      } else if (e.code === "KeyR" && state.mode !== "playing") {
        startNewCampaign();
      } else if (e.code === "Enter" && state.mode !== "playing") {
        handleModalPrimary();
      }
    });

    window.addEventListener("keyup", (e) => {
      keys[e.code] = false;
    });

    document.querySelectorAll(".touch-btn").forEach((btn) => {
      const code = btn.getAttribute("data-key");
      if (!code) return;
      const press = (ev) => {
        ev.preventDefault();
        keys[code] = true;
      };
      const release = (ev) => {
        ev.preventDefault();
        keys[code] = false;
      };
      btn.addEventListener("pointerdown", press);
      btn.addEventListener("pointerup", release);
      btn.addEventListener("pointerleave", release);
      btn.addEventListener("pointercancel", release);
    });

    btnStartFlight.addEventListener("click", () => startNewCampaign());
    btnCamera.addEventListener("click", () => flipHelicopterYaw());
    btnMute.addEventListener("click", () => toggleAudioMute());
    btnPause.addEventListener("click", () => {
      if (state.mode === "playing") pauseGame();
      else if (state.mode === "paused") resumeGame();
    });
    btnModalPrimary.addEventListener("click", () => handleModalPrimary());
    btnModalRestart.addEventListener("click", () => startNewCampaign());

    window.addEventListener("resize", handleResize);
    handleResize();
  }

  function handleResize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
  }

  function toggleAudioMute() {
    audio.init();
    const muted = audio.toggleMute();
    btnMute.textContent = muted ? "AUDIO: OFF [M]" : "AUDIO: ON [M]";
  }

  function flipHelicopterYaw() {
    if (!state.heli) return;
    state.heli.facing *= -1;
    audio.playRadioChime("dispatch");
  }

  function seededRandom(seed) {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  }
  function buildCityWorld(shiftIdx) {
    state.clouds = [];
    for (let i = 0; i < 24; i++) {
      state.clouds.push({
        x: (i / 24) * WORLD_WIDTH,
        y: 65 + seededRandom(i * 11 + shiftIdx) * 290,
        w: 220 + seededRandom(i * 17) * 340,
        h: 26 + seededRandom(i * 23) * 44,
        speed: 4 + seededRandom(i * 31) * 9,
        alpha: 0.22 + seededRandom(i * 41) * 0.28
      });
    }

    state.bgBuildingsFar = [];
    let bx = -400;
    let idx = 1;
    while (bx < WORLD_WIDTH + 600) {
      const w = 75 + Math.floor(seededRandom(idx * 13) * 110);
      const h = 150 + Math.floor(seededRandom(idx * 29) * 320);
      state.bgBuildingsFar.push({ x: bx, w, h, style: idx % 3 });
      bx += w + 12 + Math.floor(seededRandom(idx * 7) * 32);
      idx++;
    }

    state.bgBuildingsMid = [];
    bx = -300;
    idx = 101;
    while (bx < WORLD_WIDTH + 500) {
      const w = 95 + Math.floor(seededRandom(idx * 19) * 135);
      const h = 210 + Math.floor(seededRandom(idx * 37) * 400);
      state.bgBuildingsMid.push({
        x: bx,
        w,
        h,
        style: idx % 4,
        litCols: 3 + (idx % 5)
      });
      bx += w + 28 + Math.floor(seededRandom(idx * 43) * 55);
      idx++;
    }

    state.towers = [];
    state.updrafts = [];
    let tx = 220;
    for (let i = 0; i < TOWER_NAMES.length; i++) {
      const r1 = seededRandom((i + 1) * 71 + shiftIdx * 13);
      const r2 = seededRandom((i + 1) * 113 + shiftIdx * 19);
      const w = 175 + Math.floor(r1 * 90);
      const h = 300 + Math.floor(r2 * 330);
      const topY = GROUND_Y - h;

      const isMedBase = i === 2 || i === 8 || i === 12;
      const isHoistSpire = !isMedBase && (i % 4 === 1);

      state.towers.push({
        id: i,
        name: TOWER_NAMES[i],
        x: tx,
        y: topY,
        w,
        h,
        facadeStyle: i % 4,
        isMedBase,
        isHoistSpire,
        padX: tx + w * 0.5,
        padY: topY,
        padRadius: w * 0.34,
        spireHeight: isHoistSpire ? 72 : 0
      });

      if (i > 0 && i % 2 === 1) {
        const prev = state.towers[i - 1];
        const canyonX = (prev.x + prev.w + tx) * 0.5;
        const canyonW = Math.max(70, tx - (prev.x + prev.w) - 20);
        state.updrafts.push({
          x: canyonX,
          w: canyonW,
          topY: Math.min(prev.y, topY) - 90,
          bottomY: GROUND_Y,
          strength: (i % 4 === 1 ? -1 : 0.65) * (45 + shiftIdx * 10)
        });
      }

      tx += w + 150 + Math.floor(seededRandom((i + 1) * 97) * 95);
    }

    const shiftCfg = SHIFTS[shiftIdx] || SHIFTS[0];
    state.drones = [];
    for (let d = 0; d < shiftCfg.droneCount; d++) {
      const startX = 650 + ((d + 0.5) / shiftCfg.droneCount) * (WORLD_WIDTH - 1200);
      const baseAlt = 210 + (d % 3) * 115;
      state.drones.push({
        x: startX,
        y: baseAlt,
        baseY: baseAlt,
        vx: (d % 2 === 0 ? 1 : -1) * (58 + shiftIdx * 10),
        rangeMin: Math.max(300, startX - 480),
        rangeMax: Math.min(WORLD_WIDTH - 300, startX + 480),
        phase: d * 1.7
      });
    }
  }
  const VIP_TITLES = [
    "DIPLOMATIC ENVOY",
    "CHIEF ARCHITECT",
    "TRAUMA SURGEON",
    "GRID ENGINEER",
    "AEROSPACE EXEC",
    "PRESS PHOTOGRAPHER"
  ];

  function spawnContract() {
    const heli = state.heli;
    const candidates = state.towers.filter((t) => !t.isMedBase);
    if (candidates.length < 2) return;

    // Pick origin tower at a reasonable distance from helicopter
    let origin = candidates[Math.floor(Math.random() * candidates.length)];
    for (let tries = 0; tries < 8; tries++) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      const dist = Math.abs(pick.padX - (heli ? heli.x : 1200));
      if (dist > 320 && dist < 2400) {
        origin = pick;
        break;
      }
    }

    // Pick destination tower (must be a landable VIP pad or Med-Base, not a spire)
    const destCandidates = state.towers.filter(
      (t) => t.id !== origin.id && !t.isHoistSpire
    );
    let dest = destCandidates[Math.floor(Math.random() * destCandidates.length)];
    for (let tries = 0; tries < 10; tries++) {
      const pick = destCandidates[Math.floor(Math.random() * destCandidates.length)];
      if (Math.abs(pick.padX - origin.padX) > 750) {
        dest = pick;
        break;
      }
    }

    const isHoist = origin.isHoistSpire;
    const role = VIP_TITLES[Math.floor(Math.random() * VIP_TITLES.length)];
    const distance = Math.abs(dest.padX - origin.padX);
    const bonusTime = Math.round(32 + distance / 75);

    state.activeContract = {
      type: isHoist ? "HOIST_RESCUE" : "VIP_CHARTER",
      role,
      originTower: origin,
      destTower: dest,
      stage: "PICKUP", // PICKUP -> DROPOFF
      timer: bonusTime,
      maxTimer: bonusTime,
      baseReward: isHoist ? 1850 : 1400,
      hoistProgress: 0
    };

    if (state.mode === "playing") {
      audio.playRadioChime("dispatch");
      setDispatchMessage(
        isHoist
          ? `SPIRE EVAC: Hover above ${origin.name} & hold [SPACE] to hoist ${role}`
          : `CHARTER DISPATCH: Land gently on ${origin.name} [H] to board ${role}`
      );
    }
  }

  function setDispatchMessage(msg) {
    dispatchText.textContent = msg;
  }

  function addFloatingText(x, y, text, color = "#ffcb6b") {
    state.floatingTexts.push({
      x,
      y,
      text,
      color,
      life: 1.5,
      maxLife: 1.5
    });
  }

  function startNewCampaign() {
    audio.init();
    audio.playRadioChime("shift");

    state.shiftIndex = 0;
    state.score = 0;
    state.streak = 1.0;
    state.deliveriesInShift = 0;
    state.totalDeliveries = 0;
    state.particles = [];
    state.floatingTexts = [];

    setupShift(0, true);
    state.mode = "playing";
    document.body.dataset.state = "playing";
    modalOverlay.hidden = true;
  }

  function setupShift(idx, resetHullFuel = false) {
    state.shiftIndex = idx;
    state.deliveriesInShift = 0;
    const cfg = SHIFTS[idx] || SHIFTS[0];
    state.windSpeed = cfg.windBase;
    buildCityWorld(idx);

    const homeTower = state.towers[2] || state.towers[0];
    if (!state.heli || resetHullFuel) {
      state.heli = createHeli(homeTower.padX, homeTower.padY - 26);
    } else {
      state.heli.x = homeTower.padX;
      state.heli.y = homeTower.padY - 26;
      state.heli.vx = 0;
      state.heli.vy = 0;
      state.heli.pitch = 0;
      state.heli.fuel = 100;
      state.heli.hull = Math.min(100, state.heli.hull + 35);
      state.heli.passenger = null;
      state.heli.hoistLength = 0;
      state.heli.hoistActive = false;
    }

    state.cameraX = state.heli.x - state.width * 0.42;
    state.cameraY = state.heli.y - state.height * 0.48;
    hudShift.textContent = cfg.name;
    spawnContract();
  }
  function pauseGame() {
    if (state.mode !== "playing") return;
    state.mode = "paused";
    document.body.dataset.state = "paused";
    showModal(
      "FLIGHT DECK HOLD",
      "SORTIE PAUSED",
      "Twin Arrius turbines holding at flight idle over downtown sector.",
      "RESUME SORTIE [ENTER]"
    );
  }

  function resumeGame() {
    if (state.mode !== "paused") return;
    state.mode = "playing";
    document.body.dataset.state = "playing";
    modalOverlay.hidden = true;
  }

  function completeShift() {
    audio.playRadioChime("shift");
    if (state.shiftIndex + 1 >= SHIFTS.length) {
      state.mode = "victory";
      document.body.dataset.state = "victory";
      showModal(
        "ALL 6 GOLDEN HOUR SHIFTS COMPLETE",
        "SOVEREIGN ROTOR ACE",
        "You mastered the Fenestron across every sunset thermal and twilight spire in the metropolis!",
        "FLY NEW CAMPAIGN [ENTER]"
      );
    } else {
      state.mode = "shift_clear";
      document.body.dataset.state = "shift_clear";
      const nextCfg = SHIFTS[state.shiftIndex + 1];
      showModal(
        `SHIFT ${state.shiftIndex + 1} CLEARED`,
        "SUNSET ADVANCING",
        `Airframe serviced and Jet-A1 tanks topped off. Next sector: ${nextCfg.name}.`,
        "LAUNCH NEXT SHIFT [ENTER]"
      );
    }
  }

  function triggerGameOver(reason) {
    audio.playRadioChime("warn");
    state.mode = "gameover";
    document.body.dataset.state = "gameover";
    showModal(
      "MAYDAY // FLIGHT TERMINATED",
      "AIRFRAME GROUNDED",
      reason,
      "NEW SORTIE [ENTER]"
    );
  }

  function showModal(eyebrow, title, desc, primaryLabel) {
    modalEyebrow.textContent = eyebrow;
    modalTitle.textContent = title;
    modalDesc.textContent = desc;
    btnModalPrimary.textContent = primaryLabel;

    modalStats.innerHTML = `
      <div class="stat-pill">
        <span>CREDITS</span>
        <strong>$${state.score.toLocaleString()}</strong>
      </div>
      <div class="stat-pill">
        <span>SORTIES</span>
        <strong>${state.totalDeliveries}</strong>
      </div>
      <div class="stat-pill">
        <span>STREAK PEAK</span>
        <strong>x${state.streak.toFixed(1)}</strong>
      </div>
    `;
    modalOverlay.hidden = false;
  }

  function handleModalPrimary() {
    if (state.mode === "paused") {
      resumeGame();
    } else if (state.mode === "shift_clear") {
      setupShift(state.shiftIndex + 1, false);
      state.mode = "playing";
      document.body.dataset.state = "playing";
      modalOverlay.hidden = true;
    } else if (state.mode === "gameover" || state.mode === "victory") {
      startNewCampaign();
    }
  }

  // Autonomous AI pilot for the attract-screen live skyline loop
  function updateAttractAutopilot(dt) {
    const heli = state.heli;
    if (!heli) return;

    const c = state.activeContract;
    const targetTower =
      c && c.stage === "DROPOFF"
        ? c.destTower
        : c
        ? c.originTower
        : state.towers[4];

    const targetX = targetTower ? targetTower.padX : 1800;
    const hoverOffset =
      targetTower && targetTower.isHoistSpire ? 118 : 26;
    const targetY = targetTower ? targetTower.padY - hoverOffset : 310;

    const dx = targetX - heli.x;
    const dy = targetY - heli.y;

    const desiredVx = Math.max(-175, Math.min(175, dx * 0.85));
    heli.vx += (desiredVx - heli.vx) * Math.min(1, dt * 2.4);

    // Avoid intermediate tall towers smoothly
    let clearanceY = targetY;
    for (let i = 0; i < state.towers.length; i++) {
      const t = state.towers[i];
      if (heli.x + 160 > t.x && heli.x - 160 < t.x + t.w) {
        clearanceY = Math.min(clearanceY, t.y - 110);
      }
    }
    const effectiveTargetY = Math.abs(dx) > 120 ? Math.min(targetY - 75, clearanceY) : targetY;
    const desiredVy = Math.max(-110, Math.min(95, (effectiveTargetY - heli.y) * 1.4));
    heli.vy += (desiredVy - heli.vy) * Math.min(1, dt * 3.0);

    heli.x += heli.vx * dt;
    heli.y += heli.vy * dt;

    if (Math.abs(heli.vx) > 18) {
      heli.facing = heli.vx >= 0 ? 1 : -1;
    }
    heli.targetPitch = (heli.vx / 220) * 0.28;
    heli.pitch += (heli.targetPitch - heli.pitch) * Math.min(1, dt * 6);
    heli.collective = 0.52 - heli.vy / 260;

    // Demo hoist & passenger cycle in attract mode
    if (Math.abs(dx) < 55 && Math.abs(heli.y - targetY) < 35 && c) {
      if (c.stage === "PICKUP") {
        if (targetTower.isHoistSpire) {
          heli.hoistActive = true;
          heli.hoistLength = Math.min(110, heli.hoistLength + dt * 65);
          c.hoistProgress += dt * 0.7;
          if (c.hoistProgress >= 1) {
            c.stage = "DROPOFF";
            heli.hoistActive = false;
          }
        } else {
          c.stage = "DROPOFF";
        }
      } else {
        spawnContract();
      }
    } else {
      heli.hoistActive = false;
      heli.hoistLength = Math.max(0, heli.hoistLength - dt * 90);
    }

    heli.spotlightOn = Math.sin(state.time * 0.7) > 0.1;
  }
  function updatePlayerFlight(dt) {
    const heli = state.heli;
    if (!heli) return;

    if (heli.invulnTimer > 0) {
      heli.invulnTimer = Math.max(0, heli.invulnTimer - dt);
    }

    const up = keys["KeyW"] || keys["ArrowUp"];
    const down = keys["KeyS"] || keys["ArrowDown"];
    const left = keys["KeyA"] || keys["ArrowLeft"];
    const right = keys["KeyD"] || keys["ArrowRight"];
    const hoistKey = keys["Space"];
    const stabilizeKey = keys["ShiftLeft"] || keys["ShiftRight"] || keys["KeyE"];

    heli.spotlightOn = Boolean(stabilizeKey) || state.shiftIndex >= 3;

    // Collective control
    if (up) {
      heli.collective = Math.min(1.0, heli.collective + dt * 1.45);
    } else if (down) {
      heli.collective = Math.max(0.08, heli.collective - dt * 1.45);
    } else {
      // Gently return toward neutral hover collective
      heli.collective += (0.5 - heli.collective) * Math.min(1, dt * 4.5);
    }

    // Cyclic horizontal tilt & acceleration
    let cyclicInput = 0;
    if (left) cyclicInput -= 1;
    if (right) cyclicInput += 1;

    if (cyclicInput !== 0) {
      heli.facing = cyclicInput > 0 ? 1 : -1;
      heli.vx += cyclicInput * 340 * dt;
      heli.targetPitch = cyclicInput * 0.28;
    } else if (stabilizeKey) {
      heli.vx *= Math.pow(0.08, dt);
      heli.targetPitch = 0;
    } else {
      heli.vx *= Math.pow(0.45, dt);
      heli.targetPitch = (heli.vx / 320) * 0.16;
    }

    heli.pitch += (heli.targetPitch - heli.pitch) * Math.min(1, dt * 8.5);

    // Vertical lift vs gravity
    const liftAccel = (heli.collective - 0.5) * 490;
    heli.vy -= liftAccel * dt;

    if (stabilizeKey && !up && !down) {
      heli.vy *= Math.pow(0.12, dt);
    } else {
      heli.vy *= Math.pow(0.62, dt);
    }

    // Ambient canyon wind & updrafts
    const gust = Math.sin(state.time * 0.65) * 0.35 + 0.65;
    state.windCurrent = state.windSpeed * gust;
    if (!heli.onPad) {
      heli.vx += state.windCurrent * 0.32 * dt;

      for (let i = 0; i < state.updrafts.length; i++) {
        const u = state.updrafts[i];
        if (
          Math.abs(heli.x - u.x) < u.w * 0.5 &&
          heli.y > u.topY &&
          heli.y < u.bottomY
        ) {
          heli.vy += u.strength * dt;
        }
      }
    }

    // Clamp velocities
    heli.vx = Math.max(-330, Math.min(330, heli.vx));
    heli.vy = Math.max(-250, Math.min(270, heli.vy));

    // Fuel consumption
    const burnRate = 0.72 + heli.collective * 0.85 + (Math.abs(heli.vx) / 330) * 0.45;
    heli.fuel = Math.max(0, heli.fuel - burnRate * dt);
    if (heli.fuel <= 0) {
      heli.vy += 150 * dt; // Autorotation descent when out of fuel
    }

    heli.x += heli.vx * dt;
    heli.y += heli.vy * dt;

    // World bounds
    if (heli.x < 120) {
      heli.x = 120;
      heli.vx = Math.abs(heli.vx) * 0.4;
    } else if (heli.x > WORLD_WIDTH - 120) {
      heli.x = WORLD_WIDTH - 120;
      heli.vx = -Math.abs(heli.vx) * 0.4;
    }

    if (heli.y < CEILING_Y) {
      heli.y = CEILING_Y;
      heli.vy = Math.max(0, heli.vy);
    }

    // Hoist cable deployment
    heli.hoistActive = Boolean(hoistKey) && !heli.onPad;
    if (heli.hoistActive) {
      const prevLen = heli.hoistLength;
      heli.hoistLength = Math.min(heli.hoistTargetLength, heli.hoistLength + dt * 95);
      if (Math.floor(heli.hoistLength / 14) !== Math.floor(prevLen / 14)) {
        audio.playHoistTick(false);
      }
      // Dampen horizontal drift slightly while winching
      heli.vx *= Math.pow(0.35, dt);
    } else if (heli.hoistLength > 0) {
      const prevLen = heli.hoistLength;
      heli.hoistLength = Math.max(0, heli.hoistLength - dt * 130);
      if (Math.floor(heli.hoistLength / 14) !== Math.floor(prevLen / 14)) {
        audio.playHoistTick(true);
      }
    }
  }
  function evaluateCollisionsAndMissions(dt) {
    const heli = state.heli;
    if (!heli) return;

    heli.onPad = null;
    const skidBottomY = heli.y + 26;
    const prevBottomY = skidBottomY - heli.vy * dt;

    // Check skyscraper collisions & rooftop landings
    for (let i = 0; i < state.towers.length; i++) {
      const t = state.towers[i];

      // Check spire antenna collision on hoist towers
      if (t.isHoistSpire) {
        const spireX = t.padX;
        const spireTopY = t.y - t.spireHeight;
        if (
          Math.abs(heli.x - spireX) < 32 &&
          skidBottomY > spireTopY &&
          heli.y - 22 < t.y
        ) {
          applyAirframeDamage(18, "SPIRE ANTENNA STRIKE!");
          heli.vy = -95;
          heli.vx += heli.x < spireX ? -90 : 90;
        }
      }

      // Within horizontal span of tower
      if (heli.x + 34 > t.x && heli.x - 34 < t.x + t.w) {
        // Landing on top of roof
        if (prevBottomY <= t.y + 12 && skidBottomY >= t.y) {
          const impactVsi = heli.vy / 15; // Convert px/s to FT/S display scale

          if (t.isHoistSpire) {
            applyAirframeDamage(22, "OBSTRUCTED ROOF — USE HOIST [SPACE]!");
            heli.y = t.y - 28;
            heli.vy = -85;
          } else {
            // Landed on flat rooftop pad
            heli.y = t.y - 26;
            if (impactVsi > 11.5) {
              const dmg = Math.round((impactVsi - 10) * 4.5);
              applyAirframeDamage(dmg, `HARD LANDING (${impactVsi.toFixed(1)} FT/S)!`);
              heli.vy = -Math.min(75, heli.vy * 0.35);
              heli.skidCompress = 1.0;
            } else {
              heli.vy = 0;
              heli.vx *= Math.pow(0.01, dt);
              heli.pitch *= Math.pow(0.02, dt);
              heli.onPad = t;
              heli.skidCompress = Math.min(1, Math.max(0.25, impactVsi / 12));
              handlePadTouchdown(t, dt, impactVsi);
            }
          }
        } else if (skidBottomY > t.y + 12) {
          // Side curtain-wall impact
          if (heli.x < t.padX) {
            heli.x = t.x - 35;
            heli.vx = -Math.max(70, Math.abs(heli.vx) * 0.5);
          } else {
            heli.x = t.x + t.w + 35;
            heli.vx = Math.max(70, Math.abs(heli.vx) * 0.5);
          }
          applyAirframeDamage(16, "CURTAIN WALL COLLISION!");
        }
      }

      // Emit rotor-wash particles when hovering within 140px above rooftop
      const roofDist = t.y - skidBottomY;
      if (
        roofDist >= -2 &&
        roofDist < 140 &&
        heli.x > t.x - 20 &&
        heli.x < t.x + t.w + 20
      ) {
        const intensity = 1 - roofDist / 140;
        if (Math.random() < intensity * 0.85) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          state.particles.push({
            x: heli.x + (Math.random() - 0.5) * 36,
            y: t.y - 2,
            vx: dir * (70 + Math.random() * 140) + heli.vx * 0.25,
            vy: -8 - Math.random() * 26,
            size: 2 + Math.random() * 3.5,
            life: 0.45 + Math.random() * 0.35,
            maxLife: 0.8,
            color: t.isMedBase ? "#5ce6ff" : "#ffcb6b"
          });
        }
      }
    }

    // Check Hoist Winch rescue pickup over Spire towers
    const c = state.activeContract;
    if (
      c &&
      c.stage === "PICKUP" &&
      c.type === "HOIST_RESCUE" &&
      heli.hoistLength > 35
    ) {
      const orig = c.originTower;
      const hookX = heli.x;
      const hookY = heli.y + 20 + heli.hoistLength;
      const targetX = orig.padX;
      const targetY = orig.padY - 14;

      if (Math.hypot(hookX - targetX, hookY - targetY) < 46) {
        c.hoistProgress = Math.min(1, c.hoistProgress + dt * 0.85);
        if (c.hoistProgress >= 1) {
          c.stage = "DROPOFF";
          heli.passenger = c.role;
          audio.playRadioChime("board");
          addFloatingText(
            heli.x,
            heli.y - 48,
            `${c.role} HOISTED ABOARD!`,
            "#5ce6ff"
          );
          setDispatchMessage(
            `EVACUEE SECURED: Fly to ${c.destTower.name} [H] and land gently (<11 FT/S)`
          );
        }
      }
    }

    // Street level floor check
    if (skidBottomY >= GROUND_Y) {
      heli.y = GROUND_Y - 26;
      heli.vy = -70;
      applyAirframeDamage(25, "LOW ALTITUDE STREET HAZARD!");
    }

    // Check patrol drone proximity
    for (let i = 0; i < state.drones.length; i++) {
      const d = state.drones[i];
      if (Math.hypot(heli.x - d.x, heli.y - d.y) < 44) {
        applyAirframeDamage(20, "AIRSPACE DRONE STRIKE!");
        heli.vy = -80;
        d.vx *= -1;
      }
    }

    // Contract bonus timer countdown
    if (c && state.mode === "playing") {
      c.timer = Math.max(0, c.timer - dt);
    }

    // Check out of fuel and unable to climb
    if (heli.fuel <= 0 && heli.hull <= 0) {
      triggerGameOver("Jet-A1 fuel exhausted and airframe critically damaged.");
    }
  }
  function handlePadTouchdown(tower, dt, impactVsi) {
    const heli = state.heli;
    if (!heli) return;

    // Med-Base pads refuel & repair
    if (tower.isMedBase) {
      heli.fuel = Math.min(100, heli.fuel + dt * 42);
      heli.hull = Math.min(100, heli.hull + dt * 22);
    } else {
      heli.fuel = Math.min(100, heli.fuel + dt * 16);
    }

    const c = state.activeContract;
    if (!c || state.mode !== "playing") return;

    // Check centering on helipad [H]
    if (Math.abs(heli.x - tower.padX) > tower.padRadius + 16) return;

    if (c.stage === "PICKUP" && tower.id === c.originTower.id && !tower.isHoistSpire) {
      c.stage = "DROPOFF";
      heli.passenger = c.role;
      audio.playRadioChime("board");
      addFloatingText(
        heli.x,
        heli.y - 46,
        `BOARDED: ${c.role}`,
        "#ffcb6b"
      );
      setDispatchMessage(
        `PASSENGER ABOARD: Deliver ${c.role} to ${c.destTower.name} [H]`
      );
    } else if (c.stage === "DROPOFF" && tower.id === c.destTower.id) {
      const timeBonus = Math.round(c.timer * 25);
      const featherBonus = impactVsi < 4.5 ? 450 : 150;
      const totalEarned = Math.round(
        (c.baseReward + timeBonus + featherBonus) * state.streak
      );

      state.score += totalEarned;
      state.streak = Math.min(4.0, +(state.streak + 0.25).toFixed(2));
      state.deliveriesInShift += 1;
      state.totalDeliveries += 1;
      heli.passenger = null;
      heli.fuel = Math.min(100, heli.fuel + 35);

      audio.playRadioChime("deliver");
      addFloatingText(
        heli.x,
        heli.y - 52,
        `+$${totalEarned.toLocaleString()} CHARTER COMPLETE!`,
        "#57f2aa"
      );

      const shiftQuota = (SHIFTS[state.shiftIndex] || SHIFTS[0]).quota;
      if (state.deliveriesInShift >= shiftQuota) {
        completeShift();
      } else {
        spawnContract();
      }
    }
  }

  function applyAirframeDamage(amount, warningText) {
    const heli = state.heli;
    if (!heli || heli.invulnTimer > 0 || state.mode !== "playing") return;

    heli.hull = Math.max(0, heli.hull - amount);
    heli.invulnTimer = 1.1;
    state.streak = 1.0;
    audio.playRadioChime("warn");
    addFloatingText(heli.x, heli.y - 44, warningText, "#ff5864");
    setDispatchMessage(`WARNING // ${warningText} — LAND AT MED-BASE FOR REPAIRS`);

    for (let i = 0; i < 16; i++) {
      state.particles.push({
        x: heli.x + (Math.random() - 0.5) * 40,
        y: heli.y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 220,
        vy: (Math.random() - 0.5) * 180,
        size: 2.5 + Math.random() * 3.5,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        color: i % 2 === 0 ? "#ff5864" : "#ffcb6b"
      });
    }

    if (heli.hull <= 0) {
      triggerGameOver(`${warningText} Airframe structural integrity depleted.`);
    }
  }

  function updateWorldEntities(dt) {
    const heli = state.heli;
    if (heli) {
      const speedNorm = Math.min(1, Math.hypot(heli.vx, heli.vy) / 300);
      heli.rotorPhase += dt * (28 + heli.collective * 16);
      heli.fenestronPhase += dt * (44 + Math.abs(heli.pitch) * 30);
      heli.visualFacing += (heli.facing - heli.visualFacing) * Math.min(1, dt * 8.5);
      heli.skidCompress *= Math.pow(0.05, dt);

      audio.updateFlightSound(
        heli.collective,
        speedNorm,
        heli.pitch,
        state.mode !== "playing"
      );

      // Smooth look-ahead camera tracking
      const lookAheadX = heli.facing * 110 + heli.vx * 0.35;
      const targetCamX = heli.x + lookAheadX - state.width * 0.5;
      const targetCamY = heli.y - state.height * 0.46;

      state.cameraX += (targetCamX - state.cameraX) * Math.min(1, dt * 4.5);
      state.cameraY += (targetCamY - state.cameraY) * Math.min(1, dt * 4.2);

      state.cameraX = Math.max(-180, Math.min(WORLD_WIDTH - state.width + 180, state.cameraX));
      state.cameraY = Math.max(-80, Math.min(GROUND_Y - state.height + 90, state.cameraY));
    }

    // Clouds drift
    for (let i = 0; i < state.clouds.length; i++) {
      const cl = state.clouds[i];
      cl.x += cl.speed * dt;
      if (cl.x > WORLD_WIDTH + 400) cl.x = -cl.w - 200;
    }

    // Patrol drones
    for (let i = 0; i < state.drones.length; i++) {
      const d = state.drones[i];
      d.x += d.vx * dt;
      if (d.x < d.rangeMin) {
        d.x = d.rangeMin;
        d.vx = Math.abs(d.vx);
      } else if (d.x > d.rangeMax) {
        d.x = d.rangeMax;
        d.vx = -Math.abs(d.vx);
      }
      d.y = d.baseY + Math.sin(state.time * 2.2 + d.phase) * 18;
    }

    // Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    // Floating texts
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = state.floatingTexts[i];
      ft.y -= 28 * dt;
      ft.life -= dt;
      if (ft.life <= 0) state.floatingTexts.splice(i, 1);
    }
  }
  function updateHudTelemetry() {
    const heli = state.heli;
    if (!heli) return;

    const shiftCfg = SHIFTS[state.shiftIndex] || SHIFTS[0];
    hudScore.textContent = String(state.score).padStart(6, "0");
    hudStreak.textContent = `x${state.streak.toFixed(1)}`;
    hudDeliveries.textContent = `${state.deliveriesInShift} / ${shiftCfg.quota}`;

    const windKnots = Math.round(Math.abs(state.windCurrent) * 0.35);
    const windDir = state.windCurrent >= 0 ? "E" : "W";
    hudWindLabel.textContent = `WIND ${String(windKnots).padStart(2, "0")} KT ${windDir}`;

    const aglFeet = Math.max(0, Math.round((GROUND_Y - (heli.y + 26)) * 1.2));
    hudAlt.textContent = String(aglFeet).padStart(3, "0");
    barCollective.style.width = `${Math.round(heli.collective * 100)}%`;

    // VSI in FT/S (positive = climbing, negative = descending)
    const vsiVal = -heli.vy / 15;
    const vsiFormatted = `${vsiVal >= 0 ? "+" : ""}${vsiVal.toFixed(1)}`;
    hudVsi.textContent = vsiFormatted;

    const descSpeed = Math.max(0, -vsiVal);
    if (heli.onPad) {
      hudVsi.style.color = "#57f2aa";
      hudVsiStatus.textContent = `ON PAD // ${heli.onPad.name}`;
    } else if (descSpeed > 11.0) {
      hudVsi.style.color = "#ff5864";
      hudVsiStatus.textContent = "SINK RATE WARNING — PULL COLLECTIVE [W]";
    } else {
      hudVsi.style.color = "#fff7eb";
      hudVsiStatus.textContent = "TOUCHDOWN SAFE < 11 FT/S";
    }

    const knots = Math.round(Math.hypot(heli.vx, heli.vy) * 0.38);
    hudSpeed.textContent = String(knots).padStart(2, "0");
    const deg = Math.round((heli.pitch * 180) / Math.PI);
    hudAttitude.textContent = `PITCH ${deg >= 0 ? "+" : ""}${deg}° // HDG ${heli.facing > 0 ? "090° E" : "270° W"}`;

    hudFuel.textContent = `${Math.round(heli.fuel)}%`;
    hudHull.textContent = `AIRFRAME ${Math.round(heli.hull)}%`;
    barFuel.style.width = `${Math.round(heli.fuel)}%`;
    hudHull.style.color = heli.hull < 35 ? "#ff5864" : "#ffcb6b";

    const c = state.activeContract;
    if (heli.passenger) {
      hudCabin.textContent = heli.passenger;
      hudCabin.style.color = "#57f2aa";
    } else {
      hudCabin.textContent = "EMPTY";
      hudCabin.style.color = "#fff7eb";
    }

    if (heli.hoistLength > 4) {
      hudHoistState.textContent = `WINCH ${Math.round(heli.hoistLength)} FT`;
    } else {
      hudHoistState.textContent = "HOIST STOWED";
    }

    if (c) {
      const targetT = c.stage === "PICKUP" ? c.originTower : c.destTower;
      hudDestination.textContent =
        c.stage === "PICKUP"
          ? `PICKUP: ${targetT.name} (${Math.ceil(c.timer)}s)`
          : `DEST: ${targetT.name} (${Math.ceil(c.timer)}s)`;
    }
  }

  function renderDopplerRadar() {
    const rw = radarCanvas.width;
    const rh = radarCanvas.height;
    radarCtx.clearRect(0, 0, rw, rh);

    // Subtle radar grid
    radarCtx.strokeStyle = "rgba(92, 230, 255, 0.12)";
    radarCtx.lineWidth = 1;
    radarCtx.beginPath();
    radarCtx.moveTo(0, rh * 0.5);
    radarCtx.lineTo(rw, rh * 0.5);
    radarCtx.moveTo(rw * 0.5, 0);
    radarCtx.lineTo(rw * 0.5, rh);
    radarCtx.stroke();

    const scaleX = rw / WORLD_WIDTH;
    const scaleY = rh / GROUND_Y;

    // Draw towers on radar
    for (let i = 0; i < state.towers.length; i++) {
      const t = state.towers[i];
      const tx = t.x * scaleX;
      const tw = Math.max(3, t.w * scaleX);
      const ty = t.y * scaleY;
      const th = rh - ty;

      radarCtx.fillStyle = t.isMedBase
        ? "rgba(92, 230, 255, 0.45)"
        : "rgba(255, 190, 105, 0.28)";
      radarCtx.fillRect(tx, ty, tw, th);
    }

    // Active contract target blip
    const c = state.activeContract;
    if (c) {
      const targetT = c.stage === "PICKUP" ? c.originTower : c.destTower;
      const bx = targetT.padX * scaleX;
      const by = targetT.padY * scaleY - 3;
      const pulse = 3 + Math.sin(state.time * 7) * 1.8;

      radarCtx.fillStyle = c.stage === "PICKUP" ? "#ffcb6b" : "#57f2aa";
      radarCtx.beginPath();
      radarCtx.arc(bx, by, pulse, 0, Math.PI * 2);
      radarCtx.fill();
    }

    // Helicopter position blip
    if (state.heli) {
      const hx = state.heli.x * scaleX;
      const hy = state.heli.y * scaleY;
      radarCtx.fillStyle = "#ffffff";
      radarCtx.beginPath();
      radarCtx.arc(hx, hy, 3, 0, Math.PI * 2);
      radarCtx.fill();
    }
  }
  function renderScene() {
    const w = state.width;
    const h = state.height;
    const shiftCfg = SHIFTS[state.shiftIndex] || SHIFTS[0];

    ctx.save();
    ctx.scale(state.dpr, state.dpr);

    // 1. Golden Hour Atmospheric Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, shiftCfg.skyTop);
    skyGrad.addColorStop(0.42, shiftCfg.skyMid);
    skyGrad.addColorStop(0.78, shiftCfg.skyHorizon);
    skyGrad.addColorStop(1, "#2a1820");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Warm low-sun atmospheric glow bloom (left-of-center horizon like reference photo)
    const sunScreenX = w * 0.24 - state.cameraX * 0.04;
    const sunScreenY = h * 0.56;
    const sunGlow = ctx.createRadialGradient(
      sunScreenX,
      sunScreenY,
      10,
      sunScreenX,
      sunScreenY,
      Math.max(w, h) * 0.65
    );
    sunGlow.addColorStop(0, "rgba(255, 224, 148, 0.52)");
    sunGlow.addColorStop(0.35, "rgba(255, 152, 72, 0.28)");
    sunGlow.addColorStop(1, "rgba(255, 110, 50, 0)");
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, w, h);

    // 2. Volumetric Sunlit Sunset Clouds
    for (let i = 0; i < state.clouds.length; i++) {
      const cl = state.clouds[i];
      const cx = cl.x - state.cameraX * 0.18;
      const cy = cl.y - state.cameraY * 0.12;
      if (cx + cl.w < -100 || cx > w + 100) continue;

      ctx.save();
      ctx.globalAlpha = cl.alpha;
      const cg = ctx.createLinearGradient(cx, cy, cx, cy + cl.h);
      cg.addColorStop(0, "#5c4966");
      cg.addColorStop(0.65, "#b86b5c");
      cg.addColorStop(1, shiftCfg.skyGlow);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cl.w, cl.h, cl.h * 0.5);
      ctx.fill();
      ctx.restore();
    }

    // 3. Distant City Horizon & Shimmering Street Lights
    const horizonY = h * 0.66 - state.cameraY * 0.18;
    const hazeGrad = ctx.createLinearGradient(0, horizonY - 40, 0, h);
    hazeGrad.addColorStop(0, "rgba(235, 135, 78, 0.26)");
    hazeGrad.addColorStop(0.35, "rgba(52, 32, 42, 0.85)");
    hazeGrad.addColorStop(1, "#120d17");
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, horizonY - 40, w, h - horizonY + 40);

    // Distant background skyscrapers (Parallax Layer 1)
    for (let i = 0; i < state.bgBuildingsFar.length; i++) {
      const b = state.bgBuildingsFar[i];
      const bx = b.x - state.cameraX * 0.32;
      const by = GROUND_Y - b.h - state.cameraY * 0.35;
      if (bx + b.w < -40 || bx > w + 40) continue;

      ctx.fillStyle = "#332430";
      ctx.fillRect(bx, by, b.w, b.h + 200);
      // Warm sunset edge rim on left/sunlit side
      ctx.fillStyle = "rgba(255, 178, 98, 0.22)";
      ctx.fillRect(bx, by, 5, b.h);
    }

    // Midground sunlit towers (Parallax Layer 2)
    for (let i = 0; i < state.bgBuildingsMid.length; i++) {
      const b = state.bgBuildingsMid[i];
      const bx = b.x - state.cameraX * 0.58;
      const by = GROUND_Y - b.h - state.cameraY * 0.62;
      if (bx + b.w < -60 || bx > w + 60) continue;

      // Shadow core + golden glass face
      ctx.fillStyle = "#261d29";
      ctx.fillRect(bx, by, b.w, b.h + 200);

      const sunFaceW = b.w * 0.38;
      const faceGrad = ctx.createLinearGradient(bx, by, bx + sunFaceW, by + b.h);
      faceGrad.addColorStop(0, "rgba(255, 196, 108, 0.55)");
      faceGrad.addColorStop(1, "rgba(195, 105, 58, 0.18)");
      ctx.fillStyle = faceGrad;
      ctx.fillRect(bx, by, sunFaceW, b.h);

      // Subtle window grid
      ctx.fillStyle = "rgba(255, 214, 138, 0.22)";
      for (let wy = by + 14; wy < by + b.h - 20; wy += 18) {
        ctx.fillRect(bx + 6, wy, b.w - 14, 3);
      }
    }

    // 4. World-Space Foreground Interactive Skyscrapers & Entities
    ctx.save();
    ctx.translate(-state.cameraX, -state.cameraY);

    drawUpdraftCanyons();
    drawForegroundTowers();
    drawPatrolDrones();
    drawParticles();

    if (state.heli) {
      drawFenestronHelicopter(state.heli);
    }

    drawFloatingTexts();
    ctx.restore();

    // 5. On-Screen Off-Screen Target Waypoint Indicator
    drawTargetWaypointIndicator(w, h);

    ctx.restore();
  }

  function drawUpdraftCanyons() {
    for (let i = 0; i < state.updrafts.length; i++) {
      const u = state.updrafts[i];
      const isLift = u.strength < 0;
      ctx.save();
      ctx.strokeStyle = isLift
        ? "rgba(255, 210, 120, 0.22)"
        : "rgba(92, 230, 255, 0.18)";
      ctx.lineWidth = 1.5;

      for (let s = 0; s < 5; s++) {
        const sx = u.x - u.w * 0.36 + (s / 4) * u.w * 0.72;
        const offset = ((state.time * (isLift ? -90 : 75) + s * 60) % 220 + 220) % 220;
        const sy = u.topY + offset;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy + 36);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawForegroundTowers() {
    const c = state.activeContract;

    for (let i = 0; i < state.towers.length; i++) {
      const t = state.towers[i];
      if (t.x + t.w < state.cameraX - 120 || t.x > state.cameraX + state.width + 120) {
        continue;
      }

      // Base architectural shadow mass
      ctx.fillStyle = t.facadeStyle === 3 ? "#19151e" : "#241e29";
      ctx.fillRect(t.x, t.y, t.w, t.h + 160);

      // Sunlit golden curtain-wall reflection panel (matching the reference photo's blazing gold glass skyscraper)
      const sunW = t.w * 0.56;
      const glassGrad = ctx.createLinearGradient(t.x, t.y, t.x + sunW, t.y + t.h);
      if (t.facadeStyle === 0 || t.facadeStyle === 1) {
        glassGrad.addColorStop(0, "#ffd47e");
        glassGrad.addColorStop(0.32, "#f09b46");
        glassGrad.addColorStop(0.75, "#874e38");
        glassGrad.addColorStop(1, "#33252e");
      } else {
        glassGrad.addColorStop(0, "#f2b263");
        glassGrad.addColorStop(0.45, "#9e5c3b");
        glassGrad.addColorStop(1, "#29202b");
      }
      ctx.fillStyle = glassGrad;
      ctx.fillRect(t.x, t.y, sunW, t.h);

      // Detailed window mullions & blazing solar reflections
      const cols = Math.floor(t.w / 18);
      const rows = Math.floor(t.h / 20);
      for (let r = 0; r < rows; r++) {
        const wy = t.y + 10 + r * 20;
        for (let col = 0; col < cols; col++) {
          const wx = t.x + 8 + col * 18;
          const isSunSide = col < cols * 0.55;
          const shimmer = seededRandom((i + 1) * 31 + r * 17 + col * 7);

          if (isSunSide) {
            ctx.fillStyle =
              shimmer > 0.45
                ? "rgba(255, 232, 162, 0.78)"
                : "rgba(235, 140, 58, 0.55)";
          } else {
            ctx.fillStyle =
              shimmer > 0.78
                ? "rgba(255, 195, 110, 0.42)"
                : "rgba(18, 16, 26, 0.65)";
          }
          ctx.fillRect(wx, wy, 12, 13);
        }
      }

      // Vertical structural mullions
      ctx.strokeStyle = "rgba(20, 16, 26, 0.55)";
      ctx.lineWidth = 2;
      for (let mx = t.x + 26; mx < t.x + t.w; mx += 36) {
        ctx.beginPath();
        ctx.moveTo(mx, t.y);
        ctx.lineTo(mx, t.y + t.h);
        ctx.stroke();
      }

      // Rooftop Helipad or Hoist Spire
      if (t.isHoistSpire) {
        // Communications spire + smoking HVAC unit + stranded evacuee
        ctx.strokeStyle = "#d9c3a8";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(t.padX - 14, t.y);
        ctx.lineTo(t.padX, t.y - t.spireHeight);
        ctx.lineTo(t.padX + 14, t.y);
        ctx.stroke();

        // Blinking red FAA beacon on spire tip
        const blink = Math.sin(state.time * 6 + i) > 0;
        ctx.fillStyle = blink ? "#ff3b4e" : "#6e1822";
        ctx.beginPath();
        ctx.arc(t.padX, t.y - t.spireHeight, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Elevated Helipad Deck [H]
        const padW = t.padRadius * 2;
        ctx.fillStyle = t.isMedBase ? "#16384c" : "#382e3c";
        ctx.fillRect(t.padX - t.padRadius, t.y - 6, padW, 6);

        // Glowing perimeter pad lights
        const lightColor = t.isMedBase ? "#5ce6ff" : "#ffcb6b";
        ctx.fillStyle = lightColor;
        for (let lx = -t.padRadius + 6; lx <= t.padRadius - 6; lx += 18) {
          ctx.fillRect(t.padX + lx - 2, t.y - 8, 4, 3);
        }
      }

      // Tower Nameplate on roof fascia
      ctx.fillStyle = "rgba(12, 15, 26, 0.78)";
      ctx.fillRect(t.padX - 66, t.y + 8, 132, 18);
      ctx.fillStyle = t.isMedBase ? "#5ce6ff" : "#ffe0a3";
      ctx.font = "700 10px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        t.isMedBase ? `✚ ${t.name}` : t.name,
        t.padX,
        t.y + 20
      );

      // Active Mission Beacon / Passenger Visual
      const isPickupTarget = c && c.stage === "PICKUP" && c.originTower.id === t.id;
      const isDropoffTarget = c && c.stage === "DROPOFF" && c.destTower.id === t.id;

      if (isPickupTarget || isDropoffTarget) {
        const beamColor = isPickupTarget ? "255, 203, 107" : "87, 242, 170";
        const beamGrad = ctx.createLinearGradient(0, t.y - 190, 0, t.y);
        beamGrad.addColorStop(0, `rgba(${beamColor}, 0)`);
        beamGrad.addColorStop(1, `rgba(${beamColor}, 0.34)`);
        ctx.fillStyle = beamGrad;
        ctx.fillRect(t.padX - 38, t.y - 190, 76, 190);

        // Draw waiting VIP or stranded spire engineer
        if (isPickupTarget) {
          const px = t.padX + (t.isHoistSpire ? 22 : 0);
          const py = t.y - 6;
          // Waving passenger figure
          ctx.fillStyle = "#ffcb6b";
          ctx.beginPath();
          ctx.arc(px, py - 14, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(px, py - 10);
          ctx.lineTo(px, py - 2);
          ctx.moveTo(px - 5, py - 8);
          ctx.lineTo(px + 6, py - 13 - Math.sin(state.time * 10) * 3);
          ctx.stroke();

          // Progress ring when hoisting
          if (t.isHoistSpire && c.hoistProgress > 0) {
            ctx.strokeStyle = "#5ce6ff";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(
              px,
              py - 10,
              16,
              -Math.PI / 2,
              -Math.PI / 2 + c.hoistProgress * Math.PI * 2
            );
            ctx.stroke();
          }
        }
      }
    }
  }
  function drawPatrolDrones() {
    for (let i = 0; i < state.drones.length; i++) {
      const d = state.drones[i];
      ctx.save();
      ctx.translate(d.x, d.y);

      // Quadrotor frame
      ctx.strokeStyle = "#d8e6f2";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();

      ctx.fillStyle = "#1d2738";
      ctx.beginPath();
      ctx.roundRect(-7, -4, 14, 8, 3);
      ctx.fill();

      // Blinking amber/red collision strobe
      const strobe = Math.sin(state.time * 12 + d.phase) > 0;
      ctx.fillStyle = strobe ? "#ff5864" : "#5ce6ff";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function drawParticles() {
    for (let i = 0; i < state.particles.length; i++) {
      const p = state.particles[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawFloatingTexts() {
    for (let i = 0; i < state.floatingTexts.length; i++) {
      const ft = state.floatingTexts[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      ctx.font = "800 13px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = ft.color;
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  // Detailed Blue-and-White Shrouded-Tail Fenestron Helicopter Renderer
  function drawFenestronHelicopter(heli) {
    ctx.save();
    ctx.translate(heli.x, heli.y);

    // Draw rescue hoist cable in world orientation before fuselage pitch
    if (heli.hoistLength > 2) {
      const sway = Math.sin(state.time * 5) * (heli.hoistLength * 0.05) - heli.vx * 0.04;
      const endX = sway;
      const endY = 20 + heli.hoistLength;

      ctx.strokeStyle = "#d9e8f5";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Rescue basket / hook
      ctx.fillStyle = "#ffcb6b";
      ctx.beginPath();
      ctx.arc(endX, endY, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.rotate(heli.pitch);
    const scaleX = Math.abs(heli.visualFacing) < 0.15 ? 0.15 : heli.visualFacing;
    ctx.scale(scaleX, 1);

    // Blinking invulnerability flash if damaged recently
    if (heli.invulnTimer > 0 && Math.floor(state.time * 18) % 2 === 0) {
      ctx.globalAlpha = 0.6;
    }

    // 1. Nose FLIR Searchlight Cone
    if (heli.spotlightOn) {
      ctx.save();
      ctx.translate(42, 11);
      ctx.rotate(0.42);
      const spotGrad = ctx.createLinearGradient(0, 0, 260, 0);
      spotGrad.addColorStop(0, "rgba(255, 232, 168, 0.42)");
      spotGrad.addColorStop(1, "rgba(255, 200, 110, 0)");
      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(260, -48);
      ctx.lineTo(260, 58);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 2. Twin Tubular Landing Skids with Yellow Tips (matching reference image)
    const skidY = 24 - heli.skidCompress * 4;
    ctx.strokeStyle = "#d8e2eb";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    // Struts
    ctx.moveTo(-10, 12);
    ctx.lineTo(-14, skidY);
    ctx.moveTo(18, 12);
    ctx.lineTo(20, skidY);
    // Main skid tube
    ctx.moveTo(-28, skidY);
    ctx.lineTo(34, skidY);
    ctx.stroke();

    // Yellow safety tips on front of skids
    ctx.strokeStyle = "#ffcb47";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(32, skidY);
    ctx.lineTo(39, skidY - 4);
    ctx.stroke();

    // 3. Tail Boom & Iconic Shrouded Fenestron Tail Fan
    // Golden sunset motion-blur arcs behind tail fin (signature detail in photo!)
    ctx.save();
    ctx.strokeStyle = "rgba(255, 168, 72, 0.48)";
    ctx.lineWidth = 2.2;
    for (let a = 0; a < 3; a++) {
      const r = 18 + a * 4.5;
      ctx.beginPath();
      ctx.arc(-62, -4, r, Math.PI * 0.72, Math.PI * 1.28);
      ctx.stroke();
    }
    ctx.restore();

    // Tail boom body
    const boomGrad = ctx.createLinearGradient(-62, -8, -14, 8);
    boomGrad.addColorStop(0, "#0b4f8c");
    boomGrad.addColorStop(0.55, "#1972bd");
    boomGrad.addColorStop(1, "#093a69");
    ctx.fillStyle = boomGrad;
    ctx.beginPath();
    ctx.moveTo(-14, -4);
    ctx.lineTo(-56, -6);
    ctx.lineTo(-56, 3);
    ctx.lineTo(-14, 9);
    ctx.closePath();
    ctx.fill();

    // White & gold trim line along tail boom
    ctx.strokeStyle = "#ffd27d";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(-54, -2);
    ctx.stroke();

    // Shrouded Fenestron housing & swept upper tail fin
    ctx.fillStyle = "#125ea3";
    ctx.beginPath();
    ctx.arc(-61, -1, 11.5, 0, Math.PI * 2);
    ctx.fill();

    // Upper swept white fin with golden emblem
    ctx.fillStyle = "#f4f7fb";
    ctx.beginPath();
    ctx.moveTo(-67, -8);
    ctx.lineTo(-73, -29);
    ctx.lineTo(-61, -28);
    ctx.lineTo(-53, -8);
    ctx.closePath();
    ctx.fill();

    // Gold emblem on vertical fin
    ctx.fillStyle = "#f29b38";
    ctx.beginPath();
    ctx.moveTo(-67, -18);
    ctx.lineTo(-61, -22);
    ctx.lineTo(-63, -14);
    ctx.closePath();
    ctx.fill();

    // Fenestron inner duct & spinning multi-blade fan
    ctx.fillStyle = "#2b1d24";
    ctx.beginPath();
    ctx.arc(-61, -1, 7.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(-61, -1);
    ctx.rotate(heli.fenestronPhase);
    ctx.strokeStyle = "rgba(255, 210, 145, 0.85)";
    ctx.lineWidth = 1.6;
    for (let b = 0; b < 5; b++) {
      ctx.rotate((Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(7, 0);
      ctx.stroke();
    }
    ctx.restore();
    // 4. Streamlined White & Metallic-Blue Main Cabin Fuselage
    ctx.fillStyle = "#f5f8fc";
    ctx.beginPath();
    ctx.moveTo(-22, -5);
    ctx.quadraticCurveTo(-15, -16, 12, -15);
    ctx.quadraticCurveTo(32, -13, 47, 2);
    ctx.quadraticCurveTo(51, 7, 44, 10);
    ctx.lineTo(-20, 8);
    ctx.closePath();
    ctx.fill();

    // Twin-turbine upper blue cowling & dark exhaust nozzle
    ctx.fillStyle = "#1262ab";
    ctx.beginPath();
    ctx.moveTo(-20, -14);
    ctx.quadraticCurveTo(-5, -22, 12, -19);
    ctx.lineTo(16, -13);
    ctx.lineTo(-18, -11);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#222530";
    ctx.beginPath();
    ctx.ellipse(-20, -14, 4.5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Metallic azure-blue lower belly
    const bellyGrad = ctx.createLinearGradient(0, 2, 0, 16);
    bellyGrad.addColorStop(0, "#1974c4");
    bellyGrad.addColorStop(1, "#0a3f73");
    ctx.fillStyle = bellyGrad;
    ctx.beginPath();
    ctx.moveTo(-22, 4);
    ctx.quadraticCurveTo(8, 2, 46, 7);
    ctx.quadraticCurveTo(40, 15, 16, 15);
    ctx.lineTo(-16, 12);
    ctx.closePath();
    ctx.fill();

    // Golden-hour cheatline stripe separating white cabin and blue belly
    ctx.strokeStyle = "#ffbe55";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-20, 4);
    ctx.quadraticCurveTo(10, 1, 44, 7);
    ctx.stroke();

    // Under-nose FLIR turret gimbal pod
    ctx.fillStyle = "#171c26";
    ctx.beginPath();
    ctx.arc(38, 13, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff9d42";
    ctx.beginPath();
    ctx.arc(40, 13, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // 5. Cabin Windows with Blazing Golden Sunset Glare (matching reference photo!)
    const winGrad = ctx.createLinearGradient(-10, -11, 16, 4);
    winGrad.addColorStop(0, "#243447");
    winGrad.addColorStop(0.45, "#ffae42");
    winGrad.addColorStop(0.75, "#fff0a8");
    winGrad.addColorStop(1, "#402c2a");

    ctx.fillStyle = winGrad;
    ctx.beginPath();
    ctx.roundRect(-11, -10, 10, 10, 2.5);
    ctx.roundRect(2, -10, 11, 10, 2.5);
    ctx.fill();

    // Cockpit side window & forward wraparound windshield
    ctx.fillStyle = "rgba(28, 38, 52, 0.88)";
    ctx.beginPath();
    ctx.moveTo(16, -10);
    ctx.lineTo(27, -10);
    ctx.lineTo(31, 0);
    ctx.lineTo(16, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(42, 58, 78, 0.82)";
    ctx.beginPath();
    ctx.moveTo(29, -10);
    ctx.quadraticCurveTo(38, -7, 43, 1);
    ctx.lineTo(32, 0);
    ctx.closePath();
    ctx.fill();

    // 6. Main Rotor Mast, Swashplate & 4-Blade Blur Cone
    ctx.fillStyle = "#2b3545";
    ctx.fillRect(-3, -27, 5, 8);
    ctx.fillStyle = "#95a7b8";
    ctx.beginPath();
    ctx.ellipse(-0.5, -27, 6.5, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    const span = 88;
    const bladeExtend = Math.cos(heli.rotorPhase) * span;
    const bladeExtend2 = Math.sin(heli.rotorPhase) * span;

    const discGrad = ctx.createLinearGradient(-span, -28, span, -28);
    discGrad.addColorStop(0, "rgba(255, 200, 130, 0.05)");
    discGrad.addColorStop(0.5, "rgba(220, 230, 245, 0.28)");
    discGrad.addColorStop(1, "rgba(255, 200, 130, 0.05)");
    ctx.fillStyle = discGrad;
    ctx.beginPath();
    ctx.ellipse(0, -28, span, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(32, 38, 48, 0.85)";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-bladeExtend, -28 - bladeExtend * 0.02);
    ctx.lineTo(bladeExtend, -28 + bladeExtend * 0.02);
    ctx.moveTo(-bladeExtend2, -28 + bladeExtend2 * 0.02);
    ctx.lineTo(bladeExtend2, -28 - bladeExtend2 * 0.02);
    ctx.stroke();

    ctx.restore();
  }
  function drawTargetWaypointIndicator(w, h) {
    const c = state.activeContract;
    if (!c) return;
    const targetT = c.stage === "PICKUP" ? c.originTower : c.destTower;
    const screenX = targetT.padX - state.cameraX;
    const screenY = targetT.padY - 40 - state.cameraY;

    const color = c.stage === "PICKUP" ? "#ffcb6b" : "#57f2aa";
    const distMeters = Math.round(
      Math.abs(targetT.padX - (state.heli ? state.heli.x : 0)) * 0.4
    );

    if (screenX >= 40 && screenX <= w - 40 && screenY >= 70 && screenY <= h - 90) {
      const bob = Math.sin(state.time * 5) * 5;
      ctx.save();
      ctx.translate(screenX, screenY + bob);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = "rgba(12, 16, 28, 0.82)";
      ctx.fillRect(-54, -32, 108, 16);
      ctx.fillStyle = color;
      ctx.font = "800 10px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        c.stage === "PICKUP"
          ? targetT.isHoistSpire
            ? "▼ HOIST [SPACE]"
            : "▼ LAND PICKUP"
          : "▼ VIP DROPOFF",
        0,
        -21
      );
      ctx.restore();
    } else {
      const clampedX = Math.max(70, Math.min(w - 70, screenX));
      const clampedY = Math.max(95, Math.min(h - 115, screenY));
      const isRight = screenX > w * 0.5;

      ctx.save();
      ctx.translate(clampedX, clampedY);
      ctx.fillStyle = "rgba(12, 16, 28, 0.88)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(-62, -16, 124, 32, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = "800 11px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `${isRight ? "▶" : "◀"} ${targetT.name} (${distMeters}M)`,
        0,
        4
      );
      ctx.restore();
    }
  }

  let lastFrameTime = performance.now();

  function frameLoop(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
    lastFrameTime = now;

    if (state.mode !== "paused") {
      state.time += dt;
      if (state.mode === "attract") {
        updateAttractAutopilot(dt);
      } else if (state.mode === "playing") {
        updatePlayerFlight(dt);
        evaluateCollisionsAndMissions(dt);
      }
      updateWorldEntities(dt);
      updateHudTelemetry();
      renderDopplerRadar();
    }

    renderScene();
    requestAnimationFrame(frameLoop);
  }

  bindInputs();
  setupShift(0, true);
  requestAnimationFrame(frameLoop);













})();
