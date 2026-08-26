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

import { setAccordionOpen } from '@/lib/accordion-signal';

import JobDetails from './JobDetails';
import {
  EXPERIENCE,
  MOBILE_HEADER_H,
  MOBILE_NAV_H,
  type MobileScene,
  palette,
  techLogo,
} from './model';
import SkillChainStackBall from './StackBall';
import { useFireworks } from './useFireworks';
import { useMobileChain } from './useMobileChain';

/**
 * A blurb reaches the box cut off in either of two ways, and both mean the same
 * thing to a reader: the box is not showing all of it. The parser elides the
 * summary itself at 130 characters, which is why most boxes end in an ellipsis;
 * separately, the rendered text can outgrow the box, because the box height
 * comes from a characters-per-line estimate that real word wrapping beats.
 *
 * "There is more in the panel" is deliberately NOT the test — every panel holds
 * more than its box (294–2561 characters against 87–130), so that would label
 * every box and tell the reader nothing.
 */
const ELIDED = /(?:…|\.\.\.)\s*$/;

// How long the detail sheet takes to open or close. Drives both the CSS
// transition and the scroll lock that covers it, so the two cannot drift.
const SHEET_MS = 320;

interface Props {
  scene: MobileScene;
  scrollRef: RefObject<HTMLDivElement | null>; // the outer vertical scroller
  // Carries the palette revive. It goes on the stage and the accordion rather
  // than on the scroller around them: the revive animates `filter`, and a
  // filtered ancestor would become the containing block for the accordion's
  // position: fixed and park it mid-screen until the animation ended.
  className?: string;
}

