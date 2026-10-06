import * as THREE from 'three';

// Level layout: data only. scenery.js draws it, main.js wires up behaviour.
// The path runs from z = +4 toward -z, away from the camera.
//
//   beach      z  22 .. -60   intro crates, bounce crate, first crab
//   gap 1      z -60 .. -75   two stone pillars, skills crate on the second
//   jungle     z -75 .. -100  "!" crate with ghost crates, faster crab
//   step up    z -100         ledge you have to jump
//   ruins A    z -100 .. -112 the pink power crystal, halfway through
//   gap 2      z -112 .. -130 a moving platform, then two crumbling ones
//   ruins B    z -130 .. -174 metal crate stairs, TNT, a crate on the old pedestal
//   chasm      z -174 .. -178 the logs roll off into it; jump across
//   log run    z -178 .. -202 logs roll out of the temple gate; jump them
//   fire hall  z -202 .. -228 fire jets in a diagonal wave, nitro crates
//   lift       z -228 .. -232 a platform rides up to the temple top
//   temple top z -232 .. -256 green gem (opens once every crate is broken), warp pad

export const PATH_HALF_WIDTH = 4.4;
export const Z_START = 4;
export const Z_END = -252;
export const TEMPLE_TOP = 4.5;

// Height of the main path at z, ignoring pillars and platforms
export const pathTop = z => (z < -232 ? TEMPLE_TOP : z < -100 ? 1 : 0);

// Static walkable boxes. `kind` picks the look in scenery.js.
export const surfaces = [
  { kind: 'sand',  x0: -4.5, x1: 4.5, z0: -60,   z1: 22,    top: 0 },
  { kind: 'stone', x0: -1.6, x1: 1.6, z0: -66.5, z1: -61.5, top: 0.5 },
  { kind: 'stone', x0: -1.6, x1: 1.6, z0: -73,   z1: -68.5, top: 1.2 },
  { kind: 'sand',  x0: -4.5, x1: 4.5, z0: -100,  z1: -75,   top: 0 },
  { kind: 'dirt',  x0: -4.5, x1: 4.5, z0: -112,  z1: -100,  top: 1 },
  { kind: 'dirt',  x0: -4.5, x1: 4.5, z0: -174,  z1: -130,  top: 1 },
  { kind: 'dirt',  x0: -4.5, x1: 4.5, z0: -202,  z1: -178,  top: 1 },
  { kind: 'stone', x0: -1.4, x1: 1.4, z0: -167,  z1: -163,  top: 1.6 },
  { kind: 'stone', x0: -4.5, x1: 4.5, z0: -228,  z1: -202,  top: 1 },
  { kind: 'stone', x0: -4.5, x1: 4.5, z0: -256,  z1: -232,  top: TEMPLE_TOP },
  // Gem pedestal, off to the side so the warp pad can sit in the middle
  { kind: 'stone', x0: 1.8,  x1: 4.2, z0: -247,  z1: -244,  top: TEMPLE_TOP + 0.6 }
];

// Platforms that fall a moment after Pip lands on them, then come back
export const crumblers = [
  { x0: -1.5, x1: 1.5, z0: -122, z1: -119, top: 1.2 },
  { x0: -1.5, x1: 1.5, z0: -127, z1: -124, top: 1.4 }
];

// Platforms that slide back and forth along `axis` by `range` from their rest position
export const movers = [
  // Comes first, so you can wait on solid ground for it to line up
  { x0: -1.5, x1: 1.5, z0: -117, z1: -114, top: 1.2, axis: 'x', range: 2.6, speed: 0.8 },
  // Temple lift: bottom just under the hall floor, top just over the temple top
  { x0: -1.5, x1: 1.5, z0: -231.6, z1: -228.4, top: 2.75, axis: 'y', range: 1.8, speed: 0.7 }
];

// Logs tumble over the temple gate from high up, land, roll toward the camera
// and drop off `edge` into the chasm. Each lane is an x range; the pattern
// repeats, one log every `every` seconds.
export const logRun = {
  from: -205, edge: -178, to: -174, speed: 5, every: 2.4, base: 1, radius: 0.55, drop: 9, dropTime: 0.9, water: -2.3,
  lanes: [[-4.4, 4.4], [-4.4, 0], [0, 4.4], [-4.4, 4.4], [0, 4.4], [-4.4, 0]]
};

// Fire jets: square vents in the floor. Each burns for `on` seconds out of
// `period`, starting at `phase`; it glows for `warn` seconds before.
// Rows are offset so the fire moves across the hall in a diagonal wave.
export const fireJets = [];
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 3; c++) {
    fireJets.push({ x: (c - 1) * 3, z: -206 - r * 5, base: 1, size: 2.4, period: 3, on: 1, warn: 0.6, phase: ((c + r) % 3) });
  }
}

