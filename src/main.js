import * as THREE from 'three';
import './style.css';
import { PLAYER, FEEL, LEVEL_URL, CHARACTER } from './config.js';
import { createPip } from './pip.js';
import { createCat } from './characters/cat.js';
import { loadCatModel, createCatModel } from './characters/cat-model.js';
import { seededRandom, mat } from './util.js';
import { createWorld } from './world.js';
import { createPlayer } from './player.js';
import { createCameraRig } from './camera.js';
import { createParticles } from './particles.js';
import { createAudio } from './audio.js';
import { createCrateFactory, TNT_RADIUS, BOUNCE_HITS } from './crates.js';
import { createEnemies } from './enemies.js';
import { createPlatforms } from './platforms.js';
import { createHazards } from './hazards.js';
import { createCollectibles } from './collectibles.js';
import { proceduralLevel } from './level.js';
import { loadGltfLevel } from './gltf-level.js';
import { buildScenery } from './scenery.js';
import { createTextures } from './render/textures.js';
import { createSky, SUN_DIR } from './render/sky.js';
import { createWater } from './render/water.js';
import { wind } from './render/foliage.js';
import { createPost } from './render/post.js';
import { TIERS, guessTier, createFpsWatch } from './quality.js';
import { createUI } from './ui.js';
import { toon } from './render/toon.js';

// Yield so the loading bar can paint; the timeout keeps loading going in a background tab
const nextFrame = () => new Promise(r => { requestAnimationFrame(() => r()); setTimeout(r, 60); });
const AUTOPLAY_KEY = 'island-autoplay';

// Renderer
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const FOG = 0xbfeaf5;
scene.fog = new THREE.Fog(FOG, 55, 210);
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 900);

// Toon materials get no env-map fill, so the sky light carries the shadowed side
const hemi = new THREE.HemisphereLight(0xdff4ff, 0x6a8a4a, 1.7);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d0, 2.8);
sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 100 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

const audio = createAudio();
const world = createWorld();
const particles = createParticles(scene);
const fx = particles.fx;

// Game state
const state = {
  started: false, done: false,
  fruit: 0, cratesBroken: 0, crateTotal: 0, crystal: false, gem: false, gemHintAt: -99,
  dying: 0, detonations: [], deaths: 0,
  checkpoint: new THREE.Vector3(), playTime: 0,
  hitStop: 0, simTime: 0, lastStep: 0
};

let level, settings, tierName, tier, post, rig, player, factory, enemies, platforms, hazards, scenery, sky, water, fruits, pickups, catModel;
const ghosts = [];

const ui = createUI({
  onPlay: startGame,
  onPause: () => clearInput(),
  onRestart: () => { try { sessionStorage.setItem(AUTOPLAY_KEY, '1'); } catch { /* ignore */ } location.reload(); },
  onJump: () => { input.jumpQueued = true; },
  onSpin: () => { input.spinQueued = true; },
  onSettings: s => applySettings(s),
  onSound: name => audio.play(name),
  onUnlock: () => audio.unlock()
});
settings = ui.settings;

