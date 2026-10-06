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

  // Crate whose top Pip lands on between prevY and y. In a stack, the highest one:
  // a fast fall can cross more than one crate top in a single step.
  function crateBelow(x, z, prevY, y) {
    let best = null;
    for (const c of crates) {
      if (!c.solid || c.standable) continue;
      if (Math.abs(x - c.x) < 0.75 && Math.abs(z - c.z) < 0.75 && prevY >= c.top - 0.05 && y <= c.top && (!best || c.top > best.top)) best = c;
    }
    return best;
  }

  // Crate whose underside a rising head (prevHead -> head) hits; the lowest one
  function crateAbove(x, z, prevHead, head) {
    let best = null;
    for (const c of crates) {
      if (!c.solid) continue;
      if (Math.abs(x - c.x) < 0.7 && Math.abs(z - c.z) < 0.7 && prevHead <= c.base + 0.05 && head >= c.base && (!best || c.base < best.base)) best = c;
    }
    return best;
  }

  // If a crate appeared around a body (ghost crates materialising), move the body
  // out along the shortest way. Otherwise `blocked` would refuse every move and
  // it would be stuck for good.
  function pushOut(p, r, height) {
    for (const c of crates) {
      if (!c.solid || p.y >= c.top - 0.3 || p.y + height <= c.base) continue;
      const left = p.x + r - (c.x - 0.5), right = c.x + 0.5 - (p.x - r);
      const back = p.z + r - (c.z - 0.5), front = c.z + 0.5 - (p.z - r);
      if (left <= 0 || right <= 0 || back <= 0 || front <= 0) continue;
      const m = Math.min(left, right, back, front);
      if (m === left) p.x -= left; else if (m === right) p.x += right;
      else if (m === back) p.z -= back; else p.z += front;
    }
  }

  return { surfaces, crates, addSurface, blocked, groundAt, crateBelow, crateAbove, pushOut, overlaps };
}
