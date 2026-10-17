class SpatialRotorAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.running = false;
    this.master = null;
    this.turbineOsc = null;
    this.turbineGain = null;
    this.fenOsc = null;
    this.fenGain = null;
    this.lastBladeTime = 0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.36;
    this.master.connect(this.ctx.destination);

    // Twin turbine core whine
    this.turbineOsc = this.ctx.createOscillator();
    this.turbineOsc.type = "sine";
    this.turbineOsc.frequency.value = 540;
    this.turbineGain = this.ctx.createGain();
    this.turbineGain.gain.value = 0.024;
    this.turbineOsc.connect(this.turbineGain);
    this.turbineGain.connect(this.master);
    this.turbineOsc.start();

    // Shrouded Fenestron tail fan resonance
    this.fenOsc = this.ctx.createOscillator();
    this.fenOsc.type = "triangle";
    this.fenOsc.frequency.value = 310;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 360;
    filter.Q.value = 3.0;

    this.fenGain = this.ctx.createGain();
    this.fenGain.gain.value = 0.028;
    this.fenOsc.connect(filter);
    filter.connect(this.fenGain);
    this.fenGain.connect(this.master);
    this.fenOsc.start();

    this.running = true;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : 0.36,
        this.ctx.currentTime,
        0.04
      );
    }
    return this.muted;
  }

  update(collective, speedNorm, turnLoad, isQuietMode) {
    if (!this.ctx || !this.running || this.muted) return;
    const now = this.ctx.currentTime;
    const factor = isQuietMode ? 0.25 : 1.0;

    this.turbineOsc.frequency.setTargetAtTime(
      510 + collective * 260 + speedNorm * 120,
      now,
      0.08
    );
    this.turbineGain.gain.setTargetAtTime(0.022 * factor, now, 0.08);

    this.fenOsc.frequency.setTargetAtTime(
      280 + turnLoad * 160 + collective * 60,
      now,
      0.06
    );
    this.fenGain.gain.setTargetAtTime(
      (0.022 + turnLoad * 0.03) * factor,
      now,
      0.06
    );

    const interval = Math.max(
      0.058,
      0.102 - collective * 0.026 - speedNorm * 0.018
    );
    if (now - this.lastBladeTime >= interval) {
      this.lastBladeTime = now;
      this.pulseBlade(collective, turnLoad, factor);
    }
  }

  pulseBlade(collective, bankLoad, factor) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    const startFreq = 54 + collective * 20 + bankLoad * 18;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.054);

    const vol = (0.095 + collective * 0.06 + bankLoad * 0.05) * factor;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.056);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  chime(kind = "dispatch") {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    const seq =
      kind === "pickup"
        ? [587.33, 880]
        : kind === "deliver"
        ? [523.25, 659.25, 783.99, 1046.5]
        : kind === "warn"
        ? [293.66, 261.63]
        : kind === "sector"
        ? [440, 554.37, 659.25, 880]
        : [659.25, 783.99];

    seq.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = kind === "warn" ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(f, now + i * 0.075);

      gain.gain.setValueAtTime(0.001, now + i * 0.075);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.075 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.075 + 0.16);

      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now + i * 0.075);
      osc.stop(now + i * 0.075 + 0.17);
    });
  }

  winchClick(up = true) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(up ? 940 : 690, now);
    gain.gain.setValueAtTime(0.032, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.032);
  }
}

window.SpatialRotorAudio = SpatialRotorAudio;
