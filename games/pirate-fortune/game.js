(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const symbols = {
    flag: { art: '🏴‍☠️', pay: [8, 25, 100] },
    chest: { art: '🧰', pay: [6, 20, 75] },
    anchor: { art: '⚓', pay: [5, 15, 50] },
    parrot: { art: '🦜', pay: [4, 12, 40] },
    crown: { art: '👑', pay: [3, 10, 30] },
    A: { art: 'A', pay: [2, 6, 20] },
    K: { art: 'K', pay: [2, 6, 20] },
    Q: { art: 'Q', pay: [2, 6, 20] },
    J: { art: 'J', pay: [2, 6, 20] },
    coin: { art: 'coin' }
  };
  const weighted = ['flag','flag','chest','chest','chest','anchor','anchor','anchor','parrot','parrot','parrot','crown','crown','crown','A','A','A','A','K','K','K','K','Q','Q','Q','Q','J','J','J','J','coin','coin','coin'];
  const lines = [
    [0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],
    [0,1,2,1,0],[2,1,0,1,2],[0,0,1,0,0],[2,2,1,2,2],
    [1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],[2,1,1,1,2],
    [1,0,1,0,1],[1,2,1,2,1],[0,1,0,1,0],[2,1,2,1,2],
    [0,0,1,2,2],[2,2,1,0,0],[1,0,1,2,1],[1,2,1,0,1],[0,1,2,2,2]
  ];
  const bets = [20,40,60,100,200,400,600,1000,2000,5000,10000];
  const reelEls = [];
  let board = [], credits = 0, betIndex = 0, lastWin = 0, busy = false, started = false, muted = false, audio;
  const format = n => Math.round(n).toLocaleString('en-US');
  const random = n => Math.floor(Math.random() * n);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const makeSymbol = () => ({ type: weighted[random(weighted.length)], value: coinValue() });
  function coinValue() { const v = [1,1,1,1,1,2,2,2,3,3,5,10,25]; return v[random(v.length)]; }
  function tone(freq, duration = .12, kind = 'sine', volume = .045, slide = 0) {
    if (muted) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = kind; osc.frequency.setValueAtTime(freq, audio.currentTime);
      if (slide) osc.frequency.exponentialRampToValueAtTime(slide, audio.currentTime + duration);
      gain.gain.setValueAtTime(volume, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
      osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
    } catch (_) { /* Audio is optional. */ }
  }
  function fanfare() { [523,659,784,1047].forEach((f,i) => setTimeout(() => tone(f,.24,'triangle',.055), i*100)); }
  function createBoard() {
    $('reels').replaceChildren();
    for (let col = 0; col < 5; col++) {
      const reel = document.createElement('div'); reel.className = 'reel';
      reel.setAttribute('aria-label', `Reel ${col + 1}`);
      for (let row = 0; row < 3; row++) { const cell = document.createElement('div'); cell.className = 'symbol'; reel.append(cell); }
      $('reels').append(reel); reelEls.push(reel);
    }
  }
  function renderCell(col, row, cell, locked = false) {
    const el = reelEls[col].children[row];
    el.className = `symbol${locked ? ' locked' : ''}`;
    el.dataset.symbol = cell.type;
    if (cell.type === 'coin') el.innerHTML = `<div class="coin-art">${cell.value}<small>×</small></div>`;
    else if ('AKQJ'.includes(cell.type) && cell.type.length === 1) el.innerHTML = `<span class="letter">${symbols[cell.type].art}</span>`;
    else el.innerHTML = `<span class="art">${symbols[cell.type].art}</span>`;
    el.setAttribute('aria-label', cell.type === 'coin' ? `Coin ${cell.value} times bet` : cell.type);
  }
  function renderBoard(locked = false) { board.forEach((column,c) => column.forEach((cell,r) => renderCell(c,r,cell,locked && cell.type === 'coin'))); }
  function update() {
    $('credits').textContent = format(credits); $('bet').textContent = format(bets[betIndex]); $('win').textContent = format(lastWin);
    $('spin').disabled = busy || !started || credits < bets[betIndex];
    $('bet-down').disabled = busy || !started || betIndex === 0;
    $('bet-up').disabled = busy || !started || betIndex === bets.length - 1 || bets[betIndex + 1] > credits;
    $('max-bet').disabled = busy || !started || credits < bets[0];
  }
  function fitBet() { while (betIndex > 0 && bets[betIndex] > credits) betIndex--; }
  function showMessage(message, banner, sub) { $('message').textContent = message; if (banner) $('banner').textContent = banner; if (sub) $('subbanner').textContent = sub; }
  function calculateWin(bet) {
    let total = 0; const winning = new Set();
    for (const line of lines) {
      const type = board[0][line[0]].type;
      if (type === 'coin') continue;
      let count = 1;
      while (count < 5 && board[count][line[count]].type === type) count++;
      if (count >= 3) {
        total += symbols[type].pay[count - 3] * bet / 20;
        for (let c = 0; c < count; c++) winning.add(`${c},${line[c]}`);
      }
    }
    for (const position of winning) { const [c,r] = position.split(',').map(Number); reelEls[c].children[r].classList.add('winner'); }
    return total;
  }
  async function spin() {
    if (busy || !started || credits < bets[betIndex]) return;
    busy = true; const bet = bets[betIndex]; credits -= bet; lastWin = 0; update();
    showMessage('GOOD LUCK, CAPTAIN!', 'THE REELS ARE TURNING', 'MATCH FROM LEFT TO RIGHT');
    tone(260,.22,'sawtooth',.025,90);
    // Each reel spins independently before landing on its preselected result.
    const next = Array.from({length:5}, () => Array.from({length:3}, makeSymbol));
    await Promise.all(reelEls.map(async (reel,c) => {
      for (let tick = 0; tick < 7 + c * 2; tick++) {
        for (let r = 0; r < 3; r++) { renderCell(c,r,makeSymbol()); reel.children[r].classList.add('spinning'); }
        await delay(75);
      }
      board[c] = next[c]; board[c].forEach((cell,r) => renderCell(c,r,cell)); tone(180 + c*45,.08,'triangle',.04);
    }));
    const lineWin = calculateWin(bet); credits += lineWin; lastWin = lineWin; update();
    const coins = board.flat().filter(cell => cell.type === 'coin').length;
    if (lineWin) { showMessage(`${format(lineWin)} CREDITS WON!`, 'A FINE HAUL!', 'MATCHING SYMBOLS PAY LEFT TO RIGHT'); fanfare(); await delay(1100); }
    if (coins >= 6) await treasureHold(bet);
    else if (!lineWin) showMessage('TRY YOUR LUCK AGAIN', 'FORTUNE FAVORS THE BOLD', '6 COINS TRIGGER THE TREASURE HOLD');
    else showMessage(`${format(lastWin)} CREDITS WON!`, 'FORTUNE FAVORS THE BOLD', '6 COINS TRIGGER THE TREASURE HOLD');
    busy = false; fitBet(); update();
    if (credits < bets[0]) { $('broke-overlay').classList.remove('hidden'); $('restart').focus(); }
  }
  async function treasureHold(bet) {
    let remaining = 3;
    showMessage('6 COINS! TREASURE HOLD AWARDED!', 'TREASURE HOLD', 'COLLECT COINS · RESET RESPINS');
    fanfare(); renderBoard(true); await delay(1800);
    while (remaining > 0 && board.flat().some(cell => cell.type !== 'coin')) {
      showMessage(`${remaining} RESPIN${remaining === 1 ? '' : 'S'} REMAINING`, 'TREASURE HOLD', 'NEW COINS RESET RESPINS TO 3');
      await delay(800); let found = false;
      for (let c = 0; c < 5; c++) for (let r = 0; r < 3; r++) {
        if (board[c][r].type !== 'coin') {
          if (Math.random() < .16) { board[c][r] = {type:'coin',value:coinValue()}; found = true; }
          else { let s; do { s = makeSymbol(); } while (s.type === 'coin'); board[c][r] = s; }
        }
      }
      renderBoard(true); remaining = found ? 3 : remaining - 1;
      tone(found ? 720 : 220,.18,'triangle',.05,found ? 1000 : 140);
      await delay(750);
    }
    const coins = board.flat().filter(cell => cell.type === 'coin');
    const full = coins.length === 15;
    const prize = coins.reduce((sum, coin) => sum + coin.value * bet, 0) + (full ? 100 * bet : 0);
    credits += prize; lastWin += prize; update(); fanfare();
    showMessage(`${full ? 'GRAND! ' : 'TREASURE! '}${format(prize)} CREDITS WON`, full ? 'GRAND TREASURE!' : 'TREASURE COLLECTED!', full ? 'FULL BOARD AWARDS 100× BET EXTRA' : 'ALL COIN VALUES COLLECTED');
    await delay(2200);
  }
  $('start-form').addEventListener('submit', e => {
    e.preventDefault(); const input = $('starting-credits');
    if (!input.reportValidity()) return;
    credits = Number(input.value); betIndex = 0; lastWin = 0; started = true;
    $('attract').classList.add('hidden'); $('broke-overlay').classList.add('hidden');
    board = Array.from({length:5}, () => Array.from({length:3}, makeSymbol)); renderBoard();
    showMessage('SET SAIL FOR FORTUNE', 'FORTUNE FAVORS THE BOLD', '6 COINS TRIGGER THE TREASURE HOLD'); update(); fanfare(); $('spin').focus();
  });
  $('spin').addEventListener('click', spin);
  $('bet-down').addEventListener('click', () => { if (!busy && betIndex > 0) { betIndex--; update(); tone(330); } });
  $('bet-up').addEventListener('click', () => { if (!busy && betIndex < bets.length-1 && bets[betIndex+1] <= credits) { betIndex++; update(); tone(440); } });
  $('max-bet').addEventListener('click', () => { if (!busy) { betIndex = bets.findLastIndex(bet => bet <= credits); update(); tone(550); } });
  $('sound').addEventListener('click', () => { muted = !muted; $('sound').textContent = muted ? '×' : '♪'; $('sound').setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound'); if (!muted) tone(660); });
  $('help').addEventListener('click', () => { $('help-overlay').classList.remove('hidden'); $('close-help').focus(); });
  function closeHelp() { $('help-overlay').classList.add('hidden'); $('help').focus(); }
  $('close-help').addEventListener('click', closeHelp); $('help-done').addEventListener('click', closeHelp);
  $('restart').addEventListener('click', () => { started = false; $('broke-overlay').classList.add('hidden'); $('attract').classList.remove('hidden'); $('starting-credits').focus(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('help-overlay').classList.contains('hidden')) closeHelp();
    if (e.code === 'Space' && started && $('help-overlay').classList.contains('hidden') && $('broke-overlay').classList.contains('hidden') && !['BUTTON','INPUT'].includes(document.activeElement.tagName)) { e.preventDefault(); spin(); }
  });
  createBoard(); board = Array.from({length:5}, () => Array.from({length:3}, makeSymbol)); renderBoard(); update();
})();