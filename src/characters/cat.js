import * as THREE from 'three';
import { canvasTexture } from '../util.js';
import { toon } from '../render/toon.js';

// Tabby cat in a red Hawaiian shirt, built from simple shapes after the
// reference art. Faces +z. Same interface as createPip:
//   root   - placed and turned by the player controller
//   body   - bobs, leans, squashes and spins
//   feet   - two groups swung for walking (sole sits at local y = -0.1)
//   arms   - two groups swung opposite to the legs
//   swirl  - spin effect ring

const C = {
  fur: 0x9a9a9a,
  furDark: 0x4f4f4f,
  furLight: 0xe9e9e6,
  shirt: 0xb3202c,
  tee: 0xf4f2ee,
  shorts: 0xc9b48a,
  belt: 0xd8c08f,
  gold: 0xd4a73a,
  sandal: 0x6b4428,
  gem: 0x1fbf73
};

// Grey fur with tabby markings. `head` maps onto a three.js sphere (the face
// is at u = 0.25): an "M" of stripes on the forehead and stripes running down
// from the crown everywhere else. Limbs get a few broken streaks, not rings.
function tabbyTexture(head = false) {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#4f4f4f';
    const stripe = (x, w, len, bend = 0) => {
      ctx.beginPath();
      ctx.moveTo(x - w, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + bend, s * len);
      ctx.closePath(); ctx.fill();
    };
    if (head) {
      const face = s * 0.25;
      for (const [dx, w, len] of [[0, 8, 0.5], [-14, 6, 0.44], [14, 6, 0.44], [-28, 5, 0.38], [28, 5, 0.38], [-42, 4, 0.3], [42, 4, 0.3]]) {
        stripe(face + dx, w, len, dx * 0.2);
      }
      // Down the sides and back of the head, longest at the back (u = 0.75)
      for (let u = 0.4; u <= 1.1; u += 0.055) {
        const back = 1 - Math.min(1, Math.abs(u - 0.75) / 0.35);
        stripe((u % 1) * s, 5 + back * 3, 0.32 + back * 0.3, Math.sin(u * 20) * 6);
      }
    } else {
      // Short wavy streaks scattered around, so a cylinder doesn't read as striped socks
      const rand = (() => { let k = 7; return () => (k = (k * 16807) % 2147483647) / 2147483647; })();
      for (let i = 0; i < 9; i++) {
        const y = s * (0.08 + i * 0.105), x0 = rand() * s, len = s * (0.25 + rand() * 0.2);
        ctx.beginPath();
        for (let x = 0; x <= len; x += 8) ctx.lineTo(x0 + x, y + Math.sin(x * 0.06) * 4);
        for (let x = len; x >= 0; x -= 8) ctx.lineTo(x0 + x, y + 7 * Math.sin(Math.PI * x / len) + Math.sin(x * 0.06 + 1) * 3);
        ctx.fill();
        // Wrap around the seam
        ctx.save(); ctx.translate(-s, 0); ctx.fill(); ctx.restore();
      }
    }
  });
}

// Shoulder part of the mane: grey with stripes running down from the neck
function capeTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#4f4f4f';
    for (let i = 0; i < 9; i++) {
      const x = s * (0.06 + i * 0.11), w = 6 + (i % 3) * 2;
      ctx.beginPath();
      ctx.moveTo(x - w, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + Math.sin(i * 2) * 8, s * (0.55 + (i % 2) * 0.2));
      ctx.closePath(); ctx.fill();
    }
  });
}

// One strand of the mane: cape grey at the root, fading to white at the tip.
// A cone's v runs 0 at the wide base to 1 at the apex; the canvas top is v = 1.
function strandTexture() {
  return canvasTexture(128, (ctx, s) => {
    const g = ctx.createLinearGradient(0, s, 0, 0);
    g.addColorStop(0, '#9a9a9a'); g.addColorStop(0.4, '#a8a8a6'); g.addColorStop(0.68, '#f2f2f0'); g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  });
}

