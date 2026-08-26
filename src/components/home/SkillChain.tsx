'use client';

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { FiChevronLeft, FiChevronRight, FiChevronUp } from 'react-icons/fi';

import { setAccordionOpen } from '@/lib/accordion-signal';

import JobDetails from './JobDetails';
import type { Scene } from './model';
import { ANCHOR_Y, EXPERIENCE, palette, PANEL_W, techLogo } from './model';
import { dropFrom, lean, payOut } from './physics';
import SkillChainStackBall from './StackBall';
import { useFireworks } from './useFireworks';
import { useHangingChain } from './useHangingChain';

/** Where the chain sits in the boring-mode transition. `in` is the settled,
 *  interactive chain; the other two are the drop-out / drop-in animations. */
export type ChainView = 'in' | 'leaving' | 'entering';

// Spelled out rather than built as `chain-stage--${view}`: these rules live in
// globals.css and Tailwind cannot see through a template literal when it decides
// what to keep. (They sit outside @layer utilities too, so this is belt and
// braces — but the same trap already bit the palette-drain classes once.)
const STAGE_CLASS: Record<ChainView, string> = {
  in: 'chain-stage',
  leaving: 'chain-stage chain-stage--leaving',
  entering: 'chain-stage chain-stage--entering',
};

const HUD_CLASS: Record<ChainView, string> = {
  in: 'chain-hud',
  leaving: 'chain-hud chain-hud--leaving',
  entering: 'chain-hud chain-hud--entering',
};

/** The page change (see SiteShell): the whole chain — stage and HUD together —
 *  slides off to the right and comes back the same way. Layered on top of the
 *  boring-mode `view`, which stays `in` throughout, so the two never share a
 *  class name and cannot fight over one `animation` property. */
const SLIDE_STAGE = {
  out: ' chain-stage--sliding-out',
  in: ' chain-stage--sliding-in',
} as const;

const SLIDE_HUD = {
  out: ' chain-hud--sliding-out',
  in: ' chain-hud--sliding-in',
} as const;

// How far off plumb a strand may be held while it drops in. Small enough to read
// as a card hanging a little askew rather than as a deliberate shove.
const ENTER_LEAN = (9 * Math.PI) / 180;

/**
 * The tilt strand `i` is dropped at — signed, so cards land leaning both ways
 * and swing back through vertical from opposite sides, and never less than 45%
 * of full, since a strand dropped near plumb has nothing to swing back from.
 *
 * Deterministic in the index: the drop-in effect re-runs whenever the scene is
 * rebuilt, and a chain that leaned a different way each time would jump.
 */
function strandLean(i: number): number {
  // Seeded to give this many strands a fair mix of both signs — the obvious
  // 127.1 the scene layout uses comes out five-to-two one way.
  const h = Math.sin((i + 1) * 12.9898) * 43758.5453;
  const s = (h - Math.floor(h)) * 2 - 1; // -1 … 1
  return (s < 0 ? -1 : 1) * (0.45 + Math.abs(s) * 0.55) * ENTER_LEAN;
}

/**
 * The loads' own fall, in ms from the moment the chain view mounts.
 *
 * This is the entrance you actually watch; the stage's drop (0.25s delay + 0.6s,
 * per .chain-stage--entering) is only how the scene gets there. The stage must
 * be *finished* by the time this is under way, because anything it does
 * afterwards moves every anchor at once and shows up as the whole chain
 * twitching mid-fall.
 *
 * The delay is set so the loads break the top of the frame just as the stage
 * settles at 850ms. They start out of sight (`Strand.clear`) and an accelerating
 * fall is slow to begin with, so the first ~180ms of it is spent off-frame;
 * starting them at 700 spends that against the stage's own last moments instead
 * of against an empty stage.
 */
const ENTER_DROP_DELAY = 700;
const ENTER_DROP_TIME = 600;

/** When the simulation gets the chain back — the instant the last rope goes
 *  taut. Let go earlier and the swing is spent before the load has landed.
 *  SiteShell's TRANSITION_MS['to-chain'] must outlast this. */
