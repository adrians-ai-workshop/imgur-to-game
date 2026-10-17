// SPDX-License-Identifier: GPL-2.0-or-later
/* global Einstein */
(function () {
  "use strict";
  const E = Einstein;
  const $ = selector => document.querySelector(selector);
  const game = $("#game");
  const attract = $("#attract");
  const dialog = $("#dialog");
  const boardElement = $("#board");
  const status = $("#status");
  const SAVE_KEY = "einstein-web-saves-v1";
  const SETTINGS_KEY = "einstein-web-settings-v1";
  const SCORES_KEY = "einstein-web-scores-v1";
  const labels = [
    ["1", "2", "3", "4", "5", "6"],
    ["A", "B", "C", "D", "E", "F"],
    ["I", "II", "III", "IV", "V", "VI"],
    ["one pip", "two pips", "three pips", "four pips", "five pips", "six pips"],
    ["triangle", "inverted triangle", "square", "diamond", "pentagon", "hexagon"],
    ["plus", "minus", "divide", "multiply", "equals", "square root"]
  ];
  let state = null;
  let running = false;
  let lastTick = 0;
  let generating = false;
  let lockedDialog = false;
  let previousFocus = null;
  let noticeTimer;
  let excludeMode = false;
  let settings = { sound: true, volume: .45 };
  const sounds = new Map();

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function image(name, alt = "") {
    const img = document.createElement("img");
    img.src = `assets/${name}.png`;
    img.alt = alt;
    img.draggable = false;
    return img;
  }

  function card(item, small = false) {
    return image(`${small ? "small" : "large"}-${String.fromCharCode(97 + item.row)}${item.value + 1}`,
      labels[item.row][item.value]);
  }

  function name(item) {
    return `${["number", "letter", "Roman numeral", "die", "shape", "operator"][item.row]} ${labels[item.row][item.value]}`;
  }

  function describe(rule) {
    const names = rule.items.map(name);
    switch (rule.type) {
      case "same": return `${names[0]} and ${names[1]} are in the same column.`;
      case "near": return `${names[0]} and ${names[1]} are in neighboring columns, in either order.`;
      case "left": return `${names[0]} is somewhere to the left of ${names[1]}, not necessarily next to it.`;
      case "between": return `${names[1]} is immediately between ${names[0]} and ${names[2]}; three consecutive columns, either direction.`;
      case "open": return `${names[0]} is in column ${rule.col + 1}.`;
      default: throw new Error("Unknown clue.");
    }
  }

  function notify(message) {
    clearTimeout(noticeTimer);
    $("#notice").textContent = message;
    $("#notice").hidden = false;
    noticeTimer = setTimeout(() => { $("#notice").hidden = true; }, 7000);
  }

  function report(error, context) {
    console.error(`Einstein: ${context}`, error);
    notify(`${context}: ${error.message}`);
  }

  function readStorage(key, fallback) {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  }

  function play(name) {
    if (!settings.sound) return;
    let sound = sounds.get(name);
    if (!sound) {
      sound = new Audio(`assets/${name}.wav`);
      sounds.set(name, sound);
    }
    sound.volume = settings.volume;
    sound.currentTime = 0;
    sound.play().catch(error => {
      settings.sound = false;
      report(error, "Sound unavailable; muted. Re-enable it in Options");
    });
  }

  function timeText(ms) {
    const total = Math.floor(ms / 1000);
    return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
      .map(n => String(n).padStart(2, "0")).join(":");
  }

  function elapsed() {
    return (state?.elapsed || 0) + (running ? performance.now() - lastTick : 0);
  }

  function stopClock() {
    if (running && state) state.elapsed += performance.now() - lastTick;
    running = false;
    $("#clock").textContent = timeText(elapsed());
  }

  function resumeClock() {
    if (state && !state.finished && !dialog.open && attract.hidden && !document.hidden && !running) {
      lastTick = performance.now();
      running = true;
    }
  }

  function showDialog(title, build, actions, locked = false) {
    stopClock();
    lockedDialog = locked;
    if (!dialog.open) previousFocus = document.activeElement;
    $("#dialog-title").textContent = title;
    $("#dialog-body").replaceChildren();
    $("#dialog-actions").replaceChildren();
    build($("#dialog-body"));
    actions.forEach(([label, action]) => {
      const button = element("button", label);
      button.addEventListener("click", action);
      $("#dialog-actions").append(button);
    });
    if (!dialog.open) dialog.showModal();
    const target = dialog.querySelector("input, button, a");
    if (target) target.focus();
  }

  function closeDialog() {
    lockedDialog = false;
    dialog.close();
    delete document.body.dataset.mode;
    resumeClock();
    if (previousFocus?.isConnected && !previousFocus.closest("[hidden], [inert]")) previousFocus.focus();
  }

  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    if (!lockedDialog) closeDialog();
  });

  function paragraph(parent, text) {
    parent.append(element("p", text));
  }

  function renderBoard(board = state?.board || E.empty()) {
    const fragment = document.createDocumentFragment();
    board.forEach((row, r) => row.forEach((mask, c) => {
      const cell = element("div", undefined, "cell");
      cell.dataset.row = r;
      cell.dataset.col = c;
      if (E.single(mask)) {
        const value = E.bits(mask)[0];
        cell.classList.add("defined");
        const img = card({ row: r, value });
        img.className = "solved-card";
        img.alt = `Row ${r + 1}, column ${c + 1}: ${name({ row: r, value })}`;
        cell.append(img);
      } else {
        for (let value = 0; value < 6; value++) {
          const button = element("button", undefined, "candidate");
          button.dataset.value = value;
          const present = Boolean(mask & (1 << value));
          button.classList.toggle("absent", !present);
          button.disabled = !present;
          button.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}: ${name({ row: r, value })}`);
          button.title = `${name({ row: r, value })} - left click: open; right click: exclude`;
          button.append(card({ row: r, value }, true));
          cell.append(button);
        }
      }
      fragment.append(cell);
    }));
    boardElement.replaceChildren(fragment);
    $("#undo").disabled = !state?.history.length || state.finished;
  }

  function drawClue(rule, index, vertical = false) {
    const visible = rule && state && state.hidden.includes(index) === state.showHidden;
    const node = element(visible ? "button" : "div", undefined, `clue${visible ? "" : " blank"}`);
    if (!visible) return node;
    node.dataset.rule = index;
    node.setAttribute("aria-label", `${describe(rule)} ${state.showHidden ? "Restore" : "Hide"} with right click or Delete.`);
    node.title = `${describe(rule)} Right-click to ${state.showHidden ? "restore" : "hide"}.`;
    if (vertical || rule.type === "between") {
      rule.items.forEach(item => node.append(card(item)));
      if (rule.type === "between") {
        const arrow = image("betwarr");
        arrow.className = "between-arrow";
        node.append(arrow);
      }
    } else {
      node.append(card(rule.items[0]), image(rule.type === "near" ? "hint-near" : "hint-side"), card(rule.items[1]));
    }
    return node;
  }

  function renderHints() {
    const rules = state?.puzzle.rules || [];
    for (const [selector, count, vertical] of [["#horizontal", 24, false], ["#vertical", 15, true]]) {
      const entries = rules.map((rule, index) => ({ rule, index })).filter(({ rule }) =>
        vertical ? rule.type === "same" : !["same", "open"].includes(rule.type));
      const nodes = Array.from({ length: count }, (_, i) =>
        drawClue(entries[i]?.rule, entries[i]?.index, vertical));
      $(selector).replaceChildren(...nodes);
    }
    const switchButton = $('[data-action="switch"]');
    switchButton.setAttribute("aria-pressed", String(Boolean(state?.showHidden)));
    switchButton.title = state?.showHidden ? "Showing removed clues; right-click to restore. Switch back to active clues." : "Show removed clues";
  }

  function render() {
    renderBoard();
    renderHints();
    $("#clock").textContent = timeText(elapsed());
  }

  function enterGame() {
    attract.hidden = true;
    game.inert = false;
    $("#resume-game").hidden = false;
    render();
    resumeClock();
  }

  function menu() {
    stopClock();
    if (dialog.open) closeDialog();
    attract.hidden = false;
    game.inert = true;
    $("#resume-game").hidden = !state || state.finished;
    $("#new-game").focus();
  }

  function newGame() {
    if (generating) return;
    generating = true;
    showDialog("Please wait", body => paragraph(body, "Preparing a uniquely solvable puzzle..."), [], true);
    setTimeout(() => {
      try {
        const seed = Array.from(crypto.getRandomValues(new Uint32Array(2)), n => n.toString(36)).join("-");
        const puzzle = E.generate(seed);
        state = { puzzle, board: E.initialBoard(puzzle.rules), hidden: [], showHidden: false,
          elapsed: 0, history: [], assisted: false, finished: false };
        closeDialog();
        enterGame();
        play("click");
        status.textContent = "Left: open. Right: exclude.";
      } catch (error) {
        report(error, "Puzzle generation failed");
        showDialog("Could not start", body => paragraph(body, error.message),
          [["Try again", newGame], ["Menu", menu]]);
      } finally {
        generating = false;
      }
    }, 40);
  }

  function restart() {
    state.board = E.initialBoard(state.puzzle.rules);
    state.hidden = [];
    state.showHidden = false;
    state.elapsed = 0;
    state.history = [];
    state.finished = false;
    state.assisted = true;
    closeDialog();
    enterGame();
  }

  function lose() {
    stopClock();
    state.finished = true;
    play("glasbk2");
    showDialog("You have made a mistake", body => {
      paragraph(body, "That move excluded a card from its correct position.");
      paragraph(body, "As in the original, a wrong move ends the attempt. Try the same puzzle again or start a new one.");
    }, [["New game", newGame], ["Try again", restart], ["Exit", menu]], true);
    renderBoard();
  }

  function readScores() {
    const scores = readStorage(SCORES_KEY, []);
    if (!Array.isArray(scores) || scores.length > 10 || !scores.every(score => score &&
      typeof score.name === "string" && score.name.length <= 30 &&
      Number.isFinite(score.elapsed) && score.elapsed >= 0)) throw new Error("Invalid top-score data.");
    return scores;
  }

  function win() {
    stopClock();
    state.finished = true;
    play("applause");
    showDialog("Congratulations!", body => {
      paragraph(body, `You solved Einstein Puzzle in ${timeText(state.elapsed)}.`);
      if (state.assisted) {
        paragraph(body, "This was a restarted attempt, so it does not enter the top scores.");
      } else {
        const label = element("label", "Name for the local top scores");
        label.htmlFor = "score-name";
        const input = element("input", undefined, "save-name");
        input.id = "score-name";
        input.value = "Einstein";
        input.maxLength = 30;
        body.append(label, input);
      }
    }, [
      ...(!state.assisted ? [["Record score", () => {
        try {
          const scores = readScores();
          scores.push({ name: $("#score-name").value.trim() || "Einstein", elapsed: state.elapsed });
          scores.sort((a, b) => a.elapsed - b.elapsed);
          localStorage.setItem(SCORES_KEY, JSON.stringify(scores.slice(0, 10)));
          showScores();
        } catch (error) { report(error, "Score could not be saved"); }
      }]] : []),
      ["New game", newGame], ["Menu", menu]
    ], true);
  }

  function choose(button, exclude) {
    if (!state || state.finished || dialog.open || !attract.hidden) return;
    const cell = button.closest(".cell");
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const value = Number(button.dataset.value);
    const previous = E.clone(state.board);
    try {
      state.board = E.move(state.board, row, col, value, exclude);
    } catch (error) {
      if (error instanceof E.Contradiction) { lose(); return; }
      throw error;
    }
    if (!E.valid(state.board, state.puzzle.solution)) { lose(); return; }
    state.history.push(previous);
    if (state.history.length > 200) state.history.shift();
    play(exclude ? "whizz" : "laser");
    renderBoard();
    const next = boardElement.querySelector(`[data-row="${row}"][data-col="${col}"] .candidate:not(.absent)`);
    if (next) next.focus({ preventScroll: true });
    if (E.solved(state.board)) win();
  }

  function undo() {
    if (!state || state.finished || !state.history.length || dialog.open || !attract.hidden) return;
    state.board = state.history.pop();
    renderBoard();
    status.textContent = "Last move undone.";
  }

  function toggleClue(index) {
    if (!state || state.finished || dialog.open || !attract.hidden) return;
    const at = state.hidden.indexOf(index);
    if (at < 0) state.hidden.push(index);
    else state.hidden.splice(at, 1);
    play("whizz");
    clearHighlights();
    renderHints();
    status.textContent = at < 0 ? "Clue removed. Switch to restore it." : "Clue restored.";
  }

  function clearHighlights() {
    boardElement.querySelectorAll(".clue-focus").forEach(cell => cell.classList.remove("clue-focus"));
  }

  function highlightClue(index) {
    clearHighlights();
    if (!state) return;
    const rule = state.puzzle.rules[index];
    status.textContent = describe(rule);
    for (const item of rule.items) {
      state.board[item.row].forEach((mask, col) => {
        if (mask & (1 << item.value)) {
          boardElement.querySelector(`[data-row="${item.row}"][data-col="${col}"]`).classList.add("clue-focus");
        }
      });
    }
  }

  function pause() {
    if (!state || state.finished || !attract.hidden) return;
    document.body.dataset.mode = "paused";
    showDialog("Paused", body => paragraph(body, "The clock is stopped and the puzzle is hidden."),
      [["Resume", closeDialog], ["Menu", menu]]);
  }

  function showHelp() {
    showDialog("How to play", body => {
      paragraph(body, "Open all 36 cards. Each row contains each of its six symbols exactly once. The six columns connect the rows; use the clues to determine the only possible arrangement.");
      paragraph(body, "Left-click a small card to select it. Right-click to exclude it. A lone candidate opens automatically, and is removed from the other cells of its row. Removing a card from its true position ends the attempt, just like the Linux game.");
      const examples = [
        ["verthint", "Stacked cards belong in the same column.", true],
        ["hornearhint", "Red double arrow: neighboring columns, either order."],
        ["horposhint", "Red dots: the first card is somewhere to the left of the last. Distance is unspecified."],
        ["horbetweenhint", "Blue double arrow: the middle card is immediately between the outer cards. Three adjacent columns, either direction."]
      ];
      examples.forEach(([asset, text, vertical]) => {
        const row = element("div", undefined, `help-rule${vertical ? " vertical-example" : ""}`);
        row.append(image(asset), element("span", text));
        body.append(row);
      });
      paragraph(body, "Right-click a clue to put it aside. Switch shows the removed clues in their original slots; right-click one again to restore it. Clicking or focusing a clue highlights its remaining positions.");
      paragraph(body, "Touch: use Select / Exclude below the board. In Exclude mode, tapping a clue also hides or restores it. Keyboard: Enter/Space activates a focused card; Shift+Enter, Shift+Space or Delete excludes it. Delete on a clue hides/restores it. X changes input mode, P pauses, S switches clues, Ctrl+Z undoes a valid move, and Esc opens the exit menu.");
      paragraph(body, "Web additions: undo for valid moves, touch input, local save slots and responsive layout. Failed attempts still require a restart. Restarted puzzles are not eligible for top scores. Save before leaving; this game does not autosave.");
    }, [["Close", closeDialog]]);
  }

  function showOptions() {
    showDialog("Options", body => {
      const label = element("label", undefined, "setting");
      const check = element("input");
      check.type = "checkbox";
      check.checked = settings.sound;
      label.append(check, element("span", "Original sound effects"));
      check.addEventListener("change", () => { settings.sound = check.checked; });
      const volumeLabel = element("label", undefined, "setting");
      const volume = element("input");
      volume.type = "range";
      volume.min = 0;
      volume.max = 100;
      volume.value = Math.round(settings.volume * 100);
      volume.style.width = "150px";
      volumeLabel.append(element("span", "Volume"), volume);
      volume.addEventListener("input", () => { settings.volume = Number(volume.value) / 100; });
      const fullscreen = element("button", "Toggle fullscreen", "utility-button");
      fullscreen.addEventListener("click", async () => {
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else await document.documentElement.requestFullscreen();
        } catch (error) { report(error, "Fullscreen unavailable"); }
      });
      body.append(label, volumeLabel, fullscreen);
      paragraph(body, "Select / Exclude changes touch input. Right-click and Shift-click always exclude. Sound, saves and scores stay in this browser; nothing is sent to a server.");
      if (state && !state.finished) {
        const retry = element("button", "Restart this puzzle", "utility-button");
        retry.addEventListener("click", () => showDialog("Restart puzzle?", content => {
          paragraph(content, "Your progress and clock will be reset. The same cards and clues will be retained; this attempt will not enter the top scores.");
        }, [["Restart", restart], ["Cancel", showOptions]]));
        body.append(retry);
      }
    }, [["Done", () => {
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
      catch (error) { report(error, "Options apply now but could not be saved"); }
      closeDialog();
      play("click");
    }]]);
  }

  function showScores() {
    let scores;
    try { scores = readScores(); }
    catch (error) { report(error, "Top scores could not be read"); return; }
    showDialog("Top scores", body => {
      if (!scores.length) paragraph(body, "No scores yet. Solve a new puzzle without restarting to record a time.");
      const list = element("ol", undefined, "score-list");
      scores.forEach(score => list.append(element("li", `${score.name} - ${timeText(score.elapsed)}`)));
      body.append(list);
      paragraph(body, "Stored on this device only.");
    }, [["Close", state?.finished ? menu : closeDialog]]);
  }

  function validateSave(saved) {
    if (!saved || saved.version !== 1 || typeof saved.name !== "string" || saved.name.length > 40 ||
      typeof saved.date !== "string" || !Number.isFinite(Date.parse(saved.date)) ||
      !Number.isFinite(saved.elapsed) || saved.elapsed < 0 || saved.elapsed > 3600000000 ||
      typeof saved.assisted !== "boolean" || typeof saved.showHidden !== "boolean") {
      throw new Error("This save slot is damaged or from an unsupported version.");
    }
    E.validatePuzzle(saved.puzzle);
    if (!Array.isArray(saved.board) || saved.board.length !== 6 ||
      !saved.board.every(row => Array.isArray(row) && row.length === 6 &&
        row.every(mask => Number.isInteger(mask) && mask > 0 && mask <= E.ALL)) ||
      !E.valid(saved.board, saved.puzzle.solution) || !Array.isArray(saved.hidden) ||
      saved.hidden.length > saved.puzzle.rules.length || new Set(saved.hidden).size !== saved.hidden.length ||
      !saved.hidden.every(i => Number.isInteger(i) && i >= 0 && i < saved.puzzle.rules.length &&
        saved.puzzle.rules[i].type !== "open")) {
      throw new Error("This save contains invalid card or clue state.");
    }
    const normalized = E.clone(saved.board);
    E.singles(normalized);
    const initial = E.initialBoard(saved.puzzle.rules);
    if (JSON.stringify(normalized) !== JSON.stringify(saved.board) || E.solved(saved.board) ||
      saved.board.some((row, r) => row.some((mask, c) => (mask & initial[r][c]) !== mask))) {
      throw new Error("This save contains inconsistent candidates.");
    }
  }

  function readSaves() {
    const slots = readStorage(SAVE_KEY, Array(5).fill(null));
    if (!Array.isArray(slots) || slots.length !== 5) throw new Error("Invalid save-slot data.");
    return slots;
  }

  function showSlots(saving) {
    let slots;
    try { slots = readSaves(); }
    catch (error) { report(error, "Save slots could not be read"); return; }
    showDialog(saving ? "Save game" : "Load game", body => {
      if (saving) {
        const label = element("label", "Save name");
        label.htmlFor = "save-name";
        const input = element("input", undefined, "save-name");
        input.id = "save-name";
        input.value = "Einstein Puzzle";
        input.maxLength = 40;
        body.append(label, input);
      }
      slots.forEach((saved, index) => {
        const row = element("div", undefined, "slot");
        const validMetadata = saved && typeof saved.name === "string" && typeof saved.date === "string" &&
          Number.isFinite(Date.parse(saved.date)) && Number.isFinite(saved.elapsed);
        const text = !saved ? "Empty" : validMetadata ?
          `${saved.name} / ${timeText(saved.elapsed)} / ${new Date(saved.date).toLocaleDateString()}` : "Damaged save";
        row.append(element("span", `${index + 1}. ${text}`));
        const button = element("button", saving ? "Save here" : "Load");
        button.disabled = !saving && !saved;
        button.addEventListener("click", () => {
          if (!saving) { loadSlot(saved); return; }
          const saveName = $("#save-name").value.trim() || "Einstein Puzzle";
          const write = () => {
            try {
              const latest = readSaves();
              const payload = { version: 1, name: saveName, date: new Date().toISOString(),
                puzzle: state.puzzle, board: state.board, hidden: state.hidden,
                showHidden: state.showHidden, elapsed: elapsed(), assisted: state.assisted };
              validateSave(payload);
              latest[index] = payload;
              localStorage.setItem(SAVE_KEY, JSON.stringify(latest));
              closeDialog();
              notify(`Saved in slot ${index + 1}.`);
            } catch (error) { report(error, "Game could not be saved"); }
          };
          if (saved) showDialog("Overwrite save?", content => paragraph(content, `Replace slot ${index + 1}?`),
            [["Overwrite", write], ["Cancel", () => showSlots(true)]]);
          else write();
        });
        row.append(button);
        body.append(row);
      });
      paragraph(body, "Five local slots. Saves survive reloading on the same browser and site address. Changing from file:// to a server, changing ports, or clearing browser data uses different storage.");
    }, [["Cancel", closeDialog]]);
  }

  function loadSlot(saved) {
    try {
      validateSave(saved);
      stopClock();
      state = { puzzle: structuredClone(saved.puzzle), board: E.clone(saved.board),
        hidden: saved.hidden.slice(), showHidden: saved.showHidden, elapsed: saved.elapsed,
        assisted: saved.assisted, history: [], finished: false };
      closeDialog();
      enterGame();
      status.textContent = "Saved game loaded.";
    } catch (error) { report(error, "Game could not be loaded"); }
  }

  function exitPrompt() {
    showDialog("Leave this puzzle?", body => {
      paragraph(body, "You can resume from the main menu during this visit. To keep your progress after closing the page, save it first.");
    }, [["Save game", () => showSlots(true)], ["Main menu", menu], ["Keep playing", closeDialog]]);
  }

  function toggleMode() {
    excludeMode = !excludeMode;
    $("#tap-mode").textContent = excludeMode ? "Exclude" : "Select";
    $("#tap-mode").setAttribute("aria-pressed", String(excludeMode));
    status.textContent = excludeMode ? "Tap a card to exclude; tap a clue to hide." : "Left: open. Right: exclude.";
  }

  function switchClues() {
    state.showHidden = !state.showHidden;
    clearHighlights();
    renderHints();
    status.textContent = state.showHidden ? "Removed clues. Right-click to restore." : "Active clues.";
    play("click");
  }

  boardElement.addEventListener("click", event => {
    const button = event.target.closest(".candidate:not(.absent)");
    if (button) choose(button, event.shiftKey || excludeMode);
  });
  boardElement.addEventListener("contextmenu", event => {
    event.preventDefault();
    const button = event.target.closest(".candidate:not(.absent)");
    if (button) choose(button, true);
  });
  boardElement.addEventListener("keydown", event => {
    if (event.key === "Delete" || (event.shiftKey && ["Enter", " "].includes(event.key))) {
      const button = event.target.closest(".candidate:not(.absent)");
      if (button) { event.preventDefault(); choose(button, true); }
    }
  });
  for (const selector of ["#horizontal", "#vertical"]) {
    const area = $(selector);
    area.addEventListener("contextmenu", event => {
      event.preventDefault();
      const clue = event.target.closest("[data-rule]");
      if (clue) toggleClue(Number(clue.dataset.rule));
    });
    area.addEventListener("click", event => {
      const clue = event.target.closest("[data-rule]");
      if (!clue) return;
      if (excludeMode || event.shiftKey) toggleClue(Number(clue.dataset.rule));
      else highlightClue(Number(clue.dataset.rule));
    });
    area.addEventListener("keydown", event => {
      const clue = event.target.closest("[data-rule]");
      if (clue && event.key === "Delete") {
        event.preventDefault();
        toggleClue(Number(clue.dataset.rule));
      }
    });
    area.addEventListener("focusin", event => {
      const clue = event.target.closest("[data-rule]");
      if (clue) highlightClue(Number(clue.dataset.rule));
    });
    area.addEventListener("pointerover", event => {
      const clue = event.target.closest("[data-rule]");
      if (clue) highlightClue(Number(clue.dataset.rule));
    });
    area.addEventListener("pointerleave", clearHighlights);
  }
  const actions = {
    pause, switch: switchClues, exit: exitPrompt,
    save: () => showSlots(true), options: showOptions, help: showHelp
  };
  $("#controls").addEventListener("click", event => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action && state && !state.finished) actions[action]();
  });
  $("#tap-mode").addEventListener("click", toggleMode);
  $("#undo").addEventListener("click", undo);
  $("#new-game").addEventListener("click", newGame);
  $("#load-game").addEventListener("click", () => showSlots(false));
  $("#resume-game").addEventListener("click", enterGame);
  $("#scores").addEventListener("click", showScores);
  $("#menu-help").addEventListener("click", showHelp);
  $("#menu-options").addEventListener("click", showOptions);
  $("#about").addEventListener("click", () => showDialog("About Einstein Puzzle", body => {
    paragraph(body, "Einstein 2.0 - original game, artwork and sounds copyright 2003-2005 Alexander Babichev / Flowix.");
    paragraph(body, "This is a JavaScript browser adaptation of the GPL-licensed Debian game, not an emulated Linux binary. It preserves the 6x6 rules, original clue semantics, graphics, sounds and fail-on-mistake play. Fonts, menus, responsive layout and browser storage are adapted for the web.");
    paragraph(body, "Distributed under GNU GPL version 2 or later, without warranty. The complete readable browser source is included beside this page.");
    for (const [title, href] of [["License", "COPYING"], ["Original source archive", "upstream-source.tar.gz"], ["Port and asset notes", "README.md"]]) {
      const link = element("a", title);
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener";
      const p = element("p");
      p.append(link);
      body.append(p);
    }
  }, [["Close", closeDialog]]));

  document.addEventListener("keydown", event => {
    if (event.target.matches("input, select, textarea") || generating) return;
    if (dialog.open) {
      if (event.key.toLowerCase() === "p" && document.body.dataset.mode === "paused") closeDialog();
      return;
    }
    if (!attract.hidden) {
      if (event.key === "Enter" && !event.target.closest("button, a")) {
        event.preventDefault();
        newGame();
      }
      return;
    }
    if (!state || state.finished) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault(); undo();
    } else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
      if (event.key.toLowerCase() === "p") pause();
      else if (event.key.toLowerCase() === "x") toggleMode();
      else if (event.key.toLowerCase() === "s") switchClues();
      else if (event.key === "Escape") exitPrompt();
      else if (event.key === "F1") { event.preventDefault(); showHelp(); }
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) pause();
  });
  window.addEventListener("beforeunload", event => {
    if (state && !state.finished && (state.history.length || state.hidden.length)) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  try {
    const saved = readStorage(SETTINGS_KEY, settings);
    if (!saved || typeof saved.sound !== "boolean" || !Number.isFinite(saved.volume) || saved.volume < 0 || saved.volume > 1) {
      throw new Error("Invalid sound settings.");
    }
    settings = saved;
  } catch (error) { report(error, "Settings could not be read; using initial options"); }
  for (let row = 0; row < 6; row++) {
    const img = card({ row, value: row });
    img.style.setProperty("--i", row);
    $("#demo").append(img);
  }
  render();
  game.inert = true;
  $("#tap-mode").setAttribute("aria-pressed", "false");
  setInterval(() => { $("#clock").textContent = timeText(elapsed()); }, 250);
})();
