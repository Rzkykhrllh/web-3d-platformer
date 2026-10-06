import * as THREE from 'three';
import { toon } from './render/toon.js';

export const mat = (color, opts = {}) =>
  toon(Object.assign({ color, flatShading: true }, opts));

export const mesh = (geo, material, cast = true, receive = true) => {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
};

// URL of a file in public/, wherever the game is served from (see `base` in vite.config.js)
export const publicUrl = path => (/^([a-z]+:|\/)/i.test(path) ? path : import.meta.env.BASE_URL + path);

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
