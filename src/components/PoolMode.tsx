'use client';

import { RefObject, useEffect, useRef } from 'react';
import {
  extractTextFromDOM,
  RippleTextEngine,
  WaterField,
  WaveRipple,
} from 'ripple-text';

import { useTheme } from '@/components/DayNightBackground';

interface PoolModeProps {
  active: boolean;
  contentRef: RefObject<HTMLElement | null>;
}

function buildDarkColors(n: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const r = Math.round(225 + t * 30);
    const g = Math.round(228 + t * 27);
    const b = Math.round(232 + t * 23);
    colors.push(`rgba(${r},${g},${b},${(0.85 + t * 0.15).toFixed(2)})`);
  }
  return colors;
}

function buildLightColors(n: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const v = Math.round(50 - t * 40);
    colors.push(`rgba(${v},${v},${v},${(0.75 + t * 0.25).toFixed(2)})`);
  }
  return colors;
}

export default function PoolMode({ active, contentRef }: PoolModeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RippleTextEngine | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
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

      const engine = new RippleTextEngine(
        canvas,
        new WaterField(),
        new WaveRipple(),
        {
          bgColor: isDark ? 'rgb(2,8,20)' : 'rgb(255,254,250)',
          showFps: true,
          buildColors: isDark ? buildDarkColors : buildLightColors,
        },
      );
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

      const engine = new RippleTextEngine(
        canvas,
        new WaterField(),
        new WaveRipple(),
        {
          bgColor: isDark ? 'rgb(2,8,20)' : 'rgb(255,254,250)',
          showFps: true,
          buildColors: isDark ? buildDarkColors : buildLightColors,
        },
      );
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
