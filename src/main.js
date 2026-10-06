import * as THREE from 'three';
import './style.css';
import { mat } from './util.js';
import { createPip } from './pip.js';
import { createCrateFactory, TNT_RADIUS } from './crates.js';
import {
  buildLevel, surfaces, crateSpots, fruitSpots, gemPosition, checkpoints,
  pathTop, PATH_HALF_WIDTH, Z_START, Z_END
} from './level.js';
import { createUI } from './ui.js';

// Renderer and scene
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const SKY = 0x7fd3f0;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 45, 170);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 500);

scene.add(new THREE.HemisphereLight(0xfff1c9, 0x3d7a4a, 2.1));
const sun = new THREE.DirectionalLight(0xfff0d0, 2.8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);

const { palms, lava } = buildLevel(scene);

// Crates
const factory = createCrateFactory(scene);
const crates = crateSpots.map(s => factory.make(s, s.base ?? pathTop(s.z)));

// Fruit
const fruitGeo = new THREE.SphereGeometry(0.28, 10, 8);
const fruitMat = mat(0xff7a2f, { roughness: 0.4, emissive: 0x7a2a00, emissiveIntensity: 0.35 });
const fruitLeafGeo = new THREE.ConeGeometry(0.1, 0.22, 5);
const fruitLeafMat = mat(0x3bb36a);
const fruits = fruitSpots().map((pos, i) => {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(fruitGeo, fruitMat);
  ball.scale.set(1, 0.85, 1);
  ball.castShadow = true;
  const leaf = new THREE.Mesh(fruitLeafGeo, fruitLeafMat);
  leaf.position.y = 0.3;
  g.add(ball, leaf);
  g.position.copy(pos);
  g.userData = { base: pos.clone(), phase: i * 0.7, taken: false, pop: 0 };
  scene.add(g);
  return g;
});

// Gem at the end
const gem = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.7, 0),
  mat(0x7fd3ff, { emissive: 0x2a7bff, emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.2 })
);
gem.castShadow = true;
gem.position.copy(gemPosition);
scene.add(gem);

// Player
const pip = createPip();
scene.add(pip.root);

const STEP = 0.35, RADIUS = 0.4, SPEED = 7.5, JUMP = 10, GRAVITY = 25;
const SPIN_TIME = 0.45, SPIN_COOLDOWN = 0.2, SPIN_REACH = 1.6;

const state = {
  started: false, paused: false, done: false,
  pos: checkpoints[0].clone(), vy: 0, onGround: true,
  facing: Math.PI, walk: 0,
  spin: 0, spinCooldown: 0,
  knock: new THREE.Vector2(),
  checkpoint: 0, shake: 0,
  fruit: 0, cratesBroken: 0, opened: new Set(), startTime: 0
};

