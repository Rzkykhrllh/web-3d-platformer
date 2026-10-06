import * as THREE from 'three';
import { CAMERA as C, FEEL } from './config.js';

// Camera rig with three modes:
//  menu   - slow fly-through of the level behind the title screen
//  follow - behind Pip, height tracks the ground rather than every jump
//  finish - slow orbit around Pip
export function createCameraRig(camera, path) {
  const pos = new THREE.Vector3(0, 6, 14);
  const look = new THREE.Vector3(0, 1, 0);
  const want = new THREE.Vector3(), wantLook = new THREE.Vector3();
  let mode = 'menu', groundY = 0, lead = 0, trauma = 0, t = 0;

  function shake(amount) { trauma = Math.min(1, trauma + amount); }

  function update(dt, player, reduceMotion) {
    t += dt;
    if (mode === 'menu') {
      // Glide down the path and loop
      const span = path.start - path.end;
      const z = path.start - ((t * 4) % span);
      want.set(Math.sin(t * 0.2) * 2.5, path.heightAt(z) + 4.2, z + 6);
      wantLook.set(0, path.heightAt(z - 8) + 1.2, z - 8);
      // Jump cut when looping back to the start
      if (pos.z - want.z < -20) { pos.copy(want); look.copy(wantLook); }
    } else if (mode === 'finish') {
      const p = player.pos;
      const a = t * 0.4;
      want.set(p.x + Math.sin(a) * 6, p.y + 2.5, p.z + Math.cos(a) * 6);
      wantLook.set(p.x, p.y + 1, p.z);
    } else {
      const p = player.pos, v = player.vel;
      // Only follow jumps upward when Pip lands higher, but follow falls straight away
      const target = player.onGround ? p.y : Math.min(groundY, p.y);
      groundY += (target - groundY) * Math.min(1, dt * (p.y < groundY - 0.5 ? 8 : C.verticalFollow));
      lead += (v.z * C.velocityLead - lead) * Math.min(1, dt * 3);
      want.set(p.x * C.followX, groundY + C.height, p.z + C.distance + lead * 0.5);
      wantLook.set(p.x * 0.75, groundY + 1.1, p.z - C.lookAhead + lead);
    }

    const k = 1 - Math.exp(-dt * (mode === 'follow' ? C.follow : 2));
    pos.lerp(want, k);
    look.lerp(wantLook, k);
    camera.position.copy(pos);

    if (trauma > 0 && !reduceMotion) {
      const s = trauma * trauma;
      camera.position.x += (Math.random() - 0.5) * s * 0.9;
      camera.position.y += (Math.random() - 0.5) * s * 0.9;
    }
    trauma = Math.max(0, trauma - dt * FEEL.shakeDecay);
    camera.lookAt(look);
  }

  return {
    update, shake,
    setMode(m, player) {
      mode = m;
      if (m === 'follow' && player) groundY = player.pos.y;
    },
    get mode() { return mode; }
  };
}
