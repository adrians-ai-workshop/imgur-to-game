// SPDX-License-Identifier: GPL-2.0-or-later
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const E = require("./engine.js");
const item = (row, value = 0) => ({ row, value });

test("all four displayed clue relations have the original semantics", () => {
  assert.equal(E.relation("same", [2, 2]), true);
  assert.equal(E.relation("same", [2, 3]), false);
  assert.equal(E.relation("near", [2, 3]), true);
  assert.equal(E.relation("near", [3, 2]), true);
  assert.equal(E.relation("near", [0, 5]), false);
  assert.equal(E.relation("left", [0, 5]), true);
  assert.equal(E.relation("left", [2, 3]), true);
  assert.equal(E.relation("left", [3, 2]), false);
  assert.equal(E.relation("left", [2, 2]), false);
  assert.equal(E.relation("between", [1, 2, 3]), true);
  assert.equal(E.relation("between", [3, 2, 1]), true);
  assert.equal(E.relation("between", [0, 2, 4]), false);
  assert.equal(E.relation("between", [0, 1, 3]), false);
  assert.equal(E.relation("open", [4], 4), true);
  assert.throws(() => E.relation("bad", []), /Unknown clue/);
});

test("select propagates row singles without automatically solving clues", () => {
  const original = E.empty();
  const next = E.move(original, 0, 0, 2, false);
  assert.equal(next[0][0], 4);
  for (let col = 1; col < 6; col++) assert.equal(next[0][col], 59);
  assert.deepEqual(next[1], Array(6).fill(63));
  assert.deepEqual(original, E.empty());
});

test("exclusions produce hidden singles and reject contradictions", () => {
  let board = E.empty();
  for (let col = 0; col < 5; col++) board = E.move(board, 0, col, 0, true);
  assert.equal(board[0][5], 1);
  const singletonBoard = E.empty();
  singletonBoard[0][0] = 1;
  assert.throws(() => E.move(singletonBoard, 0, 0, 0, true), E.Contradiction);
  assert.throws(() => E.move(board, -1, 0, 0, true), /Invalid card coordinates/);
  assert.throws(() => E.move(board, 0, 0, 0, true), /already excluded/);
});

test("same-column clue intersects possible positions in both rows", () => {
  const board = E.empty();
  board[0][0] &= ~1;
  board[1][5] &= ~1;
  const result = E.solve([{ type: "same", items: [item(0), item(1)] }], board);
  assert.equal(result[1][0] & 1, 0);
  assert.equal(result[0][5] & 1, 0);
});

test("near clue supports only neighboring columns without wraparound", () => {
  const board = E.move(E.empty(), 0, 0, 0, false);
  const result = E.solve([{ type: "near", items: [item(0), item(1)] }], board);
  assert.equal(result[1][1], 1);
  assert.equal(result[1][5] & 1, 0);
});

test("left clue removes impossible extremes but does not imply adjacency", () => {
  const board = E.move(E.empty(), 0, 2, 0, false);
  const result = E.solve([{ type: "left", items: [item(0), item(1)] }], board);
  for (let col = 0; col < 3; col++) assert.equal(result[1][col] & 1, 0);
  for (let col = 3; col < 6; col++) assert.equal(result[1][col] & 1, 1);
});

test("between clue uses three consecutive columns, reversible outer cards", () => {
  const rule = { type: "between", items: [item(0), item(1), item(2)] };
  let board = E.move(E.empty(), 1, 2, 0, false);
  const reversible = E.solve([rule], board);
  for (const row of [0, 2]) {
    assert.deepEqual(reversible[row].flatMap((mask, col) => mask & 1 ? [col] : []), [1, 3]);
  }
  board = E.move(board, 0, 3, 0, false);
  assert.equal(E.solve([rule], board)[2][1], 1);
  const emptyResult = E.solve([rule]);
  assert.equal(emptyResult[1][0] & 1, 0);
  assert.equal(emptyResult[1][5] & 1, 0);
});

test("initial board applies givens, not visible clues", () => {
  const rules = [
    { type: "open", col: 0, items: [item(0)] },
    { type: "same", items: [item(0), item(1)] }
  ];
  const board = E.initialBoard(rules);
  assert.equal(board[0][0], 1);
  assert.deepEqual(board[1], Array(6).fill(63));
});

