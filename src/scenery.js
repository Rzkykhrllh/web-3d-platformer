import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { surfaces, pathTop, Z_START, TEMPLE_TOP } from './level.js';
import { texturedMaterial } from './render/textures.js';
import { addWind, createGrass, createFlowers } from './render/foliage.js';
import { canvasTexture } from './util.js';
import { toon } from './render/toon.js';

// Everything you see but can't collide with: terrain, cliffs, plants, ruins.

// Small 2D value noise for terrain shapes
function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise2(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm2 = (x, z) => noise2(x, z) * 0.6 + noise2(x * 2.1, z * 2.1) * 0.3 + noise2(x * 4.3, z * 4.3) * 0.1;
const smooth = (a, b, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };

const Z_BACK = 26, Z_FAR = -272, BANK_W = 26, EDGE = 4.5;

// Ground level of the path region, smoothed across the steps at z = -100 and the temple top
const baseAt = z => smooth(-98.5, -101.5, z) + smooth(-229, -235, z) * (TEMPLE_TOP - 1);

// Height of the jungle banks either side of the path
export function bankHeight(x, z) {
  const ax = Math.abs(x);
  const edge = baseAt(z) + 1.4;
  const away = smooth(EDGE, EDGE + 5, ax);
  return edge + (ax - EDGE) * 0.08 + fbm2(x * 0.12, z * 0.12) * 2.6 * away + Math.max(0, ax - 14) * 0.25;
}

// Set UVs of a box to world units, so a shared material tiles evenly
function boxWorldUV(geo, w, h, d, scale) {
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * dims[f][0] * scale, uv.getY(k) * dims[f][1] * scale);
    }
  }
  return geo;
}

function displace(geo, amount, seed = 0) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = noise2(v.x * 1.7 + seed, v.z * 1.7 + v.y * 1.3 + seed) - 0.5;
    v.multiplyScalar(1 + n * amount);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

// Displaced sphere with smooth normals (three's polyhedra are non-indexed, so
// without merging they shade as flat facets)
function blob(radius, detail, amount, seed) {
  let g = new THREE.IcosahedronGeometry(radius, detail);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g);
  return displace(g, amount, seed);
}

function gradientColors(geo, bottom, top, minY, maxY) {
  const p = geo.attributes.position, cols = [];
  const a = new THREE.Color(bottom), b = new THREE.Color(top), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    c.copy(a).lerp(b, smooth(minY, maxY, p.getY(i)));
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return geo;
}

// Palm frond texture: a stem with leaflets, transparent background
function frondTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const mid = s / 2;
    for (let i = 0; i < 26; i++) {
      const y = s * 0.04 + (i / 26) * s * 0.92;
      const len = s * 0.46 * Math.sin(Math.PI * (0.15 + 0.85 * (i / 26)));
      const shade = 90 + Math.floor(Math.random() * 50);
      ctx.fillStyle = `rgb(${40 + (shade >> 2)},${shade + 40},${50 + (shade >> 3)})`;
      [-1, 1].forEach(side => {
        ctx.beginPath();
        ctx.moveTo(mid, y);
        ctx.quadraticCurveTo(mid + side * len * 0.6, y - 6, mid + side * len, y + 18);
        ctx.quadraticCurveTo(mid + side * len * 0.5, y + 8, mid, y + 8);
        ctx.fill();
      });
    }
    ctx.strokeStyle = '#6b8a2e'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(mid, 0); ctx.lineTo(mid, s); ctx.stroke();
  });
}

