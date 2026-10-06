import * as THREE from 'three';

// Level layout: data only. scenery.js draws it, main.js wires up behaviour.
// The path runs from z = +4 toward -z, away from the camera.
//
//   beach      z  22 .. -60   intro crates, bounce crate, first crab
//   gap 1      z -60 .. -75   two stone pillars, skills crate on the second
//   jungle     z -75 .. -100  "!" crate with ghost crates, faster crab
//   step up    z -100         ledge you have to jump
//   ruins A    z -100 .. -112
//   gap 2      z -112 .. -130 a moving platform, then two crumbling ones
//   ruins B    z -130 .. -180 metal crate stairs, TNT, gem on a pedestal

export const PATH_HALF_WIDTH = 4.4;
export const Z_START = 4;
export const Z_END = -172;

// Height of the main path at z, ignoring pillars and platforms
export const pathTop = z => (z < -100 ? 1 : 0);

// Static walkable boxes. `kind` picks the look in scenery.js.
export const surfaces = [
  { kind: 'sand',  x0: -4.5, x1: 4.5, z0: -60,   z1: 22,    top: 0 },
  { kind: 'stone', x0: -1.6, x1: 1.6, z0: -66.5, z1: -61.5, top: 0.5 },
  { kind: 'stone', x0: -1.6, x1: 1.6, z0: -73,   z1: -68.5, top: 1.2 },
  { kind: 'sand',  x0: -4.5, x1: 4.5, z0: -100,  z1: -75,   top: 0 },
  { kind: 'dirt',  x0: -4.5, x1: 4.5, z0: -112,  z1: -100,  top: 1 },
  { kind: 'dirt',  x0: -4.5, x1: 4.5, z0: -180,  z1: -130,  top: 1 },
  { kind: 'stone', x0: -1.4, x1: 1.4, z0: -167,  z1: -163,  top: 1.6 }
];

// Platforms that fall a moment after Pip lands on them, then come back
export const crumblers = [
  { x0: -1.5, x1: 1.5, z0: -122, z1: -119, top: 1.2 },
  { x0: -1.5, x1: 1.5, z0: -127, z1: -124, top: 1.4 }
];

// Platforms that slide back and forth along `axis` by `range` from their rest position
export const movers = [
  // Comes first, so you can wait on solid ground for it to line up
  { x0: -1.5, x1: 1.5, z0: -117, z1: -114, top: 1.2, axis: 'x', range: 2.6, speed: 0.8 }
];

export const crateSpots = [
  { x: 0,    z: -9,   type: 'bonus', content: 'about' },
  { x: -2,   z: -17,  type: 'basic' },
  { x: 2,    z: -17,  type: 'basic' },
  { x: -1.5, z: -25,  type: 'basic', content: 'project-mtls' },
  { x: 2.6,  z: -31,  type: 'bounce' },
  { x: 2.2,  z: -36,  type: 'basic', content: 'project-rbac' },
  { x: -2.2, z: -36,  type: 'basic' },
  { x: 0,    z: -48,  type: 'basic' },
  { x: 0,    z: -48,  type: 'basic', level: 1 },
  { x: -2.6, z: -55,  type: 'checkpoint' },
  { x: 0,    z: -72,  type: 'basic', content: 'skills', base: 1.2 },
  { x: -2,   z: -81,  type: 'basic', content: 'project-anomaly' },
  { x: 2.4,  z: -86,  type: 'activator' },
  { x: -2.5, z: -90,  type: 'basic', ghost: true },
  { x: 0,    z: -90,  type: 'bonus', ghost: true },
  { x: 2.5,  z: -90,  type: 'basic', ghost: true },
  { x: 2.6,  z: -106, type: 'checkpoint' },
  { x: -2.5, z: -106, type: 'basic' },
  { x: 0,    z: -136, type: 'bonus', content: 'project-island' },
  { x: 3,    z: -140, type: 'metal' },
  { x: 3,    z: -142, type: 'metal', level: 1 },
  { x: 3,    z: -144, type: 'metal', level: 2 },
  { x: -2.5, z: -146, type: 'basic' },
  { x: -1.5, z: -150, type: 'basic' },
  { x: 0,    z: -150, type: 'tnt', content: 'contact' },
  { x: 1.5,  z: -150, type: 'basic' },
  { x: -2.5, z: -157, type: 'basic' },
  { x: 2.5,  z: -157, type: 'basic' }
];

export const enemySpots = [
  { x0: -3.4, x1: 3.4, z: -42,  y: 0, speed: 2 },
  { x0: -3.4, x1: 3.4, z: -95,  y: 0, speed: 3 },
  { x0: -3.4, x1: 0.5, z: -155, y: 1, speed: 2.4 }
];

export const gemPosition = new THREE.Vector3(0, 3.1, -165);

// Fallback respawn points; checkpoint crates add their own
export const checkpoints = [
  new THREE.Vector3(0, 0, 2),
  new THREE.Vector3(0, 0, -77),
  new THREE.Vector3(0, 1, -132)
];

export function fruitSpots() {
  const spots = [];
  const line = (x, z0, z1, n, lift = 0.9) => {
    for (let i = 0; i < n; i++) {
      const z = z0 + (z1 - z0) * (i / Math.max(1, n - 1));
      spots.push(new THREE.Vector3(x, pathTop(z) + lift, z));
    }
  };
  const arc = pts => pts.forEach(([x, y, z]) => spots.push(new THREE.Vector3(x, y, z)));
  line(0, -1, -5, 3);
  line(0, -20, -22, 2);
  line(-2.5, -27, -33, 4);
  // Reward for using the bounce crate
  arc([[2.6, 4.2, -30.2], [2.6, 5.2, -31], [2.6, 4.2, -31.8]]);
  line(0, -39, -45, 4, 1.6);
  line(2.5, -51, -57, 4);
  arc([[0, 2.2, -61], [0, 2.6, -63.5], [0, 3.0, -67.5], [0, 3.2, -70], [0, 2.6, -74]]);
  line(1.5, -78, -80, 3);
  line(0, -92, -97, 4, 1.6);
  line(0, -103, -109, 4);
  arc([[0, 3.0, -118], [0, 3.0, -123], [0, 3.2, -128], [0, 2.4, -131]]);
  // Top of the metal crate stairs
  arc([[3, 5.4, -144], [3, 5.6, -146], [3, 5.4, -148], [2, 5.0, -150]]);
  line(-2.5, -138, -143, 4);
  line(0, -153, -160, 4);
  return spots;
}

// Used by the menu camera fly-through
export const path = {
  start: Z_START + 2,
  end: Z_END + 8,
  heightAt: z => pathTop(z)
};

// Everything the game needs to know about a level, in one object. A level built
// in Blender (see gltf-level.js) produces the same shape.
export function proceduralLevel() {
  return {
    source: 'procedural',
    surfaces: surfaces.map(s => ({ ...s })),
    crumblers, movers, crateSpots, enemySpots,
    fruitSpots: fruitSpots(),
    gemPosition: gemPosition.clone(),
    checkpoints: checkpoints.map(c => c.clone()),
    bounds: { xMin: -PATH_HALF_WIDTH, xMax: PATH_HALF_WIDTH, zMin: Z_END, zMax: Z_START },
    pathTop,
    path
  };
}
