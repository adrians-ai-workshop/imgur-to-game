const canvas = document.querySelector("#arena");
const ctx = canvas.getContext("2d");
const attractPanel = document.querySelector("#attract-panel");
const messagePanel = document.querySelector("#message-panel");
const messageKicker = document.querySelector("#message-kicker");
const messageTitle = document.querySelector("#message-title");
const messageCopy = document.querySelector("#message-copy");
const messageButton = document.querySelector("#message-button");
const hud = document.querySelector("#match-hud");
const controlNote = document.querySelector("#control-note");
const playerHealth = document.querySelector("#player-health");
const rivalHealth = document.querySelector("#rival-health");
const playerScore = document.querySelector("#player-score");
const rivalScore = document.querySelector("#rival-score");
const roundNumber = document.querySelector("#round-number");
const roundClock = document.querySelector("#round-clock");

const PAPER = "#f7f7f2";
const INK = "#292a2b";
const BLUE = "#2855a4";
const RED = "#bf554e";
const keys = new Set();
const effects = [];
let width = 0;
let height = 0;
let pixelRatio = 1;
let mode = "attract";
let previousMode = "fighting";
let elapsed = 0;
let roundTime = 60;
let round = 1;
let pauseDelay = 0;
let nextRoundDelay = 0;
let winCount = [0, 0];
let lastTime = 0;
let audioContext;
let soundMuted = false;

function sound(type) {
  if (soundMuted) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
    const now = audioContext.currentTime;
    const settings = {
      slash: [430, 115, .16, "sawtooth", .045],
      hit: [160, 55, .19, "triangle", .12],
      block: [950, 460, .13, "square", .035],
      jump: [260, 520, .14, "sine", .045],
      round: [330, 660, .38, "triangle", .055],
      start: [440, 880, .28, "triangle", .055],
    }[type];
    if (!settings) return;
    const [from, to, duration, wave, volume] = settings;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(now); oscillator.stop(now + duration);
  } catch (_) { /* The duel remains playable if audio is unavailable. */ }
}

const player = makeFighter("blue");
const rival = makeFighter("red");

function makeFighter(color) {
  return {
    color,
    x: 0,
    y: 0,
    vy: 0,
    health: 100,
    wins: 0,
    attack: 0,
    attackCooldown: 0,
    attackPose: 0,
    attackRecovery: 0,
    combo: 0,
    comboTimer: 0,
    bufferedAttack: 0,
    attackFrom: null,
    hitThisAttack: false,
    stun: 0,
    guard: false,
    guardBlend: 0,
    guardTimer: 0,
    facing: color === "blue" ? 1 : -1,
    aiWait: 0,
    movement: 0,
    poseClock: 0,
    hitReact: 0,
    knockback: 0,
  };
}

function resize() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function groundY() {
  return height * (height < 520 ? 0.79 : 0.81);
}

function fighterScale() {
  return Math.max(0.78, Math.min(1.42, width / 820, height / 500));
}

function resetRound() {
  player.x = width * 0.29;
  rival.x = width * 0.71;
  player.health = rival.health = 100;
  player.y = rival.y = player.vy = rival.vy = 0;
  player.attack = rival.attack = player.stun = rival.stun = 0;
  player.attackCooldown = rival.attackCooldown = 0;
  player.attackPose = rival.attackPose = 0;
  player.attackRecovery = rival.attackRecovery = 0;
  player.combo = rival.combo = 0;
  player.comboTimer = rival.comboTimer = 0;
  player.bufferedAttack = rival.bufferedAttack = 0;
  player.attackFrom = rival.attackFrom = null;
  player.hitThisAttack = rival.hitThisAttack = false;
  player.guard = rival.guard = false;
  player.guardBlend = rival.guardBlend = 0;
  player.guardTimer = rival.guardTimer = 0;
  player.movement = rival.movement = 0;
  player.hitReact = rival.hitReact = 0;
  player.knockback = rival.knockback = 0;
  player.aiWait = 0.7;
  roundTime = 60;
  effects.length = 0;
  updateHud();
}

function startMatch() {
  winCount = [0, 0];
  round = 1;
  mode = "fighting";
  attractPanel.hidden = true;
  messagePanel.hidden = true;
  messageButton.hidden = true;
  hud.hidden = false;
  controlNote.hidden = false;
  resetRound();
  sound("start");
}

function updateHud() {
  playerHealth.style.width = `${Math.max(0, player.health)}%`;
  rivalHealth.style.width = `${Math.max(0, rival.health)}%`;
  playerScore.textContent = String(winCount[0]);
  rivalScore.textContent = String(winCount[1]);
  roundNumber.textContent = String(round).padStart(2, "0");
  roundClock.textContent = String(Math.ceil(roundTime)).padStart(2, "0");
}

function showMessage(kicker, title, copy, button = false) {
  messageKicker.textContent = kicker;
  messageTitle.textContent = title;
  messageCopy.textContent = copy;
  messageButton.hidden = !button;
  messagePanel.hidden = false;
}

function beginAttack(fighter) {
  if (mode !== "fighting" || fighter.stun > 0 || fighter.guard) return;
  if (fighter.attackCooldown > 0 || fighter.attack > 0) {
    fighter.bufferedAttack = 0.3;
    return;
  }
  fighter.attackFrom = studyPose(fighter, fighter === player ? 0 : 1);
  fighter.combo = fighter.comboTimer > 0 ? (fighter.combo + 1) % 3 : 0;
  fighter.comboTimer = 1.1;
  fighter.bufferedAttack = 0;
  fighter.attack = 0.38;
  fighter.attackCooldown = 0.57;
  fighter.attackPose = 0;
  fighter.attackRecovery = 0;
  fighter.hitThisAttack = false;
  sound("slash");
}

function jump(fighter) {
  if (mode === "fighting" && fighter.y === 0 && fighter.stun <= 0) { fighter.vy = 510; sound("jump"); }
}