// Input
const keys = {};
let jumpQueued = false, spinQueued = false;
window.addEventListener('keydown', e => {
  if (e.target.closest?.('button, a')) return;
  keys[e.code] = true;
  if (e.code === 'Space' && !e.repeat) jumpQueued = true;
  if (['ShiftLeft', 'ShiftRight', 'KeyK', 'KeyX'].includes(e.code) && !e.repeat) spinQueued = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

const ui = createUI({
  onStart: () => { state.started = true; state.startTime = performance.now(); },
  onPause: paused => { state.paused = paused; for (const k in keys) keys[k] = false; },
  onJump: () => { jumpQueued = true; },
  onSpin: () => { spinQueued = true; },
  onRestart: () => location.reload()
});

// Collision helpers
const overlapsBox = (x, z, r, s) => x + r > s.x0 && x - r < s.x1 && z + r > s.z0 && z - r < s.z1;

function blocked(x, z, y) {
  for (const s of surfaces) {
    if (s.top > y + STEP && overlapsBox(x, z, RADIUS, s)) return true;
  }
  for (const c of crates) {
    if (c.broken || y >= c.top - 0.3 || y + 1.4 <= c.base) continue;
    if (Math.abs(x - c.x) < 0.5 + RADIUS && Math.abs(z - c.z) < 0.5 + RADIUS) return true;
  }
  return false;
}

// Highest surface under (x, z) that Pip could be standing on, coming from fromY
function groundAt(x, z, fromY) {
  let g = -Infinity;
  for (const s of surfaces) {
    if (s.top <= fromY + STEP && overlapsBox(x, z, 0, s)) g = Math.max(g, s.top);
  }
  return g;
}

// Crates
function onCrateGone(c) {
  state.cratesBroken++;
  ui.setCrates(state.cratesBroken, crates.length);
  if (c.content) {
    state.opened.add(c.content);
    ui.showCard(c.content);
  }
}

function breakCrate(c) {
  factory.smash(c);
  onCrateGone(c);
}

function explodeTnt(c) {
  if (c.broken) return;
  factory.explode(c);
  onCrateGone(c);
  if (!ui.reduceMotion) state.shake = 0.45;
  // Knock Pip back if caught in the blast
  const dx = state.pos.x - c.x, dz = state.pos.z - c.z, d = Math.hypot(dx, dz);
  if (d < TNT_RADIUS && Math.abs(state.pos.y - c.base) < 2.5) {
    const k = (1 - d / TNT_RADIUS) * 14 + 4;
    state.knock.set(dx / (d || 1), dz / (d || 1)).multiplyScalar(k);
    state.vy = 9; state.onGround = false;
  }
  // Chain reaction for crates close by
  crates.forEach(o => {
    if (o.broken) return;
    if (Math.hypot(o.x - c.x, o.z - c.z) < TNT_RADIUS * 0.6 && Math.abs(o.base - c.base) < 1.5) {
      o.type === 'tnt' ? explodeTnt(o) : breakCrate(o);
    }
  });
}

function hitCrate(c, bySpin) {
  if (c.type !== 'tnt') breakCrate(c);
  else if (bySpin) explodeTnt(c);
  else factory.lightFuse(c);
}

function respawn() {
  state.pos.copy(checkpoints[state.checkpoint]);
  state.vy = 0; state.knock.set(0, 0);
  state.facing = Math.PI;
  ui.flash();
}

function finish() {
  state.done = true;
  ui.showFinish({
    secs: Math.round((performance.now() - state.startTime) / 1000),
    fruit: state.fruit, fruitTotal: fruits.length,
    crates: state.cratesBroken, crateTotal: crates.length
  });
}

// Movement
const center = new THREE.Vector3();

function movePlayer(dt) {
  const p = state.pos;
  let ix = 0, iz = 0;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (keys.KeyW || keys.ArrowUp) iz -= 1;
  if (keys.KeyS || keys.ArrowDown) iz += 1;
  ix += ui.joy.x; iz += ui.joy.y;
  const mag = Math.min(1, Math.hypot(ix, iz));
  let vx = 0, vz = 0;
  if (mag > 0.1) {
    const n = Math.hypot(ix, iz);
    vx = (ix / n) * SPEED * mag;
    vz = (iz / n) * SPEED * mag;
    let diff = Math.atan2(vx, vz) - state.facing;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    state.facing += diff * Math.min(1, dt * 14);
  }
  vx += state.knock.x; vz += state.knock.y;
  state.knock.multiplyScalar(Math.exp(-dt * 5));

  // One axis at a time so walls slide instead of stick
  const nx = THREE.MathUtils.clamp(p.x + vx * dt, -PATH_HALF_WIDTH, PATH_HALF_WIDTH);
  if (!blocked(nx, p.z, p.y)) p.x = nx;
  const nz = THREE.MathUtils.clamp(p.z + vz * dt, Z_END, Z_START);
  if (!blocked(p.x, nz, p.y)) p.z = nz;

  if (jumpQueued && state.onGround) { state.vy = JUMP; state.onGround = false; }
  jumpQueued = false;
  if (spinQueued && state.spin <= 0 && state.spinCooldown <= 0) state.spin = SPIN_TIME;
  spinQueued = false;

  const prevY = p.y;
  state.vy -= GRAVITY * dt;
  p.y += state.vy * dt;

  // Landing on a crate breaks it and bounces Pip; holding jump bounces higher
  if (state.vy < 0) {
    for (const c of crates) {
      if (c.broken) continue;
      if (Math.abs(p.x - c.x) < 0.75 && Math.abs(p.z - c.z) < 0.75 && prevY >= c.top - 0.05 && p.y <= c.top) {
        p.y = c.top;
        state.vy = keys.Space ? 11 : 8;
        hitCrate(c, false);
        break;
      }
    }
  }

  const g = groundAt(p.x, p.z, prevY);
  if (p.y <= g) { p.y = g; state.vy = 0; state.onGround = true; }
  else state.onGround = false;

  if (p.y < -8) { respawn(); return; }

  if (state.onGround) {
    for (let i = state.checkpoint + 1; i < checkpoints.length; i++) {
      if (p.z < checkpoints[i].z) state.checkpoint = i;
    }
  }

  // Spin attack breaks everything in reach
  if (state.spin > 0) {
    state.spin -= dt;
    if (state.spin <= 0) state.spinCooldown = SPIN_COOLDOWN;
    for (const c of crates) {
      if (c.broken) continue;
      if (Math.hypot(p.x - c.x, p.z - c.z) < SPIN_REACH && Math.abs(p.y + 0.7 - (c.base + 0.5)) < 1.3) hitCrate(c, true);
    }
  } else if (state.spinCooldown > 0) state.spinCooldown -= dt;

  center.set(p.x, p.y + 0.8, p.z);
  for (const f of fruits) {
    if (f.userData.taken || f.position.distanceTo(center) > 1.1) continue;
    f.userData.taken = true;
    state.fruit++;
    ui.setFruit(state.fruit);
  }

  if (gem.position.distanceTo(center) < 1.4) finish();

  animatePip(dt, mag > 0.1 && state.onGround);
}

function animatePip(dt, moving) {
  pip.root.position.copy(state.pos);
  pip.root.rotation.y = state.facing;
  state.walk += moving ? dt * 15 : 0;
  pip.body.position.y = moving && !ui.reduceMotion ? Math.abs(Math.sin(state.walk)) * 0.13 : 0;
  const stretch = state.onGround ? 1 : 1.08;
  pip.body.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
  pip.feet[0].position.z = 0.08 + (moving ? Math.sin(state.walk) * 0.22 : 0);
  pip.feet[1].position.z = 0.08 - (moving ? Math.sin(state.walk) * 0.22 : 0);
  if (state.spin > 0) {
    const k = 1 - state.spin / SPIN_TIME;
    pip.body.rotation.y = k * Math.PI * 4;
    pip.swirl.material.opacity = 0.55 * Math.sin(k * Math.PI);
    pip.swirl.scale.setScalar(0.7 + k * 0.5);
  } else {
    pip.body.rotation.y = 0;
    pip.swirl.material.opacity = 0;
  }
}

// Resize
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Narrow screens need a wider view to see the path ahead
  camera.fov = w / h < 0.8 ? 72 : 58;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// Loop
const clock = new THREE.Clock();
const camPos = new THREE.Vector3(0, 3.2, 9.5), camLook = new THREE.Vector3(0, 1.2, -4);
const wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();

function update(dt, t) {
  palms.forEach(p => { p.crown.rotation.z = Math.sin(t * 1.2 + p.phase) * 0.05; });
  lava.material.emissiveIntensity = 0.75 + Math.sin(t * 3) * 0.2;
  gem.rotation.y = t * 1.5;
  gem.position.y = gemPosition.y + Math.sin(t * 2) * 0.15;

  fruits.forEach(f => {
    const u = f.userData;
    if (u.taken) {
      if (!f.visible) return;
      u.pop += dt * 5;
      f.position.y += dt * 5;
      f.scale.setScalar(Math.max(0, 1 - u.pop));
      if (u.pop >= 1) f.visible = false;
      return;
    }
    f.rotation.y = t * 2.5 + u.phase;
    f.position.y = u.base.y + Math.sin(t * 3 + u.phase) * 0.1;
  });

  if (state.started && !state.paused && !state.done) movePlayer(dt);
  else animatePip(dt, false);

  if (!state.paused) for (const c of factory.update(dt, crates)) explodeTnt(c);

  // Camera sits behind and above Pip, looking down the path
  const p = state.pos;
  if (state.started) {
    wantPos.set(p.x * 0.55, p.y + 4.4, p.z + 8.2);
    wantLook.set(p.x * 0.75, p.y + 1.1, p.z - 4.5);
  } else {
    wantPos.set(Math.sin(t * 0.25) * 2.5, 3.2, 9.5);
    wantLook.set(0, 1.2, -4);
  }
  const k = 1 - Math.exp(-dt * 6);
  camPos.lerp(wantPos, k);
  camLook.lerp(wantLook, k);
  camera.position.copy(camPos);
  if (state.shake > 0) {
    state.shake -= dt;
    const s = state.shake * 0.6;
    camera.position.x += (Math.random() - 0.5) * s;
    camera.position.y += (Math.random() - 0.5) * s;
  }
  camera.lookAt(camLook);

  // Keep the shadow box around Pip
  sun.position.set(p.x + 14, p.y + 26, p.z + 6);
  sun.target.position.set(p.x, p.y, p.z - 6);
}

function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt, clock.elapsedTime);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
ui.setCrates(0, crates.length);
// Dev-only hook for stepping the simulation from the console
if (import.meta.env.DEV) window.__game = { state, crates, step: (dt = 1 / 60) => update(dt, clock.elapsedTime) };
loop();
