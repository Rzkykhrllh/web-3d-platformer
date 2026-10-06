import * as THREE from 'three';

// Cartoon shading: every lit surface uses MeshToonMaterial with the same
// three-band light ramp, so light falls off in clean steps instead of a
// smooth PBR gradient. Cheaper than MeshStandardMaterial too (no specular, no env map).

const ramp = new THREE.DataTexture(new Uint8Array([90, 180, 255]), 3, 1, THREE.RedFormat);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
ramp.generateMipmaps = false;
ramp.needsUpdate = true;
export const TOON_RAMP = ramp;

// PBR-only options callers may still pass; MeshToonMaterial would warn about them
const IGNORED = ['roughness', 'metalness', 'envMapIntensity', 'flatShading'];

export function toon(params = {}) {
  const opts = { gradientMap: ramp, ...params };
  for (const k of IGNORED) delete opts[k];
  const m = new THREE.MeshToonMaterial(opts);
  // Toon supports flat shading through the shared shader chunks, it just isn't a constructor option
  if (params.flatShading) m.flatShading = true;
  return m;
}
