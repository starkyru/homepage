import type { CSSProperties } from 'react';

import { INTRO, palette, SOCIALS } from './model';

const serif = 'var(--font-newsreader), Georgia, serif';

interface Props {
  floating: boolean; // overlays the physics stage (desktop) vs. static flow
  onReset?: () => void;
  onBoring?: () => void; // swaps the chain for the plain resume on the right
  boring?: boolean; // resume shown → flip the link label back
}

export default function IdentityPanel({
  floating,
  onReset,
  onBoring,
  boring,
}: Props) {
  return (
    <div
      style={{
        ...(floating
          ? {
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 440,
              background: palette.panelGradient,
              padding: '56px 88px 40px 64px',
            }
          : {
              position: 'relative',
              width: '100%',
              maxWidth: 560,
              padding: '48px 24px 8px',
            }),
        zIndex: 2,
        boxSizing: 'border-box',
        color: palette.text,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontFamily: serif,
          fontStyle: 'italic',
          fontSize: 20,
          color: palette.amber,
        }}
      >
        ilia.to
      </div>
      <h1
        style={{
          margin: 0,
          fontFamily: serif,
          fontWeight: 400,
          fontSize: 46,
          lineHeight: 1.04,
          letterSpacing: '-.01em',
        }}
      >
        Ilia Dzhiubanskii
      </h1>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: palette.amber }}>
        Senior Frontend / Full-Stack Engineer
        <br />
        React · React Native · Vue · TypeScript · Node
      </div>
      <p
        style={
          {
            margin: 0,
            fontSize: 14,
            lineHeight: 1.6,
            color: 'rgba(236,231,221,.78)',
            textWrap: 'pretty',
          } as CSSProperties
        }
      >
        {INTRO}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <a href='/projects' style={btnPrimary}>
          Projects
        </a>
        <a
          href='https://docs.google.com/document/d/1FozMEumbKlGOmrFjOYAsLtrpIC0WKh1Y/export?format=pdf'
          style={btnOutline}
        >
          Download resume (PDF)
        </a>
        {floating && onReset && !boring && (
          <button type='button' onClick={onReset} style={btnGhost}>
            ↺ Reset chain
          </button>
        )}
      </div>
      {floating && (
        <div
          style={{
            borderTop: `1px solid ${palette.hairline}`,
            paddingTop: 16,
            fontSize: 12.5,
            lineHeight: 1.6,
            color: 'rgba(224,164,88,.85)',
          }}
        >
          This chain is live. Scroll or use the arrows to move along it, drag
          any card to swing it, and click a tech logo to snap it off the chain.
          {onBoring && (
            <>
              {' '}
              <button type='button' onClick={onBoring} style={boringLink}>
                {boring ? 'Bring the chain back.' : "I'm boring."}
              </button>
            </>
          )}
        </div>
      )}
      <div
        style={{
          marginTop: floating ? 'auto' : 8,
          display: 'flex',
          gap: 16,
          fontSize: 13,
        }}
      >
        {SOCIALS.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target={s.href.startsWith('http') ? '_blank' : undefined}
            rel={s.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            style={{ color: palette.amber, textDecoration: 'none' }}
          >
            {s.label} ↗
          </a>
        ))}
      </div>
    </div>
  );
}

const btnBase: CSSProperties = {
  textDecoration: 'none',
  fontSize: 14,
  padding: '12px 20px',
  borderRadius: 6,
  textAlign: 'center',
};

const btnPrimary: CSSProperties = {
  ...btnBase,
  background: palette.amber,
  color: '#1a1408',
  fontWeight: 600,
};

const btnOutline: CSSProperties = {
  ...btnBase,
  border: '1px solid rgba(236,231,221,.25)',
  color: palette.text,
};

const boringLink: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  font: 'inherit',
  color: palette.amber,
  textDecoration: 'underline',
  textUnderlineOffset: 2,
  cursor: 'pointer',
};

const btnGhost: CSSProperties = {
  ...btnBase,
  background: 'none',
  border: '1px solid rgba(236,231,221,.25)',
  color: 'rgba(236,231,221,.7)',
  cursor: 'pointer',
  fontFamily: 'inherit',
};
