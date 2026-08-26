import Link from 'next/link';
import type { CSSProperties } from 'react';

import { resumePdfUrl } from '@/constant/resume';

import { INTRO_PARAGRAPHS, palette, SOCIALS } from './model';

const serif = 'var(--font-newsreader), Georgia, serif';

interface Props {
  // floating → overlays the desktop physics stage; static → plain SEO flow;
  // mobile → centred column above the vertical chain.
  variant: 'floating' | 'static' | 'mobile';
  // Which page the panel is standing next to. The panel itself does not change
  // when the page does — that is the point of it — but the controls that talk
  // about the chain only make sense while the chain is on screen.
  page?: 'home' | 'projects';
  className?: string; // carries the palette revive; see SiteShell
  onReset?: () => void;
  onBoring?: () => void; // swaps the chain for the plain resume
  boring?: boolean; // resume shown → flip the link label back
}

export default function IdentityPanel({
  variant,
  page = 'home',
  className,
  onReset,
  onBoring,
  boring,
}: Props) {
  const floating = variant === 'floating';
  const mobile = variant === 'mobile';
  const onProjects = page === 'projects';
  // The chain blurb + "I'm boring" link — both about a chain that has slid away.
  const showNote = (floating || mobile) && !onProjects;
  // Only one h1 per page: on /projects the page's own heading is the column's.
  const NameTag = onProjects ? 'p' : 'h1';
  return (
    <div
      className={className}
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
          : mobile
            ? {
                position: 'relative',
                width: '100%',
                maxWidth: 560,
                margin: '0 auto',
                padding: '40px 24px 24px',
                alignItems: 'center',
                textAlign: 'center',
              }
            : {
                // Same 720 column as StaticShowcase below it — the two are one
                // document in this variant, so they have to share a measure.
                position: 'relative',
                width: '100%',
                maxWidth: 720,
                margin: '0 auto',
                padding: '48px 24px 8px',
              }),
        zIndex: 2,
        boxSizing: 'border-box',
        color: palette.text,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        // The floating panel is pinned top-to-bottom, so a long summary from the
        // doc would otherwise clip the CTAs below it on short viewports.
        overflowX: 'hidden',
        overflowY: floating ? 'auto' : 'hidden',
        scrollbarWidth: 'thin',
      }}
    >
      {/* the CTA buttons live in the fixed header on mobile */}
      <NameTag
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
      </NameTag>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: palette.amber }}>
        Senior Frontend / Full-Stack Engineer
        <br />
        React · React Native · Vue · TypeScript · Node
      </div>
      {/* One flex child, not one per sentence: the column's 20px gap is for
          the panel's sections, and the paragraphs mark their own breaks. */}
      <div style={introBlock}>
        {INTRO_PARAGRAPHS.map((text) => (
          <p key={text} style={introParagraph}>
            {text}
          </p>
        ))}
      </div>
      {!mobile && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxWidth: floating ? undefined : 320,
          }}
        >
          {/* next/link, not a bare anchor: the two pages share this panel and
              the chain behind it, so the change is a transition inside the shell
              — a document navigation would throw both away and rebuild them. */}
          <Link
            href={onProjects ? '/' : '/projects'}
            className='chain-btn chain-btn--primary'
            style={btnPrimary}
          >
            {onProjects ? '← Back to the chain' : 'Projects'}
          </Link>
          <a
            href={resumePdfUrl}
            className='chain-btn chain-btn--outline'
            style={btnOutline}
          >
            Download resume (PDF)
          </a>
          {floating && onReset && !boring && !onProjects && (
            <button
              type='button'
              onClick={onReset}
              className='chain-btn chain-btn--ghost'
              style={btnGhost}
            >
              ↺ Reset chain
            </button>
          )}
        </div>
      )}
      {showNote && (
        <div
          style={{
            borderTop: `1px solid ${palette.hairline}`,
            paddingTop: 16,
            fontSize: 12.5,
            lineHeight: 1.6,
            color: 'rgba(224,164,88,.85)',
            ...(mobile ? { width: '100%' } : {}),
          }}
        >
          {/* Instructions for a UI that is not on screen are worse than no
              instructions — in boring mode the chain they describe is gone. */}
          <p style={{ margin: 0 }}>
            {boring
              ? 'Plain text, top to bottom. This is the whole resume.'
              : 'This chain is live. Scroll or use the arrows to move along it, drag any card to swing it, and click a tech logo to snap it off the chain.'}
          </p>
          {onBoring && (
            /* Its own line, not trailing the blurb: the control is the one
               thing here you can act on, and inline it reads as prose. */
            <div style={{ marginTop: 10 }}>
              {/* The visible label is a joke; the accessible name has to say
                  what the control actually does (WCAG 2.4.6 / 2.5.3 — the
                  visible text is a subset of the accessible name). */}
              <button
                type='button'
                onClick={onBoring}
                className='chain-boring'
                style={boringButton}
                aria-label={
                  boring
                    ? 'Bring the chain back. Return to the interactive view.'
                    : "I'm boring. Show the plain text resume instead."
                }
              >
                {/* Decorative: the accessible name is the aria-label above, so
                    the arrow must not reach the accessibility tree twice. */}
                <span aria-hidden='true' className='chain-boring__arrow'>
                  →
                </span>
                {boring ? 'Bring the chain back!' : "I'm boring"}
              </button>
              {/* The other half of the accessible name, kept out of the button
                  so the label stays the joke and the button stays one line. */}
              <p style={boringCaption}>
                {boring
                  ? 'Return to the interactive view.'
                  : 'Show the plain text resume instead.'}
              </p>
            </div>
          )}
        </div>
      )}
      {/* On mobile these sit in the fixed header, under the CTAs, so that the
          contact links do not need a scroll back to the top to reach. */}
      {!mobile && (
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
              rel={
                s.href.startsWith('http') ? 'noopener noreferrer' : undefined
              }
              className='chain-social'
              style={{ color: palette.amber, textDecoration: 'none' }}
            >
              {s.label} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// The static column is as wide as the resume below it; the prose still wants a
// readable measure (WCAG 1.4.8 caps it at 80 characters).
const introBlock: CSSProperties = { maxWidth: '68ch' };

// One sentence per paragraph, each opening on an indent. That indent is what
// marks the break, which is why the paragraphs carry no margin between them.
const introParagraph = {
  margin: 0,
  textIndent: '1.5em',
  fontSize: 14,
  lineHeight: 1.6,
  color: 'rgba(236,231,221,.78)',
  textWrap: 'pretty',
  textAlign: 'justify',
  // Lines break between words only — a justified narrow column opens wider
  // word gaps for it, which still reads better than splitting words.
  hyphens: 'none',
} as CSSProperties;

const btnBase: CSSProperties = {
  textDecoration: 'none',
  fontSize: 14,
  padding: '12px 20px',
  borderRadius: 6,
  textAlign: 'center',
};

export const btnPrimary: CSSProperties = {
  ...btnBase,
  background: palette.amber,
  color: '#1a1408',
  fontWeight: 600,
};

// The border is the only thing that marks these two out as controls, so it has
// to clear WCAG 1.4.11's 3:1 for non-text contrast. .25 measured 1.99:1 on the
// near-black background; .48 is 4.2:1, and still 3.4:1 once boring mode's
// home-drain filter takes its ~20% off. It reads as a hairline either way.
const CONTROL_BORDER = '1px solid rgba(236,231,221,.48)';

export const btnOutline: CSSProperties = {
  ...btnBase,
  border: CONTROL_BORDER,
  color: palette.text,
};

// Shaped like the CTAs above it, but deliberately not one of them: it carries
// `chain-boring`, whose own hover, press and resting drift are what make the
// joke, so it stays off `chain-btn` rather than stacking two sets of transform
// and filter rules on one element. The border and radius are the CTAs'; the
// amber is the drift animation's resting value (see globals.css).
const boringButton: CSSProperties = {
  ...btnBase,
  display: 'block',
  width: '100%',
  // Vertical padding is the CTAs' own, so the one-line case (mobile, and the
  // short "bring the chain back" label) is the same 45px tap target they are.
  padding: '12px 16px',
  fontSize: 13,
  lineHeight: 1.45,
  background: 'none',
  border: CONTROL_BORDER,
  color: palette.amber,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

// Sits under the button, and reads as its caption rather than as a second line
// of the blurb above — so it is dimmer than the amber that block is set in.
const boringCaption: CSSProperties = {
  margin: '6px 0 0',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'rgba(236,231,221,.55)',
};

const btnGhost: CSSProperties = {
  ...btnBase,
  background: 'none',
  border: CONTROL_BORDER,
  color: 'rgba(236,231,221,.7)',
  cursor: 'pointer',
  fontFamily: 'inherit',
};
