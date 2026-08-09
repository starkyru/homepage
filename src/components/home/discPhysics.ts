/**
 * The disc pile inside the stack ball, in ball-local pixels: centre (0,0), y
 * down, one flat array per component. No DOM and no React — `useDiscSwarm` owns
 * the frame loop and the nodes, this owns what a frame does to the numbers.
 */

const DISC_GAP = 6; // min clear space between discs so they never look stuck together
const FRICTION = 0.96; // bleeds off speed so the pile settles
const GRAVITY = 0.25; // discs settle toward the bottom of the ball
const INERTIA = 0.5; // how much the discs lag when the big ball moves

/**
 * A disc is armed by its first tap and pops on the second — or when a particle
 * from another pop reaches it, which is what makes a chain go off. A popped
 * disc sits out of the sim entirely until it respawns.
 */
export type DiscStatus = 'idle' | 'armed' | 'popped';

export interface DiscState {
  x: number[];
  y: number[];
  vx: number[];
  vy: number[];
}

/** Ring-ish spawn so discs don't all overlap at the centre. */
export function spawnDiscs(n: number, spawn: number): DiscState {
  const x: number[] = [];
  const y: number[] = [];
  const vx: number[] = [];
  const vy: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
    const rad = spawn * (0.35 + Math.random() * 0.6);
    x.push(Math.cos(a) * rad);
    y.push(Math.sin(a) * rad);
    const sp = 1.5 + Math.random() * 2;
    const va = Math.random() * Math.PI * 2;
    vx.push(Math.cos(va) * sp);
    vy.push(Math.sin(va) * sp);
  }
  return { x, y, vx, vy };
}

interface StepOptions {
  cont: number; // inner wall radius
  discR: number;
  ax: number; // the big ball's acceleration this frame, which the discs lag
  ay: number;
}

/** One frame: inertia, integration against the wall, then depenetration. */
export function stepDiscs(
  s: DiscState,
  status: DiscStatus[],
  { cont, discR, ax, ay }: StepOptions,
): void {
  const n = s.x.length;
  const inner = cont - discR;

  for (let i = 0; i < n; i++) {
    if (status[i] === 'popped') continue;
    s.vx[i] -= ax * INERTIA;
    s.vy[i] -= ay * INERTIA;
  }

  for (let i = 0; i < n; i++) {
    if (status[i] === 'popped') continue;
    s.x[i] += s.vx[i];
    s.y[i] += s.vy[i];
    s.vx[i] *= FRICTION;
    s.vy[i] *= FRICTION;
    s.vy[i] += GRAVITY;
    // inelastic circular wall: absorb the outward push, add ground friction
    const d = Math.hypot(s.x[i], s.y[i]);
    if (d + discR > cont && d > 0) {
      const nx = s.x[i] / d;
      const ny = s.y[i] / d;
      s.x[i] = nx * inner;
      s.y[i] = ny * inner;
      const vn = s.vx[i] * nx + s.vy[i] * ny;
      if (vn > 0) {
        s.vx[i] -= vn * nx;
        s.vy[i] -= vn * ny;
      }
      s.vx[i] *= 0.9;
      s.vy[i] *= 0.9;
    }
  }

  // pairwise disc collisions (slightly inelastic so the pile settles)
  for (let i = 0; i < n; i++) {
    if (status[i] === 'popped') continue;
    for (let j = i + 1; j < n; j++) {
      if (status[j] === 'popped') continue;
      const dx = s.x[j] - s.x[i];
      const dy = s.y[j] - s.y[i];
      const dist = Math.hypot(dx, dy);
      const min = discR * 2 + DISC_GAP;
      if (dist < min && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = (min - dist) / 2;
        s.x[i] -= nx * overlap;
        s.y[i] -= ny * overlap;
        s.x[j] += nx * overlap;
        s.y[j] += ny * overlap;
        const rel = ((s.vx[j] - s.vx[i]) * nx + (s.vy[j] - s.vy[i]) * ny) * 0.5;
        if (rel < 0) {
          s.vx[i] += rel * nx;
          s.vy[i] += rel * ny;
          s.vx[j] -= rel * nx;
          s.vy[j] -= rel * ny;
        }
      }
    }
  }
}
