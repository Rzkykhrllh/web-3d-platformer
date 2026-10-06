import { AUDIO } from './config.js';

// All sound effects are synthesised with Web Audio, so there are no files to load.
// They are placeholders with the right timing and character; swap in recorded
// samples later by replacing the matching function in `sfx`.
// Music is a generated tropical loop unless AUDIO.musicUrl points at a file.

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
    fall: () => tone({ type: 'triangle', from: 600, to: 120, dur: 0.6, vol: 0.12 }),
    card: () => tone({ type: 'sine', from: 660, to: 990, dur: 0.12, vol: 0.06 }),
    click: () => tone({ type: 'sine', from: 700, dur: 0.05, vol: 0.06 })
  };

  // Generated music: marimba melody over a simple I-vi-IV-V loop, with bass and shaker
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
    const bpm = 108, beat = 60 / bpm, step = beat / 2;
    const chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
    const scale = [60, 62, 64, 67, 69, 72, 74, 76];
    const hz = n => 440 * Math.pow(2, (n - 69) / 12);
    let seed = 3;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    // Fixed 4-bar melody so the loop feels composed rather than random
    const melody = Array.from({ length: 32 }, (_, i) => (i % 4 === 3 || rand() < 0.25 ? null : scale[Math.floor(rand() * scale.length)]));
    let next = ctx.currentTime + 0.1, i = 0;

    function marimba(f, t, vol) {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o2.frequency.value = f * 4; o2.type = 'sine';
      const g2 = ctx.createGain(); g2.gain.value = 0.15;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(g); o2.connect(g2).connect(g); g.connect(musicBus);
      o.start(t); o2.start(t); o.stop(t + 0.5); o2.stop(t + 0.5);
    }
    function schedule() {
      // After a suspend, skip ahead instead of firing every missed note at once
      if (next < ctx.currentTime - 0.1) next = ctx.currentTime + 0.05;
      while (next < ctx.currentTime + 0.2) {
        const bar = Math.floor(i / 8) % 4, chord = chords[bar], s = i % 8;
        const m = melody[i % 32];
        if (m) marimba(hz(m + 12), next, 0.09);
        if (s === 0 || s === 4) marimba(hz(chord[0] - 24), next, 0.16);
        if (s === 2 || s === 6) chord.forEach(n => marimba(hz(n), next, 0.035));
        // shaker on every off-beat
        if (s % 2 === 1) {
          const src = ctx.createBufferSource(); src.buffer = noise;
          const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.05, next); g.gain.exponentialRampToValueAtTime(0.0001, next + 0.06);
          src.connect(f).connect(g).connect(musicBus);
          src.start(next, Math.random()); src.stop(next + 0.08);
        }
        next += step; i++;
      }
    }
    const timer = setInterval(schedule, 50);
    schedule();
    music = { stop: () => clearInterval(timer) };
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
