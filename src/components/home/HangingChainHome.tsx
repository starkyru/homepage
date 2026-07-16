'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { homeFontVars } from '@/lib/fonts';

import IdentityPanel from './IdentityPanel';
import { buildScene, palette } from './model';
import SkillChain from './SkillChain';
import StaticShowcase from './StaticShowcase';

const MIN_PHYSICS_WIDTH = 900;

export default function HangingChainHome() {
  // `active` gates the physics; false → accessible static fallback.
  const [active, setActive] = useState(false);
  const [height, setHeight] = useState(780);
  const [width, setWidth] = useState(1280);
  const resetRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    const compute = () => {
      setActive(!mq.matches && window.innerWidth >= MIN_PHYSICS_WIDTH);
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

  const scene = useMemo(() => buildScene(height, width), [height, width]);

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
      {active ? (
        <>
          <SkillChain
            scene={scene}
            registerReset={(fn) => {
              resetRef.current = fn;
            }}
          />
          <IdentityPanel floating onReset={() => resetRef.current()} />
        </>
      ) : (
        <div style={{ height: '100dvh', overflowY: 'auto' }}>
          <IdentityPanel floating={false} />
          <StaticShowcase />
        </div>
      )}
    </main>
  );
}
