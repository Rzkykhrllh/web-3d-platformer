import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { toon } from '../render/toon.js';
import { publicUrl } from '../util.js';

// The tabby cat as a rigged model (generated from the reference art, rigged in
// Mixamo; see public/models/cat.glb). Same interface as the procedural
// characters, plus `animated: true` and update(dt, playerState), which picks
// and blends the animation clips. Faces +z with its feet at y = 0.

export const CAT_MODEL_URL = publicUrl('models/cat.glb');
const HEIGHT = 1.95; // ear tip to sole, about the same as the procedural cat

const FPS = 30;

// Pin the hips' translation to the first frame: x/z always (the game moves the
// body, so the clip mustn't drift it), y too when `all` (the jump clip lifts
// the hips, which would stack on top of the physics jump)
function pinHips(clip, all = false) {
  for (const track of clip.tracks) {
    if (!track.name.endsWith('Hips.position')) continue;
    const v = track.values, [x, y, z] = v;
    for (let i = 0; i < v.length; i += 3) { v[i] = x; v[i + 2] = z; if (all) v[i + 1] = y; }
  }
  return clip;
}
const cut = (clip, name, from, to) => THREE.AnimationUtils.subclip(clip, name, Math.round(from * FPS), Math.round(to * FPS), FPS);

// Mixamo clips cut down to what the game needs. Times are in seconds of the
// original clip, read off the hip and foot heights.
function gameClips(animations) {
  const src = Object.fromEntries(animations.map(c => [c.name, c]));
  const out = {};
  for (const name of ['idle', 'walk', 'run', 'victory']) if (src[name]) out[name] = pinHips(src[name]);
  if (src.jump) {
    out.jump = pinHips(cut(src.jump, 'jump', 0.5, 0.8), true);  // take-off to the top
    out.fall = pinHips(cut(src.jump, 'fall', 0.85, 1.0), true); // legs reaching down
  }
  // Spin: a held pose while player.js does the turning. The T-pose (arms
  // straight out, like Crash) if the model has it, else the arms-out frame of
  // the melee clip
  if (src.tpose) out.spin = pinHips(cut(src.tpose, 'spin', 0, 0.07));
  else if (src.spin) out.spin = pinHips(cut(src.spin, 'spin', 1.1, 1.17));
  if (src.hurt) out.hurt = pinHips(cut(src.hurt, 'hurt', 0.4, 1.6));
  return out;
}

let loading = null;
export function loadCatModel(url = CAT_MODEL_URL) {
  if (!loading) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loading = loader.loadAsync(url).then(gltf => ({ scene: gltf.scene, clips: gameClips(gltf.animations) }));
  }
  return loading;
}

// Dark back-face shell pushed out along the normals, so the skinned mesh gets
// the same cartoon outline as the crates
function outlineFor(mesh, thickness) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x1e1e22, side: THREE.BackSide });
  mat.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <skinning_vertex>',
      `#include <skinning_vertex>\n transformed += normalize(objectNormal) * ${thickness.toFixed(5)};`);
  };
  const hull = new THREE.SkinnedMesh(mesh.geometry, mat);
  hull.bind(mesh.skeleton, mesh.bindMatrix);
  hull.position.copy(mesh.position); hull.quaternion.copy(mesh.quaternion); hull.scale.copy(mesh.scale);
  hull.frustumCulled = false;
  return hull;
}

// `model` is what loadCatModel resolves to
export function createCatModel(model) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const scene = cloneSkinned(model.scene);
  const fit = new THREE.Group();
  fit.add(scene);
  body.add(fit);

  // Scale to HEIGHT with the soles on y = 0
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const k = HEIGHT / (box.max.y - box.min.y);
  fit.scale.setScalar(k);
  fit.position.y = -box.min.y * k;

  const meshes = [];
  scene.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
  for (const m of meshes) {
    m.material = toon({ map: m.material.map });
    m.castShadow = true;
    m.frustumCulled = false; // the bind-pose bounds don't follow the animation
    m.parent.add(outlineFor(m, 0.012 / k));
  }

  // Animation: one action per clip, blended when the state changes
  const mixer = new THREE.AnimationMixer(scene);
  const clips = model.clips;
  const actions = {};
  for (const [name, clip] of Object.entries(clips)) actions[name] = mixer.clipAction(clip);
  for (const name of ['jump', 'fall', 'hurt', 'spin']) {
    if (!actions[name]) continue;
    actions[name].setLoop(THREE.LoopOnce);
    actions[name].clampWhenFinished = true;
  }
  let current = null, override = null;

  function play(name, fade = 0.12) {
    const next = actions[name] ?? actions.idle;
    if (!next || next === current) return next;
    next.reset().setEffectiveWeight(1).fadeIn(fade).play();
    current?.fadeOut(fade);
    current = next;
    return next;
  }

  // Which clip the player's state calls for
  function pick(s) {
    if (override) return override;
    if (s.spin > 0) return 'spin';
    if (s.state === 'hurt') return 'hurt';
    if (!s.onGround) return s.vel.y > 0 ? 'jump' : 'fall';
    const speed = Math.hypot(s.vel.x, s.vel.z);
    if (speed > 4.5) return 'run';
    if (speed > 0.6) return 'walk';
    return 'idle';
  }

  // Spin effect, same as the procedural characters
  const swirl = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.07, 6, 28),
    new THREE.MeshBasicMaterial({ color: 0xfff3d1, transparent: true, opacity: 0 })
  );
  swirl.rotation.x = Math.PI / 2;
  swirl.position.y = 0.8;
  root.add(swirl);

  // player.js moves the feet for the procedural walk; here they are just placeholders
  const feet = [new THREE.Group(), new THREE.Group()];

  return {
    root, body, feet, swirl, animated: true, clips: Object.keys(clips), mixer, actions,
    play(name) { override = name; play(name, 0.25); },
    clearOverride() { override = null; },
    update(dt, s) {
      const name = pick(s);
      const action = play(name, name === 'spin' ? 0.05 : 0.12);
      const speed = Math.hypot(s.vel.x, s.vel.z);
      // Match the clip speeds to the game: feet to the ground speed, the
      // flinch to its (much shorter) timer in player.js
      action.timeScale = { run: Math.max(0.6, speed / 8) * 1.1, walk: Math.max(0.5, speed / 2.5), hurt: 1.6 }[name] ?? 1;
      mixer.update(dt);
    }
  };
}
