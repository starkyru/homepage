'use client';

import { RefObject, useEffect, useRef } from 'react';

import { extractTextFromDOM } from '@/lib/extractTextPositions';
import { PoolEngine } from '@/lib/poolEngine';

import { useTheme } from '@/components/DayNightBackground';

interface PoolModeProps {
  active: boolean;
  contentRef: RefObject<HTMLElement | null>;
}

export default function PoolMode({ active, contentRef }: PoolModeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PoolEngine | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    // Always clean up previous engine first
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }

    if (!active) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    const rafId = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const content = contentRef.current;
      if (!canvas || !content) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const extracted = extractTextFromDOM(content);
      if (extracted.length === 0) return;

      const engine = new PoolEngine(canvas);
      engine.setColorScheme(isDark);
      engine.setLetters(extracted);
      engine.start();
      engineRef.current = engine;
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
      document.body.style.overflow = '';
    };
  }, [active, contentRef, isDark]);

  // Handle resize while active
  useEffect(() => {
    if (!active) return;

    const handleResize = () => {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }

      const canvas = canvasRef.current;
      const content = contentRef.current;
      if (!canvas || !content) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const extracted = extractTextFromDOM(content);
      if (extracted.length === 0) return;

      const engine = new PoolEngine(canvas);
      engine.setColorScheme(isDark);
      engine.setLetters(extracted);
      engine.start();
      engineRef.current = engine;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [active, contentRef, isDark]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: active ? 10 : -2,
        pointerEvents: active ? 'auto' : 'none',
        opacity: active ? 1 : 0,
        transition: 'opacity 300ms ease',
      }}
    />
  );
}