// Red shirt with white palm tree prints
function shirtTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#b3202c'; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ffffff';
    const palm = (x, y, k) => {
      ctx.lineWidth = 4 * k;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 6 * k, y - 22 * k, x + 2 * k, y - 44 * k); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.55;
        ctx.beginPath();
        ctx.ellipse(x + 2 * k + Math.cos(a) * 12 * k, y - 44 * k + Math.sin(a) * 6 * k + 6 * k, 14 * k, 3.5 * k, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath(); ctx.ellipse(x, y + 3 * k, 22 * k, 5 * k, 0, 0, Math.PI * 2); ctx.fill();
    };
    palm(s * 0.25, s * 0.6, 1.2);
    palm(s * 0.75, s * 0.85, 1);
    palm(s * 0.7, s * 0.3, 0.8);
  });
}

export function createCat() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const std = (color, extra = {}) => toon({ color, ...extra });
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1e1e22, side: THREE.BackSide });
  const add = (parent, geo, material, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], outline = 0, shadow = true } = {}) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scale);
    m.castShadow = shadow;
    parent.add(m);
    if (outline) {
      const o = new THREE.Mesh(geo, outlineMat);
      o.scale.setScalar(1 + outline);
      m.add(o);
    }
    return m;
  };

  const fur = std(0xffffff, { map: tabbyTexture() });
  const furHead = std(0xffffff, { map: tabbyTexture(true) });
  const furLight = std(C.furLight);
  const shirtMap = shirtTexture();
  shirtMap.wrapS = THREE.RepeatWrapping;
  shirtMap.repeat.set(4, 1);
  const shirt = std(0xffffff, { map: shirtMap, side: THREE.DoubleSide });
  const plainFur = std(C.fur);
  const tee = std(C.tee);
  const shorts = std(C.shorts);
  const gold = std(C.gold);
  const black = std(0x111111);
  const white = std(0xffffff);

  // Torso: white tee under an open red shirt
  add(body, new THREE.CylinderGeometry(0.27, 0.3, 0.42, 12), tee, { pos: [0, 0.98, 0], outline: 0.04 });
  // Open at the front (theta 0 is +z), so the white tee shows through
  const shirtGeo = new THREE.CylinderGeometry(0.31, 0.34, 0.44, 16, 1, true, Math.PI * 0.12, Math.PI * 1.76);
  add(body, shirtGeo, shirt, { pos: [0, 0.97, 0] });
  // Lapels
  [-1, 1].forEach(s => {
    const lapel = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.11 * s, -0.02), new THREE.Vector2(0.02 * s, -0.17)]);
    add(body, new THREE.ShapeGeometry(lapel), shirt, { pos: [0.07 * s, 1.18, 0.29], rot: [-0.2, 0, 0] });
    // Short sleeves
    add(body, new THREE.CylinderGeometry(0.11, 0.13, 0.18, 10), shirt, { pos: [0.36 * s, 1.08, 0], rot: [0, 0, s * 0.5] });
  });
  // Buttons down each shirt edge
  for (let i = 0; i < 3; i++) add(body, new THREE.SphereGeometry(0.018, 6, 4), white, { pos: [0.14, 1.08 - i * 0.11, 0.3], shadow: false });

  // Belt with buckle, key and shell charm
  add(body, new THREE.TorusGeometry(0.3, 0.035, 6, 20), std(C.belt), { pos: [0, 0.76, 0], rot: [Math.PI / 2, 0, 0] });
  add(body, new THREE.BoxGeometry(0.1, 0.07, 0.03), gold, { pos: [0, 0.76, 0.31] });
  const key = new THREE.Group();
  key.position.set(0.17, 0.72, 0.27);
  add(key, new THREE.TorusGeometry(0.025, 0.007, 4, 10), gold);
  add(key, new THREE.CylinderGeometry(0.008, 0.008, 0.09, 4), gold, { pos: [0, -0.07, 0] });
  add(key, new THREE.BoxGeometry(0.025, 0.018, 0.008), gold, { pos: [0.01, -0.11, 0] });
  body.add(key);
  add(body, new THREE.SphereGeometry(0.03, 8, 6), std(0xf2d9b8), { pos: [0.21, 0.71, 0.26], scale: [1, 0.8, 0.5] });

  // Cargo shorts
  add(body, new THREE.CylinderGeometry(0.31, 0.33, 0.2, 14), shorts, { pos: [0, 0.65, 0], outline: 0.03 });
  [-1, 1].forEach(s => {
    add(body, new THREE.CylinderGeometry(0.16, 0.18, 0.24, 10), shorts, { pos: [0.15 * s, 0.47, 0], outline: 0.04 });
    add(body, new THREE.BoxGeometry(0.04, 0.11, 0.12), std(0xb59e74), { pos: [0.33 * s, 0.5, 0.02] });
  });

  // Head: wide, slightly squashed, tabby stripes on the forehead
  const head = new THREE.Group();
  head.position.set(0, 1.5, 0.02);
  body.add(head);
  add(head, new THREE.SphereGeometry(0.42, 14, 10), furHead, { scale: [1.18, 0.92, 0.95], outline: 0.035 });
  // Pale muzzle and cheek fluff
  add(head, new THREE.SphereGeometry(0.2, 12, 8), std(0xd6d6d2), { pos: [0, -0.2, 0.27], scale: [1.05, 0.55, 0.65] });
  [-1, 1].forEach(s => {
    for (let i = 0; i < 3; i++) {
      add(head, new THREE.ConeGeometry(0.09, 0.34, 4), i === 0 ? plainFur : furLight, {
        pos: [s * (0.47 + i * 0.02), -0.12 - i * 0.1, 0.1], rot: [0, 0, s * (1.75 + i * 0.3)]
      });
    }
    // Ears: tall, pointing up and out, pale inside
    const ear = new THREE.Group();
    ear.position.set(s * 0.27, 0.3, -0.02);
    ear.rotation.set(0, 0, -s * 0.38);
    add(ear, new THREE.ConeGeometry(0.17, 0.5, 4), plainFur, { pos: [0, 0.2, 0], rot: [0, Math.PI / 4, 0], outline: 0.05 });
    add(ear, new THREE.ConeGeometry(0.1, 0.34, 3), std(0xc9c9c5), { pos: [0, 0.16, 0.07], rot: [0.12, 0, 0], shadow: false });
    head.add(ear);
    // Big eyes: dark rim, white, thin diamond pupil
    const eye = new THREE.Group();
    eye.position.set(s * 0.17, 0.02, 0.36);
    eye.rotation.y = s * 0.28;
    add(eye, new THREE.SphereGeometry(0.107, 14, 10), black, { scale: [1, 1.18, 0.35], shadow: false });
    add(eye, new THREE.SphereGeometry(0.1, 14, 10), white, { pos: [0, 0, 0.012], scale: [1, 1.18, 0.35], shadow: false });
    add(eye, new THREE.OctahedronGeometry(0.05, 0), black, { pos: [s * -0.01, 0, 0.04], scale: [0.42, 1.9, 0.3], shadow: false });
    head.add(eye);
  });
  // Nose and the "w" mouth
  add(head, new THREE.ConeGeometry(0.035, 0.04, 3), black, { pos: [0, -0.09, 0.44], rot: [-Math.PI / 2, 0, Math.PI], shadow: false });
  [-1, 1].forEach(s => {
    add(head, new THREE.TorusGeometry(0.035, 0.008, 4, 10, Math.PI), black, {
      pos: [s * 0.035, -0.15, 0.43], rot: [0, 0, Math.PI], shadow: false
    });
  });

  // Mane: long fur from the back of the head. Grey and striped over the
  // shoulders, then fanning out into white spikes around the hips. The middle
  // strands are short, so the shirt shows at the waist like in the art.
  const strandMat = toon({ map: strandTexture(), side: THREE.DoubleSide });
  const strand = (len, width) => {
    const g = new THREE.ConeGeometry(width, len, 5, 1);
    g.rotateX(Math.PI);          // apex down
    g.translate(0, -len / 2, 0); // root at the origin
    g.scale(1, 1, 0.75);         // a bit flattened, but still has volume from the side
    return g;
  };
  // Shoulder cape the strands grow out of
  add(body, new THREE.CylinderGeometry(0.33, 0.48, 0.4, 18, 1, true, Math.PI * 0.42, Math.PI * 1.16), std(0xffffff, { map: capeTexture(), side: THREE.DoubleSide }), {
    pos: [0, 1.25, -0.04], rot: [-0.22, 0, 0]
  });
  const mane = new THREE.Group();
  mane.position.set(0, 1.38, -0.22);
  body.add(mane);
  [-1, 1].forEach(s => {
    // [fan angle from straight down, length, width, root x]
    [[0.1, 0.45, 0.2, 0.07], [0.28, 0.95, 0.24, 0.13], [0.48, 1.15, 0.27, 0.18], [0.7, 1.2, 0.27, 0.23], [0.92, 1.05, 0.23, 0.27], [1.12, 0.8, 0.19, 0.3]]
      .forEach(([a, len, w, x], i) => {
        add(mane, strand(len, w), strandMat, { pos: [s * x, -i * 0.02, -0.02 * i], rot: [0.42 + i * 0.03, 0, s * a] });
      });
    // A second layer in between for a fuller fan
    [[0.38, 0.9, 0.21, 0.15], [0.82, 0.95, 0.21, 0.25]].forEach(([a, len, w, x]) => {
      add(mane, strand(len, w), strandMat, { pos: [s * x, 0.04, 0.03], rot: [0.36, 0, s * a] });
    });
  });

  // Arms hang from the shoulders; one paw holds the gold ring with a green gem
  const arms = [-1, 1].map(s => {
    const arm = new THREE.Group();
    arm.position.set(0.37 * s, 1.08, 0);
    arm.rotation.z = s * 0.12;
    add(arm, new THREE.CylinderGeometry(0.075, 0.065, 0.42, 8), fur, { pos: [0, -0.24, 0], outline: 0.05 });
    add(arm, new THREE.SphereGeometry(0.085, 10, 8), std(0xc4c4c0), { pos: [0, -0.48, 0.02], scale: [1, 1.1, 1.1], outline: 0.05 });
    if (s < 0) {
      const ring = new THREE.Group();
      ring.position.set(-0.05, -0.62, 0.06);
      ring.rotation.set(0.3, 0.4, 0.2);
      add(ring, new THREE.TorusGeometry(0.17, 0.014, 6, 24), gold);
      add(ring, new THREE.OctahedronGeometry(0.045, 0), std(C.gem, { emissive: C.gem, emissiveIntensity: 0.6 }), { pos: [0, -0.18, 0] });
      arm.add(ring);
    }
    body.add(arm);
    return arm;
  });

  // Legs and sandals; the group origin sits 0.1 above the ground
  const feet = [-1, 1].map(s => {
    const foot = new THREE.Group();
    foot.position.set(0.15 * s, 0.1, 0.08);
    add(foot, new THREE.CylinderGeometry(0.08, 0.09, 0.3, 8), fur, { pos: [0, 0.17, -0.06] });
    add(foot, new THREE.SphereGeometry(0.12, 10, 8), furLight, { pos: [0, 0.0, 0.03], scale: [1, 0.6, 1.4], outline: 0.06 });
    add(foot, new THREE.BoxGeometry(0.26, 0.05, 0.38), std(C.sandal), { pos: [0, -0.075, 0.03] });
    add(foot, new THREE.BoxGeometry(0.27, 0.05, 0.06), std(0x4a2e18), { pos: [0, 0.0, 0.08] });
    root.add(foot);
    return foot;
  });

  // Spin effect
  const swirl = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.07, 6, 28),
    new THREE.MeshBasicMaterial({ color: 0xfff3d1, transparent: true, opacity: 0 })
  );
  swirl.rotation.x = Math.PI / 2;
  swirl.position.y = 0.8;
  root.add(swirl);

  return { root, body, head, feet, arms, swirl };
}
