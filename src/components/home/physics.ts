// A tiny, dependency-free Verlet integrator.
//
// Points carry their previous position instead of an explicit velocity, so
// integration is `x += (x - px) * damping + gravity`. Sticks are distance
// constraints solved by relaxation. Enough for hanging ropes, swinging cards
// and snappable struts — nothing more.

export interface Point {
  x: number;
  y: number;
  px: number; // previous x
  py: number; // previous y
  r: number; // radius, used for wall/floor clamping
  im: number; // inverse mass — smaller = heavier = more inertia
  pinned: boolean; // fixed anchor, never integrated
  held: boolean; // grabbed by the pointer this frame
}

export interface Stick {
  a: number; // index into World.points
  b: number;
  len: number; // rest length
  stiff: number; // 0..1
  broken: boolean;
}

export interface World {
  points: Point[];
  sticks: Stick[];
  w: number;
  h: number;
  gravity: number; // px / s^2
  damping: number; // velocity retention, 0..1
}

const DT = 1 / 60;

export function integrate(world: World): void {
  const g = world.gravity * DT * DT;
  for (const p of world.points) {
    if (p.pinned || p.held) continue;
    const vx = (p.x - p.px) * world.damping;
    const vy = (p.y - p.py) * world.damping;
    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy + g;

    // Walls: keep balls/chips inside the horizontal span.
    if (p.x < p.r) p.x = p.r;
    else if (p.x > world.w - p.r) p.x = world.w - p.r;
    // Floor: snapped items pile up at the bottom instead of vanishing.
    if (p.y > world.h - p.r) {
      p.y = world.h - p.r;
      p.py = p.y + vy * 0.4; // small bounce
      p.px = p.x + vx * 0.6; // ground friction
    }
  }
}

export function solve(world: World, iterations: number): void {
  for (let k = 0; k < iterations; k++) {
    for (const s of world.sticks) {
      if (s.broken) continue;
      const a = world.points[s.a];
      const b = world.points[s.b];
      // fixed endpoints contribute no mobility
      const wa = a.pinned || a.held ? 0 : a.im;
      const wb = b.pinned || b.held ? 0 : b.im;
      const w = wa + wb;
      if (w === 0) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.0001;
      const diff = ((s.len - d) / d) * s.stiff;
      const ox = dx * diff;
      const oy = dy * diff;
      // heavier point (smaller im) absorbs less of the correction → more inertia
      a.x -= (ox * wa) / w;
      a.y -= (oy * wa) / w;
      b.x += (ox * wb) / w;
      b.y += (oy * wb) / w;
    }
  }
}

export function step(world: World, iterations = 16): void {
  integrate(world);
  solve(world, iterations);
}
