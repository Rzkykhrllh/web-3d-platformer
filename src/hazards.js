import * as THREE from 'three';
import { toon } from './render/toon.js';

// Timed hazards: logs rolling toward the camera and fire vents in the floor.
// Both are pure functions of the simulation time, so they never drift and
// look the same behind the menu as in play. Touching either one hurts.

const mod = (a, n) => ((a % n) + n) % n;

function createLogs(scene, run) {
  const geo = new THREE.CylinderGeometry(run.radius, run.radius, 1, 16, 1);
  geo.rotateZ(Math.PI / 2); // axis along x, so rotation.x rolls it
  const bark = toon({ color: 0x7a4a26 });
  const rings = toon({ color: 0xd9a86a });
  const life = (run.to - run.from) / run.speed;
  // Enough meshes for every log that can be out at once
  const pool = Array.from({ length: Math.ceil(life / run.every) + 1 }, () => {
    const m = new THREE.Mesh(geo, [bark, rings, rings]);
    m.castShadow = true;
    m.visible = false;
    scene.add(m);
    return m;
  });
  const live = []; // { x0, x1, z } of logs that can hurt this step
  let lastSpawn = -1;

  function update(t, onSpawn) {
    live.length = 0;
    const newest = Math.floor(t / run.every);
    if (newest !== lastSpawn) { if (lastSpawn >= 0) onSpawn?.(); lastSpawn = newest; }
    pool.forEach((m, i) => {
      const k = newest - i;
      const age = t - k * run.every;
      if (k < 0 || age > life) { m.visible = false; return; }
      const [x0, x1] = run.lanes[k % run.lanes.length];
      const z = run.from + age * run.speed;
      // Grow out of the gate, sink at the end of the run
      const grow = Math.min(1, age / 0.3), sink = Math.max(0, age - (life - 0.5)) / 0.5;
      m.visible = true;
      m.position.set((x0 + x1) / 2, run.base + run.radius - sink * run.radius * 2, z);
      m.scale.set(x1 - x0, grow, grow);
      m.rotation.x = (age * run.speed) / run.radius;
      if (sink < 0.5) live.push({ x0, x1, z });
    });
  }

  // A little forgiving: feet just grazing the top of a log still clear it
  function touching(p, r) {
    if (p.y > run.base + run.radius * 1.3) return null;
    for (const l of live) {
      if (p.x + r > l.x0 && p.x - r < l.x1 && Math.abs(p.z - l.z) < run.radius + r * 0.5) return { x: p.x, z: l.z - 1 };
    }
    return null;
  }

  return { update, touching };
}

function createVents(scene, jets) {
  const grate = toon({ color: 0x3a2c24 });
  const warmGeo = new THREE.BoxGeometry(1, 0.06, 1);
  const flameGeo = new THREE.ConeGeometry(0.5, 1, 12, 1, true);
  flameGeo.translate(0, 0.5, 0);
  const outerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.22, 0.02), transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false, side: THREE.DoubleSide });
  const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 0.9, 0.12), toneMapped: false, depthWrite: false });
  const vents = jets.map(j => {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(j.size, 0.08, j.size), grate);
    plate.position.set(j.x, j.base + 0.04, j.z);
    plate.receiveShadow = true;
    // Inner glow that heats up during the warning
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
    const glow = new THREE.Mesh(warmGeo, glowMat);
    glow.scale.set(j.size * 0.7, 1, j.size * 0.7);
    glow.position.set(j.x, j.base + 0.06, j.z);
    // Orange outer flame with a hot yellow core
    const flame = new THREE.Mesh(flameGeo, outerMat);
    const core = new THREE.Mesh(flameGeo, coreMat);
    core.scale.set(0.5, 0.8, 0.5);
    core.renderOrder = 1;
    flame.add(core);
    flame.position.set(j.x, j.base, j.z);
    flame.visible = false;
    scene.add(plate, glow, flame);
    return { ...j, glow, flame, burning: false };
  });

  function update(t, onIgnite) {
    for (const v of vents) {
      const local = mod(t - v.phase, v.period);
      const wasBurning = v.burning;
      v.burning = local < v.on;
      if (v.burning && !wasBurning) onIgnite?.(v);
      const warn = local >= v.period - v.warn ? (local - (v.period - v.warn)) / v.warn : 0;
      const heat = v.burning ? 1 : warn * 0.8;
      v.glow.material.color.setRGB(1.6 * heat, 0.2 * heat, 0.02 * heat);
      v.flame.visible = v.burning || warn > 0.4;
      if (v.flame.visible) {
        // Full column while burning, a lick of flame at the end of the warning
        const h = v.burning ? 2.6 * Math.min(1, local / 0.12) * (1 - Math.max(0, local - (v.on - 0.15)) / 0.15) : 0.35 * warn;
        const flicker = 1 + Math.sin(t * 40 + v.x) * 0.08;
        v.flame.scale.set(v.size * 0.75 * flicker, Math.max(0.01, h), v.size * 0.75 * flicker);
        v.flame.rotation.y = t * 3 + v.x;
      }
    }
  }

  function touching(p, r) {
    for (const v of vents) {
      if (!v.burning || p.y > v.base + 2.2) continue;
      const half = v.size / 2 + r * 0.5;
      if (Math.abs(p.x - v.x) < half && Math.abs(p.z - v.z) < half) return { x: v.x, z: v.z };
    }
    return null;
  }

  return { update, touching, vents };
}

// `level.logRun` and `level.fireJets` are optional; levels without them get no hazards
export function createHazards(scene, level, events = {}) {
  const logs = level.logRun ? createLogs(scene, level.logRun) : null;
  const vents = level.fireJets?.length ? createVents(scene, level.fireJets) : null;
  return {
    update(t) {
      logs?.update(t, () => events.logSpawn?.(level.logRun));
      vents?.update(t, v => events.ignite?.(v));
    },
    // Where the hit came from, or null if p (radius r) is clear
    touching(p, r) { return logs?.touching(p, r) ?? vents?.touching(p, r) ?? null; }
  };
}
