// Collision world. Every walkable thing is an axis-aligned box with a flat top
// (x0..x1, z0..z1, top). Surfaces can move (platforms) or switch off (crumbling).
// Breakable crates block sideways movement but are not standable.

export function createWorld() {
  const surfaces = [];
  const crates = [];

  function addSurface(s) {
    s.active ??= true;
    s.dx = 0; s.dy = 0; s.dz = 0;
    surfaces.push(s);
    return s;
  }

  const overlaps = (x, z, r, s) => x + r > s.x0 && x - r < s.x1 && z + r > s.z0 && z - r < s.z1;

  // True if a body of radius r standing at height y can't be at (x, z)
  function blocked(x, z, y, r, step) {
    for (const s of surfaces) {
      if (!s.active || s.top <= y + step || !overlaps(x, z, r, s)) continue;
      // Thin floating things (platforms) only block if Pip is level with them
      if (s.bottom !== undefined && y + 1.4 <= s.bottom) continue;
      return true;
    }
    for (const c of crates) {
      if (!c.solid || y >= c.top - 0.3 || y + 1.4 <= c.base) continue;
      if (Math.abs(x - c.x) < 0.5 + r && Math.abs(z - c.z) < 0.5 + r) return true;
    }
    return false;
  }

  // Highest surface under (x, z) that something coming from fromY could stand on
  function groundAt(x, z, fromY, step, r = 0) {
    let best = null;
    for (const s of surfaces) {
      if (!s.active || s.top > fromY + step || !overlaps(x, z, r, s)) continue;
      if (!best || s.top > best.top) best = s;
    }
    return best;
  }

  // Crate whose top Pip lands on between prevY and y
  function crateBelow(x, z, prevY, y) {
    for (const c of crates) {
      if (!c.solid || c.standable) continue;
      if (Math.abs(x - c.x) < 0.75 && Math.abs(z - c.z) < 0.75 && prevY >= c.top - 0.05 && y <= c.top) return c;
    }
    return null;
  }

  return { surfaces, crates, addSurface, blocked, groundAt, crateBelow, overlaps };
}
