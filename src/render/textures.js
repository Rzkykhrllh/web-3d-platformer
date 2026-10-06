import * as THREE from 'three';
import { toon } from './toon.js';

// Procedural, tileable color textures drawn on a canvas at startup. The noise is
// posterized into a few flat bands for a painted, cartoon look (no normal maps).
// Placeholders until hand-painted stylized textures are added.

function rng(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

// Value noise that wraps at the edges, so the texture tiles without seams
function tileNoise(size, cells, rand) {
  const grid = Array.from({ length: cells * cells }, rand);
  const out = new Float32Array(size * size);
  const fade = t => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) {
    const gy = (y / size) * cells, y0 = Math.floor(gy), ty = fade(gy - y0);
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * cells, x0 = Math.floor(gx), tx = fade(gx - x0);
      const a = grid[(y0 % cells) * cells + (x0 % cells)];
      const b = grid[(y0 % cells) * cells + ((x0 + 1) % cells)];
      const c = grid[((y0 + 1) % cells) * cells + (x0 % cells)];
      const d = grid[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)];
      out[y * size + x] = (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
    }
  }
  return out;
}

function fbm(size, baseCells, octaves, rand, ridged = false) {
  const out = new Float32Array(size * size);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = tileNoise(size, baseCells << o, rand);
    for (let i = 0; i < out.length; i++) out[i] += (ridged ? 1 - Math.abs(n[i] * 2 - 1) : n[i]) * amp;
    total += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function toTexture(size, fill, srgb) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  fill(img.data);
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Blend between colors by a 0..1 value
function ramp(stops, t) {
  t = Math.min(1, Math.max(0, t));
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1], [t1, c1] = stops[i];
      const k = (t - t0) / (t1 - t0);
      return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
    }
  }
  return stops[stops.length - 1][1];
}
const hex = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

function make(size, seed, { cells, octaves, ridged, stops, speckle = 0, speckleColor, bands = 5, extra }) {
  const rand = rng(seed);
  const h = fbm(size, cells, octaves, rand, ridged);
  const fine = tileNoise(size, size / 4, rand);
  if (extra) extra(h, size, rand);
  const map = toTexture(size, d => {
    for (let i = 0; i < h.length; i++) {
      const v = h[i] + (fine[i] - 0.5) * 0.12;
      let [r, g, b] = ramp(stops, Math.round(v * bands) / bands);
      if (speckle && rand() < speckle) [r, g, b] = speckleColor;
      d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
    }
  }, true);
  return { map };
}

export function createTextures(size = 256) {
  const t = {
    // Sand with wind ripples
    sand: make(size, 11, {
      cells: 4, octaves: 4,
      stops: [[0, hex(0xc4924c)], [0.45, hex(0xdcb06a)], [0.75, hex(0xe9c886)], [1, hex(0xf5dca6)]],
      speckle: 0.025, speckleColor: hex(0x9c7442),
      extra(h, s) {
        for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
          const i = y * s + x;
          const w = Math.sin((y / s) * Math.PI * 2 * 9 + h[i] * 6 + Math.sin((x / s) * Math.PI * 2 * 2) * 1.5);
          h[i] = h[i] * 0.8 + (w * 0.5 + 0.5) * 0.2;
        }
      }
    }),
    dirt: make(size, 23, {
      cells: 4, octaves: 4,
      stops: [[0, hex(0x8f6740)], [0.55, hex(0xb58a58)], [1, hex(0xc9a06c)]],
      speckle: 0.03, speckleColor: hex(0x6e5135)
    }),
    grass: make(size, 37, {
      cells: 3, octaves: 5,
      stops: [[0, hex(0x2f7f3a)], [0.45, hex(0x4a9e45)], [0.8, hex(0x6bb84f)], [1, hex(0x8fca5c)]],
      speckle: 0.015, speckleColor: hex(0xe7e27a)
    }),
    rock: make(size, 51, {
      cells: 3, octaves: 5, ridged: true,
      stops: [[0, hex(0x5f554c)], [0.5, hex(0x857a6e)], [0.85, hex(0xa0968a)], [1, hex(0xb8ae9f)]]
    }),
    // Stone blocks: noise plus darker mortar lines
    stone: make(size, 67, {
      cells: 4, octaves: 4,
      stops: [[0, hex(0x6c6258)], [0.5, hex(0x8c8174)], [1, hex(0xa69a8a)]],
      extra(h, s) {
        const rows = 4, cols = 2;
        for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
          const row = Math.floor((y / s) * rows);
          const off = row % 2 ? s / cols / 2 : 0;
          const lx = (x + off) % (s / cols), ly = y % (s / rows);
          if (lx < 3 || ly < 3) h[y * s + x] *= 0.35;
        }
      }
    })
  };
  return t;
}

// Material helper with world-size tiling
export function texturedMaterial(set, repeatX, repeatY, opts = {}) {
  const map = set.map.clone();
  map.repeat.set(repeatX, repeatY);
  map.needsUpdate = true;
  return toon(Object.assign({ map }, opts));
}