// Mobile view of the chain: a fixed logo circle on top, then experience boxes
// (with snappable tech chips) hanging in one linked strand. A bottom accordion
// tracks the box nearest the viewport centre and steps through them.
export default function SkillChainMobile({
  scene,
  scrollRef,
  className,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // Which boxes clip their blurb — indexed by box index, drives "Read more…".
  const [clipped, setClipped] = useState<boolean[]>([]);
  const P = (i: number) => scene.world.points[i];

  // --- scroll lock ----------------------------------------------------------
  // A tap on the bottom bar drives the scroller itself: the arrows ease it to
  // the next box, and the title row animates the sheet up over it. The
  // visitor's own scrolling on top of that either fights the rAF loop for
  // `scrollTop` or trips the scroll handler that shuts the sheet again — so the
  // scroller is frozen for as long as the tap's animation owns it. Both windows
  // are under a second, and neither can start without a deliberate tap.
  //
  // A class rather than an inline style: the scroller belongs to the shell,
  // which sets its overflow inline, and writing over that would leave this
  // component restoring a value it does not define. It also has to come off on
  // unmount — boring mode swaps this component out for the plain resume inside
  // the same scroller, which would inherit a frozen one.
  const easeLock = useRef(false);
  const tapLock = useRef(false);
  const tapLockTimer = useRef<number | null>(null);
  const syncLock = useCallback(() => {
    scrollRef.current?.classList.toggle(
      'chain-locked',
      easeLock.current || tapLock.current,
    );
  }, [scrollRef]);
  // Always timed, so a lock can outlive the animation it was taken for but can
  // never stick.
  const lockForTap = useCallback(
    (ms: number) => {
      tapLock.current = true;
      syncLock();
      if (tapLockTimer.current != null)
        window.clearTimeout(tapLockTimer.current);
      tapLockTimer.current = window.setTimeout(() => {
        tapLockTimer.current = null;
        tapLock.current = false;
        syncLock();
      }, ms);
    },
    [syncLock],
  );

  // --- eased vertical scroll (nav buttons) ---------------------------------
  const targetRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const endEase = useCallback(() => {
    targetRef.current = null;
    rafRef.current = null;
    easeLock.current = false;
    syncLock();
  }, [syncLock]);
  const ease = useCallback(() => {
    const el = scrollRef.current;
    if (!el || targetRef.current == null) {
      endEase();
      return;
    }
    const diff = targetRef.current - el.scrollTop;
    if (Math.abs(diff) < 0.5) {
      el.scrollTop = targetRef.current;
      endEase();
      return;
    }
    const before = el.scrollTop;
    el.scrollTop += diff * 0.16;
    // The browser rounds scrollTop to its own sub-pixel grid, so the tail of an
    // exponential ease can round away to nothing while the remaining distance
    // is still over the 0.5px finish line. The loop then spins forever a
    // fraction of a pixel short. It used to do that invisibly; now it would
    // hold the scroll lock open with it, which is how it was found.
    if (el.scrollTop === before) {
      endEase();
      return;
    }
    rafRef.current = requestAnimationFrame(ease);
  }, [scrollRef, endEase]);
  const scrollTo = useCallback(
    (value: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      targetRef.current = Math.max(0, Math.min(max, value));
      // Held until the ease lands rather than for a fixed time: the ease is
      // exponential, so how long it takes is a function of the distance.
      easeLock.current = true;
      syncLock();
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(ease);
    },
    [ease, syncLock],
  );
  const cancelEase = useCallback(() => {
    targetRef.current = null;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    easeLock.current = false;
    syncLock();
  }, [syncLock]);

  useEffect(
    () => () => {
      if (tapLockTimer.current != null)
        window.clearTimeout(tapLockTimer.current);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      scrollRef.current?.classList.remove('chain-locked');
    },
    [scrollRef],
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
  // Closed on arrival: the title row is the only thing up before any input, so
  // the chain itself is what the visitor lands on rather than a sheet covering
  // a third of it. The sheet comes up when a box or the title row asks for it.
  const [expanded, setExpanded] = useState(false);
  const keepOpenRef = useRef(false);
  const accordionRef = useRef<HTMLDivElement>(null);
  const reExpandTimer = useRef<number | null>(null);
  const swapTimer = useRef<number | null>(null);
  const animateTitleSwapRef = useRef(false);

  // The chat launcher sits directly above this bar and collapses to its icon
  // while the sheet is open. Reported rather than lifted into state — the
  // launcher is mounted in the root layout, not inside the chain.
  useEffect(() => {
    setAccordionOpen('chain-mobile', expanded && panelUp);
    return () => setAccordionOpen('chain-mobile', false);
  }, [expanded, panelUp]);

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

  const fx = useFireworks();
  useMobileChain(
    stageRef,
    scrollRef,
    scene,
    true,
    () => setReady(true),
    openBox,
    fx.fxRef,
  );

  // Which boxes actually clip has to be measured, not derived: the box height
  // comes from a characters-per-line estimate in `mobileCardHeight`, and real
  // wrapping loses whatever a word could not fill at each line end, so a blurb
  // routinely needs a line more than the estimate bought it. Measured after
  // `fonts.ready` — the fallback face wraps differently, so measuring at first
  // paint would label the wrong boxes.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let live = true;
    const measure = () => {
      if (!live) return;
      const next: boolean[] = [];
      stage.querySelectorAll<HTMLElement>('[data-card]').forEach((el) => {
        next[Number(el.dataset.card)] = el.scrollHeight > el.clientHeight + 1;
      });
      setClipped(next);
    };
    if (document.fonts) document.fonts.ready.then(measure);
    else measure();
    return () => {
      live = false;
    };
  }, [scene]);

  // Tapping a box centres it with an eased scroll and pins its panel open. Both
  // of those have to yield the moment the visitor scrolls for themselves: the
  // animation owns `scrollTop` while it runs, so a swipe against it is written
  // straight back and reads as "scrolling is broken, it keeps pulling me to the
  // box". Any scroll gesture on the strand therefore cancels the animation and
  // drops the keep-open mode. Gestures inside the accordion are excluded — its
  // own buttons scroll deliberately and manage the mode themselves.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScrollIntent = (e: Event) => {
      if (accordionRef.current?.contains(e.target as Node)) return;
      // Frozen → the gesture is not moving anything, so there is nothing to
      // yield to. Cancelling here would stop the animation the visitor just
      // asked for while the scroller is still locked against them.
      if (easeLock.current || tapLock.current) return;
      cancelEase();
      keepOpenRef.current = false;
      if (reExpandTimer.current != null) {
        window.clearTimeout(reExpandTimer.current);
        reExpandTimer.current = null;
      }
    };
    el.addEventListener('pointerdown', onScrollIntent, { passive: true });
    el.addEventListener('wheel', onScrollIntent, { passive: true });
    el.addEventListener('keydown', onScrollIntent);
    return () => {
      el.removeEventListener('pointerdown', onScrollIntent);
      el.removeEventListener('wheel', onScrollIntent);
      el.removeEventListener('keydown', onScrollIntent);
    };
  }, [scrollRef, cancelEase]);

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
        className={className}
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
          fx={fx}
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
              className='chain-box'
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
                  color: 'rgba(236,231,221,.6)',
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
              {/* Out of flow on purpose: the box height is what the rope hangs
                  from, so an affordance that took layout space would move the
                  physics. It fades the clipped last line out under itself.
                  aria-hidden because it is not a control — tapping anywhere on
                  the box already opens the panel, and the full text is in the
                  static resume for anything that reads the page. */}
              {(clipped[b.index] || ELIDED.test(b.exp.short)) && (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: '20px 18px 10px',
                    background: `linear-gradient(to top, ${palette.cardBg} 58%, rgba(28,24,19,0))`,
                    color: palette.amber,
                    fontSize: 11.5,
                    fontWeight: 500,
                    pointerEvents: 'none',
                  }}
                >
                  Read more…
                </div>
              )}
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

        {/* Particle layer for everything on this stage that can explode. Last
            child and over the boxes, so a spark crossing one is in front of it,
            and deaf to the pointer so it never steals a tap. */}
        <div
          ref={fx.hostRef}
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 4,
          }}
        />
      </div>

      {/* bottom accordion: details grow upward out of the title row */}
      <div
        ref={accordionRef}
        className={className}
        // Solid while it is up — one box over the whole bar, arrows included —
        // so a chip snapped off a box lands on it instead of dropping past. Off
        // while it is parked below the frame, or it would be an invisible shelf
        // lying across the floor.
        data-solid={panelUp ? 'box' : 'off'}
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
            transition: `max-height ${SHEET_MS}ms ease, opacity 280ms ease`,
          }}
        >
          <JobDetails job={job} padding='14px 18px' />
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
            className='chain-nav'
            style={navBtn}
          >
            <FiChevronUp size={20} />
          </button>
          <button
            type='button'
            onClick={() => {
              // The sheet is 300px of movement over the strand; a scroll
              // underneath it during those 320ms also fires the handler that
              // shuts it, so it would flick open and straight back down.
              lockForTap(SHEET_MS);
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
            className='chain-nav'
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
