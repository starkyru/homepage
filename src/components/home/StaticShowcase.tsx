import type { CSSProperties } from 'react';

import { CHIPS, EXPERIENCE, palette, SKILLS } from './model';

// Accessible, no-physics rendering used for reduced-motion and small screens.
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
              key={exp.company}
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
                <span style={{ fontSize: 18, fontWeight: 600 }}>
                  {exp.company}
                </span>
                <span style={{ fontSize: 12, color: palette.amber }}>
                  {exp.period}
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

      <p
        style={{
          marginTop: 40,
          fontSize: 12,
          color: 'rgba(236,231,221,.35)',
        }}
      >
        © 2026 Ilia Dzhiubanskii · Charlotte, NC
      </p>
    </div>
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

const pill: CSSProperties = {
  background: palette.ballBg,
  border: `1px solid ${palette.amber}`,
  color: palette.amber,
  fontSize: 12.5,
  padding: '6px 14px',
  borderRadius: 99,
};
