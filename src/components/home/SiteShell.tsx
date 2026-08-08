'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { homeFontVars } from '@/lib/fonts';

import ProjectsShowcase from '@/components/projects/ProjectsShowcase';

import IdentityPanel, { btnOutline, btnPrimary } from './IdentityPanel';
import {
  buildMobileScene,
  buildScene,
  MOBILE_HEADER_H,
  MOBILE_NAV_H,
  palette,
  PANEL_W,
  SOCIALS,
} from './model';
import SkillChain from './SkillChain';
import SkillChainMobile from './SkillChainMobile';
import StaticShowcase from './StaticShowcase';

const RESUME_PDF =
  'https://docs.google.com/document/d/1FozMEumbKlGOmrFjOYAsLtrpIC0WKh1Y/export?format=pdf';

const MIN_PHYSICS_WIDTH = 900;

// Every class name in this file is written out as a literal, never assembled
// from parts. The palette and crossover rules live in @layer utilities, which
// Tailwind tree-shakes against the names it can find by scanning source, and it
// cannot see through a template literal — that already cost us the drain
// animation once, silently, in the production bundle only.

/**
 * How long each direction of the boring-mode swap keeps *both* views mounted.
 * These must stay >= the longest animation in that direction — the phase is the
 * only thing holding the outgoing view in the DOM, so a value that is too small
 * cuts the animation off mid-flight. Going boring that is the resume's rise
 * (500ms delay + 700ms); coming back it is no longer the stage's own drop
 * (250 + 900) but the loads falling on their ropes after it, which SkillChain
 * finishes at ENTER_DROP_MS.
 */
const TRANSITION_MS = {
  'to-boring': 1250,
  'to-chain': 1350,
} as const;

type Phase = keyof typeof TRANSITION_MS;

/**
 * The same idea for the / ↔ /projects change, and the same rule: each value has
 * to outlast the longest animation in its direction, or the class comes off
 * mid-flight and whatever it was moving snaps home. Going to /projects that is
 * the column's rise (200 + 550); coming back it is the chain sliding in
 * (100 + 600). See the .chain-page / .chain-stage--sliding rules in globals.css.
 */
const ROUTE_MS = {
  'to-projects': 800,
  'to-home': 750,
} as const;

type RoutePhase = keyof typeof ROUTE_MS;

// Length of the palette drain / revive in globals.css. Only the revive needs it
// in JS — see `reviving` below for why that one has to be cleared.
const PALETTE_MS = 2000;

const RESUME_CLASS = {
  in: 'chain-resume',
  entering: 'chain-resume chain-resume--entering',
  leaving: 'chain-resume chain-resume--leaving',
} as const;

const PAGE_CLASS = {
  in: 'chain-page',
  entering: 'chain-page chain-page--entering',
  leaving: 'chain-page chain-page--leaving',
} as const;

// Layout effect in the browser (runs before paint → no flash of the static
// fallback), plain effect on the server (useLayoutEffect would warn during SSR).
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Everything that is shared between / and /projects: the identity panel, the
 * hanging chain, and the column the pages hang their content in.
 *
 * It lives in the root layout rather than in either page so that it *survives*
 * the navigation between them — that is the whole point. The panel is the same
 * DOM node before and after, so it does not move or blink; the chain is the same
 * simulation, so it can slide off to the right, wait there, and come back
 * without being rebuilt. Routes outside those two pass straight through.
 */
