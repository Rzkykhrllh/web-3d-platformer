import * as THREE from 'three';
import { canvasTexture } from './util.js';

export const CRATE_SIZE = 1;
export const TNT_FUSE = 3;
export const TNT_RADIUS = 3.6;

function frame(ctx, s, fill, edge) {
  ctx.fillStyle = fill; ctx.fillRect(0, 0, s, s);
  const lw = s * 0.11;
  ctx.strokeStyle = edge; ctx.lineWidth = lw;
  ctx.strokeRect(lw / 2, lw / 2, s - lw, s - lw);
  ctx.strokeStyle = 'rgba(40,20,5,.85)'; ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, s - 3, s - 3);
  ctx.strokeRect(lw, lw, s - lw * 2, s - lw * 2);
  ctx.fillStyle = 'rgba(40,20,5,.7)';
  [[lw / 2, lw / 2], [s - lw / 2, lw / 2], [lw / 2, s - lw / 2], [s - lw / 2, s - lw / 2]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
  });
}

function planks(ctx, s) {
  ctx.fillStyle = 'rgba(70,35,10,.45)';
  for (let i = 1; i < 4; i++) ctx.fillRect(s * 0.11, (s * i) / 4 - 2, s * 0.78, 4);
}

function label(ctx, s, text, size, fill, stroke) {
  ctx.font = `900 ${size}px "Lilita One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 6; ctx.strokeStyle = stroke; ctx.strokeText(text, s / 2, s / 2 + 4);
  ctx.fillStyle = fill; ctx.fillText(text, s / 2, s / 2 + 4);
}

const textures = {
  basic: () => canvasTexture(128, (ctx, s) => { frame(ctx, s, '#b8742f', '#e9b06a'); planks(ctx, s); }),
  bonus: () => canvasTexture(128, (ctx, s) => { frame(ctx, s, '#b8742f', '#e9b06a'); planks(ctx, s); label(ctx, s, '?', 78, '#ffe08a', '#5e3a1a'); }),
  tnt: () => canvasTexture(128, (ctx, s) => {
    frame(ctx, s, '#d8452b', '#f3c14b');
    ctx.fillStyle = '#f3c14b'; ctx.fillRect(s * 0.11, s * 0.36, s * 0.78, s * 0.3);
    label(ctx, s, 'TNT', 40, '#2b1a0f', '#f3c14b');
  })
};

export function createCrateFactory(scene) {
  const geo = new THREE.BoxGeometry(CRATE_SIZE, CRATE_SIZE, CRATE_SIZE);
  const mats = {};
  for (const k of Object.keys(textures)) {
    mats[k] = new THREE.MeshStandardMaterial({ map: textures[k](), roughness: 0.8 });
  }
  const pieceGeo = new THREE.BoxGeometry(0.32, 0.32, 0.08);
  const pieces = [];

  // Countdown digits for TNT
  const digitMats = [1, 2, 3].map(n => new THREE.SpriteMaterial({
    map: canvasTexture(128, (ctx, s) => label(ctx, s, String(n), 96, '#fff3d1', '#d8452b')),
    depthTest: false
  }));

  function make(spot, base) {
    const m = new THREE.Mesh(geo, spot.type === 'tnt' ? mats.tnt.clone() : mats[spot.type]);
    m.castShadow = m.receiveShadow = true;
    const level = spot.level || 0;
    const y = base + level * CRATE_SIZE;
    m.position.set(spot.x, y + CRATE_SIZE / 2, spot.z);
    scene.add(m);
    return {
      mesh: m, x: spot.x, z: spot.z, base: y, top: y + CRATE_SIZE,
      type: spot.type, content: spot.content || null,
      broken: false, fuse: null, digit: null
    };
  }

  function burst(crate, count = 8, speed = 5) {
    const material = crate.mesh.material;
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(pieceGeo, material);
      p.position.copy(crate.mesh.position);
      p.castShadow = true;
      const a = Math.random() * Math.PI * 2;
      p.userData = {
        v: new THREE.Vector3(Math.cos(a) * speed * (0.4 + Math.random() * 0.6), 4 + Math.random() * 4, Math.sin(a) * speed * (0.4 + Math.random() * 0.6)),
        spin: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        life: 1.1
      };
      scene.add(p);
      pieces.push(p);
    }
  }

  function smash(crate) {
    crate.broken = true;
    crate.mesh.visible = false;
    if (crate.digit) crate.digit.visible = false;
    burst(crate);
  }

  // Fireball that grows and fades; returned so the caller can check the blast
  const blasts = [];
  const blastMat = new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true });
  function explode(crate) {
    smash(crate);
    burst(crate, 14, 9);
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), blastMat.clone());
    b.position.copy(crate.mesh.position);
    b.userData.t = 0;
    scene.add(b);
    blasts.push(b);
  }

  function lightFuse(crate) {
    if (crate.fuse !== null) return;
    crate.fuse = TNT_FUSE;
    crate.digit = new THREE.Sprite(digitMats[2]);
    crate.digit.scale.setScalar(1.1);
    crate.digit.position.set(crate.x, crate.top + 0.9, crate.z);
    scene.add(crate.digit);
  }

  // Returns crates whose fuse ran out this frame
  function update(dt, crates) {
    const exploded = [];
    for (const c of crates) {
      if (c.broken || c.fuse === null) continue;
      c.fuse -= dt;
      const n = Math.max(1, Math.ceil(c.fuse));
      c.digit.material = digitMats[n - 1];
      c.mesh.material.emissive.setHex(0xff2200);
      c.mesh.material.emissiveIntensity = (Math.sin(c.fuse * (14 - n * 3)) + 1) * 0.35;
      if (c.fuse <= 0) exploded.push(c);
    }
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i], u = p.userData;
      u.life -= dt;
      u.v.y -= 22 * dt;
      p.position.addScaledVector(u.v, dt);
      p.rotation.x += u.spin.x * dt; p.rotation.y += u.spin.y * dt; p.rotation.z += u.spin.z * dt;
      p.scale.setScalar(Math.min(1, u.life * 2));
      if (u.life <= 0) { scene.remove(p); pieces.splice(i, 1); }
    }
    for (let i = blasts.length - 1; i >= 0; i--) {
      const b = blasts[i];
      b.userData.t += dt / 0.45;
      const t = b.userData.t;
      b.scale.setScalar(0.5 + t * TNT_RADIUS);
      b.material.opacity = Math.max(0, 1 - t);
      if (t >= 1) { scene.remove(b); blasts.splice(i, 1); }
    }
    return exploded;
  }

  return { make, smash, explode, lightFuse, update };
}
