// Graphics quality tiers. Starts from a guess based on the device, then steps
// down automatically if the frame rate stays low. The player can override it.

export const TIERS = {
  low:    { pixelRatio: 1,   shadows: false, shadowMap: 1024, post: false, grass: 0,     flowers: 0,   particles: 200 },
  medium: { pixelRatio: 1.5, shadows: true,  shadowMap: 1024, post: false, grass: 6000,  flowers: 150, particles: 400 },
  high:   { pixelRatio: 2,   shadows: true,  shadowMap: 2048, post: true,  grass: 16000, flowers: 400, particles: 600 }
};
const ORDER = ['low', 'medium', 'high'];

export function guessTier() {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  if (coarse) return cores >= 8 ? 'medium' : 'low';
  // Never start on high; players can still pick it in settings
  return 'medium';
}

// Watches frame times and calls onDrop(newTier) when the game can't keep up
export function createFpsWatch(getTier, onDrop) {
  let acc = 0, frames = 0, slow = 0, enabled = true;
  return {
    set enabled(v) { enabled = v; slow = 0; },
    tick(rawDt) {
      if (!enabled) return;
      // A long frame means the tab was hidden or throttled, not that the game is slow
      if (document.hidden || rawDt > 0.2) { acc = 0; frames = 0; slow = 0; return; }
      acc += rawDt; frames++;
      if (acc < 1) return;
      const fps = frames / acc;
      acc = 0; frames = 0;
      slow = fps < 40 ? slow + 1 : 0;
      const i = ORDER.indexOf(getTier());
      if (slow >= 4 && i > 0) { slow = 0; onDrop(ORDER[i - 1]); }
    }
  };
}