export default function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const route =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;
  const isProjects = route === '/projects';
  const isSite = route === '/' || isProjects;

  // `motionOK` gates every interactive view; false (reduced-motion) → the
  // accessible static fallback. Width then picks the desktop vs. mobile layout.
  const [motionOK, setMotionOK] = useState(false);
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(780);
  // `boring` swaps the live chain for the plain resume.
  const [boring, setBoring] = useState(false);
  // The drain is not tracked as state: `boring` keeps home-drain applied to
  // <main> for as long as boring mode lasts, and the animation's `both` fill is
  // what holds the dull palette. Swapping a finished animation out for a static
  // rule of the same value is not free — the filter leaves the compositor's
  // animated path and repaints, which showed up as a small colour pop.
  //
  // The revive is the asymmetric one. It does NOT go on <main>, because the
  // chain is dropping back in underneath at the same time and would recolour
  // mid-fall; it goes on the page chrome instead, so the chain arrives already
  // in colour and the rest of the page catches up around it. That also means it
  // has to be cleared on a timer rather than <main>'s animationend.
  const [reviving, setReviving] = useState(false);
  // Non-null while the chain and the resume are crossing over. Both views stay
  // mounted for its duration, which is the only reason either can animate out.
  const [phase, setPhase] = useState<Phase | null>(null);
  // Non-null while the page change is playing.
  const [routePhase, setRoutePhase] = useState<RoutePhase | null>(null);
  const resetRef = useRef<() => void>(() => undefined);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const toggleBoring = useCallback(() => {
    setReviving(boring); // leaving boring mode → play the palette back up
    setPhase(boring ? 'to-chain' : 'to-boring');
    setBoring((v) => !v);
  }, [boring]);

  // The route transition has to be picked up in the *same* render the pathname
  // changes in, so this is React's "adjust state during render" pattern rather
  // than an effect: an effect would commit one render in which the incoming
  // column is mounted and no phase is set yet, and the chain would blink out
  // instead of sliding.
  const [wasProjects, setWasProjects] = useState(isProjects);
  if (isSite && wasProjects !== isProjects) {
    setWasProjects(isProjects);
    setRoutePhase(isProjects ? 'to-projects' : 'to-home');
    // Boring mode is a home-only view. Rather than run its crossover and the
    // page change over each other, leaving for /projects drops it outright and
    // lets the palette come back up on its own.
    if (isProjects && boring) {
      setBoring(false);
      setPhase(null);
      setReviving(true);
    }
  }

  // Timer rather than onAnimationEnd: the crossover is several animations on
  // elements in two different subtrees, and the last one to finish is not the
  // same one in both directions.
  useEffect(() => {
    if (!phase) return;
    const t = window.setTimeout(() => setPhase(null), TRANSITION_MS[phase]);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (!routePhase) return;
    const t = window.setTimeout(
      () => setRoutePhase(null),
      ROUTE_MS[routePhase],
    );
    return () => window.clearTimeout(t);
  }, [routePhase]);

  // Clearing it is what lets the next one replay; its end state (filter: none)
  // is what removing the class leaves behind anyway, so there is nothing to pop.
  useEffect(() => {
    if (!reviving) return;
    const t = window.setTimeout(() => setReviving(false), PALETTE_MS);
    return () => window.clearTimeout(t);
  }, [reviving]);

  // First paint arrives the same way a return from boring mode does: the chain
  // drops in leaning, the arrows fly in and the accordion rises.
  const [intro, setIntro] = useState(true);

  useIsomorphicLayoutEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    const compute = () => {
      setMotionOK(!mq.matches);
      // Round to limit scene rebuilds while the URL bar / window nudges size.
      setHeight(Math.round(window.innerHeight / 40) * 40);
      setWidth(Math.round(window.innerWidth / 40) * 40);
    };
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    compute();
    mq.addEventListener('change', compute);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener('change', compute);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const isDesktop = isSite && motionOK && width >= MIN_PHYSICS_WIDTH;
  const isMobile = isSite && motionOK && width < MIN_PHYSICS_WIDTH;

  // A scene costs a ~300ms synchronous warm-start, so a visit that *lands* on
  // /projects builds none while that page is loading — the chain is not on
  // screen and nothing needs it yet. It is built on the first idle frame
  // afterwards instead, which is early enough that the trip home never waits for
  // it and late enough that arriving on /projects never does either. Once built
  // it is kept (parked off-stage) and every crossing after that is free.
  const [chainReady, setChainReady] = useState(!isProjects);
  useEffect(() => {
    if (chainReady) return;
    if (!isProjects) {
      setChainReady(true);
      return;
    }
    const warm = () => setChainReady(true);
    // No requestIdleCallback in Safari; a timeout is a poor substitute for
    // "when nothing else is happening", but the work is idempotent either way.
    if (typeof window.requestIdleCallback !== 'function') {
      const t = window.setTimeout(warm, 1200);
      return () => window.clearTimeout(t);
    }
    const id = window.requestIdleCallback(warm, { timeout: 3000 });
    return () => window.cancelIdleCallback(id);
  }, [isProjects, chainReady]);

  // Keyed off the desktop gate rather than mount: `motionOK` and the width are
  // only known after the first layout effect, so that is when the scene — and
  // therefore the entrance — actually begins. On /projects it waits: the drop-in
  // is the chain's first appearance, whenever that turns out to be.
  useEffect(() => {
    if (!isDesktop || isProjects || !intro) return;
    const t = window.setTimeout(
      () => setIntro(false),
      TRANSITION_MS['to-chain'],
    );
    return () => window.clearTimeout(t);
  }, [isDesktop, isProjects, intro]);

  // The outgoing view is whichever one `boring` no longer selects; it stays
  // mounted (and animating) until the phase clears. Mobile is untouched by
  // this — it has no HUD to slide out and swaps the two views outright.
  const showChain = !boring || phase === 'to-boring';
  const showResume = boring || phase === 'to-chain';
  // Everything that is NOT the returning chain. On the way out <main> carries
  // the drain and the chain drains with it; on the way back the chain is exempt,
  // so the revive has to be hung on each of these instead.
  const revive = reviving ? 'home-revive' : undefined;
  const chainView =
    phase === 'to-boring'
      ? 'leaving'
      : phase === 'to-chain' || intro
        ? 'entering'
        : 'in';
  const resumeView =
    phase === 'to-boring'
      ? 'entering'
      : phase === 'to-chain'
        ? 'leaving'
        : 'in';

  // The chain is the only thing that leaves on a page change: it slides off to
  // the right, and parks there until the visitor comes back. `intro` standing in
  // for "has never been seen" is deliberate — a chain being built for the first
  // time drops in on its ropes instead, which is a better arrival than sliding
  // in a scene the visitor has no memory of.
  const chainSlide =
    routePhase === 'to-projects'
      ? 'out'
      : routePhase === 'to-home' && !intro
        ? 'in'
        : undefined;
  const chainParked = isProjects && !routePhase;

  const pageView =
    routePhase === 'to-home'
      ? 'leaving'
      : routePhase === 'to-projects'
        ? 'entering'
        : 'in';
  const showProjects = isProjects || routePhase === 'to-home';
  // Below the physics gate /projects is just a page: plain flow, document
  // scroll, and the Back chip from <Navigation> instead of the panel.
  const plainProjects = isProjects && !isDesktop;
  // Only the interactive views own the viewport; a plain page scrolls normally.
  const locked = isDesktop || (isMobile && !isProjects);

  // Build only the scene the current layout needs (each does a warm-start sim).
  const scene = useMemo(
    () => (isDesktop && chainReady ? buildScene(height, width) : null),
    [isDesktop, chainReady, height, width],
  );
  const mobileScene = useMemo(
    () => (isMobile && chainReady ? buildMobileScene(width) : null),
    [isMobile, chainReady, width],
  );

  // Warmed but never shown → the scene is ready and the chain stays unmounted.
  // Mounting it parked would spend its drop-in entrance off-stage, where the
  // effect runs once and would not run again on the way back.
  const mountChain = !!scene && showChain && !(chainParked && intro);

  // Bottom slack so the LAST box can still scroll up to the accordion's centre
  // band (otherwise the scroller maxes out with the last box below centre and
  // the accordion never advances past the second-to-last role).
  const mobilePadBottom =
    mobileScene && !boring
      ? Math.max(
          MOBILE_NAV_H,
          Math.round(
            (height - MOBILE_HEADER_H + MOBILE_NAV_H) / 2 -
              (mobileScene.world.h -
                mobileScene.itemsY[mobileScene.itemsY.length - 1]),
          ) + 16,
        )
      : 24;

  if (!isSite) return <>{children}</>;

  return (
    <>
      {children}
      <main
        className={[
          homeFontVars,
          'home-root',
          boring && 'home-dull',
          boring && 'home-drain',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          position: 'relative',
          minHeight: '100dvh',
          height: locked ? '100dvh' : undefined,
          background: palette.bg,
          color: palette.text,
          fontFamily: 'var(--font-instrument), system-ui, sans-serif',
          overflow: locked ? 'hidden' : undefined,
        }}
      >
        {isDesktop && (
          <>
            {/* The chain renders first so that during a crossover the resume or
                the projects column, at the same z-index, paints over whatever is
                still falling. */}
            {mountChain && scene && (
              <SkillChain
                scene={scene}
                view={chainView}
                slide={chainSlide}
                parked={chainParked}
                registerReset={(fn) => {
                  resetRef.current = fn;
                }}
              />
            )}
            {showResume && (
              <div
                className={RESUME_CLASS[resumeView]}
                style={{
                  ...rightColumn,
                  // Only scroll once it has arrived, so the slide never fights a
                  // scrollbar appearing and disappearing under it.
                  overflowY: resumeView === 'in' ? 'auto' : 'hidden',
                  pointerEvents: resumeView === 'leaving' ? 'none' : undefined,
                }}
              >
                {/* Inner element: the slide and the revive are both `animation`,
                    and on one element the unlayered slide rule would simply
                    replace the layered palette one rather than run alongside
                    it. */}
                <div className={revive}>
                  <StaticShowcase />
                </div>
              </div>
            )}
            {showProjects && (
              <div
                className={PAGE_CLASS[pageView]}
                style={{
                  ...rightColumn,
                  overflowY: pageView === 'in' ? 'auto' : 'hidden',
                  pointerEvents: pageView === 'leaving' ? 'none' : undefined,
                }}
              >
                <div style={{ padding: '56px 0 72px' }}>
                  <ProjectsShowcase />
                </div>
              </div>
            )}
            <IdentityPanel
              variant='floating'
              page={isProjects ? 'projects' : 'home'}
              className={revive}
              onReset={() => resetRef.current()}
              onBoring={toggleBoring}
              boring={boring}
            />
          </>
        )}

        {isMobile && !isProjects && mobileScene && (
          <>
            {/* fixed header: branding + CTAs stay put while the chain scrolls */}
            <header
              className={revive}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: MOBILE_HEADER_H,
                zIndex: 7,
                boxSizing: 'border-box',
                padding: '10px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                background: 'rgba(16,14,11,.96)',
                borderBottom: `1px solid ${palette.hairline}`,
                backdropFilter: 'blur(4px)',
              }}
            >
              <div style={{ display: 'flex', gap: 8 }}>
                <Link
                  href='/projects'
                  className='chain-btn chain-btn--primary'
                  style={{ ...btnPrimary, ...headerBtn }}
                >
                  Projects
                </Link>
                <a
                  href={RESUME_PDF}
                  className='chain-btn chain-btn--outline'
                  style={{ ...btnOutline, ...headerBtn }}
                >
                  Download resume (PDF)
                </a>
              </div>
              {/* LinkedIn / GitHub / Email — the mobile panel drops its own copy
                  of this row, so these stay reachable without scrolling back up
                  and the header keeps a single owner for the contact links. */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 16,
                  fontSize: 12.5,
                }}
              >
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target={s.href.startsWith('http') ? '_blank' : undefined}
                    rel={
                      s.href.startsWith('http')
                        ? 'noopener noreferrer'
                        : undefined
                    }
                    className='chain-social'
                    style={{ color: palette.amber, textDecoration: 'none' }}
                  >
                    {s.label} ↗
                  </a>
                ))}
              </div>
            </header>

            {/* Mobile has no drop-in animation, so the chain is inside here and
                revives along with everything else — as it should.

                The revive is a `filter` animation, and a filtered element is the
                containing block for its position: fixed descendants. Hung on
                this scroller it therefore re-anchored the chain's accordion to
                the scroller's box for the two seconds it ran, which dropped the
                bar into the middle of the screen and then snapped it back. So
                each child carries the class instead — including the accordion,
                whose own filter does not affect where it fixes itself. */}
            <div
              ref={mobileScrollRef}
              style={{
                position: 'relative',
                height: '100dvh',
                overflowY: 'auto',
                paddingTop: MOBILE_HEADER_H,
                paddingBottom: mobilePadBottom,
              }}
            >
              <IdentityPanel
                variant='mobile'
                className={revive}
                onBoring={toggleBoring}
                boring={boring}
              />
              {boring ? (
                <StaticShowcase />
              ) : (
                <SkillChainMobile
                  scene={mobileScene}
                  scrollRef={mobileScrollRef}
                  className={revive}
                />
              )}
            </div>
          </>
        )}

        {plainProjects && (
          <div style={{ padding: '104px 0 80px' }}>
            <ProjectsShowcase />
          </div>
        )}

        {/* Static resume: always in the DOM so SEO & agents can read it. A CSS
            media query (not JS) hides it on motion-OK screens where an
            interactive view takes over, so it never paints/blinks before JS
            mounts. */}
        {!isProjects && (
          <div
            className='home-fallback'
            style={{ height: '100dvh', overflowY: 'auto' }}
          >
            <IdentityPanel variant='static' />
            <StaticShowcase />
          </div>
        )}
      </main>
    </>
  );
}

// The area right of the identity panel, which every page-level view fills.
const rightColumn: CSSProperties = {
  position: 'absolute',
  left: PANEL_W,
  top: 0,
  right: 0,
  bottom: 0,
  zIndex: 1,
};

// Compact CTA buttons for the fixed mobile header (share IdentityPanel colours).
const headerBtn: CSSProperties = {
  flex: '1 1 0',
  minWidth: 0,
  padding: '9px 10px',
  fontSize: 12.5,
  borderRadius: 6,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
