import * as THREE from 'three';
import { toon } from './render/toon.js';

// The level's big pickups, as in Crash:
//  crystal  pink power crystal, always out in the open
//  gem      green gem, locked (see-through) until every crate is broken
//  exit     warp pad that ends the level

function outlined(geo, material, outline = 0.07) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(geo, material);
  body.castShadow = true;
  const hull = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x2a0f2a, side: THREE.BackSide }));
  hull.scale.setScalar(1 + outline);
  g.add(body, hull);
  return { group: g, body, hull };
}

function crystalModel() {
  const mat = toon({ color: 0xff5fd2, emissive: 0xd0209a, emissiveIntensity: 0.55, flatShading: true });
  const root = new THREE.Group();
  // One tall shard with two small ones leaning off it
  [[0, 0, 0, 1, 0], [0.32, -0.35, 0.05, 0.45, -0.5], [-0.3, -0.38, -0.05, 0.4, 0.55]].forEach(([x, y, z, s, lean]) => {
    const geo = new THREE.OctahedronGeometry(0.42, 0);
    geo.scale(0.8, 1.9, 0.8);
    const { group } = outlined(geo, mat);
    group.position.set(x, y, z);
    group.scale.setScalar(s);
    group.rotation.z = lean;
    root.add(group);
  });
  return root;
}

function gemModel() {
  // Cut-gem profile spun around y: point at the bottom, flat table on top
  const geo = new THREE.LatheGeometry([
    new THREE.Vector2(0, -0.75), new THREE.Vector2(0.78, 0.05), new THREE.Vector2(0.55, 0.38), new THREE.Vector2(0, 0.38)
  ], 8);
  geo.computeVertexNormals();
  const solid = toon({ color: 0x3fe07a, emissive: 0x16a24a, emissiveIntensity: 0.6, flatShading: true });
  const locked = new THREE.MeshBasicMaterial({ color: 0x5fd68a, transparent: true, opacity: 0.7, depthWrite: false });
  const { group, body, hull } = outlined(geo, locked);
  hull.visible = false;
  return { root: group, body, hull, solid, locked };
}

function exitModel() {
  const root = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.5, 0.14, 28), toon({ color: 0x8c8174 }));
  base.position.y = 0.07;
  base.receiveShadow = true;
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 1.6, 2), toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.08, 8, 40), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.16;
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x8fe8ff, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.05, 3.2, 28, 1, true), beamMat);
  beam.position.y = 1.75;
  root.add(base, ring, beam);
  return { root, ring, beam };
}

// level.crystalPosition and level.exitPosition are optional
export function createCollectibles(scene, level) {
  const crystal = level.crystalPosition ? { root: crystalModel(), home: level.crystalPosition.clone(), taken: false } : null;
  if (crystal) { crystal.root.position.copy(crystal.home); scene.add(crystal.root); }

  const gem = { ...gemModel(), home: level.gemPosition.clone(), open: false, taken: false };
  gem.root.position.copy(gem.home);
  scene.add(gem.root);

  const exitAt = (level.exitPosition ?? level.gemPosition).clone();
  if (!level.exitPosition) exitAt.y -= 1.5; // older levels: pad under where the gem floats
  const exit = { ...exitModel(), at: exitAt };
  exit.root.position.copy(exitAt);
  scene.add(exit.root);

  return {
    crystal, gem, exit,
    openGem() {
      gem.open = true;
      gem.body.material = gem.solid;
      gem.hull.visible = true;
    },
    update(t) {
      if (crystal && !crystal.taken) {
        crystal.root.position.y = crystal.home.y + Math.sin(t * 2.2) * 0.18;
        crystal.root.rotation.y = t * 1.6;
      }
      if (!gem.taken) {
        gem.root.position.y = gem.home.y + Math.sin(t * 2) * 0.15;
        gem.root.rotation.y = t * (gem.open ? 1.5 : 0.5);
      }
      exit.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
      exit.beam.material.opacity = 0.14 + Math.sin(t * 4) * 0.05;
    }
  };
}