export const crateSpots = [
  { x: 0,    z: -9,   type: 'bonus', content: 'about' },
  { x: -2,   z: -17,  type: 'basic', content: 'ncj-traffic-api' },
  { x: 2,    z: -17,  type: 'basic' },
  { x: -1.5, z: -25,  type: 'basic', content: 'ncj-ml-platform' },
  { x: 2.6,  z: -31,  type: 'bounce' },
  { x: 2.2,  z: -36,  type: 'basic', content: 'ncj-monitoring' },
  { x: -2.2, z: -36,  type: 'basic' },
  { x: 0,    z: -48,  type: 'basic' },
  { x: 0,    z: -48,  type: 'basic', level: 1, content: 'tiket' },
  { x: -2.6, z: -55,  type: 'checkpoint' },
  { x: 0,    z: -72,  type: 'basic', content: 'skills', base: 1.2 },
  { x: -2,   z: -81,  type: 'basic', content: 'yomeru' },
  { x: 2.4,  z: -86,  type: 'activator' },
  { x: -2.5, z: -90,  type: 'basic', ghost: true },
  { x: 0,    z: -90,  type: 'bonus', ghost: true, content: 'nihongo-popup' },
  { x: 2.5,  z: -90,  type: 'basic', ghost: true },
  { x: 2.6,  z: -106, type: 'checkpoint' },
  { x: -2.5, z: -106, type: 'basic', content: 'early' },
  { x: 0,    z: -136, type: 'bonus', content: 'photo-site' },
  { x: 3,    z: -140, type: 'metal' },
  { x: 3,    z: -142, type: 'metal', level: 1 },
  { x: 3,    z: -144, type: 'metal', level: 2 },
  // Floating reward past the top of the metal stairs
  { x: 3,    z: -148.5, type: 'bonus', content: 'photography', base: 4.2 },
  { x: -2.5, z: -146, type: 'basic', content: 'into-ugm' },
  { x: -1.5, z: -150, type: 'basic' },
  { x: 0,    z: -150, type: 'tnt', content: 'contact' },
  { x: 1.5,  z: -150, type: 'basic' },
  { x: -2.5, z: -157, type: 'basic' },
  { x: 2.5,  z: -157, type: 'basic', content: 'island' },
  // The old pedestal before the log run
  { x: 0,    z: -165, type: 'bonus', base: 1.6 },
  { x: 2.6,  z: -171, type: 'checkpoint' },
  // Fire hall: crates between the vent rows, nitro where you'd dodge to
  { x: -3.5, z: -208.5, type: 'basic' },
  { x: 3.5,  z: -208.5, type: 'nitro' },
  { x: 0,    z: -213.5, type: 'nitro' },
  { x: 3.5,  z: -213.5, type: 'basic' },
  { x: -3.5, z: -218.5, type: 'nitro' },
  { x: 0,    z: -218.5, type: 'basic' },
  { x: 3.5,  z: -225, type: 'checkpoint' },
  { x: -3.5, z: -225, type: 'tnt' },
  // Temple top
  { x: -3,   z: -238, type: 'basic' },
  { x: 3,    z: -238, type: 'basic' },
  { x: -3,   z: -242, type: 'bounce' },
  // Sets off every nitro crate in the level, so they count toward the total too
  { x: -3,   z: -247.5, type: 'detonator' }
];

export const enemySpots = [
  { x0: -3.4, x1: 3.4, z: -42,  y: 0, speed: 2 },
  { x0: -3.4, x1: 3.4, z: -95,  y: 0, speed: 3 },
  { x0: -3.4, x1: 0.5, z: -155, y: 1, speed: 2.4 }
];

export const crystalPosition = new THREE.Vector3(0, 2.4, -109);
export const gemPosition = new THREE.Vector3(3, TEMPLE_TOP + 2.1, -245.5);
export const exitPosition = new THREE.Vector3(0, TEMPLE_TOP, -249.5);

// Fallback respawn points; checkpoint crates add their own
export const checkpoints = [
  new THREE.Vector3(0, 0, 2),
  new THREE.Vector3(0, 0, -77),
  new THREE.Vector3(0, 1, -132),
  new THREE.Vector3(0, 1, -172)
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
  // Across the chasm, then over the log run at jump height
  arc([[0, 2.4, -174.6], [0, 3, -176], [0, 2.4, -177.4]]);
  line(0, -182, -198, 5, 2);
  // Over the fire vents, for the brave
  line(-3.5, -211, -211, 1); line(0, -216, -216, 1); line(3.5, -221, -221, 1);
  // Up the lift
  arc([[0, 3, -230], [0, 4.5, -230], [0, 6, -230]]);
  // Reward for the bounce crate on the temple top
  arc([[-3, 8.6, -241.2], [-3, 9.6, -242], [-3, 8.6, -242.8]]);
  line(0, -236, -244, 4);
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
    crumblers, movers, crateSpots, enemySpots, logRun, fireJets,
    fruitSpots: fruitSpots(),
    crystalPosition: crystalPosition.clone(),
    gemPosition: gemPosition.clone(),
    exitPosition: exitPosition.clone(),
    checkpoints: checkpoints.map(c => c.clone()),
    bounds: { xMin: -PATH_HALF_WIDTH, xMax: PATH_HALF_WIDTH, zMin: Z_END, zMax: Z_START },
    pathTop,
    path
  };
}
