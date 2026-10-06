import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCat } from './characters/cat.js';
import { loadCatModel, createCatModel } from './characters/cat-model.js';
import { createPip } from './pip.js';

// Dev-only page (/character.html) for comparing a character against its reference art.
// Drag to orbit; buttons snap to front / side / back and toggle a run cycle.

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe9e9e6);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
camera.position.set(0, 1.1, 5.2);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.95, 0);
controls.update();

scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(2, 4, 3);
key.castShadow = true;
scene.add(key);
const floor = new THREE.Mesh(new THREE.CircleGeometry(2, 40), new THREE.ShadowMaterial({ opacity: 0.18 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const makers = { model: async () => createCatModel(await loadCatModel()), cat: createCat, pip: createPip };
let model = null, anim = 'idle', spin = false, walk = 0;
async function show(name) {
  const next = await makers[name]();
  if (model) scene.remove(model.root);
  model = next;
  scene.add(model.root);
}
show(new URLSearchParams(location.search).get('char') || 'model');
// Fake player state for the rigged model's clip picker
const fake = { spin: 0, state: 'idle', onGround: true, vel: new THREE.Vector3() };

const views = { front: 0, side: Math.PI / 2, back: Math.PI };
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
  spin = b.dataset.view === 'spin';
  if (!spin) {
    const a = views[b.dataset.view], r = 5.2;
    camera.position.set(Math.sin(a) * r, 1.1, Math.cos(a) * r);
    controls.update();
  }
}));
document.querySelectorAll('[data-anim]').forEach(b => b.addEventListener('click', () => { anim = b.dataset.anim; }));
document.querySelectorAll('[data-char]').forEach(b => b.addEventListener('click', () => show(b.dataset.char)));

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  if (!model) return;
  if (spin) model.root.rotation.y += dt * 0.8;
  const running = anim === 'run';
  if (model.animated) {
    fake.vel.z = running ? 8 : 0;
    model.update(dt, fake);
    renderer.render(scene, camera);
    return;
  }
  // Same run cycle as player.js
  walk += running ? dt * 17 : 0;
  model.body.position.y = running ? Math.abs(Math.sin(walk)) * 0.12 : Math.sin(clock.elapsedTime * 2) * 0.01;
  model.body.rotation.x = running ? 0.15 : 0;
  const stride = running ? Math.sin(walk) * 0.25 : 0;
  model.feet[0].position.z = 0.08 + stride;
  model.feet[1].position.z = 0.08 - stride;
  if (model.arms) {
    const swing = running ? Math.sin(walk) * 0.7 : 0;
    model.arms[0].rotation.x = -swing;
    model.arms[1].rotation.x = swing;
  }
  renderer.render(scene, camera);
});

// Lets the browser automation grab a frame even when the tab is throttled
window.__viewer = { render: () => renderer.render(scene, camera), camera, controls, get model() { return model; } };