// Input
const keys = {};
const input = { jumpQueued: false, spinQueued: false };
function clearInput() { for (const k in keys) keys[k] = false; input.jumpQueued = input.spinQueued = false; }
window.addEventListener('keydown', e => {
  if (e.target.closest?.('button, a, input, select')) return;
  keys[e.code] = true;
  if (e.code === 'Space' && !e.repeat) input.jumpQueued = true;
  if (['ShiftLeft', 'ShiftRight', 'KeyK', 'KeyX'].includes(e.code) && !e.repeat) input.spinQueued = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => audio.pause(document.hidden));

function readInput() {
  let x = ui.joy.x, z = ui.joy.y;
  if (keys.KeyA || keys.ArrowLeft) x -= 1;
  if (keys.KeyD || keys.ArrowRight) x += 1;
  if (keys.KeyW || keys.ArrowUp) z -= 1;
  if (keys.KeyS || keys.ArrowDown) z += 1;
  const out = {
    x, z,
    jumpPressed: input.jumpQueued,
    jumpHeld: !!(keys.Space || ui.touchButtons.jump),
    spinPressed: input.spinQueued
  };
  input.jumpQueued = input.spinQueued = false;
  return out;
}

// Quality
function resolveTier(s) { return s.quality === 'auto' ? (tierName || guessTier()) : s.quality; }
function applyTier(name) {
  tierName = name; tier = TIERS[name];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier.pixelRatio));
  sun.castShadow = tier.shadows;
  sun.shadow.mapSize.set(tier.shadowMap, tier.shadowMap);
  sun.shadow.map?.dispose(); sun.shadow.map = null;
  post?.setEnabled(tier.post);
  if (scenery?.grass) scenery.grass.visible = tier.grass > 0;
  resize();
}
function applySettings(s) {
  audio.setVolumes({ sfx: s.sfx, music: s.music });
  audio.setMuted(s.muted);
  const want = resolveTier(s);
  if (want !== tierName) applyTier(want);
  fpsWatch.enabled = s.quality === 'auto';
}
const fpsWatch = createFpsWatch(() => tierName, name => { applyTier(name); });

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  post?.setSize(w, h, renderer.getPixelRatio());
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 72 : 58;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// Building the level, in steps so the loading bar moves
async function load() {
  tierName = resolveTier(settings);
  tier = TIERS[tierName];
  applyTier(tierName);
  const rand = seededRandom(11);

  ui.setLoading(0.05, 'Carving crates…');
  await Promise.race([document.fonts?.load('400 100px "Lilita One"'), new Promise(r => setTimeout(r, 1500))]).catch(() => {});
  await nextFrame();
  const textures = createTextures(256);
  ui.setLoading(0.25, 'Painting the sky…');
  await nextFrame();
  sky = createSky(scene, rand);
  water = createWater(scene, { segments: tierName === 'low' ? 80 : 160 });
  ui.setLoading(0.4, 'Planting palms…');
  await nextFrame();
  // ?level=levels/my-level.glb loads a level built in Blender instead of the built-in one
  const levelUrl = new URLSearchParams(location.search).get('level') || LEVEL_URL;
  if (levelUrl) {
    level = await loadGltfLevel(levelUrl, scene, p => ui.setLoading(0.4 + p * 0.2, 'Loading level…'));
    scenery = { grass: null, torches: [], update() {} };
  } else {
    level = proceduralLevel();
    scenery = buildScenery(scene, { textures, quality: tier, rand });
  }
  for (const s of level.surfaces) world.addSurface({ ...s });
  ui.setLoading(0.6, 'Waking the cat…');
  // The rigged cat; if it can't load, the procedural one stands in
  catModel = await loadCatModel().catch(err => { console.warn('Cat model failed to load, using the procedural cat', err); return null; });
  ui.setLoading(0.65, 'Hiding fruit…');
  await nextFrame();
  buildEntities();
  post = createPost(renderer, scene, camera);
  applyTier(tierName);
  applySettings(settings);
  ui.setLoading(0.85, 'Warming up shaders…');
  await nextFrame();
  rig.update(0.016, player.state, true);
  try { await renderer.compileAsync(scene, camera); } catch { /* older drivers: compile on first frame */ }
  ui.setLoading(1, 'Ready');
  await nextFrame();

  let autoplay = false;
  try { autoplay = sessionStorage.getItem(AUTOPLAY_KEY) === '1'; sessionStorage.removeItem(AUTOPLAY_KEY); } catch { /* ignore */ }
  ui.ready();
  if (autoplay) document.getElementById('playBtn').click();
}

