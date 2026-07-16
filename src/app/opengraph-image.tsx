import { ImageResponse } from 'next/og';

import { siteConfig } from '@/constant/config';

// Static 1200×630 social card, generated at build. Next wires it into both
// og:image and twitter:image. Palette mirrors the site (amber on near-black).
export const alt = `${siteConfig.title} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BG = '#100e0b';
const AMBER = '#e0a458';
const TEXT = '#ece7dd';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: BG,
        color: TEXT,
        padding: '80px 96px',
        borderLeft: `16px solid ${AMBER}`,
      }}
    >
      <div style={{ fontSize: 34, color: AMBER, fontStyle: 'italic' }}>
        ilia.to
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 96,
          fontWeight: 700,
          letterSpacing: '-2px',
          marginTop: 28,
        }}
      >
        {siteConfig.title}
      </div>
      <div
        style={{ display: 'flex', fontSize: 42, color: AMBER, marginTop: 20 }}
      >
        {siteConfig.tagline}
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 30,
          color: 'rgba(236,231,221,0.7)',
          marginTop: 40,
        }}
      >
        React · React Native · Vue · TypeScript · Node
      </div>
    </div>,
    { ...size },
  );
}
