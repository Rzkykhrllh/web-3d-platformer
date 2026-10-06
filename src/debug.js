import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { PLAYER, CAMERA, FEEL } from './config.js';
import { TIERS } from './quality.js';

// Live tuning panel, opened with ?debug in the URL. Changes are not saved;
// copy good values back into config.js.
export function createDebugPanel({ player, state, applyTier, renderer, post, sun, hemi, openGem }) {
  const gui = new GUI({ title: 'Debug' });

  const move = gui.addFolder('Player');
  move.add(PLAYER, 'runSpeed', 3, 14, 0.1);
  move.add(PLAYER, 'accelGround', 10, 120, 1);
  move.add(PLAYER, 'accelAir', 5, 80, 1);
  move.add(PLAYER, 'decel', 10, 120, 1);
  move.add(PLAYER, 'jumpSpeed', 5, 16, 0.1);
  move.add(PLAYER, 'gravity', 10, 50, 0.5);
  move.add(PLAYER, 'fallGravityMul', 1, 3, 0.05);
  move.add(PLAYER, 'releaseGravityMul', 1, 4, 0.05);
  move.add(PLAYER, 'coyoteTime', 0, 0.3, 0.01);
  move.add(PLAYER, 'jumpBuffer', 0, 0.3, 0.01);

  const cam = gui.addFolder('Camera');
  cam.add(CAMERA, 'height', 1, 10, 0.1);
  cam.add(CAMERA, 'distance', 3, 16, 0.1);
  cam.add(CAMERA, 'lookAhead', 0, 10, 0.1);
  cam.add(CAMERA, 'follow', 1, 15, 0.1);
  cam.add(FEEL, 'hitStop', 0, 0.15, 0.005);

  const look = gui.addFolder('Look');
  look.add(renderer, 'toneMappingExposure', 0.3, 2, 0.01).name('exposure');
  look.add(sun, 'intensity', 0, 6, 0.05).name('sun');
  look.add(hemi, 'intensity', 0, 3, 0.05).name('sky light');
  look.add(post.bloom, 'strength', 0, 2, 0.01).name('bloom');
  look.add(post.bloom, 'threshold', 0, 2, 0.01).name('bloom threshold');
  look.add(post.grade.uniforms.saturation, 'value', 0.5, 1.6, 0.01).name('saturation');
  look.add(post.grade.uniforms.vignette, 'value', 0, 1, 0.01).name('vignette');
  look.add({ tier: 'high' }, 'tier', Object.keys(TIERS)).onChange(applyTier);

  const jump = gui.addFolder('Teleport');
  const spots = {
    start: [0, 0, 2], 'gap 1': [0, 0, -57], jungle: [0, 0, -78], 'step up': [0, 0, -97],
    crystal: [0, 1, -104], 'gap 2': [0, 1, -110], 'ruins B': [0, 1, -133], 'TNT': [0, 1, -146], 'log run': [0, 1, -176],
    'fire hall': [0, 1, -203], lift: [0, 1, -226], gem: [0, 4.5, -236]
  };
  for (const [name, [x, y, z]] of Object.entries(spots)) {
    jump.add({ go: () => { player.state.pos.set(x, y, z); player.state.vel.set(0, 0, 0); state.checkpoint.set(x, y, z); } }, 'go').name(name);
  }
  jump.add({ openGem }, 'openGem').name('unlock gem');
  jump.close();
  return gui;
}
