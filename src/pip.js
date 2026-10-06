import * as THREE from 'three';

// Pip, the placeholder runner. Faces +z by default.
// Smooth shading plus an inverted-hull outline gives a cartoon read from far away.
export function createPip() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const smooth = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1d3a22, side: THREE.BackSide });
  const add = (geo, material, parent = body, outline = 0) => {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = true;
    parent.add(m);
    if (outline) {
      const o = new THREE.Mesh(geo, outlineMat);
      o.scale.setScalar(1 + outline);
      m.add(o);
    }
    return m;
  };

  const green = smooth(0x5bc17a);
  const torso = add(new THREE.SphereGeometry(0.62, 32, 24), green, body, 0.05);
  torso.scale.set(1, 0.92, 1); torso.position.y = 0.66;
  const belly = add(new THREE.SphereGeometry(0.42, 24, 16), smooth(0xe9f7c8));
  belly.scale.set(1, 1, 0.5); belly.position.set(0, 0.58, 0.38);
  belly.castShadow = false;

  // Cheeks
  [-1, 1].forEach(s => {
    const cheek = add(new THREE.SphereGeometry(0.09, 12, 8), smooth(0xff9a8a, { roughness: 0.8 }));
    cheek.scale.set(1, 0.6, 0.4);
    cheek.position.set(s * 0.36, 0.74, 0.5);
  });

  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const black = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.1 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [-0.22, 0.22].forEach(ex => {
    const eye = add(new THREE.SphereGeometry(0.19, 20, 14), white, body, 0.08);
    eye.position.set(ex, 0.92, 0.44);
    const pupil = add(new THREE.SphereGeometry(0.1, 16, 12), black);
    pupil.position.set(ex * 1.05, 0.93, 0.6);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), shine);
    glint.position.set(ex * 1.05 + 0.04, 0.98, 0.69);
    body.add(glint);
  });
  const stem = add(new THREE.CylinderGeometry(0.04, 0.05, 0.35, 8), smooth(0x3e7a2a));
  stem.position.set(0, 1.38, 0);
  [-1, 1].forEach(s => {
    const leaf = add(new THREE.SphereGeometry(0.2, 16, 10), smooth(0x8ad35a), body, 0.06);
    leaf.scale.set(1.4, 0.3, 0.7);
    leaf.position.set(0.18 * s, 1.55, 0);
    leaf.rotation.z = 0.5 * s;
  });

  const feet = [-0.27, 0.27].map(fx => {
    const f = add(new THREE.SphereGeometry(0.19, 16, 12), smooth(0x3e9b5d), root, 0.08);
    f.scale.set(1, 0.6, 1.3);
    f.position.set(fx, 0.1, 0.08);
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
