'use client';

import { useEffect, useMemo, useRef } from 'react';

import { palette, techLogo } from './model';
import type { World } from './physics';

interface Props {
  world: World; // outer physics world (read to react to the big ball moving)
  point: number; // index of the big ball's centre point
  r: number; // big-ball radius
  labels: string[];
  initialX: number;
  initialY: number;
}

const BALL_R = 18;
const FRICTION = 0.96; // bleeds off speed so the pile settles
const GRAVITY = 0.25; // discs settle toward the bottom of the ball
const INERTIA = 0.5; // how much the discs lag when the big ball moves
const SPRINT = 9;
const SETTLE_FRAMES = 300; // hard cap (~5s) — always come to rest in time

interface Tech {
  label: string;
  src: string;
}

/**
 * The "stack" ball: a hanging circle whose technologies are little logo discs
 * that drift around inside, bouncing off the wall and each other and slowly
 * coming to rest. Clicking a disc sends it sprinting in a random direction.
 * The big ball's own position is owned by the outer hanging-chain hook.
 */
export default function StackBall({
  world,
  point,
  r,
  labels,
  initialX,
  initialY,
}: Props) {
  // Unique logos (drops the duplicate React / React Native icon).
  const techs = useMemo<Tech[]>(() => {
    const seen = new Set<string>();
    const out: Tech[] = [];
    for (const label of labels) {
      const src = techLogo(label);
      if (!src || seen.has(src)) continue;
      seen.add(src);
      out.push({ label, src });
    }
    return out;
  }, [labels]);

  const discRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stateRef = useRef<{
    x: number[];
    y: number[];
    vx: number[];
    vy: number[];
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const sleepRef = useRef(false); // frozen once the discs have settled

  useEffect(() => {
    const n = techs.length;
    const cont = r - 22; // inner wall radius (ball centre stays within cont-BALL_R)
    const spawn = cont - BALL_R;
    const x: number[] = [];
    const y: number[] = [];
    const vx: number[] = [];
    const vy: number[] = [];
    for (let i = 0; i < n; i++) {
      // Ring-ish spawn so discs don't all overlap at the centre.
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
      const rad = spawn * (0.35 + Math.random() * 0.6);
      x.push(Math.cos(a) * rad);
      y.push(Math.sin(a) * rad);
      const sp = 1.5 + Math.random() * 2;
      const va = Math.random() * Math.PI * 2;
      vx.push(Math.cos(va) * sp);
      vy.push(Math.sin(va) * sp);
    }
    stateRef.current = { x, y, vx, vy };

    const inner = cont - BALL_R;
    const c0 = world.points[point];
    const track = { cx: c0.x, cy: c0.y, vx: 0, vy: 0 };
    let still = 0;
    let awake = 0; // frames since last wake
    sleepRef.current = false;

    const step = () => {
      const s = stateRef.current;
      if (!s) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      // Big-ball motion — drives disc inertia and wakes the sim.
      const c = world.points[point];
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

      for (let i = 0; i < n; i++) {
        s.vx[i] -= cax * INERTIA;
        s.vy[i] -= cay * INERTIA;
      }

      for (let i = 0; i < n; i++) {
        s.x[i] += s.vx[i];
        s.y[i] += s.vy[i];
        s.vx[i] *= FRICTION;
        s.vy[i] *= FRICTION;
        s.vy[i] += GRAVITY;
        // inelastic circular wall: absorb the outward push, add ground friction
        const d = Math.hypot(s.x[i], s.y[i]);
        if (d + BALL_R > cont && d > 0) {
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
        for (let j = i + 1; j < n; j++) {
          const dx = s.x[j] - s.x[i];
          const dy = s.y[j] - s.y[i];
          const dist = Math.hypot(dx, dy);
          const min = BALL_R * 2;
          if (dist < min && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (min - dist) / 2;
            s.x[i] -= nx * overlap;
            s.y[i] -= ny * overlap;
            s.x[j] += nx * overlap;
            s.y[j] += ny * overlap;
            const rel =
              ((s.vx[j] - s.vx[i]) * nx + (s.vy[j] - s.vy[i]) * ny) * 0.5;
            if (rel < 0) {
              s.vx[i] += rel * nx;
              s.vy[i] += rel * ny;
              s.vx[j] -= rel * nx;
              s.vy[j] -= rel * ny;
            }
          }
        }
      }

      let maxSp = 0;
      for (let i = 0; i < n; i++) {
        maxSp = Math.max(maxSp, Math.hypot(s.vx[i], s.vy[i]));
        const el = discRefs.current[i];
        if (el)
          el.style.transform = `translate(${r + s.x[i] - BALL_R}px, ${r + s.y[i] - BALL_R}px)`;
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
    };
  }, [techs, r, world, point]);

  const sprint = (i: number) => {
    const s = stateRef.current;
    if (!s) return;
    sleepRef.current = false; // wake on interaction
    const a = Math.random() * Math.PI * 2;
    s.vx[i] = Math.cos(a) * SPRINT;
    s.vy[i] = Math.sin(a) * SPRINT;
  };

  return (
    <div
      data-point={point}
      data-card='stack'
      role='img'
      aria-label={`Technology stack: ${techs.map((t) => t.label).join(', ')}`}
      style={{
        position: 'absolute',
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        border: `1px solid ${palette.amber}`,
        background: palette.ballBg,
        boxShadow: '0 14px 30px rgba(0,0,0,.45)',
        cursor: 'grab',
        touchAction: 'none',
        overflow: 'hidden',
        transform: `translate(${initialX - r}px, ${initialY - r}px)`,
        willChange: 'transform',
      }}
    >
      {techs.map((t, i) => (
        <div
          key={t.src}
          ref={(el) => {
            discRefs.current[i] = el;
          }}
          onPointerDown={(e) => {
            e.stopPropagation(); // don't start dragging the big ball
            sprint(i);
          }}
          title={t.label}
          style={{
            position: 'absolute',
            width: BALL_R * 2,
            height: BALL_R * 2,
            borderRadius: '50%',
            border: `1px solid ${palette.amber}`,
            background: palette.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            willChange: 'transform',
          }}
        >
          <img
            src={t.src}
            alt={t.label}
            title={t.label}
            width={20}
            height={20}
            style={{ display: 'block', pointerEvents: 'none' }}
          />
        </div>
      ))}
    </div>
  );
}
