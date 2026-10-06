import { AUDIO } from './config.js';

// All sound effects are synthesised with Web Audio, so there are no files to load.
// They are placeholders with the right timing and character; swap in recorded
// samples later by replacing the matching function in `sfx`.
// Music is a generated PS1-style jungle loop unless AUDIO.musicUrl points at a file.

export function createAudio() {
  let ctx = null, master, sfxBus, musicBus, noise;
  let musicOn = true, muted = false;
  let sfxVolume = AUDIO.sfxVolume, musicVolume = AUDIO.musicVolume;
  let music = null;

  // Browsers only allow audio after a user gesture, so this runs on the first click
  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxVolume; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = musicVolume; musicBus.connect(master);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (musicOn) startMusic();
  }

  // Building blocks
  function tone({ type = 'sine', from, to = from, dur, vol = 0.3, at = 0, pan = 0, attack = 0.005, bus = sfxBus }) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    if (to !== from) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = o.connect(g);
    if (pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; out = out.connect(p); }
    out.connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function hiss({ dur, vol = 0.3, at = 0, filter = 'lowpass', from = 2000, to = from, q = 1, pan = 0, bus = sfxBus }) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource(); src.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = filter; f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    if (to !== from) f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = src.connect(f).connect(g);
    if (pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; out = out.connect(p); }
    out.connect(bus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  const vary = (f, amt = 0.06) => f * (1 + (Math.random() - 0.5) * amt * 2);

  const sfx = {
    step: () => hiss({ dur: 0.05, vol: 0.06, filter: 'bandpass', from: vary(1800, 0.2), q: 2 }),
    jump: () => tone({ type: 'square', from: vary(280), to: 620, dur: 0.14, vol: 0.06 }),
    land: (strength = 0.5) => {
      hiss({ dur: 0.12, vol: 0.08 + strength * 0.15, from: 900, to: 200 });
      tone({ from: 120, to: 60, dur: 0.12, vol: 0.12 * strength });
    },
    spin: () => hiss({ dur: 0.4, vol: 0.18, filter: 'bandpass', from: 500, to: 3000, q: 3 }),
    crate: pan => {
      hiss({ dur: 0.18, vol: 0.35, filter: 'bandpass', from: vary(1400), to: 500, q: 1.5, pan });
      tone({ type: 'triangle', from: vary(220), to: 110, dur: 0.1, vol: 0.18, pan });
      tone({ type: 'square', from: vary(900), to: 700, dur: 0.04, vol: 0.05, at: 0.02, pan });
    },
    fruit: () => {
      const f = vary(880, 0.02);
      tone({ type: 'sine', from: f, dur: 0.08, vol: 0.12 });
      tone({ type: 'sine', from: f * 1.5, dur: 0.12, vol: 0.12, at: 0.06 });
    },
    bounce: () => tone({ type: 'sine', from: 180, to: 720, dur: 0.25, vol: 0.25 }),
    metal: () => {
      tone({ type: 'square', from: 520, to: 500, dur: 0.15, vol: 0.06 });
      tone({ type: 'sine', from: 1300, dur: 0.3, vol: 0.06 });
    },
    tick: () => tone({ type: 'square', from: 1200, dur: 0.06, vol: 0.08 }),
    // Fire vent igniting; quiet, since several go off at once
    flame: (pan, vol = 0.12) => hiss({ dur: 0.7, vol, from: 700, to: 250, pan }),
    // Log rolling out of the gate
    rumble: pan => tone({ type: 'triangle', from: 70, to: 45, dur: 0.5, vol: 0.18, pan }),
    boom: pan => {
      hiss({ dur: 1.2, vol: 0.7, from: 1800, to: 80, pan });
      tone({ type: 'sine', from: 90, to: 30, dur: 0.8, vol: 0.6, pan });
    },
    hurt: () => {
      tone({ type: 'sawtooth', from: 500, to: 180, dur: 0.3, vol: 0.1 });
      hiss({ dur: 0.15, vol: 0.15, from: 2500, to: 600 });
    },
    defeat: () => {
      tone({ type: 'square', from: 300, to: 900, dur: 0.12, vol: 0.07 });
      hiss({ dur: 0.1, vol: 0.15, filter: 'bandpass', from: 1200, q: 2 });
    },
    checkpoint: () => [523, 659, 784].forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.3, vol: 0.12, at: i * 0.08 })),
    activate: () => [392, 523, 659, 784].forEach((f, i) => tone({ type: 'square', from: f, dur: 0.12, vol: 0.05, at: i * 0.05 })),
    gem: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.5, vol: 0.12, at: i * 0.09 })),
    crystal: () => [659, 831, 988, 1319].forEach((f, i) => tone({ type: 'sine', from: f, dur: 0.6, vol: 0.12, at: i * 0.07 })),
    warp: () => {
      tone({ type: 'sine', from: 220, to: 1760, dur: 0.9, vol: 0.14 });
      hiss({ dur: 0.9, vol: 0.12, filter: 'bandpass', from: 400, to: 4000, q: 2 });
    },
    fall: () => tone({ type: 'triangle', from: 600, to: 120, dur: 0.6, vol: 0.12 }),
    card: () => tone({ type: 'sine', from: 660, to: 990, dur: 0.12, vol: 0.06 }),
    click: () => tone({ type: 'sine', from: 700, dur: 0.05, vol: 0.06 })
  };

  // Generated music in the spirit of PS1-era jungle levels: marimba lead,
  // bongos and log drum, shaker, a plucky bass and a soft pad, in D dorian
  // over Dm - C - Bb - C. It all goes through a lo-fi chain (big console-style
  // reverb, top end rolled off) so it sounds like it came out of a 90s console.
  function startMusic() {
    if (!ctx || music) return;
    if (AUDIO.musicUrl) {
      const el = new Audio(AUDIO.musicUrl);
      el.loop = true;
      const src = ctx.createMediaElementSource(el);
      src.connect(musicBus);
      el.play().catch(() => {});
      music = { stop: () => el.pause() };
      return;
    }

    // Lo-fi chain: dry + reverb, then a gentle low-pass
    const input = ctx.createGain();
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 9000; tone.Q.value = 0.4;
    const reverb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.8), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    reverb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.28;
    input.connect(tone);
    input.connect(reverb).connect(wet).connect(tone);
    tone.connect(musicBus);

    const bpm = 120, step = 60 / bpm / 4; // sixteenth notes
    const hz = n => 440 * Math.pow(2, (n - 69) / 12);
    const chords = [[62, 65, 69], [60, 64, 67], [58, 62, 65], [60, 64, 67]];
    const roots = [38, 36, 34, 36];
    const _ = null;
    // Eight bars: a call (A) and an answer (B), 16 steps each
    const lead = [
      [69, _, 72, _, 74, _, 72, 69, _, 67, _, 69, _, _, _, _],
      [67, _, 69, _, 72, _, 69, 67, _, 64, _, 67, _, _, _, _],
      [65, _, 69, _, 70, _, 69, 65, _, 62, _, 65, _, 67, _, _],
      [67, _, _, 64, _, 67, _, 72, _, 71, _, 72, _, _, _, _],
      [74, 74, _, 72, _, 69, _, _, 72, _, 69, _, 67, _, 65, _],
      [64, _, 67, _, 69, _, 72, _, 71, _, 69, _, 67, _, _, _],
      [65, 65, _, 67, _, 69, _, _, 70, _, 69, _, 67, _, 65, _],
      [67, _, _, _, 64, _, _, _, 62, _, _, _, _, _, _, _]
    ];
    const kick = [0, 6, 10], bongoHi = [3, 7, 11, 14, 15], bongoLo = [4, 12];
    const bassSteps = { 0: 0, 3: 0, 6: 7, 8: 12, 11: 0, 14: 10 };

    const env = (g, t, vol, attack, decay) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    };
    function marimba(f, t, vol) {
      const g = ctx.createGain(); env(g, t, vol, 0.004, 0.38); g.connect(input);
      [[1, 1], [4, 0.12], [9.8, 0.04]].forEach(([mul, amt]) => {
        const o = ctx.createOscillator(), a = ctx.createGain();
        o.frequency.value = f * mul; a.gain.value = amt;
        o.connect(a).connect(g); o.start(t); o.stop(t + 0.45);
      });
    }
    function drum(f, t, vol, decay, drop = 1.6) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(f * drop, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
      env(g, t, vol, 0.002, decay);
      o.connect(g).connect(input); o.start(t); o.stop(t + decay + 0.05);
    }
    function shaker(t, vol) {
      const src = ctx.createBufferSource(); src.buffer = noise;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = ctx.createGain(); env(g, t, vol, 0.003, 0.05);
      src.connect(f).connect(g).connect(input);
      src.start(t, Math.random()); src.stop(t + 0.08);
    }
    function bass(n, t) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 6;
      f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(220, t + 0.18);
      const g = ctx.createGain(); env(g, t, 0.16, 0.005, 0.24);
      ['triangle', 'square'].forEach((type, k) => {
        const o = ctx.createOscillator(), a = ctx.createGain();
        o.type = type; o.frequency.value = hz(n); a.gain.value = k ? 0.35 : 1;
        o.connect(a).connect(f); o.start(t); o.stop(t + 0.3);
      });
      f.connect(g).connect(input);
    }
    function pad(notes, t, dur) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1100;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.022, t + 0.35);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      notes.forEach(n => [-7, 7].forEach(cents => {
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.value = hz(n); o.detune.value = cents;
        o.connect(f); o.start(t); o.stop(t + dur + 0.05);
      }));
      f.connect(g).connect(input);
    }

    let next = ctx.currentTime + 0.1, i = 0;
    function schedule() {
      // After a suspend, skip ahead instead of firing every missed note at once
      if (next < ctx.currentTime - 0.1) next = ctx.currentTime + 0.05;
      while (next < ctx.currentTime + 0.2) {
        const bar = Math.floor(i / 16) % 8, s = i % 16, chord = bar % 4;
        if (s === 0) pad(chords[chord], next, step * 16);
        const m = lead[bar][s];
        if (m) marimba(hz(m + 12), next, 0.085);
        if (s in bassSteps) bass(roots[chord] + bassSteps[s], next);
        if (kick.includes(s)) drum(58, next, 0.32, 0.28, 2.4);
        if (bongoHi.includes(s)) drum(330, next, 0.1, 0.11);
        if (bongoLo.includes(s)) drum(220, next, 0.12, 0.14);
        shaker(next, s % 4 === 2 ? 0.05 : 0.025);
        next += step; i++;
      }
    }
    const timer = setInterval(schedule, 50);
    schedule();
    music = { stop: () => { clearInterval(timer); input.disconnect(); } };
  }

  function stopMusic() { music?.stop(); music = null; }

  return {
    unlock,
    play(name, ...args) { if (ctx && !muted) sfx[name]?.(...args); },
    get muted() { return muted; },
    setMuted(m) {
      muted = m;
      if (master) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05);
    },
    setMusic(on) { musicOn = on; if (!ctx) return; on ? startMusic() : stopMusic(); },
    setVolumes({ sfx = sfxVolume, music: mv = musicVolume }) {
      sfxVolume = sfx; musicVolume = mv;
      if (sfxBus) { sfxBus.gain.value = sfx; musicBus.gain.value = mv; }
    },
    get volumes() { return { sfx: sfxVolume, music: musicVolume }; },
    // Suspend audio when the tab is hidden
    pause(p) { if (ctx) p ? ctx.suspend() : ctx.resume(); }
  };
}
