// Tunables in one place. The debug panel (?debug) edits these live.

export const PLAYER = {
  radius: 0.4,
  height: 1.4,           // head height, for bonking crates from below
  step: 0.35,            // highest ledge Pip walks up without jumping
  runSpeed: 8,
  accelGround: 55,
  accelAir: 30,
  decel: 48,
  turnRate: 14,
  jumpSpeed: 10.5,
  gravity: 26,
  fallGravityMul: 1.45,  // falling is faster than rising, feels less floaty
  releaseGravityMul: 2.4, // let go of jump early for a short hop
  maxFall: 30,
  coyoteTime: 0.1,       // can still jump this long after leaving a ledge
  jumpBuffer: 0.13,      // a jump pressed this early before landing still counts
  spinTime: 0.45,
  spinTurns: 3,          // full turns in one spin
  spinCooldown: 0.2,
  spinReach: 1.6,
  crateBounce: 8,
  crateBounceHeld: 11.5,
  springBounce: 14,
  hurtInvulnerable: 1.3,
  hurtKnock: 10,
  hurtFruitLoss: 5,
  killY: -8
};

export const CAMERA = {
  height: 4.4,
  distance: 8.2,
  lookAhead: 4.5,
  velocityLead: 0.18,
  followX: 0.55,
  follow: 6,
  verticalFollow: 3.5
};

export const FEEL = {
  hitStop: 0.045,
  shakeDecay: 1.6
};

export const AUDIO = {
  // Drop a file in public/audio/ and set this to use real music instead of the generated loop
  musicUrl: null,
  musicVolume: 0.5,
  sfxVolume: 0.8
};

// Path to a level exported from Blender (e.g. 'levels/island.glb' in public/).
// null uses the built-in level from level.js. ?level=... in the URL overrides it.
export const LEVEL_URL = null;

// Player character: 'cat' (the rigged model in public/models/cat.glb, or the
// procedural cat if it fails to load), 'cat-procedural' or 'pip'. ?char=... in the URL overrides it.
export const CHARACTER = 'cat';

// Game title on the menu and the browser tab
export const GAME_NAME = 'N. Usantara Island';

// Portfolio content: cards when crates break, "See everything", the summary.
// Off for now while the game itself gets built; the crates still count.
export const SHOW_PORTFOLIO = false;
