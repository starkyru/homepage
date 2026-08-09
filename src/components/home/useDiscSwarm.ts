'use client';

import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';

import type { DiscState, DiscStatus } from './discPhysics';
import { spawnDiscs, stepDiscs } from './discPhysics';
import type { World } from './physics';
import type { FireworksLayer } from './useFireworks';

const SPRINT = 22; // click impulse — sends the disc darting across the ball
const SETTLE_FRAMES = 300; // hard cap (~5s) — always come to rest in time
const RESPAWN_MS = 5000; // a popped disc comes back, so the stack stays whole

interface Options {
  world: World; // outer physics world (read to react to the big ball moving)
  point: number; // index of the big ball's centre point
  r: number; // big-ball radius
  count: number; // number of discs
  discR: number; // disc radius
  fx: FireworksLayer; // the stage's shared particle layer
}

interface Swarm {
  status: DiscStatus[];
  /** Node registry — the sim writes each disc's transform straight to the DOM. */
  discRefs: RefObject<(HTMLDivElement | null)[]>;
  /** Pointer-down on disc `i`: sprint and arm, or pop if it is already armed. */
  tap: (i: number) => void;
}

/**
 * The little logo discs inside the stack ball: they drift, bounce off the wall
 * and each other, and slowly come to rest. The big ball's own position is owned
 * by the outer hanging-chain hook; this only reads it, to give the discs inertia.
 */
