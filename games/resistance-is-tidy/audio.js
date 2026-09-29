"use strict";

// ---- synthesized audio; nothing is loaded from disk ----
const Sfx = (() => {
  let ac = null, master = null, noiseBuf = null, amb = null, ch = null, muted = false;
  try { muted = localStorage.getItem("resistance-is-tidy:mute") === "1"; } catch (e) { /* storage blocked */ }

  function init() {
    if (ac) { if (ac.state === "suspended") ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ambient();
  }

  function ambient() {
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 260; lp.Q.value = 4;
    const g = ac.createGain(); g.gain.value = 0.15;
    lp.connect(g); g.connect(master);
    [55, 55.7, 82.4].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = i === 2 ? "triangle" : "sawtooth"; o.frequency.value = f;
      const og = ac.createGain(); og.gain.value = i === 2 ? 0.5 : 1;
      o.connect(og); og.connect(lp); o.start();
    });
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.11;
    const lg = ac.createGain(); lg.gain.value = 90;
    lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    amb = { lp, g };
  }

  function tension(t) {
    if (!amb) return;
    amb.lp.frequency.setTargetAtTime(240 + t * 420, ac.currentTime, 0.4);
    amb.g.gain.setTargetAtTime(0.14 + t * 0.09, ac.currentTime, 0.5);
  }

  function tone(f0, f1, dur, type, vol, delay) {
    if (!ac || muted) return;
    const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
  }

  function noise(dur, vol, f0, f1, type, delay) {
    if (!ac || muted) return;
    const t = ac.currentTime + (delay || 0);
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = type || "bandpass";
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.03);
  }

  // continuous whine while assimilating; pass null to stop
  function channel(p) {
    if (!ac) return;
    if (p == null) {
      if (ch) {
        const c = ch; ch = null;
        c.g.gain.setTargetAtTime(0, ac.currentTime, 0.05);
        setTimeout(() => { try { c.o.stop(); c.o2.stop(); } catch (e) { /* already stopped */ } }, 300);
      }
      return;
    }
    if (!ch) {
      const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
      o.type = "sawtooth"; o2.type = "square"; lp.type = "lowpass"; lp.frequency.value = 900;
      g.gain.value = 0;
      o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master); o.start(); o2.start();
      ch = { o, o2, g };
    }
    const t = ac.currentTime;
    ch.o.frequency.setTargetAtTime(90 + p * 320, t, 0.05);
    ch.o2.frequency.setTargetAtTime(45 + p * 160 + 7, t, 0.05);
    ch.g.gain.setTargetAtTime(muted ? 0 : 0.07, t, 0.05);
  }

  function voice(text) {
    if (muted || !("speechSynthesis" in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = 0.05; u.rate = 0.72; u.volume = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { /* speech unavailable */ }
  }

  return {
    init, tension, channel, voice,
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem("resistance-is-tidy:mute", muted ? "1" : "0"); } catch (e) { /* storage blocked */ }
      if (master) master.gain.value = muted ? 0 : 0.55;
      if (muted && "speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    phaser(kind) {
      if (kind === "C") { tone(900, 200, 0.22, "sawtooth", 0.09); tone(600, 120, 0.25, "square", 0.05); }
      else if (kind === "B") tone(1300, 260, 0.13, "square", 0.07);
      else tone(1100, 380, 0.16, "sine", 0.1);
    },
    dronePulse() { tone(400, 90, 0.16, "sawtooth", 0.06); },
    hit() { noise(0.18, 0.25, 900, 200, "lowpass"); tone(140, 50, 0.18, "square", 0.12); },
    thud() { tone(90, 40, 0.2, "sine", 0.3); },
    spot() { tone(880, 880, 0.08, "square", 0.06); tone(1180, 1180, 0.1, "square", 0.06, 0.09); },
    alarm() { for (let i = 0; i < 4; i++) { tone(620, 620, 0.22, "square", 0.07, i * 0.5); tone(880, 880, 0.22, "square", 0.07, i * 0.5 + 0.25); } },
    scan() { tone(180, 1600, 0.9, "sine", 0.12); noise(0.9, 0.06, 400, 3000); },
    pickup() { tone(500, 900, 0.1, "triangle", 0.15); tone(750, 1400, 0.16, "triangle", 0.12, 0.08); },
    key() { [440, 587, 740, 880].forEach((f, i) => tone(f, f * 1.01, 0.18, "triangle", 0.14, i * 0.08)); },
    assim() { tone(70, 30, 0.6, "sawtooth", 0.25); tone(220, 880, 0.35, "square", 0.06); noise(0.4, 0.15, 3000, 200); },
    online() { [110, 165, 220, 330].forEach((f, i) => tone(f, f * 2, 0.6, "sawtooth", 0.07, i * 0.12)); },
    warp() { tone(60, 1200, 1.4, "sawtooth", 0.16); noise(1.4, 0.12, 200, 5000); },
    death() { tone(200, 30, 1.2, "sawtooth", 0.25); noise(1.0, 0.2, 2000, 100); },
    blip() { tone(760, 760, 0.05, "square", 0.05); },
  };
})();