function buildEntities() {
  factory = createCrateFactory(scene, world, fx);
  for (const s of level.crateSpots) {
    const c = factory.make(s, s.base ?? level.pathTop(s.z));
    if (c.ghost) ghosts.push(c);
  }
  state.crateTotal = world.crates.filter(c => c.counted).length;
  ui.setCrates(0, state.crateTotal);

  platforms = createPlatforms(scene, world, level, {
    crumble: () => audio.play('land', 0.3),
    crumbleFall: pos => fx.dust(pos, 6, 0x9c8a74)
  });

  hazards = createHazards(scene, level, {
    logLand: (x, z) => {
      fx.dust(new THREE.Vector3(x, level.logRun.base, z), 6, 0xb59470);
      if (Math.abs(player.state.pos.z - z) < 30) { audio.play('rumble', panOf(x)); if (Math.abs(player.state.pos.z - z) < 12) shake(0.12); }
    },
    ignite: v => {
      const d = Math.hypot(player.state.pos.x - v.x, player.state.pos.z - v.z);
      if (d < 14) audio.play('flame', panOf(v.x), 0.12 * (1 - d / 14));
    }
  });

  enemies = createEnemies(scene);
  level.enemySpots.forEach(e => enemies.add(e));

  // Fruit: two instanced meshes (fruit and leaf) for all of them
  const fruitGeo = new THREE.SphereGeometry(0.28, 16, 12);
  fruitGeo.scale(1, 0.85, 1);
  const leafGeo = new THREE.ConeGeometry(0.1, 0.24, 6);
  leafGeo.rotateZ(0.3);
  leafGeo.translate(0.03, 0.3, 0);
  const spots = level.fruitSpots;
  const fruitMesh = new THREE.InstancedMesh(fruitGeo,
    toon({ color: 0xff7a2f, emissive: 0xff4a00, emissiveIntensity: 0.35 }), spots.length);
  const leafMesh = new THREE.InstancedMesh(leafGeo, mat(0x3bb36a, { flatShading: false }), spots.length);
  fruitMesh.castShadow = true;
  for (const m of [fruitMesh, leafMesh]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; scene.add(m); }
  fruits = spots.map((pos, i) => ({ position: pos.clone(), base: pos.clone(), phase: i * 0.7, taken: false, pop: 0, visible: true, scale: 1, rot: 0 }));
  fruits.meshes = [fruitMesh, leafMesh];

  pickups = createCollectibles(scene, level);
  ui.initPickups(!!pickups.crystal);
  if (!state.crateTotal) pickups.openGem(); // nothing to break

  const characters = { cat: catModel ? () => createCatModel(catModel) : createCat, 'cat-procedural': createCat, pip: createPip };
  const charName = new URLSearchParams(location.search).get('char') || CHARACTER;
  player = createPlayer(scene, world, playerEvents, characters[charName] ?? characters.cat);
  state.checkpoint.copy(level.checkpoints[0]);
  player.reset(state.checkpoint);
  rig = createCameraRig(camera, level.path);
}

// Player events
const playerEvents = {
  clamp(p) {
    const b = level.bounds;
    p.x = THREE.MathUtils.clamp(p.x, b.xMin, b.xMax);
    p.z = THREE.MathUtils.clamp(p.z, b.zMin, b.zMax);
  },
  jump(p) { audio.play('jump'); fx.dust(p, 3); },
  land(p, impact) {
    if (impact > 5) { fx.landRing(p, Math.min(1, impact / 20), dustColor(p)); audio.play('land', Math.min(1, impact / 20)); }
    if (impact > 16) shake(0.15);
  },
  stomp(c) { hitCrate(c, 'stomp'); },
  bonk(c) { hitCrate(c, 'bonk'); },
  spinStart() { audio.play('spin'); },
  spinning(p) {
    if (Math.random() < 0.6) fx.spinTrail(p);
    for (const c of world.crates) {
      if (!c.solid || c.broken) continue;
      if (Math.hypot(p.x - c.x, p.z - c.z) < PLAYER.spinReach && Math.abs(p.y + 0.7 - (c.base + 0.5)) < 1.3) hitCrate(c, 'spin');
    }
    for (const e of enemies.list) {
      if (e.alive && e.root.position.distanceTo(p) < PLAYER.spinReach + 0.3) defeatEnemy(e);
    }
  },
  fell() { respawn(); },
  reduceMotion: () => !settings.shake
};