export function useDiscSwarm({
  world,
  point,
  r,
  count,
  discR,
  fx,
}: Options): Swarm {
  const discRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stateRef = useRef<DiscState | null>(null);
  const rafRef = useRef<number | null>(null);
  const sleepRef = useRef(false); // frozen once the discs have settled
  const wakeRef = useRef(false); // a click reopens the settle window

  // statusRef is the source of truth (the rAF loop reads it every frame and
  // pops from inside it); `status` is the mirror React renders from.
  const statusRef = useRef<DiscStatus[]>([]);
  const [status, setStatus] = useState<DiscStatus[]>([]);
  const popRef = useRef<(i: number) => void>(() => {});

  useEffect(() => {
    const n = count;
    const cont = r - 22; // inner wall radius (disc centres stay within cont-discR)
    const spawn = cont - discR;
    stateRef.current = spawnDiscs(n, spawn);

    // A rebuild (resize) re-lays the discs, so any armed or popped one starts
    // over with them — otherwise a popped disc would stay invisible at a
    // position it no longer has.
    const fresh: DiscStatus[] = Array.from({ length: n }, () => 'idle');
    statusRef.current = fresh;
    setStatus(fresh);

    const timers = new Set<ReturnType<typeof setTimeout>>();
    // The ball the caught minority of a disc burst rattles around in. Read per
    // frame by the engine, because the ball swings while they are in the air.
    const wall = () => {
      const c = world.points[point];
      return { x: c.x, y: c.y, r: cont };
    };

    const wake = () => {
      sleepRef.current = false;
      wakeRef.current = true;
    };

    const setDisc = (i: number, next: DiscStatus) => {
      const arr = statusRef.current.slice();
      arr[i] = next;
      statusRef.current = arr;
      setStatus(arr);
    };

    const draw = (i: number) => {
      const s = stateRef.current;
      const el = discRefs.current[i];
      if (s && el)
        el.style.transform = `translate(${r + s.x[i] - discR}px, ${r + s.y[i] - discR}px)`;
    };

    const respawn = (i: number) => {
      const s = stateRef.current;
      if (!s) return;
      const a = Math.random() * Math.PI * 2;
      const rad = spawn * 0.4 * Math.random();
      s.x[i] = Math.cos(a) * rad;
      s.y[i] = Math.sin(a) * rad;
      s.vx[i] = 0;
      s.vy[i] = 0;
      draw(i); // place it before it is made visible again, not a frame later
      setDisc(i, 'idle');
      wake(); // it lands on the pile, which has to settle around it
    };

    popRef.current = (i) => {
      const s = stateRef.current;
      if (!s || statusRef.current[i] !== 'armed') return;
      setDisc(i, 'popped');
      s.vx[i] = 0;
      s.vy[i] = 0;
      // Particles are staged, discs are ball-local: the ball's centre is the
      // offset between the two, and it moves.
      const c = world.points[point];
      fx.fxRef.current?.burst(c.x + s.x[i], c.y + s.y[i], { wall });
      wake(); // the pile has a hole in it now, and the burst needs frames
      const t = setTimeout(() => {
        timers.delete(t);
        respawn(i);
      }, RESPAWN_MS);
      timers.add(t);
    };

    const c0 = world.points[point];
    const track = { cx: c0.x, cy: c0.y, vx: 0, vy: 0 };
    let still = 0;
    let awake = 0; // frames since last wake
    sleepRef.current = false;

    // Any particle that reaches an armed disc sets it off — the chain. It does
    // not have to be one of this ball's own: a chip airburst overhead will do
    // it too. Both sides are put in stage pixels to compare.
    const unwatch = fx.watch((px, py, pr) => {
      const s = stateRef.current;
      if (!s) return;
      const c = world.points[point];
      for (let i = 0; i < n; i++) {
        if (statusRef.current[i] !== 'armed') continue;
        if (Math.hypot(c.x + s.x[i] - px, c.y + s.y[i] - py) < discR + pr)
          popRef.current(i);
      }
    });

    const step = () => {
      const s = stateRef.current;
      if (!s) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      const c = world.points[point];
      const st = statusRef.current;

      // Big-ball motion — drives disc inertia and wakes the sim.
      const cvx = c.x - track.cx;
      const cvy = c.y - track.cy;
      const cax = cvx - track.vx;
      const cay = cvy - track.vy;
      track.cx = c.x;
      track.cy = c.y;
      track.vx = cvx;
      track.vy = cvy;
      const moving = Math.hypot(cax, cay) > 0.3;

      if (sleepRef.current) {
        if (moving) {
          sleepRef.current = false;
          awake = 0;
        } else {
          rafRef.current = requestAnimationFrame(step);
          return; // settled — discs stay put
        }
      }
      awake++;

      // a click restarts the settle window so a late tap actually keeps moving
      // instead of being frozen by the SETTLE_FRAMES cap on the next frame.
      if (wakeRef.current) {
        wakeRef.current = false;
        awake = 0;
        still = 0;
      }

      stepDiscs(s, st, { cont, discR, ax: cax, ay: cay });

      let maxSp = 0;
      for (let i = 0; i < n; i++) {
        if (st[i] === 'popped') continue;
        maxSp = Math.max(maxSp, Math.hypot(s.vx[i], s.vy[i]));
        draw(i);
      }

      // sleep once slow for a while, or force it after the settle window
      if (maxSp < 0.3) still++;
      else still = 0;
      if (still > 30 || awake > SETTLE_FRAMES) {
        sleepRef.current = true;
        still = 0;
        for (let i = 0; i < n; i++) {
          s.vx[i] = 0;
          s.vy[i] = 0;
        }
      }

      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      for (const t of timers) clearTimeout(t);
      timers.clear();
      popRef.current = () => {};
      unwatch();
    };
  }, [count, r, discR, world, point, fx]);

  const tap = (i: number) => {
    const s = stateRef.current;
    if (!s) return;
    if (statusRef.current[i] === 'popped') return;
    if (statusRef.current[i] === 'armed') {
      popRef.current(i);
      return;
    }
    sleepRef.current = false; // wake on interaction
    wakeRef.current = true; // reopen the settle window (see step())
    const a = Math.random() * Math.PI * 2;
    s.vx[i] = Math.cos(a) * SPRINT;
    s.vy[i] = Math.sin(a) * SPRINT;
    const arr = statusRef.current.slice();
    arr[i] = 'armed';
    statusRef.current = arr;
    setStatus(arr);
  };

  return { status, discRefs, tap };
}