test("seed generation is deterministic", () => {
  assert.deepEqual(E.generate("same-seed"), E.generate("same-seed"));
  assert.notDeepEqual(E.generate("seed-a").solution, E.generate("seed-b").solution);
});

test("100 generated puzzles are uniquely deductive, valid and within original slot limits", () => {
  const observedTypes = new Set();
  for (let n = 0; n < 100; n++) {
    const puzzle = E.generate(`regression-${n}`);
    for (const row of puzzle.solution) assert.deepEqual([...row].sort(), [0, 1, 2, 3, 4, 5]);
    const result = E.solve(puzzle.rules);
    assert.equal(E.solved(result), true, `seed ${n} solves without branching`);
    assert.equal(E.valid(result, puzzle.solution), true);
    assert.deepEqual(result, puzzle.solution.map(row => row.map(value => 1 << value)));
    assert.equal(E.valid(E.initialBoard(puzzle.rules), puzzle.solution), true);
    assert.ok(puzzle.rules.filter(rule => rule.type === "same").length <= 15);
    assert.ok(puzzle.rules.filter(rule => !["same", "open"].includes(rule.type)).length <= 24);
    for (const rule of puzzle.rules) {
      observedTypes.add(rule.type);
      const positions = rule.items.map(({ row, value }) => puzzle.solution[row].indexOf(value));
      assert.equal(E.relation(rule.type, positions, rule.col), true);
    }
    if (n < 5) {
      puzzle.rules.forEach((_, i) => {
        assert.equal(E.solved(E.solve(puzzle.rules.filter((__, index) => index !== i))), false,
          `seed ${n}, clue ${i} must not be redundant`);
      });
    }
  }
  assert.deepEqual([...observedTypes].sort(), ["between", "left", "near", "open", "same"]);
});

test("playing the correct cards reaches victory and wrong exclusions are invalid", () => {
  const puzzle = E.generate("play-through");
  let board = E.initialBoard(puzzle.rules);
  let wrongTested = false;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      if (E.single(board[row][col])) continue;
      const value = puzzle.solution[row][col];
      if (!wrongTested) {
        try {
          assert.equal(E.valid(E.move(board, row, col, value, true), puzzle.solution), false);
        } catch (error) {
          if (!(error instanceof E.Contradiction)) throw error;
        }
        wrongTested = true;
      }
      board = E.move(board, row, col, value, false);
      assert.equal(E.valid(board, puzzle.solution), true);
    }
  }
  assert.equal(wrongTested, true);
  assert.equal(E.solved(board), true);
});

test("saved puzzle validation rejects malformed and non-unique data", () => {
  const puzzle = E.generate("save-validation");
  assert.equal(E.validatePuzzle(JSON.parse(JSON.stringify(puzzle))), true);
  assert.throws(() => E.validatePuzzle(null), /Invalid saved puzzle/);
  const malformed = structuredClone(puzzle);
  malformed.solution[0][0] = malformed.solution[0][1];
  assert.throws(() => E.validatePuzzle(malformed), /Invalid saved puzzle/);
  const badClue = structuredClone(puzzle);
  badClue.rules[0].items[0].row = 7;
  assert.throws(() => E.validatePuzzle(badClue), /Invalid saved clue/);
  const badType = structuredClone(puzzle);
  badType.rules[0].type = "toString";
  assert.throws(() => E.validatePuzzle(badType), /Invalid saved clue/);
  assert.throws(() => E.validatePuzzle({ ...puzzle, rules: [puzzle.rules[0]] }), /not uniquely solvable/);
});

test("registry matches game directories and every launch target exists", () => {
  const root = path.resolve(__dirname, "..", "..");
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, "games.js"), "utf8"), context);
  const games = context.window.ARCADE_GAMES;
  const folders = fs.readdirSync(path.join(root, "games"), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(root, "games", entry.name, "index.html")))
    .map(entry => entry.name).sort();
  const registered = Array.from(games, game => path.basename(path.dirname(game.entry))).sort();
  assert.deepEqual(registered, folders);
  assert.equal(new Set(games.map(game => game.entry)).size, games.length);
  games.forEach(game => assert.ok(fs.existsSync(path.join(root, game.entry)), game.entry));
  const einstein = games.find(game => game.entry === "games/einstein/index.html");
  assert.ok(einstein.prompt.includes("I want an exact clone for web."));
  assert.ok(einstein.prompt.includes("[attached image:"));
  assert.ok(einstein.model);
});
