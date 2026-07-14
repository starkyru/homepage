'use client';

import { type CSSProperties, useCallback, useEffect, useRef } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

import type { Scene } from './model';
import { palette, PANEL_W, techLogo } from './model';
import SkillChainStackBall from './StackBall';
import { useHangingChain } from './useHangingChain';

interface Props {
  scene: Scene;
  registerReset: (fn: () => void) => void;
}

export default function SkillChain({ scene, registerReset }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const { reset } = useHangingChain(stageRef, scene, true);
  const P = (i: number) => scene.world.points[i];

  useEffect(() => {
    registerReset(reset);
  }, [reset, registerReset]);

  // Eased horizontal scroll: lerp scrollLeft toward a target each frame so both
  // the wheel and the nav buttons feel smooth and momentum-y.
  const targetRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const ease = useCallback(() => {
    const el = scrollRef.current;
    if (!el || targetRef.current == null) {
      rafRef.current = null;
      return;
    }
    const diff = targetRef.current - el.scrollLeft;
    if (Math.abs(diff) < 0.5) {
      el.scrollLeft = targetRef.current;
      targetRef.current = null;
      rafRef.current = null;
      return;
    }
    el.scrollLeft += diff * 0.16;
    rafRef.current = requestAnimationFrame(ease);
  }, []);

  const scrollToLeft = useCallback(
    (value: number, additive = false) => {
      const el = scrollRef.current;
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      const base = additive ? (targetRef.current ?? el.scrollLeft) : 0;
      targetRef.current = Math.max(0, Math.min(max, base + value));
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(ease);
    },
    [ease],
  );

  // Mouse wheel scrolls the chain horizontally.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const delta =
        Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (delta === 0) return;
      scrollToLeft(delta, true);
      e.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [scrollToLeft]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // Prev / next: from wherever the view currently sits, centre the next box in
  // the pressed direction (so it always steps relative to the nearest box, not
  // a stale index that wheel / drag scrolling would desync).
  const go = useCallback(
    (dir: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const items = scene.itemsX;
      const clearCenter = PANEL_W + (window.innerWidth - PANEL_W) / 2;
      const cur = el.scrollLeft + clearCenter; // content x currently centred
      let i: number;
      if (dir > 0) {
        i = items.findIndex((x) => x > cur + 2);
        if (i < 0) i = items.length - 1; // already past the last
      } else {
        i = 0;
        for (let k = items.length - 1; k >= 0; k--) {
          if (items[k] < cur - 2) {
            i = k;
            break;
          }
        }
      }
      indexRef.current = i;
      scrollToLeft(items[i] - clearCenter);
    },
    [scene, scrollToLeft],
  );

  return (
    <>
      <div
        ref={scrollRef}
        className='chain-scroll'
        style={{
          position: 'absolute',
          inset: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          overscrollBehavior: 'contain',
          zIndex: 1,
        }}
      >
        <div
          ref={stageRef}
          style={{
            position: 'relative',
            width: scene.world.w,
            height: scene.world.h,
            background: palette.bg,
            userSelect: 'none',
          }}
        >
          {/* rope lines + the short rigid rods bolting each chip to its card */}
          <svg
            data-phys='1'
            width={scene.world.w}
            height={scene.world.h}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            aria-hidden
          >
            {scene.ropeSticks.map((idx) => {
              const s = scene.world.sticks[idx];
              return (
                <line
                  key={`r${idx}`}
                  data-stick={idx}
                  x1={P(s.a).x}
                  y1={P(s.a).y}
                  x2={P(s.b).x}
                  y2={P(s.b).y}
                  stroke='rgba(224,164,88,.5)'
                  strokeWidth={1.5}
                />
              );
            })}
            {scene.chips.map((ch, i) => {
              const pv = P(ch.cardPoint); // rest = upright → identity basis
              const cp = P(ch.point);
              return (
                <line
                  key={`s${i}`}
                  data-strut={i}
                  x1={pv.x + ch.bx}
                  y1={pv.y + ch.by}
                  x2={cp.x}
                  y2={cp.y}
                  stroke={palette.amber}
                  strokeWidth={2.5}
                  strokeLinecap='round'
                  strokeDasharray='1 5'
                />
              );
            })}
          </svg>

          {/* stack ball — bouncing tech logos, draggable */}
          <SkillChainStackBall
            world={scene.world}
            point={scene.techBall.point}
            r={scene.techBall.r}
            labels={scene.techBall.labels}
            initialX={P(scene.techBall.point).x}
            initialY={P(scene.techBall.point).y}
          />

          {/* experience cards */}
          {scene.cards.map((c, ci) => {
            const p = P(c.point);
            return (
              <article
                key={c.id}
                data-card={ci}
                data-point={c.point}
                data-bl={c.bl}
                data-br={c.br}
                data-kind='card'
                data-af={c.attach}
                style={{
                  position: 'absolute',
                  width: 260,
                  boxSizing: 'border-box',
                  background: palette.cardBg,
                  border: `1px solid ${palette.cardBorder}`,
                  borderRadius: 10,
                  padding: '16px 20px',
                  cursor: 'grab',
                  touchAction: 'none',
                  boxShadow: '0 14px 30px rgba(0,0,0,.45)',
                  transformOrigin: `${c.attach * 100}% top`,
                  transform: `translate(${p.x - c.attach * 260}px, ${p.y}px)`,
                  willChange: 'transform',
                }}
              >
                <div style={{ fontSize: 17, fontWeight: 600 }}>
                  {c.exp.company}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: palette.amber,
                    marginTop: 4,
                    fontWeight: 500,
                  }}
                >
                  {c.exp.role}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'rgba(236,231,221,.5)',
                    marginTop: 2,
                  }}
                >
                  {c.exp.period}
                </div>
                <p
                  style={{
                    fontSize: 12.5,
                    color: 'rgba(236,231,221,.62)',
                    margin: '8px 0 0',
                    lineHeight: 1.5,
                  }}
                >
                  {c.exp.blurb}
                </p>
              </article>
            );
          })}

          {/* round tech chips (logos) */}
          {scene.chips.map((ch) => {
            const p = P(ch.point);
            const src = techLogo(ch.label);
            return (
              <div
                key={ch.id}
                data-point={ch.point}
                data-snap={ch.id}
                data-kind='chip'
                data-cpv={ch.cardPoint}
                role='button'
                tabIndex={0}
                aria-label={`${ch.label} — press Enter to snap off`}
                title={ch.label}
                style={{
                  position: 'absolute',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: `1px solid ${palette.amber}`,
                  background: palette.ballBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transform: `translate(${p.x - 20}px, ${p.y - 20}px)`,
                  willChange: 'transform',
                }}
              >
                {src ? (
                  <img
                    src={src}
                    alt={ch.label}
                    title={ch.label}
                    width={20}
                    height={20}
                    style={{ display: 'block', pointerEvents: 'none' }}
                  />
                ) : (
                  <span style={{ fontSize: 10, color: palette.amber }}>
                    {ch.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* prev / next — centred in the region not covered by the panel */}
      <div
        style={{
          position: 'fixed',
          left: PANEL_W,
          right: 0,
          bottom: 28,
          display: 'flex',
          justifyContent: 'space-between',
          padding: '0 40px',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <button
          type='button'
          aria-label='Previous role'
          onClick={() => go(-1)}
          style={navBtn}
        >
          <FiChevronLeft size={22} />
        </button>
        <button
          type='button'
          aria-label='Next role'
          onClick={() => go(1)}
          style={navBtn}
        >
          <FiChevronRight size={22} />
        </button>
      </div>
    </>
  );
}

const navBtn: CSSProperties = {
  pointerEvents: 'auto',
  width: 48,
  height: 48,
  borderRadius: '50%',
  border: `1px solid rgba(224,164,88,.5)`,
  background: 'rgba(22,19,15,.85)',
  color: palette.amber,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backdropFilter: 'blur(4px)',
};