const dustColor = p => (p.z < -100 ? 0xb59470 : 0xe8cf9a);
const panOf = x => THREE.MathUtils.clamp((x - camera.position.x) / 8, -1, 1);
function shake(a) { if (settings.shake) rig.shake(a); }
function vibrate(ms) { if (settings.shake) navigator.vibrate?.(ms); }

// Crates. `how` is 'stomp' (landed on top), 'bonk' (head from below) or 'spin'
function hitCrate(c, how) {
  if (c.ghost || c.broken) return;
  const held = !!(keys.Space || ui.touchButtons.jump);
  switch (c.type) {
    case 'tnt':
      // Touching it lights the fuse; only a spin sets it off straight away
      if (how === 'spin') explodeTnt(c);
      else {
        if (factory.lightFuse(c)) audio.play('tick');
        if (how === 'stomp') player.bounce(PLAYER.crateBounce);
      }
      return;
    case 'nitro':
      explodeTnt(c);
      return;
    case 'bounce':
      if (how === 'spin') breakCrate(c);
      else {
        c.hits++;
        factory.poke(c);
        addFruit(1, c.group.position);
        audio.play('bounce');
        if (how === 'stomp') player.bounce(held ? PLAYER.springBounce : PLAYER.springBounce * 0.85);
        if (c.hits >= BOUNCE_HITS) breakCrate(c);
      }
      return;
    case 'detonator':
      factory.poke(c);
      if (!c.activated) {
        c.activated = true;
        audio.play('activate');
        // Set them off one after another, nearest first
        const p = player.state.pos;
        world.crates.filter(o => o.type === 'nitro' && !o.broken && !o.ghost)
          .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))
          .forEach((o, i) => state.detonations.push({ crate: o, at: state.simTime + 0.4 + i * 0.25 }));
        ui.toast('Nitro detonated!');
      } else audio.play('metal');
      if (how === 'stomp') player.bounce(PLAYER.crateBounce);
      return;
    case 'activator':
      factory.poke(c);
      if (!c.activated) {
        c.activated = true;
        audio.play('activate');
        ghosts.forEach(g => factory.materialize(g));
        ui.toast('Crates appeared!');
      } else audio.play('metal');
      if (how === 'stomp') player.bounce(PLAYER.crateBounce);
      return;
    case 'checkpoint':
      breakCrate(c);
      state.checkpoint.set(c.x, c.base, c.z);
      audio.play('checkpoint');
      ui.toast('Checkpoint!');
      break;
    default:
      breakCrate(c);
  }
  if (how === 'stomp') player.bounce(held ? PLAYER.crateBounceHeld : PLAYER.crateBounce);
}

function breakCrate(c) {
  if (c.broken) return;
  factory.smash(c);
  audio.play('crate', panOf(c.x));
  state.hitStop = FEEL.hitStop;
  countCrate(c);
}

function countCrate(c) {
  if (!c.counted) return;
  state.cratesBroken++;
  ui.setCrates(state.cratesBroken, state.crateTotal);
  if (c.content) ui.showCard(c.content);
  if (state.cratesBroken === state.crateTotal) {
    ui.toast('All crates! The gem is free');
    openGem();
  }
}

function explodeTnt(c) {
  if (c.broken) return;
  factory.explode(c);
  countCrate(c);
  audio.play('boom', panOf(c.x));
  shake(0.7);
  vibrate(150);
  state.hitStop = FEEL.hitStop * 2;
  const p = player.state.pos;
  const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
  if (d < TNT_RADIUS && Math.abs(p.y - c.base) < 2.5) die();
  for (const o of world.crates) {
    if (o.broken || o.ghost || o === c) continue;
    if (Math.hypot(o.x - c.x, o.z - c.z) < TNT_RADIUS * 0.6 && Math.abs(o.base - c.base) < 1.5) {
      if (o.type === 'tnt' || o.type === 'nitro') explodeTnt(o);
      else if (o.type !== 'activator' && o.type !== 'detonator') breakCrate(o);
    }
  }
  for (const e of enemies.list) if (e.alive && e.root.position.distanceTo(c.group.position) < TNT_RADIUS) defeatEnemy(e);
}