function onKeyDown(event) {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", " "].includes(key)) event.preventDefault();
  if ((key === "escape" || key === "p") && mode !== "attract" && mode !== "finished") {
    if (mode === "paused") {
      mode = previousMode;
      if (mode === "roundEnd") showMessage("ROUND COMPLETE", player.health === rival.health ? "An even exchange." : player.health > rival.health ? "Your line holds." : "A point for red.", `${winCount[0]} — ${winCount[1]} rounds.`, false);
      else messagePanel.hidden = true;
    } else {
      previousMode = mode;
      mode = "paused";
      showMessage("TIME, PLEASE", "A held breath.", "Press Esc or P to return to the exchange.");
    }
    return;
  }
  if (["a", "d", "w", "arrowleft", "arrowright", "arrowup", " ", "j", "k"].includes(key)) keys.add(key);
  if ((key === "w" || key === "arrowup" || key === " ") && !event.repeat) jump(player);
  if (key === "j" && !event.repeat) beginAttack(player);
}

function onKeyUp(event) {
  const key = event.key.toLowerCase();
  keys.delete(key);
}

function updateFighter(fighter, opponent, dt, isPlayer) {
  fighter.attackCooldown = Math.max(0, fighter.attackCooldown - dt);
  fighter.comboTimer = Math.max(0, fighter.comboTimer - dt);
  fighter.bufferedAttack = Math.max(0, fighter.bufferedAttack - dt);
  if (fighter.bufferedAttack > 0 && fighter.attackCooldown === 0 && fighter.stun <= 0) beginAttack(fighter);
  if (fighter.attack > 0) {
    fighter.attack = Math.max(0, fighter.attack - dt);
    fighter.attackPose = Math.min(1, fighter.attackPose + dt / 0.38);
    if (fighter.attack === 0) fighter.attackRecovery = 0.24;
  } else if (fighter.attackRecovery > 0) {
    fighter.attackRecovery = Math.max(0, fighter.attackRecovery - dt);
    if (fighter.attackRecovery === 0) fighter.attackPose = 0;
  }
  fighter.stun = Math.max(0, fighter.stun - dt);
  fighter.hitReact = Math.max(0, fighter.hitReact - dt);
  fighter.poseClock += dt * (Math.abs(fighter.movement) > 0.08 ? 9 : 3.2);
  fighter.facing = opponent.x >= fighter.x ? 1 : -1;
  const distance = opponent.x - fighter.x;
  let direction = 0;

  if (isPlayer) {
    if (keys.has("a") || keys.has("arrowleft")) direction -= 1;
    if (keys.has("d") || keys.has("arrowright")) direction += 1;
    fighter.guard = keys.has("k") && fighter.stun <= 0 && fighter.attack <= 0;
  } else {
    fighter.aiWait -= dt;
    const absDistance = Math.abs(distance);
    const scale = Math.min(height / 650, width / 1050, 1.5);
    if (absDistance > 207 * scale) direction = Math.sign(distance);
    else if (absDistance < 174 * scale) direction = -Math.sign(distance) * 0.48;
    fighter.guardTimer = Math.max(0, fighter.guardTimer - dt);
    if (absDistance < 150 * scale && fighter.attack <= 0 && fighter.guardTimer === 0 && Math.random() < 1 - Math.exp(-1.5 * dt)) {
      fighter.guardTimer = 0.18 + Math.random() * 0.2;
    }
    fighter.guard = fighter.guardTimer > 0 && fighter.attack <= 0;
    if (fighter.aiWait <= 0) {
      if (absDistance < 248 * scale && Math.random() < 0.73) beginAttack(fighter);
      if (absDistance > 190 * scale && Math.random() < 0.2) jump(fighter);
      fighter.aiWait = 0.42 + Math.random() * 0.63;
    }
  }

  if (fighter.stun > 0) direction = 0;
  if (fighter.attack > 0 && fighter.attack > 0.17) direction *= 0.28;
  if (fighter.guard) direction *= 0.35;
  const movementEase = 1 - Math.exp(-dt * (direction ? 11 : 7));
  fighter.movement += (direction - fighter.movement) * movementEase;
  fighter.guardBlend += ((fighter.guard ? 1 : 0) - fighter.guardBlend) * (1 - Math.exp(-dt * 18));
  const attackLunge = fighter.attack > 0 ? Math.sin(fighter.attackPose * Math.PI) * 112 : 0;
  fighter.x += (fighter.movement * 270 + fighter.facing * attackLunge + fighter.knockback) * dt;
  fighter.knockback *= Math.exp(-dt * 9);
  if (Math.abs(fighter.knockback) < 2) fighter.knockback = 0;
  fighter.x = Math.max(42, Math.min(width - 42, fighter.x));

  if (fighter.y > 0 || fighter.vy > 0) {
    fighter.y += fighter.vy * dt;
    fighter.vy -= 1250 * dt;
    if (fighter.y <= 0) {
      fighter.y = 0;
      fighter.vy = 0;
    }
  }

  if (fighter.stun <= 0 && fighter.attack > 0 && fighter.attackPose > 0.34 && fighter.attackPose < 0.75 && !fighter.hitThisAttack) {
    const verticalGap = Math.abs(fighter.y - opponent.y);
    const scale = Math.min(height / 650, width / 1050, 1.5);
    if (Math.abs(opponent.x - fighter.x) < 253 * scale && verticalGap < 92) {
      fighter.hitThisAttack = true;
      const blocked = opponent.guard && opponent.facing === -fighter.facing;
      const damage = blocked ? 5 : 15;
      opponent.health = Math.max(0, opponent.health - damage);
      opponent.stun = blocked ? 0.12 : 0.27;
      opponent.attack = 0;
      opponent.bufferedAttack = 0;
      opponent.hitReact = blocked ? 0.13 : 0.34;
      opponent.knockback = fighter.facing * (blocked ? 115 : 245);
      effects.push({ x: opponent.x - fighter.facing * 20, y: groundY() - 220 * scale - opponent.y, time: 0.32, blocked });
      sound(blocked ? "block" : "hit");
      updateHud();
    }
  }
}

