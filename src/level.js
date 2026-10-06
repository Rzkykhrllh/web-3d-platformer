import * as THREE from 'three';
import { mat, mesh, seededRandom } from './util.js';

// The level runs from z = +6 toward -z, away from the camera.
// Every walkable surface is an axis-aligned box with a flat top.
export const PATH_HALF_WIDTH = 4.4;
export const Z_START = 4;
export const Z_END = -144;

export const surfaces = [
  { name: 'beach',    x0: -4.5, x1: 4.5, z0: -60,   z1: 22,    top: 0 },
  { name: 'pillar1',  x0: -1.6, x1: 1.6, z0: -66.5, z1: -61.5, top: 0.5, stone: true },
  { name: 'pillar2',  x0: -1.6, x1: 1.6, z0: -73,   z1: -68.5, top: 1.2, stone: true },
  { name: 'jungle',   x0: -4.5, x1: 4.5, z0: -100,  z1: -75,   top: 0 },
  { name: 'ruins',    x0: -4.5, x1: 4.5, z0: -146,  z1: -100,  top: 1 },
  { name: 'pedestal', x0: -1.4, x1: 1.4, z0: -139,  z1: -135,  top: 1.6, stone: true }
];

// Height of the main path at a given z, ignoring pillars and the pedestal
export const pathTop = z => (z < -100 ? 1 : 0);

// Crates. `content` is an id from content.js; `level` stacks crates.
export const crateSpots = [
  { x: 0,    z: -9,   type: 'bonus', content: 'about' },
  { x: -2,   z: -17,  type: 'basic' },
  { x: 2,    z: -17,  type: 'basic' },
  { x: -1.5, z: -25,  type: 'basic', content: 'project-mtls' },
  { x: 2.2,  z: -36,  type: 'basic', content: 'project-rbac' },
  { x: -2.2, z: -36,  type: 'basic' },
  { x: 0,    z: -48,  type: 'basic' },
  { x: 0,    z: -48,  type: 'basic', level: 1 },
  { x: 0,    z: -72,  type: 'basic', content: 'skills', base: 1.2 },
  { x: -2,   z: -82,  type: 'basic', content: 'project-anomaly' },
  { x: 2,    z: -88,  type: 'basic' },
  { x: 2,    z: -88,  type: 'basic', level: 1 },
  { x: 0,    z: -110, type: 'bonus', content: 'project-island' },
  { x: 0,    z: -120, type: 'tnt',   content: 'contact' },
  { x: -2.5, z: -129, type: 'basic' },
  { x: 2.5,  z: -129, type: 'basic' }
];

export const gemPosition = new THREE.Vector3(0, 3.1, -137);

// Respawn points, reached in order as the player runs forward
export const checkpoints = [
  new THREE.Vector3(0, 0, 2),
  new THREE.Vector3(0, 0, -57),
  new THREE.Vector3(0, 0, -77),
  new THREE.Vector3(0, 1, -103)
];

export function fruitSpots() {
  const spots = [];
  const line = (x, z0, z1, n) => {
    for (let i = 0; i < n; i++) {
      const z = z0 + (z1 - z0) * (i / (n - 1));
      spots.push(new THREE.Vector3(x, pathTop(z) + 0.9, z));
    }
  };
  line(0, -1, -5, 3);
  line(0, -20, -22, 2);
  line(-2.5, -28, -33, 4);
  line(2.5, -40, -45, 4);
  line(0, -52, -58, 4);
  // Arc over the gap, following a jump
  [[-61, 2.2], [-63.5, 2.6], [-67.5, 3.0], [-70, 3.2], [-74, 2.6]].forEach(([z, y]) => spots.push(new THREE.Vector3(0, y, z)));
  line(1.5, -78, -80, 3);
  line(-2.5, -91, -97, 4);
  line(0, -103, -107, 3);
  line(-2.5, -113, -118, 4);
  line(2.5, -113, -118, 4);
  line(0, -125, -131, 4);
  return spots;
}

