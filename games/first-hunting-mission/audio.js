/* First Hunting Mission — procedural sound.
   No samples: everything is synthesised, so the game works from disk. */
(function () {
  "use strict";

  const FHM = (window.FHM = window.FHM || {});
  let ctx = null;
  let master = null;
  let sfxBus = null;
  let musicBus = null;
  let noiseBuffer = null;
  let muted = false;
  let vacuum = null;
  const music = { on: false, timer: 0, step: 0, next: 0 };

  function makeNoise() {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function audio() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 1;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0;
    musicBus.connect(master);
    noiseBuffer = makeNoise();
    return ctx;
  }

  function tone(opts) {
    const c = ctx;
    if (!c) return;
    const t0 = c.currentTime + (opts.delay || 0);
    const dur = Math.max(0.03, opts.dur || 0.18);
    const osc = c.createOscillator();
    const gain = c.createGain();
    const dest = opts.bus === "music" ? musicBus : sfxBus;
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(24, opts.to), t0 + dur);
    const peak = Math.max(0.0002, opts.peak || 0.16);
    const attack = Math.min(dur * 0.6, opts.attack || 0.008);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function hiss(opts) {
    const c = ctx;
    if (!c || !noiseBuffer) return;
    const t0 = c.currentTime + (opts.delay || 0);
    const dur = Math.max(0.04, opts.dur || 0.2);
    const src = c.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = opts.filter || "bandpass";
    filter.frequency.setValueAtTime(opts.freq || 1200, t0);
    filter.Q.value = opts.q || 0.9;
    if (opts.to) filter.frequency.exponentialRampToValueAtTime(Math.max(60, opts.to), t0 + dur);
    const gain = c.createGain();
    const peak = Math.max(0.0002, opts.peak || 0.1);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(dur * 0.3, 0.02));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(sfxBus);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  const Sound = {
    unlock() {
      const c = audio();
      if (c && c.state === "suspended") c.resume().catch(() => {});
    },

    isMuted() {
      return muted;
    },

    setMuted(value) {
      muted = Boolean(value);
      if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.03);
      return muted;
    },

    toggleMute() {
      return Sound.setMuted(!muted);
    },

    /* --- interface -------------------------------------------------- */

    ui() {
      tone({ freq: 620, to: 880, dur: 0.09, type: "triangle", peak: 0.08 });
    },

    mew() {
      tone({ freq: 700, to: 1180, dur: 0.14, type: "sine", peak: 0.07, attack: 0.02 });
      tone({ freq: 1180, to: 520, dur: 0.22, type: "sine", peak: 0.06, delay: 0.12 });
      tone({ freq: 2360, to: 1600, dur: 0.2, type: "sine", peak: 0.014, delay: 0.12 });
    },

    purr() {
      tone({ freq: 44, to: 38, dur: 0.6, type: "sawtooth", peak: 0.05, attack: 0.09 });
      tone({ freq: 88, to: 76, dur: 0.55, type: "triangle", peak: 0.02, attack: 0.1 });
      hiss({ freq: 240, dur: 0.5, peak: 0.016, filter: "lowpass" });
    },

    pounce(charge) {
      hiss({ freq: 420 + charge * 500, to: 2400 + charge * 1600, dur: 0.22, peak: 0.07, q: 1.4 });
      tone({ freq: 300 + charge * 160, to: 150, dur: 0.18, type: "sine", peak: 0.05 });
    },

    land(power) {
      const p = Math.min(1, power || 0.4);
      hiss({ freq: 260, to: 110, dur: 0.14, peak: 0.03 + p * 0.05, filter: "lowpass" });
      tone({ freq: 132, to: 60, dur: 0.13, type: "sine", peak: 0.05 + p * 0.06 });
    },

    catchPrey(clean) {
      const base = clean ? 1046 : 880;
      [0, 0.07, 0.15].forEach((delay, i) => {
        tone({
          freq: base * (i === 0 ? 1 : i === 1 ? 1.32 : 1.78),
          dur: 0.22,
          type: "triangle",
          peak: 0.085,
          delay,
        });
      });
      hiss({ freq: 4200, dur: 0.26, peak: 0.035, delay: 0.04, filter: "highpass" });
    },

    panic() {
      tone({ freq: 1400, to: 1900, dur: 0.06, type: "square", peak: 0.035 });
      tone({ freq: 1750, to: 1500, dur: 0.07, type: "square", peak: 0.03, delay: 0.07 });
    },

    miss() {
      tone({ freq: 320, to: 180, dur: 0.26, type: "triangle", peak: 0.06 });
    },

    hurt() {
      tone({ freq: 340, to: 90, dur: 0.36, type: "sawtooth", peak: 0.12 });
      hiss({ freq: 900, to: 200, dur: 0.3, peak: 0.09, filter: "lowpass" });
      tone({ freq: 220, to: 660, dur: 0.2, type: "sine", peak: 0.05, delay: 0.3 });
    },

    rumble() {
      tone({ freq: 58, to: 44, dur: 0.7, type: "sawtooth", peak: 0.05, attack: 0.12 });
      hiss({ freq: 160, dur: 0.7, peak: 0.02, filter: "lowpass" });
    },

    thump() {
      tone({ freq: 96, to: 48, dur: 0.18, type: "sine", peak: 0.12 });
      hiss({ freq: 420, dur: 0.14, peak: 0.04, filter: "lowpass" });
    },

    fanfare() {
      [261.63, 329.63, 392, 523.25].forEach((freq, i) => {
        tone({ freq, dur: 0.9, type: "triangle", peak: 0.055, delay: i * 0.1, attack: 0.02 });
      });
      tone({ freq: 1046.5, dur: 1.1, type: "sine", peak: 0.03, delay: 0.42 });
    },

    sadTrombone() {
      [392, 349.23, 311.13, 261.63].forEach((freq, i) => {
        tone({ freq, to: freq * 0.94, dur: 0.3, type: "sawtooth", peak: 0.045, delay: i * 0.22 });
      });
    },

    /* --- vacuum drone ----------------------------------------------- */

    vacuumStart() {
      if (!ctx || vacuum) return;
      const c = ctx;
      const osc = c.createOscillator();
      const sub = c.createOscillator();
      const filter = c.createBiquadFilter();
      const gain = c.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = 72;
      sub.type = "square";
      sub.frequency.value = 36;
      filter.type = "lowpass";
      filter.frequency.value = 260;
      filter.Q.value = 3;
      gain.gain.value = 0.0001;
      osc.connect(filter);
      sub.connect(filter);
      filter.connect(gain).connect(sfxBus);
      osc.start();
      sub.start();
      gain.gain.setTargetAtTime(0.045, c.currentTime, 0.25);
      vacuum = { osc, sub, filter, gain };
    },

    vacuumSet(intensity, angry) {
      if (!vacuum || !ctx) return;
      const now = ctx.currentTime;
      vacuum.gain.gain.setTargetAtTime(0.035 + intensity * 0.05, now, 0.08);
      vacuum.filter.frequency.setTargetAtTime(240 + intensity * 620, now, 0.08);
      vacuum.osc.frequency.setTargetAtTime(72 + intensity * 26 + (angry ? 12 : 0), now, 0.12);
    },

    vacuumStop() {
      if (!vacuum || !ctx) return;
      const { osc, sub, gain } = vacuum;
      gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12);
      osc.stop(ctx.currentTime + 0.5);
      sub.stop(ctx.currentTime + 0.5);
      vacuum = null;
    },

    /* --- ambient music ---------------------------------------------- */

    musicStart() {
      if (!ctx || music.on) return;
      const c = ctx;
      music.on = true;
      music.step = 0;
      music.next = c.currentTime + 0.15;
      musicBus.gain.setTargetAtTime(0.22, c.currentTime, 1.2);
      music.timer = window.setInterval(() => {
        if (!music.on || !ctx) return;
        if (music.next < ctx.currentTime - 0.1) music.next = ctx.currentTime + 0.05;
        while (music.next < ctx.currentTime + 0.3) {
          playStep(music.step, music.next);
          music.step += 1;
          music.next += 0.46;
        }
      }, 70);
    },

    musicStop() {
      if (!music.on) return;
      music.on = false;
      window.clearInterval(music.timer);
      music.timer = 0;
      if (ctx) musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    },

    musicLevel(level) {
      if (!ctx) return;
      musicBus.gain.setTargetAtTime(level, ctx.currentTime, 0.8);
    },
  };

  /* A slow lullaby in A minor: soft pad, occasional bell, no percussion. */
  const PAD = [
    [220, 261.63, 329.63],
    [196, 246.94, 293.66],
    [174.61, 220, 261.63],
    [164.81, 207.65, 246.94],
  ];
  const BELLS = [659.25, 587.33, 523.25, 493.88, 440, 392];

  function playStep(step, when) {
    if (!ctx) return;
    const chord = PAD[Math.floor(step / 8) % PAD.length];
    if (step % 8 === 0) {
      chord.forEach((freq, i) => {
        tone({
          freq,
          dur: 3.8,
          type: i === 0 ? "triangle" : "sine",
          peak: i === 0 ? 0.05 : 0.03,
          attack: 0.9,
          delay: when - ctx.currentTime,
          bus: "music",
        });
      });
    }
    if (step % 4 === 2) {
      const note = BELLS[(step * 3 + Math.floor(step / 16)) % BELLS.length];
      tone({
        freq: note * 2,
        dur: 1.1,
        type: "sine",
        peak: 0.022,
        attack: 0.01,
        delay: when - ctx.currentTime,
        bus: "music",
      });
    }
  }

  FHM.Sound = Sound;
})();

