/**
 * Fireworks for the chain.
 *
 * Two things pop: a tech disc inside the stack ball, and a chip that has been
 * snapped off a card and then set off, which flies up under thrust and airbursts
 * near the top of the screen. Both land here as a `burst` — a spray of glowing
 * particles, fast outward, then dragged down by gravity, pulsing as they fade.
 *
 * Most particles leave whatever they came out of — a firework held inside a
 * circle reads as a fish tank. A burst may name a `wall` (the stack ball), and
 * then one in ten is caught by it and rattles around the inside instead, which
 * is what sells the other nine as having escaped something.
 *
 * Coordinates are *stage* pixels: the host sits over the whole stage, beside the
 * ball rather than in it, precisely so the sparks can outlive the ball's
 * `overflow: hidden`. A wall is read fresh every frame, since the ball is still
 * swinging while the sparks are in the air.
 *
 * Deliberately DOM-imperative and React-free, and it drives its own rAF for as
 * long as it has particles and not one frame longer. A burst is a few dozen
 * nodes moving every frame for under two seconds; routing that through state
 * would re-render the chain 60 times a second for something nothing else reads.
 */

const COUNT = 10; // default burst: ~10 ± 2 particles
const COUNT_SPREAD = 2;
const R_MIN = 2.5; // particle radius, px
const R_MAX = 4;
const SPEED_MIN = 4.5; // px/tick at birth — fast enough to clear the disc
const SPEED_MAX = 9;
const GRAVITY = 0.22; // px/tick², matches the discs' own downward drift
const DRAG = 0.985; // bleeds off the initial sprint so the fall takes over
const BOUNCE = 0.45; // restitution for the few that stay inside a wall
const BOUNCE_SHARE = 0.1; // 1 in 10 is caught by it; the rest fly through
const TTL_MIN = 1150; // ms
const TTL_MAX = 1800;
const FADE_AT = 0.5; // share of life spent at full strength before fading out
const PULSE = 0.22; // radians/tick of the throb

/**
 * Speeds are per *tick* — one 60Hz frame — not per rAF callback, and every frame
 * scales by how long it actually took. The disc pile is frame-stepped and can be:
 * it is a settling pile, and running it twice as often just settles it sooner. A
 * spray cannot. On a 120Hz screen a frame-stepped burst covers the same ground in
 * half the time, which is the difference between a firework and a blink.
 */
const TICK_MS = 1000 / 60;
const MAX_TICKS = 3; // a backgrounded tab returns with a huge dt; don't teleport

/** One colour per burst, so a pop reads as a single firework, not confetti. */
const COLORS = [
  '#ff2d2d', // red
  '#39ff14', // neon green
  '#ffe14d', // yellow
  '#00e5ff', // neon blue
  '#ff44cc', // magenta
  '#ff8a1f', // orange
  '#b46bff', // violet
];

/** The ball a caught particle bounces around in, in stage pixels. */
export interface Wall {
  x: number;
  y: number;
  r: number;
}

export interface BurstOptions {
  /** Particles in the burst, ± `spread`. Defaults to 10. */
  count?: number;
  /** How much the count varies. Defaults to 2. */
  spread?: number;
  /** Colour every particle separately instead of the whole burst at once. */
  rainbow?: boolean;
  /** Multiplies the launch speed — a bigger charge throws further. */
  speed?: number;
  /** Read every frame; ~1 in 10 of this burst stays inside it. */
  wall?: () => Wall | null;
}

/** Called once per live particle per frame, in stage coordinates. */
export type Probe = (x: number, y: number, r: number) => void;

interface Particle {
  el: HTMLDivElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  age: number; // ms
  ttl: number; // ms
  phase: number;
  wall: (() => Wall | null) | null; // set only on the caught minority
}

