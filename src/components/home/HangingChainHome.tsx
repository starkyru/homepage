'use client';

import type { CSSProperties } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { homeFontVars } from '@/lib/fonts';

import IdentityPanel, { btnOutline, btnPrimary } from './IdentityPanel';
import {
  buildMobileScene,
  buildScene,
  MOBILE_HEADER_H,
  MOBILE_NAV_H,
  palette,
  PANEL_W,
} from './model';
import SkillChain from './SkillChain';
import SkillChainMobile from './SkillChainMobile';
import StaticShowcase from './StaticShowcase';

const RESUME_PDF =
  'https://docs.google.com/document/d/1FozMEumbKlGOmrFjOYAsLtrpIC0WKh1Y/export?format=pdf';

const MIN_PHYSICS_WIDTH = 900;

// Layout effect in the browser (runs before paint → no flash of the static
// fallback), plain effect on the server (useLayoutEffect would warn during SSR).
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function HangingChainHome() {
  // `motionOK` gates every interactive view; false (reduced-motion) → the
  // accessible static fallback. Width then picks the desktop vs. mobile layout.
  const [motionOK, setMotionOK] = useState(false);
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(780);
  // `boring` swaps the live chain for the plain resume.
  const [boring, setBoring] = useState(false);
  const resetRef = useRef<() => void>(() => undefined);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

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

  const isDesktop = motionOK && width >= MIN_PHYSICS_WIDTH;
  const isMobile = motionOK && width < MIN_PHYSICS_WIDTH;

  // Build only the scene the current layout needs (each does a warm-start sim).
  const scene = useMemo(
    () => (isDesktop ? buildScene(height, width) : null),
    [isDesktop, height, width],
  );
  const mobileScene = useMemo(
    () => (isMobile ? buildMobileScene(width) : null),
    [isMobile, width],
  );

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

  return (
    <main
      className={homeFontVars}
      style={{
        position: 'relative',
        height: '100dvh',
        background: palette.bg,
        color: palette.text,
        fontFamily: 'var(--font-instrument), system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      {isDesktop && scene && (
        <>
          {boring ? (
            <div
              style={{
                position: 'absolute',
                left: PANEL_W,
                top: 0,
                right: 0,
                bottom: 0,
                overflowY: 'auto',
                zIndex: 1,
              }}
            >
              <StaticShowcase />
            </div>
          ) : (
            <SkillChain
              scene={scene}
              registerReset={(fn) => {
                resetRef.current = fn;
              }}
            />
          )}
          <IdentityPanel
            variant='floating'
            onReset={() => resetRef.current()}
            onBoring={() => setBoring((v) => !v)}
            boring={boring}
          />
        </>
      )}

      {isMobile && mobileScene && (
        <>
          {/* fixed header: branding + CTAs stay put while the chain scrolls */}
          <header
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: MOBILE_HEADER_H,
              zIndex: 7,
              boxSizing: 'border-box',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              background: 'rgba(16,14,11,.96)',
              borderBottom: `1px solid ${palette.hairline}`,
              backdropFilter: 'blur(4px)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-newsreader), Georgia, serif',
                fontStyle: 'italic',
                fontSize: 20,
                color: palette.amber,
              }}
            >
              ilia.to
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href='/projects' style={{ ...btnPrimary, ...headerBtn }}>
                Projects
              </a>
              <a href={RESUME_PDF} style={{ ...btnOutline, ...headerBtn }}>
                Download resume (PDF)
              </a>
            </div>
          </header>

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
              onBoring={() => setBoring((v) => !v)}
              boring={boring}
            />
            {boring ? (
              <StaticShowcase />
            ) : (
              <SkillChainMobile
                scene={mobileScene}
                scrollRef={mobileScrollRef}
              />
            )}
          </div>
        </>
      )}

      {/* Static resume: always in the DOM so SEO & agents can read it. A CSS
          media query (not JS) hides it on motion-OK screens where an interactive
          view takes over, so it never paints/blinks before JS mounts. */}
      <div
        className='home-fallback'
        style={{ height: '100dvh', overflowY: 'auto' }}
      >
        <IdentityPanel variant='static' />
        <StaticShowcase />
      </div>
    </main>
  );
}

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
