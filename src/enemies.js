import * as THREE from 'three';
import { mat, mesh } from './util.js';

// Crabs patrol back and forth along x. Stomp or spin to defeat; touching one hurts.

function crabModel() {
  const g = new THREE.Group();
  const shell = mat(0xe8553a, { flatShading: false, roughness: 0.5 });
  const dark = mat(0xb63a24, { flatShading: false, roughness: 0.6 });
  const body = mesh(new THREE.SphereGeometry(0.5, 20, 14), shell);
  body.scale.set(1.2, 0.6, 0.9); body.position.y = 0.42;
  g.add(body);
  const legs = [];
  [-1, 1].forEach(side => {
    for (let i = 0; i < 3; i++) {
      const leg = mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.5, 6), dark);
      leg.position.set(side * (0.45 + i * 0.05), 0.22, -0.25 + i * 0.25);
      leg.rotation.z = side * 0.9;
      g.add(leg); legs.push(leg);
    }
    const arm = new THREE.Group();
    arm.position.set(side * 0.55, 0.45, 0.35);
    const claw = mesh(new THREE.SphereGeometry(0.2, 12, 10), shell);
    claw.scale.set(1, 0.75, 1.2); claw.position.set(side * 0.15, 0.12, 0.15);
    arm.add(claw);
    g.add(arm); legs.push(arm);
    // Eyes on stalks
    const stalk = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), dark);
    stalk.position.set(side * 0.18, 0.78, 0.2);
    g.add(stalk);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
    eye.position.set(side * 0.18, 0.95, 0.22);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    pupil.position.set(0, 0, 0.06);
    eye.add(pupil);
    g.add(eye);
  });
  return { root: g, legs };
}

export function createEnemies(scene) {
  const list = [];

  function add({ x0, x1, z, y, speed = 2.2 }) {
    const m = crabModel();
    m.root.position.set((x0 + x1) / 2, y, z);
    scene.add(m.root);
    list.push({ ...m, x0, x1, z, y, speed, dir: 1, alive: true, dying: 0, t: Math.random() * 6, spawn: (x0 + x1) / 2 });
    return list[list.length - 1];
  }

  function defeat(e, awayX, awayZ) {
    e.alive = false;
    e.dying = 1;
    e.fly = new THREE.Vector3(awayX * 6, 9, awayZ * 6 - 4);
  }

  function update(dt) {
    for (const e of list) {
      e.t += dt;
      if (!e.alive) {
        if (e.dying <= 0) continue;
        e.dying -= dt * 0.8;
        e.fly.y -= 25 * dt;
        e.root.position.addScaledVector(e.fly, dt);
        e.root.rotation.x += dt * 12;
        if (e.dying <= 0) e.root.visible = false;
        continue;
      }
      const p = e.root.position;
      p.x += e.dir * e.speed * dt;
      if (p.x > e.x1) { p.x = e.x1; e.dir = -1; }
      if (p.x < e.x0) { p.x = e.x0; e.dir = 1; }
      // Scuttle: crabs walk sideways, so they face the camera and waddle
      e.root.rotation.z = Math.sin(e.t * 14) * 0.08;
      p.y = e.y + Math.abs(Math.sin(e.t * 14)) * 0.05;
      e.legs.forEach((l, i) => { l.rotation.x = Math.sin(e.t * 14 + i) * 0.4; });
    }
  }

  function reset() {
    for (const e of list) {
      e.alive = true; e.dying = 0; e.root.visible = true;
      e.root.position.set(e.spawn, e.y, e.z); e.root.rotation.set(0, 0, 0);
    }
  }

  return { list, add, defeat, update, reset };
}
