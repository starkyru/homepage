import { Metadata } from 'next';
import Link from 'next/link';
import * as React from 'react';

import { homeFontVars } from '@/lib/fonts';

import { palette } from '@/components/home/model';

export const metadata: Metadata = {
  title: 'Not Found',
  // A 404 is served with a 404 status, but crawlers that reach it via a stale
  // link should not hold it in the index while they wait to recrawl.
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main
      className={homeFontVars}
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: 24,
        textAlign: 'center',
        background: palette.bg,
        color: palette.text,
        fontFamily: 'var(--font-instrument), system-ui, sans-serif',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--font-newsreader), Georgia, serif',
          fontWeight: 400,
          fontSize: 42,
          lineHeight: 1.05,
        }}
      >
        Page not found
      </h1>
      <p style={{ margin: 0, fontSize: 14, color: 'rgba(236,231,221,.7)' }}>
        That link does not lead anywhere on this site.
      </p>
      {/* A bordered button, not a bare anchor: Tailwind's preflight strips the
          default underline and colour, which left the old link visually
          identical to the paragraph above it (WCAG 1.4.1). */}
      <Link
        href='/'
        className='chain-btn chain-btn--primary'
        style={{
          textDecoration: 'none',
          fontSize: 14,
          padding: '12px 24px',
          borderRadius: 6,
          background: palette.amber,
          color: '#1a1408',
          fontWeight: 600,
        }}
      >
        Back to home
      </Link>
    </main>
  );
}