// Logs, fire vents, and nitro crates, which go off when touched from any side
function checkHazards() {
  const p = player.state.pos;
  const hit = hazards.touching(p, PLAYER.radius);
  if (hit?.kind === 'fire') die();
  else if (hit && player.hurt(hit.x, hit.z)) loseFruit();
  for (const c of world.crates) {
    if (c.type !== 'nitro' || !c.solid || c.broken) continue;
    const reach = 0.5 + PLAYER.radius + 0.05;
    if (Math.abs(p.x - c.x) < reach && Math.abs(p.z - c.z) < reach && p.y < c.top + 0.05 && p.y + PLAYER.height > c.base) explodeTnt(c);
  }
}

// Enemies
function defeatEnemy(e) {
  const p = player.state.pos;
  const dx = e.root.position.x - p.x, dz = e.root.position.z - p.z, d = Math.hypot(dx, dz) || 1;
  enemies.defeat(e, dx / d, dz / d);
  fx.stars(e.root.position.clone().add(new THREE.Vector3(0, 0.6, 0)));
  audio.play('defeat');
  state.hitStop = FEEL.hitStop;
}

function checkEnemies() {
  const s = player.state, p = s.pos;
  for (const e of enemies.list) {
    if (!e.alive) continue;
    const ep = e.root.position;
    const d = Math.hypot(p.x - ep.x, p.z - ep.z);
    if (d > 0.95 || p.y > e.y + 1.1 || p.y + 1.4 < e.y) continue;
    if (s.vel.y < 0 && p.y > e.y + 0.35) {
      defeatEnemy(e);
      player.bounce(keys.Space ? PLAYER.crateBounceHeld : PLAYER.crateBounce);
    } else if (s.spin > 0) {
      defeatEnemy(e);
    } else if (player.hurt(ep.x, ep.z)) {
      loseFruit();
    }
  }
}

// Fruit
function addFruit(n, from) {
  state.fruit += n;
  ui.setFruit(state.fruit);
  audio.play('fruit');
  fx.sparkle(from.clone ? from.clone() : from, 0xffb347, 6);
}

function loseFruit() {
  audio.play('hurt');
  shake(0.3);
  vibrate(80);
  const lost = Math.min(state.fruit, PLAYER.hurtFruitLoss);
  if (lost) {
    state.fruit -= lost;
    ui.setFruit(state.fruit);
    fx.sparkle(player.state.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0xff7a2f, lost * 3);
  }
}

function collectFruit() {
  const p = player.state.pos;
  const cx = p.x, cy = p.y + 0.8, cz = p.z;
  for (const f of fruits) {
    if (f.taken) continue;
    const dx = f.position.x - cx, dy = f.position.y - cy, dz = f.position.z - cz;
    if (dx * dx + dy * dy + dz * dz > 1.25) continue;
    f.taken = true;
    addFruit(1, f.position);
  }
}

// Flow
function startGame() {
  state.started = true;
  state.playTime = 0;
  rig.setMode('follow', player.state);
  audio.unlock();
}

// Falling off and dying to fire or explosions all end up here
function respawn() {
  state.deaths++;
  ui.setDeaths(state.deaths);
  audio.play('fall');
  player.reset(state.checkpoint);
  ui.flash();
}

