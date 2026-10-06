import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTexture } from './util.js';

// Crate types
//  basic       breaks on stomp or spin
//  bonus       "?" crate, same as basic, usually holds content
//  tnt         stomp lights a 3 s fuse, spin blows it up at once
//  bounce      stomp bounces Pip high and drops fruit, breaks after 5 bounces or a spin
//  checkpoint  breaking it moves the respawn point here
//  activator   "!" crate, unbreakable; hitting it turns ghost crates solid
//  metal       unbreakable, can be stood on
// Any breakable crate can start as a ghost: an outline that is not there until activated.

export const TNT_FUSE = 3;
export const TNT_RADIUS = 3.6;
export const BOUNCE_HITS = 5;

const COUNTED = new Set(['basic', 'bonus', 'tnt', 'bounce', 'checkpoint']);

function frame(ctx, s, fill, edge) {
  ctx.fillStyle = fill; ctx.fillRect(0, 0, s, s);
  // Wood grain
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(60,30,10,${0.05 + Math.random() * 0.08})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    const y = Math.random() * s;
    ctx.beginPath(); ctx.moveTo(0, y);
    ctx.bezierCurveTo(s * 0.3, y + Math.random() * 6 - 3, s * 0.6, y + Math.random() * 6 - 3, s, y + Math.random() * 4 - 2);
    ctx.stroke();
  }
  const lw = s * 0.12;
  ctx.strokeStyle = edge; ctx.lineWidth = lw;
  ctx.strokeRect(lw / 2, lw / 2, s - lw, s - lw);
  ctx.strokeStyle = 'rgba(40,20,5,.8)'; ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, s - 4, s - 4);
  ctx.strokeRect(lw, lw, s - lw * 2, s - lw * 2);
  ctx.fillStyle = 'rgba(40,20,5,.75)';
  [[lw / 2, lw / 2], [s - lw / 2, lw / 2], [lw / 2, s - lw / 2], [s - lw / 2, s - lw / 2]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
  });
}

function planks(ctx, s) {
  ctx.fillStyle = 'rgba(70,35,10,.45)';
  for (let i = 1; i < 4; i++) ctx.fillRect(s * 0.12, (s * i) / 4 - 3, s * 0.76, 6);
}