export function buildLevel(scene) {
  const rand = seededRandom(11);

  // Sea under everything, visible in the gap
  const sea = mesh(new THREE.PlaneGeometry(600, 600), mat(0x1fa2c4, { roughness: 0.35, metalness: 0.1 }), false, true);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -2.5;
  scene.add(sea);

  // Walkable surfaces
  const sandMat = mat(0xe3b46c), dirtMat = mat(0xc99a5b), stoneMat = mat(0x8c7b6b), mossMat = mat(0x3f9a52);
  surfaces.forEach(s => {
    const h = s.top + 6, w = s.x1 - s.x0, d = s.z1 - s.z0;
    const m = mesh(new THREE.BoxGeometry(w, h, d), s.stone ? stoneMat : s.name === 'ruins' ? dirtMat : sandMat);
    m.position.set((s.x0 + s.x1) / 2, s.top - h / 2, (s.z0 + s.z1) / 2);
    scene.add(m);
    if (s.stone) {
      const cap = mesh(new THREE.BoxGeometry(w + 0.1, 0.2, d + 0.1), mossMat);
      cap.position.set(m.position.x, s.top - 0.05, m.position.z);
      scene.add(cap);
    }
  });

  // Jungle banks on both sides form the walls of the path
  const grassMat = mat(0x4caf50), grassDark = mat(0x3d9445);
  [[22, -60, 0], [-60, -75, 0], [-75, -100, 0], [-100, -150, 1]].forEach(([z1, z0, base]) => {
    [-1, 1].forEach(side => {
      const top = base + 1.4, h = top + 6, d = z1 - z0;
      const bank = mesh(new THREE.BoxGeometry(18, h, d), side < 0 ? grassMat : grassDark);
      bank.position.set(side * (4.5 + 9), top - h / 2, (z0 + z1) / 2);
      scene.add(bank);
    });
  });
  // Back wall behind the start, and the far end
  const backWall = mesh(new THREE.BoxGeometry(46, 8, 2), grassMat);
  backWall.position.set(0, -2.6, 23);
  scene.add(backWall);

  // Decor
  const trunkMat = mat(0x9c6b3a), leafMats = [mat(0x2e9e5b), mat(0x3bb36a), mat(0x24804a)];
  const leafGeo = new THREE.BoxGeometry(0.55, 0.08, 3.2);
  leafGeo.translate(0, 0, 1.6);
  const palms = [];
  const bankTop = z => (z < -100 ? 2.4 : 1.4);
  for (let z = 20; z > -146; z -= 3.2) {
    [-1, 1].forEach(side => {
      if (rand() < 0.25) return;
      const x = side * (6 + rand() * 8), pz = z + (rand() - 0.5) * 2;
      const palm = new THREE.Group();
      const segs = 6 + Math.floor(rand() * 4);
      const lean = (rand() - 0.5) * 0.12 - side * 0.05;
      let px = 0, py = 0;
      for (let i = 0; i < segs; i++) {
        const seg = mesh(new THREE.CylinderGeometry(0.26, 0.34, 1.15, 7), trunkMat);
        px += lean * i * 0.35;
        seg.position.set(px, py + 0.55, 0);
        seg.rotation.z = -lean * i * 0.25;
        palm.add(seg);
        py += 1.05;
      }
      const crown = new THREE.Group();
      crown.position.set(px, py + 0.2, 0);
      for (let i = 0; i < 7; i++) {
        const leaf = mesh(leafGeo, leafMats[i % 3]);
        leaf.rotation.y = (i / 7) * Math.PI * 2 + rand() * 0.3;
        leaf.rotation.x = 0.45 + rand() * 0.25;
        crown.add(leaf);
      }
      palm.add(crown);
      palm.position.set(x, bankTop(pz), pz);
      scene.add(palm);
      palms.push({ crown, phase: rand() * 6 });
    });
  }

  // Bushes along the path edge
  for (let z = 21; z > -146; z -= 1.6) {
    [-1, 1].forEach(side => {
      if (rand() < 0.3) return;
      const s = 0.6 + rand() * 0.7;
      const bush = mesh(new THREE.IcosahedronGeometry(s, 0), leafMats[Math.floor(rand() * 3)]);
      bush.position.set(side * (4.9 + rand() * 1.2), bankTop(z) + s * 0.35, z + rand());
      bush.scale.y = 0.75;
      scene.add(bush);
    });
  }

  // Stone arches over the path
  [[-30, 0], [-93, 0], [-126, 1]].forEach(([z, base]) => {
    [-1, 1].forEach(side => {
      const pillar = mesh(new THREE.BoxGeometry(1.2, 6.2, 1.2), stoneMat);
      pillar.position.set(side * 5.3, base + 3.1, z);
      scene.add(pillar);
    });
    const lintel = mesh(new THREE.BoxGeometry(12.4, 1, 1.6), stoneMat);
    lintel.position.set(0, base + 6.6, z);
    scene.add(lintel);
    const moss = mesh(new THREE.BoxGeometry(12.6, 0.25, 1.7), mossMat);
    moss.position.set(0, base + 7.15, z);
    scene.add(moss);
  });

  // Tiki totems at the start
  const totemColors = [0x8b4a24, 0xa8622f, 0x6b3a1c];
  [[-6, -3], [6, -3]].forEach(([x, z], ti) => {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const block = mesh(new THREE.BoxGeometry(1.5, 1.3, 1.5), mat(totemColors[(i + ti) % 3]));
      block.position.y = 0.65 + i * 1.35;
      g.add(block);
      [-0.35, 0.35].forEach(ex => {
        const eye = mesh(new THREE.BoxGeometry(0.3, 0.22, 0.1), mat(0x1c120a), false, false);
        eye.position.set(ex, 0.9 + i * 1.35, 0.76);
        g.add(eye);
      });
      const mouth = mesh(new THREE.BoxGeometry(0.8, 0.18, 0.1), mat(i === 1 ? 0xffc93c : 0x1c120a), false, false);
      mouth.position.set(0, 0.42 + i * 1.35, 0.76);
      g.add(mouth);
    }
    g.position.set(x, 1.4, z);
    g.rotation.y = x < 0 ? 0.5 : -0.5;
    scene.add(g);
  });

  // Volcano at the far end, so there is always something to run toward
  const volcano = new THREE.Group();
  const cone = mesh(new THREE.CylinderGeometry(6, 34, 46, 12), mat(0x6b4a36), false, false);
  cone.position.y = 18;
  volcano.add(cone);
  const lava = mesh(new THREE.CylinderGeometry(5.6, 6, 0.6, 12), mat(0xff6b2c, { emissive: 0xff4a10, emissiveIntensity: 0.9 }), false, false);
  lava.position.y = 41.1;
  volcano.add(lava);
  volcano.position.set(-24, -6, -235);
  scene.add(volcano);

  return { palms, lava };
}