// Fire and explosions are deadly: a moment to see what happened, then back to the checkpoint
const DEATH_PAUSE = 0.7;
function die() {
  if (state.dying > 0 || state.done) return;
  state.dying = DEATH_PAUSE;
  const p = player.state.pos;
  player.model.root.visible = false;
  fx.dust(p, 10, 0x4a4038);
  fx.stars(p.clone().setY(p.y + 1));
  audio.play('hurt');
  shake(0.4);
  vibrate(120);
}

// Crystal, gem and the warp pad
function checkPickups() {
  const p = player.state.pos, chest = p.clone().setY(p.y + 0.8);
  const { crystal, gem, exit } = pickups;
  if (crystal && !crystal.taken && crystal.root.position.distanceTo(chest) < 1.3) {
    crystal.taken = true;
    crystal.root.visible = false;
    state.crystal = true;
    ui.gotPickup('crystal');
    audio.play('crystal');
    fx.sparkle(crystal.root.position, 0xff5fd2, 24);
    ui.toast('Power crystal!');
  }
  if (!gem.taken && gem.root.position.distanceTo(chest) < 1.4) {
    if (gem.open) {
      gem.taken = true;
      gem.root.visible = false;
      state.gem = true;
      ui.gotPickup('gem');
      audio.play('gem');
      fx.sparkle(gem.root.position, 0x3fe07a, 30);
      ui.toast('Green gem!');
    } else if (state.simTime - state.gemHintAt > 3) {
      state.gemHintAt = state.simTime;
      audio.play('metal');
      ui.toast(`Break every crate to free the gem (${state.crateTotal - state.cratesBroken} left)`);
    }
  }
  if (player.state.onGround && Math.hypot(p.x - exit.at.x, p.z - exit.at.z) < 1.2 && Math.abs(p.y - exit.at.y) < 0.5) finish();
}

function openGem() {
  pickups.openGem();
  fx.sparkle(pickups.gem.root.position, 0x3fe07a, 20);
  audio.play('activate');
}

function finish() {
  if (state.done) return;
  state.done = true;
  player.state.vel.set(0, 0, 0);
  audio.play('warp');
  fx.sparkle(pickups.exit.at.clone().setY(pickups.exit.at.y + 1), 0x8fe8ff, 30);
  rig.setMode('finish');
  player.model.play?.('victory');
  ui.showFinish({
    secs: Math.round(state.playTime),
    fruit: state.fruit, fruitTotal: fruits.length + BOUNCE_HITS,
    crates: state.cratesBroken, crateTotal: state.crateTotal,
    crystal: pickups.crystal ? state.crystal : null, gem: state.gem, deaths: state.deaths
  });
}

// One simulation step of gameplay
function simulate(dt) {
  state.simTime += dt;
  state.playTime += dt;
  platforms.update(dt, state.simTime);
  hazards.update(state.simTime);
  for (const d of state.detonations) if (d.at <= state.simTime) explodeTnt(d.crate);
  state.detonations = state.detonations.filter(d => d.at > state.simTime);
  if (state.dying > 0) {
    // Frozen while the death plays out; the world keeps going
    readInput();
    state.dying -= dt;
    if (state.dying <= 0) respawn();
    enemies.update(dt);
    for (const c of factory.update(dt, state.simTime).exploded) explodeTnt(c);
    return;
  }
  player.update(dt, readInput());
  enemies.update(dt);
  checkEnemies();
  checkHazards();
  collectFruit();
  const { exploded, ticked } = factory.update(dt, state.simTime);
  if (ticked) audio.play('tick');
  for (const c of exploded) explodeTnt(c);

  const s = player.state;
  // Fallback checkpoints count once Pip is standing past them (levels run toward -z)
  if (s.onGround) {
    for (const cp of level.checkpoints) {
      if (s.pos.z < cp.z - 0.5 && cp.z < state.checkpoint.z) state.checkpoint.copy(cp);
    }
  }

  // Footsteps and running dust, in time with the stride
  if (s.state === 'run') {
    const stepIndex = Math.floor(s.walk / Math.PI);
    if (stepIndex !== state.lastStep) { state.lastStep = stepIndex; audio.play('step'); fx.dust(s.pos, 1, dustColor(s.pos)); }
  }
  if (!state.done) checkPickups();
}

