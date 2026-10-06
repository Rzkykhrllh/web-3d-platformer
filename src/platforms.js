import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { crumblers, movers } from './level.js';

// Crumbling and moving platforms: a mesh plus a live surface in the world.

const CRUMBLE_DELAY = 0.6, CRUMBLE_RESPAWN = 3;

function plankMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0x9c6b3a, roughness: 0.85 });
}

function platformMesh(w, d, material) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, 0.5, d, 2, 0.06), material);
  body.position.y = -0.25;
  body.castShadow = body.receiveShadow = true;
  g.add(body);
  // Plank lines and rope bindings
  const lineMat = new THREE.MeshStandardMaterial({ color: 0x5e3a1a });
  for (let i = 1; i < 4; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.04, 0.05), lineMat);
    line.position.set(0, 0.005, -d / 2 + (d * i) / 4);
    g.add(line);
  }
  const rope = new THREE.MeshStandardMaterial({ color: 0xd8c08a });
  [-1, 1].forEach(s => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 12), rope);
    r.rotation.y = Math.PI / 2;
    r.position.set(s * (w / 2 - 0.3), -0.25, 0);
    r.scale.set(1, 0.9, (d + 0.1) / 0.56);
    g.add(r);
  });
  return g;
}

export function createPlatforms(scene, world, stoneMaterial, events) {
  const list = [];

  for (const c of crumblers) {
    const w = c.x1 - c.x0, d = c.z1 - c.z0;
    const mesh = platformMesh(w, d, stoneMaterial ?? plankMaterial());
    const home = new THREE.Vector3((c.x0 + c.x1) / 2, c.top, (c.z0 + c.z1) / 2);
    mesh.position.copy(home);
    scene.add(mesh);
    const p = { kind: 'crumble', mesh, home, state: 'idle', timer: 0, vy: 0 };
    p.surface = world.addSurface({ ...c, bottom: c.top - 0.5, onStand: () => { if (p.state === 'idle') { p.state = 'shaking'; p.timer = CRUMBLE_DELAY; events.crumble?.(home); } } });
    list.push(p);
  }

  for (const m of movers) {
    const w = m.x1 - m.x0, d = m.z1 - m.z0;
    const mesh = platformMesh(w, d, plankMaterial());
    const home = new THREE.Vector3((m.x0 + m.x1) / 2, m.top, (m.z0 + m.z1) / 2);
    mesh.position.copy(home);
    scene.add(mesh);
    const p = { kind: 'move', mesh, home, axis: m.axis, range: m.range, speed: m.speed, w, d };
    p.surface = world.addSurface({ ...m, bottom: m.top - 0.5 });
    list.push(p);
  }

  function setBounds(s, cx, cy, cz, w, d) {
    s.x0 = cx - w / 2; s.x1 = cx + w / 2; s.z0 = cz - d / 2; s.z1 = cz + d / 2;
    s.top = cy; s.bottom = cy - 0.5;
  }

  function update(dt, t) {
    for (const p of list) {
      const s = p.surface;
      s.dx = s.dy = s.dz = 0;
      if (p.kind === 'move') {
        const off = Math.sin(t * p.speed) * p.range;
        const cx = p.home.x + (p.axis === 'x' ? off : 0);
        const cz = p.home.z + (p.axis === 'z' ? off : 0);
        s.dx = cx - (s.x0 + s.x1) / 2;
        s.dz = cz - (s.z0 + s.z1) / 2;
        setBounds(s, cx, p.home.y, cz, p.w, p.d);
        p.mesh.position.set(cx, p.home.y, cz);
        continue;
      }
      // Crumbling
      if (p.state === 'shaking') {
        p.timer -= dt;
        p.mesh.position.set(p.home.x + (Math.random() - 0.5) * 0.08, p.home.y, p.home.z + (Math.random() - 0.5) * 0.08);
        if (p.timer <= 0) { p.state = 'falling'; p.timer = CRUMBLE_RESPAWN; p.vy = 0; s.active = false; events.crumbleFall?.(p.home); }
      } else if (p.state === 'falling') {
        p.timer -= dt;
        p.vy -= 20 * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.rotation.x += dt * 0.6;
        if (p.timer <= 0) {
          p.state = 'idle'; s.active = true;
          p.mesh.position.copy(p.home); p.mesh.rotation.set(0, 0, 0);
          p.mesh.scale.setScalar(0.01);
        }
      } else if (p.mesh.scale.x < 1) {
        p.mesh.scale.setScalar(Math.min(1, p.mesh.scale.x + dt * 4));
      }
    }
  }

  function reset() {
    for (const p of list) {
      if (p.kind !== 'crumble') continue;
      p.state = 'idle'; p.surface.active = true;
      p.mesh.position.copy(p.home); p.mesh.rotation.set(0, 0, 0); p.mesh.scale.setScalar(1);
    }
  }

  return { update, reset };
}
