// SPDX-License-Identifier: GPL-2.0-or-later
// Browser adaptation of Einstein's rules and possibilities by Alexander Babichev.
(function (root) {
  "use strict";

  const SIZE = 6;
  const ALL = 63;
  class Contradiction extends Error {}
  const bits = mask => Array.from({ length: SIZE }, (_, i) => i).filter(i => mask & (1 << i));
  const clone = board => board.map(row => row.slice());
  const empty = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(ALL));
  const single = mask => mask > 0 && (mask & (mask - 1)) === 0;
  const solved = board => board.every(row => row.every(single));
  const valid = (board, solution) => board.every((row, r) => row.every((mask, c) => mask & (1 << solution[r][c])));

  function singles(board) {
    let changed = false;
    let again;
    do {
      again = false;
      for (const row of board) {
        for (let c = 0; c < SIZE; c++) {
          if (!row[c]) throw new Contradiction("A cell has no remaining candidates.");
          if (single(row[c])) {
            for (let other = 0; other < SIZE; other++) {
              if (other === c || !(row[other] & row[c])) continue;
              row[other] &= ~row[c];
              again = true;
            }
          }
        }
        for (let value = 0; value < SIZE; value++) {
          const columns = row.flatMap((mask, c) => mask & (1 << value) ? [c] : []);
          if (!columns.length) throw new Contradiction("A symbol has no remaining column.");
          if (columns.length === 1 && row[columns[0]] !== (1 << value)) {
            row[columns[0]] = 1 << value;
            again = true;
          }
        }
      }
      changed ||= again;
    } while (again);
    return changed;
  }

  function relation(type, positions, col) {
    const [a, b, c] = positions;
    switch (type) {
      case "open": return a === col;
      case "same": return a === b;
      case "near": return Math.abs(a - b) === 1;
      case "left": return a < b;
      case "between": return Math.abs(a - b) === 1 && a + c === 2 * b;
      default: throw new Error(`Unknown clue type: ${type}`);
    }
  }

  function applyRule(board, rule) {
    const domains = rule.items.map(({ row, value }) =>
      board[row].flatMap((mask, col) => mask & (1 << value) ? [col] : []));
    const supports = rule.items.map(() => 0);
    const tuple = [];
    function visit(depth) {
      if (depth === domains.length) {
        if (!relation(rule.type, tuple, rule.col)) return;
        tuple.forEach((col, i) => { supports[i] |= 1 << col; });
        return;
      }
      for (const col of domains[depth]) {
        // Different symbols in the same row cannot occupy the same column.
        if (rule.items.some((item, i) => i < depth && item.row === rule.items[depth].row &&
          item.value !== rule.items[depth].value && tuple[i] === col)) continue;
        tuple[depth] = col;
        visit(depth + 1);
      }
    }
    visit(0);
    let changed = false;
    rule.items.forEach(({ row, value }, i) => {
      for (let col = 0; col < SIZE; col++) {
        if (!(supports[i] & (1 << col)) && (board[row][col] & (1 << value))) {
          board[row][col] &= ~(1 << value);
          changed = true;
        }
      }
    });
    return changed;
  }

  function solve(rules, initial = empty()) {
    const board = clone(initial);
    let changed;
    do {
      changed = singles(board);
      for (const rule of rules) changed = applyRule(board, rule) || changed;
    } while (changed);
    return board;
  }

  function initialBoard(rules) {
    const board = empty();
    rules.filter(rule => rule.type === "open").forEach(rule => applyRule(board, rule));
    singles(board);
    return board;
  }

  function randomFrom(seed) {
    let state = 2166136261;
    for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
    return () => {
      state += 0x6D2B79F5;
      let n = state;
      n = Math.imul(n ^ (n >>> 15), n | 1);
      n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
      return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generate(seed) {
    const random = randomFrom(seed);
    const int = max => Math.floor(random() * max);
    for (let attempt = 0; attempt < 100; attempt++) {
      const solution = Array.from({ length: SIZE }, () => {
        const row = [0, 1, 2, 3, 4, 5];
        for (let i = SIZE - 1; i > 0; i--) {
          const j = int(i + 1);
          [row[i], row[j]] = [row[j], row[i]];
        }
        return row;
      });
      const item = col => {
        const row = int(SIZE);
        return { row, value: solution[row][col] };
      };
      const rules = [];
      const seen = new Set();
      let board = empty();
      for (let n = 0; n < 500 && !solved(board); n++) {
        const kind = int(14);
        let rule;
        const col = int(SIZE);
        if (kind < 4) {
          const other = col === 0 ? 1 : col === 5 ? 4 : col + (int(2) ? 1 : -1);
          rule = { type: "near", items: [item(col), item(other)] };
        } else if (kind === 4) {
          rule = { type: "open", col, items: [item(col)] };
        } else if (kind < 7) {
          const a = item(col);
          let b;
          do { b = item(col); } while (b.row === a.row);
          rule = { type: "same", items: [a, b] };
        } else if (kind < 11) {
          const left = int(5);
          rule = { type: "left", items: [item(left), item(left + 1 + int(5 - left))] };
        } else {
          const middle = 1 + int(4);
          const sign = int(2) ? 1 : -1;
          rule = { type: "between", items: [item(middle - sign), item(middle), item(middle + sign)] };
        }
        const key = JSON.stringify(rule);
        if (seen.has(key)) continue;
        seen.add(key);
        rules.push(rule);
        board = solve(rules);
      }
      if (!solved(board)) continue;
      for (let i = rules.length - 1; i >= 0; i--) {
        const remaining = rules.filter((_, index) => index !== i);
        if (solved(solve(remaining))) rules.splice(i, 1);
      }
      const horizontal = rules.filter(rule => !["same", "open"].includes(rule.type)).length;
      const vertical = rules.filter(rule => rule.type === "same").length;
      if (horizontal <= 24 && vertical <= 15) return { seed: String(seed), solution, rules };
    }
    throw new Error("Could not generate a puzzle within the original clue limits. Please try again.");
  }

  function move(board, row, col, value, exclude) {
    if (![row, col, value].every(n => Number.isInteger(n) && n >= 0 && n < SIZE)) {
      throw new Error("Invalid card coordinates.");
    }
    if (!(board[row][col] & (1 << value))) throw new Error("That candidate is already excluded.");
    const next = clone(board);
    next[row][col] = exclude ? next[row][col] & ~(1 << value) : 1 << value;
    singles(next);
    return next;
  }

  function validatePuzzle(puzzle) {
    if (!puzzle || typeof puzzle.seed !== "string" || puzzle.seed.length > 100 ||
      !Array.isArray(puzzle.solution) || puzzle.solution.length !== SIZE ||
      !puzzle.solution.every(row => Array.isArray(row) && row.length === SIZE &&
        row.every(n => Number.isInteger(n) && n >= 0 && n < SIZE) && new Set(row).size === SIZE) ||
      !Array.isArray(puzzle.rules) || puzzle.rules.length < 1 || puzzle.rules.length > 75) {
      throw new Error("Invalid saved puzzle.");
    }
    const lengths = { open: 1, near: 2, same: 2, left: 2, between: 3 };
    for (const rule of puzzle.rules) {
      if (!rule || !Object.hasOwn(lengths, rule.type) || !Array.isArray(rule.items) ||
        rule.items.length !== lengths[rule.type] || !rule.items.every(item => item &&
          [item.row, item.value].every(n => Number.isInteger(n) && n >= 0 && n < SIZE)) ||
        (rule.type === "open" && (!Number.isInteger(rule.col) || rule.col < 0 || rule.col >= SIZE))) {
        throw new Error("Invalid saved clue.");
      }
      const positions = rule.items.map(item => puzzle.solution[item.row].indexOf(item.value));
      if (!relation(rule.type, positions, rule.col)) throw new Error("A saved clue contradicts the solution.");
    }
    if (puzzle.rules.filter(rule => rule.type === "same").length > 15 ||
      puzzle.rules.filter(rule => !["same", "open"].includes(rule.type)).length > 24) {
      throw new Error("Saved clues exceed the board capacity.");
    }
    const result = solve(puzzle.rules);
    if (!solved(result) || !valid(result, puzzle.solution)) throw new Error("Saved puzzle is not uniquely solvable.");
    return true;
  }

  const api = { SIZE, ALL, Contradiction, bits, clone, empty, single, solved, valid, singles, relation,
    applyRule, solve, initialBoard, generate, move, validatePuzzle };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Einstein = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