function update(dt) {
  elapsed += dt;
  if (mode !== "fighting") {
    if (mode === "roundEnd") {
      nextRoundDelay -= dt;
      if (nextRoundDelay <= 0) {
        if (winCount[0] === 2 || winCount[1] === 2 || round === 3) {
          mode = "finished";
          const blueWon = winCount[0] > winCount[1];
          showMessage("MATCH COMPLETE", winCount[0] === winCount[1] ? "An even match." : blueWon ? "Your line holds." : "The red study wins.", `${winCount[0]} — ${winCount[1]} rounds. A new page is waiting.`, true);
        } else {
          round += 1;
          resetRound();
          mode = "fighting";
          messagePanel.hidden = true;
        }
      }
    }
    return;
  }

  roundTime = Math.max(0, roundTime - dt);
  updateFighter(player, rival, dt, true);
  updateFighter(rival, player, dt, false);
  const separation = rival.x - player.x;
  const minimumSeparation = 185 * Math.min(height / 650, width / 1050, 1.5);
  if (Math.abs(separation) < minimumSeparation) {
    const direction = separation === 0 ? 1 : Math.sign(separation);
    const correction = (minimumSeparation - Math.abs(separation)) * 0.5;
    player.x -= direction * correction;
    rival.x += direction * correction;
    player.x = Math.max(42, Math.min(width - 42, player.x));
    rival.x = Math.max(42, Math.min(width - 42, rival.x));
  }
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    effects[i].time -= dt;
    if (effects[i].time <= 0) effects.splice(i, 1);
  }
  updateHud();

  if (player.health <= 0 || rival.health <= 0 || roundTime <= 0) {
    const winner = player.health === rival.health ? null : player.health > rival.health ? 0 : 1;
    if (winner !== null) winCount[winner] += 1;
    mode = "roundEnd";
    sound("round");
    nextRoundDelay = 1.6;
    showMessage("ROUND COMPLETE", winner === null ? "An even exchange." : winner === 0 ? "Your line holds." : "A point for red.", `${winCount[0]} — ${winCount[1]} rounds.`, false);
  }
}

function jitter(seed, amount) {
  return Math.sin(seed * 12.9898 + elapsed * 0.65) * amount;
}

function blendPoint(from, to, amount) {
  return [from[0] + (to[0] - from[0]) * amount, from[1] + (to[1] - from[1]) * amount];
}

function drawPaper() {
  const wash = ctx.createLinearGradient(0, 0, 0, height);
  wash.addColorStop(0, "#f3e4cb");
  wash.addColorStop(0.56, "#f5efdf");
  wash.addColorStop(1, "#d3c5ac");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.strokeStyle = "rgba(66, 105, 145, .025)";
  ctx.lineWidth = 1;
  const spacing = Math.max(24, Math.min(34, height / 22));
  for (let y = 30; y < height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(20, y + Math.sin(y * 0.07) * 1.2);
    ctx.lineTo(width - 20, y + Math.sin(y * 0.07) * 1.2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(191, 85, 78, .09)";
  ctx.beginPath();
  ctx.moveTo(48, 14);
  ctx.lineTo(48, height - 14);
  ctx.stroke();

  for (let i = 0; i < 130; i += 1) {
    const x = (Math.sin(i * 91.73) * 0.5 + 0.5) * width;
    const y = (Math.cos(i * 37.11) * 0.5 + 0.5) * height;
    ctx.fillStyle = `rgba(66, 57, 44, ${0.025 + (i % 4) * 0.008})`;
    ctx.fillRect(x, y, i % 9 === 0 ? 2 : 1, 1);
  }
  ctx.fillStyle = "rgba(58, 55, 49, .42)";
  ctx.font = "11px Georgia";
  ctx.fillText("GESTURE / 08", 65, 28);
  ctx.textAlign = "right";
  ctx.fillText("STUDIES IN MOTION", width - 34, 28);
  ctx.textAlign = "left";
  ctx.restore();
}

// A layered ink-wash landscape, painted directly into the sketchbook page.
function drawLandscape() {
  const horizon = groundY() - height * .10;
  const sunX = width * .51, sunY = height * .30;
  const radius = Math.min(width, height) * .125;
  ctx.save();
  ctx.globalAlpha = .22;
  ctx.fillStyle = "#c45c4f";
  ctx.beginPath(); ctx.arc(sunX, sunY, radius, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .12;
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 ? "#b85147" : "#e2a478";
    ctx.fillRect(sunX - radius + i * radius * .16, sunY - radius * .65 + (i % 3) * 3, radius * .09, radius * 1.3);
  }
  function mountain(base, peaks, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, base);
    peaks.forEach(([x, y]) => ctx.lineTo(width * x, height * y));
    ctx.lineTo(width, base); ctx.lineTo(width, horizon + 20); ctx.lineTo(0, horizon + 20); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = .22;
  mountain(horizon, [[0,.62],[.14,.37],[.22,.51],[.35,.28],[.45,.52],[.58,.38],[.69,.55],[.82,.32],[1,.61]], "#71859a");
  ctx.globalAlpha = .25;
  mountain(horizon, [[0,.69],[.13,.49],[.25,.65],[.39,.47],[.53,.67],[.66,.46],[.79,.61],[.9,.48],[1,.66]], "#6b7b78");
  ctx.globalAlpha = .18;
  ctx.strokeStyle = "#425968"; ctx.lineWidth = 1;
  for (let i = 0; i < 24; i++) {
    const x = (i * 163.3 % width), y = horizon - 15 - (i % 4) * 9;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 80 + (i % 5) * 20, y - 4); ctx.stroke();
  }
  // Temple roof and veranda silhouetted through the wash.
  const x = width * .5, y = horizon - height * .24, s = Math.min(width / 1100, height / 650, 1.35);
  ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = .28;
  ctx.fillStyle = "#4e5452";
  ctx.beginPath(); ctx.moveTo(-245, 55); ctx.quadraticCurveTo(-152, 37, 0, -40); ctx.quadraticCurveTo(152, 37, 245, 55); ctx.lineTo(211, 59); ctx.quadraticCurveTo(0, -7, -211, 59); ctx.closePath(); ctx.fill();
  ctx.fillRect(-185, 62, 370, 9); ctx.fillRect(-185, 180, 370, 7);
  for (let i = -2; i <= 2; i++) { ctx.fillRect(i * 83 - 4, 65, 8, 120); }
  ctx.strokeStyle = "#4e5452"; ctx.lineWidth = 2;
  for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 39, 75); ctx.lineTo(i * 39, 180); ctx.stroke(); }
  ctx.restore();

  // Inked branches give the composition depth without covering the fighters.
  ctx.save(); ctx.lineCap = "round";
  [-1, 1].forEach(side => {
    ctx.save(); ctx.translate(side < 0 ? 0 : width, 0); ctx.scale(-side, 1);
    ctx.strokeStyle = "rgba(58, 63, 59, .42)"; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(-18, height * .52); ctx.bezierCurveTo(18, height * .33, 58, height * .15, width * .18, -20); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const bx = 22 + i * 22, by = height * .35 - i * height * .045;
      ctx.lineWidth = 3 - i * .25; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + 40, by - 36, bx + 80, by - 22); ctx.stroke();
      for (let j = 0; j < 7; j++) {
        const lx = bx + 20 + j * 10, ly = by - 20 - Math.sin(j * 2 + i) * 12;
        ctx.fillStyle = j % 3 === 0 ? "rgba(181,90,81,.36)" : "rgba(75,92,82,.24)";
        ctx.beginPath(); ctx.ellipse(lx, ly, 9, 3, -.5 + j * .13, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  });
  ctx.restore();
}

