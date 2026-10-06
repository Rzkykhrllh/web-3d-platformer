import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Loads a level built in Blender and exported as glTF (.glb / .gltf).
// Objects are recognised by name prefix (Blender's ".001" suffixes are ignored);
// settings come from custom properties, which Blender exports as glTF "extras".
//
//   COL_*          invisible collider: its bounding box becomes a walkable block
//   WALK_*         visible mesh that is also a walkable block
//   CRATE_<type>   crate standing on this point (basic, bonus, tnt, bounce,
//                  checkpoint, activator, metal). Props: content, ghost
//   FRUIT*         a fruit at this point
//   ENEMY*         a crab patrolling around this point. Props: range, speed
//   MOVER*         moving platform (mesh). Props: axis ("x", "y" or "z"), range, speed
//   CRUMBLE*       crumbling platform (mesh)
//   SPAWN          where Pip starts
//   CHECKPOINT*    extra respawn points
//   GEM            the finish
//   BOUNDS         invisible box Pip can't leave
//
// Everything else is scenery and gets shadows switched on.

// Blender numbers duplicates "CRATE_basic.001"; three's loader strips the dot
// ("CRATE_basic001"), so drop a trailing number either way
const baseName = name => name.replace(/[._]?\d+$/, '');
const prefix = (name, p) => baseName(name).toUpperCase().startsWith(p);

export async function loadGltfLevel(url, scene, onProgress) {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);

  const gltf = await new Promise((resolve, reject) => loader.load(url, resolve, e => {
    if (e.total) onProgress?.(e.loaded / e.total);
  }, reject));
  draco.dispose();

  const root = gltf.scene;
  scene.add(root);
  root.updateMatrixWorld(true);

  const level = {
    source: url,
    surfaces: [], crumblers: [], movers: [], crateSpots: [], enemySpots: [],
    fruitSpots: [], checkpoints: [], gemPosition: null, bounds: null,
    animations: gltf.animations
  };
  const box = new THREE.Box3(), pos = new THREE.Vector3();
  const toBox = obj => { box.setFromObject(obj); return { x0: box.min.x, x1: box.max.x, z0: box.min.z, z1: box.max.z, top: box.max.y, bottom: box.min.y }; };
  const remove = [];
  const detach = [];

  root.traverse(obj => {
    const name = obj.name || '';
    const props = obj.userData || {};
    obj.getWorldPosition(pos);

    if (prefix(name, 'COL_')) { level.surfaces.push(toBox(obj)); remove.push(obj); }
    else if (prefix(name, 'WALK_')) { level.surfaces.push(toBox(obj)); }
    else if (prefix(name, 'CRATE_')) {
      const type = baseName(name).slice(6).toLowerCase() || 'basic';
      level.crateSpots.push({ x: pos.x, z: pos.z, base: pos.y, type, content: props.content || null, ghost: !!props.ghost });
      remove.push(obj);
    }
    else if (prefix(name, 'FRUIT')) { level.fruitSpots.push(pos.clone()); remove.push(obj); }
    else if (prefix(name, 'ENEMY')) {
      const r = props.range ?? 3;
      level.enemySpots.push({ x0: pos.x - r, x1: pos.x + r, z: pos.z, y: pos.y, speed: props.speed ?? 2.2 });
      remove.push(obj);
    }
    else if (prefix(name, 'MOVER')) { level.movers.push({ ...toBox(obj), axis: props.axis ?? 'x', range: props.range ?? 2.5, speed: props.speed ?? 0.8, mesh: obj }); detach.push(obj); }
    else if (prefix(name, 'CRUMBLE')) { level.crumblers.push({ ...toBox(obj), mesh: obj }); detach.push(obj); }
    else if (prefix(name, 'SPAWN')) { level.checkpoints.unshift(pos.clone()); remove.push(obj); }
    else if (prefix(name, 'CHECKPOINT')) { level.checkpoints.push(pos.clone()); remove.push(obj); }
    else if (prefix(name, 'GEM')) { level.gemPosition = pos.clone(); remove.push(obj); }
    else if (prefix(name, 'BOUNDS')) { const b = toBox(obj); level.bounds = { xMin: b.x0, xMax: b.x1, zMin: b.z0, zMax: b.z1 }; remove.push(obj); }
    else if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; }
  });

  // Moving pieces need world-space transforms they can update directly
  for (const obj of detach) { scene.attach(obj); obj.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); }
  for (const obj of remove) obj.parent?.remove(obj);

  if (!level.checkpoints.length) level.checkpoints.push(new THREE.Vector3(0, 0, 0));
  if (!level.gemPosition) throw new Error(`Level ${url} has no GEM object`);

  // Menu fly-through goes from spawn to gem; height follows a straight line between them
  const start = level.checkpoints[0], end = level.gemPosition;
  level.path = {
    start: start.z + 2, end: end.z + 6,
    heightAt: z => THREE.MathUtils.lerp(start.y, end.y - 1.5, THREE.MathUtils.clamp((z - start.z) / (end.z - start.z || 1), 0, 1))
  };
  level.pathTop = z => level.path.heightAt(z);
  level.bounds ??= { xMin: -Infinity, xMax: Infinity, zMin: -Infinity, zMax: Infinity };

  return level;
}
