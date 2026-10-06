import * as THREE from 'three';

// Pooled particles drawn with one InstancedMesh per look:
//  puff  - soft lit blobs for dust and smoke
//  spark - unlit and bright, so bloom picks them up (sparkles, fire, stars)
//  chip  - small flat shards (wood, leaves)
// Particles fade by shrinking, which keeps them opaque and cheap.

function createPool(scene, geometry, material, max) {
  const mesh = new THREE.InstancedMesh(geometry, material, max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  mesh.frustumCulled = false;
  mesh.count = 0;
  scene.add(mesh);
  const items = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();

  function emit(o) {
    if (items.length >= max) items.shift();
    items.push({
      p: o.pos.clone(), v: o.vel.clone(),
      rot: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6),
      spin: (o.spin ?? 0) * (Math.random() - 0.5),
      life: o.life, age: 0,
      size: o.size, sizeEnd: o.sizeEnd ?? 0,
      gravity: o.gravity ?? 0, drag: o.drag ?? 0,
      color: new THREE.Color(o.color)
    });
  }

  function update(dt) {
    let n = 0;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.age += dt;
      if (it.age >= it.life) { items.splice(i, 1); continue; }
    }
    for (const it of items) {
      it.v.y -= it.gravity * dt;
      if (it.drag) it.v.multiplyScalar(Math.exp(-it.drag * dt));
      it.p.addScaledVector(it.v, dt);
      it.rot.x += it.spin * dt; it.rot.y += it.spin * dt * 0.7;
      const k = it.age / it.life;
      const size = it.size + (it.sizeEnd - it.size) * k;
      e.set(it.rot.x, it.rot.y, it.rot.z);
      q.setFromEuler(e);
      sc.setScalar(Math.max(0.0001, size));
      m.compose(it.p, q, sc);
      mesh.setMatrixAt(n, m);
      mesh.setColorAt(n, it.color);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  return { emit, update, clear: () => { items.length = 0; } };
}

export function createParticles(scene, maxPerPool = 500) {
  const pools = {
    puff: createPool(scene, new THREE.IcosahedronGeometry(0.5, 1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), maxPerPool),
    spark: createPool(scene, new THREE.OctahedronGeometry(0.5, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), maxPerPool),
    chip: createPool(scene, new THREE.BoxGeometry(1, 0.25, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), maxPerPool)
  };
  const tmpV = new THREE.Vector3();
  const rnd = (a, b) => a + Math.random() * (b - a);

  // Random direction in a cone around +y, scaled
  function spray(spread, up, speed) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * spread;
    return tmpV.set(Math.cos(a) * r, up, Math.sin(a) * r).normalize().multiplyScalar(speed * rnd(0.5, 1));
  }

  const fx = {
    dust(pos, n = 2, color = 0xe8cf9a) {
      for (let i = 0; i < n; i++) pools.puff.emit({
        pos: tmpV.set(pos.x + rnd(-0.2, 0.2), pos.y + 0.1, pos.z + rnd(-0.2, 0.2)).clone(),
        vel: spray(1.5, 0.6, 1.4).clone(), life: rnd(0.35, 0.6), size: rnd(0.25, 0.4), drag: 3, color
      });
    },
    landRing(pos, strength, color = 0xe8cf9a) {
      const n = Math.round(6 + strength * 8);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        pools.puff.emit({
          pos: tmpV.set(pos.x + Math.cos(a) * 0.3, pos.y + 0.1, pos.z + Math.sin(a) * 0.3).clone(),
          vel: new THREE.Vector3(Math.cos(a), 0.15, Math.sin(a)).multiplyScalar(2 + strength * 3),
          life: rnd(0.35, 0.55), size: 0.3 + strength * 0.2, drag: 5, color
        });
      }
    },
    splinters(pos, color = 0xc98b4a, n = 12) {
      for (let i = 0; i < n; i++) pools.chip.emit({
        pos: tmpV.set(pos.x + rnd(-0.3, 0.3), pos.y + rnd(-0.3, 0.3), pos.z + rnd(-0.3, 0.3)).clone(),
        vel: spray(1, 0.9, 7).clone(), life: rnd(0.6, 1), size: rnd(0.22, 0.38), sizeEnd: 0.05,
        gravity: 24, spin: 18, color
      });
      fx.dust(pos, 4, 0xd9b483);
    },
    sparkle(pos, color = 0xffe08a, n = 8) {
      for (let i = 0; i < n; i++) pools.spark.emit({
        pos: pos.clone(), vel: spray(1, 0.3, 4).clone(),
        life: rnd(0.3, 0.55), size: rnd(0.12, 0.2), drag: 4, spin: 10, color
      });
    },
    explosion(pos) {
      for (let i = 0; i < 26; i++) pools.spark.emit({
        pos: pos.clone(), vel: spray(1, 0.5, 11).clone(),
        life: rnd(0.25, 0.5), size: rnd(0.3, 0.6), sizeEnd: 0.05, drag: 5,
        color: [0xfff3a0, 0xffb347, 0xff6a20][i % 3]
      });
      for (let i = 0; i < 14; i++) pools.puff.emit({
        pos: tmpV.set(pos.x + rnd(-0.5, 0.5), pos.y + rnd(0, 0.6), pos.z + rnd(-0.5, 0.5)).clone(),
        vel: spray(0.8, 1, 3).clone(), life: rnd(0.9, 1.5), size: rnd(0.5, 0.8), sizeEnd: 1.6,
        drag: 1.5, gravity: -1.5, color: [0x4a3f38, 0x6b5f57, 0x2f2723][i % 3]
      });
    },
    spinTrail(pos, facing) {
      const a = Math.random() * Math.PI * 2;
      pools.puff.emit({
        pos: tmpV.set(pos.x + Math.cos(a) * 0.9, pos.y + rnd(0.3, 1), pos.z + Math.sin(a) * 0.9).clone(),
        vel: new THREE.Vector3(-Math.sin(a) * 3, 0.5, Math.cos(a) * 3),
        life: 0.25, size: 0.18, drag: 2, color: 0xfff3d1
      });
    },
    stars(pos) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        pools.spark.emit({
          pos: pos.clone(), vel: new THREE.Vector3(Math.cos(a) * 3, 3, Math.sin(a) * 3),
          life: 0.6, size: 0.22, sizeEnd: 0.05, gravity: 8, spin: 8, color: 0xfff27a
        });
      }
    },
    leaves(pos, n = 6) {
      for (let i = 0; i < n; i++) pools.chip.emit({
        pos: tmpV.set(pos.x + rnd(-0.6, 0.6), pos.y + rnd(0, 0.8), pos.z + rnd(-0.6, 0.6)).clone(),
        vel: spray(1.2, 0.8, 3).clone(), life: rnd(0.8, 1.3), size: rnd(0.2, 0.3), sizeEnd: 0.1,
        gravity: 3, drag: 2, spin: 6, color: [0x3bb36a, 0x2e9e5b, 0x8ad35a][i % 3]
      });
    }
  };

  return {
    fx,
    update(dt) { for (const p of Object.values(pools)) p.update(dt); },
    clear() { for (const p of Object.values(pools)) p.clear(); }
  };
}
