(() => {
  "use strict";
  const canvas = document.getElementById("game-canvas");
  let ctx = canvas.getContext("2d");
  const minimap = document.getElementById("minimap");
  const mapCtx = minimap.getContext("2d");
  const $ = id => document.getElementById(id);
  const ui = {
    attract: $("attract-screen"), hud: $("hud"), pause: $("pause-screen"), result: $("result-screen"),
    countdown: $("countdown"), message: $("race-message"), speed: $("speed-value"),
    boost: $("boost-fill"), boostText: $("boost-percent"), time: $("time-value"), lapTime: $("lap-time"),
    lap: $("lap-value"), position: $("position-value"), suffix: $("position-suffix")
  };
  const SEGMENT = 200, ROAD = 2100, DRAW_DISTANCE = 240, CAMERA_HEIGHT = 1050;
  const CAMERA_DEPTH = 1 / Math.tan(50 * Math.PI / 180);
  const PLAYER_Z = CAMERA_HEIGHT * CAMERA_DEPTH, MAX_SPEED = SEGMENT * 60, LAPS = 3;
  const COLORS = ["#ff715b", "#64eaff", "#ffd45c", "#ba8cff", "#ff70bd", "#f2f5ed", "#64ff9a"];
  const keys = { left: false, right: false, throttle: false, brake: false, boost: false };
  const segments = [], rivals = [], collected = new Set(), bikeCache = new Map();
  let trackLength = 0, mapPoints = [], width = 0, height = 0, dpr = 1;
  let state = "attract", previousTime = 0, worldTime = 0, demoDistance = 0;
  let lastCountdownNumber = 4, messageTimer = 0, shake = 0, collisionCooldown = 0;
  let padActive = false, currentRank = 8;
  const player = {
    distance: 0, x: 0, speed: 0, boost: 100, boosting: false, lap: 1,
    raceTime: 0, lapStart: 0, lapTimes: [], steer: 0, padTimer: 0
  };
  let seed = 0x51f15e;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  }
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (a, b, t) => a + (b - a) * ((-Math.cos(t * Math.PI) / 2) + .5);
  const wrap = (n, length) => ((n % length) + length) % length;
  function ordinal(n) { return n === 1 ? "ST" : n === 2 ? "ND" : n === 3 ? "RD" : "TH"; }
  function formatTime(seconds) {
    const safe = Math.max(0, seconds || 0);
    const minutes = Math.floor(safe / 60), secs = Math.floor(safe % 60);
    const millis = Math.floor((safe % 1) * 1000);
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
  }
  function findSegment(z) { return segments[Math.floor(wrap(z, trackLength) / SEGMENT) % segments.length]; }
  function lastY() { return segments.length ? segments[segments.length - 1].p2.world.y : 0; }
  function addSegment(curve, y) {
    const n = segments.length, dark = Math.floor(n / 3) % 2 === 0;
    segments.push({
      index: n, curve,
      p1: { world: { x: 0, y: lastY(), z: n * SEGMENT }, camera: {}, screen: {} },
      p2: { world: { x: 0, y, z: (n + 1) * SEGMENT }, camera: {}, screen: {} },
      color: dark ? 0 : 1, sprites: [], boost: false, energy: null, clip: height
    });
  }
  function addRoad(enter, hold, leave, curve, hill = 0) {
    const startY = lastY(), endY = startY + hill, total = enter + hold + leave;
    for (let n = 0; n < enter; n++) addSegment(ease(0, curve, n / enter), ease(startY, endY, n / total));
    for (let n = 0; n < hold; n++) addSegment(curve, ease(startY, endY, (enter + n) / total));
    for (let n = 0; n < leave; n++) addSegment(ease(curve, 0, n / leave), ease(startY, endY, (enter + hold + n) / total));
  }
  function decorateTrack() {
    const types = ["fern", "fern", "mushroom", "coral", "tree"];
    for (let i = 12; i < segments.length; i++) {
      const segment = segments[i];
      if (i % 2 === 0) {
        const side = random() > .5 ? 1 : -1;
        segment.sprites.push({ type: types[Math.floor(random() * types.length)], side,
          offset: side * (1.35 + random() * 2.2), size: 850 + random() * 1450, tint: random() });
      }
      if (i % 7 === 0) {
        const side = random() > .5 ? 1 : -1;
        segment.sprites.push({ type: "grass", side, offset: side * (1.12 + random() * .35), size: 380 + random() * 300, tint: random() });
      }
      if (i % 137 === 30) segment.sprites.push({ type: "arch", side: 1, offset: 0, size: 4800, tint: random() });
      if (i % 91 === 40) segment.sprites.push({ type: "pylon", side: i % 182 ? 1 : -1, offset: i % 182 ? 1.28 : -1.28, size: 1300, tint: random() });
    }
    for (let start = 105; start < segments.length - 40; start += 173) {
      for (let n = 0; n < 7; n++) segments[start + n].boost = true;
      segments[start + 16].energy = { x: [-.62, 0, .62][Math.floor(random() * 3)] };
    }
  }
  function buildTrack() {
    addRoad(30, 45, 30, 0); addRoad(45, 65, 45, 2.6, 1800);
    addRoad(35, 45, 35, -3.8, -700); addRoad(30, 80, 30, 0, -2200);
    addRoad(50, 45, 50, 5.2, 1300); addRoad(30, 35, 30, -2.1, 1600);
    addRoad(50, 70, 50, -4.4, -2600); addRoad(25, 45, 25, 2.2, 500);
    addRoad(45, 60, 45, 0, 2500); addRoad(35, 55, 35, 4.6, -800);
    addRoad(45, 45, 45, -5.1, 700); addRoad(30, 75, 30, 0, -1800);
    addRoad(50, 60, 50, 3.5, 900); addRoad(40, 55, 40, -2.8, -900);
    addRoad(40, 60, 40, 0);
    trackLength = segments.length * SEGMENT;
    decorateTrack(); buildMap();
  }
  function buildMap() {
    mapPoints = [
      { x: -91, y: -25 }, { x: -73, y: -47 }, { x: -38, y: -54 }, { x: -7, y: -42 },
      { x: 24, y: -55 }, { x: 64, y: -48 }, { x: 94, y: -25 }, { x: 102, y: 5 },
      { x: 80, y: 31 }, { x: 48, y: 29 }, { x: 30, y: 51 }, { x: -4, y: 55 },
      { x: -29, y: 35 }, { x: -58, y: 50 }, { x: -90, y: 32 }, { x: -103, y: 3 }
    ];
  }

  const audio = {
    context: null, master: null, engine: null, engineGain: null, muted: false,
    init() {
      if (this.context) { this.context.resume(); return; }
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
      this.master = this.context.createGain(); this.master.gain.value = .34;
      this.master.connect(this.context.destination);
      this.engine = this.context.createOscillator(); this.engine.type = "sawtooth";
      const filter = this.context.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 420;
      this.engineGain = this.context.createGain(); this.engineGain.gain.value = 0;
      this.engine.connect(filter); filter.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engine.start();
    },
    update() {
      if (!this.context) return;
      const now = this.context.currentTime, active = state === "racing" || state === "countdown";
      this.engine.frequency.setTargetAtTime(48 + player.speed / MAX_SPEED * 115 + (player.boosting ? 45 : 0), now, .06);
      this.engineGain.gain.setTargetAtTime(active && !this.muted ? .12 : 0, now, .08);
      this.master.gain.setTargetAtTime(this.muted ? 0 : .34, now, .03);
    },
    tone(frequency, duration = .12, type = "square", volume = .18, slide = 0) {
      if (!this.context || this.muted) return;
      const now = this.context.currentTime, oscillator = this.context.createOscillator(), gain = this.context.createGain();
      oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
      gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      oscillator.connect(gain); gain.connect(this.master); oscillator.start(now); oscillator.stop(now + duration);
    },
    toggle() { this.muted = !this.muted; $("sound-button").textContent = this.muted ? "×" : "♪"; $("sound-button").setAttribute("aria-label", this.muted ? "Enable sound" : "Mute sound"); }
  };
  let countdownLeft = 0, pausedFrom = "racing";
  function showMessage(text, duration = 1.7) {
    ui.message.textContent = text; ui.message.classList.add("show"); messageTimer = duration;
  }
  function resetRace() {
    Object.assign(player, { distance: 0, x: 0, speed: 0, boost: 100, boosting: false,
      lap: 1, raceTime: 0, lapStart: 0, lapTimes: [], steer: 0, padTimer: 0 });
    rivals.length = 0; collected.clear(); currentRank = 8; collisionCooldown = 0; padActive = false;
    for (let i = 0; i < 7; i++) rivals.push({ number: i + 1, distance: 650 + i * 390, x: (i % 3 - 1) * .58,
      color: COLORS[i], baseSpeed: 9200 + i * 215 + random() * 350, phase: random() * 6.28 });
    countdownLeft = 3.8; lastCountdownNumber = 4; ui.countdown.textContent = "3";
    ui.message.classList.remove("show"); messageTimer = 0; updateHud();
  }
  function startRace() {
    audio.init(); resetRace(); state = "countdown";
    ui.attract.hidden = true; ui.pause.hidden = true; ui.result.hidden = true; ui.hud.hidden = false;
    Object.keys(keys).forEach(key => { keys[key] = false; });
  }
  function togglePause() {
    if (state === "racing" || state === "countdown") {
      pausedFrom = state; state = "paused"; ui.pause.hidden = false;
      Object.keys(keys).forEach(key => { keys[key] = false; });
    } else if (state === "paused") {
      state = pausedFrom; ui.pause.hidden = true; audio.init(); previousTime = performance.now();
    }
  }
  function finishRace() {
    if (state === "finished") return;
    player.lapTimes.push(player.raceTime - player.lapStart);
    state = "finished"; player.boosting = false; ui.hud.hidden = true; ui.result.hidden = false;
    const won = currentRank === 1;
    $("result-kicker").textContent = won ? "XENO GRAND PRIX / VICTORY" : "XENO GRAND PRIX / COMPLETE";
    $("result-title").innerHTML = won ? "RIFT<br>CONQUERED" : "RACE<br>COMPLETE";
    $("result-position").textContent = currentRank; $("result-suffix").innerHTML = `${ordinal(currentRank)}<small>FINAL POSITION</small>`;
    $("result-time").textContent = formatTime(player.raceTime);
    $("best-lap").textContent = formatTime(Math.min(...player.lapTimes));
    audio.tone(won ? 523 : 330, .6, "sawtooth", .2, won ? 520 : 80);
  }
  function updateRivals(dt) {
    for (let i = 0; i < rivals.length; i++) {
      const rival = rivals[i];
      const catchup = clamp((player.distance - rival.distance) / 8000, -.035, .04);
      rival.distance += rival.baseSpeed * (1 + catchup + Math.sin(worldTime * .45 + rival.phase) * .025) * dt;
      const target = Math.sin(rival.distance * .000035 + rival.phase) * .72;
      rival.x = lerp(rival.x, target, dt * .7);
    }
  }
  function updateRace(dt) {
    const segment = findSegment(player.distance + PLAYER_Z), speedRatio = player.speed / MAX_SPEED;
    const steering = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
    player.steer = lerp(player.steer, steering, Math.min(1, dt * 9));
    player.x += steering * dt * 2.05 * clamp(speedRatio * 2, .18, 1);
    player.x -= segment.curve * speedRatio * speedRatio * dt * .22;
    player.padTimer = Math.max(0, player.padTimer - dt);
    player.boosting = keys.boost && player.boost > .2 && player.speed > MAX_SPEED * .2;
    if (player.boosting) player.boost = Math.max(0, player.boost - 24 * dt);
    else player.boost = Math.min(100, player.boost + 3.2 * dt);
    const speedCap = MAX_SPEED * (player.boosting || player.padTimer > 0 ? 1.34 : 1);
    if (keys.brake) player.speed -= MAX_SPEED * 1.5 * dt;
    else if (keys.throttle || player.padTimer > 0) player.speed += MAX_SPEED * (player.boosting ? .72 : .39) * dt;
    else player.speed -= MAX_SPEED * .19 * dt;
    if (Math.abs(player.x) > 1) {
      player.speed -= MAX_SPEED * .62 * dt;
      if (player.speed > MAX_SPEED * .65) shake = Math.max(shake, 2.5);
    }
    player.speed = clamp(player.speed, 0, speedCap);
    if (Math.abs(player.x) > 1.9) {
      player.x = clamp(player.x, -1.9, 1.9); player.speed *= .72; shake = 10;
      if (collisionCooldown <= 0) { audio.tone(90, .18, "sawtooth", .25, -45); collisionCooldown = .6; }
    }
    player.distance += player.speed * dt; player.raceTime += dt;
    const onPad = segment.boost && Math.abs(player.x) < .94;
    if (onPad) {
      player.padTimer = .6; player.speed = Math.max(player.speed, MAX_SPEED * 1.08);
      player.boost = Math.min(100, player.boost + 10 * dt);
      if (!padActive) { showMessage("ION SURGE"); audio.tone(220, .28, "sawtooth", .17, 520); }
    }
    padActive = onPad;
    if (segment.energy) {
      const key = `${Math.floor(player.distance / trackLength)}:${segment.index}`;
      if (!collected.has(key) && Math.abs(player.x - segment.energy.x) < .25) {
        collected.add(key); player.boost = Math.min(100, player.boost + 30);
        showMessage("+30 ION CHARGE"); audio.tone(620, .2, "sine", .2, 480);
      }
    }
    if (collisionCooldown <= 0) {
      for (const rival of rivals) {
        if (Math.abs(rival.distance - player.distance - PLAYER_Z) < 250 && Math.abs(rival.x - player.x) < .25) {
          player.speed *= .67; player.x += player.x <= rival.x ? -.18 : .18;
          shake = 13; collisionCooldown = .75; audio.tone(110, .2, "square", .23, -60); break;
        }
      }
    }
    currentRank = 1 + rivals.filter(rival => rival.distance > player.distance).length;
    const newLap = Math.floor(player.distance / trackLength) + 1;
    if (newLap > player.lap && newLap <= LAPS) {
      player.lapTimes.push(player.raceTime - player.lapStart); player.lapStart = player.raceTime; player.lap = newLap;
      showMessage(newLap === LAPS ? "FINAL LAP" : `LAP ${newLap} / ${LAPS}`, 2.3);
      audio.tone(440, .35, "square", .16, 440);
    }
    if (player.distance >= trackLength * LAPS) finishRace();
  }
  function updateHud() {
    ui.speed.textContent = String(Math.round(player.speed / MAX_SPEED * 342)).padStart(3, "0");
    ui.boost.style.width = `${player.boost}%`; ui.boostText.textContent = `${Math.round(player.boost)}%`;
    ui.boost.style.background = player.boost < 20 ? "#ff875c" : "#c9ff48";
    ui.time.textContent = formatTime(player.raceTime); ui.lapTime.textContent = formatTime(player.raceTime - player.lapStart);
    ui.lap.textContent = Math.min(player.lap, LAPS); ui.position.textContent = currentRank; ui.suffix.textContent = ordinal(currentRank);
  }
  function polygon(color, ...points) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
    ctx.closePath(); ctx.fill();
  }
  function project(point, cameraX, cameraY, cameraZ) {
    point.camera.x = point.world.x - cameraX; point.camera.y = point.world.y - cameraY;
    point.camera.z = point.world.z - cameraZ;
    point.screen.scale = CAMERA_DEPTH / point.camera.z;
    point.screen.x = Math.round(width / 2 + point.screen.scale * point.camera.x * width / 2);
    point.screen.y = Math.round(height / 2 - point.screen.scale * point.camera.y * height / 2);
    point.screen.w = Math.round(point.screen.scale * ROAD * width / 2);
  }
  function drawBackground(distance) {
    const horizon = height * .47, curve = findSegment(distance + PLAYER_Z).curve;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon * 1.4);
    sky.addColorStop(0, "#09232e"); sky.addColorStop(.5, "#376567"); sky.addColorStop(1, "#b2b695");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    const sunX = width * .76 - curve * 8, sunY = height * .16, sunR = Math.min(width, height) * .085;
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.7);
    glow.addColorStop(0, "rgba(255,236,170,.48)"); glow.addColorStop(1, "rgba(255,220,160,0)");
    ctx.fillStyle = glow; ctx.fillRect(sunX - sunR * 3, sunY - sunR * 3, sunR * 6, sunR * 6);
    ctx.fillStyle = "#e9e4bb"; ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(42,79,79,.28)";
    for (let i = 0; i < 4; i++) ctx.fillRect(sunX - sunR, sunY - sunR * .45 + i * sunR * .34, sunR * 2, 2 + i * 2);
    const drift = curve * 13 + Math.sin(distance * .000002) * 20;
    function mountainLayer(base, color, amplitude, frequency, shift) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, height);
      for (let x = -80; x <= width + 100; x += 65) {
        const y = base - Math.abs(Math.sin((x + shift) * frequency)) * amplitude - Math.abs(Math.sin((x + shift) * frequency * .37)) * amplitude * .65;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height); ctx.closePath(); ctx.fill();
    }
    mountainLayer(horizon + 35, "#395759", height * .31, .0041, drift * .3 + 160);
    mountainLayer(horizon + 58, "#1f4745", height * .24, .0067, drift * .7 - 80);
    ctx.fillStyle = "rgba(107,163,135,.23)";
    for (let i = 0; i < 13; i++) {
      const x = wrap(i * 173 - drift * 2, width + 200) - 100;
      const h = 45 + (i * 37 % 110);
      ctx.fillRect(x, horizon - h, 3, h + 40);
      ctx.beginPath(); ctx.ellipse(x, horizon - h, 27 + i % 4 * 8, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = "rgba(211,255,220,.18)"; ctx.lineWidth = 1;
    for (let i = 0; i < 28; i++) {
      const x = wrap(i * 149.3 + worldTime * (3 + i % 4), width + 30) - 15;
      const y = 40 + (i * 83 % Math.max(80, height * .45));
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(worldTime + i) * 4, y - 3); ctx.stroke();
    }
  }
  function renderRoad(distance, playerX) {
    // Projection must use lap-local distance; absolute race distance leaves later laps behind the camera.
    const cameraDistance = wrap(distance, trackLength);
    const base = findSegment(cameraDistance), baseIndex = base.index;
    const basePercent = wrap(cameraDistance, SEGMENT) / SEGMENT;
    const playerSegment = findSegment(distance + PLAYER_Z);
    const playerPercent = wrap(distance + PLAYER_Z, SEGMENT) / SEGMENT;
    const playerY = lerp(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);
    let x = 0, dx = -(base.curve * basePercent), maxY = height;
    for (let n = 0; n < DRAW_DISTANCE; n++) {
      const segment = segments[(baseIndex + n) % segments.length];
      const looped = segment.index < baseIndex;
      project(segment.p1, playerX * ROAD - x, playerY + CAMERA_HEIGHT, cameraDistance - (looped ? trackLength : 0));
      project(segment.p2, playerX * ROAD - x - dx, playerY + CAMERA_HEIGHT, cameraDistance - (looped ? trackLength : 0));
      x += dx; dx += segment.curve; segment.clip = maxY;
      const p1 = segment.p1.screen, p2 = segment.p2.screen;
      if (segment.p1.camera.z <= CAMERA_DEPTH || p2.y >= maxY || p2.y >= p1.y) continue;
      const grass = segment.color ? "#163d36" : "#12372f";
      ctx.fillStyle = grass; ctx.fillRect(0, p2.y, width, p1.y - p2.y + 1);
      const roadColor = segment.boost ? "#176d70" : segment.color ? "#3c3b49" : "#353642";
      const edge = segment.color ? "#d3e6d8" : "#c0d0c6";
      polygon(roadColor, p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y);
      const r1 = p1.w * 1.11, r2 = p2.w * 1.11;
      polygon(segment.boost ? "#75fff0" : edge, p1.x - r1, p1.y, p1.x - p1.w, p1.y, p2.x - p2.w, p2.y, p2.x - r2, p2.y);
      polygon(segment.boost ? "#75fff0" : edge, p1.x + p1.w, p1.y, p1.x + r1, p1.y, p2.x + r2, p2.y, p2.x + p2.w, p2.y);
      if (segment.color) {
        for (let lane = 1; lane < 3; lane++) {
          const l1 = p1.w * 2 / 3, l2 = p2.w * 2 / 3;
          const lx1 = p1.x - p1.w + l1 * lane, lx2 = p2.x - p2.w + l2 * lane;
          const lw1 = p1.w * .012, lw2 = p2.w * .012;
          polygon("rgba(205,224,215,.55)", lx1 - lw1, p1.y, lx1 + lw1, p1.y, lx2 + lw2, p2.y, lx2 - lw2, p2.y);
        }
      }
      if (segment.boost) {
        const w1 = p1.w * .8, w2 = p2.w * .8;
        polygon("rgba(93,255,226,.19)", p1.x - w1, p1.y, p1.x + w1, p1.y, p2.x + w2, p2.y, p2.x - w2, p2.y);
      }
      maxY = p2.y;
    }
    return { baseIndex, playerY };
  }
  function drawArch(segment) {
    const p = segment.p1.screen, roadW = p.w * 2, h = roadW * .67;
    if (h < 3 || h > height * 5) return;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, width, segment.clip); ctx.clip();
    const left = p.x - p.w * 1.12, right = p.x + p.w * 1.12, top = p.y - h;
    const thick = Math.max(1, roadW * .045);
    polygon("#172b2d", left - thick, p.y, left + thick, p.y, left + thick * .6, top, left - thick * .6, top);
    polygon("#172b2d", right - thick, p.y, right + thick, p.y, right + thick * .6, top, right - thick * .6, top);
    polygon("#203638", left - thick, top + thick, right + thick, top + thick, right + thick * .6, top - thick, left - thick * .6, top - thick);
    ctx.strokeStyle = "#73fbd6"; ctx.lineWidth = Math.max(1, thick * .16); ctx.shadowColor = "#73fbd6"; ctx.shadowBlur = thick;
    ctx.beginPath(); ctx.moveTo(left, p.y); ctx.lineTo(left, top); ctx.lineTo(right, top); ctx.lineTo(right, p.y); ctx.stroke();
    if (roadW > 160) {
      ctx.shadowBlur = 0; ctx.fillStyle = "#c9ff48"; ctx.textAlign = "center"; ctx.font = `900 ${Math.max(8, thick * .7)}px Consolas`;
      ctx.fillText("R I F T  / /  X R L", p.x, top + thick * .25);
    }
    ctx.restore();
  }
  function drawSprite(sprite, segment, depth) {
    if (sprite.type === "arch") { drawArch(segment); return; }
    const p = segment.p1.screen;
    if (!p.scale || p.scale <= 0) return;
    const unit = p.scale * width / 2, size = sprite.size * unit;
    if (size < 2) return;
    const x = p.x + unit * sprite.offset * ROAD, y = p.y;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, width, segment.clip); ctx.clip();
    ctx.globalAlpha = clamp(1 - depth / DRAW_DISTANCE * .75, .18, 1);
    ctx.translate(x, y); ctx.scale(size / 1000, size / 1000);
    const pink = sprite.tint > .5 ? "#ef668e" : "#a568c8";
    if (sprite.type === "mushroom") {
      ctx.strokeStyle = "#7ca897"; ctx.lineWidth = 100; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-140, -480, 30, -800); ctx.stroke();
      ctx.fillStyle = pink; ctx.beginPath(); ctx.ellipse(20, -820, 480, 190, -.08, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#552f62"; ctx.beginPath(); ctx.ellipse(20, -810, 430, 75, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#b9ffb8";
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(-260 + i * 86, -880 - Math.sin(i) * 55, 15 + i % 3 * 7, 0, 7); ctx.fill(); }
    } else if (sprite.type === "pylon") {
      polygon("#17282d", -90, 0, 90, 0, 65, -900, -50, -980);
      ctx.fillStyle = "#8fffe1"; ctx.shadowColor = "#8fffe1"; ctx.shadowBlur = 40; ctx.fillRect(-43, -850, 22, 650);
      ctx.fillStyle = "#c9ff48"; ctx.fillRect(-65, -970, 130, 65);
    } else if (sprite.type === "coral") {
      ctx.strokeStyle = pink; ctx.lineCap = "round"; ctx.lineWidth = 48;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(i * 150, -450, i * 220, -850 + Math.abs(i) * 130); ctx.stroke();
        ctx.fillStyle = "#88ffca"; ctx.beginPath(); ctx.arc(i * 220, -850 + Math.abs(i) * 130, 35, 0, 7); ctx.fill();
      }
    } else {
      const tree = sprite.type === "tree";
      ctx.strokeStyle = tree ? "#314c3d" : "#447a58"; ctx.lineWidth = tree ? 120 : 55; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(80, -450, 0, -800); ctx.stroke();
      const leaves = tree ? 11 : 8;
      for (let i = 0; i < leaves; i++) {
        const angle = i / leaves * Math.PI * 2 + sprite.tint;
        const len = tree ? 630 : 480, ex = Math.cos(angle) * len, ey = -800 + Math.sin(angle) * len * .38;
        ctx.strokeStyle = i % 2 ? "#2f7351" : "#3f9160"; ctx.lineWidth = tree ? 115 : 85;
        ctx.beginPath(); ctx.moveTo(0, -790); ctx.quadraticCurveTo(ex * .55, ey - 180, ex, ey); ctx.stroke();
        ctx.strokeStyle = "rgba(133,255,146,.45)"; ctx.lineWidth = 13; ctx.stroke();
      }
      if (!tree) {
        ctx.fillStyle = "#b8ff72"; ctx.shadowColor = "#a4ff66"; ctx.shadowBlur = 35;
        ctx.beginPath(); ctx.arc(0, -810, 34, 0, 7); ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawEnergy(segment, depth) {
    const energy = segment.energy;
    if (!energy || collected.has(`${Math.floor(player.distance / trackLength)}:${segment.index}`)) return;
    const p = segment.p1.screen, unit = p.scale * width / 2;
    if (unit <= 0) return;
    const size = 230 * unit, x = p.x + unit * energy.x * ROAD, y = p.y - size * 1.5 + Math.sin(worldTime * 4 + segment.index) * size * .18;
    if (size < 1) return;
    ctx.save(); ctx.globalAlpha = clamp(1 - depth / DRAW_DISTANCE, .15, 1); ctx.translate(x, y); ctx.rotate(worldTime * 1.8);
    ctx.fillStyle = "#c9ff48"; ctx.shadowColor = "#c9ff48"; ctx.shadowBlur = size;
    polygon("#c9ff48", 0, -size, size * .55, 0, 0, size, -size * .55, 0);
    ctx.fillStyle = "#f4ffd8"; ctx.fillRect(-size * .08, -size * .5, size * .16, size); ctx.restore();
  }
  function shiftColor(hex, amount) {
    const value = parseInt(hex.slice(1), 16);
    const channel = shift => clamp((value >> shift & 255) + amount, 0, 255);
    return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
  }
  function ellipse(fill, x, y, rx, ry, stroke = null, lineWidth = 1) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }
  function drawHoverPod(side, w, h, color, paint, detail, power) {
    ctx.save(); ctx.translate(side * w * .355, -h * .12);
    const flame = h * (.42 + power * .72) * (.9 + Math.sin(worldTime * 47 + side) * .1);
    const plume = ctx.createLinearGradient(0, h * .12, 0, h * .18 + flame);
    plume.addColorStop(0, "#f4ffff"); plume.addColorStop(.18, "#8ffff0");
    plume.addColorStop(.5, power > .5 ? "#d6ff68" : "#4edbcf"); plume.addColorStop(1, "rgba(50,210,210,0)");
    ctx.fillStyle = plume; ctx.shadowColor = "#62ffe7"; ctx.shadowBlur = Math.min(24, w * .08);
    ctx.beginPath(); ctx.moveTo(-w * .065, h * .12);
    ctx.bezierCurveTo(-w * .08, h * .3, -w * .035, h * .18 + flame * .72, 0, h * .18 + flame);
    ctx.bezierCurveTo(w * .045, h * .18 + flame * .65, w * .08, h * .3, w * .065, h * .12); ctx.fill();
    ctx.shadowBlur = 0;
    ellipse("rgba(85,255,224,.12)", 0, h * .25, w * .16, h * .075);
    ellipse(null, 0, h * .25, w * .135, h * .052, "rgba(116,255,231,.7)", Math.max(1, w * .009));
    polygon("#091218", -w * .15, h * .16, -w * .16, -h * .17, -w * .085, -h * .49,
      w * .045, -h * .59, w * .14, -h * .3, w * .155, h * .12, w * .07, h * .22, -w * .07, h * .22);
    polygon(paint, -w * .125, h * .06, -w * .125, -h * .19, -w * .06, -h * .43,
      w * .035, -h * .51, w * .105, -h * .27, w * .115, h * .02, w * .045, h * .11);
    polygon(shiftColor(color, 35), -w * .06, -h * .43, w * .035, -h * .51, w * .07, -h * .39, -w * .035, -h * .34);
    polygon("rgba(3,12,18,.72)", -w * .09, -h * .18, w * .08, -h * .25, w * .09, -h * .06, -w * .1, h * .005);
    ellipse("#050c12", 0, h * .105, w * .104, h * .135, "#47616a", Math.max(1, w * .018));
    ellipse("#142a31", 0, h * .105, w * .077, h * .101, color, Math.max(1, w * .012));
    ellipse("#07151c", 0, h * .105, w * .049, h * .069, "#8ffff0", Math.max(1, w * .007));
    ellipse("#dffff7", 0, h * .105, w * .022, h * .035);
    if (detail) {
      ctx.strokeStyle = "rgba(220,255,244,.38)"; ctx.lineWidth = Math.max(.6, w * .005);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(-w * .075, -h * (.15 - i * .055)); ctx.lineTo(w * .065, -h * (.19 - i * .055)); ctx.stroke();
      }
      ctx.fillStyle = "#b8fff0"; ctx.shadowColor = color; ctx.shadowBlur = Math.min(12, w * .04);
      ctx.fillRect(-w * .095, -h * .325, w * .15, Math.max(1, h * .018)); ctx.shadowBlur = 0;
      ellipse("#b8d0ce", -w * .09, -h * .07, w * .009, w * .009);
      ellipse("#b8d0ce", w * .085, -h * .09, w * .009, w * .009);
    }
    ctx.restore();
  }
  function drawRider(w, h, paint, detail, number) {
    ctx.save(); ctx.translate(0, -h * .57);
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      ctx.strokeStyle = "#071016"; ctx.lineWidth = w * .09;
      ctx.beginPath(); ctx.moveTo(side * w * .105, -h * .25); ctx.lineTo(side * w * .19, -h * .08); ctx.lineTo(side * w * .235, h * .015); ctx.stroke();
      ctx.strokeStyle = "#31434a"; ctx.lineWidth = w * .052; ctx.stroke();
      ellipse(paint, side * w * .13, -h * .25, w * .07, h * .075, "#101d24", Math.max(1, w * .012));
      ellipse("#10191e", side * w * .235, h * .015, w * .04, h * .035);
    }
    polygon("#081218", -w * .13, h * .015, -w * .145, -h * .27, -w * .08, -h * .39,
      w * .08, -h * .39, w * .145, -h * .27, w * .13, h * .015, 0, h * .07);
    polygon(paint, -w * .095, -h * .035, -w * .105, -h * .26, -w * .06, -h * .34,
      w * .06, -h * .34, w * .105, -h * .26, w * .095, -h * .035, 0, h * .025);
    polygon("#182a31", -w * .045, -h * .05, -w * .05, -h * .29, 0, -h * .335, w * .05, -h * .29, w * .045, -h * .05, 0, -h * .015);
    ctx.fillStyle = "#111e24"; ctx.fillRect(-w * .06, -h * .405, w * .12, h * .09);
    ellipse("#071016", 0, -h * .49, w * .118, h * .185);
    ellipse(paint, 0, -h * .5, w * .098, h * .159, "#6d8588", Math.max(1, w * .008));
    polygon("#0a1a23", -w * .074, -h * .515, -w * .05, -h * .59, w * .05, -h * .59, w * .074, -h * .515, w * .055, -h * .45, -w * .055, -h * .45);
    ctx.strokeStyle = "rgba(205,255,244,.7)"; ctx.lineWidth = Math.max(1, w * .009);
    ctx.beginPath(); ctx.arc(0, -h * .51, w * .073, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
    ctx.fillStyle = "#8ffff0"; ctx.shadowColor = "#52f7e6"; ctx.shadowBlur = Math.min(10, w * .04);
    ctx.fillRect(-w * .06, -h * .535, w * .12, Math.max(1, h * .018)); ctx.shadowBlur = 0;
    if (detail) {
      ctx.fillStyle = "#e7fff5"; ctx.textAlign = "center"; ctx.font = `900 ${Math.max(6, w * .047)}px Consolas`;
      ctx.fillText(number, 0, -h * .155);
      ctx.strokeStyle = "rgba(220,255,244,.28)"; ctx.lineWidth = Math.max(.6, w * .004);
      ctx.beginPath(); ctx.moveTo(-w * .075, -h * .08); ctx.lineTo(w * .075, -h * .08); ctx.stroke();
    }
    ctx.restore();
  }
  function drawBike(x, y, w, color, lean = 0, isPlayer = false, number = "09") {
    const power = isPlayer && player.boosting ? 1 : 0, braking = isPlayer && keys.brake ? 1 : 0;
    const frame = Math.floor(worldTime * 10) % 4;
    const key = `${color}:${number}:${isPlayer ? 1 : 0}:${power}:${braking}:${frame}`;
    let sprite = bikeCache.get(key);
    if (!sprite) {
      if (bikeCache.size >= 64) bikeCache.clear();
      sprite = document.createElement("canvas"); sprite.width = 384; sprite.height = 600;
      const liveContext = ctx;
      try {
        ctx = sprite.getContext("2d");
        drawBikeModel(192, 300, 256, color, isPlayer, number);
      } finally { ctx = liveContext; }
      bikeCache.set(key, sprite);
    }
    const scale = w / 256;
    ctx.save(); ctx.translate(x, y + Math.sin(worldTime * 7) * Math.min(2, w * .008));
    ctx.rotate(lean * .09); ctx.transform(1, 0, -lean * .035, 1, 0, 0);
    ctx.drawImage(sprite, -192 * scale, -300 * scale, 384 * scale, 600 * scale);
    ctx.restore();
  }
  function drawBikeModel(x, y, w, color, isPlayer = false, number = "09") {
    const h = w * .72, detail = true, power = isPlayer && player.boosting ? 1 : 0;
    const paint = ctx.createLinearGradient(-w * .45, -h, w * .4, h * .25);
    paint.addColorStop(0, shiftColor(color, 55)); paint.addColorStop(.28, color);
    paint.addColorStop(.72, shiftColor(color, -55)); paint.addColorStop(1, shiftColor(color, -85));
    const metal = ctx.createLinearGradient(-w * .25, 0, w * .25, 0);
    metal.addColorStop(0, "#0a141b"); metal.addColorStop(.25, "#52676d"); metal.addColorStop(.48, "#17262e");
    metal.addColorStop(.75, "#40565e"); metal.addColorStop(1, "#080f16");
    ctx.save(); ctx.translate(x, y);
    ellipse("rgba(0,5,9,.5)", 0, h * .24, w * .54, h * .17);
    const field = ctx.createRadialGradient(0, h * .2, 0, 0, h * .2, w * .48);
    field.addColorStop(0, power ? "rgba(201,255,72,.2)" : "rgba(82,247,230,.16)"); field.addColorStop(1, "rgba(82,247,230,0)");
    ellipse(field, 0, h * .2, w * .5, h * .2);
    ctx.strokeStyle = "#111f27"; ctx.lineWidth = Math.max(2, w * .065); ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * w * .12, -h * .35); ctx.lineTo(side * w * .36, -h * .08); ctx.stroke();
      ctx.strokeStyle = "#587078"; ctx.lineWidth = Math.max(1, w * .018);
      ctx.beginPath(); ctx.moveTo(side * w * .14, -h * .32); ctx.lineTo(side * w * .34, -h * .1); ctx.stroke();
      ctx.strokeStyle = "#111f27"; ctx.lineWidth = Math.max(2, w * .065);
      drawHoverPod(side, w, h, color, paint, detail, power);
    }
    polygon("#060d13", -w * .265, h * .15, -w * .285, -h * .3, -w * .18, -h * .78,
      0, -h * .96, w * .18, -h * .78, w * .285, -h * .3, w * .265, h * .15, 0, h * .27);
    polygon(metal, -w * .225, h * .09, -w * .235, -h * .3, -w * .145, -h * .72,
      0, -h * .87, w * .145, -h * .72, w * .235, -h * .3, w * .225, h * .09, 0, h * .19);
    polygon(paint, -w * .205, -h * .04, -w * .19, -h * .34, -w * .11, -h * .66,
      0, -h * .79, w * .11, -h * .66, w * .19, -h * .34, w * .205, -h * .04, 0, h * .1);
    polygon(shiftColor(color, 38), -w * .11, -h * .66, 0, -h * .79, w * .11, -h * .66, w * .075, -h * .57, 0, -h * .68, -w * .075, -h * .57);
    polygon("#08151d", -w * .105, -h * .28, -w * .085, -h * .58, 0, -h * .7,
      w * .085, -h * .58, w * .105, -h * .28, w * .065, -h * .12, -w * .065, -h * .12);
    for (const side of [-1, 1]) {
      polygon("#101e26", side * w * .08, -h * .03, side * w * .21, -h * .1,
        side * w * .18, -h * .32, side * w * .1, -h * .27);
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = Math.min(14, w * .05);
      ctx.fillRect(side * w * .155 - w * .032, -h * .205, w * .064, Math.max(1, h * .025));
    }
    ctx.shadowBlur = 0;
    drawRider(w, h, paint, detail, number);
    ctx.strokeStyle = "#789097"; ctx.lineWidth = Math.max(1, w * .014);
    ctx.beginPath(); ctx.moveTo(-w * .24, -h * .555); ctx.lineTo(-w * .12, -h * .58); ctx.lineTo(w * .12, -h * .58); ctx.lineTo(w * .24, -h * .555); ctx.stroke();
    polygon("#263b43", -w * .075, -h * .58, 0, -h * .68, w * .075, -h * .58, w * .052, -h * .49, -w * .052, -h * .49);
    ctx.fillStyle = "#9ffff0"; ctx.shadowColor = "#52f7e6"; ctx.shadowBlur = Math.min(12, w * .04);
    ctx.fillRect(-w * .038, -h * .57, w * .076, Math.max(1, h * .022)); ctx.shadowBlur = 0;
    if (detail) {
      ctx.strokeStyle = "rgba(225,255,247,.38)"; ctx.lineWidth = Math.max(.7, w * .005);
      ctx.beginPath(); ctx.moveTo(0, -h * .44); ctx.lineTo(0, -h * .1); ctx.stroke();
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(side * w * .12, -h * .41); ctx.lineTo(side * w * .17, -h * .1); ctx.stroke();
        ellipse("#a9c1c0", side * w * .16, -h * .35, w * .008, w * .008);
      }
      ctx.fillStyle = keys.brake && isPlayer ? "#ff4b45" : "#b5fff0";
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = Math.min(16, w * .06);
      ctx.fillRect(-w * .065, -h * .045, w * .13, Math.max(2, h * .035)); ctx.shadowBlur = 0;
      ctx.fillStyle = "#e6fff6"; ctx.textAlign = "center"; ctx.font = `900 ${Math.max(7, w * .052)}px Consolas`;
      ctx.fillText(number, 0, h * .005);
      ctx.fillStyle = "rgba(220,255,245,.65)"; ctx.font = `700 ${Math.max(5, w * .025)}px Consolas`;
      ctx.fillText("X R L", 0, h * .065);
    }
    ctx.restore();
  }
  function drawActors(baseIndex) {
    for (let n = DRAW_DISTANCE - 1; n >= 0; n--) {
      const segment = segments[(baseIndex + n) % segments.length];
      if (segment.p1.camera.z <= CAMERA_DEPTH) continue;
      for (const sprite of segment.sprites) drawSprite(sprite, segment, n);
      drawEnergy(segment, n);
      for (const rival of rivals) {
        if (findSegment(rival.distance).index !== segment.index) continue;
        const p = segment.p1.screen, unit = p.scale * width / 2;
        const x = p.x + unit * rival.x * ROAD;
        const bikeWidth = p.w * .34;
        if (bikeWidth > .5 && bikeWidth < width) drawBike(x, p.y, bikeWidth, rival.color, Math.sin(worldTime + rival.phase) * .12, false, String(rival.number).padStart(2, "0"));
      }
    }
  }
  function drawSpeedEffects(speedRatio) {
    if (speedRatio < .58) return;
    const intensity = (speedRatio - .58) * 1.7;
    ctx.save(); ctx.strokeStyle = player.boosting ? "rgba(173,255,224,.65)" : "rgba(220,244,229,.25)";
    ctx.lineWidth = player.boosting ? 2 : 1;
    for (let i = 0; i < 34; i++) {
      const angle = i * 2.399 + .2, radius = (i * 83 + worldTime * 900 * (1 + i % 3)) % (Math.max(width, height) * .75);
      const cx = width / 2, cy = height * .46;
      const x = cx + Math.cos(angle) * radius * 1.4, y = cy + Math.sin(angle) * radius;
      const len = 12 + speedRatio * 45;
      ctx.globalAlpha = intensity * (.3 + i % 4 * .15);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len); ctx.stroke();
    }
    ctx.restore();
  }
  function drawMinimap(target, preview = false) {
    const c = target.canvas, w = c.width, h = c.height;
    target.clearRect(0, 0, w, h); target.save(); target.translate(w / 2, h / 2 + 4);
    const scale = preview ? 1 : .62; target.scale(scale, scale);
    target.lineJoin = "round"; target.lineCap = "round";
    target.strokeStyle = "rgba(2,10,13,.65)"; target.lineWidth = 9; target.beginPath();
    mapPoints.forEach((p, i) => i ? target.lineTo(p.x, p.y) : target.moveTo(p.x, p.y)); target.closePath(); target.stroke();
    target.strokeStyle = preview ? "rgba(201,255,72,.75)" : "rgba(204,237,225,.65)"; target.lineWidth = 2; target.stroke();
    if (!preview) {
      for (const rival of rivals) {
        const index = Math.floor(wrap(rival.distance, trackLength) / trackLength * mapPoints.length) % mapPoints.length;
        const p = mapPoints[index]; target.fillStyle = "rgba(230,248,240,.65)"; target.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }
    }
    const distance = state === "attract" ? demoDistance : player.distance;
    const index = Math.floor(wrap(distance, trackLength) / trackLength * mapPoints.length) % mapPoints.length;
    const p = mapPoints[index]; target.fillStyle = "#c9ff48"; target.shadowColor = "#c9ff48"; target.shadowBlur = 8;
    target.beginPath(); target.arc(p.x, p.y, preview ? 4 : 5, 0, 7); target.fill(); target.restore();
  }
  function render() {
    const demo = state === "attract", distance = demo ? demoDistance : player.distance;
    const playerX = demo ? .4 + Math.sin(worldTime * .25) * .2 : player.x;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    ctx.save();
    if (shake > .1 && !demo) ctx.translate((random() - .5) * shake, (random() - .5) * shake);
    drawBackground(distance);
    const road = renderRoad(distance, playerX);
    drawActors(road.baseIndex);
    const haze = ctx.createLinearGradient(0, height * .3, 0, height * .65);
    haze.addColorStop(0, "rgba(107,150,131,.13)"); haze.addColorStop(.5, "rgba(80,120,107,.04)"); haze.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = haze; ctx.fillRect(0, height * .25, width, height * .45);
    drawSpeedEffects(demo ? .45 : player.speed / MAX_SPEED);
    if (demo) {
      if (width > 760) drawBike(width * .76, height * .94, clamp(width * .15, 140, 220), "#b8f34a", Math.sin(worldTime) * .2, true);
    } else {
      const bikeW = clamp(width * .17, 112, 210);
      drawBike(width / 2 + player.steer * 8, height * .94, bikeW, "#b8f34a", player.steer, true);
    }
    ctx.restore();
    if (!demo && !ui.hud.hidden) drawMinimap(mapCtx);
    if (demo) drawMinimap($("track-preview").getContext("2d"), true);
  }
  function frame(timestamp) {
    const dt = Math.min(.05, Math.max(0, (timestamp - previousTime) / 1000 || 0));
    previousTime = timestamp;
    if (state !== "paused") {
      worldTime += dt; shake = Math.max(0, shake - dt * 28); collisionCooldown = Math.max(0, collisionCooldown - dt);
      if (messageTimer > 0) {
        messageTimer -= dt;
        if (messageTimer <= 0) ui.message.classList.remove("show");
      }
    }
    if (state === "attract") {
      demoDistance = wrap(demoDistance + MAX_SPEED * .34 * dt, trackLength);
      for (const rival of rivals) rival.distance += MAX_SPEED * .36 * dt;
    } else if (state === "countdown") {
      countdownLeft -= dt;
      const number = Math.ceil(Math.min(3, countdownLeft));
      if (number > 0) {
        ui.countdown.textContent = number;
        if (number !== lastCountdownNumber) { audio.tone(280, .1, "square", .15); lastCountdownNumber = number; }
      }
      if (countdownLeft <= 0) {
        state = "racing"; ui.countdown.textContent = "GO!"; audio.tone(440, .35, "square", .18, 440);
      }
    } else if (state === "racing") {
      updateRivals(dt); updateRace(dt);
      if (player.raceTime > .65) ui.countdown.textContent = "";
    }
    if (state !== "attract") updateHud();
    audio.update(); render(); requestAnimationFrame(frame);
  }
  function resize() {
    width = window.innerWidth; height = window.innerHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  }
  const keyMap = {
    ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
    ArrowUp: "throttle", KeyW: "throttle", ArrowDown: "brake", KeyS: "brake",
    Space: "boost", ShiftLeft: "boost", ShiftRight: "boost"
  };
  window.addEventListener("keydown", event => {
    if (keyMap[event.code]) { keys[keyMap[event.code]] = true; event.preventDefault(); }
    if (event.repeat) return;
    if ((event.code === "Enter" || event.code === "Space") && state === "attract") startRace();
    else if (event.code === "Enter" && state === "finished") startRace();
    else if ((event.code === "Escape" || event.code === "KeyP") && state !== "attract" && state !== "finished") togglePause();
    else if (event.code === "KeyM") audio.toggle();
    else if (event.code === "KeyR" && state === "paused") startRace();
    else if (event.code === "KeyF") {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    }
  });
  window.addEventListener("keyup", event => {
    if (keyMap[event.code]) { keys[keyMap[event.code]] = false; event.preventDefault(); }
  });
  document.querySelectorAll("[data-control]").forEach(button => {
    const control = button.dataset.control;
    const release = event => { keys[control] = false; button.classList.remove("active"); event.preventDefault(); };
    button.addEventListener("pointerdown", event => {
      event.preventDefault(); button.setPointerCapture(event.pointerId); keys[control] = true; button.classList.add("active");
    });
    button.addEventListener("pointerup", release); button.addEventListener("pointercancel", release);
    button.addEventListener("contextmenu", event => event.preventDefault());
  });
  $("start-button").addEventListener("click", startRace);
  $("pause-button").addEventListener("click", togglePause); $("resume-button").addEventListener("click", togglePause);
  $("restart-button").addEventListener("click", startRace); $("race-again-button").addEventListener("click", startRace);
  $("sound-button").addEventListener("click", () => audio.toggle());
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && (state === "racing" || state === "countdown")) togglePause();
  });
  window.addEventListener("blur", () => {
    Object.keys(keys).forEach(key => { keys[key] = false; });
  });
  buildTrack(); resetRace(); state = "attract"; resize(); requestAnimationFrame(frame);

})();
