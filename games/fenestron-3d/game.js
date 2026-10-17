(() => {
  "use strict";

  const canvas = document.getElementById("viewport-3d");
  const ctx = canvas.getContext("2d");
  const radarCanvas = document.getElementById("radar-3d");
  const radarCtx = radarCanvas.getContext("2d");

  const audio = new window.SpatialRotorAudio();

  // HUD DOM elements
  const hudShift = document.getElementById("hud-shift");
  const hudHeading = document.getElementById("hud-heading");
  const hudDispatch = document.getElementById("hud-dispatch");
  const hudScore = document.getElementById("hud-score");
  const hudStreak = document.getElementById("hud-streak");
  const hudQuota = document.getElementById("hud-quota");
  const hudDist = document.getElementById("hud-dist");
  const hudAlt = document.getElementById("hud-alt");
  const barColl = document.getElementById("bar-coll");
  const hudVsi = document.getElementById("hud-vsi");
  const hudVsiHint = document.getElementById("hud-vsi-hint");
  const hudSpd = document.getElementById("hud-spd");
  const hudAtt = document.getElementById("hud-att");
  const hudFuel = document.getElementById("hud-fuel");
  const hudHull = document.getElementById("hud-hull");
  const barFuel = document.getElementById("bar-fuel");
  const hudManifest = document.getElementById("hud-manifest");
  const hudWinch = document.getElementById("hud-winch");
  const hudMissionTarget = document.getElementById("hud-mission-target");

  const btnLaunch = document.getElementById("btn-launch");
  const btnCam = document.getElementById("btn-cam");
  const btnMute = document.getElementById("btn-mute");
  const btnPause = document.getElementById("btn-pause");

  const modalBackdrop = document.getElementById("modal-backdrop");
  const modalTag = document.getElementById("modal-tag");
  const modalHeading = document.getElementById("modal-heading");
  const modalCopy = document.getElementById("modal-copy");
  const modalMetrics = document.getElementById("modal-metrics");
  const btnModalGo = document.getElementById("btn-modal-go");
  const btnModalReset = document.getElementById("btn-modal-reset");

  const SECTORS = [
    {
      name: "SECTOR 01 / 06 — GOLDEN HORIZON",
      quota: 3,
      drones: 4,
      windX: 8,
      windZ: 4,
      skyTop: "#3a2f4c",
      skyMid: "#9c5958",
      skyHorizon: "#f79b4f",
      sunColor: "#ffe296"
    },
    {
      name: "SECTOR 02 / 06 — AMBER GLASS CANYON",
      quota: 3,
      drones: 5,
      windX: 14,
      windZ: -10,
      skyTop: "#2f2744",
      skyMid: "#8c4850",
      skyHorizon: "#f2813b",
      sunColor: "#ffd074"
    },
    {
      name: "SECTOR 03 / 06 — SUNSET UPDRAFT GRID",
      quota: 4,
      drones: 6,
      windX: -18,
      windZ: 15,
      skyTop: "#25203b",
      skyMid: "#783a4c",
      skyHorizon: "#e66b35",
      sunColor: "#ffbe58"
    },
    {
      name: "SECTOR 04 / 06 — CRIMSON CITADEL",
      quota: 4,
      drones: 7,
      windX: 22,
      windZ: 18,
      skyTop: "#1d1a33",
      skyMid: "#622e47",
      skyHorizon: "#d15434",
      sunColor: "#ff9e44"
    },
    {
      name: "SECTOR 05 / 06 — VIOLET ALPENGLOW",
      quota: 5,
      drones: 8,
      windX: -25,
      windZ: -20,
      skyTop: "#141429",
      skyMid: "#492442",
      skyHorizon: "#b84537",
      sunColor: "#ff8636"
    },
    {
      name: "SECTOR 06 / 06 — TWILIGHT SOVEREIGN",
      quota: 5,
      drones: 10,
      windX: 30,
      windZ: -24,
      skyTop: "#0c0e1f",
      skyMid: "#341b3b",
      skyHorizon: "#943536",
      sunColor: "#f56d31"
    }
  ];

  const TOWER_NAMES = [
    "SOLARIS CROWN",
    "MERIDIAN PLAZA",
    "AURELIA TRUST",
    "FENESTRON SPIRE",
    "HELIOS EXCHANGE",
    "CITADEL GLASS",
    "STRATOS MED-BASE",
    "VANGUARD DECK",
    "PACIFICA TOWER",
    "MONARCH CENTER",
    "ZENITH CONSULATE",
    "ORION MED-BASE",
    "VERIDIAN OBELISK",
    "KENSINGTON HEIGHTS",
    "AEGIS TERMINAL",
    "NOVA HELIPORT"
  ];

  const VIP_ROLES = [
    "DIPLOMATIC ENVOY",
    "SKYLINE ARCHITECT",
    "TRAUMA SURGEON",
    "TURBINE ENGINEER",
    "EXECUTIVE DIRECTOR",
    "AERIAL JOURNALIST"
  ];

  const CAMERA_MODES = ["CHASE", "COCKPIT", "ORBIT"];

  const state = {
    mode: "attract", // attract | playing | paused | sector_clear | gameover | victory
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    time: 0,
    sectorIdx: 0,
    score: 0,
    streak: 1.0,
    deliveries: 0,
    totalDeliveries: 0,
    camModeIdx: 0,
    cam: {
      x: 0,
      y: 260,
      z: -240,
      yaw: 0,
      pitch: -0.18,
      roll: 0,
      fov: 680
    },
    towers: [],
    traffic: [],
    drones: [],
    particles: [],
    contract: null,
    alertText: "",
    alertTimer: 0,
    heli: null
  };

  function createHeli3D(x, y, z) {
    return {
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0.6, // radians (0 = +Z North, PI/2 = +X East)
      pitch: 0,
      roll: 0,
      collective: 0.5,
      rotorAngle: 0,
      fenestronAngle: 0,
      skidCompression: 0,
      fuel: 100,
      hull: 100,
      onTower: null,
      passenger: null,
      winchLen: 0,
      winchActive: false,
      invuln: 0
    };
  }
  const keys = {};

  function bindEvents() {
    window.addEventListener("keydown", (e) => {
      keys[e.code] = true;

      if (state.mode === "attract") {
        if (e.code === "Enter" || e.code === "Space") {
          e.preventDefault();
          startCampaign();
        }
        return;
      }

      if (e.code === "KeyC") {
        cycleCameraMode();
      } else if (e.code === "KeyM") {
        toggleMute();
      } else if (e.code === "Escape" || e.code === "KeyP") {
        if (state.mode === "playing") pauseSortie();
        else if (state.mode === "paused") resumeSortie();
      } else if (e.code === "Enter" && state.mode !== "playing") {
        handleModalAction();
      }
    });

    window.addEventListener("keyup", (e) => {
      keys[e.code] = false;
    });

    document.querySelectorAll(".t-btn").forEach((btn) => {
      const code = btn.getAttribute("data-key");
      if (!code) return;
      const down = (ev) => {
        ev.preventDefault();
        keys[code] = true;
      };
      const up = (ev) => {
        ev.preventDefault();
        keys[code] = false;
      };
      btn.addEventListener("pointerdown", down);
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointerleave", up);
      btn.addEventListener("pointercancel", up);
    });

    btnLaunch.addEventListener("click", () => startCampaign());
    btnCam.addEventListener("click", () => cycleCameraMode());
    btnMute.addEventListener("click", () => toggleMute());
    btnPause.addEventListener("click", () => {
      if (state.mode === "playing") pauseSortie();
      else if (state.mode === "paused") resumeSortie();
    });
    btnModalGo.addEventListener("click", () => handleModalAction());
    btnModalReset.addEventListener("click", () => startCampaign());

    window.addEventListener("resize", onResize);
    onResize();
  }

  function onResize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    state.cam.fov = Math.min(state.width, state.height) * 0.66;
  }

  function cycleCameraMode() {
    state.camModeIdx = (state.camModeIdx + 1) % CAMERA_MODES.length;
    btnCam.textContent = `CAM: ${CAMERA_MODES[state.camModeIdx]} [C]`;
    audio.chime("dispatch");
  }

  function toggleMute() {
    audio.init();
    const m = audio.toggleMute();
    btnMute.textContent = m ? "AUDIO: OFF [M]" : "AUDIO: ON [M]";
  }

  function seeded(seed) {
    const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function generate3DCity(sectorIdx) {
    state.towers = [];
    const gridCoords = [
      [-920, -900], [-320, -920], [320, -900], [920, -880],
      [-940, -300], [-310, -280], [310, -310], [940, -290],
      [-900, 310],  [-300, 320],  [320, 300],  [920, 320],
      [-880, 920],  [-290, 900],  [330, 920],  [900, 910]
    ];

    for (let i = 0; i < gridCoords.length; i++) {
      const [gx, gz] = gridCoords[i];
      const r1 = seeded((i + 1) * 19 + sectorIdx * 7);
      const r2 = seeded((i + 1) * 43 + sectorIdx * 13);
      const r3 = seeded((i + 1) * 79 + sectorIdx * 23);

      const x = gx + (r1 - 0.5) * 70;
      const z = gz + (r2 - 0.5) * 70;
      const wx = 130 + Math.floor(r1 * 55);
      const wz = 130 + Math.floor(r2 * 55);
      const h = 210 + Math.floor(r3 * 310);

      const isMedBase = i === 6 || i === 11;
      const isSpire = !isMedBase && (i === 3 || i === 8 || i === 14);

      state.towers.push({
        id: i,
        name: TOWER_NAMES[i % TOWER_NAMES.length],
        x,
        z,
        rx: wx * 0.5,
        rz: wz * 0.5,
        h,
        isMedBase,
        isSpire,
        spireH: isSpire ? 78 : 0,
        padRadius: Math.min(wx, wz) * 0.36,
        style: i % 3,
        hasSetback: i % 3 === 1 && !isMedBase,
        setbackH: Math.floor(h * 0.68),
        mullionCols: 3 + (i % 3),
        seed: i * 37 + sectorIdx
      });

      // Add realistic mid-rise companion annex building on the same city block
      const sideX = x + (i % 2 === 0 ? 1 : -1) * (wx * 0.5 + 52);
      const sideZ = z + (i % 3 === 0 ? 1 : -1) * 28;
      state.towers.push({
        id: 200 + i,
        name: "",
        x: sideX,
        z: sideZ,
        rx: 38 + (i % 3) * 8,
        rz: 42 + (i % 2) * 10,
        h: 75 + Math.floor(r2 * 85),
        isMedBase: false,
        isSpire: false,
        spireH: 0,
        padRadius: 0,
        isAnnex: true,
        style: (i + 1) % 3,
        mullionCols: 2,
        seed: i * 53
      });
    }

    // Decorative outer skyline ring for deep 3D horizon
    const ringCount = 28;
    for (let k = 0; k < ringCount; k++) {
      const ang = (k / ringCount) * Math.PI * 2;
      const dist = 1650 + seeded(k * 37) * 350;
      const h = 150 + seeded(k * 61) * 290;
      const rw = 85 + seeded(k * 29) * 50;
      state.towers.push({
        id: 100 + k,
        name: "",
        x: Math.cos(ang) * dist,
        z: Math.sin(ang) * dist,
        rx: rw,
        rz: rw,
        h,
        isMedBase: false,
        isSpire: false,
        spireH: 0,
        padRadius: 0,
        isOuter: true,
        style: k % 3,
        mullionCols: 2,
        seed: k * 19
      });
    }

    // Generate 3D Street Traffic on Avenues (X = -600, 0, 600) & Boulevards (Z = -600, 0, 600)
    state.traffic = [];
    const avenues = [-1200, -600, 0, 600, 1200];
    let vId = 0;
    for (let a = 0; a < avenues.length; a++) {
      const roadCoord = avenues[a];
      const carsPerRoad = 10;
      for (let c = 0; c < carsPerRoad; c++) {
        vId++;
        const dir = c % 2 === 0 ? 1 : -1;
        const laneOffset = dir * 16;
        const posAlong = -1450 + (c / carsPerRoad) * 2900 + (seeded(vId * 17) - 0.5) * 140;
        const spd = 65 + seeded(vId * 31) * 55;
        const kindRand = seeded(vId * 47);
        const kind = kindRand > 0.88 ? "emergency" : kindRand > 0.72 ? "bus" : kindRand > 0.48 ? "taxi" : "sedan";

        // North-South Avenue vehicle
        state.traffic.push({
          axis: "Z",
          x: roadCoord + laneOffset,
          z: posAlong,
          dir,
          speed: spd,
          kind,
          len: kind === "bus" ? 22 : 12,
          width: kind === "bus" ? 6.5 : 5.2,
          height: kind === "bus" ? 6.5 : 4.2,
          bodyColor:
            kind === "taxi"
              ? "#f5b82e"
              : kind === "bus"
              ? "#295f99"
              : kind === "emergency"
              ? "#f0f4f8"
              : vId % 3 === 0
              ? "#303846"
              : "#7a3038"
        });

        // East-West Boulevard vehicle
        state.traffic.push({
          axis: "X",
          x: -posAlong,
          z: roadCoord - laneOffset,
          dir: -dir,
          speed: spd * 0.95,
          kind,
          len: kind === "bus" ? 22 : 12,
          width: kind === "bus" ? 6.5 : 5.2,
          height: kind === "bus" ? 6.5 : 4.2,
          bodyColor:
            kind === "taxi"
              ? "#f5b82e"
              : kind === "bus"
              ? "#d9dcd6"
              : kind === "emergency"
              ? "#d92b38"
              : vId % 2 === 0
              ? "#222936"
              : "#4d5866"
        });
      }
    }

    // 3D Patrol Drones
    const cfg = SECTORS[sectorIdx] || SECTORS[0];
    state.drones = [];
    for (let d = 0; d < cfg.drones; d++) {
      const orbitR = 380 + (d % 3) * 320;
      const alt = 220 + (d % 4) * 75;
      state.drones.push({
        angle: (d / cfg.drones) * Math.PI * 2,
        orbitR,
        speed: (d % 2 === 0 ? 1 : -1) * (0.28 + sectorIdx * 0.03),
        y: alt,
        x: Math.cos(d) * orbitR,
        z: Math.sin(d) * orbitR
      });
    }
  }
  function spawnContract3D() {
    const coreTowers = state.towers.filter(
      (t) => !t.isOuter && !t.isAnnex && !t.isMedBase
    );
    if (coreTowers.length < 2) return;

    const heli = state.heli;
    let origin = coreTowers[Math.floor(Math.random() * coreTowers.length)];
    for (let tries = 0; tries < 10; tries++) {
      const candidate = coreTowers[Math.floor(Math.random() * coreTowers.length)];
      const d = heli ? Math.hypot(candidate.x - heli.x, candidate.z - heli.z) : 800;
      if (d > 420 && d < 1850) {
        origin = candidate;
        break;
      }
    }

    const destPool = state.towers.filter(
      (t) => !t.isOuter && !t.isAnnex && t.id !== origin.id && !t.isSpire
    );
    let dest = destPool[Math.floor(Math.random() * destPool.length)];
    for (let tries = 0; tries < 10; tries++) {
      const candidate = destPool[Math.floor(Math.random() * destPool.length)];
      if (Math.hypot(candidate.x - origin.x, candidate.z - origin.z) > 680) {
        dest = candidate;
        break;
      }
    }

    const role = VIP_ROLES[Math.floor(Math.random() * VIP_ROLES.length)];
    const dist = Math.hypot(dest.x - origin.x, dest.z - origin.z);
    const timer = Math.round(38 + dist / 45);

    state.contract = {
      type: origin.isSpire ? "SPIRE_HOIST" : "VIP_CHARTER",
      role,
      origin,
      dest,
      stage: "PICKUP",
      timer,
      maxTimer: timer,
      reward: origin.isSpire ? 1950 : 1500,
      hoistProgress: 0
    };

    if (state.mode === "playing") {
      audio.chime("dispatch");
      hudDispatch.textContent = origin.isSpire
        ? `3D SPIRE EVAC: Hover above ${origin.name} & hold [SPACE] to hoist ${role}`
        : `3D VIP DISPATCH: Fly to ${origin.name} [H] and land gently (<12 FT/S)`;
    }
  }

  function startCampaign() {
    audio.init();
    audio.chime("sector");
    state.sectorIdx = 0;
    state.score = 0;
    state.streak = 1.0;
    state.deliveries = 0;
    state.totalDeliveries = 0;
    state.particles = [];

    loadSector(0, true);
    state.mode = "playing";
    document.body.dataset.state = "playing";
    modalBackdrop.hidden = true;
  }

  function loadSector(idx, fullReset = false) {
    state.sectorIdx = idx;
    state.deliveries = 0;
    const cfg = SECTORS[idx] || SECTORS[0];
    hudShift.textContent = cfg.name;
    generate3DCity(idx);

    const medTower = state.towers.find((t) => t.isMedBase) || state.towers[0];
    if (!state.heli || fullReset) {
      state.heli = createHeli3D(medTower.x, medTower.h + 14, medTower.z);
    } else {
      state.heli.x = medTower.x;
      state.heli.y = medTower.h + 14;
      state.heli.z = medTower.z;
      state.heli.vx = 0;
      state.heli.vy = 0;
      state.heli.vz = 0;
      state.heli.pitch = 0;
      state.heli.roll = 0;
      state.heli.fuel = 100;
      state.heli.hull = Math.min(100, state.heli.hull + 35);
      state.heli.passenger = null;
      state.heli.winchLen = 0;
    }

    // Snap camera immediately behind helicopter on sector start
    state.cam.x = state.heli.x - Math.sin(state.heli.yaw) * 235;
    state.cam.z = state.heli.z - Math.cos(state.heli.yaw) * 235;
    state.cam.y = state.heli.y + 72;
    state.cam.yaw = state.heli.yaw;
    state.cam.pitch = -0.14;

    spawnContract3D();
  }

  function pauseSortie() {
    if (state.mode !== "playing") return;
    state.mode = "paused";
    document.body.dataset.state = "paused";
    openModal(
      "3D FLIGHT DECK HOLD",
      "SORTIE PAUSED",
      "Twin turbines holding station above the golden-hour skyline.",
      "RESUME SORTIE [ENTER]"
    );
  }

  function resumeSortie() {
    if (state.mode !== "paused") return;
    state.mode = "playing";
    document.body.dataset.state = "playing";
    modalBackdrop.hidden = true;
  }

  function completeSector() {
    audio.chime("sector");
    if (state.sectorIdx + 1 >= SECTORS.length) {
      state.mode = "victory";
      document.body.dataset.state = "victory";
      openModal(
        "ALL 6 3D SECTORS COMPLETE",
        "GOLDEN HORIZON ACE",
        "You mastered 3D rotorcraft flight across every high-rise helipad and spire in the city!",
        "NEW 3D CAMPAIGN [ENTER]"
      );
    } else {
      state.mode = "sector_clear";
      document.body.dataset.state = "sector_clear";
      const next = SECTORS[state.sectorIdx + 1];
      openModal(
        `SECTOR 0${state.sectorIdx + 1} COMPLETE`,
        "ADVANCING TO NEXT SECTOR",
        `Jet-A1 refueled and airframe inspected. Next airspace: ${next.name}.`,
        "LAUNCH NEXT SECTOR [ENTER]"
      );
    }
  }

  function endGameOver(reason) {
    audio.chime("warn");
    state.mode = "gameover";
    document.body.dataset.state = "gameover";
    openModal("MAYDAY // 3D FLIGHT TERMINATED", "ROTORCRAFT GROUNDED", reason, "RETRY CAMPAIGN [ENTER]");
  }

  function openModal(tag, heading, copy, btnLabel) {
    modalTag.textContent = tag;
    modalHeading.textContent = heading;
    modalCopy.textContent = copy;
    btnModalGo.textContent = btnLabel;
    modalMetrics.innerHTML = `
      <div class="m-pill"><span>CREDITS</span><strong>$${state.score.toLocaleString()}</strong></div>
      <div class="m-pill"><span>SORTIES</span><strong>${state.totalDeliveries}</strong></div>
      <div class="m-pill"><span>MULTIPLIER</span><strong>x${state.streak.toFixed(1)}</strong></div>
    `;
    modalBackdrop.hidden = false;
  }

  function handleModalAction() {
    if (state.mode === "paused") resumeSortie();
    else if (state.mode === "sector_clear") {
      loadSector(state.sectorIdx + 1, false);
      state.mode = "playing";
      document.body.dataset.state = "playing";
      modalBackdrop.hidden = true;
    } else {
      startCampaign();
    }
  }
  function showAlert(msg) {
    state.alertText = msg;
    state.alertTimer = 2.4;
  }

  // Autonomous 3D AI Autopilot for Attract Screen
  function updateAttractAutopilot3D(dt) {
    const h = state.heli;
    if (!h) return;

    const c = state.contract;
    const tgt = c ? (c.stage === "PICKUP" ? c.origin : c.dest) : state.towers[2];
    if (!tgt) return;

    const dx = tgt.x - h.x;
    const dz = tgt.z - h.z;
    const distXZ = Math.hypot(dx, dz);

    const desiredYaw = Math.atan2(dx, dz);
    let diffYaw = desiredYaw - h.yaw;
    while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
    while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;

    h.yaw += diffYaw * Math.min(1, dt * 2.2);
    h.roll += (Math.max(-0.32, Math.min(0.32, diffYaw * 0.7)) - h.roll) * Math.min(1, dt * 4);

    const cruiseAlt = Math.max(tgt.h + (tgt.isSpire ? 95 : 42), 340);
    const targetY = distXZ < 180 ? tgt.h + (tgt.isSpire ? 88 : 16) : cruiseAlt;

    const fwdSpeed = Math.min(185, distXZ * 0.65);
    const targetVx = Math.sin(h.yaw) * fwdSpeed;
    const targetVz = Math.cos(h.yaw) * fwdSpeed;
    const targetVy = Math.max(-75, Math.min(85, (targetY - h.y) * 1.4));

    h.vx += (targetVx - h.vx) * Math.min(1, dt * 2.4);
    h.vz += (targetVz - h.vz) * Math.min(1, dt * 2.4);
    h.vy += (targetVy - h.vy) * Math.min(1, dt * 3.0);

    h.x += h.vx * dt;
    h.y += h.vy * dt;
    h.z += h.vz * dt;

    h.pitch += ((fwdSpeed / 220) * 0.24 - h.pitch) * Math.min(1, dt * 4);
    h.collective = 0.52 + h.vy / 240;

    if (distXZ < 55 && Math.abs(h.y - targetY) < 28 && c) {
      if (c.stage === "PICKUP") {
        if (tgt.isSpire) {
          h.winchActive = true;
          h.winchLen = Math.min(82, h.winchLen + dt * 55);
          c.hoistProgress += dt * 0.65;
          if (c.hoistProgress >= 1) {
            c.stage = "DROPOFF";
            h.winchActive = false;
          }
        } else {
          c.stage = "DROPOFF";
        }
      } else {
        spawnContract3D();
      }
    } else {
      h.winchActive = false;
      h.winchLen = Math.max(0, h.winchLen - dt * 80);
    }
  }

  function updatePlayer3DFlight(dt) {
    const h = state.heli;
    if (!h) return;

    if (h.invuln > 0) h.invuln = Math.max(0, h.invuln - dt);
    if (state.alertTimer > 0) state.alertTimer = Math.max(0, state.alertTimer - dt);

    const fwd = (keys["KeyW"] ? 1 : 0) - (keys["KeyS"] ? 1 : 0);
    const yawIn = (keys["KeyD"] ? 1 : 0) - (keys["KeyA"] ? 1 : 0);
    const strafe =
      (keys["KeyE"] || keys["ArrowRight"] ? 1 : 0) -
      (keys["KeyQ"] || keys["ArrowLeft"] ? 1 : 0);
    const climb =
      (keys["ArrowUp"] || keys["KeyR"] ? 1 : 0) -
      (keys["ArrowDown"] || keys["KeyF"] ? 1 : 0);
    const brake = keys["ShiftLeft"] || keys["ShiftRight"];
    const winchKey = keys["Space"];

    // Yaw rotation via Fenestron tail thruster
    h.yaw += yawIn * 1.65 * dt;

    // Collective vertical thrust
    if (climb !== 0) {
      h.collective = Math.max(0.08, Math.min(1.0, h.collective + climb * 1.35 * dt));
    } else {
      h.collective += (0.5 - h.collective) * Math.min(1, dt * 4.5);
    }

    // Cyclic Pitch & Roll
    const targetPitch = fwd * 0.3;
    const targetRoll = strafe * 0.32 + yawIn * 0.14;
    h.pitch += (targetPitch - h.pitch) * Math.min(1, dt * 7.5);
    h.roll += (targetRoll - h.roll) * Math.min(1, dt * 7.5);

    const sinY = Math.sin(h.yaw);
    const cosY = Math.cos(h.yaw);
    const rightX = cosY;
    const rightZ = -sinY;

    const accel = 290;
    h.vx += (sinY * fwd + rightX * strafe * 0.85) * accel * dt;
    h.vz += (cosY * fwd + rightZ * strafe * 0.85) * accel * dt;

    // Vertical lift
    const lift = (h.collective - 0.5) * 420;
    h.vy += lift * dt;

    // Airbrake / damping
    const horizDamp = brake ? 0.08 : 0.48;
    const vertDamp = brake && climb === 0 ? 0.1 : 0.58;
    h.vx *= Math.pow(horizDamp, dt);
    h.vz *= Math.pow(horizDamp, dt);
    h.vy *= Math.pow(vertDamp, dt);

    // Ambient 3D wind vector
    const sec = SECTORS[state.sectorIdx] || SECTORS[0];
    if (!h.onTower) {
      h.vx += sec.windX * 0.35 * dt;
      h.vz += sec.windZ * 0.35 * dt;
    }

    // Fuel consumption
    const speedXZ = Math.hypot(h.vx, h.vz);
    const burn = 0.65 + h.collective * 0.8 + (speedXZ / 280) * 0.45;
    h.fuel = Math.max(0, h.fuel - burn * dt);
    if (h.fuel <= 0) {
      h.vy -= 135 * dt;
    }

    h.x += h.vx * dt;
    h.y += h.vy * dt;
    h.z += h.vz * dt;

    // Keep within 3D city airspace boundary
    const maxBound = 1550;
    if (Math.abs(h.x) > maxBound) {
      h.x = Math.sign(h.x) * maxBound;
      h.vx *= -0.4;
    }
    if (Math.abs(h.z) > maxBound) {
      h.z = Math.sign(h.z) * maxBound;
      h.vz *= -0.4;
    }
    if (h.y > 760) {
      h.y = 760;
      h.vy = Math.min(0, h.vy);
    }

    // Rescue Winch Cable
    h.winchActive = Boolean(winchKey) && !h.onTower;
    if (h.winchActive) {
      const prev = h.winchLen;
      h.winchLen = Math.min(115, h.winchLen + dt * 85);
      if (Math.floor(h.winchLen / 14) !== Math.floor(prev / 14)) {
        audio.winchClick(false);
      }
      h.vx *= Math.pow(0.35, dt);
      h.vz *= Math.pow(0.35, dt);
    } else if (h.winchLen > 0) {
      const prev = h.winchLen;
      h.winchLen = Math.max(0, h.winchLen - dt * 120);
      if (Math.floor(h.winchLen / 14) !== Math.floor(prev / 14)) {
        audio.winchClick(true);
      }
    }
  }
  function evaluate3DCollisionsAndMissions(dt) {
    const h = state.heli;
    if (!h) return;

    h.onTower = null;
    const skidBottomY = h.y - 14;
    const prevSkidY = skidBottomY - h.vy * dt;

    for (let i = 0; i < state.towers.length; i++) {
      const t = state.towers[i];
      if (t.isOuter) continue;

      // Spire antenna strike check
      if (t.isSpire) {
        const distSpire = Math.hypot(h.x - t.x, h.z - t.z);
        if (distSpire < 26 && skidBottomY < t.h + t.spireH && h.y + 12 > t.h) {
          damageHeli(18, "3D SPIRE ANTENNA STRIKE!");
          h.vy = 65;
          h.vx += (h.x - t.x) * 2.5;
          h.vz += (h.z - t.z) * 2.5;
        }
      }

      // Check 3D AABB horizontal overlap with skyscraper
      const padMargin = 14;
      const inX = Math.abs(h.x - t.x) < t.rx + padMargin;
      const inZ = Math.abs(h.z - t.z) < t.rz + padMargin;

      if (inX && inZ) {
        if (prevSkidY >= t.h - 10 && skidBottomY <= t.h) {
          const descentFts = Math.max(0, -h.vy / 12);
          if (t.isSpire) {
            damageHeli(20, "OBSTRUCTED SPIRE ROOF — USE WINCH [SPACE]!");
            h.y = t.h + 18;
            h.vy = 65;
          } else {
            h.y = t.h + 14;
            if (descentFts > 12.0) {
              const dmg = Math.round((descentFts - 10.5) * 4.8);
              damageHeli(dmg, `HARD 3D TOUCHDOWN (${descentFts.toFixed(1)} FT/S)!`);
              h.vy = Math.min(55, -h.vy * 0.35);
              h.skidCompression = 1.0;
            } else {
              h.vy = 0;
              h.vx *= Math.pow(0.01, dt);
              h.vz *= Math.pow(0.01, dt);
              h.pitch *= Math.pow(0.02, dt);
              h.roll *= Math.pow(0.02, dt);
              h.onTower = t;
              h.skidCompression = Math.min(1, Math.max(0.22, descentFts / 12));
              processHelipadLanding(t, dt, descentFts);
            }
          }
        } else if (skidBottomY < t.h - 10) {
          // Push out of 3D skyscraper side wall
          const dx = h.x - t.x;
          const dz = h.z - t.z;
          if (Math.abs(dx) / t.rx > Math.abs(dz) / t.rz) {
            h.x = t.x + Math.sign(dx) * (t.rx + padMargin + 4);
            h.vx = Math.sign(dx) * Math.max(60, Math.abs(h.vx) * 0.5);
          } else {
            h.z = t.z + Math.sign(dz) * (t.rz + padMargin + 4);
            h.vz = Math.sign(dz) * Math.max(60, Math.abs(h.vz) * 0.5);
          }
          damageHeli(16, "GLASS CURTAIN-WALL IMPACT!");
        }
      }

      // Emit 3D rotor-wash ring particles when hovering close to rooftop
      const aglRoof = skidBottomY - t.h;
      if (aglRoof >= -2 && aglRoof < 110 && inX && inZ) {
        if (Math.random() < (1 - aglRoof / 110) * 0.85) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 45 + Math.random() * 85;
          state.particles.push({
            x: h.x + Math.cos(ang) * 14,
            y: t.h + 2,
            z: h.z + Math.sin(ang) * 14,
            vx: Math.cos(ang) * spd,
            vy: 6 + Math.random() * 16,
            vz: Math.sin(ang) * spd,
            life: 0.55,
            maxLife: 0.55,
            color: t.isMedBase ? "#5ce6ff" : "#ffcb6b"
          });
        }
      }
    }

    // 3D Spire Winch Extraction check
    const c = state.contract;
    if (c && c.stage === "PICKUP" && c.type === "SPIRE_HOIST" && h.winchLen > 28) {
      const orig = c.origin;
      const hookX = h.x;
      const hookY = h.y - 12 - h.winchLen;
      const hookZ = h.z;
      const distHook = Math.hypot(hookX - orig.x, hookZ - orig.z, hookY - (orig.h + 10));

      if (distHook < 54) {
        c.hoistProgress = Math.min(1, c.hoistProgress + dt * 0.85);
        if (c.hoistProgress >= 1) {
          c.stage = "DROPOFF";
          h.passenger = c.role;
          audio.chime("pickup");
          showAlert(`${c.role} HOISTED INTO CABIN!`);
          hudDispatch.textContent = `EVACUEE ABOARD: Fly to ${c.dest.name} [H] and land (<12 FT/S)`;
        }
      }
    }

    // Street level floor check
    if (skidBottomY <= 0) {
      h.y = 14;
      h.vy = 55;
      damageHeli(22, "STREET CANYON FLOOR HAZARD!");
    }

    // 3D Patrol Drone collisions
    for (let i = 0; i < state.drones.length; i++) {
      const d = state.drones[i];
      if (Math.hypot(h.x - d.x, h.y - d.y, h.z - d.z) < 38) {
        damageHeli(18, "3D AIRSPACE DRONE COLLISION!");
        h.vy = 50;
        d.speed *= -1;
      }
    }

    if (c && state.mode === "playing") {
      c.timer = Math.max(0, c.timer - dt);
    }
  }
  function processHelipadLanding(tower, dt, descentFts) {
    const h = state.heli;
    if (!h) return;

    if (tower.isMedBase) {
      h.fuel = Math.min(100, h.fuel + dt * 45);
      h.hull = Math.min(100, h.hull + dt * 25);
    } else {
      h.fuel = Math.min(100, h.fuel + dt * 15);
    }

    const c = state.contract;
    if (!c || state.mode !== "playing") return;

    const padDist = Math.hypot(h.x - tower.x, h.z - tower.z);
    if (padDist > tower.padRadius + 24) return;

    if (c.stage === "PICKUP" && tower.id === c.origin.id && !tower.isSpire) {
      c.stage = "DROPOFF";
      h.passenger = c.role;
      audio.chime("pickup");
      showAlert(`BOARDED: ${c.role}`);
      hudDispatch.textContent = `VIP ABOARD: Fly to ${c.dest.name} [H] for charter dropoff`;
    } else if (c.stage === "DROPOFF" && tower.id === c.dest.id) {
      const timeBonus = Math.round(c.timer * 28);
      const softBonus = descentFts < 4.5 ? 500 : 180;
      const earned = Math.round((c.reward + timeBonus + softBonus) * state.streak);

      state.score += earned;
      state.streak = Math.min(4.0, +(state.streak + 0.25).toFixed(2));
      state.deliveries += 1;
      state.totalDeliveries += 1;
      h.passenger = null;
      h.fuel = Math.min(100, h.fuel + 35);

      audio.chime("deliver");
      showAlert(`+$${earned.toLocaleString()} CHARTER DELIVERED!`);

      const quota = (SECTORS[state.sectorIdx] || SECTORS[0]).quota;
      if (state.deliveries >= quota) {
        completeSector();
      } else {
        spawnContract3D();
      }
    }
  }

  function damageHeli(amount, msg) {
    const h = state.heli;
    if (!h || h.invuln > 0 || state.mode !== "playing") return;

    h.hull = Math.max(0, h.hull - amount);
    h.invuln = 1.1;
    state.streak = 1.0;
    audio.chime("warn");
    showAlert(msg);
    hudDispatch.textContent = `ALERT // ${msg} — LAND ON CYAN MED-BASE FOR REPAIRS`;

    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      state.particles.push({
        x: h.x,
        y: h.y,
        z: h.z,
        vx: Math.cos(a) * (40 + Math.random() * 90),
        vy: (Math.random() - 0.3) * 80,
        vz: Math.sin(a) * (40 + Math.random() * 90),
        life: 0.65,
        maxLife: 0.65,
        color: i % 2 === 0 ? "#ff5864" : "#ffcb6b"
      });
    }

    if (h.hull <= 0) {
      endGameOver(`${msg} Airframe structural integrity depleted.`);
    }
  }

  function update3DCameraAndWorld(dt) {
    const h = state.heli;
    if (h) {
      const spdNorm = Math.min(1, Math.hypot(h.vx, h.vy, h.vz) / 260);
      h.rotorAngle += dt * (28 + h.collective * 16);
      h.fenestronAngle += dt * (46 + Math.abs(h.roll) * 28);
      h.skidCompression *= Math.pow(0.05, dt);

      audio.update(
        h.collective,
        spdNorm,
        Math.min(1, Math.abs(h.roll) * 2),
        state.mode !== "playing"
      );

      // 3D Camera Modes: CHASE, COCKPIT, ORBIT
      const mode = state.mode === "attract" ? "ORBIT" : CAMERA_MODES[state.camModeIdx];
      const cam = state.cam;

      if (mode === "COCKPIT") {
        const sinY = Math.sin(h.yaw);
        const cosY = Math.cos(h.yaw);
        cam.x = h.x + sinY * 18;
        cam.y = h.y + 4;
        cam.z = h.z + cosY * 18;
        cam.yaw = h.yaw;
        cam.pitch = -h.pitch * 0.65 - 0.08;
        cam.roll = -h.roll * 0.45;
      } else if (mode === "ORBIT") {
        const orbitYaw =
          state.mode === "attract"
            ? h.yaw - 0.48 + Math.sin(state.time * 0.35) * 0.42
            : h.yaw + 0.58;
        const dist = 225;
        const tx = h.x - Math.sin(orbitYaw) * dist;
        const tz = h.z - Math.cos(orbitYaw) * dist;
        const ty = h.y + 68;
        cam.x += (tx - cam.x) * Math.min(1, dt * 6);
        cam.y += (ty - cam.y) * Math.min(1, dt * 6);
        cam.z += (tz - cam.z) * Math.min(1, dt * 6);
        const lookAheadX = h.x + Math.sin(h.yaw) * 70;
        const lookAheadZ = h.z + Math.cos(h.yaw) * 70;
        cam.yaw = Math.atan2(lookAheadX - cam.x, lookAheadZ - cam.z);
        cam.pitch = -0.15;
        cam.roll = 0;
      } else {
        // CHASE camera positioned well behind & above the Fenestron tail,
        // looking forward past the nose so the pilot can see the flight path clearly
        const forwardSpeed = Math.hypot(h.vx, h.vz);
        const dist = 235 + Math.min(40, forwardSpeed * 0.16);
        const tx = h.x - Math.sin(h.yaw) * dist;
        const tz = h.z - Math.cos(h.yaw) * dist;
        const ty = h.y + 72;
        cam.x += (tx - cam.x) * Math.min(1, dt * 8.0);
        cam.y += (ty - cam.y) * Math.min(1, dt * 7.0);
        cam.z += (tz - cam.z) * Math.min(1, dt * 8.0);

        let dyaw = h.yaw - cam.yaw;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        cam.yaw += dyaw * Math.min(1, dt * 9.0);
        cam.pitch = -0.14 - h.pitch * 0.18;
        cam.roll = -h.roll * 0.15;
      }
    }

    for (let i = 0; i < state.drones.length; i++) {
      const d = state.drones[i];
      d.angle += d.speed * dt;
      d.x = Math.cos(d.angle) * d.orbitR;
      d.z = Math.sin(d.angle) * d.orbitR;
    }

    // Update 3D street traffic below
    for (let i = 0; i < state.traffic.length; i++) {
      const v = state.traffic[i];
      if (v.axis === "Z") {
        v.z += v.dir * v.speed * dt;
        if (v.z > 1550) v.z = -1550;
        else if (v.z < -1550) v.z = 1550;
      } else {
        v.x += v.dir * v.speed * dt;
        if (v.x > 1550) v.x = -1550;
        else if (v.x < -1550) v.x = 1550;
      }
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }
  function updateHudAndRadar() {
    const h = state.heli;
    if (!h) return;

    const sec = SECTORS[state.sectorIdx] || SECTORS[0];
    hudScore.textContent = String(state.score).padStart(6, "0");
    hudStreak.textContent = `x${state.streak.toFixed(1)}`;
    hudQuota.textContent = `${state.deliveries} / ${sec.quota}`;

    const hdgDeg = ((Math.round((h.yaw * 180) / Math.PI) % 360) + 360) % 360;
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const card = dirs[Math.round(hdgDeg / 45) % 8];
    const camName = CAMERA_MODES[state.camModeIdx];
    hudHeading.textContent = `HDG ${String(hdgDeg).padStart(3, "0")}° ${card} // CAM: ${camName}`;

    const agl = Math.max(0, Math.round((h.y - 14) * 1.4));
    hudAlt.textContent = String(agl).padStart(3, "0");
    barColl.style.width = `${Math.round(h.collective * 100)}%`;

    const vsi = h.vy / 12;
    hudVsi.textContent = `${vsi >= 0 ? "+" : ""}${vsi.toFixed(1)}`;
    const sink = Math.max(0, -vsi);
    if (h.onTower) {
      hudVsi.style.color = "#57f2aa";
      hudVsiHint.textContent = `ON HELIPAD // ${h.onTower.name}`;
    } else if (sink > 12.0) {
      hudVsi.style.color = "#ff5864";
      hudVsiHint.textContent = "SINK RATE HIGH — PULL COLLECTIVE [↑]";
    } else {
      hudVsi.style.color = "#fff8ed";
      hudVsiHint.textContent = "SAFE TOUCHDOWN < 12 FT/S";
    }

    const kts = Math.round(Math.hypot(h.vx, h.vz, h.vy) * 0.42);
    hudSpd.textContent = String(kts).padStart(2, "0");
    const pDeg = Math.round((-h.pitch * 180) / Math.PI);
    const rDeg = Math.round((h.roll * 180) / Math.PI);
    hudAtt.textContent = `PITCH ${pDeg >= 0 ? "+" : ""}${pDeg}° // ROLL ${rDeg >= 0 ? "+" : ""}${rDeg}°`;

    hudFuel.textContent = `${Math.round(h.fuel)}%`;
    hudHull.textContent = `HULL ${Math.round(h.hull)}%`;
    barFuel.style.width = `${Math.round(h.fuel)}%`;
    hudHull.style.color = h.hull < 35 ? "#ff5864" : "#ffcb6b";

    hudManifest.textContent = h.passenger ? h.passenger : "EMPTY";
    hudManifest.style.color = h.passenger ? "#57f2aa" : "#fff8ed";
    hudWinch.textContent = h.winchLen > 3 ? `WINCH ${Math.round(h.winchLen)} FT` : "STOWED";

    const c = state.contract;
    if (c) {
      const tgt = c.stage === "PICKUP" ? c.origin : c.dest;
      const distM = Math.round(Math.hypot(tgt.x - h.x, tgt.z - h.z) * 0.5);
      hudDist.textContent = `TGT ${distM} M`;
      hudMissionTarget.textContent = `${c.stage === "PICKUP" ? "PICKUP" : "DROP"}: ${tgt.name} (${Math.ceil(c.timer)}s)`;
    }

    // Render Helicopter-Relative Top-Down 3D Sector Radar
    const rw = radarCanvas.width;
    const rh = radarCanvas.height;
    const cx = rw * 0.5;
    const cy = rh * 0.5;
    radarCtx.clearRect(0, 0, rw, rh);

    radarCtx.strokeStyle = "rgba(92, 230, 255, 0.16)";
    radarCtx.lineWidth = 1;
    radarCtx.beginPath();
    radarCtx.arc(cx, cy, rw * 0.32, 0, Math.PI * 2);
    radarCtx.moveTo(cx, 6);
    radarCtx.lineTo(cx, rh - 6);
    radarCtx.moveTo(6, cy);
    radarCtx.lineTo(rw - 6, cy);
    radarCtx.stroke();

    const scale = (rw * 0.45) / 1450;
    const sinY = Math.sin(-h.yaw);
    const cosY = Math.cos(-h.yaw);

    for (let i = 0; i < state.towers.length; i++) {
      const t = state.towers[i];
      if (t.isOuter) continue;
      const dx = (t.x - h.x) * scale;
      const dz = (t.z - h.z) * scale;
      const rx = dx * cosY - dz * sinY;
      const ry = -dx * sinY - dz * cosY;

      if (Math.hypot(rx, ry) < rw * 0.46) {
        radarCtx.fillStyle = t.isMedBase
          ? "rgba(92, 230, 255, 0.7)"
          : "rgba(255, 195, 110, 0.4)";
        radarCtx.fillRect(cx + rx - 4, cy + ry - 4, 8, 8);
      }
    }

    if (c) {
      const tgt = c.stage === "PICKUP" ? c.origin : c.dest;
      const dx = (tgt.x - h.x) * scale;
      const dz = (tgt.z - h.z) * scale;
      const rx = dx * cosY - dz * sinY;
      const ry = -dx * sinY - dz * cosY;
      const clampedR = Math.min(rw * 0.43, Math.hypot(rx, ry));
      const ang = Math.atan2(ry, rx);
      const bx = cx + Math.cos(ang) * clampedR;
      const by = cy + Math.sin(ang) * clampedR;

      radarCtx.fillStyle = c.stage === "PICKUP" ? "#ffcb6b" : "#57f2aa";
      radarCtx.beginPath();
      radarCtx.arc(bx, by, 4.5 + Math.sin(state.time * 8) * 1.5, 0, Math.PI * 2);
      radarCtx.fill();
    }

    // Center helicopter nose triangle
    radarCtx.fillStyle = "#ffffff";
    radarCtx.beginPath();
    radarCtx.moveTo(cx, cy - 6);
    radarCtx.lineTo(cx + 4.5, cy + 5);
    radarCtx.lineTo(cx - 4.5, cy + 5);
    radarCtx.closePath();
    radarCtx.fill();
  }
  // 3D Math & Perspective Projection Pipeline
  const NEAR_Z = 8;

  function worldToCam(wx, wy, wz) {
    const cam = state.cam;
    const dx = wx - cam.x;
    const dy = wy - cam.y;
    const dz = wz - cam.z;

    // Yaw rotation around Y
    const sinY = Math.sin(-cam.yaw);
    const cosY = Math.cos(-cam.yaw);
    const x1 = dx * cosY + dz * sinY;
    const z1 = -dx * sinY + dz * cosY;

    // Pitch rotation around X
    const sinP = Math.sin(-cam.pitch);
    const cosP = Math.cos(-cam.pitch);
    const y2 = dy * cosP - z1 * sinP;
    const z2 = dy * sinP + z1 * cosP;

    // Roll rotation around Z
    const sinR = Math.sin(cam.roll);
    const cosR = Math.cos(cam.roll);
    const x3 = x1 * cosR - y2 * sinR;
    const y3 = x1 * sinR + y2 * cosR;

    return { x: x3, y: y3, z: z2 };
  }

  function projectCamPt(cp) {
    const fov = state.cam.fov;
    const invZ = fov / Math.max(NEAR_Z, cp.z);
    return {
      sx: state.width * 0.5 + cp.x * invZ,
      sy: state.height * 0.5 - cp.y * invZ,
      z: cp.z
    };
  }

  function clipPolygonNearPlane(camPts) {
    const out = [];
    const n = camPts.length;
    for (let i = 0; i < n; i++) {
      const a = camPts[i];
      const b = camPts[(i + 1) % n];
      const aIn = a.z >= NEAR_Z;
      const bIn = b.z >= NEAR_Z;

      if (aIn && bIn) {
        out.push(b);
      } else if (aIn && !bIn) {
        const t = (NEAR_Z - a.z) / (b.z - a.z);
        out.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          z: NEAR_Z
        });
      } else if (!aIn && bIn) {
        const t = (NEAR_Z - a.z) / (b.z - a.z);
        out.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          z: NEAR_Z
        });
        out.push(b);
      }
    }
    return out;
  }

  function draw3DPolygon(worldPts, fillStyle, strokeStyle = null, lineWidth = 1) {
    const camPts = worldPts.map((p) => worldToCam(p[0], p[1], p[2]));
    const clipped = clipPolygonNearPlane(camPts);
    if (clipped.length < 3) return false;

    ctx.beginPath();
    for (let i = 0; i < clipped.length; i++) {
      const sp = projectCamPt(clipped[i]);
      if (i === 0) ctx.moveTo(sp.sx, sp.sy);
      else ctx.lineTo(sp.sx, sp.sy);
    }
    ctx.closePath();
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
    return true;
  }

  function draw3DLine(p1, p2, strokeStyle, lineWidth = 2) {
    const c1 = worldToCam(p1[0], p1[1], p1[2]);
    const c2 = worldToCam(p2[0], p2[1], p2[2]);
    if (c1.z < NEAR_Z && c2.z < NEAR_Z) return;

    let a = c1;
    let b = c2;
    if (a.z < NEAR_Z) {
      const t = (NEAR_Z - a.z) / (b.z - a.z);
      a = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: NEAR_Z };
    } else if (b.z < NEAR_Z) {
      const t = (NEAR_Z - b.z) / (a.z - b.z);
      b = { x: b.x + (a.x - b.x) * t, y: b.y + (a.y - b.y) * t, z: NEAR_Z };
    }

    const s1 = projectCamPt(a);
    const s2 = projectCamPt(b);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(s1.sx, s1.sy);
    ctx.lineTo(s2.sx, s2.sy);
    ctx.stroke();
  }

  // Transform helicopter-local 3D point (lx, ly, lz) to world space
  function heliLocalToWorld(h, lx, ly, lz) {
    // 1. Roll around Z
    const sr = Math.sin(h.roll);
    const cr = Math.cos(h.roll);
    const x1 = lx * cr - ly * sr;
    const y1 = lx * sr + ly * cr;

    // 2. Pitch around X (forward nose tilt when pitch > 0 lowers nose +Z)
    const sp = Math.sin(h.pitch);
    const cp = Math.cos(h.pitch);
    const y2 = y1 * cp - lz * sp;
    const z2 = y1 * sp + lz * cp;

    // 3. Yaw around Y
    const sy = Math.sin(h.yaw);
    const cy = Math.cos(h.yaw);
    const wx = h.x + x1 * cy + z2 * sy;
    const wz = h.z - x1 * sy + z2 * cy;
    const wy = h.y + y2;

    return [wx, wy, wz];
  }
  function renderTowerBoxTier(x, z, rx, rz, y0, y1, t, isUpperTier) {
    const x0 = x - rx;
    const x1 = x + rx;
    const z0 = z - rz;
    const z1 = z + rz;
    const cam = state.cam;
    const distCam = Math.hypot(x - cam.x, z - cam.z);
    const faces = [];

    // Palette variations by architectural style
    const westFill = t.isOuter
      ? "#6e4234"
      : t.style === 0
      ? "#f5a64c"
      : t.style === 1
      ? "#e09248"
      : "#cf8342";
    const southFill = t.isOuter
      ? "#3d2830"
      : t.style === 0
      ? "#bd693c"
      : t.style === 1
      ? "#9e5538"
      : "#874836";
    const eastFill = t.style === 0 ? "#181524" : t.style === 1 ? "#211b2b" : "#161826";
    const northFill = t.style === 0 ? "#221c2e" : t.style === 1 ? "#2b2233" : "#1d2030";

    // West face (-X) — blazing golden sunset reflection
    if (cam.x < x0) {
      faces.push({
        axis: "Z",
        fixedX: x0,
        span0: z0,
        span1: z1,
        pts: [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]],
        fill: westFill,
        stroke: "rgba(28, 18, 24, 0.7)",
        sunlit: true
      });
    }
    // East face (+X) — twilight shadow with lit office suites
    if (cam.x > x1) {
      faces.push({
        axis: "Z",
        fixedX: x1,
        span0: z0,
        span1: z1,
        pts: [[x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [x1, y0, z0]],
        fill: eastFill,
        stroke: "rgba(10, 8, 16, 0.75)",
        sunlit: false
      });
    }
    // South face (-Z) — warm amber reflection
    if (cam.z < z0) {
      faces.push({
        axis: "X",
        fixedZ: z0,
        span0: x0,
        span1: x1,
        pts: [[x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z0]],
        fill: southFill,
        stroke: "rgba(22, 14, 22, 0.7)",
        sunlit: true
      });
    }
    // North face (+Z) — cool slate shadow with lit office suites
    if (cam.z > z1) {
      faces.push({
        axis: "X",
        fixedZ: z1,
        span0: x0,
        span1: x1,
        pts: [[x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [x1, y0, z1]],
        fill: northFill,
        stroke: "rgba(12, 10, 18, 0.7)",
        sunlit: false
      });
    }

    for (let i = 0; i < faces.length; i++) {
      const f = faces[i];
      draw3DPolygon(f.pts, f.fill, f.stroke, 1.2);

      if (t.isOuter || distCam > 1850) continue;

      const pA = f.pts[0];
      const pD = f.pts[3];

      // 1. Ground-floor illuminated lobby atrium & entrance canopy (on base tier)
      if (!isUpperTier && y0 === 0) {
        const lobbyCol = f.sunlit
          ? "rgba(255, 238, 180, 0.75)"
          : "rgba(255, 208, 128, 0.55)";
        draw3DPolygon(
          [
            [pA[0], 2, pA[2]],
            [pA[0], 18, pA[2]],
            [pD[0], 18, pD[2]],
            [pD[0], 2, pD[2]]
          ],
          lobbyCol,
          "rgba(30, 22, 18, 0.8)",
          1
        );
      }

      // 2. Floor-by-floor window glazing & golden specular reflections
      const floorStep = t.style === 2 ? 24 : 30;
      const winH = t.style === 2 ? 12 : 17;
      const startY = Math.max(y0 + 24, 26);

      for (let wy = startY; wy < y1 - 18; wy += floorStep) {
        const rowIdx = Math.floor(wy / floorStep);
        const shimmer = seeded((t.seed || 1) + rowIdx * 13 + i * 7);

        if (f.sunlit) {
          // Sunlit golden curtain-wall glass reflection
          const glareCol =
            wy > y1 * 0.65
              ? "rgba(255, 240, 178, 0.68)"
              : shimmer > 0.45
              ? "rgba(255, 222, 142, 0.54)"
              : "rgba(240, 148, 62, 0.42)";
          draw3DPolygon(
            [
              [pA[0], wy, pA[2]],
              [pA[0], wy + winH, pA[2]],
              [pD[0], wy + winH, pD[2]],
              [pD[0], wy, pD[2]]
            ],
            glareCol
          );
        } else if (shimmer > 0.38) {
          // Shadow face: individual lit office window bays
          const b0 = 0.12 + (rowIdx % 3) * 0.22;
          const b1 = Math.min(0.88, b0 + 0.36);
          const wx0 = pA[0] + (pD[0] - pA[0]) * b0;
          const wz0 = pA[2] + (pD[2] - pA[2]) * b0;
          const wx1 = pA[0] + (pD[0] - pA[0]) * b1;
          const wz1 = pA[2] + (pD[2] - pA[2]) * b1;
          draw3DPolygon(
            [
              [wx0, wy, wz0],
              [wx0, wy + winH, wz0],
              [wx1, wy + winH, wz1],
              [wx1, wy, wz1]
            ],
            shimmer > 0.72
              ? "rgba(255, 214, 132, 0.55)"
              : "rgba(140, 210, 255, 0.25)"
          );
        }
      }

      // 3. Vertical structural steel mullions / architectural ribs
      const cols = t.mullionCols || 3;
      const mullionCol = f.sunlit
        ? "rgba(38, 24, 28, 0.58)"
        : "rgba(12, 10, 18, 0.68)";
      for (let m = 1; m < cols; m++) {
        const frac = m / cols;
        const mx = pA[0] + (pD[0] - pA[0]) * frac;
        const mz = pA[2] + (pD[2] - pA[2]) * frac;
        draw3DLine([mx, y0, mz], [mx, y1, mz], mullionCol, 1.5);
      }

      // 4. Illuminated crown cornice band at top of tier
      const crownCol = t.isMedBase
        ? "rgba(92, 230, 255, 0.55)"
        : "rgba(255, 214, 130, 0.5)";
      draw3DLine([pA[0], y1 - 3, pA[2]], [pD[0], y1 - 3, pD[2]], crownCol, 2);
    }
  }
/* TOWER_PART_2 */


  function renderTower3D(t) {
    const cam = state.cam;

    // Sidewalk plaza base around core buildings
    if (!t.isOuter && cam.y > 10) {
      const sw = 10;
      draw3DPolygon(
        [
          [t.x - t.rx - sw, 0.3, t.z - t.rz - sw],
          [t.x - t.rx - sw, 0.3, t.z + t.rz + sw],
          [t.x + t.rx + sw, 0.3, t.z + t.rz + sw],
          [t.x + t.rx + sw, 0.3, t.z - t.rz - sw]
        ],
        "#25212c",
        "rgba(255, 200, 120, 0.22)",
        1
      );
    }

    if (t.hasSetback) {
      // Lower wider tier + setback ledge + upper tower tier
      const midY = t.setbackH;
      renderTowerBoxTier(t.x, t.z, t.rx * 1.12, t.rz * 1.12, 0, midY, t, false);
      if (cam.y > midY - 20) {
        const rxL = t.rx * 1.12;
        const rzL = t.rz * 1.12;
        draw3DPolygon(
          [
            [t.x - rxL, midY, t.z - rzL],
            [t.x - rxL, midY, t.z + rzL],
            [t.x + rxL, midY, t.z + rzL],
            [t.x + rxL, midY, t.z - rzL]
          ],
          "#2d2433",
          "#ffcb6b",
          1
        );
      }
      renderTowerBoxTier(t.x, t.z, t.rx, t.rz, midY, t.h, t, true);
    } else {
      renderTowerBoxTier(t.x, t.z, t.rx, t.rz, 0, t.h, t, false);
    }

    const x0 = t.x - t.rx;
    const x1 = t.x + t.rx;
    const z0 = t.z - t.rz;
    const z1 = t.z + t.rz;
    const y1 = t.h;

    // Rooftop Deck (visible when camera is above or near roof height)
    if (cam.y > y1 - 30) {
      const roofColor = t.isMedBase
        ? "#143d52"
        : t.isSpire
        ? "#2c222e"
        : "#342a38";
      draw3DPolygon(
        [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]],
        roofColor,
        t.isMedBase ? "#5ce6ff" : "#ffcb6b",
        1.5
      );

      // Rooftop HVAC mechanical units on corner of non-outer buildings
      if (!t.isOuter) {
        const hx = x0 + 14;
        const hz = z0 + 14;
        draw3DPolygon(
          [
            [hx - 8, y1 + 0.6, hz - 8],
            [hx - 8, y1 + 0.6, hz + 8],
            [hx + 8, y1 + 0.6, hz + 8],
            [hx + 8, y1 + 0.6, hz - 8]
          ],
          "#474e5c",
          "#1c2029",
          1
        );
      }

      if (!t.isOuter && !t.isAnnex && !t.isSpire) {
        // Draw 3D Helipad Pad Square & [H] Markings
        const pr = t.padRadius;
        const padCol = t.isMedBase ? "rgba(92, 230, 255, 0.28)" : "rgba(255, 203, 107, 0.25)";
        const hCol = t.isMedBase ? "#5ce6ff" : "#ffcb6b";
        draw3DPolygon(
          [
            [t.x - pr, y1 + 0.5, t.z - pr],
            [t.x - pr, y1 + 0.5, t.z + pr],
            [t.x + pr, y1 + 0.5, t.z + pr],
            [t.x + pr, y1 + 0.5, t.z - pr]
          ],
          padCol,
          hCol,
          1.6
        );

        // 3D "H" bars on pad
        const hr = pr * 0.48;
        draw3DLine([t.x - hr, y1 + 1, t.z - hr], [t.x - hr, y1 + 1, t.z + hr], hCol, 2.4);
        draw3DLine([t.x + hr, y1 + 1, t.z - hr], [t.x + hr, y1 + 1, t.z + hr], hCol, 2.4);
        draw3DLine([t.x - hr, y1 + 1, t.z], [t.x + hr, y1 + 1, t.z], hCol, 2.4);
      }
    }

    // Blinking red corner FAA obstruction lights on tall core towers
    if (!t.isOuter && !t.isAnnex) {
      const blinkCorner = Math.sin(state.time * 4.5 + t.id * 1.3) > 0.2;
      if (blinkCorner) {
        const corners = [
          [x0, y1 + 2, z0],
          [x1, y1 + 2, z0],
          [x0, y1 + 2, z1],
          [x1, y1 + 2, z1]
        ];
        for (let cIdx = 0; cIdx < corners.length; cIdx++) {
          const cp = worldToCam(corners[cIdx][0], corners[cIdx][1], corners[cIdx][2]);
          if (cp.z >= NEAR_Z) {
            const sp = projectCamPt(cp);
            ctx.fillStyle = "#ff3b4e";
            ctx.beginPath();
            ctx.arc(sp.sx, sp.sy, Math.max(2, 320 / cp.z), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // 3D Spire Lattice & Blinking Red Beacon
    if (t.isSpire) {
      const topY = y1 + t.spireH;
      draw3DLine([t.x - 14, y1, t.z - 14], [t.x, topY, t.z], "#e0c8ad", 2);
      draw3DLine([t.x + 14, y1, t.z - 14], [t.x, topY, t.z], "#e0c8ad", 2);
      draw3DLine([t.x, y1, t.z + 14], [t.x, topY, t.z], "#e0c8ad", 2);

      const cp = worldToCam(t.x, topY, t.z);
      if (cp.z >= NEAR_Z) {
        const sp = projectCamPt(cp);
        ctx.fillStyle = Math.sin(state.time * 7 + t.id) > 0 ? "#ff3b4e" : "#701822";
        ctx.beginPath();
        ctx.arc(sp.sx, sp.sy, Math.max(3, 550 / cp.z), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Active Mission 3D Sky Beacon Pillar
    const c = state.contract;
    const isPick = c && c.stage === "PICKUP" && c.origin.id === t.id;
    const isDrop = c && c.stage === "DROPOFF" && c.dest.id === t.id;
    if (isPick || isDrop) {
      const bCol = isPick ? "rgba(255, 203, 107, 0.55)" : "rgba(87, 242, 170, 0.55)";
      draw3DLine([t.x, y1, t.z], [t.x, y1 + 260, t.z], bCol, 6);
    }
  }

  function renderStreetsAndTraffic3D() {
    const roads = [-1200, -600, 0, 600, 1200];
    const rw = 28;

    for (let i = 0; i < roads.length; i++) {
      const r = roads[i];
      draw3DPolygon(
        [
          [r - rw, 0.1, -1550],
          [r - rw, 0.1, 1550],
          [r + rw, 0.1, 1550],
          [r + rw, 0.1, -1550]
        ],
        "rgba(20, 18, 28, 0.85)",
        "rgba(255, 196, 110, 0.22)",
        1
      );
      draw3DLine([r, 0.2, -1550], [r, 0.2, 1550], "rgba(255, 198, 74, 0.48)", 1.5);

      draw3DPolygon(
        [
          [-1550, 0.12, r - rw],
          [-1550, 0.12, r + rw],
          [1550, 0.12, r + rw],
          [1550, 0.12, r - rw]
        ],
        "rgba(20, 18, 28, 0.85)",
        "rgba(255, 196, 110, 0.22)",
        1
      );
      draw3DLine([-1550, 0.22, r], [1550, 0.22, r], "rgba(255, 198, 74, 0.48)", 1.5);
    }
    for (let ix = 0; ix < roads.length; ix++) {
      for (let iz = 0; iz < roads.length; iz++) {
        const rx = roads[ix];
        const rz = roads[iz];
        if (Math.hypot(rx - state.cam.x, rz - state.cam.z) > 1650) continue;

        draw3DPolygon(
          [
            [rx - rw, 0.25, rz - rw],
            [rx - rw, 0.25, rz + rw],
            [rx + rw, 0.25, rz + rw],
            [rx + rw, 0.25, rz - rw]
          ],
          "rgba(32, 28, 42, 0.92)",
          "rgba(255, 235, 190, 0.38)",
          1.2
        );
      }
    }

    for (let i = 0; i < state.traffic.length; i++) {
      const v = state.traffic[i];
      const distCam = Math.hypot(v.x - state.cam.x, v.z - state.cam.z);
      if (distCam > 1550) continue;

      const hl = v.len * 0.5;
      const hw = v.width * 0.5;
      const h = v.height;

      let x0, x1, z0, z1;
      let frontPt1, frontPt2, beamPt1, beamPt2, rearPt1, rearPt2;

      if (v.axis === "Z") {
        x0 = v.x - hw;
        x1 = v.x + hw;
        z0 = v.z - hl;
        z1 = v.z + hl;
        const fz = v.dir > 0 ? z1 : z0;
        const rz = v.dir > 0 ? z0 : z1;
        const bDist = v.dir * 32;
        frontPt1 = [x0 + 0.8, 1.8, fz];
        frontPt2 = [x1 - 0.8, 1.8, fz];
        beamPt1 = [x0 - 3, 0.3, fz + bDist];
        beamPt2 = [x1 + 3, 0.3, fz + bDist];
        rearPt1 = [x0 + 0.8, 2.0, rz];
        rearPt2 = [x1 - 0.8, 2.0, rz];
      } else {
        x0 = v.x - hl;
        x1 = v.x + hl;
        z0 = v.z - hw;
        z1 = v.z + hw;
        const fx = v.dir > 0 ? x1 : x0;
        const rx = v.dir > 0 ? x0 : x1;
        const bDist = v.dir * 32;
        frontPt1 = [fx, 1.8, z0 + 0.8];
        frontPt2 = [fx, 1.8, z1 - 0.8];
        beamPt1 = [fx + bDist, 0.3, z0 - 3];
        beamPt2 = [fx + bDist, 0.3, z1 + 3];
        rearPt1 = [rx, 2.0, z0 + 0.8];
        rearPt2 = [rx, 2.0, z1 - 0.8];
      }

      draw3DPolygon(
        [frontPt1, beamPt1, beamPt2, frontPt2],
        "rgba(255, 236, 170, 0.34)"
      );

      draw3DPolygon(
        [
          [x0, h, z0],
          [x0, h, z1],
          [x1, h, z1],
          [x1, h, z0]
        ],
        v.bodyColor,
        "rgba(255, 220, 150, 0.4)",
        1
      );

      draw3DLine(frontPt1, frontPt2, "#fff9d6", 2.4);
      draw3DLine(rearPt1, rearPt2, "#ff2e43", 2.8);

      if (v.kind === "emergency") {
        const cp = worldToCam(v.x, h + 1.5, v.z);
        if (cp.z >= NEAR_Z) {
          const sp = projectCamPt(cp);
          ctx.fillStyle = Math.sin(state.time * 18 + i) > 0 ? "#ff2e43" : "#38b6ff";
          ctx.beginPath();
          ctx.arc(sp.sx, sp.sy, Math.max(2.5, 360 / cp.z), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  function renderHelicopter3D(h) {
    // In Cockpit camera mode, draw a 3D windshield canopy frame instead of external fuselage
    if (state.mode !== "attract" && CAMERA_MODES[state.camModeIdx] === "COCKPIT") {
      ctx.save();
      ctx.strokeStyle = "rgba(92, 230, 255, 0.35)";
      ctx.lineWidth = 2;
      const cx = state.width * 0.5;
      const cy = state.height * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.moveTo(cx - 58, cy);
      ctx.lineTo(cx - 20, cy);
      ctx.moveTo(cx + 20, cy);
      ctx.lineTo(cx + 58, cy);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // 1. 3D Rescue Winch Cable & Hook
    if (h.winchLen > 2) {
      const topW = [h.x, h.y - 10, h.z];
      const botW = [
        h.x + Math.sin(state.time * 5) * 4,
        h.y - 10 - h.winchLen,
        h.z + Math.cos(state.time * 5) * 4
      ];
      draw3DLine(topW, botW, "#d9e8f5", 2);
      const cp = worldToCam(botW[0], botW[1], botW[2]);
      if (cp.z >= NEAR_Z) {
        const sp = projectCamPt(cp);
        ctx.fillStyle = "#ffcb6b";
        ctx.beginPath();
        ctx.arc(sp.sx, sp.sy, Math.max(3, 420 / cp.z), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Twin 3D Tubular Skids with Yellow Tips
    const skidY = -13 + h.skidCompression * 3;
    const L1 = heliLocalToWorld(h, -9, skidY, -16);
    const L2 = heliLocalToWorld(h, -9, skidY, 18);
    const LTip = heliLocalToWorld(h, -9, skidY + 3, 22);
    const R1 = heliLocalToWorld(h, 9, skidY, -16);
    const R2 = heliLocalToWorld(h, 9, skidY, 18);
    const RTip = heliLocalToWorld(h, 9, skidY + 3, 22);

    draw3DLine(L1, L2, "#d8e2eb", 2.4);
    draw3DLine(L2, LTip, "#ffcb47", 2.8);
    draw3DLine(R1, R2, "#d8e2eb", 2.4);
    draw3DLine(R2, RTip, "#ffcb47", 2.8);

    // Skid struts
    draw3DLine(heliLocalToWorld(h, -7, -6, -8), heliLocalToWorld(h, -9, skidY, -8), "#b8c7d6", 2);
    draw3DLine(heliLocalToWorld(h, -7, -6, 10), heliLocalToWorld(h, -9, skidY, 10), "#b8c7d6", 2);
    draw3DLine(heliLocalToWorld(h, 7, -6, -8), heliLocalToWorld(h, 9, skidY, -8), "#b8c7d6", 2);
    draw3DLine(heliLocalToWorld(h, 7, -6, 10), heliLocalToWorld(h, 9, skidY, 10), "#b8c7d6", 2);

    // 3. 3D Fuselage Faces (Blue lower belly, White upper cabin, Golden sunset window glare, Shrouded Fenestron tail)
    const parts = [
      // Tail boom left & right faces (Azure Blue)
      {
        pts: [[-2.5, 2, -12], [-1.2, 2, -42], [-1.2, -3, -42], [-2.5, -4, -12]],
        fill: "#176eb8",
        stroke: "#ffd27d"
      },
      {
        pts: [[2.5, 2, -12], [1.2, 2, -42], [1.2, -3, -42], [2.5, -4, -12]],
        fill: "#0f5391",
        stroke: "#ffd27d"
      },
      // Tail boom top
      {
        pts: [[-2.5, 2, -12], [2.5, 2, -12], [1.2, 2, -42], [-1.2, 2, -42]],
        fill: "#f0f5fa",
        stroke: "#125ea3"
      },
      // Shrouded Fenestron Vertical Fin (White upper fin + Blue shroud housing)
      {
        pts: [[0, -6, -40], [0, 4, -39], [0, 17, -47], [0, 16, -52], [0, -5, -49]],
        fill: "#f4f8fc",
        stroke: "#1568b3"
      },
      // Golden sunset motion-blur arc behind Fenestron tail
      {
        pts: [[0, -4, -50], [0, 8, -51], [0, 6, -55], [0, -3, -54]],
        fill: "rgba(255, 172, 72, 0.55)",
        stroke: null
      },
      // Main Cabin Lower Belly (Metallic Blue)
      {
        pts: [[-8, -7, -12], [8, -7, -12], [7, -6, 22], [-7, -6, 22]],
        fill: "#0d4a85",
        stroke: "#ffbe55"
      },
      // Cabin Left Side (White upper + Golden Sunset Window Glare)
      {
        pts: [[-8, -7, -12], [-8, 5, -10], [-7, 4, 14], [-7, -6, 22]],
        fill: "#f4f7fb",
        stroke: "#1668b3"
      },
      {
        pts: [[-8.2, -1, -7], [-8.2, 4, -7], [-7.5, 3.5, 11], [-7.5, -1, 11]],
        fill: "#ffb84d",
        stroke: "#243447"
      },
      // Cabin Right Side
      {
        pts: [[8, -7, -12], [8, 5, -10], [7, 4, 14], [7, -6, 22]],
        fill: "#dce6f2",
        stroke: "#125899"
      },
      {
        pts: [[8.2, -1, -7], [8.2, 4, -7], [7.5, 3.5, 11], [7.5, -1, 11]],
        fill: "#ff9e3d",
        stroke: "#243447"
      },
      // Forward Wraparound Windshield & Nose Cone
      {
        pts: [[-7, 4, 14], [7, 4, 14], [4.5, -2, 26], [-4.5, -2, 26]],
        fill: "#26384d",
        stroke: "#ffcb6b"
      },
      {
        pts: [[-7, -6, 22], [7, -6, 22], [4.5, -2, 26], [-4.5, -2, 26]],
        fill: "#166bc2",
        stroke: "#ffbe55"
      },
      // Twin-Turbine Upper Blue Engine Cowling Roof
      {
        pts: [[-7, 5, -11], [7, 5, -11], [6.5, 5, 13], [-6.5, 5, 13]],
        fill: "#1462ad",
        stroke: "#f4f7fb"
      }
    ];

    // Depth-sort helicopter sub-faces relative to camera
    const transformedParts = parts.map((p) => {
      const worldPts = p.pts.map((pt) => heliLocalToWorld(h, pt[0], pt[1], pt[2]));
      let sumZ = 0;
      for (let i = 0; i < worldPts.length; i++) {
        sumZ += worldToCam(worldPts[i][0], worldPts[i][1], worldPts[i][2]).z;
      }
      return {
        worldPts,
        fill: p.fill,
        stroke: p.stroke,
        avgZ: sumZ / worldPts.length
      };
    });

    transformedParts.sort((a, b) => b.avgZ - a.avgZ);
    for (let i = 0; i < transformedParts.length; i++) {
      const tp = transformedParts[i];
      draw3DPolygon(tp.worldPts, tp.fill, tp.stroke, 1.1);
    }

    // 4. 3D Spinning 4-Blade Main Rotor Assembly
    const hubW = heliLocalToWorld(h, 0, 10, 1);
    draw3DLine(heliLocalToWorld(h, 0, 5, 1), hubW, "#95a7b8", 3);

    const bladeSpan = 42;
    for (let b = 0; b < 4; b++) {
      const ang = h.rotorAngle + (b * Math.PI) / 2;
      const bx = Math.cos(ang) * bladeSpan;
      const bz = Math.sin(ang) * bladeSpan;
      const tipW = heliLocalToWorld(h, bx, 10.5, 1 + bz);
      draw3DLine(hubW, tipW, "rgba(35, 42, 54, 0.88)", 2.6);
    }
  }
  function renderScene3D() {
    const w = state.width;
    const h = state.height;
    const sec = SECTORS[state.sectorIdx] || SECTORS[0];

    ctx.save();
    ctx.scale(state.dpr, state.dpr);

    // 1. Dynamic 3D Horizon & Golden Hour Sky Gradient
    const horizonOffset = Math.tan(state.cam.pitch) * state.cam.fov;
    const horizonY = Math.max(-200, Math.min(h + 200, h * 0.5 - horizonOffset));

    const skyGrad = ctx.createLinearGradient(0, 0, 0, Math.max(80, horizonY + 120));
    skyGrad.addColorStop(0, sec.skyTop);
    skyGrad.addColorStop(0.5, sec.skyMid);
    skyGrad.addColorStop(1, sec.skyHorizon);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // 3D Sun Disc in the West (-X, Z=-400, Y=520)
    const sunCam = worldToCam(-2600, 520, -400);
    if (sunCam.z > NEAR_Z) {
      const sunSp = projectCamPt(sunCam);
      const sunGrad = ctx.createRadialGradient(
        sunSp.sx,
        sunSp.sy,
        12,
        sunSp.sx,
        sunSp.sy,
        Math.max(w, h) * 0.55
      );
      sunGrad.addColorStop(0, "rgba(255, 238, 175, 0.65)");
      sunGrad.addColorStop(0.3, "rgba(255, 158, 72, 0.28)");
      sunGrad.addColorStop(1, "rgba(255, 110, 50, 0)");
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Ground Plane, 3D Asphalt Road Network & Live Street Traffic
    if (horizonY < h) {
      const gndGrad = ctx.createLinearGradient(0, Math.max(0, horizonY), 0, h);
      gndGrad.addColorStop(0, "#3b232a");
      gndGrad.addColorStop(0.35, "#1b1421");
      gndGrad.addColorStop(1, "#0b0912");
      ctx.fillStyle = gndGrad;
      ctx.fillRect(0, Math.max(0, horizonY), w, h - Math.max(0, horizonY));
    }

    for (let g = -1500; g <= 1500; g += 300) {
      draw3DLine([g, 0, -1500], [g, 0, 1500], "rgba(255, 182, 92, 0.14)", 1.1);
      draw3DLine([-1500, 0, g], [1500, 0, g], "rgba(255, 182, 92, 0.14)", 1.1);
    }

    renderStreetsAndTraffic3D();

    // 3. Painter's Algorithm Depth Sort for All 3D Objects
    const renderQueue = [];

    for (let i = 0; i < state.towers.length; i++) {
      const t = state.towers[i];
      const d2 =
        (t.x - state.cam.x) ** 2 +
        (t.h * 0.5 - state.cam.y) ** 2 +
        (t.z - state.cam.z) ** 2;
      renderQueue.push({ type: "tower", obj: t, dist2: d2 });
    }

    for (let i = 0; i < state.drones.length; i++) {
      const d = state.drones[i];
      const d2 =
        (d.x - state.cam.x) ** 2 +
        (d.y - state.cam.y) ** 2 +
        (d.z - state.cam.z) ** 2;
      renderQueue.push({ type: "drone", obj: d, dist2: d2 });
    }

    for (let i = 0; i < state.particles.length; i++) {
      const p = state.particles[i];
      const d2 =
        (p.x - state.cam.x) ** 2 +
        (p.y - state.cam.y) ** 2 +
        (p.z - state.cam.z) ** 2;
      renderQueue.push({ type: "particle", obj: p, dist2: d2 });
    }

    if (state.heli) {
      const hObj = state.heli;
      const d2 =
        (hObj.x - state.cam.x) ** 2 +
        (hObj.y - state.cam.y) ** 2 +
        (hObj.z - state.cam.z) ** 2;
      renderQueue.push({ type: "heli", obj: hObj, dist2: d2 });
    }

    renderQueue.sort((a, b) => b.dist2 - a.dist2);

    for (let i = 0; i < renderQueue.length; i++) {
      const item = renderQueue[i];
      if (item.type === "tower") {
        renderTower3D(item.obj);
      } else if (item.type === "heli") {
        renderHelicopter3D(item.obj);
      } else if (item.type === "drone") {
        const d = item.obj;
        const cp = worldToCam(d.x, d.y, d.z);
        if (cp.z >= NEAR_Z) {
          const sp = projectCamPt(cp);
          const r = Math.max(3, 520 / cp.z);
          ctx.fillStyle = Math.sin(state.time * 12 + d.angle) > 0 ? "#ff5864" : "#5ce6ff";
          ctx.beginPath();
          ctx.arc(sp.sx, sp.sy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (item.type === "particle") {
        const p = item.obj;
        const cp = worldToCam(p.x, p.y, p.z);
        if (cp.z >= NEAR_Z) {
          const sp = projectCamPt(cp);
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(sp.sx, sp.sy, Math.max(2, 340 / cp.z), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    draw3DTargetHUD(w, h);

    if (state.alertTimer > 0 && state.alertText) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, state.alertTimer);
      ctx.font = "900 16px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffcb6b";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 8;
      ctx.fillText(state.alertText, w * 0.5, h * 0.24);
      ctx.restore();
    }

    ctx.restore();
  }
  function draw3DTargetHUD(w, h) {
    const c = state.contract;
    if (!c) return;
    const tgt = c.stage === "PICKUP" ? c.origin : c.dest;
    const col = c.stage === "PICKUP" ? "#ffcb6b" : "#57f2aa";

    const cp = worldToCam(tgt.x, tgt.h + 24, tgt.z);
    if (cp.z > NEAR_Z) {
      const sp = projectCamPt(cp);
      if (sp.sx >= 40 && sp.sx <= w - 40 && sp.sy >= 60 && sp.sy <= h - 90) {
        ctx.save();
        ctx.translate(sp.sx, sp.sy);
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(14, 0);
        ctx.lineTo(0, 14);
        ctx.lineTo(-14, 0);
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = "rgba(10, 15, 26, 0.84)";
        ctx.fillRect(-62, -34, 124, 17);
        ctx.fillStyle = col;
        ctx.font = "800 10px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          c.stage === "PICKUP"
            ? tgt.isSpire
              ? `HOIST: ${tgt.name}`
              : `PICKUP: ${tgt.name}`
            : `DROP: ${tgt.name}`,
          0,
          -22
        );
        ctx.restore();
        return;
      }
    }

    const angle = Math.atan2(cp.x, cp.z);
    const edgeX = Math.max(85, Math.min(w - 85, w * 0.5 + Math.sin(angle) * (w * 0.42)));
    const edgeY = h * 0.5;
    ctx.save();
    ctx.translate(edgeX, edgeY);
    ctx.fillStyle = "rgba(10, 15, 26, 0.88)";
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-64, -15, 128, 30, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.font = "800 10.5px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${cp.x > 0 ? "TURN RIGHT ▶" : "◀ TURN LEFT"} ${tgt.name}`, 0, 4);
    ctx.restore();
  }

  let lastTime = performance.now();

  function animate(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    if (state.mode !== "paused") {
      state.time += dt;
      if (state.mode === "attract") {
        updateAttractAutopilot3D(dt);
      } else if (state.mode === "playing") {
        updatePlayer3DFlight(dt);
        evaluate3DCollisionsAndMissions(dt);
      }
      update3DCameraAndWorld(dt);
      updateHudAndRadar();
    }

    renderScene3D();
    requestAnimationFrame(animate);
  }

  bindEvents();
  loadSector(0, true);
  requestAnimationFrame(animate);











})();
