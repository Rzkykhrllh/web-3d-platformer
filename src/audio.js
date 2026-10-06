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

  // Generated music in the spirit of Crash's jungle levels: a shuffled 16th
  // groove with congas, bongos, woodblock, log drum and shaker, a bouncing bass,
  // a marimba call answered by a whistle over a didgeridoo drone, and a jaw harp
  // "boing" at the end of each phrase. D dorian over Dm - C - Bb - C. It all goes
  // through a lo-fi chain (big console-style reverb, top end rolled off).
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

    const bpm = 128, step = 60 / bpm / 4; // sixteenth notes
    const swing = step * 0.3;              // off-beat 16ths land late: the shuffle
    const hz = n => 440 * Math.pow(2, (n - 69) / 12);
    const chords = [[62, 65, 69], [60, 64, 67], [58, 62, 65], [60, 64, 67]];
    const roots = [38, 36, 34, 36];
    const _ = null;
    // Eight bars, 16 steps each. A: a bouncy marimba call. B: a whistle answers
    // over a didgeridoo drone, with the marimba dropping in and out.
    const marimbaPart = [
      [74, _, 77, 74, _, 69, _, 72, 74, _, _, 77, _, 76, 74, _],
      [72, _, 76, 72, _, 67, _, 71, 72, _, _, 76, _, 74, 72, _],
      [70, _, 74, 70, _, 65, _, 69, 70, _, 72, _, 74, _, 77, _],
      [76, _, _, 74, _, 72, _, _, 69, _, 67, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, 74, _, 77, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, 72, _, 76, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, 70, _, 74, _, _, _],
      [_, _, _, _, _, _, _, _, 74, 76, 77, _, 76, _, 74, _]
    ];
    const whistlePart = [
      _, _, _, _,
      [81, _, _, _, 79, _, 77, _, 76, _, _, _, _, _, _, _],
      [72, _, _, _, 74, _, 76, _, 79, _, _, _, _, _, _, _],
      [77, _, _, _, 76, _, 74, _, 72, _, _, _, _, _, _, _],
      [69, _, _, _, 72, _, _, _, _, _, _, _, _, _, _, _]
    ];
    // Percussion, by step in the bar
    const P = {
      kick: [0, 7, 10], congaOpen: [3, 11], congaSlap: [6, 14, 15],
      bongo: [2, 5, 13], block: [4, 12], log: [8, 9]
    };
    // Bass: semitones above the root, bouncing between root and octave
    const bassLine = { 0: 0, 2: 12, 3: 0, 6: 7, 8: 0, 10: 12, 11: 0, 14: 10 };

    const env = (g, t, vol, attack, decay) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    };
    const osc = (type, f, t, dur, dest) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
      o.connect(dest); o.start(t); o.stop(t + dur); return o;
    };
    function marimba(f, t, vol) {
      const g = ctx.createGain(); env(g, t, vol, 0.003, 0.32); g.connect(input);
      [[1, 1], [4, 0.14], [9.8, 0.05]].forEach(([mul, amt]) => {
        const a = ctx.createGain(); a.gain.value = amt; a.connect(g);
        osc('sine', f * mul, t, 0.4, a);
      });
    }
    // Whistle: a sine with vibrato that scoops up into each note
    function whistle(f, t, dur) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.04);
      g.gain.setValueAtTime(0.06, t + dur * 0.75);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      g.connect(input);
      const o = osc('sine', f, t, dur + 0.05, g);
      o.frequency.setValueAtTime(f * 0.94, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = 5.5; depth.gain.value = f * 0.012;
      lfo.connect(depth).connect(o.frequency); lfo.start(t + 0.12); lfo.stop(t + dur + 0.05);
    }
    function drum(f, t, vol, decay, drop = 1.6) {
      const g = ctx.createGain(); env(g, t, vol, 0.002, decay); g.connect(input);
      const o = osc('sine', f * drop, t, decay + 0.05, g);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    }
    function noiseHit(t, vol, type, freq, decay, q = 1) {
      const src = ctx.createBufferSource(); src.buffer = noise;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); env(g, t, vol, 0.002, decay);
      src.connect(f).connect(g).connect(input);
      src.start(t, Math.random()); src.stop(t + decay + 0.05);
    }
    function congaSlap(t) { drum(420, t, 0.09, 0.07, 1.3); noiseHit(t, 0.06, 'bandpass', 2500, 0.04, 2); }
    function woodblock(t) { drum(1600, t, 0.07, 0.05, 1.05); }
    function bass(n, t) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 7;
      f.frequency.setValueAtTime(1100, t); f.frequency.exponentialRampToValueAtTime(240, t + 0.16);
      const g = ctx.createGain(); env(g, t, 0.17, 0.004, 0.2);
      ['triangle', 'square'].forEach((type, k) => {
        const a = ctx.createGain(); a.gain.value = k ? 0.3 : 1; a.connect(f);
        const o = osc(type, hz(n) * 0.97, t, 0.26, a);
        o.frequency.exponentialRampToValueAtTime(hz(n), t + 0.03); // tiny slide up
      });
      f.connect(g).connect(input);
    }
    // Jaw harp "boing": a buzzy note through a resonant filter sweeping up and down
    function boing(n, t) {
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 9;
      f.frequency.setValueAtTime(400, t);
      f.frequency.exponentialRampToValueAtTime(1800, t + 0.12);
      f.frequency.exponentialRampToValueAtTime(500, t + 0.35);
      const g = ctx.createGain(); env(g, t, 0.22, 0.005, 0.38);
      osc('sawtooth', hz(n), t, 0.45, f);
      f.connect(g).connect(input);
    }
    // Didgeridoo-ish drone: low saw, a formant that wobbles, for a whole bar
    function drone(n, t, dur) {
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 4; f.frequency.value = 420;
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = 2.1; depth.gain.value = 180;
      lfo.connect(depth).connect(f.frequency); lfo.start(t); lfo.stop(t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.2);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      osc('sawtooth', hz(n), t, dur + 0.05, f);
      f.connect(g).connect(input);
    }

    let next = ctx.currentTime + 0.1, i = 0;
    function schedule() {
      // After a suspend, skip ahead instead of firing every missed note at once
      if (next < ctx.currentTime - 0.1) next = ctx.currentTime + 0.05;
      while (next < ctx.currentTime + 0.2) {
        const bar = Math.floor(i / 16) % 8, s = i % 16, chord = bar % 4;
        const t = next + (s % 2 ? swing : 0);
        if (s === 0 && bar >= 4) drone(roots[chord] + 12, t, step * 16);
        const m = marimbaPart[bar][s];
        if (m) marimba(hz(m + 12), t, 0.08);
        const wp = whistlePart[bar];
        if (wp && wp[s]) {
          let len = 1; while (s + len < 16 && !wp[s + len]) len++;
          whistle(hz(wp[s] + 12), t, Math.min(len, 6) * step * 0.95);
        }
        if (s in bassLine) bass(roots[chord] + bassLine[s], t);
        if (P.kick.includes(s)) drum(58, t, 0.3, 0.26, 2.4);
        if (P.congaOpen.includes(s)) drum(200, t, 0.13, 0.18, 1.3);
        if (P.congaSlap.includes(s)) congaSlap(t);
        if (P.bongo.includes(s)) drum(360, t, 0.09, 0.09);
        if (P.block.includes(s)) woodblock(t);
        if (P.log.includes(s) && bar % 2) drum(hz(roots[chord] + (s === 8 ? 24 : 31)), t, 0.12, 0.16, 1.1);
        if (s === 12 && (bar === 3 || bar === 7)) boing(roots[chord] + 12, t);
        noiseHit(t, s % 4 === 2 ? 0.045 : 0.022, 'highpass', 7000, 0.045);
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
