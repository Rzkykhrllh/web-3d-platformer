import * as THREE from 'three';

export const mat = (color, opts = {}) =>
  new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.9 }, opts));

export const mesh = (geo, material, cast = true, receive = true) => {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
};

// Seeded random so the level looks the same on every load
export function seededRandom(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

// Small square canvas turned into a texture
export function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