const ENTER_DROP_MS = ENTER_DROP_DELAY + ENTER_DROP_TIME;

/**
 * A load falling on a rope: gravity all the way down, past the end of the rope,
 * then hauled back as the rope goes taut.
 *
 * `OVER` is how far past its own length a rope gives, so 1.18 is an 18% stretch
 * — well inside the 120% its stretch cap allows (ROPE_MAX_STRETCH), and every
 * strand gives the same fraction of its own length rather than of its trip. It
 * returns without oscillating, like the rope itself: the ropes are critically
 * damped, and it is the swing that follows, not this, that carries the energy
 * off.
 */
function dropEase(u: number): number {
  const OVER = 1.18;
  const CATCH = 0.85; // where the rope stops the fall
  if (u < CATCH) {
    const k = u / CATCH;
    return OVER * k * k;
  }
  const k = (u - CATCH) / (1 - CATCH);
  return OVER + (1 - OVER) * (1 - (1 - k) * (1 - k));
}

interface Props {
  scene: Scene;
  registerReset: (fn: () => void) => void;
  view?: ChainView;
  /** Page change: 'out' as another page takes the stage, 'in' coming back. */
  slide?: 'out' | 'in';
  /**
   * Parked off-stage while another page is up. The simulation is torn down —
   * nothing is moving and nobody can see it — but the scroller stays mounted, so
   * the scene keeps its pose and its scroll position and the chain comes back to
   * exactly where it was left, with no rebuild.
   */
  parked?: boolean;
}

