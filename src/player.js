import * as THREE from 'three';
import { PLAYER as P } from './config.js';
import { createPip } from './pip.js';

// Player controller. Movement and collision are resolved here; anything that
// touches other systems (crates, sound, particles) goes out through `events`.
//
// States: idle, run, jump, fall, spin is an overlay, hurt, victory.

const approach = (v, target, rate) => (v < target ? Math.min(target, v + rate) : Math.max(target, v - rate));

// `createModel` builds the character (see src/characters); defaults to Pip
export function createPlayer(scene, world, events, createModel = createPip) {
  const model = createModel();
  scene.add(model.root);

  // Soft round shadow that always sits on the ground under Pip, so landings are easy to judge
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.renderOrder = 1;
  scene.add(blob);

  const s = {
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    facing: Math.PI,
    onGround: true,
    ground: null,
    state: 'idle',
    coyote: 0,
    buffer: 0,
    jumpHeld: false,
    jumping: false,
    spin: 0,
    spinCooldown: 0,
    invulnerable: 0,
    squash: 0,
    walk: 0,
    lastGroundY: 0,
    airTime: 0
  };

  function reset(at) {
    s.pos.copy(at);
    s.vel.set(0, 0, 0);
    s.facing = Math.PI;
    s.onGround = true;
    s.ground = null;
    s.spin = 0;
    s.lastGroundY = at.y;
    s.state = 'idle';
    sync(0);
  }

  function bounce(v) {
    s.vel.y = v;
    s.onGround = false;
    s.jumping = false; // a bounce is not cut short by letting go of jump
    s.coyote = 0;
    s.state = 'jump';
  }

  function hurt(fromX, fromZ) {
    if (s.invulnerable > 0) return false;
    const dx = s.pos.x - fromX, dz = s.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
    s.vel.x = (dx / d) * P.hurtKnock;
    s.vel.z = (dz / d) * P.hurtKnock;
    bounce(7);
    s.invulnerable = P.hurtInvulnerable;
    s.state = 'hurt';
    return true;
  }

  function knock(dirX, dirZ, strength, up) {
    s.vel.x += dirX * strength;
    s.vel.z += dirZ * strength;
    bounce(up);
  }

  // input: { x, z } in -1..1, jumpPressed, jumpHeld, spinPressed
  function update(dt, input) {
    const p = s.pos;

    // Ride moving platforms
    if (s.onGround && s.ground) { p.x += s.ground.dx; p.y += s.ground.dy; p.z += s.ground.dz; }

    // Horizontal velocity eases toward the stick direction
    const mag = Math.min(1, Math.hypot(input.x, input.z));
    const stunned = s.state === 'hurt' && s.invulnerable > P.hurtInvulnerable - 0.35;
    let tx = 0, tz = 0;
    if (mag > 0.1 && !stunned) {
      const n = Math.hypot(input.x, input.z);
      tx = (input.x / n) * P.runSpeed * mag;
      tz = (input.z / n) * P.runSpeed * mag;
      let diff = Math.atan2(tx, tz) - s.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      s.facing += diff * Math.min(1, dt * P.turnRate);
    }
    const accel = (mag > 0.1 ? (s.onGround ? P.accelGround : P.accelAir) : P.decel) * dt;
    if (!stunned) {
      s.vel.x = approach(s.vel.x, tx, accel);
      s.vel.z = approach(s.vel.z, tz, accel);
    }

    // Move one axis at a time so walls slide instead of stick
    const nx = p.x + s.vel.x * dt;
    if (!world.blocked(nx, p.z, p.y, P.radius, P.step)) p.x = nx; else s.vel.x = 0;
    const nz = p.z + s.vel.z * dt;
    if (!world.blocked(p.x, nz, p.y, P.radius, P.step)) p.z = nz; else s.vel.z = 0;
    events.clamp?.(p);

    // Jump with coyote time and input buffering
    s.coyote = s.onGround ? P.coyoteTime : s.coyote - dt;
    s.buffer = input.jumpPressed ? P.jumpBuffer : s.buffer - dt;
    s.jumpHeld = input.jumpHeld;
    if (s.buffer > 0 && s.coyote > 0) {
      s.vel.y = P.jumpSpeed;
      s.onGround = false;
      s.jumping = true;
      s.coyote = 0; s.buffer = 0;
      s.squash = -0.6;
      s.state = 'jump';
      events.jump?.(p);
    }

    // Spin
    if (input.spinPressed && s.spin <= 0 && s.spinCooldown <= 0 && s.state !== 'hurt') {
      s.spin = P.spinTime;
      events.spinStart?.(p);
    }
    if (s.spin > 0) {
      s.spin -= dt;
      events.spinning?.(p);
      if (s.spin <= 0) s.spinCooldown = P.spinCooldown;
    } else if (s.spinCooldown > 0) s.spinCooldown -= dt;

    // Gravity: heavier when falling, and when jump is released early
    let g = P.gravity;
    if (s.vel.y < 0) g *= P.fallGravityMul;
    else if (s.jumping && !s.jumpHeld) g *= P.releaseGravityMul;
    // A spin in the air hangs for a moment, like the original games
    if (s.spin > 0 && s.vel.y < 0) g *= 0.35;
    s.vel.y = Math.max(-P.maxFall, s.vel.y - g * dt);

    const prevY = p.y;
    p.y += s.vel.y * dt;
    if (s.vel.y <= 0) s.jumping = false;

    // Landing on a crate
    if (s.vel.y < 0) {
      const c = world.crateBelow(p.x, p.z, prevY, p.y);
      if (c) { p.y = c.top; events.stomp?.(c); }
    }

    const wasGround = s.onGround;
    const ground = world.groundAt(p.x, p.z, prevY, P.step);
    if (ground && p.y <= ground.top && s.vel.y <= 0) {
      p.y = ground.top;
      if (!wasGround) {
        const impact = -s.vel.y;
        s.squash = Math.min(1, impact / 18);
        events.land?.(p, impact, s.airTime);
        if (s.state !== 'hurt' || s.invulnerable < P.hurtInvulnerable - 0.3) s.state = 'idle';
      }
      s.vel.y = 0;
      s.onGround = true;
      s.ground = ground;
      s.lastGroundY = ground.top;
      s.airTime = 0;
      ground.onStand?.();
    } else {
      s.onGround = false;
      s.ground = null;
      s.airTime += dt;
      if (s.state !== 'hurt' && s.vel.y < 0) s.state = 'fall';
    }

    if (s.onGround && s.state !== 'hurt') {
      s.state = Math.hypot(s.vel.x, s.vel.z) > 0.6 ? 'run' : 'idle';
    }
    if (s.invulnerable > 0) s.invulnerable -= dt;

    if (p.y < P.killY) events.fell?.();

    sync(dt);
  }

  // Visuals follow the simulation
  function sync(dt) {
    const p = s.pos;
    model.root.position.copy(p);
    model.root.rotation.y = s.facing;

    const speed = Math.hypot(s.vel.x, s.vel.z);
    const running = s.onGround && speed > 0.6;
    s.walk += running ? dt * (8 + speed * 1.1) : 0;
    const reduce = events.reduceMotion?.();
    model.body.position.y = running && !reduce ? Math.abs(Math.sin(s.walk)) * 0.12 : 0;
    // Lean into the run
    model.body.rotation.x = running ? Math.min(0.18, speed * 0.02) : 0;

    // Squash on landing, stretch on take off, both spring back
    s.squash += (0 - s.squash) * Math.min(1, dt * 12);
    let sy = 1 - s.squash * 0.35;
    if (!s.onGround && s.vel.y > 2) sy = Math.max(sy, 1.1);
    const sxz = 1 / Math.sqrt(Math.max(0.5, sy));
    model.body.scale.set(sxz, sy, sxz);

    const stride = running ? Math.sin(s.walk) * 0.25 : 0;
    model.feet[0].position.z = 0.08 + stride;
    model.feet[1].position.z = 0.08 - stride;
    if (model.arms) {
      // Arms swing against the legs; raised a little while airborne
      const swing = running ? Math.sin(s.walk) * 0.7 : 0;
      const air = s.onGround ? 0 : -0.5;
      model.arms[0].rotation.x = -swing + air;
      model.arms[1].rotation.x = swing + air;
    }
    const tuck = s.onGround ? 0 : 0.12;
    model.feet[0].position.y = model.feet[1].position.y = 0.1 + tuck;

    if (s.spin > 0) {
      const k = 1 - s.spin / P.spinTime;
      model.body.rotation.y = k * Math.PI * 4;
      model.swirl.material.opacity = 0.6 * Math.sin(k * Math.PI);
      model.swirl.scale.setScalar(0.7 + k * 0.6);
      model.swirl.rotation.z = -k * 12;
    } else {
      model.body.rotation.y = 0;
      model.swirl.material.opacity = 0;
    }

    // Blink while invulnerable
    model.root.visible = s.invulnerable <= 0 || Math.floor(s.invulnerable * 14) % 2 === 0;

    // Shadow on whatever is below
    const below = world.groundAt(p.x, p.z, p.y + 0.01, 0);
    if (below) {
      const h = p.y - below.top;
      blob.visible = true;
      blob.position.set(p.x, below.top + 0.02, p.z);
      blob.scale.setScalar(Math.max(0.4, 1 - h * 0.12));
      blob.material.opacity = Math.max(0.12, 0.38 - h * 0.05);
    } else blob.visible = false;
  }

  return { state: s, model, reset, bounce, hurt, knock, update, sync };
}