export interface Fireworks {
  /** Throw a burst from a point in stage coordinates. */
  burst(x: number, y: number, opts?: BurstOptions): void;
  /** Live particles. */
  count(): number;
  destroy(): void;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

/**
 * @param host   element the particle nodes are appended to. It must cover the
 *               stage unclipped: the sparks leave the ball and the cards behind,
 *               so neither can be what they are drawn in.
 * @param probes live set of watchers — every particle is offered to each of them
 *               every frame, which is how a spray sets off what it touches. The
 *               set is owned by the layer, not by the engine, so a watcher that
 *               registered before this engine existed is still heard.
 */
export function createFireworks(
  host: HTMLElement,
  probes: ReadonlySet<Probe>,
): Fireworks {
  const live: Particle[] = [];
  let raf: number | null = null;
  let prev = 0;
  let dead = false;

  const place = (p: Particle, scale: number) => {
    p.el.style.transform = `translate(${p.x - p.r}px, ${p.y - p.r}px) scale(${scale})`;
  };

  const frame = (now: number) => {
    const dt = prev ? now - prev : TICK_MS;
    prev = now;
    const ticks = Math.min(MAX_TICKS, Math.max(0, dt) / TICK_MS);
    const drag = Math.pow(DRAG, ticks);

    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i];
      p.age += dt;
      if (p.age >= p.ttl) {
        p.el.remove();
        live.splice(i, 1);
        continue;
      }
      p.vx *= drag;
      p.vy *= drag;
      p.vy += GRAVITY * ticks;
      p.x += p.vx * ticks;
      p.y += p.vy * ticks;

      // Measured against where the wall is *now* — the ball is still swinging.
      const wall = p.wall?.();
      if (wall) {
        const dx = p.x - wall.x;
        const dy = p.y - wall.y;
        const d = Math.hypot(dx, dy);
        const lim = wall.r - p.r;
        if (d > lim && d > 0) {
          const nx = dx / d;
          const ny = dy / d;
          p.x = wall.x + nx * lim;
          p.y = wall.y + ny * lim;
          const vn = p.vx * nx + p.vy * ny;
          if (vn > 0) {
            p.vx -= (1 + BOUNCE) * vn * nx;
            p.vy -= (1 + BOUNCE) * vn * ny;
          }
        }
      }

      p.phase += PULSE * ticks;
      const throb = Math.sin(p.phase);
      const t = p.age / p.ttl;
      const fade = t < FADE_AT ? 1 : 1 - (t - FADE_AT) / (1 - FADE_AT);
      place(p, 1 + 0.3 * throb);
      p.el.style.opacity = String(fade * (0.75 + 0.25 * throb));

      for (const probe of probes) probe(p.x, p.y, p.r);
    }

    if (live.length === 0) {
      raf = null; // nothing in the air — stop costing frames
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  const run = () => {
    if (raf != null || dead) return;
    prev = 0; // first frame after an idle spell takes the nominal tick
    raf = requestAnimationFrame(frame);
  };

  return {
    burst(x, y, opts = {}) {
      if (dead) return;
      const base = opts.count ?? COUNT;
      const spread = opts.spread ?? COUNT_SPREAD;
      const n = Math.round(rand(base - spread, base + spread));
      const boost = opts.speed ?? 1;
      const color = opts.rainbow ? null : pickColor();
      for (let i = 0; i < n; i++) {
        // Even fan plus jitter: every direction is covered, none look ranked.
        const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3);
        const sp = rand(SPEED_MIN, SPEED_MAX) * boost;
        const r = rand(R_MIN, R_MAX);
        const paint = color ?? pickColor();
        const el = document.createElement('div');
        el.style.cssText = [
          'position:absolute',
          'left:0',
          'top:0',
          `width:${r * 2}px`,
          `height:${r * 2}px`,
          'border-radius:50%',
          'pointer-events:none',
          `background:${paint}`,
          `box-shadow:0 0 ${Math.round(r * 3)}px ${Math.round(r)}px ${paint}`,
          'will-change:transform,opacity',
        ].join(';');
        const p: Particle = {
          el,
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          r,
          age: 0,
          ttl: rand(TTL_MIN, TTL_MAX),
          phase: Math.random() * Math.PI * 2,
          wall: opts.wall && Math.random() < BOUNCE_SHARE ? opts.wall : null,
        };
        place(p, 1);
        host.appendChild(el);
        live.push(p);
      }
      run();
    },

    count() {
      return live.length;
    },

    destroy() {
      dead = true;
      if (raf != null) cancelAnimationFrame(raf);
      raf = null;
      for (const p of live) p.el.remove();
      live.length = 0;
    },
  };
}