function label(ctx, s, text, size, fill, stroke, dy = 0) {
  ctx.font = `900 ${size}px "Lilita One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 10; ctx.strokeStyle = stroke; ctx.lineJoin = 'round';
  ctx.strokeText(text, s / 2, s / 2 + 6 + dy);
  ctx.fillStyle = fill; ctx.fillText(text, s / 2, s / 2 + 6 + dy);
}

function metalFace(ctx, s, fill, edge) {
  const g = ctx.createLinearGradient(0, 0, s, s);
  g.addColorStop(0, fill[0]); g.addColorStop(1, fill[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  const lw = s * 0.1;
  ctx.strokeStyle = edge; ctx.lineWidth = lw;
  ctx.strokeRect(lw / 2, lw / 2, s - lw, s - lw);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  [[lw * 0.6, lw * 0.6], [s - lw * 0.6, lw * 0.6], [lw * 0.6, s - lw * 0.6], [s - lw * 0.6, s - lw * 0.6]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
  });
}

const S = 256;
const textureDraw = {
  basic: (ctx, s) => { frame(ctx, s, '#b8742f', '#e9b06a'); planks(ctx, s); },
  bonus: (ctx, s) => { frame(ctx, s, '#b8742f', '#e9b06a'); planks(ctx, s); label(ctx, s, '?', 150, '#ffe08a', '#5e3a1a'); },
  tnt: (ctx, s) => {
    frame(ctx, s, '#d8452b', '#f3c14b');
    ctx.fillStyle = '#f3c14b'; ctx.fillRect(s * 0.12, s * 0.35, s * 0.76, s * 0.3);
    label(ctx, s, 'TNT', 78, '#2b1a0f', '#f3c14b');
  },
  bounce: (ctx, s) => {
    frame(ctx, s, '#b8742f', '#e9b06a');
    ctx.fillStyle = '#ffe08a'; ctx.strokeStyle = '#5e3a1a'; ctx.lineWidth = 8; ctx.lineJoin = 'round';
    [0.34, 0.6].forEach(y => {
      ctx.beginPath();
      ctx.moveTo(s * 0.5, s * (y - 0.16)); ctx.lineTo(s * 0.72, s * (y + 0.06)); ctx.lineTo(s * 0.28, s * (y + 0.06));
      ctx.closePath(); ctx.stroke(); ctx.fill();
    });
  },
  checkpoint: (ctx, s) => {
    frame(ctx, s, '#b8742f', '#e9b06a');
    ctx.fillStyle = '#3fa7e0'; ctx.fillRect(s * 0.12, s * 0.12, s * 0.76, s * 0.76);
    label(ctx, s, 'C', 140, '#ffffff', '#1d5f86');
  },
  activator: (ctx, s) => { metalFace(ctx, s, ['#64c06a', '#2f8a3f'], '#c9d6cc'); label(ctx, s, '!', 150, '#ffffff', '#1f5e2a'); },
  metal: (ctx, s) => {
    metalFace(ctx, s, ['#aab4bd', '#6c7781'], '#d6dde3');
    ctx.strokeStyle = 'rgba(40,50,60,.45)'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(s * 0.2, s * 0.2); ctx.lineTo(s * 0.8, s * 0.8); ctx.moveTo(s * 0.8, s * 0.2); ctx.lineTo(s * 0.2, s * 0.8); ctx.stroke();
  }
};

const chipColor = { basic: 0xc98b4a, bonus: 0xc98b4a, tnt: 0xd8452b, bounce: 0xc98b4a, checkpoint: 0x3fa7e0 };

export function createCrateFactory(scene, world, fx) {
  const geo = new RoundedBoxGeometry(1, 1, 1, 3, 0.07);
  const outlineGeo = new RoundedBoxGeometry(1.06, 1.06, 1.06, 2, 0.09);
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x2b1a0f, side: THREE.BackSide });
  const mats = {};
  for (const [k, draw] of Object.entries(textureDraw)) {
    const metal = k === 'metal' || k === 'activator';
    mats[k] = new THREE.MeshStandardMaterial({
      map: canvasTexture(S, draw), roughness: metal ? 0.35 : 0.75, metalness: metal ? 0.6 : 0
    });
  }
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0x9fe3ff, wireframe: true, transparent: true, opacity: 0.55 });

  // TNT countdown digits
  const digitMats = [1, 2, 3].map(n => new THREE.SpriteMaterial({
    map: canvasTexture(128, (ctx, s) => label(ctx, s, String(n), 96, '#fff3d1', '#d8452b', -6)),
    depthTest: false
  }));

  const crates = world.crates;
  const blasts = [];
  const blastMat = new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, toneMapped: false });

  function make(spot, base) {
    const type = spot.type;
    const group = new THREE.Group();
    const body = new THREE.Mesh(geo, type === 'tnt' ? mats.tnt.clone() : mats[type]);
    body.castShadow = body.receiveShadow = true;
    const outline = new THREE.Mesh(outlineGeo, outlineMat);
    group.add(body, outline);
    const y = base + (spot.level || 0);
    group.position.set(spot.x, y + 0.5, spot.z);
    scene.add(group);

    const c = {
      group, body, outline, x: spot.x, z: spot.z, base: y, top: y + 1, type,
      content: spot.content || null, counted: COUNTED.has(type),
      broken: false, ghost: !!spot.ghost, solid: !spot.ghost,
      fuse: null, digit: null, hits: 0, wobble: 0, activated: false
    };
    if (c.ghost) { body.material = ghostMat; outline.visible = false; }

    if (type === 'metal') {
      // Stand-on-able: becomes a surface instead of a crate
      c.solid = false;
      world.addSurface({ x0: spot.x - 0.5, x1: spot.x + 0.5, z0: spot.z - 0.5, z1: spot.z + 0.5, top: y + 1, bottom: y });
    } else {
      crates.push(c);
    }
    return c;
  }

  function smash(c) {
    c.broken = true;
    c.solid = false;
    c.group.visible = false;
    if (c.digit) c.digit.visible = false;
    fx.splinters(c.group.position, chipColor[c.type] ?? 0xc98b4a, 14);
  }

  function explode(c) {
    smash(c);
    fx.explosion(c.group.position);
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), blastMat.clone());
    b.position.copy(c.group.position);
    b.userData.t = 0;
    scene.add(b);
    blasts.push(b);
  }

  function lightFuse(c) {
    if (c.fuse !== null) return false;
    c.fuse = TNT_FUSE;
    c.digit = new THREE.Sprite(digitMats[2]);
    c.digit.scale.setScalar(1.1);
    c.digit.position.set(c.x, c.top + 0.9, c.z);
    scene.add(c.digit);
    return true;
  }

  function materialize(c) {
    if (!c.ghost) return;
    c.ghost = false; c.solid = true;
    c.body.material = c.type === 'tnt' ? mats.tnt.clone() : mats[c.type];
    c.outline.visible = true;
    c.wobble = 1;
    fx.sparkle(c.group.position, 0x9fe3ff, 10);
  }

  // Squash a crate briefly (bounce crate hit, activator press)
  function poke(c) { c.wobble = 1; }

  // Returns TNT crates whose fuse ran out, and whether a tick sounded this frame
  function update(dt, t) {
    const exploded = [];
    let ticked = false;
    for (const c of crates) {
      if (c.broken) continue;
      if (c.ghost) { c.body.material.opacity = 0.35 + Math.sin(t * 4 + c.x) * 0.15; continue; }
      if (c.wobble > 0) {
        c.wobble = Math.max(0, c.wobble - dt * 4);
        const w = Math.sin(c.wobble * Math.PI * 3) * c.wobble * 0.25;
        c.group.scale.set(1 + w, 1 - w, 1 + w);
      }
      if (c.fuse === null) continue;
      const before = Math.ceil(c.fuse);
      c.fuse -= dt;
      const n = Math.max(1, Math.ceil(c.fuse));
      if (n !== before && c.fuse > 0) ticked = true;
      c.digit.material = digitMats[n - 1];
      c.body.material.emissive.setHex(0xff2200);
      c.body.material.emissiveIntensity = (Math.sin(c.fuse * (14 - n * 3)) + 1) * 0.5;
      if (c.fuse <= 0) exploded.push(c);
    }
    for (let i = blasts.length - 1; i >= 0; i--) {
      const b = blasts[i];
      b.userData.t += dt / 0.4;
      const k = b.userData.t;
      b.scale.setScalar(0.5 + k * TNT_RADIUS);
      b.material.opacity = Math.max(0, 1 - k);
      b.material.color.setRGB(3 - k * 2, 2 - k * 1.4, 1 - k * 0.8);
      if (k >= 1) { scene.remove(b); blasts.splice(i, 1); }
    }
    return { exploded, ticked };
  }

  return { make, smash, explode, lightFuse, materialize, poke, update };
}
