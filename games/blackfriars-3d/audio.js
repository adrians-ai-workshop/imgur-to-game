// ============================================================================
// BLACKFRIARS REACH — Procedural WebAudio Thames, Pub, Alley & City Soundscape
// ============================================================================

window.BlackfriarsAudio = (function () {
  let ctx = null;
  let masterGain = null;
  let waterGain = null;
  let cityGain = null;
  let rainGain = null;
  let pubAmbGain = null;
  let alleyAmbGain = null;
  let muted = false;
  let running = false;
  let rainActive = false;
  let stepTimer = 0;
  let bistroNoteTimer = 0;
  let bistroNoteIdx = 0;

  function ensureCtx() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : 0.48;
      masterGain.connect(ctx.destination);
      buildAmbience();
      running = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  function createPinkNoiseBuffer(durationSec) {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  function buildAmbience() {
    const noiseBuf = createPinkNoiseBuffer(6);

    // 1. River Thames lapping / flow filter
    const waterSrc = ctx.createBufferSource();
    waterSrc.buffer = noiseBuf;
    waterSrc.loop = true;

    const waterFilter = ctx.createBiquadFilter();
    waterFilter.type = "bandpass";
    waterFilter.frequency.value = 340;
    waterFilter.Q.value = 1.1;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.18;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 110;
    lfo.connect(lfoGain);
    lfoGain.connect(waterFilter.frequency);
    lfo.start();

    waterGain = ctx.createGain();
    waterGain.gain.value = 0.24;
    waterSrc.connect(waterFilter);
    waterFilter.connect(waterGain);
    waterGain.connect(masterGain);
    waterSrc.start();

    // 2. Distant London city hum
    const citySrc = ctx.createBufferSource();
    citySrc.buffer = noiseBuf;
    citySrc.loop = true;

    const cityFilter = ctx.createBiquadFilter();
    cityFilter.type = "lowpass";
    cityFilter.frequency.value = 135;

    cityGain = ctx.createGain();
    cityGain.gain.value = 0.2;
    citySrc.connect(cityFilter);
    cityFilter.connect(cityGain);
    cityGain.connect(masterGain);
    citySrc.start();

    // 3. Gentle London rain / drizzle layer
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = noiseBuf;
    rainSrc.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = "bandpass";
    rainFilter.frequency.value = 1350;
    rainFilter.Q.value = 0.7;

    rainGain = ctx.createGain();
    rainGain.gain.value = 0.0;
    rainSrc.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(masterGain);
    rainSrc.start();

    // 4. Warm convivial murmur near The Black Friar Pub
    const pubSrc = ctx.createBufferSource();
    pubSrc.buffer = noiseBuf;
    pubSrc.loop = true;

    const pubFilter = ctx.createBiquadFilter();
    pubFilter.type = "bandpass";
    pubFilter.frequency.value = 480;
    pubFilter.Q.value = 1.8;

    pubAmbGain = ctx.createGain();
    pubAmbGain.gain.value = 0.0;
    pubSrc.connect(pubFilter);
    pubFilter.connect(pubAmbGain);
    pubAmbGain.connect(masterGain);
    pubSrc.start();

    // 5. Sheltered courtyard warmth near the Alley Restaurant
    alleyAmbGain = ctx.createGain();
    alleyAmbGain.gain.value = 0.0;
    alleyAmbGain.connect(masterGain);
  }

  function setRainAudio(active) {
    rainActive = !!active;
    if (rainGain && ctx) {
      rainGain.gain.setTargetAtTime(rainActive ? 0.22 : 0.0, ctx.currentTime, 0.35);
    }
  }

  function updateSpatial(playerPos, dt, isMoving, isRunning, isGrounded, surfaceType) {
    if (!running || !ctx) return;

    const now = ctx.currentTime;

    // 1. River volume by proximity to the Thames (Z between -95 and +95)
    const distToRiver = Math.max(0, Math.abs(playerPos.z) - 65);
    const riverProx = Math.max(0.05, 1 - distToRiver / 160);
    const indoorDamp = surfaceType === "interior" ? 0.25 : 1.0;
    if (waterGain) {
      waterGain.gain.setTargetAtTime((0.08 + riverProx * 0.26) * indoorDamp, now, 0.12);
    }
    if (cityGain) {
      cityGain.gain.setTargetAtTime(0.18 * indoorDamp, now, 0.12);
    }
    if (rainGain) {
      rainGain.gain.setTargetAtTime((rainActive ? 0.22 : 0.0) * indoorDamp, now, 0.2);
    }

    // 2. Proximity to The Black Friar Pub (approx X=48, Z=-226)
    const distPub = Math.hypot(playerPos.x - 48, playerPos.z - (-226));
    const pubProx = Math.max(0, 1 - distPub / 28);
    if (pubAmbGain) {
      pubAmbGain.gain.setTargetAtTime(pubProx * 0.22, now, 0.15);
    }

    // 3. Proximity to the Alley Restaurant behind the pub (approx X=54, Z=-258)
    const distAlley = Math.hypot(playerPos.x - 54, playerPos.z - (-258));
    if (distAlley < 26 && !muted) {
      bistroNoteTimer += dt;
      if (bistroNoteTimer >= 0.65) {
        bistroNoteTimer = 0;
        const alleyProx = Math.max(0, 1 - distAlley / 26);
        playSoftAlleyPluck(alleyProx);
      }
    }

    // 4. Footsteps when walking on ground/bridge/cobbles/interior
    if (isMoving && isGrounded) {
      stepTimer += dt * (isRunning ? 1.55 : 1.0);
      if (stepTimer >= 0.42) {
        stepTimer = 0;
        playFootstep(surfaceType);
      }
    } else {
      stepTimer = 0.3;
    }
  }

  // Gentle romantic acoustic guitar/mandolin arpeggio drifting from the alley restaurant
  const ALLEY_MELODY = [
    293.66, 369.99, 440.0, 587.33, 440.0, 369.99,
    329.63, 392.0, 493.88, 659.25, 493.88, 392.0,
    261.63, 329.63, 392.0, 523.25, 392.0, 329.63,
    246.94, 329.63, 369.99, 493.88, 369.99, 329.63
  ];

  function playSoftAlleyPluck(prox) {
    if (!ctx || muted || prox <= 0.05) return;
    const now = ctx.currentTime;
    const freq = ALLEY_MELODY[bistroNoteIdx % ALLEY_MELODY.length];
    bistroNoteIdx++;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);

    const vol = Math.min(0.055, prox * 0.055);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 0.58);

    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.62);
  }

  function playFootstep(surfaceType) {
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (surfaceType === "cobble") {
      // Crisp historic London cobblestone heel-tap
      osc.type = "triangle";
      const baseFreq = 165 + Math.random() * 45;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.055);
      gain.gain.setValueAtTime(0.085, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    } else if (surfaceType === "interior") {
      // Soft muffled timber/carpet step indoors
      osc.type = "sine";
      const baseFreq = 68 + Math.random() * 14;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.06);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    } else if (surfaceType === "bridge") {
      // Iron bridge resonance
      osc.type = "triangle";
      const baseFreq = 115 + Math.random() * 25;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(34, now + 0.065);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    } else {
      // Yorkstone pavement
      osc.type = "sine";
      const baseFreq = 88 + Math.random() * 20;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(36, now + 0.065);
      gain.gain.setValueAtTime(0.075, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    }

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  function playChime() {
    if (!ensureCtx() || muted) return;
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + idx * 0.055);
      g.gain.setValueAtTime(0.085, now + idx * 0.055);
      g.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.055 + 0.55);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.6);
    });
  }

  function playCheckoutBeep() {
    if (!ensureCtx() || muted) return;
    const now = ctx.currentTime;
    // Authentic UK supermarket self-checkout scanner beep + confirmation tone
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(2480, now);
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.1);

    [880, 1174.66].forEach((f, idx) => {
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = "triangle";
      o2.frequency.setValueAtTime(f, now + 0.16 + idx * 0.08);
      g2.gain.setValueAtTime(0.07, now + 0.16 + idx * 0.08);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.4 + idx * 0.08);
      o2.connect(g2);
      g2.connect(masterGain);
      o2.start(now + 0.16 + idx * 0.08);
      o2.stop(now + 0.42 + idx * 0.08);
    });
  }

  function playPubCheers() {
    if (!ensureCtx() || muted) return;
    const now = ctx.currentTime;
    // Crystal pint glass clink + warm brassy pub chord
    [1760, 2349.3, 3135.9].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + idx * 0.015);
      g.gain.setValueAtTime(0.07 / (idx + 1), now + idx * 0.015);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 0.45);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now + idx * 0.015);
      osc.stop(now + 0.48);
    });
    [293.66, 369.99, 440.0, 587.33].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, now + 0.12 + idx * 0.04);
      g.gain.setValueAtTime(0.06, now + 0.12 + idx * 0.04);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 1.1);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now + 0.12 + idx * 0.04);
      osc.stop(now + 1.15);
    });
  }

  function playBistroChord() {
    if (!ensureCtx() || muted) return;
    const now = ctx.currentTime;
    // Warm romantic guitar & wine glass clink in the alley restaurant
    const notes = [293.66, 369.99, 440.0, 554.37, 659.25, 880.0];
    notes.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, now + idx * 0.065);
      g.gain.setValueAtTime(0.075, now + idx * 0.065);
      g.gain.exponentialRampToValueAtTime(0.0006, now + idx * 0.065 + 1.25);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + 1.3);
    });
  }

  function playHotelWelcome() {
    if (!ensureCtx() || muted) return;
    const now = ctx.currentTime;
    // Warm brass reception desk bell + soothing chord
    [1318.5, 1975.5].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now);
      g.gain.setValueAtTime(0.09 / (i + 1), now);
      g.gain.exponentialRampToValueAtTime(0.0006, now + 1.1);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + 1.15);
    });
  }

  function playShutterClick() {
    if (!ensureCtx() || muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.045);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  function playBellToll() {
    if (!ensureCtx() || muted) return;
    const now = ctx.currentTime;
    // St Paul's / Blackfriars distant bronze bell harmonic
    [220, 440, 528, 660].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now);
      g.gain.setValueAtTime(0.07 / (idx + 1), now);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 2.4);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + 2.5);
    });
  }

  function toggleMute() {
    ensureCtx();
    muted = !muted;
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.48, ctx.currentTime, 0.05);
    }
    return muted;
  }

  return {
    init: ensureCtx,
    updateSpatial,
    setRainAudio,
    playChime,
    playCheckoutBeep,
    playPubCheers,
    playBistroChord,
    playHotelWelcome,
    playShutterClick,
    playBellToll,
    toggleMute,
    isMuted: () => muted
  };
})();
