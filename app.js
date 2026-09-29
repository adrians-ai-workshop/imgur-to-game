const attractView = document.querySelector("#attract-view");
const libraryView = document.querySelector("#library-view");
const browseButton = document.querySelector("#browse-button");
const backButton = document.querySelector("#back-button");
const fullscreenButton = document.querySelector("#fullscreen-button");
const gameList = document.querySelector("#game-list");
const gameCount = document.querySelector("#library-count");
const headerCount = document.querySelector("#header-count");
const games = Array.isArray(window.ARCADE_GAMES) ? window.ARCADE_GAMES : [];

function showView(view) {
  const showLibrary = view === "library";
  attractView.hidden = showLibrary;
  libraryView.hidden = !showLibrary;
  document.body.dataset.view = showLibrary ? "library" : "attract";
  (showLibrary ? backButton : browseButton).focus();
}

function renderGames() {
  const count = String(games.length).padStart(2, "0");
  gameCount.textContent = `${count} ${games.length === 1 ? "GAME" : "GAMES"}`;
  headerCount.textContent = `ARCADE INDEX / ${count} TITLES`;

  if (games.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";

    const mark = document.createElement("span");
    mark.className = "empty-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "+";

    const message = document.createElement("div");
    const title = document.createElement("p");
    title.className = "empty-title";
    title.textContent = "The arcade is quiet.";
    const copy = document.createElement("p");
    copy.className = "empty-copy";
    copy.textContent = "No games are registered yet.";
    message.append(title, copy);
    emptyState.append(mark, message);
    gameList.append(emptyState);
    return;
  }

  games.forEach((game, index) => {
    if (!game.title || !game.entry) return;

    const row = document.createElement("a");
    row.className = "game-row";
    row.href = game.entry;

    const number = document.createElement("span");
    number.className = "game-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const title = document.createElement("span");
    title.className = "game-title";
    title.textContent = game.title;

    const genre = document.createElement("span");
    genre.className = "game-genre";
    genre.textContent = game.genre || "ARCADE";

    const arrow = document.createElement("span");
    arrow.className = "game-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "\u2192";

    row.append(number, title, genre, arrow);
    gameList.append(row);

    const origin = document.createElement("details");
    origin.className = "game-origin";
    const summary = document.createElement("summary");
    summary.textContent = "ORIGIN: PROMPT & MODEL";
    const body = document.createElement("div");
    body.className = "origin-body";
    if (game.prompt || game.model) {
      const modelLine = document.createElement("p");
      modelLine.className = "origin-model";
      modelLine.textContent = `MODEL / ${game.model || "not recorded"}`;
      const promptLine = document.createElement("p");
      promptLine.className = "origin-prompt";
      promptLine.textContent = game.prompt || "Original prompt not recorded.";
      body.append(modelLine, promptLine);
    } else {
      const none = document.createElement("p");
      none.className = "origin-prompt";
      none.textContent = "Origin not recorded.";
      body.append(none);
    }
    origin.append(summary, body);
    gameList.append(origin);
  });
}

browseButton.addEventListener("click", () => showView("library"));
backButton.addEventListener("click", () => showView("attract"));

fullscreenButton.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    fullscreenButton.textContent = "Fullscreen unavailable";
  }
});

document.addEventListener("fullscreenchange", () => {
  const isFullscreen = Boolean(document.fullscreenElement);
  fullscreenButton.textContent = isFullscreen ? "Exit fullscreen" : "Fullscreen";
  fullscreenButton.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Enter fullscreen");
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !libraryView.hidden) showView("attract");
});

renderGames();

const canvas = document.querySelector("#attract-art");
const context = canvas.getContext("2d");
let width = 0;
let height = 0;
let pixelRatio = 1;

function resizeCanvas() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function drawScene(timestamp) {
  const time = timestamp / 1000;
  const horizon = height * 0.3;
  context.clearRect(0, 0, width, height);

  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#1b2922");
  sky.addColorStop(0.5, "#18241e");
  sky.addColorStop(1, "#111714");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(212, 243, 107, 0.55)";
  for (let index = 0; index < 45; index += 1) {
    const x = (Math.sin(index * 127.1) * 0.5 + 0.5) * width;
    const y = (Math.cos(index * 311.7) * 0.5 + 0.5) * horizon * 1.4;
    const size = index % 7 === 0 ? 2 : 1;
    context.globalAlpha = 0.15 + (Math.sin(time * 1.4 + index) + 1) * 0.15;
    context.fillRect(x, y, size, size);
  }
  context.globalAlpha = 1;

  const skylineBase = horizon + 20;
  for (let index = 0; index < 24; index += 1) {
    const buildingWidth = 13 + (index * 19 % 31);
    const buildingHeight = 15 + (index * 37 % 67);
    const x = index * (width / 22) - 20;
    context.fillStyle = index % 3 === 0 ? "#26352b" : "#202d25";
    context.fillRect(x, skylineBase - buildingHeight, buildingWidth, buildingHeight);
    context.fillStyle = index % 2 === 0 ? "rgba(255, 117, 94, 0.45)" : "rgba(212, 243, 107, 0.35)";
    for (let light = 0; light < 3; light += 1) {
      context.fillRect(x + 4 + light * 9, skylineBase - buildingHeight + 7 + (light % 2) * 13, 2, 3);
    }
  }

  context.strokeStyle = "rgba(111, 206, 164, 0.16)";
  context.lineWidth = 1;
  for (let index = 0; index <= 16; index += 1) {
    const progress = ((index / 16 + time * 0.08) % 1);
    const y = horizon + progress * progress * height * 0.85;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  for (let index = -12; index <= 12; index += 1) {
    context.beginPath();
    context.moveTo(width * 0.63, horizon);
    context.lineTo(width * 0.63 + index * width * 0.105, height);
    context.stroke();
  }

  const centerX = width * 0.67;
  const centerY = height * 0.57;
  context.save();
  context.translate(centerX, centerY);
  context.rotate(-0.12);
  context.shadowBlur = 24;
  context.shadowColor = "rgba(91, 232, 190, 0.38)";
  context.strokeStyle = "rgba(91, 232, 190, 0.7)";
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(0, 0, Math.min(width * 0.25, 290), Math.min(height * 0.13, 115), 0, 0, Math.PI * 2);
  context.stroke();
  context.shadowBlur = 0;
  context.setLineDash([5, 12]);
  context.lineDashOffset = -time * 24;
  context.strokeStyle = "rgba(212, 243, 107, 0.72)";
  context.lineWidth = 1;
  context.beginPath();
  context.ellipse(0, 0, Math.min(width * 0.21, 244), Math.min(height * 0.095, 84), 0, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);

  for (let index = 0; index < 3; index += 1) {
    const angle = time * (0.43 + index * 0.08) + index * 2.2;
    const radiusX = Math.min(width * 0.25, 290);
    const radiusY = Math.min(height * 0.13, 115);
    const x = Math.cos(angle) * radiusX;
    const y = Math.sin(angle) * radiusY;
    context.save();
    context.translate(x, y);
    context.rotate(angle + Math.PI / 2);
    context.fillStyle = index === 0 ? "#ff755e" : "#d4f36b";
    context.shadowBlur = 18;
    context.shadowColor = context.fillStyle;
    context.beginPath();
    context.moveTo(0, -9);
    context.lineTo(5, 7);
    context.lineTo(0, 4);
    context.lineTo(-5, 7);
    context.closePath();
    context.fill();
    context.restore();
  }
  context.restore();

  requestAnimationFrame(drawScene);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
requestAnimationFrame(drawScene);