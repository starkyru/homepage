'use client';

import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

import {
  EXPERIENCE,
  MOBILE_HEADER_H,
  MOBILE_NAV_H,
  type MobileScene,
  palette,
  techLogo,
} from './model';
import SkillChainStackBall from './StackBall';
import { useMobileChain } from './useMobileChain';

interface Props {
  scene: MobileScene;
  scrollRef: RefObject<HTMLDivElement | null>; // the outer vertical scroller
}

// Mobile view of the chain: a fixed logo circle on top, then experience boxes
// (with snappable tech chips) hanging in one linked strand. A bottom accordion
// tracks the box nearest the viewport centre and steps through them.
export default function SkillChainMobile({ scene, scrollRef }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const P = (i: number) => scene.world.points[i];

  // --- eased vertical scroll (nav buttons) ---------------------------------
  const targetRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const ease = useCallback(() => {
    const el = scrollRef.current;
    if (!el || targetRef.current == null) {
      rafRef.current = null;
      return;
    }
    const diff = targetRef.current - el.scrollTop;
    if (Math.abs(diff) < 0.5) {
      el.scrollTop = targetRef.current;
      targetRef.current = null;
      rafRef.current = null;
      return;
    }
    el.scrollTop += diff * 0.16;
    rafRef.current = requestAnimationFrame(ease);
  }, [scrollRef]);
  const scrollTo = useCallback(
    (value: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      targetRef.current = Math.max(0, Math.min(max, value));
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(ease);
    },
    [ease],
  );

  // content y at the centre of the clear band (between header and nav bar)
  const bandCenter = useCallback(() => {
    const el = scrollRef.current;
    const clientH = el?.clientHeight ?? 0;
    return MOBILE_HEADER_H + (clientH - MOBILE_HEADER_H - MOBILE_NAV_H) / 2;
  }, [scrollRef]);
  const stageOffset = () => stageRef.current?.offsetTop ?? 0;

  // --- bottom accordion state ----------------------------------------------
  const [centered, setCentered] = useState(0);
  const [shownJob, setShownJob] = useState(0);
  const [panelUp, setPanelUp] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const keepOpenRef = useRef(false);
  const reExpandTimer = useRef<number | null>(null);
  const swapTimer = useRef<number | null>(null);
  const animateTitleSwapRef = useRef(false);

  const nearestJob = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return 0;
    const cur = el.scrollTop + bandCenter() - stageOffset();
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < scene.itemsY.length; i++) {
      const d = Math.abs(scene.itemsY[i] - cur);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }, [scene, bandCenter, scrollRef]);

  const go = useCallback(
    (dir: number) => {
      const el = scrollRef.current;
      if (!el) return;
      if (reExpandTimer.current != null) {
        window.clearTimeout(reExpandTimer.current);
        reExpandTimer.current = null;
      }
      if (expanded) setExpanded(false);
      const off = stageOffset();
      const items = scene.itemsY;
      const cur = el.scrollTop + bandCenter(); // content y at band centre
      let i: number;
      if (dir > 0) {
        i = items.findIndex((y) => off + y > cur + 2);
        if (i < 0) i = items.length - 1;
      } else {
        i = 0;
        for (let k = items.length - 1; k >= 0; k--) {
          if (off + items[k] < cur - 2) {
            i = k;
            break;
          }
        }
      }
      scrollTo(off + items[i] - bandCenter());
    },
    [expanded, scene, bandCenter, scrollTo, scrollRef],
  );

  // tap on a box → centre it and open (and keep open) its accordion
  const openBox = useCallback(
    (i: number) => {
      keepOpenRef.current = true;
      setCentered(i);
      setExpanded(true);
      scrollTo(stageOffset() + scene.itemsY[i] - bandCenter());
    },
    [scene, bandCenter, scrollTo],
  );

  useMobileChain(
    stageRef,
    scrollRef,
    scene,
    true,
    () => setReady(true),
    openBox,
  );

  // track the centred box on scroll; re-open the panel once scrolling stops
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      setCentered(nearestJob());
      setExpanded(false);
      if (keepOpenRef.current) {
        if (reExpandTimer.current != null)
          window.clearTimeout(reExpandTimer.current);
        reExpandTimer.current = window.setTimeout(() => {
          setExpanded(true);
          reExpandTimer.current = null;
        }, 220);
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [nearestJob, scrollRef]);

  // swap the title, then drop it down and pop it back up with the new role
  useEffect(() => {
    if (centered === shownJob) return;
    setExpanded(false);
    animateTitleSwapRef.current = true;
    setShownJob(centered);
  }, [centered, shownJob]);

  useEffect(() => {
    if (!animateTitleSwapRef.current) return;
    animateTitleSwapRef.current = false;
    setPanelUp(false);
    if (swapTimer.current != null) window.clearTimeout(swapTimer.current);
    swapTimer.current = window.setTimeout(() => {
      setPanelUp(true);
      swapTimer.current = null;
    }, 200);
    return () => {
      if (swapTimer.current != null) {
        window.clearTimeout(swapTimer.current);
        swapTimer.current = null;
      }
    };
  }, [shownJob]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (reExpandTimer.current != null)
        window.clearTimeout(reExpandTimer.current);
      if (swapTimer.current != null) window.clearTimeout(swapTimer.current);
    },
    [],
  );

  const job = EXPERIENCE[shownJob];

  return (
    <>
      <div
        ref={stageRef}
        style={{
          position: 'relative',
          width: scene.world.w,
          height: scene.world.h,
          margin: '0 auto',
          userSelect: 'none',
          opacity: ready ? 1 : 0,
          transition: 'opacity .45s ease',
        }}
      >
        {/* rope lines + the short rigid rods bolting each chip to its box */}
        <svg
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
            const pv = P(ch.cardPoint);
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

        {/* fixed tech circle — bouncing logos inside, the circle stays put */}
        <SkillChainStackBall
          world={scene.world}
          point={scene.techBall.point}
          r={scene.techBall.r}
          labels={scene.techBall.labels}
          initialX={P(scene.techBall.point).x}
          initialY={P(scene.techBall.point).y}
        />

        {/* experience boxes */}
        {scene.boxes.map((b) => {
          const p = P(b.point);
          return (
            <article
              key={b.id}
              data-card={b.index}
              data-kind='card'
              data-point={b.point}
              data-bl={b.bl}
              data-br={b.br}
              data-af={b.attach}
              style={{
                position: 'absolute',
                width: scene.cardW,
                height: b.height,
                boxSizing: 'border-box',
                background: palette.cardBg,
                border: `1px solid ${palette.cardBorder}`,
                borderRadius: 10,
                padding: '14px 18px',
                overflow: 'hidden',
                cursor: 'grab',
                touchAction: 'none',
                boxShadow: '0 14px 30px rgba(0,0,0,.45)',
                transformOrigin: `${b.attach * 100}% top`,
                transform: `translate(${p.x - b.attach * scene.cardW}px, ${p.y}px)`,
                willChange: 'transform',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {b.exp.company}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: palette.amber,
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                {b.exp.role}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'rgba(236,231,221,.5)',
                  marginTop: 2,
                }}
              >
                {b.exp.period}
              </div>
              <p
                style={{
                  fontSize: 12.5,
                  color: 'rgba(236,231,221,.62)',
                  margin: '8px 0 0',
                  lineHeight: 1.5,
                }}
              >
                {b.exp.short}
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
                touchAction: 'none',
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

      {/* bottom accordion: details grow upward out of the title row */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 6,
          pointerEvents: 'none',
          transform: panelUp ? 'translateY(0)' : 'translateY(120%)',
          opacity: panelUp ? 1 : 0,
          transition:
            'transform .22s cubic-bezier(.4,0,.2,1), opacity .22s ease',
        }}
      >
        {/* description sheet — appears above the title row when expanded */}
        <div
          style={{
            pointerEvents: 'auto',
            margin: '0 12px',
            maxHeight: expanded ? 300 : 0,
            opacity: expanded ? 1 : 0,
            overflowY: expanded ? 'auto' : 'hidden',
            overflowX: 'hidden',
            background: palette.cardBg,
            border: `1px solid ${palette.cardBorder}`,
            borderBottom: 'none',
            borderRadius: '10px 10px 0 0',
            transition: 'max-height .32s ease, opacity .28s ease',
          }}
        >
          <div style={{ padding: '14px 18px' }}>
            <div
              style={{ fontSize: 12, fontWeight: 500, color: palette.amber }}
            >
              {job.role}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: 'rgba(236,231,221,.5)',
                marginTop: 2,
              }}
            >
              {job.period}
            </div>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 12.5,
                lineHeight: 1.5,
                color: 'rgba(236,231,221,.72)',
                whiteSpace: 'pre-line',
              }}
            >
              {job.blurb}
            </p>
          </div>
        </div>

        {/* title row — prev / expandable title / next, always at the bottom */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'stretch',
            gap: 8,
            padding: '10px 12px',
            background: 'rgba(16,14,11,.96)',
            borderTop: `1px solid ${palette.hairline}`,
            backdropFilter: 'blur(4px)',
          }}
        >
          <button
            type='button'
            aria-label='Previous role'
            onClick={() => go(-1)}
            style={navBtn}
          >
            <FiChevronUp size={20} />
          </button>
          <button
            type='button'
            onClick={() => {
              setExpanded((v) => {
                const next = !v;
                keepOpenRef.current = next;
                return next;
              });
              if (reExpandTimer.current != null) {
                window.clearTimeout(reExpandTimer.current);
                reExpandTimer.current = null;
              }
            }}
            aria-expanded={expanded}
            aria-label={`${job.company} — ${expanded ? 'hide' : 'show'} details`}
            style={{
              flex: '1 1 auto',
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '0 16px',
              height: 44,
              background: 'rgba(28,24,19,.92)',
              border: `1px solid ${palette.cardBorder}`,
              borderRadius: 8,
              color: palette.text,
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {job.company}
            </span>
            <FiChevronUp
              size={18}
              style={{
                flexShrink: 0,
                color: palette.amber,
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform .25s ease',
              }}
            />
          </button>
          <button
            type='button'
            aria-label='Next role'
            onClick={() => go(1)}
            style={navBtn}
          >
            <FiChevronDown size={20} />
          </button>
        </div>
      </div>
    </>
  );
}

const navBtn: CSSProperties = {
  flexShrink: 0,
  width: 44,
  height: 44,
  borderRadius: 8,
  border: `1px solid rgba(224,164,88,.5)`,
  background: 'rgba(28,24,19,.85)',
  color: palette.amber,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};
