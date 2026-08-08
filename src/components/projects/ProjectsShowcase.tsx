import type { CSSProperties } from 'react';
import { FiExternalLink, FiLock } from 'react-icons/fi';
import { VscGithubAlt } from 'react-icons/vsc';

import { palette } from '@/components/home/model';
import { PROJECT_SECTIONS } from '@/components/projects/sections';

const GITHUB = 'https://github.com/starkyru';
const serif = 'var(--font-newsreader), Georgia, serif';

/**
 * The projects column. Vertical padding is the caller's business — it sits in
 * the chain's right-hand column on desktop and in plain document flow
 * everywhere else, and those two want different room at the top.
 */
export default function ProjectsShowcase() {
  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 24px' }}>
      <h1
        style={{
          margin: 0,
          fontFamily: serif,
          fontWeight: 400,
          fontSize: 42,
          lineHeight: 1.05,
          letterSpacing: '-.01em',
        }}
      >
        My Projects
      </h1>
      <p
        style={{
          margin: '14px 0 0',
          fontSize: 14,
          lineHeight: 1.6,
          color: 'rgba(236,231,221,.6)',
          maxWidth: 560,
        }}
      >
        Some of these projects are experiments and aren&apos;t released, some
        have real value. Some aren&apos;t even in this list.
      </p>

      {PROJECT_SECTIONS.map((section) => (
        <section key={section.title} style={{ marginTop: 48 }}>
          <h2 style={sectionTitle}>{section.title}</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {section.projects.map((project) => (
              <div key={project.name} className='project-card' style={card}>
                <div style={cardHead}>
                  <h3 style={cardName}>{project.name}</h3>
                  {project.repo && (
                    <a
                      href={`${GITHUB}/${project.repo}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      style={badgeLink}
                    >
                      <VscGithubAlt size={13} />
                      GitHub
                    </a>
                  )}
                  {project.private && (
                    <span style={badgeMuted}>
                      <FiLock size={12} />
                      Private
                    </span>
                  )}
                  {project.url && (
                    <a
                      href={project.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      style={badgeLive}
                    >
                      <FiExternalLink size={12} />
                      Live
                    </a>
                  )}
                </div>
                <p style={cardDesc}>{project.description}</p>
                <p style={cardTools}>
                  <span style={{ color: palette.amber, fontWeight: 500 }}>
                    Tools:
                  </span>{' '}
                  {project.tools}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <p
        style={{
          marginTop: 56,
          fontSize: 12,
          // .35 was 2.8:1 on the near-black background — below WCAG 1.4.3 AA
          // for body text. .6 is 6.1:1 and still reads as a footnote.
          color: 'rgba(236,231,221,.6)',
        }}
      >
        © 2026 Ilia Dzhiubanskii · Charlotte, NC
      </p>
    </div>
  );
}

const sectionTitle: CSSProperties = {
  margin: '0 0 20px',
  paddingBottom: 10,
  borderBottom: `1px solid ${palette.hairline}`,
  fontFamily: serif,
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 26,
  color: palette.amber,
};

const card: CSSProperties = {
  background: palette.cardBg,
  border: `1px solid ${palette.cardBorder}`,
  borderRadius: 12,
  padding: '18px 22px',
};

const cardHead: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 10,
  marginBottom: 8,
};

const cardName: CSSProperties = {
  margin: 0,
  fontSize: 17,
  fontWeight: 600,
  color: palette.text,
};

const cardDesc: CSSProperties = {
  margin: '0 0 10px',
  fontSize: 13.5,
  lineHeight: 1.6,
  color: 'rgba(236,231,221,.72)',
};

const cardTools: CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.55,
  // .5 landed at 4.47:1 on the card — just under WCAG 1.4.3 AA.
  color: 'rgba(236,231,221,.6)',
};

const badgeBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 9px',
  borderRadius: 999,
  fontSize: 11.5,
  fontWeight: 500,
  textDecoration: 'none',
  border: '1px solid transparent',
};

const badgeLink: CSSProperties = {
  ...badgeBase,
  background: 'rgba(224,164,88,.1)',
  border: '1px solid rgba(224,164,88,.28)',
  color: palette.amber,
};

const badgeMuted: CSSProperties = {
  ...badgeBase,
  background: 'rgba(236,231,221,.06)',
  border: '1px solid rgba(236,231,221,.14)',
  color: 'rgba(236,231,221,.55)',
};

const badgeLive: CSSProperties = {
  ...badgeBase,
  background: palette.amber,
  color: '#1a1408',
  fontWeight: 600,
};
