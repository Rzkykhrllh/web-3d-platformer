import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toon } from './render/toon.js';

// Crumbling and moving platforms: a mesh plus a live surface in the world.

const CRUMBLE_DELAY = 0.6, CRUMBLE_RESPAWN = 3;

function plankMaterial() {
  return toon({ color: 0x9c6b3a });
}

function platformMesh(w, d, material) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, 0.5, d, 2, 0.06), material);
  body.position.y = -0.25;
  body.castShadow = body.receiveShadow = true;
  g.add(body);
  // Plank lines and rope bindings
  const lineMat = toon({ color: 0x5e3a1a });
  for (let i = 1; i < 4; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.04, 0.05), lineMat);
    line.position.set(0, 0.005, -d / 2 + (d * i) / 4);
    g.add(line);
  }
  const rope = toon({ color: 0xd8c08a });
  [-1, 1].forEach(s => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 12), rope);
    r.rotation.y = Math.PI / 2;
    r.position.set(s * (w / 2 - 0.3), -0.25, 0);
    r.scale.set(1, 0.9, (d + 0.1) / 0.56);
    g.add(r);
  });
  return g;
}

// `crumblers` and `movers` are boxes {x0, x1, z0, z1, top}. An entry may bring its own
// `mesh` (from a Blender level); otherwise a wooden platform is generated.
export function createPlatforms(scene, world, { crumblers = [], movers = [] }, events) {
  const list = [];

  for (const c of crumblers) {
    const w = c.x1 - c.x0, d = c.z1 - c.z0;
    const home = new THREE.Vector3((c.x0 + c.x1) / 2, c.top, (c.z0 + c.z1) / 2);
    const { mesh, offset } = placeMesh(c.mesh, w, d, home);
    const p = { kind: 'crumble', mesh, home, offset, state: 'idle', timer: 0, vy: 0 };
    p.surface = world.addSurface({ x0: c.x0, x1: c.x1, z0: c.z0, z1: c.z1, top: c.top, bottom: c.top - 0.5, onStand: () => { if (p.state === 'idle') { p.state = 'shaking'; p.timer = CRUMBLE_DELAY; events.crumble?.(home); } } });
    list.push(p);
  }

  for (const m of movers) {
    const w = m.x1 - m.x0, d = m.z1 - m.z0;
    const home = new THREE.Vector3((m.x0 + m.x1) / 2, m.top, (m.z0 + m.z1) / 2);
    const { mesh, offset } = placeMesh(m.mesh, w, d, home);
    const p = { kind: 'move', mesh, home, offset, axis: m.axis ?? 'x', range: m.range ?? 2.5, speed: m.speed ?? 0.8, w, d };
    p.surface = world.addSurface({ x0: m.x0, x1: m.x1, z0: m.z0, z1: m.z1, top: m.top, bottom: m.top - 0.5 });
    list.push(p);
  }

  // Use the given mesh where it already is, or make one; offset keeps the mesh's own origin
  function placeMesh(given, w, d, home) {
    const mesh = given ?? platformMesh(w, d, plankMaterial());
    if (!given) { mesh.position.copy(home); scene.add(mesh); }
    return { mesh, offset: mesh.position.clone().sub(home) };
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
        const cy = p.home.y + (p.axis === 'y' ? off : 0);
        const cz = p.home.z + (p.axis === 'z' ? off : 0);
        s.dx = cx - (s.x0 + s.x1) / 2;
        s.dy = cy - s.top;
        s.dz = cz - (s.z0 + s.z1) / 2;
        setBounds(s, cx, cy, cz, p.w, p.d);
        p.mesh.position.set(cx, cy, cz).add(p.offset);
        continue;
      }
      // Crumbling
      if (p.state === 'shaking') {
        p.timer -= dt;
        p.mesh.position.set(p.home.x + (Math.random() - 0.5) * 0.08, p.home.y, p.home.z + (Math.random() - 0.5) * 0.08).add(p.offset);
        if (p.timer <= 0) { p.state = 'falling'; p.timer = CRUMBLE_RESPAWN; p.vy = 0; s.active = false; events.crumbleFall?.(p.home); }
      } else if (p.state === 'falling') {
        p.timer -= dt;
        p.vy -= 20 * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.rotation.x += dt * 0.6;
        if (p.timer <= 0) {
          p.state = 'idle'; s.active = true;
          p.mesh.position.copy(p.home).add(p.offset); p.mesh.rotation.set(0, 0, 0);
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
      p.mesh.position.copy(p.home).add(p.offset); p.mesh.rotation.set(0, 0, 0); p.mesh.scale.setScalar(1);
    }
  }

  return { update, reset };
}
