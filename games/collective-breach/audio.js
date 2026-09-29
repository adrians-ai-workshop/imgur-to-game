"use strict";

// Synthesized sound: no audio files are loaded.
const Snd = (() => {
  let ac = null, out = null, noiseBuf = null, hum = null, chan = null, muted = false;
  try { muted = localStorage.getItem("collective-breach:mute") === "1"; } catch (e) { /* storage blocked */ }

  function init() {
    if (ac) { if (ac.state === "suspended") ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    out = ac.createGain(); out.gain.value = muted ? 0 : 0.6; out.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startHum();
  }

  function startHum() {
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 220; lp.Q.value = 5;
    const g = ac.createGain(); g.gain.value = 0.16;
    lp.connect(g); g.connect(out);
    [48, 48.6, 72].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = i === 2 ? "triangle" : "sawtooth"; o.frequency.value = f;
      const og = ac.createGain(); og.gain.value = i === 2 ? 0.5 : 1;
      o.connect(og); og.connect(lp); o.start();
    });
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.09;
    const lg = ac.createGain(); lg.gain.value = 80;
    lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    hum = { lp, g };
  }

  const att = (d) => (d == null ? 1 : Math.max(0.06, 1 - d / 45));

  function tone(f0, f1, dur, type, vol, delay) {
    if (!ac || muted || vol <= 0.002) return;
    const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.03);
  }

  function hiss(dur, vol, f0, f1, type, delay) {
    if (!ac || muted || vol <= 0.002) return;
    const t = ac.currentTime + (delay || 0);
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = type || "bandpass";
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + dur + 0.03);
  }

  // Looping whine while assimilating; call with null to stop.
  function channel(p) {
    if (!ac) return;
    if (p == null) {
      if (chan) {
        const c = chan; chan = null;
        c.g.gain.setTargetAtTime(0, ac.currentTime, 0.05);
        setTimeout(() => { try { c.a.stop(); c.b.stop(); } catch (e) { /* stopped */ } }, 300);
      }
      return;
    }
    if (!chan) {
      const a = ac.createOscillator(), b = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
      a.type = "sawtooth"; b.type = "square"; lp.type = "lowpass"; lp.frequency.value = 1100;
      g.gain.value = 0;
      a.connect(lp); b.connect(lp); lp.connect(g); g.connect(out); a.start(); b.start();
      chan = { a, b, g };
    }
    const t = ac.currentTime;
    chan.a.frequency.setTargetAtTime(80 + p * 380, t, 0.05);
    chan.b.frequency.setTargetAtTime(40 + p * 190 + 5, t, 0.05);
    chan.g.gain.setTargetAtTime(muted ? 0 : 0.08, t, 0.05);
  }

  function speak(text) {
    if (muted || !("speechSynthesis" in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = 0.05; u.rate = 0.7; u.volume = 0.9;
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    } catch (e) { /* speech unavailable */ }
  }

  return {
    init, channel, speak,
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem("collective-breach:mute", muted ? "1" : "0"); } catch (e) { /* storage blocked */ }
      if (out) out.gain.value = muted ? 0 : 0.6;
      if (muted && "speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    tension(t) {
      if (!hum) return;
      hum.lp.frequency.setTargetAtTime(220 + t * 440, ac.currentTime, 0.4);
      hum.g.gain.setTargetAtTime(0.14 + t * 0.1, ac.currentTime, 0.5);
    },
    phaser(kind, d) {
      const v = att(d);
      if (kind === "C") { tone(880, 180, 0.24, "sawtooth", 0.1 * v); tone(560, 110, 0.26, "square", 0.05 * v); }
      else if (kind === "B") tone(1250, 240, 0.14, "square", 0.08 * v);
      else tone(1050, 360, 0.17, "sine", 0.11 * v);
    },
    disruptor() { tone(300, 60, 0.22, "sawtooth", 0.12); tone(1200, 200, 0.1, "square", 0.05); hiss(0.12, 0.08, 3000, 400); },
    dronePulse(d) { tone(420, 90, 0.16, "sawtooth", 0.06 * att(d)); },
    hit() { hiss(0.2, 0.28, 900, 180, "lowpass"); tone(130, 45, 0.2, "square", 0.14); },
    hurtCrew(d) { hiss(0.1, 0.1 * att(d), 1800, 500); },
    thud() { tone(85, 38, 0.22, "sine", 0.32); },
    spot(d) { tone(880, 880, 0.08, "square", 0.06 * att(d)); tone(1180, 1180, 0.1, "square", 0.06 * att(d), 0.09); },
    alarm() { for (let i = 0; i < 4; i++) { tone(600, 600, 0.22, "square", 0.07, i * 0.5); tone(860, 860, 0.22, "square", 0.07, i * 0.5 + 0.25); } },
    scan() { tone(160, 1700, 0.9, "sine", 0.13); hiss(0.9, 0.07, 400, 3200); },
    pickup() { tone(500, 900, 0.1, "triangle", 0.16); tone(760, 1400, 0.16, "triangle", 0.12, 0.08); },
    key() { [440, 587, 740, 880].forEach((f, i) => tone(f, f * 1.01, 0.18, "triangle", 0.15, i * 0.08)); },
    assimilated(d) { const v = att(d); tone(68, 30, 0.6, "sawtooth", 0.26 * v); tone(220, 900, 0.35, "square", 0.06 * v); hiss(0.4, 0.15 * v, 3000, 200); },
    online() { [110, 165, 220, 330].forEach((f, i) => tone(f, f * 2, 0.6, "sawtooth", 0.07, i * 0.12)); },
    warp() { tone(60, 1200, 1.4, "sawtooth", 0.17); hiss(1.4, 0.12, 200, 5000); },
    death() { tone(200, 30, 1.2, "sawtooth", 0.26); hiss(1.0, 0.2, 2000, 100); },
    door() { hiss(0.25, 0.06, 1500, 500); },
    blip() { tone(760, 760, 0.05, "square", 0.05); },
  };
})();
