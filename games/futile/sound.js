"use strict";

// ---- NES-style sound: 2 pulse channels, triangle, noise; tracks are step sequences ----
const Snd = (() => {
  let ac = null, master = null, noiseBuf = null, muted = false, quiet = false;
  const waves = {};
  let cur = null, timer = null, step = 0, nextT = 0, loopOnce = false;
  try { muted = localStorage.getItem("futile:mute") === "1"; } catch (e) { /* storage blocked */ }

  const NOTE = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
  const hz = (n) => {
    const m = /^([A-G]#?)(\d)$/.exec(n);
    return 440 * Math.pow(2, (12 * (+m[2] + 1) + NOTE[m[1]] - 69) / 12);
  };

  // pulse wave for a duty cycle, built from its Fourier series
  function pulseWave(d) {
    if (waves[d]) return waves[d];
    const N = 48, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) {
      re[n] = Math.sin(2 * Math.PI * n * d) / (Math.PI * n);
      im[n] = (1 - Math.cos(2 * Math.PI * n * d)) / (Math.PI * n);
    }
    return (waves[d] = ac.createPeriodicWave(re, im));
  }

  function init() {
    if (ac) { if (ac.state === "suspended") ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.3; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (cur) startTimer();
  }

  function tone(kind, f0, f1, dur, vol, t, duty) {
    if (!ac || muted) return;
    t = t || ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    if (kind === "tri") o.type = "triangle"; else o.setPeriodicWave(pulseWave(duty || 0.5));
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.setValueAtTime(vol * (kind === "tri" ? 1 : 0.75), t + dur * 0.5);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, f0, f1, t, type) {
    if (!ac || muted) return;
    t = t || ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = type || "bandpass";
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
  }

  // ---- tracks: 16th-note steps; "A4" note, "A4*3" held, "." rest ----
  const rep = (s, n) => Array(n).fill(s).join(" ");
  const TRACKS = {
    title: {
      bpm: 104,
      lead: "A4*3 . C5 . E5*3 . D5 . C5 . B4*3 . . . " + "A4*3 . C5 . E5*3 . G5 . F5 . E5*3 . . . " + "F4*3 . A4 . C5*3 . E5 . D5 . C5*3 . . . " + "G4 . B4 . D5 . G5 . F5*3 . D5*3 . . .",
      harm: rep("E3 . . E3 . . E3 . C3 . . C3 . . C3 .", 2) + " " + rep("F3 . . F3 . . F3 . D3 . . D3 . . D3 .", 1) + " " + "G3 . . G3 . . G3 . B2 . . B2 . . B2 .",
      bass: "A2*4 . . A2*2 . . A2*2 . . F2*4 . . F2*2 . . G2*4 . . G2*2 . .",
      drum: "k . . . s . . . k . . k s . . .",
    },
    stage: {
      bpm: 142,
      lead: "A4 . . C5 . . E5 . D5 . . C5 . . B4 . " + "A4 . . C5 . . E5 . G5 . . F5 . . E5 . " + "F4 . . A4 . . C5 . E5 . . D5 . . C5 . " + "G4 . B4 . D5 . G5 . F5 . D5 . B4 . G4 .",
      harm: rep("E4 A4 C5 A4", 4) + " " + rep("F4 A4 C5 A4", 4) + " " + rep("E4 G4 C5 G4", 4) + " " + rep("D4 G4 B4 G4", 4),
      bass: "A2 . A2 A2 . A2 A2 . A2 . A2 A2 . A2 A3 . F2 . F2 F2 . F2 F2 . G2 . G2 G2 . G2 G3 .",
      drum: "k . h . s . h . k . h k s . h .",
    },
    alert: {
      bpm: 168,
      lead: "E5 . E5 . B4 . E5 . F5 . F5 . C5 . F5 . " + "E5 . E5 . B4 . E5 . G5 . F5 . E5 . D#5 .",
      harm: rep("B3 E4 B3 E4", 4) + " " + rep("C4 F4 C4 F4", 2) + " " + rep("B3 E4 B3 E4", 2),
      bass: "E2 E2 E3 E2 E2 E3 E2 E2 F2 F2 F3 F2 F2 F3 F2 F2",
      drum: "k h s h k h s h k k s h k h s s",
    },
    boss: {
      bpm: 172,
      lead: "D5 F5 A5 F5 D5 F5 A5 F5 C5 E5 G5 E5 A#4 D5 F5 D5 " + "D5 F5 A5 F5 D5 F5 A5 F5 C5 E5 G5 E5 A4 C#5 E5 A5 " + "A#4 D5 F5 D5 A#4 D5 F5 D5 G4 A#4 D5 A#4 A4 C#5 E5 C#5 " + "D5*2 . D5 . D5*2 . F5 . E5*2 . C#5 . D5*4 . . . .",
      harm: rep("A3 D4 F4 D4", 4) + " " + rep("A#3 D4 F4 D4", 2) + " " + rep("A3 C#4 E4 C#4", 2),
      bass: "D2 D2 D3 D2 D2 D3 D2 D2 A#1 A#1 A#2 A#1 C2 C2 C3 C2 D2 D2 D3 D2 D2 D3 D2 D2 A#1 A#1 A#2 A#1 A1 A1 A2 A1",
      drum: "k h s h k k s h k h s k k h s s",
    },
    clear: { bpm: 150, once: true, lead: "C5 E5 G5 C6*3 . G5 C6*6", harm: "E4 G4 C5 E5*3 . C5 E5*6", bass: "C3 . G2 . C3*6 . . .", drum: "" },
    over: { bpm: 96, once: true, lead: "E5*2 D5*2 C5*2 B4*2 A4*8", harm: "C5*2 B4*2 A4*2 G#4*2 E4*8", bass: "A2*4 E2*4 A1*8", drum: "" },
    win: { bpm: 140, once: true, lead: "C5 C5 C5 C5*2 G4 A4*2 C5 . A4 C5*4 . D5 D5 D5 D5*2 A4 B4*2 D5 . B4 D5*4 . E5*8", harm: "E4 E4 E4 E4*2 C4 F4*2 A4 . F4 A4*4 . B4 B4 B4 B4*2 F4 G4*2 B4 . G4 B4*4 . G4*8", bass: "C3*4 F3*4 C3*4 F3*4 G3*4 G3*4 C3*8", drum: "" },
  };

  function parse(str) {
    const out = [];
    for (const tok of str.trim().split(/\s+/)) {
      if (!tok) continue;
      const m = /^([A-G]#?\d|[khs]|\.)(?:\*(\d+))?$/.exec(tok);
      out.push(m ? { n: m[1], len: m[2] ? +m[2] : 1 } : { n: ".", len: 1 });
    }
    return out;
  }

  function startTimer() {
    if (timer || !ac) return;
    nextT = ac.currentTime + 0.08; step = 0;
    timer = setInterval(pump, 25);
  }

  function pump() {
    if (!cur || !ac) return;
    const sd = 60 / cur.def.bpm / 4;
    while (nextT < ac.currentTime + 0.15) {
      const t = nextT, ch = cur.ch;
      for (const [name, seq] of Object.entries(ch)) {
        if (!seq.length) continue;
        const ev = seq[step % seq.length];
        if (!ev || ev.n === ".") continue;
        const dur = ev.len * sd * 0.92;
        if (name === "drum") {
          if (ev.n === "k") { tone("tri", 140, 45, 0.11, 0.9, t); }
          else if (ev.n === "s") noise(0.09, 0.3, 3000, 1500, t);
          else noise(0.03, 0.12, 8000, 6000, t, "highpass");
        } else if (name === "bass") tone("tri", hz(ev.n), 0, dur, 0.55, t);
        else if (name === "lead") tone("pulse", hz(ev.n), 0, dur, 0.2, t, 0.25);
        else tone("pulse", hz(ev.n), 0, dur, 0.1, t, 0.125);
      }
      nextT += sd; step++;
      if (cur.def.once) {
        const longest = Math.max(...Object.values(ch).map((s) => s.length));
        if (step >= longest) { cur = null; break; }
      }
    }
  }

  // expand held notes so each array index is one step
  function expand(seq) {
    const out = [];
    for (const e of seq) { out.push(e); for (let i = 1; i < e.len; i++) out.push(null); }
    return out;
  }

  function play(name) {
    const def = TRACKS[name];
    if (!def) return;
    cur = { name, def, ch: { lead: expand(parse(def.lead)), harm: expand(parse(def.harm)), bass: expand(parse(def.bass)), drum: expand(parse(def.drum || "")) } };
    step = 0;
    if (ac) { nextT = ac.currentTime + 0.05; startTimer(); }
  }
  function stop() { cur = null; }

  const api = {
    init, play, stop, tone, noise,
    get track() { return cur ? cur.name : ""; },
    get muted() { return muted; },
    set quiet(v) { quiet = v; },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem("futile:mute", muted ? "1" : "0"); } catch (e) { /* storage blocked */ }
      if (master) master.gain.value = muted ? 0 : 0.3;
    },
    shoot() { tone("pulse", 1100, 380, 0.09, 0.14, 0, 0.125); },
    foe() { tone("pulse", 700, 240, 0.12, 0.1, 0, 0.5); },
    hit() { noise(0.16, 0.35, 1400, 300); tone("tri", 160, 60, 0.15, 0.5); },
    hurt() { tone("pulse", 300, 90, 0.25, 0.22, 0, 0.5); noise(0.2, 0.25, 900, 200); },
    tick(f) { tone("pulse", f, f, 0.05, 0.11, 0, 0.25); },
    grab() { tone("pulse", 220, 440, 0.08, 0.15, 0, 0.5); },
    done() { ["C5", "E5", "G5", "C6"].forEach((n, i) => tone("pulse", hz(n), 0, 0.09, 0.16, ac ? ac.currentTime + i * 0.06 : 0, 0.25)); },
    pickup() { tone("pulse", 880, 880, 0.06, 0.15, 0, 0.5); tone("pulse", 1320, 1320, 0.1, 0.15, ac ? ac.currentTime + 0.06 : 0, 0.5); },
    key() { ["C5", "E5", "G5", "E5", "G5", "C6"].forEach((n, i) => tone("pulse", hz(n), 0, 0.09, 0.16, ac ? ac.currentTime + i * 0.07 : 0, 0.25)); },
    alarm() { for (let i = 0; i < 4; i++) { tone("pulse", 620, 620, 0.12, 0.1, ac ? ac.currentTime + i * 0.26 : 0, 0.5); tone("pulse", 880, 880, 0.12, 0.1, ac ? ac.currentTime + i * 0.26 + 0.13 : 0, 0.5); } },
    boom() { noise(0.7, 0.6, 2500, 60, 0, "lowpass"); tone("tri", 120, 30, 0.6, 0.7); },
    door() { noise(0.18, 0.15, 1800, 500); },
    blip() { tone("pulse", 760, 760, 0.05, 0.12, 0, 0.5); },
    select() { tone("pulse", 520, 520, 0.05, 0.12, 0, 0.5); tone("pulse", 780, 780, 0.07, 0.12, ac ? ac.currentTime + 0.05 : 0, 0.5); },
    oneup() { ["E5", "G5", "E6", "C6", "D6", "G6"].forEach((n, i) => tone("pulse", hz(n), 0, 0.09, 0.16, ac ? ac.currentTime + i * 0.08 : 0, 0.5)); },
    warn() { for (let i = 0; i < 3; i++) tone("pulse", 200, 120, 0.3, 0.2, ac ? ac.currentTime + i * 0.45 : 0, 0.5); },
  };
  // effects stay silent behind the title-screen demo; music and raw tone/noise are unaffected
  for (const k of ["shoot", "foe", "hit", "hurt", "tick", "grab", "done", "pickup", "key", "alarm", "boom", "door", "blip", "select", "oneup", "warn"]) {
    const fn = api[k];
    api[k] = (...a) => { if (!quiet) fn(...a); };
  }
  return api;
})();
