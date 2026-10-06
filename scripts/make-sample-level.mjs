// Writes public/levels/sample.gltf: a tiny level that uses every naming
// convention gltf-level.js understands. Open it in Blender to see the setup,
// or run the game with ?level=levels/sample.gltf.
//
//   node scripts/make-sample-level.mjs

import { writeFileSync, mkdirSync } from 'node:fs';

// Unit cube centred on the origin, 24 vertices so each face has its own normal
const faces = [
  [[1, 0, 0], [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]]],
  [[-1, 0, 0], [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]]],
  [[0, 1, 0], [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]]],
  [[0, -1, 0], [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]]],
  [[0, 0, 1], [[1, -1, 1], [1, 1, 1], [-1, 1, 1], [-1, -1, 1]]],
  [[0, 0, -1], [[-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]]]
];
const pos = [], nrm = [], idx = [];
faces.forEach(([n, verts], f) => {
  verts.forEach(v => { pos.push(...v.map(c => c * 0.5)); nrm.push(...n); });
  const b = f * 4;
  idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
});
const posBuf = Buffer.from(new Float32Array(pos).buffer);
const nrmBuf = Buffer.from(new Float32Array(nrm).buffer);
const idxBuf = Buffer.from(new Uint16Array(idx).buffer);
const bin = Buffer.concat([posBuf, nrmBuf, idxBuf]);

const materials = [
  ['sand', [0.91, 0.76, 0.49]],
  ['rock', [0.52, 0.48, 0.43]],
  ['wood', [0.61, 0.42, 0.23]],
  ['leaf', [0.23, 0.62, 0.3]],
  ['marker', [1, 0, 1]]
].map(([name, c]) => ({ name, pbrMetallicRoughness: { baseColorFactor: [...c, 1], metallicFactor: 0, roughnessFactor: 0.9 } }));
const matIndex = Object.fromEntries(materials.map((m, i) => [m.name, i]));

const nodes = [];
const box = (name, material, [x, y, z], [sx, sy, sz], extras) =>
  nodes.push({ name, mesh: matIndex[material], translation: [x, y, z], scale: [sx, sy, sz], ...(extras ? { extras } : {}) });
const point = (name, [x, y, z], extras) =>
  nodes.push({ name, translation: [x, y, z], ...(extras ? { extras } : {}) });

// Walkable ground (visible), with a gap crossed by a moving and a crumbling platform
box('WALK_start', 'sand', [0, -1, -10], [9, 2, 28]);
box('MOVER_ferry', 'wood', [0, -0.25, -27], [3, 0.5, 3], { axis: 'x', range: 2, speed: 0.9 });
box('CRUMBLE_step', 'wood', [0, -0.25, -32], [3, 0.5, 3]);
box('WALK_end', 'sand', [0, -1, -48], [9, 2, 24]);
box('WALK_pedestal', 'rock', [0, 0.3, -56], [2.4, 0.6, 2.4]);

// Invisible collider: a ledge drawn by scenery elsewhere
box('COL_ledge', 'marker', [3, 0.5, -42], [2, 1, 2]);
box('ledge_rock', 'rock', [3, 0.5, -42], [2, 1, 2]);

// Scenery (no prefix): cliffs and trees along the sides
for (let z = 2; z > -60; z -= 6) {
  [-1, 1].forEach(s => {
    box(`cliff_${s}_${-z}`, 'rock', [s * 6, 0, z], [3, 3, 6]);
    box(`tree_${s}_${-z}`, 'leaf', [s * 7.5, 3, z + 1.5], [2, 3, 2]);
  });
}

point('SPAWN', [0, 0, 2]);
point('CHECKPOINT_after_gap', [0, 0, -37]);
point('CRATE_bonus', [0, 0, -8], { content: 'about' });
point('CRATE_basic', [-2, 0, -14]);
point('CRATE_basic.001', [2, 0, -14], { content: 'yomeru' });
point('CRATE_bounce', [2.5, 0, -19]);
point('CRATE_activator', [-2.5, 0, -40]);
point('CRATE_basic.002', [0, 0, -44], { ghost: true });
point('CRATE_tnt', [-2, 0, -50], { content: 'contact' });
point('CRATE_metal', [3, 1, -42]);
point('ENEMY_crab', [0, 0, -47], { range: 3, speed: 2 });
for (let i = 0; i < 6; i++) point(`FRUIT.${String(i).padStart(3, '0')}`, [0, 0.9, -2 - i * 1.5]);
point('GEM', [0, 2.5, -56]);
box('BOUNDS', 'marker', [0, 0, -28], [9, 20, 66]);

const gltf = {
  asset: { version: '2.0', generator: 'make-sample-level.mjs' },
  scene: 0,
  scenes: [{ nodes: nodes.map((_, i) => i) }],
  nodes,
  meshes: materials.map((m, i) => ({ name: `cube_${m.name}`, primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: i }] })),
  materials,
  accessors: [
    { bufferView: 0, componentType: 5126, count: 24, type: 'VEC3', min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
    { bufferView: 1, componentType: 5126, count: 24, type: 'VEC3' },
    { bufferView: 2, componentType: 5123, count: idx.length, type: 'SCALAR' }
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: posBuf.length, target: 34962 },
    { buffer: 0, byteOffset: posBuf.length, byteLength: nrmBuf.length, target: 34962 },
    { buffer: 0, byteOffset: posBuf.length + nrmBuf.length, byteLength: idxBuf.length, target: 34963 }
  ],
  buffers: [{ byteLength: bin.length, uri: `data:application/octet-stream;base64,${bin.toString('base64')}` }]
};

mkdirSync('public/levels', { recursive: true });
writeFileSync('public/levels/sample.gltf', JSON.stringify(gltf, null, 1));
console.log(`public/levels/sample.gltf: ${nodes.length} nodes`);
