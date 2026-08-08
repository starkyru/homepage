import type { CSSProperties } from 'react';

import {
  CHIPS,
  EDUCATION,
  EXPERIENCE,
  palette,
  PROFILE,
  SKILLS,
} from './model';

/**
 * The "boring" resume: no physics, no animation, plain document flow.
 *
 * This is the canonical rendering of the content — it is what the server sends,
 * what a crawler or an LLM agent without a JS engine reads, what a
 * reduced-motion visitor gets, and what the "I'm boring" switch brings back. It
 * therefore carries the *full* record (education and contact facts included),
 * not a teaser of the interactive view, and it is marked up as a document:
 * h2 per section, h3 per role, a real <time> per date range.
 */
export default function StaticShowcase() {
  return (
    <div style={{ padding: '8px 24px 56px', maxWidth: 720, margin: '0 auto' }}>
      <section style={{ marginTop: 32 }}>
        <h2 style={label}>Stack</h2>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {SKILLS.map((s) => (
            <li key={s.label} style={pill}>
              {s.label.replace('\n', ' ')}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2 style={label}>Experience</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {EXPERIENCE.map((exp, i) => (
            <article
              key={exp.id}
              aria-labelledby={`job-${exp.id}`}
              style={{
                background: palette.cardBg,
                border: `1px solid ${palette.cardBorder}`,
                borderRadius: 10,
                padding: '18px 20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                <h3 id={`job-${exp.id}`} style={company}>
                  {exp.url ? (
                    <a
                      href={exp.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      style={link}
                    >
                      {exp.company}
                    </a>
                  ) : (
                    exp.company
                  )}
                </h3>
                <span style={{ fontSize: 12, color: palette.amber }}>
                  <Period display={exp.period} raw={exp.periodRaw} />
                </span>
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: palette.amber,
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                {exp.role}
                {exp.location && (
                  <span style={{ color: 'rgba(236,231,221,.6)' }}>
                    {' · '}
                    {exp.location}
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: 13.5,
                  color: 'rgba(236,231,221,.7)',
                  margin: '10px 0 0',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-line', // keep intro + bullet lines from ilia.to
                }}
              >
                {exp.blurb}
              </p>
              <ul
                style={{
                  listStyle: 'none',
                  margin: '12px 0 0',
                  padding: 0,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                }}
              >
                {CHIPS.filter((c) => c.card === i).map((c, j) => (
                  <li
                    key={`${c.label}-${j}`}
                    style={{ ...pill, fontSize: 11.5 }}
                  >
                    {c.label}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {EDUCATION.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <h2 style={label}>Education</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {EDUCATION.map((ed) => (
              <li key={ed.school} style={{ fontSize: 13.5, lineHeight: 1.6 }}>
                <span style={{ fontWeight: 600 }}>{ed.field}</span>
                {' — '}
                {ed.school}
                {ed.years && (
                  <span style={{ color: palette.amber }}> ({ed.years})</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={{ marginTop: 40 }}>
        <h2 style={label}>Contact</h2>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7 }}>
          {PROFILE.location}
          <br />
          <a href={`mailto:${PROFILE.email}`} style={{ ...link, ...emailLink }}>
            {PROFILE.email}
          </a>
        </p>
      </section>

      <p
        style={{
          marginTop: 40,
          fontSize: 12,
          // .35 measured 2.8:1 against the near-black background — below WCAG
          // 1.4.3 AA for body text. Sized at .6 (6.1:1) rather than the .55
          // that just clears it, because boring mode renders this same markup
          // under home-drain's saturate/brightness/contrast filter, which costs
          // about a fifth of every ratio on the page: .55 falls back to 4.4:1
          // there, .6 holds 5.0:1.
          color: 'rgba(236,231,221,.6)',
        }}
      >
        © 2026 Ilia Dzhiubanskii · Charlotte, NC
      </p>
    </div>
  );
}

/** "08/2023" → "2023-08". Anything else ("present", "1999") is not a month. */
function isoMonth(s?: string): string | null {
  const m = s?.match(/^(\d{2})\/(\d{4})$/);
  return m ? `${m[2]}-${m[1]}` : null;
}

/**
 * The date range, with each end marked up as its own <time>.
 *
 * `<time>` takes a single moment or a duration — not an interval — so a range
 * cannot be one element, and "2023-08/2026-02" in a `datetime` is invalid HTML
 * that a parser will simply drop. Two elements around the dash is the markup
 * that actually carries the dates. The display halves come from the doc's short
 * form ("2023–2026") and the machine values from its raw one ("08/2023 –
 * 02/2026"), so the visible text is never rewritten to fit the markup.
 */
function Period({ display, raw }: { display: string; raw: string }) {
  const shown = display.split('–');
  const machine = raw.split(/\s*[–-]\s*/).map((s) => s.trim());
  // A single-token display ("2018") is a whole year; it *is* its own value.
  if (shown.length !== 2) {
    return /^\d{4}$/.test(display) ? (
      <time dateTime={display}>{display}</time>
    ) : (
      <>{display}</>
    );
  }
  const value = (i: number) =>
    isoMonth(machine[i]) ?? (/^\d{4}$/.test(shown[i]) ? shown[i] : null);
  const half = (i: number) => {
    const v = value(i);
    return v ? <time dateTime={v}>{shown[i]}</time> : <>{shown[i]}</>;
  };
  return (
    <>
      {half(0)}–{half(1)}
    </>
  );
}

const label: CSSProperties = {
  margin: '0 0 16px',
  fontFamily: 'var(--font-newsreader), Georgia, serif',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 26,
  color: palette.amber,
};

// h3 styled to sit where the old <span> did — the change is semantic, not
// visual: the card now has a heading (and therefore an accessible name).
const company: CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 600,
  color: palette.text,
};

// Links here sit inside text of the same colour, so the underline is not
// decoration — it is the only non-colour cue that they are links (WCAG 1.4.1).
const link: CSSProperties = {
  color: 'inherit',
  textDecoration: 'underline',
  textDecorationColor: 'rgba(224,164,88,.6)',
  textUnderlineOffset: 3,
};

const emailLink: CSSProperties = { color: palette.amber };

const pill: CSSProperties = {
  background: palette.ballBg,
  border: `1px solid ${palette.amber}`,
  color: palette.amber,
  fontSize: 12.5,
  padding: '6px 14px',
  borderRadius: 99,
};
