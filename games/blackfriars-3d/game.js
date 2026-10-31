// ============================================================================
// BLACKFRIARS REACH — Main 3D Walkthrough Controller & Attract Mode
// ============================================================================

(function () {
  const canvas = document.getElementById("gl-canvas");
  const attractOverlay = document.getElementById("attract-overlay");
  const hudOverlay = document.getElementById("hud-overlay");
  const postcardOverlay = document.getElementById("postcard-overlay");
  const postcardLocation = document.getElementById("postcard-location");
  const startBtn = document.getElementById("start-btn");
  const attractPoiName = document.getElementById("attract-poi-name");
  const attractPoiDesc = document.getElementById("attract-poi-desc");

  const hudZoneName = document.getElementById("hud-zone-name");
  const hudCoords = document.getElementById("hud-coords");
  const hudOsmInfo = document.getElementById("hud-osm-info");
  const compassTape = document.getElementById("compass-tape");
  const vacationCounterEl = document.getElementById("vacation-counter");
  const plaqueCounterEl = document.getElementById("plaque-counter");
  const timeBtn = document.getElementById("time-btn");
  const rainBtn = document.getElementById("rain-btn");
  const postcardBtn = document.getElementById("postcard-btn");
  const modeBtn = document.getElementById("mode-btn");
  const muteBtn = document.getElementById("mute-btn");
  const interactPrompt = document.getElementById("interact-prompt");
  const interactText = document.getElementById("interact-text");

  const plaqueCard = document.getElementById("plaque-card");
  const plaqueCrest = document.getElementById("plaque-crest");
  const plaqueTitle = document.getElementById("plaque-title");
  const plaqueYear = document.getElementById("plaque-year");
  const plaqueBody = document.getElementById("plaque-body");
  const closePlaqueBtn = document.getElementById("close-plaque-btn");

  const minimapCanvas = document.getElementById("minimap-canvas");
  const minimapCtx = minimapCanvas.getContext("2d");
  const teleportBar = document.getElementById("teleport-bar");

  // Renderer & Scene Setup with Filmic Tone Mapping
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (THREE.ACESFilmicToneMapping) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.25, 1150);

  // Procedural Equirectangular Environment Map for realistic glass, water & brass reflections
  const pmremGenerator = THREE.PMREMGenerator ? new THREE.PMREMGenerator(renderer) : null;
  let currentEnvRT = null;

  function buildProceduralEnvMap(topHex, horizonHex, groundHex) {
    if (!pmremGenerator) return;
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, "#" + new THREE.Color(topHex).getHexString());
    grad.addColorStop(0.5, "#" + new THREE.Color(horizonHex).getHexString());
    grad.addColorStop(0.55, "#f6c96f");
    grad.addColorStop(1, "#" + new THREE.Color(groundHex).getHexString());
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);

    // Warm city window reflection sparkles along horizon band
    ctx.fillStyle = "rgba(255, 224, 150, 0.65)";
    for (let x = 8; x < 256; x += 18) {
      ctx.fillRect(x, 60, 6, 10);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const rt = pmremGenerator.fromEquirectangular(tex);
    if (currentEnvRT) currentEnvRT.dispose();
    currentEnvRT = rt;
    scene.environment = rt.texture;
    tex.dispose();
  }

  // Lighting Presets (Golden Dusk, Bright London Day, Blue Hour Night, Evening Mist)
  const LIGHTING_PRESETS = [
    {
      name: "GOLDEN DUSK",
      sky: 0x28364a,
      skyTop: 0x18253d,
      skyHorizon: 0xd98653,
      fog: 0x3b4859,
      fogDensity: 0.0014,
      hemiSky: 0xffd6ad,
      hemiGround: 0x2d3748,
      hemiInt: 0.78,
      sunColor: 0xffa663,
      sunInt: 1.25,
      sunPos: [-180, 95, 85],
      starIntensity: 0.35
    },
    {
      name: "LONDON DAYLIGHT",
      sky: 0x7ba7cc,
      skyTop: 0x3874b5,
      skyHorizon: 0xb8d4eb,
      fog: 0x9bbbd4,
      fogDensity: 0.001,
      hemiSky: 0xffffff,
      hemiGround: 0x475569,
      hemiInt: 0.94,
      sunColor: 0xfff7e6,
      sunInt: 1.18,
      sunPos: [120, 210, 90],
      starIntensity: 0.0
    },
    {
      name: "THAMES NIGHT",
      sky: 0x09101d,
      skyTop: 0x050914,
      skyHorizon: 0x1b2d48,
      fog: 0x0d1726,
      fogDensity: 0.0017,
      hemiSky: 0x496ca3,
      hemiGround: 0x0f172a,
      hemiInt: 0.55,
      sunColor: 0x93c5fd,
      sunInt: 0.62,
      sunPos: [-90, 140, -120],
      starIntensity: 0.95
    },
    {
      name: "VICTORIAN MIST",
      sky: 0x8b959e,
      skyTop: 0x6e7882,
      skyHorizon: 0xa4adb5,
      fog: 0x8b959e,
      fogDensity: 0.0034,
      hemiSky: 0xdbe3ea,
      hemiGround: 0x4b5563,
      hemiInt: 0.88,
      sunColor: 0xe2e8f0,
      sunInt: 0.65,
      sunPos: [60, 140, 40],
      starIntensity: 0.05
    }
  ];

  let currentLightingIdx = 0;
  scene.background = new THREE.Color(LIGHTING_PRESETS[0].sky);
  scene.fog = new THREE.FogExp2(LIGHTING_PRESETS[0].fog, LIGHTING_PRESETS[0].fogDensity);

  const hemiLight = new THREE.HemisphereLight(
    LIGHTING_PRESETS[0].hemiSky,
    LIGHTING_PRESETS[0].hemiGround,
    LIGHTING_PRESETS[0].hemiInt
  );
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(LIGHTING_PRESETS[0].sunColor, LIGHTING_PRESETS[0].sunInt);
  sunLight.position.set(...LIGHTING_PRESETS[0].sunPos);
  scene.add(sunLight);

  // Build Blackfriars World
  const world = window.BlackfriarsWorld.build(scene);
  const LANDMARKS = world.LANDMARKS;

  function applyLighting(idx) {
    currentLightingIdx = (idx + LIGHTING_PRESETS.length) % LIGHTING_PRESETS.length;
    const p = LIGHTING_PRESETS[currentLightingIdx];
    scene.background.setHex(p.sky);
    scene.fog.color.setHex(p.fog);
    scene.fog.density = p.fogDensity;
    hemiLight.color.setHex(p.hemiSky);
    hemiLight.groundColor.setHex(p.hemiGround);
    hemiLight.intensity = p.hemiInt;
    sunLight.color.setHex(p.sunColor);
    sunLight.intensity = p.sunInt;
    sunLight.position.set(...p.sunPos);
    if (world.setSkyTheme) world.setSkyTheme(p);
    buildProceduralEnvMap(p.skyTop, p.skyHorizon, p.hemiGround);
    timeBtn.textContent = p.name;
  }

  applyLighting(0);

  // Populate Fast Travel & Vacation Trail Teleport Buttons
  LANDMARKS.forEach((lm, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = lm.isVacation ? "tp-btn vacation" : "tp-btn";
    btn.innerHTML = `<span>${lm.key}</span>${lm.shortName}`;
    btn.addEventListener("click", () => {
      teleportToLandmark(idx);
    });
    teleportBar.appendChild(btn);
  });

  // Game & Player State
  const EYE_HEIGHT = 1.72;
  const state = {
    mode: "attract", // "attract" | "walk"
    flyMode: false,
    rainActive: false,
    postcardMode: false,
    pos: new THREE.Vector3(-36, 6.0 + EYE_HEIGHT, -301),
    velY: 0,
    yaw: Math.PI * 0.5,
    pitch: 0.05,
    isGrounded: true,
    discoveredPlaques: new Set(),
    discoveredVacation: new Set(),
    nearestLandmarkIdx: -1,
    activePlaqueIdx: -1,
    attractTimer: 0,
    attractOrbitIdx: -1
  };

  // Expose state for automated inspection/testing
  window.G = {
    state,
    world,
    teleportToLandmark,
    startWalkthrough,
    applyLighting,
    toggleRain,
    togglePostcardMode
  };

  // Input State
  const keys = {};
  let isDragging = false;
  let prevMouse = { x: 0, y: 0 };

  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;

    if (state.mode === "attract") {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        startWalkthrough();
      }
      return;
    }

    if (state.postcardMode && (e.code === "Escape" || e.code === "KeyP")) {
      e.preventDefault();
      togglePostcardMode();
      return;
    }

    // Close plaque modal on Escape or E
    if (state.activePlaqueIdx !== -1 && (e.code === "Escape" || e.code === "KeyE")) {
      e.preventDefault();
      closePlaque();
      return;
    }

    if (e.code === "KeyE" && state.nearestLandmarkIdx !== -1) {
      e.preventDefault();
      openPlaque(state.nearestLandmarkIdx);
    } else if (e.code === "KeyT") {
      applyLighting(currentLightingIdx + 1);
    } else if (e.code === "KeyR") {
      toggleRain();
    } else if (e.code === "KeyP") {
      togglePostcardMode();
    } else if (e.code === "KeyF") {
      toggleFlyMode();
    } else if (e.code === "KeyM") {
      toggleAudioMute();
    } else if (e.code === "KeyH") {
      returnToAttract();
    } else if (e.code.startsWith("Digit")) {
      const digit = e.code.replace("Digit", "");
      const idx = digit === "0" ? 9 : parseInt(digit, 10) - 1;
      if (idx >= 0 && idx < LANDMARKS.length) {
        teleportToLandmark(idx);
      }
    } else if (e.code === "Minus" && LANDMARKS.length > 10) {
      teleportToLandmark(10);
    } else if (e.code === "Equal" && LANDMARKS.length > 11) {
      teleportToLandmark(11);
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });

  canvas.addEventListener("mousedown", (e) => {
    if (state.mode !== "walk" || state.activePlaqueIdx !== -1) return;
    isDragging = true;
    prevMouse.x = e.clientX;
    prevMouse.y = e.clientY;
    if (canvas.requestPointerLock) {
      try {
        canvas.requestPointerLock();
      } catch (_) {}
    }
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  window.addEventListener("mousemove", (e) => {
    if (state.mode !== "walk" || state.activePlaqueIdx !== -1) return;
    const sensitivity = 0.0023;
    if (document.pointerLockElement === canvas) {
      state.yaw -= e.movementX * sensitivity;
      state.pitch -= e.movementY * sensitivity;
    } else if (isDragging) {
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse.x = e.clientX;
      prevMouse.y = e.clientY;
      state.yaw -= dx * sensitivity * 1.4;
      state.pitch -= dy * sensitivity * 1.4;
    }
    state.pitch = Math.max(-Math.PI * 0.47, Math.min(Math.PI * 0.47, state.pitch));
  });

  // UI Button Listeners
  startBtn.addEventListener("click", startWalkthrough);
  timeBtn.addEventListener("click", () => applyLighting(currentLightingIdx + 1));
  if (rainBtn) rainBtn.addEventListener("click", toggleRain);
  if (postcardBtn) postcardBtn.addEventListener("click", togglePostcardMode);
  modeBtn.addEventListener("click", toggleFlyMode);
  muteBtn.addEventListener("click", toggleAudioMute);
  closePlaqueBtn.addEventListener("click", closePlaque);

  function startWalkthrough() {
    window.BlackfriarsAudio.init();
    window.BlackfriarsAudio.playBellToll();
    state.mode = "walk";
    state.postcardMode = false;
    attractOverlay.classList.remove("visible");
    if (postcardOverlay) postcardOverlay.classList.remove("visible");
    hudOverlay.classList.add("visible");
    // Start at Landmark 0: Premier Inn London Blackfriars on Dorset Rise!
    teleportToLandmark(0, true);
  }

  function returnToAttract() {
    if (document.pointerLockElement) {
      try { document.exitPointerLock(); } catch (_) {}
    }
    closePlaque();
    state.mode = "attract";
    state.postcardMode = false;
    hudOverlay.classList.remove("visible");
    if (postcardOverlay) postcardOverlay.classList.remove("visible");
    attractOverlay.classList.add("visible");
  }

  function toggleRain() {
    state.rainActive = !state.rainActive;
    if (world.setRain) world.setRain(state.rainActive);
    if (window.BlackfriarsAudio.setRainAudio) {
      window.BlackfriarsAudio.setRainAudio(state.rainActive);
    }
    if (rainBtn) {
      rainBtn.textContent = state.rainActive ? "LONDON DRIZZLE" : "CLEAR SKY";
    }
  }

  function togglePostcardMode() {
    state.postcardMode = !state.postcardMode;
    if (state.postcardMode) {
      closePlaque();
      hudOverlay.classList.remove("visible");
      if (postcardOverlay) {
        postcardLocation.textContent = world.getZoneName(state.pos.x, state.pos.z);
        postcardOverlay.classList.add("visible");
      }
      if (window.BlackfriarsAudio.playShutterClick) {
        window.BlackfriarsAudio.playShutterClick();
      }
    } else {
      if (postcardOverlay) postcardOverlay.classList.remove("visible");
      hudOverlay.classList.add("visible");
    }
  }

  function toggleFlyMode() {
    state.flyMode = !state.flyMode;
    state.velY = 0;
    modeBtn.textContent = state.flyMode ? "DRONE FREE-FLY" : "PEDESTRIAN";
  }

  function toggleAudioMute() {
    const muted = window.BlackfriarsAudio.toggleMute();
    muteBtn.textContent = muted ? "MUTED" : "SOUND ON";
  }

  function teleportToLandmark(idx, silent) {
    const lm = LANDMARKS[idx];
    if (!lm) return;
    closePlaque();
    const groundY = world.getFloorHeight(lm.pos.x, lm.pos.z);
    state.pos.set(lm.pos.x, Math.max(lm.pos.y, groundY) + EYE_HEIGHT, lm.pos.z);
    state.velY = 0;

    // Orient camera toward the landmark's focal point
    const dx = lm.lookAt.x - state.pos.x;
    const dy = lm.lookAt.y - state.pos.y;
    const dz = lm.lookAt.z - state.pos.z;
    const horizDist = Math.hypot(dx, dz) || 1;
    state.yaw = Math.atan2(-dx, -dz);
    state.pitch = Math.max(-0.5, Math.min(0.55, Math.atan2(dy, horizDist)));

    // Highlight active button
    const btns = teleportBar.querySelectorAll(".tp-btn");
    btns.forEach((b, bIdx) => b.classList.toggle("active", bIdx === idx));

    if (!silent) {
      window.BlackfriarsAudio.playChime();
    }
  }

  function openPlaque(idx) {
    const lm = LANDMARKS[idx];
    if (!lm) return;
    if (document.pointerLockElement) {
      try { document.exitPointerLock(); } catch (_) {}
    }
    state.activePlaqueIdx = idx;
    state.discoveredPlaques.add(lm.id);
    if (lm.isVacation) {
      state.discoveredVacation.add(lm.id);
    }
    if (vacationCounterEl) {
      vacationCounterEl.textContent = `${state.discoveredVacation.size} / 5 ★`;
    }
    plaqueCounterEl.textContent = `${state.discoveredPlaques.size} / ${LANDMARKS.length}`;

    if (plaqueCrest) {
      plaqueCrest.textContent = lm.badge || "CITY OF LONDON HERITAGE PLAQUE";
    }
    plaqueTitle.textContent = lm.title;
    plaqueYear.textContent = lm.year;
    plaqueBody.textContent = lm.desc;
    plaqueCard.classList.remove("hidden");

    // Play signature sound for each Vacation Memory
    if (lm.sound === "hotel" && window.BlackfriarsAudio.playHotelWelcome) {
      window.BlackfriarsAudio.playHotelWelcome();
    } else if (lm.sound === "checkout" && window.BlackfriarsAudio.playCheckoutBeep) {
      window.BlackfriarsAudio.playCheckoutBeep();
    } else if (lm.sound === "pub" && window.BlackfriarsAudio.playPubCheers) {
      window.BlackfriarsAudio.playPubCheers();
    } else if (lm.sound === "bistro" && window.BlackfriarsAudio.playBistroChord) {
      window.BlackfriarsAudio.playBistroChord();
    } else {
      window.BlackfriarsAudio.playChime();
    }
  }

  function closePlaque() {
    state.activePlaqueIdx = -1;
    plaqueCard.classList.add("hidden");
  }

  // Collision Check against Building AABBs
  function collidesAt(x, z, radius) {
    if (x < -430 || x > 430 || z < -430 || z > 400) return true;
    for (let i = 0; i < world.colliders.length; i++) {
      const c = world.colliders[i];
      if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) {
        return true;
      }
    }
    return false;
  }

  // Update Pedestrian / Drone Locomotion
  function updatePlayer(dt) {
    // Keyboard look support (Q/E or Left/Right if combined with modifier, or PageUp/PageDown)
    const isRunning = !!(keys["ShiftLeft"] || keys["ShiftRight"]);
    const baseSpeed = state.flyMode ? (isRunning ? 52 : 24) : (isRunning ? 16.5 : 8.5);

    let forwardInput = 0;
    let strafeInput = 0;
    if (keys["KeyW"] || keys["ArrowUp"]) forwardInput += 1;
    if (keys["KeyS"] || keys["ArrowDown"]) forwardInput -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) strafeInput += 1;
    if (keys["KeyA"] || keys["ArrowLeft"]) strafeInput -= 1;

    const isMoving = forwardInput !== 0 || strafeInput !== 0;

    if (isMoving) {
      const len = Math.hypot(forwardInput, strafeInput);
      forwardInput /= len;
      strafeInput /= len;

      const sinY = Math.sin(state.yaw);
      const cosY = Math.cos(state.yaw);

      const moveX = (-sinY * forwardInput + cosY * strafeInput) * baseSpeed * dt;
      const moveZ = (-cosY * forwardInput - sinY * strafeInput) * baseSpeed * dt;

      if (state.flyMode) {
        state.pos.x += moveX;
        state.pos.z += moveZ;
        state.pos.y += Math.sin(state.pitch) * forwardInput * baseSpeed * dt;
      } else {
        const radius = 0.65;
        if (!collidesAt(state.pos.x + moveX, state.pos.z, radius)) {
          state.pos.x += moveX;
        }
        if (!collidesAt(state.pos.x, state.pos.z + moveZ, radius)) {
          state.pos.z += moveZ;
        }
      }
    }

    if (state.flyMode) {
      if (keys["Space"]) state.pos.y += baseSpeed * 0.65 * dt;
      if (keys["ControlLeft"] || keys["KeyC"]) state.pos.y -= baseSpeed * 0.65 * dt;
      state.pos.y = Math.max(2.5, Math.min(260, state.pos.y));
      state.isGrounded = false;
    } else {
      // Pedestrian Gravity & Floor Height Tracking
      const floorY = world.getFloorHeight(state.pos.x, state.pos.z);
      const targetEyeY = floorY + EYE_HEIGHT;

      if (keys["Space"] && state.isGrounded) {
        state.velY = 7.2;
        state.isGrounded = false;
      }

      state.velY -= 19.6 * dt;
      state.pos.y += state.velY * dt;

      if (state.pos.y <= targetEyeY) {
        state.pos.y = targetEyeY;
        state.velY = 0;
        state.isGrounded = true;
      }
    }

    // Subtle head-bob when walking
    let bobOffset = 0;
    if (!state.flyMode && state.isGrounded && isMoving) {
      const bobFreq = isRunning ? 13 : 9;
      bobOffset = Math.sin(performance.now() * 0.001 * bobFreq) * 0.065;
    }

    camera.position.set(state.pos.x, state.pos.y + bobOffset, state.pos.z);
    camera.rotation.order = "YXZ";
    camera.rotation.y = state.yaw;
    camera.rotation.x = state.pitch;
    camera.rotation.z = 0;

    // Spatial Audio Update
    const surf = world.getSurfaceType(state.pos.x, state.pos.z);
    window.BlackfriarsAudio.updateSpatial(
      state.pos,
      dt,
      isMoving,
      isRunning,
      state.isGrounded,
      surf
    );

    // Check nearest Heritage Plaque for interaction prompt
    let closestIdx = -1;
    let closestDist = 9.0;
    for (let i = 0; i < LANDMARKS.length; i++) {
      const p = LANDMARKS[i].plaquePos;
      const d = Math.hypot(state.pos.x - p.x, state.pos.z - p.z);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }
    state.nearestLandmarkIdx = closestIdx;
    if (closestIdx !== -1 && state.activePlaqueIdx === -1) {
      const lmNear = LANDMARKS[closestIdx];
      interactText.textContent = lmNear.isVacation
        ? `Relive Memory: ${lmNear.shortName}`
        : `Inspect Plaque: ${lmNear.shortName}`;
      interactPrompt.classList.remove("hidden");
    } else {
      interactPrompt.classList.add("hidden");
    }

    // Update HUD Coordinates, Zone & Compass
    const zName = world.getZoneName(state.pos.x, state.pos.z);
    hudZoneName.textContent = zName;
    if (state.postcardMode && postcardLocation) {
      postcardLocation.textContent = zName;
    }

    // Map local (x, z) meters to authentic Blackfriars GPS coordinates around (51.5112°N, 0.1044°W)
    const lat = (51.5112 - state.pos.z * 0.000009).toFixed(4);
    const lon = (0.1044 - state.pos.x * 0.000014).toFixed(4);
    const elev = (state.pos.y - EYE_HEIGHT).toFixed(1);

    // Heading in degrees (0 = North = -Z, 90 = East = +X, 180 = South = +Z, 270 = West = -X)
    const headingDeg = (((-state.yaw * 180) / Math.PI) % 360 + 360) % 360;
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const dirStr = dirs[Math.round(headingDeg / 45) % 8];
    hudCoords.textContent = `${lat}° N, ${lon}° W • ELEV +${elev}m • HDG ${Math.round(headingDeg)}° ${dirStr}`;

    if (hudOsmInfo && world.getNearestOsmFeature) {
      const osmFeat = world.getNearestOsmFeature(state.pos.x, state.pos.z);
      const parts = [];
      if (osmFeat.street) parts.push(`ST: ${osmFeat.street}`);
      if (osmFeat.building) parts.push(`${osmFeat.building}`);
      hudOsmInfo.textContent = parts.length ? parts.join(" • ") : "OSM: 603 Real London Footprints Active";
    }

    updateCompassTape(headingDeg);
    drawMinimap(headingDeg);
  }

  function updateCompassTape(headingDeg) {
    const marks = [
      { deg: 0, label: "N • NEW BRIDGE ST" },
      { deg: 45, label: "NE • BLACK FRIAR & ALLEY" },
      { deg: 90, label: "E • ST PAUL'S" },
      { deg: 135, label: "SE • TATE MODERN" },
      { deg: 180, label: "S • BLACKFRIARS BRIDGE" },
      { deg: 225, label: "SW • ONE BLACKFRIARS" },
      { deg: 270, label: "W • DORSET RISE / PREMIER INN" },
      { deg: 315, label: "NW • TESCO & SAINSBURY'S" }
    ];
    let closest = marks[0];
    let bestDiff = 999;
    marks.forEach((m) => {
      let diff = Math.abs(headingDeg - m.deg);
      if (diff > 180) diff = 360 - diff;
      if (diff < bestDiff) {
        bestDiff = diff;
        closest = m;
      }
    });
    compassTape.textContent = `◄  ${closest.label} (${Math.round(headingDeg)}°)  ►`;
  }

  // 2D Radar Minimap Renderer
  function drawMinimap(headingDeg) {
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const scale = 0.44; // meters to pixels

    minimapCtx.clearRect(0, 0, w, h);

    // Background Land
    minimapCtx.fillStyle = "#1e293b";
    minimapCtx.fillRect(0, 0, w, h);

    function toMapX(wx) {
      return cx + (wx - state.pos.x) * scale;
    }
    function toMapY(wz) {
      return cy + (wz - state.pos.z) * scale;
    }

    // River Thames Band (Z = -90 to +90)
    const riverY1 = toMapY(-90);
    const riverY2 = toMapY(90);
    minimapCtx.fillStyle = "#0f3752";
    minimapCtx.fillRect(0, riverY1, w, riverY2 - riverY1);

    // Real OpenStreetMap Building Footprints on Radar Minimap
    if (world.osmData && world.osmData.buildings) {
      minimapCtx.fillStyle = "rgba(148, 163, 184, 0.35)";
      const bldgs = world.osmData.buildings;
      for (let i = 0; i < bldgs.length; i++) {
        const b = bldgs[i];
        const bx = toMapX(b.minX);
        const by = toMapY(b.minZ);
        if (bx > w || by > h || toMapX(b.maxX) < 0 || toMapY(b.maxZ) < 0) continue;
        minimapCtx.beginPath();
        for (let p = 0; p < b.pts.length; p++) {
          const px = toMapX(b.pts[p][0]);
          const py = toMapY(b.pts[p][1]);
          if (p === 0) minimapCtx.moveTo(px, py);
          else minimapCtx.lineTo(px, py);
        }
        minimapCtx.closePath();
        minimapCtx.fill();
      }
    }

    // New Bridge Street & Dorset Rise Road Network
    minimapCtx.fillStyle = "rgba(71, 85, 105, 0.85)";
    minimapCtx.fillRect(toMapX(-14), toMapY(-390), 19 * scale, 300 * scale);
    minimapCtx.fillRect(toMapX(-46), toMapY(-306), 32 * scale, 10 * scale);

    // Highlight Custom Vacation Footprints on Minimap:
    // 1. Premier Inn (Purple)
    minimapCtx.fillStyle = "#7e22ce";
    minimapCtx.fillRect(toMapX(-68), toMapY(-318), 22 * scale, 34 * scale);
    // 2. Tesco Express (Blue)
    minimapCtx.fillStyle = "#0284c7";
    minimapCtx.fillRect(toMapX(-32), toMapY(-290), 17 * scale, 20 * scale);
    // 3. Sainsbury's Local (Orange)
    minimapCtx.fillStyle = "#ea580c";
    minimapCtx.fillRect(toMapX(-32), toMapY(-332), 17 * scale, 20 * scale);
    // 4. The Black Friar Pub (Gold/Amber)
    minimapCtx.fillStyle = "#d97706";
    minimapCtx.fillRect(toMapX(37), toMapY(-238), 20 * scale, 22 * scale);
    // 5. Alley Bistro Behind Pub (Burgundy/Rose)
    minimapCtx.fillStyle = "#be123c";
    minimapCtx.fillRect(toMapX(43), toMapY(-275), 14 * scale, 22 * scale);

    // Blackfriars Road Bridge (X: -13.5 to 4.5)
    minimapCtx.fillStyle = "#b93832";
    minimapCtx.fillRect(toMapX(-13.5), riverY1, 18 * scale, riverY2 - riverY1);

    // Blackfriars Solar Railway Station (X: 23 to 47)
    minimapCtx.fillStyle = "#2563eb";
    minimapCtx.fillRect(toMapX(23), toMapY(-96), 24 * scale, 192 * scale);

    // Landmark Dots
    LANDMARKS.forEach((lm) => {
      const mx = toMapX(lm.plaquePos.x);
      const my = toMapY(lm.plaquePos.z);
      if (mx >= 4 && mx <= w - 4 && my >= 4 && my <= h - 4) {
        const discovered = state.discoveredPlaques.has(lm.id);
        minimapCtx.fillStyle = discovered ? "#34d399" : lm.isVacation ? "#f472b6" : "#f6c96f";
        minimapCtx.beginPath();
        minimapCtx.arc(mx, my, lm.isVacation ? 4.3 : 3.4, 0, Math.PI * 2);
        minimapCtx.fill();

        minimapCtx.fillStyle = "#ffffff";
        minimapCtx.font = "bold 8px sans-serif";
        minimapCtx.fillText(lm.key, mx + 5, my + 3);
      }
    });

    // Player Arrow in Center
    minimapCtx.save();
    minimapCtx.translate(cx, cy);
    minimapCtx.rotate((headingDeg * Math.PI) / 180);
    minimapCtx.fillStyle = "#ffffff";
    minimapCtx.beginPath();
    minimapCtx.moveTo(0, -7);
    minimapCtx.lineTo(5, 6);
    minimapCtx.lineTo(0, 3);
    minimapCtx.lineTo(-5, 6);
    minimapCtx.closePath();
    minimapCtx.fill();
    minimapCtx.restore();
  }

  // Attract Mode Cinematic Camera Loop across Vacation Memories & Blackfriars Landmarks
  function updateAttractCamera(dt, elapsed) {
    state.attractTimer += Math.max(0, dt);
    const shotDuration = 6.2;
    const rawIdx = Math.floor(state.attractTimer / shotDuration) % LANDMARKS.length;
    const shotIdx = (rawIdx + LANDMARKS.length) % LANDMARKS.length;
    const lm = LANDMARKS[shotIdx] || LANDMARKS[0];

    if (shotIdx !== state.attractOrbitIdx) {
      state.attractOrbitIdx = shotIdx;
      attractPoiName.textContent = `${lm.title} (${lm.year.split("•")[0].trim()})`;
      attractPoiDesc.textContent = lm.desc;
    }

    const phase = (((state.attractTimer % shotDuration) + shotDuration) % shotDuration) / shotDuration;
    const sway = (phase - 0.5) * 9.0;

    // Frame street-level vacation memories close & intimate so signage and interiors shine; frame skyline vistas higher
    let camX, camY, camZ;
    if (lm.isVacation) {
      camX = lm.pos.x + Math.sin(phase * Math.PI) * 3.5;
      camZ = lm.pos.z + sway * 0.65;
      camY = lm.pos.y + 3.2 + Math.sin(elapsed * 0.6) * 0.6;
    } else {
      const angle = (phase - 0.5) * 0.75;
      const orbitRadius = 34;
      camX = lm.pos.x + Math.sin(angle) * orbitRadius;
      camZ = lm.pos.z + Math.cos(angle) * orbitRadius;
      camY = Math.max(15, lm.pos.y + 11 + Math.sin(elapsed * 0.5) * 3);
    }

    camera.position.set(camX, camY, camZ);
    camera.rotation.order = "YXZ";
    const dx = lm.lookAt.x - camX;
    const dy = lm.lookAt.y - camY;
    const dz = lm.lookAt.z - camZ;
    const horizDist = Math.hypot(dx, dz) || 1;
    camera.rotation.y = Math.atan2(-dx, -dz);
    camera.rotation.x = Math.atan2(dy, horizDist);
    camera.rotation.z = 0;
  }

  // Responsive Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Main Animation Loop
  let lastTime = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.max(0, Math.min((now - lastTime) / 1000, 0.1));
    lastTime = now;
    const elapsed = now * 0.001;

    world.updateAnimations(dt, elapsed, state.pos);

    if (state.mode === "attract") {
      updateAttractCamera(dt, elapsed);
    } else {
      updatePlayer(dt);
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
})();
