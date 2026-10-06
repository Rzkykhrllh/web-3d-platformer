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
      for (const [dx, w, len] of [[0, 11, 0.62], [-15, 8, 0.52], [15, 8, 0.52], [-30, 7, 0.44], [30, 7, 0.44], [-44, 5, 0.34], [44, 5, 0.34]]) {
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

// One white blade at the end of a mane lock: grey at the root, white soon after.
// A cone's v runs 0 at the wide base to 1 at the apex; the canvas top is v = 1.
function bladeTexture() {
  return canvasTexture(128, (ctx, s) => {
    const g = ctx.createLinearGradient(0, s, 0, 0);
    g.addColorStop(0, '#8f8f8f'); g.addColorStop(0.18, '#cfcfcc'); g.addColorStop(0.4, '#f4f4f2'); g.addColorStop(1, '#ffffff');
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

  // Head: wide with a flatter crown and a narrower chin; with the ears at its
  // outer corners and the cheek tufts it reads as a "W" from the front
  const head = new THREE.Group();
  head.position.set(0, 1.5, 0.02);
  body.add(head);
  const skull = new THREE.SphereGeometry(0.42, 18, 12);
  const sp = skull.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const n = sp.getY(i) / 0.42;
    if (n < 0) { sp.setX(i, sp.getX(i) * (1 + n * 0.3)); sp.setZ(i, sp.getZ(i) * (1 + n * 0.1)); }
    if (n > 0.5) sp.setY(i, 0.42 * (0.5 + (n - 0.5) * 0.55));
  }
  skull.computeVertexNormals();
  add(head, skull, furHead, { scale: [1.22, 0.98, 0.95], outline: 0.03 });
  // Pale muzzle and paler fur around the eyes
  add(head, new THREE.SphereGeometry(0.2, 14, 10), std(0xe6e6e2), { pos: [0, -0.14, 0.27], scale: [1.45, 0.8, 0.6] });
  const earGeo = (r, h) => { const g = new THREE.ConeGeometry(r, h, 4, 1); g.rotateY(Math.PI / 4); g.scale(1, 1, 0.45); g.translate(0, h / 2, 0); return g; };
  [-1, 1].forEach(s => {
    // Ears: big, wide at the base, at the outer top corners, tips leaning out
    const ear = new THREE.Group();
    ear.position.set(s * 0.31, 0.2, -0.04);
    ear.rotation.z = -s * 0.2;
    add(ear, earGeo(0.24, 0.62), fur, { outline: 0.05 });
    add(ear, earGeo(0.14, 0.42), std(0xd6d0cc), { pos: [0, 0.03, 0.05], shadow: false });
    head.add(ear);
    // Cheek tufts: striped spikes pointing out and a little down
    [[-0.04, 0.4, 0.38], [-0.17, 0.8, 0.3]].forEach(([y, droop, len]) => {
      add(head, new THREE.ConeGeometry(0.12, len, 4), fur, { pos: [s * 0.47, y, 0.04], rot: [0, 0, -s * (Math.PI / 2 + droop)], scale: [1, 1, 0.6] });
    });
    // Eyes: tall ovals, thin dark rim, a narrow slit pupil
    const eye = new THREE.Group();
    eye.position.set(s * 0.165, -0.02, 0.355);
    eye.rotation.y = s * 0.3;
    add(eye, new THREE.SphereGeometry(0.084, 14, 10), black, { scale: [0.82, 1.15, 0.35], shadow: false });
    add(eye, new THREE.SphereGeometry(0.076, 14, 10), white, { pos: [0, 0, 0.01], scale: [0.82, 1.15, 0.35], shadow: false });
    add(eye, new THREE.OctahedronGeometry(0.045, 0), black, { pos: [s * -0.006, 0, 0.032], scale: [0.3, 1.4, 0.3], shadow: false });
    head.add(eye);
  });
  // Nose and the "w" mouth
  add(head, new THREE.ConeGeometry(0.032, 0.04, 3), black, { pos: [0, -0.09, 0.44], rot: [-Math.PI / 2, 0, Math.PI], shadow: false });
  [-1, 1].forEach(s => {
    add(head, new THREE.TorusGeometry(0.03, 0.007, 4, 10, Math.PI), black, {
      pos: [s * 0.03, -0.14, 0.43], rot: [0, 0, Math.PI], shadow: false
    });
  });

  // Mane: two long locks hang from behind the cheeks, one each side, grey and
  // striped down to the waist (covering the arms from behind). There each
  // breaks into white blades that fan out sideways and back, down to the
  // ankles. The middle of the back stays clear, so the shirt shows.
  const bladeMat = toon({ map: bladeTexture(), side: THREE.DoubleSide });
  const blade = (len, width) => {
    const g = new THREE.ConeGeometry(width, len, 4, 1);
    g.rotateX(Math.PI);          // apex down
    g.translate(0, -len / 2, 0); // root at the origin
    g.scale(1, 1, 0.25); // flat, like layered sheets
    return g;
  };
  [-1, 1].forEach(s => {
    const lock = new THREE.Group();
    lock.position.set(s * 0.36, 1.32, -0.15);
    lock.rotation.set(0.08, 0, s * 0.08);
    body.add(lock);
    const strip = new THREE.CylinderGeometry(0.15, 0.12, 0.52, 6);
    strip.translate(0, -0.26, 0);
    strip.scale(1, 1, 0.55);
    add(lock, strip, fur);
    const tips = new THREE.Group();
    tips.position.y = -0.46;
    lock.add(tips);
    const deg = THREE.MathUtils.degToRad;
    // Sheets fanning out sideways in the body's plane, flat side to the back:
    // [degrees out from straight down, length, width]
    [[10, 0.85, 0.3], [24, 0.95, 0.36], [38, 0.95, 0.38], [52, 0.85, 0.36], [66, 0.7, 0.3]].forEach(([fan, len, w], i) => {
      add(tips, blade(len, w), bladeMat, { pos: [0, 0, -0.02 * i], rot: [0.22, 0, s * deg(fan)] });
    });
    // Sheets sweeping back, for the spiky half-circle seen from above:
    // [degrees round from straight back toward the side, tilt from vertical, length, width]
    [[6, 58, 0.85, 0.3], [28, 62, 0.92, 0.32], [52, 66, 0.86, 0.3], [76, 68, 0.74, 0.28]].forEach(([round, tilt, len, w]) => {
      const m = add(tips, blade(len, w), bladeMat);
      m.rotation.set(deg(tilt), -s * deg(round), 0, 'YXZ');
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
