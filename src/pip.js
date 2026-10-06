import * as THREE from 'three';
import { mat, mesh } from './util.js';

// Pip, the placeholder runner. Faces +z by default.
export function createPip() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const green = mat(0x5bc17a, { roughness: 0.6 });
  const torso = mesh(new THREE.SphereGeometry(0.62, 18, 14), green);
  torso.scale.set(1, 0.92, 1); torso.position.y = 0.66;
  body.add(torso);
  const belly = mesh(new THREE.SphereGeometry(0.42, 14, 10), mat(0xe9f7c8, { roughness: 0.6 }), false, false);
  belly.scale.set(1, 1, 0.5); belly.position.set(0, 0.58, 0.38);
  body.add(belly);

  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.2 });
  [-0.22, 0.22].forEach(ex => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), white);
    eye.position.set(ex, 0.92, 0.44);
    body.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), black);
    pupil.position.set(ex * 1.05, 0.92, 0.61);
    body.add(pupil);
  });
  const stem = mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.35, 6), mat(0x3e7a2a));
  stem.position.set(0, 1.38, 0);
  body.add(stem);
  [-1, 1].forEach(s => {
    const leaf = mesh(new THREE.SphereGeometry(0.2, 8, 6), mat(0x8ad35a));
    leaf.scale.set(1.4, 0.3, 0.7);
    leaf.position.set(0.18 * s, 1.55, 0);
    leaf.rotation.z = 0.5 * s;
    body.add(leaf);
  });

  const feet = [-0.27, 0.27].map(fx => {
    const f = mesh(new THREE.SphereGeometry(0.19, 10, 8), mat(0x3e9b5d));
    f.scale.set(1, 0.6, 1.3);
    f.position.set(fx, 0.1, 0.08);
    root.add(f);
    return f;
  });

  // Swirl shown while spinning
  const swirl = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.07, 6, 28),
    new THREE.MeshBasicMaterial({ color: 0xfff3d1, transparent: true, opacity: 0 })
  );
  swirl.rotation.x = Math.PI / 2;
  swirl.position.y = 0.7;
  root.add(swirl);

  return { root, body, feet, swirl };
}
