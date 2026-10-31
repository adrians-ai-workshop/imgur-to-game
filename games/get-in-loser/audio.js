// audio.js — procedural chiptune: SFX + a tiny step sequencer. No samples, no files.
(function () {
  'use strict';

  let ctx = null, master = null, musicGain = null, sfxGain = null;
  let muted = false;
  let engineOsc = null, engineGain = null, engineFilter = null;

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.42; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(master);
    return true;
  }
  function resume() { if (ensure() && ctx.state === 'suspended') ctx.resume(); }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.02);
  }

  // Basic tone helper
  function tone(opts) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime + (opts.delay || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.type || 'square';
    o.frequency.setValueAtTime(opts.f0, t);
    if (opts.f1 !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f1), t + opts.dur);
    const v = opts.vol || 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (opts.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    o.connect(g); g.connect(opts.dest || sfxGain);
    o.start(t); o.stop(t + opts.dur + 0.02);
  }

  let noiseBuf = null;
  function noise(opts) {
    if (!ensure() || muted) return;
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime + (opts.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = opts.filter || 'lowpass';
    f.frequency.setValueAtTime(opts.f0 || 1200, t);
    if (opts.f1) f.frequency.exponentialRampToValueAtTime(opts.f1, t + opts.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    src.connect(f); f.connect(g); g.connect(opts.dest || sfxGain);
    src.start(t); src.stop(t + opts.dur + 0.02);
  }

  const SFX = {
    hex() { tone({ type: 'square', f0: 900, f1: 1800, dur: 0.09, vol: 0.12 }); tone({ type: 'triangle', f0: 1400, f1: 400, dur: 0.12, vol: 0.08, delay: 0.02 }); },
    hit() { tone({ type: 'square', f0: 300, f1: 120, dur: 0.08, vol: 0.15 }); },
    ribbit() { tone({ type: 'sawtooth', f0: 160, f1: 90, dur: 0.14, vol: 0.18 }); tone({ type: 'sawtooth', f0: 200, f1: 110, dur: 0.12, vol: 0.14, delay: 0.14 }); },
    poof() { noise({ f0: 3000, f1: 300, dur: 0.25, vol: 0.3 }); tone({ type: 'triangle', f0: 600, f1: 1800, dur: 0.2, vol: 0.1 }); },
    pumpkin() { tone({ type: 'triangle', f0: 220, f1: 80, dur: 0.25, vol: 0.2 }); noise({ f0: 800, f1: 200, dur: 0.2, vol: 0.2 }); },
    crash() {
      noise({ f0: 2500, f1: 150, dur: 0.6, vol: 0.6 });
      tone({ type: 'sawtooth', f0: 120, f1: 30, dur: 0.5, vol: 0.3 });
    },
    bump() { noise({ f0: 1200, f1: 200, dur: 0.15, vol: 0.3 }); tone({ type: 'square', f0: 150, f1: 60, dur: 0.12, vol: 0.15 }); },
    candy() { tone({ type: 'square', f0: 1200, dur: 0.06, vol: 0.1 }); tone({ type: 'square', f0: 1800, dur: 0.09, vol: 0.1, delay: 0.06 }); },
    getIn() {
      // "GET IN LOSER" jingle: perky four notes then a cackle
      const n = [660, 880, 990, 1320];
      n.forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.11, vol: 0.14, delay: i * 0.09 }));
      for (let i = 0; i < 6; i++) tone({ type: 'sawtooth', f0: 500 + i * 70, f1: 300 + i * 40, dur: 0.07, vol: 0.08, delay: 0.42 + i * 0.075 });
    },
    cackle() { for (let i = 0; i < 7; i++) tone({ type: 'sawtooth', f0: 420 + (i % 3) * 90, f1: 260 + i * 20, dur: 0.07, vol: 0.09, delay: i * 0.07 }); },
    eject() { tone({ type: 'square', f0: 800, f1: 200, dur: 0.35, vol: 0.16 }); },
    siren(on) { if (on) { tone({ type: 'square', f0: 600, f1: 900, dur: 0.3, vol: 0.05 }); } },
    net() { noise({ f0: 1500, f1: 600, dur: 0.18, vol: 0.2, filter: 'bandpass' }); },
    snag() { tone({ type: 'sawtooth', f0: 400, f1: 150, dur: 0.3, vol: 0.14 }); },
    skid() { noise({ f0: 4000, f1: 1500, dur: 0.4, vol: 0.25, filter: 'highpass' }); },
    badLuck() {
      [392, 370, 349, 330].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.22, vol: 0.14, delay: i * 0.2 }));
      noise({ f0: 400, f1: 100, dur: 0.8, vol: 0.2, delay: 0.1 });
    },
    lucky() { [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.15, vol: 0.14, delay: i * 0.07 })); },
    storm() {
      noise({ f0: 600, f1: 4000, dur: 1.2, vol: 0.5 });
      for (let i = 0; i < 10; i++) tone({ type: 'square', f0: 300 + i * 120, f1: 600 + i * 150, dur: 0.15, vol: 0.08, delay: i * 0.1 });
    },
    warning() { for (let i = 0; i < 3; i++) { tone({ type: 'square', f0: 220, dur: 0.25, vol: 0.18, delay: i * 0.5 }); tone({ type: 'square', f0: 277, dur: 0.25, vol: 0.18, delay: i * 0.5 + 0.25 }); } },
    bossHit() { tone({ type: 'square', f0: 200, f1: 90, dur: 0.1, vol: 0.18 }); noise({ f0: 2000, f1: 500, dur: 0.08, vol: 0.2 }); },
    bossDie() {
      for (let i = 0; i < 8; i++) { noise({ f0: 2000, f1: 100, dur: 0.5, vol: 0.5, delay: i * 0.18 }); tone({ type: 'square', f0: 400 - i * 30, f1: 60, dur: 0.4, vol: 0.15, delay: i * 0.18 }); }
    },
    fireball() { noise({ f0: 800, f1: 3000, dur: 0.25, vol: 0.25, filter: 'bandpass' }); },
    beamCharge() { tone({ type: 'sawtooth', f0: 100, f1: 1200, dur: 0.7, vol: 0.1 }); },
    beam() { noise({ f0: 3000, f1: 800, dur: 0.5, vol: 0.4, filter: 'highpass' }); tone({ type: 'square', f0: 90, dur: 0.5, vol: 0.2 }); },
    start() { [330, 415, 494, 659, 830].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.12, vol: 0.14, delay: i * 0.08 })); noise({ f0: 300, f1: 3000, dur: 0.6, vol: 0.2, delay: 0.3 }); },
    stageClear() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.16, vol: 0.15, delay: i * 0.12 })); },
    gameOver() { [440, 415, 392, 370, 330, 311].forEach((f, i) => tone({ type: 'sawtooth', f0: f, dur: 0.3, vol: 0.14, delay: i * 0.22 })); },
    select() { tone({ type: 'square', f0: 700, dur: 0.05, vol: 0.1 }); },
    popup() { tone({ type: 'triangle', f0: 1500, f1: 2200, dur: 0.05, vol: 0.06 }); }
  };

  // Engine drone: pitch follows speed.
  function engine(on, speedRatio) {
    if (!ensure()) return;
    if (on && !engineOsc) {
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass'; engineFilter.frequency.value = 300;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(sfxGain);
      engineOsc.start();
    }
    if (engineOsc) {
      const t = ctx.currentTime;
      engineGain.gain.setTargetAtTime(on ? 0.05 : 0, t, 0.1);
      engineOsc.frequency.setTargetAtTime(on ? 40 + 50 * (speedRatio || 1) : 40, t, 0.08);
      engineFilter.frequency.setTargetAtTime(200 + 300 * (speedRatio || 1), t, 0.1);
    }
  }

  // ---------------------------------------------------------------- MUSIC
  // Note names → Hz
  const NOTE = {};
  (function () {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    for (let o = 1; o <= 7; o++) for (let i = 0; i < 12; i++) NOTE[names[i] + o] = 440 * Math.pow(2, (o - 4) + (i - 9) / 12);
  })();
  const _ = null;

  // Each song: bpm, bass[16], lead[16], arp (chords per bar), drums pattern (k=kick, h=hat, s=snare)
  const SONGS = {
    attract: {
      bpm: 100,
      bars: 4,
      bass: [
        ['E2', _, _, _, 'E2', _, _, _, 'B1', _, _, _, 'E2', _, 'D2', _],
        ['C2', _, _, _, 'C2', _, _, _, 'G1', _, _, _, 'C2', _, 'B1', _],
        ['A1', _, _, _, 'A1', _, _, _, 'E2', _, _, _, 'A1', _, 'G1', _],
        ['B1', _, _, _, 'B1', _, _, _, 'F#2', _, _, _, 'B1', _, 'D#2', _]
      ],
      lead: [
        ['E4', _, 'G4', _, 'B4', _, 'G4', _, 'E4', _, _, _, 'D4', _, 'E4', _],
        ['C4', _, 'E4', _, 'G4', _, 'E4', _, 'C4', _, _, _, 'B3', _, 'C4', _],
        ['A3', _, 'C4', _, 'E4', _, 'C4', _, 'A3', _, _, _, 'G3', _, 'A3', _],
        ['B3', _, 'D#4', _, 'F#4', _, 'B4', _, 'A4', _, 'F#4', _, 'D#4', _, _, _]
      ],
      drums: 'k...h...s...h.h.'
    },
    stage: {
      bpm: 150,
      bars: 4,
      bass: [
        ['E2', 'E2', _, 'E2', _, 'E2', 'E3', _, 'E2', 'E2', _, 'E2', _, 'D2', 'D#2', _],
        ['E2', 'E2', _, 'E2', _, 'E2', 'E3', _, 'G2', 'G2', _, 'G2', _, 'A2', 'B2', _],
        ['C2', 'C2', _, 'C2', _, 'C2', 'C3', _, 'C2', 'C2', _, 'C2', _, 'B1', 'C2', _],
        ['B1', 'B1', _, 'B1', _, 'B1', 'B2', _, 'B1', 'B1', _, 'D2', _, 'D#2', 'E2', _]
      ],
      lead: [
        ['E5', _, _, 'B4', _, 'E5', _, 'G5', _, 'F#5', 'E5', _, 'D5', _, 'E5', _],
        ['E5', _, _, 'B4', _, 'E5', _, 'G5', _, 'A5', 'G5', _, 'B5', _, _, _],
        ['C5', _, _, 'G4', _, 'C5', _, 'E5', _, 'D5', 'C5', _, 'B4', _, 'C5', _],
        ['B4', _, 'D#5', _, 'F#5', _, 'B5', _, 'A5', _, 'F#5', _, 'D#5', _, 'B4', _]
      ],
      drums: 'k.h.s.h.k.h.s.hh'
    },
    boss: {
      bpm: 168,
      bars: 2,
      bass: [
        ['E2', 'E2', 'E3', 'E2', 'E2', 'E3', 'E2', 'E2', 'F2', 'F2', 'F3', 'F2', 'E2', 'E2', 'D#2', 'D#2'],
        ['E2', 'E2', 'E3', 'E2', 'E2', 'E3', 'E2', 'E2', 'C2', 'C2', 'C3', 'C2', 'B1', 'B1', 'B2', 'B1']
      ],
      lead: [
        ['E5', 'E5', _, 'D#5', 'E5', _, 'G5', _, 'F5', 'F5', _, 'E5', 'F5', _, 'A5', _],
        ['E5', 'E5', _, 'D#5', 'E5', _, 'B5', _, 'C6', _, 'B5', _, 'G5', _, 'F#5', 'E5']
      ],
      drums: 'k.hhs.h.k.k.s.hh'
    },
    clear: {
      bpm: 120, bars: 1,
      bass: [['E2', _, 'E2', _, 'G2', _, 'B2', _, 'E3', _, _, _, _, _, _, _]],
      lead: [['E4', 'G4', 'B4', 'E5', 'G5', _, 'B5', _, 'E6', _, _, _, _, _, _, _]],
      drums: 'k...k...k.......'
    },
    ending: {
      bpm: 92, bars: 4,
      bass: [
        ['E2', _, _, _, _, _, 'B2', _, 'E2', _, _, _, _, _, 'G2', _],
        ['A1', _, _, _, _, _, 'E2', _, 'A1', _, _, _, _, _, 'C2', _],
        ['C2', _, _, _, _, _, 'G2', _, 'C2', _, _, _, _, _, 'E2', _],
        ['B1', _, _, _, _, _, 'F#2', _, 'B1', _, _, _, 'D#2', _, 'F#2', _]
      ],
      lead: [
        ['B4', _, _, 'G4', _, _, 'E4', _, _, _, 'F#4', _, 'G4', _, _, _],
        ['A4', _, _, 'E4', _, _, 'C4', _, _, _, 'D4', _, 'E4', _, _, _],
        ['G4', _, _, 'E4', _, _, 'C4', _, _, _, 'D4', _, 'E4', _, 'G4', _],
        ['F#4', _, _, 'D#4', _, _, 'B3', _, _, _, _, _, _, _, _, _]
      ],
      drums: '................'
    }
  };

  let song = null, songName = null, step = 0, nextTime = 0, timer = null, loopSong = true;

  function scheduleStep(time) {
    const bar = Math.floor(step / 16) % song.bars;
    const i = step % 16;
    const b = song.bass[bar][i];
    if (b) tone({ type: 'square', f0: NOTE[b], dur: 60 / song.bpm / 4 * 0.9, vol: 0.16, dest: musicGain, delay: time - ctx.currentTime });
    const l = song.lead[bar][i];
    if (l) {
      tone({ type: 'triangle', f0: NOTE[l], dur: 60 / song.bpm / 4 * 1.6, vol: 0.2, dest: musicGain, delay: time - ctx.currentTime });
      tone({ type: 'square', f0: NOTE[l] / 2, dur: 60 / song.bpm / 4 * 0.8, vol: 0.05, dest: musicGain, delay: time - ctx.currentTime });
    }
    const d = song.drums[i];
    const dl = time - ctx.currentTime;
    if (d === 'k') { tone({ type: 'sine', f0: 150, f1: 40, dur: 0.12, vol: 0.5, dest: musicGain, delay: dl }); }
    else if (d === 's') { noise({ f0: 1800, f1: 600, dur: 0.12, vol: 0.25, dest: musicGain, delay: dl }); }
    else if (d === 'h') { noise({ f0: 7000, dur: 0.03, vol: 0.12, dest: musicGain, delay: dl, filter: 'highpass' }); }
  }

  function tick() {
    if (!song) return;
    const stepLen = 60 / song.bpm / 4;
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(nextTime);
      nextTime += stepLen;
      step++;
      if (!loopSong && step >= song.bars * 16) { song = null; songName = null; return; }
    }
  }

  function playMusic(name, loop) {
    if (!ensure()) return;
    if (songName === name && song) return;
    song = SONGS[name]; songName = name; step = 0; loopSong = loop !== false;
    nextTime = ctx.currentTime + 0.05;
    if (!timer) timer = setInterval(() => { if (song) tick(); }, 50);
  }
  function stopMusic() { song = null; songName = null; }

  window.AUDIO = { resume, setMuted, isMuted: () => muted, SFX, engine, playMusic, stopMusic, currentSong: () => songName };
})();