function palmVariant(height, bend, rand) {
  const parts = [];
  const segs = Math.round(height / 0.9);
  let x = 0, y = 0;
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const seg = new THREE.CylinderGeometry(0.24 - t * 0.06, 0.3 - t * 0.06, 0.95, 9, 1);
    seg.translate(0, 0.45, 0);
    seg.rotateZ(-bend * t * 0.8);
    seg.translate(x, y, 0);
    gradientColors(seg, 0x6e4a2a, 0xa8784a, y, y + 0.9);
    parts.push(seg);
    x += Math.sin(bend * t * 0.8) * 0.9;
    y += Math.cos(bend * t * 0.8) * 0.88;
  }
  const trunk = mergeGeometries(parts);
  const top = new THREE.Vector3(x, y, 0);

  // Fronds bend down along their length
  const fronds = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const g = new THREE.PlaneGeometry(1.1, 3.6, 1, 8);
    g.translate(0, 1.8, 0);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const along = p.getY(k);
      p.setZ(k, -Math.pow(along / 3.6, 2) * 1.6);
    }
    g.rotateX(-Math.PI / 2 + 0.35 + rand() * 0.25);
    g.rotateY((i / n) * Math.PI * 2 + rand() * 0.3);
    fronds.push(g);
  }
  const crown = mergeGeometries(fronds);
  crown.computeVertexNormals();
  return { trunk, crown, top };
}