function drawGround() {
  const floor = groundY();
  ctx.save();
  ctx.strokeStyle = "rgba(41, 42, 43, .38)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(54, floor + 4);
  ctx.quadraticCurveTo(width * 0.5, floor + 11, width - 47, floor + 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(41, 42, 43, .12)";
  for (let i = 0; i < 25; i += 1) {
    const x = 65 + i * ((width - 130) / 24);
    ctx.beginPath();
    ctx.moveTo(x, floor + 7);
    ctx.lineTo(x - 10 - (i % 5) * 3, floor + 16 + (i % 4) * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function strokePath(points, color, lineWidth, alpha = 1, wobble = 0) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    const px = x + (wobble ? jitter(index + x * 0.13, wobble) : 0);
    const py = y + (wobble ? jitter(index + y * 0.17, wobble) : 0);
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.restore();
}

function joint(x, y, radius = 5, alpha = 0.64) {
  ctx.save();
  ctx.strokeStyle = RED;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSword(handX, handY, swing, color, length = 132, offhand = false) {
  const angle = offhand ? -2.15 + swing * 0.85 : -1.25 + swing * 1.75;
  const tipX = handX + Math.cos(angle) * length;
  const tipY = handY + Math.sin(angle) * length;
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const normalX = -directionY;
  const normalY = directionX;
  const baseX = handX + directionX * 18;
  const baseY = handY + directionY * 18;
  ctx.save();
  ctx.fillStyle = "#f8f4e9";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(baseX + normalX * 4, baseY + normalY * 4);
  ctx.lineTo(tipX + normalX * 0.7, tipY + normalY * 0.7);
  ctx.lineTo(tipX + directionX * 4, tipY + directionY * 4);
  ctx.lineTo(tipX - normalX * 0.7, tipY - normalY * 0.7);
  ctx.lineTo(baseX - normalX * 4, baseY - normalY * 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(baseX + normalX * 2, baseY + normalY * 2);
  ctx.lineTo(tipX + directionX * 2, tipY + directionY * 2);
  ctx.stroke();
  strokePath([[handX - normalX * 11, handY - normalY * 11], [handX + normalX * 11, handY + normalY * 11]], INK, 3, 0.96);
  strokePath([[handX - normalX * 10, handY - normalY * 10], [handX + normalX * 10, handY + normalY * 10]], color, 1.1, 0.9);
  strokePath([[handX - directionX * 13, handY - directionY * 13], [handX + directionX * 12, handY + directionY * 12]], INK, 5, 0.9);
  ctx.restore();
  if (swing > 0.35) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(handX + 18, handY + 12, length * 0.74, angle - 0.54, angle + 0.28);
    ctx.stroke();
    ctx.restore();
  }
}

function drawInkLimb(start, end, radius, color, detail = 1) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const startRadius = radius * 0.72;
  const endRadius = radius * 0.54;
  const middleX = (start[0] + end[0]) * 0.5;
  const middleY = (start[1] + end[1]) * 0.5;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(start[0] + nx * startRadius, start[1] + ny * startRadius);
  ctx.quadraticCurveTo(middleX + nx * radius, middleY + ny * radius, end[0] + nx * endRadius, end[1] + ny * endRadius);
  ctx.quadraticCurveTo(end[0] + dx / length * 4, end[1] + dy / length * 4, end[0] - nx * endRadius, end[1] - ny * endRadius);
  ctx.quadraticCurveTo(middleX - nx * radius * 0.86, middleY - ny * radius * 0.86, start[0] - nx * startRadius, start[1] - ny * startRadius);
  ctx.quadraticCurveTo(start[0] - dx / length * 4, start[1] - dy / length * 4, start[0] + nx * startRadius, start[1] + ny * startRadius);
  ctx.closePath();
  ctx.fillStyle = "rgba(246, 242, 231, .96)";
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.1, radius * 0.23);
  ctx.beginPath();
  ctx.moveTo(start[0] + nx * startRadius * 0.48, start[1] + ny * startRadius * 0.48);
  ctx.quadraticCurveTo(middleX + nx * radius * 0.38, middleY + ny * radius * 0.38, end[0] + nx * endRadius * 0.42, end[1] + ny * endRadius * 0.42);
  ctx.stroke();
  if (detail > 0) {
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(middleX - nx * radius * 0.68 + dx / length * 3, middleY - ny * radius * 0.68 + dy / length * 3);
    ctx.lineTo(middleX + nx * radius * 0.68 + dx / length * 3, middleY + ny * radius * 0.68 + dy / length * 3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFoot(points, color) {
  strokePath(points, INK, 7, 0.94, 0.45);
  strokePath(points, color, 1.5, 0.95, 0.3);
  strokePath([points[1], points[2]], "#fffdf4", 1, 0.66);
}

function drawHead(color, nod, idleSway, index) {
  ctx.save();
  ctx.translate(0, -164 + nod);
  ctx.rotate(idleSway * 0.045);

  ctx.fillStyle = "#fafaf6";
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.moveTo(-17, -14);
  ctx.quadraticCurveTo(-10, -28, 5, -25);
  ctx.quadraticCurveTo(22, -23, 20, -6);
  ctx.lineTo(24, 5);
  ctx.lineTo(17, 9);
  ctx.quadraticCurveTo(15, 21, 4, 24);
  ctx.quadraticCurveTo(-8, 24, -13, 14);
  ctx.lineTo(-20, 2);
  ctx.quadraticCurveTo(-24, -7, -17, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.fillStyle = "#fafaf6";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (index === 0) {
    ctx.moveTo(-20, -8);
    ctx.quadraticCurveTo(-29, -20, -12, -29);
    ctx.lineTo(-20, -40);
    ctx.lineTo(-4, -31);
    ctx.lineTo(2, -44);
    ctx.lineTo(10, -31);
    ctx.lineTo(27, -37);
    ctx.lineTo(21, -23);
    ctx.lineTo(31, -17);
    ctx.lineTo(17, -8);
    ctx.lineTo(13, -20);
    ctx.lineTo(4, -9);
    ctx.lineTo(-4, -20);
    ctx.lineTo(-13, -7);
    ctx.lineTo(-16, 1);
  } else {
    ctx.moveTo(-20, 11);
    ctx.quadraticCurveTo(-28, -4, -19, -20);
    ctx.quadraticCurveTo(-10, -34, 8, -28);
    ctx.quadraticCurveTo(25, -24, 22, -10);
    ctx.lineTo(29, -19);
    ctx.lineTo(27, -2);
    ctx.lineTo(18, -9);
    ctx.lineTo(12, -19);
    ctx.lineTo(4, -8);
    ctx.lineTo(-3, -20);
    ctx.lineTo(-12, -8);
    ctx.lineTo(-15, 4);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (index === 0) {
    strokePath([[-19, -8], [-27, -22], [-15, -18], [-20, -37], [-5, -25], [2, -43], [9, -28], [27, -36], [20, -20], [31, -17], [17, -7]], color, 1.6, 0.96, 0.35);
    strokePath([[-16, 1], [-24, 11 + idleSway], [-27, 26 + idleSway], [-20, 18]], INK, 2, 0.92, 0.4);
    strokePath([[-17, 5], [-21, 22 + idleSway], [-15, 17]], color, 1.2, 0.88);
  } else {
    strokePath([[-18, -13], [-12, -27], [3, -31], [17, -25], [27, -15], [21, -4], [13, -19], [5, -9], [-4, -22], [-13, -7]], color, 1.6, 0.96, 0.35);
    strokePath([[-19, -13], [-31, -21], [-30, -7], [-20, 4]], INK, 2, 0.9, 0.4);
    strokePath([[-25, -16], [-33, -9 - idleSway], [-23, 0]], color, 1.1, 0.9);
  }
  strokePath([[-15, -4], [-9, -6], [-3, -4]], INK, 1.8, 0.9);
  strokePath([[5, -5], [11, -6], [15, -3]], INK, 1.6, 0.9);
  strokePath([[-13, -5], [-8, -3]], color, 1, 0.92);
  strokePath([[7, -4], [11, -2]], color, 1, 0.92);
  strokePath([[19, 0], [25, 2], [19, 4]], INK, 1.1, 0.68);
  strokePath([[-1, -1], [-3, 7], [2, 8]], INK, 1, 0.68);
  strokePath([[-6, 15], [1, 17], [8, 14]], INK, 1, 0.75);
  strokePath([[-12, 8], [-8, 17], [-3, 21]], color, 1, 0.55);
  strokePath([[-18, -12], [-8, -25], [-10, 7], [-1, -15], [5, 9], [13, -18], [17, 3]], color, 1.15, 0.9);
  strokePath([[-14, -21], [-19, -7], [-20, 12]], color, 0.8, 0.6);
  ctx.restore();
}

function drawFighter(fighter, index, showSword = true) {
  const pose = studyPose(fighter, index);
  const color = index === 0 ? BLUE : RED;
  const scale = Math.min(height / 650, width / 1050, 1.5) * (mode === "attract" ? 0.77 : 1);
  const [hip, chest, neck, head, rearFoot, frontFoot, rearHand, frontHand] = pose.points;
  const rearHip = [hip[0] - 13, hip[1] + 2];
  const frontHip = [hip[0] + 15, hip[1] - 1];
  const rearShoulder = [chest[0] - 34, chest[1] - 3];
  const frontShoulder = [chest[0] + 35, chest[1] + 3];
  const rearKnee = solveJoint(rearHip, rearFoot, 84, 83, -1);
  const frontKnee = solveJoint(frontHip, frontFoot, 85, 84, -1);
  const rearElbow = solveJoint(rearShoulder, rearHand, 55, 54, 1);
  const frontElbow = solveJoint(frontShoulder, frontHand, 56, 55, 1);
  ctx.save();
  ctx.translate(fighter.x, groundY());
  ctx.scale(fighter.facing * scale, scale);
  ctx.fillStyle = "rgba(50, 50, 50, .08)";
  ctx.beginPath();
  ctx.ellipse(0, 1, 93, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, -fighter.y / scale);

  drawAnatomy(rearHip, rearKnee, rearFoot, 19, 13, color);
  drawAnatomy(rearShoulder, rearElbow, rearHand, 12, 9, color);
  drawStudyFoot(rearFoot, -1, color);

  // Trailing split coat: it follows the animated hip instead of being a static sprite.
  ctx.fillStyle = index === 0 ? "#24496c" : "#873f3b";
  ctx.strokeStyle = "#303039"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(chest[0] - 26, chest[1] + 20);
  ctx.quadraticCurveTo(hip[0] - 22, hip[1] - 28, hip[0] - 18, hip[1]);
  ctx.lineTo(hip[0] - 50 - fighter.movement * 12, hip[1] + 85);
  ctx.lineTo(hip[0] - 8, hip[1] + 75); ctx.lineTo(hip[0] + 15, hip[1] - 5); ctx.closePath(); ctx.fill(); ctx.stroke();
  strokePath([[hip[0] - 26, hip[1] + 13], [hip[0] - 38, hip[1] + 70]], "#f3dbc0", 1, .55);

  ctx.fillStyle = index === 0 ? "#385c79" : "#a2554b";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(neck[0] - 8, neck[1]);
  ctx.quadraticCurveTo(chest[0] - 34, chest[1] - 15, rearShoulder[0] - 3, rearShoulder[1] + 9);
  ctx.bezierCurveTo(chest[0] - 39, chest[1] + 32, hip[0] - 18, hip[1] - 34, hip[0] - 21, hip[1] - 8);
  ctx.quadraticCurveTo(hip[0] - 26, hip[1] + 15, hip[0], hip[1] + 20);
  ctx.quadraticCurveTo(hip[0] + 29, hip[1] + 11, hip[0] + 23, hip[1] - 7);
  ctx.bezierCurveTo(hip[0] + 17, hip[1] - 35, chest[0] + 41, chest[1] + 32, frontShoulder[0] + 4, chest[1] + 7);
  ctx.quadraticCurveTo(chest[0] + 28, chest[1] - 14, neck[0] + 9, neck[1] + 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Layered collar, sash and cloth folds give the figures a readable silhouette.
  ctx.fillStyle = index === 0 ? "#e3d7bd" : "#ebd6bc";
  ctx.beginPath(); ctx.moveTo(neck[0] - 8, neck[1] + 1); ctx.lineTo(chest[0] - 9, chest[1] + 30); ctx.lineTo(chest[0] + 4, chest[1] + 19); ctx.lineTo(neck[0] + 7, neck[1] + 1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(neck[0] + 7, neck[1] + 1); ctx.lineTo(chest[0] + 22, chest[1] + 10); ctx.lineTo(chest[0] - 4, chest[1] + 45); ctx.lineTo(chest[0] - 11, chest[1] + 34); ctx.closePath(); ctx.fill();
  strokePath([[chest[0] - 28, chest[1] + 10], [chest[0] - 12, chest[1] + 29], [hip[0] + 5, hip[1] - 25]], "#f4e8d1", 1.3, .75);
  ctx.fillStyle = "#262f3b";
  ctx.beginPath(); ctx.moveTo(hip[0] - 23, hip[1] - 18); ctx.lineTo(hip[0] + 24, hip[1] - 22); ctx.lineTo(hip[0] + 24, hip[1] - 8); ctx.lineTo(hip[0] - 23, hip[1] - 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#d4ad6f"; ctx.fillRect(hip[0] - 3, hip[1] - 18, 9, 9);
  strokePath([[neck[0] - 6, neck[1] + 2], [chest[0] - 13, chest[1] + 5], [chest[0], chest[1] + 10], [chest[0] + 21, chest[1] + 3]], color, 1.1, 0.8);
  strokePath([[chest[0] - 23, chest[1] + 24], [chest[0] - 9, chest[1] + 30], [chest[0], chest[1] + 25], [chest[0] + 11, chest[1] + 31], [chest[0] + 27, chest[1] + 23]], color, 1, 0.65);
  strokePath([[chest[0] + 1, chest[1] + 37], [hip[0] + 2, hip[1] - 21]], color, 0.8, 0.55);
  strokePath([[hip[0] - 16, hip[1] - 35], [hip[0] - 7, hip[1] - 25], [hip[0] - 6, hip[1] - 15]], color, 1, 0.7);
  strokePath([[hip[0] + 17, hip[1] - 34], [hip[0] + 7, hip[1] - 22]], color, 1, 0.7);
  for (let hatch = 0; hatch < 9; hatch += 1) {
    const offset = hatch * 3;
    strokePath([[chest[0] - 29 + hatch * 0.7, chest[1] + 20 + offset], [chest[0] - 19 + hatch * 0.7, chest[1] + 16 + offset]], color, 0.55, 0.24);
  }

  drawAnatomy(frontHip, frontKnee, frontFoot, 20, 13, color);
  drawStudyFoot(frontFoot, 1, color);
  strokePath([[hip[0] - 23, hip[1] - 6], [hip[0] - 8, hip[1] - 1], [hip[0] + 12, hip[1] - 4], [hip[0] + 23, hip[1] - 11]], color, 2, 0.9);
  strokePath([[hip[0] - 19, hip[1] + 1], [hip[0] - 6, hip[1] + 12], [hip[0] + 7, hip[1] + 6]], color, 1, 0.65);

  drawAnatomy(frontShoulder, frontElbow, frontHand, 13, 9, color);
  strokePath([frontShoulder, frontElbow], index === 0 ? "#375e80" : "#a25149", 16, .65);
  drawStudyHand(rearHand, color);
  drawStudyHand(frontHand, color);
  ctx.save();
  ctx.translate(head[0], head[1]);
  ctx.rotate(pose.headAngle);
  ctx.scale(0.82, 0.9);
  ctx.translate(0, 164);
  drawHead(color, 0, 0, index);
  ctx.restore();
  strokePath([[head[0] - 8, head[1] + 14], [neck[0] - 8, neck[1] + 3]], color, 1.3);
  strokePath([[head[0] + 8, head[1] + 13], [neck[0] + 9, neck[1] + 2]], color, 1.3);

  strokePath([rearHip, rearKnee, rearFoot], RED, 0.8, 0.17);
  strokePath([frontHip, frontKnee, frontFoot], RED, 0.8, 0.17);
  if (showSword) {
    drawSword(frontHand[0], frontHand[1], pose.blade, color, 148);
    drawSword(rearHand[0], rearHand[1], pose.offhand, color, 109, true);
  }
  ctx.restore();
}

function solveJoint(origin, target, upperLength, lowerLength, bend) {
  const deltaX = target[0] - origin[0];
  const deltaY = target[1] - origin[1];
  const distance = Math.max(0.01, Math.hypot(deltaX, deltaY));
  const reach = Math.min(distance, upperLength + lowerLength - 0.1);
  const cosine = Math.max(-1, Math.min(1, (upperLength ** 2 + reach ** 2 - lowerLength ** 2) / (2 * upperLength * reach)));
  const angle = Math.atan2(deltaY, deltaX) + Math.acos(cosine) * bend;
  return [origin[0] + Math.cos(angle) * upperLength, origin[1] + Math.sin(angle) * upperLength];
}

function drawAnatomy(origin, elbow, target, upperRadius, lowerRadius, color) {
  const normalFor = (from, to) => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
    return [-(to[1] - from[1]) / length, (to[0] - from[0]) / length];
  };
  const upperNormal = normalFor(origin, elbow);
  const lowerNormal = normalFor(elbow, target);
  const middleNormal = normalFor(origin, target);
  const offset = (point, normal, amount) => [point[0] + normal[0] * amount, point[1] + normal[1] * amount];
  const upperMuscle = blendPoint(origin, elbow, 0.42);
  const lowerMuscle = blendPoint(elbow, target, 0.3);
  const jointRadius = lowerRadius * 0.57;
  const endRadius = lowerRadius * 0.38;
  const contour = (side) => {
    const start = offset(origin, upperNormal, upperRadius * 0.7 * side);
    const upper = offset(upperMuscle, upperNormal, upperRadius * side);
    const jointPoint = offset(elbow, middleNormal, jointRadius * side);
    const lower = offset(lowerMuscle, lowerNormal, lowerRadius * side);
    const end = offset(target, lowerNormal, endRadius * side);
    return [start, upper, jointPoint, lower, end];
  };
  const outside = contour(1);
  const inside = contour(-1);
  ctx.save();
  ctx.fillStyle = "#f8f6ef";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.65;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(...outside[0]);
  ctx.quadraticCurveTo(...outside[1], ...outside[2]);
  ctx.quadraticCurveTo(...outside[3], ...outside[4]);
  ctx.lineTo(...inside[4]);
  ctx.quadraticCurveTo(...inside[3], ...inside[2]);
  ctx.quadraticCurveTo(...inside[1], ...inside[0]);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  strokePath([offset(upperMuscle, upperNormal, upperRadius * 0.45), blendPoint(upperMuscle, elbow, 0.8)], color, 0.9, 0.65);
  strokePath([offset(lowerMuscle, lowerNormal, lowerRadius * -0.4), blendPoint(lowerMuscle, target, 0.85)], color, 0.75, 0.65);
  for (let hatch = 0; hatch < 5; hatch += 1) {
    const point = blendPoint(origin, elbow, 0.3 + hatch * 0.075);
    strokePath([offset(point, upperNormal, upperRadius * -0.67), offset([point[0] + 3, point[1] + 3], upperNormal, upperRadius * -0.3)], color, 0.55, 0.3);
  }
  ctx.restore();
}

function drawStudyFoot(ankle, direction, color) {
  ctx.fillStyle = "#f8f6ef";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(ankle[0] - 6, ankle[1] - 7);
  ctx.lineTo(ankle[0] - 9, ankle[1] + 2);
  ctx.quadraticCurveTo(ankle[0] + direction * 15, ankle[1] + 7, ankle[0] + direction * 29, ankle[1] + 1);
  ctx.lineTo(ankle[0] + direction * 12, ankle[1] - 8);
  ctx.lineTo(ankle[0] + 6, ankle[1] - 11);
  ctx.fill();
  ctx.stroke();
}

function drawStudyHand(hand, color) {
  ctx.fillStyle = "#f8f6ef";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.ellipse(hand[0], hand[1], 7, 5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (let finger = 0; finger < 3; finger += 1) strokePath([[hand[0] - 3 + finger * 3, hand[1] - 4], [hand[0] - 2 + finger * 3, hand[1] + 2]], color, 0.7, 0.7);
}

function studyPose(fighter, index) {
  const clock = fighter.poseClock;
  const breath = Math.sin(clock * 0.7 + index) * 2;
  const stride = Math.sin(clock) * Math.abs(fighter.movement);
  const walk = Math.abs(fighter.movement);
  const recoil = fighter.hitReact / 0.34;
  const idle = {
    points: [[-14, -145 + breath], [0, -233 + breath], [9, -262 + breath], [16, -285 + breath], [-78 - stride * 34, -4 - Math.max(0, -stride) * 22], [69 + stride * 34, -4 - Math.max(0, stride) * 22], [-62 - stride * 8, -187 + breath], [98 + stride * 5, -244 + breath]],
    blade: 0.14,
    offhand: 0.94,
    headAngle: -0.05,
  };
  const guard = {
    points: [[-20, -139], [-8, -229], [-2, -256], [5, -280], [-73, -4], [66, -4], [-12, -254], [72, -257]],
    blade: -0.2,
    offhand: 0.04,
    headAngle: 0.1,
  };
  let poses = [
    { points: [[-23, -144], [-15, -239], [-17, -267], [-11, -292], [-70, -4], [57, -4], [-66, -221], [10, -320]], blade: -0.3, offhand: 0.14, headAngle: -0.13 },
    { points: [[31, -130], [61, -217], [69, -246], [75, -269], [-77, -4], [111, -4], [-12, -239], [174, -212]], blade: 0.82, offhand: -0.16, headAngle: 0.18 },
    { points: [[23, -135], [42, -227], [49, -256], [58, -281], [-71, -4], [99, -4], [-29, -217], [111, -175]], blade: 1.45, offhand: 0.2, headAngle: 0.1 },
  ];
  if (fighter.combo === 1) {
    poses = [
      { points: [[-21, -130], [-33, -209], [-24, -238], [-16, -261], [-79, -4], [67, -4], [8, -245], [-8, -191]], blade: -0.6, offhand: 0.28, headAngle: 0.16 },
      { points: [[29, -111], [48, -191], [55, -218], [65, -241], [-92, -4], [109, -4], [-47, -214], [139, -166]], blade: 1.16, offhand: -0.4, headAngle: 0.18 },
      { points: [[10, -127], [12, -213], [21, -241], [31, -264], [-79, -4], [99, -4], [-60, -218], [101, -208]], blade: 1.6, offhand: 0.7, headAngle: 0.03 },
    ];
  } else if (fighter.combo === 2) {
    poses = [
      { points: [[-27, -145], [-13, -236], [-8, -263], [0, -286], [-77, -4], [55, -4], [-80, -197], [27, -216]], blade: 0.73, offhand: 1.18, headAngle: -0.05 },
      { points: [[38, -128], [74, -213], [86, -238], [95, -261], [-89, -4], [119, -4], [-3, -244], [179, -232]], blade: 0.7, offhand: -0.1, headAngle: 0.17 },
      { points: [[20, -135], [33, -224], [40, -251], [50, -274], [-74, -4], [92, -4], [-43, -213], [132, -231]], blade: 0.68, offhand: 0.4, headAngle: 0.06 },
    ];
  }
  const mix = (from, to, amount) => {
    const eased = Math.max(0, Math.min(1, amount));
    const weight = eased * eased * (3 - 2 * eased);
    return {
      points: from.points.map((point, pointIndex) => blendPoint(point, to.points[pointIndex], weight)),
      blade: from.blade + (to.blade - from.blade) * weight,
      offhand: from.offhand + (to.offhand - from.offhand) * weight,
      headAngle: from.headAngle + (to.headAngle - from.headAngle) * weight,
    };
  };
  let pose = mix(idle, guard, fighter.guardBlend);
  if (fighter.attack > 0) {
    const phase = fighter.attackPose;
    pose = phase < 0.3 ? mix(fighter.attackFrom || pose, poses[0], phase / 0.3) : phase < 0.64 ? mix(poses[0], poses[1], (phase - 0.3) / 0.34) : mix(poses[1], poses[2], (phase - 0.64) / 0.36);
  } else if (fighter.attackRecovery > 0) {
    pose = mix(poses[2], pose, 1 - fighter.attackRecovery / 0.24);
  }
  if (fighter.y > 0) {
    const leap = Math.min(1, fighter.y / 45);
    pose.points[4] = blendPoint(pose.points[4], [-73, -61], leap);
    pose.points[5] = blendPoint(pose.points[5], [91, -118], leap);
  }
  pose.points = pose.points.map((point, pointIndex) => [point[0] - (pointIndex < 4 ? recoil * (pointIndex + 1) * 9 : 0) + (pointIndex < 4 ? walk * fighter.movement * 6 : 0), point[1]]);
  return pose;
}

function drawNotes() {
  if (width < 680) return;
  ctx.save();
  ctx.globalAlpha = 0.12;
  const horizon = groundY() - height * 0.16;
  const vanishing = [width * 0.5, horizon];
  for (let grid = -4; grid <= 5; grid += 1) {
    strokePath([vanishing, [width * 0.5 + grid * width * 0.22, groundY() + height * 0.14]], INK, 0.75);
  }
  for (let step = 0; step < 6; step += 1) {
    const offset = step * step * height * 0.006;
    strokePath([[50, horizon + offset], [width - 35, horizon + offset - 2]], INK, 0.65);
  }
  const pavilion = width * 0.52;
  const roof = horizon - height * 0.28;
  strokePath([[pavilion - 150, roof + 32], [pavilion - 105, roof + 18], [pavilion, roof - 26], [pavilion + 105, roof + 18], [pavilion + 155, roof + 30]], INK, 1);
  strokePath([[pavilion - 150, roof + 32], [pavilion + 155, roof + 30]], INK, 0.7);
  strokePath([[pavilion - 105, roof + 35], [pavilion - 105, horizon], [pavilion + 105, horizon], [pavilion + 105, roof + 35]], INK, 1);
  for (let rail = -3; rail <= 3; rail += 1) strokePath([[pavilion + rail * 27, roof + 47], [pavilion + rail * 27, horizon - 5]], INK, 0.65);
  strokePath([[pavilion - 124, horizon + 4], [pavilion + 126, horizon + 4]], INK, 1);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = "rgba(41, 42, 43, .48)";
  ctx.font = "italic 16px Georgia";
  ctx.translate(width * 0.76, height * 0.32);
  ctx.rotate(-0.045);
  ctx.fillText("distance before force", 0, 0);
  ctx.strokeStyle = "rgba(191, 85, 78, .52)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-12, 11);
  ctx.quadraticCurveTo(40, 20, 104, 6);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.48;
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(width * 0.5, groundY() - 88, 74, 3.5, 5.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width * 0.5 - 40, groundY() - 137);
  ctx.lineTo(width * 0.5 - 50, groundY() - 145);
  ctx.lineTo(width * 0.5 - 35, groundY() - 142);
  ctx.stroke();
  ctx.restore();
}

function drawEffects() {
  effects.forEach((effect) => {
    const progress = effect.time / 0.32;
    ctx.save();
    ctx.translate(effect.x, effect.y);
    ctx.globalAlpha = progress;
    ctx.strokeStyle = effect.blocked ? BLUE : RED;
    ctx.lineWidth = effect.blocked ? 2 : 2.8;
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = i * Math.PI / 4;
      const radius = i % 2 === 0 ? 22 : 9;
      const x = Math.cos(angle) * radius * (1.2 - progress * 0.2);
      const y = Math.sin(angle) * radius * (1.2 - progress * 0.2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  });
}

function draw(timestamp) {
  const dt = Math.min(0.034, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;
  update(dt);
  drawPaper();
  drawLandscape();
  drawNotes();
  drawGround();

  if (mode === "attract") {
    const spacing = Math.min(width * 0.18, 165);
    player.x = width * 0.76 - spacing * 0.49 + Math.sin(elapsed * 1.2) * 10;
    rival.x = width * 0.76 + spacing * 0.49 + Math.sin(elapsed * 1.2 + 2.1) * 10;
    player.facing = 1;
    rival.facing = -1;
    player.y = Math.max(0, Math.sin(elapsed * 2.3) * 52 + 24);
    rival.y = Math.max(0, Math.sin(elapsed * 2.1 + 1.4) * 31 + 12);
    player.poseClock = elapsed * 7.8;
    rival.poseClock = elapsed * 6.9 + 1.2;
    player.movement = Math.sin(elapsed * 1.5) * 0.58;
    rival.movement = Math.sin(elapsed * 1.25 + 2) * 0.48;
    player.attack = 0.2 + (Math.sin(elapsed * 1.6) + 1) * 0.07;
    rival.attack = 0.18 + (Math.sin(elapsed * 1.35 + 2.2) + 1) * 0.08;
    player.attackPose = (elapsed * 0.38) % 1;
    rival.attackPose = (elapsed * 0.38 + 0.5) % 1;
    player.combo = Math.floor(elapsed * 0.38) % 3;
    rival.combo = (Math.floor(elapsed * 0.38) + 1) % 3;
    player.guardBlend = 0;
    rival.guardBlend = 0;
    player.guard = Math.sin(elapsed * 1.2) > 0.78;
    rival.guard = Math.sin(elapsed * 1.55 + 1.6) > 0.34;
  } else if (mode !== "finished" && mode !== "paused") {
    player.attack = Math.max(0, player.attack);
    rival.attack = Math.max(0, rival.attack);
  }

  drawFighter(player, 0);
  drawFighter(rival, 1);
  drawEffects();
  if (mode === "attract") {
    player.attack = 0;
    rival.attack = 0;
  }
  requestAnimationFrame(draw);
}

document.querySelector("#start-button").addEventListener("click", startMatch);
document.querySelector("#sound-toggle").addEventListener("click", (event) => {
  soundMuted = !soundMuted;
  event.currentTarget.textContent = soundMuted ? "♪ SOUND OFF" : "♪ SOUND ON";
  event.currentTarget.setAttribute("aria-label", soundMuted ? "Unmute sound" : "Mute sound");
  event.currentTarget.setAttribute("aria-pressed", String(soundMuted));
  if (!soundMuted) sound("start");
});
messageButton.addEventListener("click", startMatch);
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);
window.addEventListener("blur", () => {
  keys.clear();
  player.guard = false;
});
window.addEventListener("resize", resize);
resize();
requestAnimationFrame(draw);