export default function SkillChain({
  scene,
  registerReset,
  view = 'in',
  slide,
  parked = false,
}: Props) {
  // Mid-transition the chain is still mounted but must not take input: the
  // resume is sliding over it, and the HUD children set pointerEvents inline,
  // which no stylesheet rule can outrank. The same holds while it is sliding to
  // or from another page, and while it sits parked there.
  const busy = view !== 'in' || slide !== undefined || parked;
  const hit = busy ? ('none' as const) : ('auto' as const);
  // While the chain is dropping in, the simulation is held off plumb so the
  // cards arrive leaning; releasing it at the bottom is what makes them swing.
  const [held, setHeld] = useState(view === 'entering');
  const scrollRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  // Hidden until the chain settles, then faded in — hides the initial swing.
  const [ready, setReady] = useState(false);
  // Forwards a card tap to openCard (defined below, after its dependencies).
  const openCardRef = useRef<(index: number) => void>(() => {});
  const fx = useFireworks();
  const { reset } = useHangingChain(
    stageRef,
    scene,
    !parked,
    () => setReady(true),
    (i) => openCardRef.current(i),
    held,
    fx.fxRef,
  );
  const P = (i: number) => scene.world.points[i];

  // Pull the chain aside, freeze it there, and drop it. The simulation is held
  // for the whole entrance — every pose in it is placed, not solved — and this
  // timer is the hand-off: at the end the loads are exactly where the scene was
  // built to hold them, leaning, and the solver takes over and swings them.
  //
  // The anchors never move. The cards and the ball start gathered right up at
  // them with no rope showing and fall away on their own clock, well after the
  // stage carrying them has landed, so the ropes are seen coming out of a
  // ceiling fixed at the top of the frame rather than arriving with the card.
  useEffect(() => {
    if (view !== 'entering') {
      setHeld(false);
      return;
    }
    const { world, strands } = scene;
    setHeld(true);
    lean(
      world,
      strands,
      strands.map((_, i) => strandLean(i)),
      ANCHOR_Y,
    );
    const drop = dropFrom(world, strands); // the pose the loads come home to
    let raf = 0;
    let falling = true;
    const land = () => {
      if (!falling) return;
      falling = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      payOut(world, drop, 1); // ropes taut, loads home
    };
    const start = performance.now();
    const tick = () => {
      const u =
        (performance.now() - start - ENTER_DROP_DELAY) / ENTER_DROP_TIME;
      payOut(world, drop, dropEase(Math.max(0, Math.min(1, u))));
      raf = requestAnimationFrame(tick);
    };
    tick();
    const timer = window.setTimeout(() => {
      land();
      setHeld(false);
    }, ENTER_DROP_MS);
    return () => {
      window.clearTimeout(timer);
      land(); // an interrupted drop must never leave a load off its rope
    };
  }, [view, scene]);

  useEffect(() => {
    registerReset(reset);
  }, [reset, registerReset]);

  // Eased horizontal scroll: lerp scrollLeft toward a target each frame so both
  // the wheel and the nav buttons feel smooth and momentum-y.
  const targetRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [expanded, setExpanded] = useState(false);

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
      if (reExpandTimer.current != null)
        window.clearTimeout(reExpandTimer.current);
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
      // Close first; the easing completion re-opens it if the keep-open flag is
      // set, once the scroll and title swap for the newly centred card finish.
      if (reExpandTimer.current != null) {
        window.clearTimeout(reExpandTimer.current);
        reExpandTimer.current = null;
      }
      if (expanded) setExpanded(false);
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
      // The re-open is handled centrally when the ease settles (see `ease`),
      // so wheel and arrow navigation restore the panel the same way.
    },
    [expanded, scene, scrollToLeft],
  );

  // ← / → step through the roles exactly like the on-screen arrows. Skipped
  // while a chip has focus (Enter/Space snaps it off, arrows should still nav)
  // only if a modifier is held or focus sits in a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (busy) return; // the chain is on its way out (or in) — don't scroll it
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t?.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName ?? '')
      )
        return;
      e.preventDefault();
      go(e.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, busy]);

  // --- centred-job accordion (between the arrows) --------------------------
  // `centered` = the experience nearest the viewport centre; `shownJob` is the
  // one the panel currently displays. When they differ the panel drops down and
  // pops back up with the new title. `expanded` grows it upward to reveal the
  // full description; a click or any horizontal scroll sends it back down.
  const [centered, setCentered] = useState(0);
  const [shownJob, setShownJob] = useState(0);
  const [panelUp, setPanelUp] = useState(true);
  const swapTimer = useRef<number | null>(null);
  const animateTitleSwapRef = useRef(false);
  // Sticky "keep the accordion open" flag. False by default. The user opening
  // the panel sets it; closing it clears it. While set, every settled scroll
  // (wheel or arrows) re-opens the panel on the newly centred experience.
  const keepOpenRef = useRef(false);
  const reExpandTimer = useRef<number | null>(null);

  // The chat launcher sits in this corner and collapses to its icon while the
  // panel is open. Reported rather than lifted into state — nothing here needs
  // to re-render, and the launcher is mounted in the root layout, not in the
  // chain. `busy` is what keeps a parked or mid-transition chain from claiming
  // an accordion the visitor cannot see: on /projects this stays mounted.
  useEffect(() => {
    setAccordionOpen('chain', expanded && panelUp && !busy);
    return () => setAccordionOpen('chain', false);
  }, [expanded, panelUp, busy]);

  const nearestJob = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return 0;
    const items = scene.itemsX;
    const clearCenter = PANEL_W + (window.innerWidth - PANEL_W) / 2;
    const cur = el.scrollLeft + clearCenter;
    let best = 1; // items[0] is the stack ball — only real cards count
    let bestD = Infinity;
    for (let i = 1; i < items.length; i++) {
      const d = Math.abs(items[i] - cur);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best - 1; // → EXPERIENCE index
  }, [scene]);

  // Track the centred card on scroll. Arrow navigation intentionally collapses
  // the panel immediately; wheel navigation lets the title-swap effect below
  // control its transition once the next card becomes centred.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      setCentered(nearestJob());
      setExpanded(false);
      // While the keep-open flag is set, re-open the panel once scrolling stops.
      // Debounced off the scroll events themselves, so it fires no matter what
      // drove the scroll (wheel, trackpad momentum, arrows, edge-drag).
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
  }, [nearestJob]);

  // Update the title first, then animate that new title down and back up. This
  // keeps wheel navigation from visibly moving the outgoing role as if it were
  // the selected one.
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

  // Tap on a hanging card → centre it and open (and keep open) its accordion.
  const openCard = useCallback(
    (i: number) => {
      keepOpenRef.current = true;
      setCentered(i);
      setExpanded(true);
      const items = scene.itemsX;
      const clearCenter = PANEL_W + (window.innerWidth - PANEL_W) / 2;
      indexRef.current = i + 1;
      scrollToLeft(items[i + 1] - clearCenter);
    },
    [scene, scrollToLeft],
  );
  openCardRef.current = openCard;

  const job = EXPERIENCE[shownJob];

  return (
    <>
      <div
        ref={scrollRef}
        className={
          STAGE_CLASS[view] +
          (slide ? SLIDE_STAGE[slide] : '') +
          (parked ? ' chain-stage--parked' : '')
        }
        style={{
          position: 'absolute',
          inset: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          overscrollBehavior: 'contain',
          pointerEvents: hit,
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
            opacity: ready ? 1 : 0,
            transition: 'opacity .45s ease',
          }}
        >
          {/* rope lines + the short rigid rods bolting each chip to its card */}
          <svg
            data-phys='1'
            className='chain-ropes'
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
            fx={fx}
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
                    color: 'rgba(236,231,221,.6)',
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
                  {c.exp.short}
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

          {/* Particle layer for everything on this stage that can explode. Last
              child and over the cards, so a spark crossing one is in front of
              it, and deaf to the pointer so it never steals a tap. */}
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
      </div>

      {/* prev / next + the centred-job accordion panel between them */}
      <div
        className={
          HUD_CLASS[view] +
          (slide ? SLIDE_HUD[slide] : '') +
          (parked ? ' chain-hud--parked' : '')
        }
        style={{
          position: 'fixed',
          left: PANEL_W,
          right: 0,
          bottom: 28,
          display: 'flex',
          alignItems: 'flex-end',
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
          className='chain-nav chain-nav--prev'
          data-solid='circle'
          style={{ ...navBtn, pointerEvents: hit }}
        >
          <FiChevronLeft size={22} />
        </button>

        <div
          className='chain-panel'
          // Solid while it is up: a chip snapped off a card lands on the panel
          // and stays there. Off while it is parked below the frame, or it
          // would be an invisible shelf lying across the floor.
          data-solid={panelUp ? 'box' : 'off'}
          style={{
            pointerEvents: hit,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            flex: '1 1 auto',
            minWidth: 0, // allow shrink so the arrows never get pushed off-screen
            margin: '0 24px', // padding between the panel and the arrows
            transform: panelUp ? 'translateY(0)' : 'translateY(150%)',
            opacity: panelUp ? 1 : 0,
            transition:
              'transform .22s cubic-bezier(.4,0,.2,1), opacity .22s ease',
          }}
        >
          {/* title bar — always on top; click toggles the accordion */}
          <button
            type='button'
            onClick={() => {
              // User drives the sticky flag: open → keep open on nav; close → stop.
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              width: '100%',
              padding: '11px 18px',
              background: 'rgba(22,19,15,.92)',
              border: `1px solid ${palette.cardBorder}`,
              borderRadius: expanded ? '10px 10px 0 0' : 10,
              color: palette.text,
              font: 'inherit',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 14px 30px rgba(0,0,0,.4)',
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

          {/* description — grows downward out of the title bar when expanded */}
          <div
            style={{
              maxHeight: expanded ? 340 : 0,
              opacity: expanded ? 1 : 0,
              overflowY: expanded ? 'auto' : 'hidden', // scroll when full text exceeds the cap
              overflowX: 'hidden',
              background: palette.cardBg,
              border: `1px solid ${palette.cardBorder}`,
              borderTop: 'none',
              borderRadius: '0 0 10px 10px',
              transition: 'max-height .32s ease, opacity .28s ease',
            }}
          >
            <JobDetails job={job} padding='12px 18px 14px' />
          </div>
        </div>

        <button
          type='button'
          aria-label='Next role'
          onClick={() => go(1)}
          data-solid='circle'
          className='chain-nav chain-nav--next'
          style={{ ...navBtn, pointerEvents: hit }}
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
  flexShrink: 0, // keep the circle from squashing into an oval when the panel grows
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
