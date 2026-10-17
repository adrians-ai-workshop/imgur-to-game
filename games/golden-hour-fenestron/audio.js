class RotorAudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.running = false;
    this.masterGain = null;
    this.rotorGain = null;
    this.turbineOsc = null;
    this.turbineGain = null;
    this.fenestronOsc = null;
    this.fenestronGain = null;
    this.bladePhase = 0;
    this.lastThumpTime = 0;
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
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.35;
    this.masterGain.connect(this.ctx.destination);

    // Twin Turbomeca Arrius turbine whine
    this.turbineOsc = this.ctx.createOscillator();
    this.turbineOsc.type = "sine";
    this.turbineOsc.frequency.value = 520;

    this.turbineGain = this.ctx.createGain();
    this.turbineGain.gain.value = 0.025;
    this.turbineOsc.connect(this.turbineGain);
    this.turbineGain.connect(this.masterGain);
    this.turbineOsc.start();

    // Shrouded Fenestron high-frequency ducted fan hum
    this.fenestronOsc = this.ctx.createOscillator();
    this.fenestronOsc.type = "triangle";
    this.fenestronOsc.frequency.value = 285;

    const fenFilter = this.ctx.createBiquadFilter();
    fenFilter.type = "bandpass";
    fenFilter.frequency.value = 340;
    fenFilter.Q.value = 3.2;

    this.fenestronGain = this.ctx.createGain();
    this.fenestronGain.gain.value = 0.03;

    this.fenestronOsc.connect(fenFilter);
    fenFilter.connect(this.fenestronGain);
    this.fenestronGain.connect(this.masterGain);
    this.fenestronOsc.start();

    this.running = true;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : 0.35,
        this.ctx.currentTime,
        0.04
      );
    }
    return this.muted;
  }

  updateFlightSound(collective, speedRatio, bankAngle, pausedOrAttract) {
    if (!this.ctx || !this.running || this.muted) return;

    const now = this.ctx.currentTime;
    const activeFactor = pausedOrAttract ? 0.28 : 1.0;

    const targetTurbineFreq = 490 + collective * 240 + speedRatio * 110;
    this.turbineOsc.frequency.setTargetAtTime(targetTurbineFreq, now, 0.08);
    this.turbineGain.gain.setTargetAtTime(0.022 * activeFactor, now, 0.08);

    const yawLoad = Math.min(1, Math.abs(bankAngle) * 1.8 + collective * 0.5);
    this.fenestronOsc.frequency.setTargetAtTime(260 + yawLoad * 145, now, 0.06);
    this.fenestronGain.gain.setTargetAtTime((0.024 + yawLoad * 0.025) * activeFactor, now, 0.06);

    // 4-blade main rotor rhythmic thump
    const thumpInterval = Math.max(0.062, 0.105 - collective * 0.028 - speedRatio * 0.018);
    if (now - this.lastThumpTime >= thumpInterval) {
      this.lastThumpTime = now;
      this.triggerBladeThump(collective, Math.abs(bankAngle), activeFactor);
    }
  }

  triggerBladeThump(collective, bankLoad, scale) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Blade-vortex slap pitch
    const baseFreq = 52 + collective * 18 + bankLoad * 22;
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(26, now + 0.055);

    const vol = (0.09 + collective * 0.06 + bankLoad * 0.07) * scale;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.058);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.062);
  }

  playRadioChime(type = "dispatch") {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    const notes =
      type === "board"
        ? [587.33, 880]
        : type === "deliver"
        ? [523.25, 659.25, 783.99, 1046.5]
        : type === "warn"
        ? [311.13, 277.18]
        : type === "shift"
        ? [440, 554.37, 659.25, 880]
        : [659.25, 783.99];

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type === "warn" ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.075);

      gain.gain.setValueAtTime(0.001, now + idx * 0.075);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.075 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.075 + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.075);
      osc.stop(now + idx * 0.075 + 0.17);
    });
  }

  playHoistTick(upward = true) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(upward ? 920 : 680, now);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.035);
  }
}

window.RotorAudioEngine = RotorAudioEngine;
