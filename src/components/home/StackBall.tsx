'use client';

import { useMemo } from 'react';

import { palette, techLogo } from './model';
import type { World } from './physics';
import type { Tech } from './StackBallDisc';
import StackBallDisc from './StackBallDisc';
import { useDiscSwarm } from './useDiscSwarm';
import type { FireworksLayer } from './useFireworks';

interface Props {
  world: World; // outer physics world (read to react to the big ball moving)
  point: number; // index of the big ball's centre point
  r: number; // big-ball radius
  labels: string[];
  initialX: number;
  initialY: number;
  fx: FireworksLayer; // the stage's shared particle layer
}

const DISC_R_MAX = 18;
const DISC_R_MIN = 10;
const DISC_FILL = 0.5; // share of the ball's area the discs may occupy

/**
 * The "stack" ball: a hanging circle whose technologies are little logo discs
 * that drift around inside, bouncing off the wall and each other and slowly
 * coming to rest. Tapping a disc sends it sprinting in a random direction and
 * arms it — a red halo — and tapping an armed disc pops it into fireworks whose
 * particles set off any other armed disc they touch.
 * The big ball's own position is owned by the outer hanging-chain hook.
 */
export default function StackBall({
  world,
  point,
  r,
  labels,
  initialX,
  initialY,
  fx,
}: Props) {
  // One disc per distinct logo (React / React Native share an icon), plus a
  // text disc for anything with no logo, so nothing is silently dropped.
  const techs = useMemo<Tech[]>(() => {
    const seen = new Set<string>();
    const out: Tech[] = [];
    for (const label of labels) {
      const src = techLogo(label);
      const key = src ?? `label:${label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label, src });
    }
    return out;
  }, [labels]);

  // Discs shrink as the stack grows so they keep fitting inside the ball.
  const discR = useMemo(() => {
    const cont = r - 22;
    const ideal = Math.sqrt(
      (DISC_FILL * cont * cont) / Math.max(1, techs.length),
    );
    return Math.max(DISC_R_MIN, Math.min(DISC_R_MAX, Math.round(ideal)));
  }, [r, techs.length]);

  const { status, discRefs, tap } = useDiscSwarm({
    world,
    point,
    r,
    count: techs.length,
    discR,
    fx,
  });

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
        <StackBallDisc
          key={t.src ?? t.label}
          ref={(el) => {
            discRefs.current[i] = el;
          }}
          tech={t}
          discR={discR}
          status={status[i] ?? 'idle'}
          onTap={() => tap(i)}
        />
      ))}
    </div>
  );
}