export function buildScenery(scene, { textures, quality, rand }) {
  const mats = {
    sand: texturedMaterial(textures.sand, 1, 1),
    dirt: texturedMaterial(textures.dirt, 1, 1),
    stone: texturedMaterial(textures.stone, 1, 1),
    rock: texturedMaterial(textures.rock, 1, 1),
    grass: texturedMaterial(textures.grass, 1, 1)
  };
  const animated = [];

  // Path surfaces: textured top, rock sides
  for (const s of surfaces) {
    const h = s.top + 6, w = s.x1 - s.x0, d = s.z1 - s.z0;
    const geo = boxWorldUV(new THREE.BoxGeometry(w, h, d), w, h, d, 0.3);
    const top = mats[s.kind];
    const side = s.kind === 'stone' ? mats.stone : mats.rock;
    const m = new THREE.Mesh(geo, [side, side, top, side, side, side]);
    m.position.set((s.x0 + s.x1) / 2, s.top - h / 2, (s.z0 + s.z1) / 2);
    m.receiveShadow = true; m.castShadow = s.kind === 'stone';
    scene.add(m);
  }

  // Jungle banks: height-field hills either side
  [-1, 1].forEach(side => {
    const xs = 34, zs = 210, pos = [], uv = [], idx = [];
    for (let j = 0; j <= zs; j++) {
      const z = Z_BACK + (Z_FAR - Z_BACK) * (j / zs);
      for (let i = 0; i <= xs; i++) {
        const ax = EDGE + BANK_W * Math.pow(i / xs, 1.4);
        const x = side * ax;
        pos.push(x, bankHeight(x, z), z);
        uv.push(x * 0.25, z * 0.25);
      }
    }
    for (let j = 0; j < zs; j++) for (let i = 0; i < xs; i++) {
      const a = j * (xs + 1) + i, b = a + 1, c = a + xs + 1, d = c + 1;
      if (side > 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mats.grass);
    m.receiveShadow = true;
    scene.add(m);

    // Rocky cliff face between bank edge and the path / ravine floor
    const ys = 8, zs2 = 320, cp = [], cuv = [], cidx = [];
    for (let j = 0; j <= zs2; j++) {
      const z = Z_BACK + (Z_FAR - Z_BACK) * (j / zs2);
      const topY = bankHeight(side * EDGE, z);
      for (let i = 0; i <= ys; i++) {
        const t = i / ys, y = -4 + (topY + 4) * t;
        const bulge = (noise2(z * 0.6, y * 0.8) - 0.3) * 0.45 * Math.sin(t * Math.PI);
        cp.push(side * (EDGE + 0.05 + Math.max(0, bulge)), y, z);
        cuv.push(z * 0.3, y * 0.3);
      }
    }
    for (let j = 0; j < zs2; j++) for (let i = 0; i < ys; i++) {
      const a = j * (ys + 1) + i, b = a + 1, c = a + ys + 1, d = c + 1;
      // Faces point toward the path
      if (side > 0) cidx.push(a, b, c, b, d, c); else cidx.push(a, c, b, b, c, d);
    }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
    cg.setAttribute('uv', new THREE.Float32BufferAttribute(cuv, 2));
    cg.setIndex(cidx);
    cg.computeVertexNormals();
    const cliff = new THREE.Mesh(cg, mats.rock);
    cliff.receiveShadow = true;
    scene.add(cliff);
  });

  // Hill behind the start so the camera never sees the edge of the world
  const back = new THREE.Mesh(displace(new THREE.SphereGeometry(16, 24, 12), 0.25, 3), mats.grass);
  back.scale.set(1.6, 0.5, 0.6);
  back.position.set(0, 0, Z_BACK + 4);
  scene.add(back);

  // Palms, instanced per shape
  const frondMat = addWind(toon({
    map: frondTexture(), alphaTest: 0.5, side: THREE.DoubleSide
  }), { amount: 0.25, height: 3.4, instanced: true, radial: true });
  const trunkMat = toon({ vertexColors: true });
  const variants = [palmVariant(7, 0.35, rand), palmVariant(8.5, 0.55, rand), palmVariant(6, 0.2, rand)];
  const palmSpots = [];
  for (let z = Z_BACK - 4; z > Z_FAR + 6; z -= 2.6) {
    [-1, 1].forEach(sideX => {
      if (rand() < 0.2) return;
      const x = sideX * (5.8 + rand() * 10);
      palmSpots.push({ x, z: z + (rand() - 0.5) * 2, v: Math.floor(rand() * 3), lean: sideX });
    });
  }
  variants.forEach((v, vi) => {
    const spots = palmSpots.filter(p => p.v === vi);
    const trunks = new THREE.InstancedMesh(v.trunk, trunkMat, spots.length);
    const crowns = new THREE.InstancedMesh(v.crown, frondMat, spots.length);
    trunks.castShadow = crowns.castShadow = true;
    const m = new THREE.Matrix4(), c = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    spots.forEach((p, i) => {
      // Lean toward the path, like palms reaching for light
      const yaw = p.lean > 0 ? Math.PI + (rand() - 0.5) * 0.8 : (rand() - 0.5) * 0.8;
      q.setFromAxisAngle(up, yaw);
      s.setScalar(0.85 + rand() * 0.35);
      m.compose(new THREE.Vector3(p.x, bankHeight(p.x, p.z) - 0.2, p.z), q, s);
      trunks.setMatrixAt(i, m);
      c.makeTranslation(v.top.x, v.top.y, v.top.z).premultiply(m);
      crowns.setMatrixAt(i, c);
    });
    scene.add(trunks, crowns);
  });

  // Bushes: a few soft blobs merged into one shape, instanced
  const bushParts = [];
  for (let i = 0; i < 3; i++) {
    const g = blob(0.75 - i * 0.12, 2, 0.3, i * 7);
    g.translate((i - 1) * 0.55, 0.15 + (i === 1 ? 0.25 : 0), (i % 2) * 0.3);
    bushParts.push(g);
  }
  const bushGeo = gradientColors(mergeGeometries(bushParts), 0x23602c, 0x5fae4b, -0.4, 1);
  const bushMat = addWind(toon({ vertexColors: true }), { amount: 0.05, height: 1.2, instanced: true });
  const bushSpots = [];
  for (let z = Z_BACK - 2; z > Z_FAR + 4; z -= 1.3) {
    [-1, 1].forEach(sx => {
      if (rand() < 0.35) return;
      const x = sx * (4.9 + rand() * (rand() < 0.7 ? 1.5 : 12));
      bushSpots.push([x, z + rand()]);
    });
  }
  const bushes = new THREE.InstancedMesh(bushGeo, bushMat, bushSpots.length);
  bushes.castShadow = true; bushes.receiveShadow = true;
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), e = new THREE.Euler();
    bushSpots.forEach(([x, z], i) => {
      e.set(0, rand() * 6, 0); q.setFromEuler(e);
      const k = 0.7 + rand() * 0.8;
      s.set(k, k * (0.7 + rand() * 0.4), k);
      m.compose(new THREE.Vector3(x, bankHeight(x, z) - 0.1, z), q, s);
      bushes.setMatrixAt(i, m);
    });
  }
  scene.add(bushes);

  // Rocks on the banks
  const rockGeo = displace(new THREE.IcosahedronGeometry(1, 2), 0.5, 11);
  const rockSpots = [];
  for (let i = 0; i < 70; i++) {
    const z = Z_BACK - rand() * (Z_BACK - Z_FAR);
    const x = (rand() < 0.5 ? -1 : 1) * (5 + rand() * 18);
    rockSpots.push([x, z]);
  }
  const rocks = new THREE.InstancedMesh(rockGeo, mats.rock, rockSpots.length);
  rocks.castShadow = rocks.receiveShadow = true;
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), e = new THREE.Euler();
    rockSpots.forEach(([x, z], i) => {
      e.set(rand(), rand() * 6, rand()); q.setFromEuler(e);
      const k = 0.4 + rand() * 1.1;
      s.set(k * 1.3, k * 0.8, k);
      m.compose(new THREE.Vector3(x, bankHeight(x, z), z), q, s);
      rocks.setMatrixAt(i, m);
    });
  }
  scene.add(rocks);

  // Pebbles along the foot of the cliffs, to break up the straight path edge
  const pebbleSpots = [];
  for (const sf of surfaces) {
    if (sf.kind === 'stone') continue;
    for (let z = sf.z1 - 0.3; z > sf.z0 + 0.3; z -= 0.45) {
      [-1, 1].forEach(sx => { if (rand() < 0.8) pebbleSpots.push([sx * (4.25 + rand() * 0.25), sf.top, z + rand() * 0.3]); });
    }
  }
  const pebbles = new THREE.InstancedMesh(displace(new THREE.IcosahedronGeometry(1, 1), 0.4, 21), mats.rock, pebbleSpots.length);
  pebbles.receiveShadow = true;
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), e = new THREE.Euler();
    pebbleSpots.forEach(([x, y, z], i) => {
      e.set(rand(), rand() * 6, rand()); q.setFromEuler(e);
      const k = 0.12 + rand() * 0.28;
      s.set(k * 1.4, k * 0.7, k);
      m.compose(new THREE.Vector3(x, y + k * 0.15, z), q, s);
      pebbles.setMatrixAt(i, m);
    });
  }
  scene.add(pebbles);

  // Grass and flowers on the banks
  const onBank = r => {
    const z = Z_BACK - 2 - r() * (Z_BACK - Z_FAR - 6);
    // Most blades hug the path edge where the camera can see them
    const ax = EDGE + 0.25 + (r() < 0.75 ? r() * 4 : 4 + Math.pow(r(), 1.5) * 10);
    const x = (r() < 0.5 ? -1 : 1) * ax;
    return { x, y: bankHeight(x, z) - 0.05, z };
  };
  const grass = createGrass(scene, quality.grass, onBank, rand);
  createFlowers(scene, quality.flowers, onBank, rand);

  // Stone arches over the path
  const archStone = mats.stone;
  // The one at -201 is the temple gate the logs roll out of
  [[-30, 0], [-93, 0], [-134, 1], [-160, 1], [-201, 1], [-253, TEMPLE_TOP]].forEach(([z, base]) => {
    [-1, 1].forEach(sx => {
      const pillar = new THREE.Mesh(boxWorldUV(new THREE.BoxGeometry(1.3, 6.4, 1.3), 1.3, 6.4, 1.3, 0.5), archStone);
      pillar.position.set(sx * 5.3, base + 3.2, z);
      pillar.castShadow = pillar.receiveShadow = true;
      scene.add(pillar);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.4, 1.7), archStone);
      cap.position.set(sx * 5.3, base + 0.2, z);
      scene.add(cap);
    });
    const lintel = new THREE.Mesh(boxWorldUV(new THREE.BoxGeometry(12.6, 1.1, 1.7), 12.6, 1.1, 1.7, 0.5), archStone);
    lintel.position.set(0, base + 6.9, z);
    lintel.castShadow = true;
    scene.add(lintel);
    const moss = new THREE.Mesh(displace(new THREE.BoxGeometry(12.8, 0.35, 1.8, 16, 1, 2), 0.06), toon({ color: 0x3f8a42 }));
    moss.position.set(0, base + 7.5, z);
    scene.add(moss);
  });

  // Broken columns in the ruins
  for (let i = 0; i < 24; i++) {
    const z = -102 - rand() * 150, sx = rand() < 0.5 ? -1 : 1;
    const x = sx * (5.6 + rand() * 6);
    const h = 1 + rand() * 3.5;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, h, 12), archStone);
    col.position.set(x, bankHeight(x, z) + h / 2 - 0.2, z);
    col.rotation.z = (rand() - 0.5) * 0.2;
    col.castShadow = col.receiveShadow = true;
    scene.add(col);
  }

  // Torches: emissive flames bright enough to bloom
  const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.4, 0.4), toneMapped: false });
  const torches = [];
  [[-4.9, -99], [4.9, -99], [-4.9, -131], [4.9, -131], [-4.9, -203], [4.9, -203], [-4.9, -227], [4.9, -227], [-1.9, -252], [1.9, -252]].forEach(([x, z]) => {
    const y = Math.max(pathTop(z), bankHeight(x, z) - 0.3);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.8, 6), toon({ color: 0x5e3a1a }));
    pole.position.set(x, y + 0.9, z);
    pole.castShadow = true;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.12, 0.25, 8), archStone);
    bowl.position.set(x, y + 1.85, z);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 8), flameMat);
    flame.position.set(x, y + 2.25, z);
    scene.add(pole, bowl, flame);
    torches.push({ flame, phase: rand() * 6, pos: new THREE.Vector3(x, y + 2.3, z) });
  });

  // Tiki totems at the start
  const totemMat = [0x8b4a24, 0xa8622f, 0x6b3a1c].map(c => toon({ color: c }));
  const dark = toon({ color: 0x1c120a });
  const gold = toon({ color: 0xffc93c, emissive: 0xff9a00, emissiveIntensity: 0.6 });
  [[-6.2, -3], [6.2, -3]].forEach(([x, z], ti) => {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const block = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.85, 1.3, 10), totemMat[(i + ti) % 3]);
      block.position.y = 0.65 + i * 1.35;
      block.castShadow = true;
      g.add(block);
      [-0.32, 0.32].forEach(ex => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), i === 1 ? gold : dark);
        eye.scale.z = 0.5;
        eye.position.set(ex, 0.9 + i * 1.35, 0.78);
        g.add(eye);
      });
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, 0.1), i === 1 ? gold : dark);
      mouth.position.set(0, 0.42 + i * 1.35, 0.8);
      g.add(mouth);
    }
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.1, 10), toon({ color: 0x2e9e5b }));
    crown.position.y = 4.65;
    g.add(crown);
    g.position.set(x, bankHeight(x, z) - 0.3, z);
    g.rotation.y = x < 0 ? 0.5 : -0.5;
    scene.add(g);
  });

  // Volcano at the far end, with smoke
  const volcano = new THREE.Group();
  const cone = new THREE.Mesh(displace(new THREE.CylinderGeometry(7, 40, 52, 32, 8, true), 0.12, 5), mats.rock);
  cone.position.y = 20;
  volcano.add(cone);
  const lava = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 7, 0.8, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.1, 0.3), toneMapped: false }));
  lava.position.y = 45.8;
  volcano.add(lava);
  volcano.position.set(-30, -8, -340);
  scene.add(volcano);
  const smokeMat = toon({ color: 0x8a8580, transparent: true, opacity: 0.7 });
  const smoke = [];
  for (let i = 0; i < 9; i++) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(4, 1), smokeMat.clone());
    puff.userData.t = i / 9;
    scene.add(puff);
    smoke.push(puff);
  }

  return {
    grass,
    torches,
    update(dt, t) {
      for (const tr of torches) {
        const f = 1 + Math.sin(t * 18 + tr.phase) * 0.12 + Math.sin(t * 7 + tr.phase) * 0.08;
        tr.flame.scale.set(1 / f, f, 1 / f);
      }
      for (const p of smoke) {
        p.userData.t = (p.userData.t + dt * 0.05) % 1;
        const k = p.userData.t;
        p.position.set(-30 + Math.sin(k * 4) * 4 + k * 16, 40 + k * 45, -340);
        p.scale.setScalar(0.6 + k * 2.2);
        p.material.opacity = 0.7 * (1 - k);
      }
    }
  };
}

export { Z_START };