const fruitMatrix = new THREE.Matrix4(), fruitQuat = new THREE.Quaternion(), fruitScale = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
function updateFruit(dt) {
  fruits.forEach((f, i) => {
    if (f.taken) {
      if (f.visible) {
        f.pop += dt * 5;
        f.position.y += dt * 5;
        f.scale = Math.max(0, 1 - f.pop);
        if (f.pop >= 1) f.visible = false;
      }
    } else {
      f.rot = t * 2.5 + f.phase;
      f.position.y = f.base.y + Math.sin(t * 3 + f.phase) * 0.1;
    }
    fruitQuat.setFromAxisAngle(Y, f.rot);
    fruitScale.setScalar(f.visible ? Math.max(0.0001, f.scale) : 0.0001);
    fruitMatrix.compose(f.position, fruitQuat, fruitScale);
    for (const m of fruits.meshes) m.setMatrixAt(i, fruitMatrix);
  });
  for (const m of fruits.meshes) m.instanceMatrix.needsUpdate = true;
}

// Loop
const MAX_STEP = 1 / 120;
const clock = new THREE.Clock();
let t = 0;
function frame() {
  const raw = clock.getDelta();
  fpsWatch.tick(raw);
  const dt = Math.min(raw, 0.05);
  t += dt;
  wind.uTime.value += dt;

  const playing = ui.mode === 'playing' && !ui.paused && !state.done;
  if (playing) {
    // Gameplay runs in equal sub-steps of at most MAX_STEP, so jump arcs and
    // collisions come out the same at 30 fps and 144 fps
    const n = Math.ceil(dt / MAX_STEP - 1e-6), h = dt / n;
    for (let i = 0; i < n; i++) {
      if (state.hitStop > 0) state.hitStop -= h;
      else simulate(h);
    }
  } else if (!ui.paused) {
    // Keep the world alive behind menus
    state.simTime += dt;
    platforms.update(dt, state.simTime);
    hazards.update(state.simTime);
    enemies.update(dt);
    factory.update(dt, state.simTime);
    player.sync(dt);
  }

  // Ambient animation
  updateFruit(dt);
  pickups.update(t);
  if (pickups.gem.open && !pickups.gem.taken && Math.random() < 0.08) fx.sparkle(pickups.gem.root.position, 0x3fe07a, 1);
  if (pickups.crystal && !pickups.crystal.taken && Math.random() < 0.06) fx.sparkle(pickups.crystal.root.position, 0xff5fd2, 1);
  for (const tr of scenery.torches) if (Math.random() < dt * 4) fx.sparkle(tr.pos, 0xffb347, 1);
  particles.update(dt);
  scenery.update(dt, t);
  water.update(dt);

  rig.update(dt, player.state, !settings.shake);
  sky.update(dt, camera);

  // Shadow box follows the camera's focus
  const focus = rig.mode === 'menu' ? camera.position : player.state.pos;
  sun.position.set(focus.x + SUN_DIR.x * 40, focus.y + SUN_DIR.y * 40, focus.z - 6 + SUN_DIR.z * 40);
  sun.target.position.set(focus.x, focus.y, focus.z - 6);

  if (tier.post) post.render(); else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

resize();
load().then(() => {
  // Dev-only hook for stepping the simulation from the console
  if (import.meta.env.DEV) {
    window.__game = {
      state, player, world, enemies, crates: world.crates, ui, renderer, level,
      step: (dt = 1 / 60) => simulate(dt),
      render: () => (tier.post ? post.render() : renderer.render(scene, camera))
    };
  }
  if (new URLSearchParams(location.search).has('debug')) {
    import('./debug.js').then(m => m.createDebugPanel({ player, rig, state, applyTier, renderer, post, sun, hemi, openGem }));
  }
  requestAnimationFrame(frame);
});
