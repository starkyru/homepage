import type { CSSProperties } from 'react';

import { type Experience, palette, techLogo } from './model';

/**
 * The body of the centred-job accordion, shared by the desktop panel and the
 * mobile sheet so the two cannot drift apart. Only the padding differs — the
 * desktop panel grows downward out of its title bar, the mobile sheet upward.
 *
 * The tag cloud lists the job's whole `Tech:` line, including the labels the
 * scene leaves off: a chip is a 40px disc, so a long name with no logo never
 * becomes one (see `legible` in `model.ts`). Here it is text, so nothing has to
 * be hidden — this is the one place a visitor sees every technology on a job.
 */
export default function JobDetails({
  job,
  padding,
}: {
  job: Experience;
  padding: string;
}) {
  return (
    <div style={{ padding }}>
      <div style={roleStyle}>{job.role}</div>
      <div style={periodStyle}>{job.period}</div>
      <p style={blurbStyle}>{job.blurb}</p>
      {job.tech.length > 0 && (
        <ul aria-label='Technologies' style={cloudStyle}>
          {job.tech.map((label) => (
            <TechTag key={label} label={label} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TechTag({ label }: { label: string }) {
  const src = techLogo(label);
  return (
    <li style={tagStyle}>
      {src && (
        // The label sits right next to it, so the logo is decorative here.
        <img
          src={src}
          alt=''
          width={12}
          height={12}
          style={{ display: 'block', flexShrink: 0 }}
        />
      )}
      {label}
    </li>
  );
}

const roleStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: palette.amber,
};

const periodStyle: CSSProperties = {
  fontSize: 11.5,
  color: 'rgba(236,231,221,.6)',
  marginTop: 2,
};

const blurbStyle: CSSProperties = {
  margin: '8px 0 0',
  fontSize: 12.5,
  lineHeight: 1.5,
  color: 'rgba(236,231,221,.72)',
  whiteSpace: 'pre-line', // keep intro + bullet lines from ilia.to
};

const cloudStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  margin: '10px 0 0',
  padding: 0,
  listStyle: 'none',
};

const tagStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '3px 8px',
  fontSize: 11,
  lineHeight: 1.4,
  color: 'rgba(236,231,221,.78)',
  background: 'rgba(236,231,221,.05)',
  border: `1px solid ${palette.hairline}`,
  borderRadius: 999,
};
