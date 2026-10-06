import * as THREE from 'three';
import { toon } from './toon.js';

// Shared wind uniform so grass, bushes and palm leaves sway together
export const wind = { uTime: { value: 0 }, uStrength: { value: 1 } };

// Adds a wind sway to any material. Vertices bend more the higher they are
// (local y above `pivot`), or the further from the centre with `radial`,
// with a phase from their world position.
export function addWind(material, { amount = 0.15, pivot = 0, height = 1, instanced = false, radial = false } = {}) {
  const reach = radial ? 'length(position.xz)' : `(position.y - ${pivot.toFixed(2)})`;
  material.onBeforeCompile = shader => {
    shader.uniforms.uTime = wind.uTime;
    shader.uniforms.uStrength = wind.uStrength;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform float uStrength;`)
      .replace('#include <begin_vertex>', /* glsl */`
        #include <begin_vertex>
        {
          vec4 base = modelMatrix * ${instanced ? 'instanceMatrix *' : ''} vec4(0.0, 0.0, 0.0, 1.0);
          float bend = clamp(${reach} / ${height.toFixed(2)}, 0.0, 1.0);
          bend *= bend;
          float ph = uTime * 1.7 + base.x * 0.35 + base.z * 0.27;
          float gust = sin(uTime * 0.6 + base.z * 0.05) * 0.5 + 0.5;
          transformed.x += (sin(ph) * 0.7 + sin(ph * 2.3) * 0.3) * ${amount.toFixed(3)} * bend * uStrength * (0.6 + gust);
          transformed.z += cos(ph * 0.8) * ${(amount * 0.5).toFixed(3)} * bend * uStrength;
        }`);
  };
  material.customProgramCacheKey = () => `wind-${amount}-${pivot}-${height}-${instanced}-${radial}`;
  return material;
}

// Grass blade: a tapered strip with a few segments so it can bend
function bladeGeometry() {
  const segs = 3, w = 0.11, h = 0.75;
  const pos = [], col = [], idx = [];
  const base = new THREE.Color(0x2c6e2e), tip = new THREE.Color(0x9fd665);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, hw = w * (1 - t * 0.9);
    pos.push(-hw, t * h, 0, hw, t * h, 0);
    const c = base.clone().lerp(tip, t);
    col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i < segs) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Point normals up so blades shade like the ground instead of flickering
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}

// place(rand) returns {x, y, z} or null to skip
export function createGrass(scene, count, place, rand) {
  if (!count) return null;
  const mat = addWind(toon({ vertexColors: true, side: THREE.DoubleSide }),
    { amount: 0.14, height: 0.75, instanced: true });
  const mesh = new THREE.InstancedMesh(bladeGeometry(), mat, count);
  mesh.receiveShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let n = 0;
  for (let tries = 0; n < count && tries < count * 3; tries++) {
    const at = place(rand);
    if (!at) continue;
    q.setFromAxisAngle(up, rand() * Math.PI);
    const k = 0.55 + rand() * 0.5;
    s.set(k, k * (0.7 + rand() * 0.6), k);
    m.compose(p.set(at.x, at.y, at.z), q, s);
    mesh.setMatrixAt(n++, m);
  }
  mesh.count = n;
  scene.add(mesh);
  return mesh;
}

// Small flowers scattered in the grass
export function createFlowers(scene, count, place, rand) {
  if (!count) return null;
  const geo = new THREE.OctahedronGeometry(0.09, 0);
  geo.translate(0, 0.35, 0);
  const mat = addWind(toon(), { amount: 0.08, height: 0.4, instanced: true });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const colors = [0xff6f91, 0xffd23f, 0xffffff, 0xc77dff].map(c => new THREE.Color(c));
  const m = new THREE.Matrix4();
  let n = 0;
  for (let tries = 0; n < count && tries < count * 3; tries++) {
    const at = place(rand);
    if (!at) continue;
    m.makeTranslation(at.x, at.y, at.z);
    mesh.setMatrixAt(n, m);
    mesh.setColorAt(n, colors[Math.floor(rand() * colors.length)]);
    n++;
  }
  mesh.count = n;
  scene.add(mesh);
  return mesh;
}
