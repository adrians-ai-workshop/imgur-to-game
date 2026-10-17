/* Tiny WebAudio SFX kit - no assets, all synthesized. */
(function () {
  let ac = null, master = null, muted = false;

  function ensure() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.35;
    master.connect(ac.destination);
    return ac;
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (muted || !ensure()) return;
    const t0 = ac.currentTime + (delay || 0);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol == null ? 0.25 : vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol) {
    if (muted || !ensure()) return;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    const g = ac.createGain();
    g.gain.value = vol == null ? 0.18 : vol;
    src.buffer = buf; src.connect(g); g.connect(master);
    src.start();
  }

  window.Sfx = {
    resume() { const a = ensure(); if (a && a.state === 'suspended') a.resume(); },
    get muted() { return muted; },
    setMuted(m) { muted = !!m; if (master) master.gain.value = m ? 0 : 0.35; },
    toggle() { this.setMuted(!muted); return muted; },
    jump() { tone(420, 0.18, 'triangle', 0.22, 760); },
    land() { tone(300, 0.09, 'sine', 0.11, 150); noise(0.04, 0.05); },
    leap() { tone(560, 0.22, 'sine', 0.2, 980); tone(840, 0.16, 'sine', 0.1, 1300, 0.04); },
    collect(n) { const base = 620 + Math.min(n || 0, 12) * 45; tone(base, 0.12, 'triangle', 0.2, base * 1.5); },
    golden() { tone(880, 0.14, 'square', 0.12, 1320); tone(1320, 0.22, 'sine', 0.14, 1760, 0.09); },
    bump() { tone(180, 0.16, 'sawtooth', 0.18, 90); noise(0.08, 0.08); },
    fall() { tone(320, 0.5, 'sine', 0.2, 70); },
    gate() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'triangle', 0.2, f * 1.01, i * 0.1)); },
    start() { [392, 523, 659].forEach((f, i) => tone(f, 0.22, 'triangle', 0.2, f, i * 0.07)); },
    menu() { tone(500, 0.08, 'square', 0.1); },
    gameover() { [392, 330, 262].forEach((f, i) => tone(f, 0.4, 'triangle', 0.22, f * 0.75, i * 0.18)); },
  };
})();