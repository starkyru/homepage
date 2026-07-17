import { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { FiExternalLink, FiLock } from 'react-icons/fi';
import { VscGithubAlt } from 'react-icons/vsc';

import { homeFontVars } from '@/lib/fonts';

import { palette } from '@/components/home/model';

export const metadata: Metadata = {
  title: 'My Projects',
  description: 'Open-source projects and apps by Ilia Dzhiubanskii',
  alternates: { canonical: '/projects' },
};

const GITHUB = 'https://github.com/starkyru';
const serif = 'var(--font-newsreader), Georgia, serif';

interface Project {
  name: string;
  description: string;
  tools: string;
  repo?: string;
  url?: string;
  private?: boolean;
}

interface Section {
  title: string;
  projects: Project[];
}

const sections: Section[] = [
  {
    title: 'Apps & Products',
    projects: [
      {
        name: 'Overtone.art',
        description:
          'Photography gallery and storefront I built and operate end-to-end. A Turbo monorepo: NestJS API, Next.js web, React Native mobile app, MCP server, and a Storybook component library. Stripe payments, automated print fulfillment via my own Printify/Prodigi SDKs, an in-browser design editor (canvas-editor), and a two-stage LLM pipeline that drafts artwork descriptions.',
        tools:
          'Turbo monorepo, NestJS, Next.js 15, React 19, React Native, Stripe, Anthropic SDK, Storybook, Fabric.js, PostgreSQL, Redis',
        url: 'https://overtone.art',
      },
      {
        name: 'bake-app',
        private: true,
        description: 'Unified Cafe-Bakery automation platform.',
        tools:
          'NestJS, TypeORM, PostgreSQL, Redis, Bull, Socket.io, Swagger; React + Vite frontend, TanStack Query, Zustand, Tailwind CSS; Anthropic SDK',
      },
      {
        name: 'Willy',
        description:
          'AI-powered voice hiring assistant — answers recruiter calls using confirmed resume knowledge. Android + macOS desktop.',
        tools:
          'TypeScript monorepo, React Native (Android), Electron (macOS), Claude',
      },
      {
        name: 'ASO Audit Agent',
        private: true,
        description:
          'AI-powered App Store Optimization audit tool. Paste an App Store URL, get a scored audit with actionable recommendations. Two-agent architecture with server-side tool execution, progressive JSON streaming, and server-side score recalculation.',
        tools:
          'NestJS, Mastra, Next.js 15, React 19, Tailwind CSS, @stream-schema/core, Zod, TypeScript monorepo (Turbo), NVIDIA NIM / Anthropic Claude',
      },
      {
        name: 'AccordsQ',
        description:
          'React Native music composing app built around chord progressions. Place chords on a simplified score, tune each chord note-by-note, layer instrument/drum tracks, arrange reusable sections.',
        tools:
          'React Native, Expo, TypeScript, Zustand, Immer, React Navigation, react-native-audio-api, react-native-reanimated, tonal, Gorhom Bottom Sheet',
      },

      {
        name: 'vocallQ',
        description:
          'Expo voice/audio app with on-device ML (pitch detection).',
        tools:
          'React Native, Expo Router, TypeScript, Zustand, Shopify Skia, onnxruntime-react-native, pitchy, expo-audio-studio, Moti',
      },

      {
        name: 'AngleForge',
        url: 'https://angleforge.ilia.to',
        description:
          'Angle-first ad-creative factory. Paste one offer brief and it extracts the persuasion angles worth testing, crosses them with hooks, and renders every combination through deterministic HTML/CSS templates in five style tiers — direct-response, native editorial, lo-fi notes-app, iMessage thread, and As-Seen-On-TV — at exact Meta + Taboola placement sizes. Each variant is linted against per-vertical banned-claims rules before you spend a dollar, then exported as a ZIP whose filenames encode offer_angle_hook_style_size so results roll up by angle. Selected variants push as PAUSED ads to an ad account, and it runs end-to-end with no API keys via a deterministic fixture matrix.',
        tools:
          'Next.js, Anthropic Claude, NVIDIA NIM, OpenAI, fal.ai, Playwright, @stream-schema, sharp, Zod',
      },
    ],
  },
  {
    title: 'Developer Tools & Libraries',
    projects: [
      {
        name: 'btw',
        description:
          'Interactive agent for managing code snippets, skills, and context-aware injection. CLI, macOS desktop app, MCP server, Telegram bot, browser extension.',
        tools: 'TypeScript monorepo (Turbo), ESLint/Prettier',
      },
      {
        name: 'mcpmake',
        private: true,
        url: 'https://mcpmake.dev',
        description:
          'Turn any API into an MCP server an AI agent can use, in one command — from an OpenAPI spec, Postman collection, HAR capture, or live URL. Generates a clean, typed, editable server you own. Published on npm as mcpmake + @mcpmake/core.',
        tools:
          'TypeScript monorepo, Anthropic SDK, swagger-parser, citty, Handlebars, json-schema-to-zod, Vitest',
      },
      {
        name: 'canvas-editor',
        private: true,
        description:
          'Pluggable canvas editor built on Fabric.js: layers, undo/redo, crop, snapping, pattern tiling, product-mockup preview, and PNG/SVG/JSON export. Framework-agnostic core plus a React binding. Published on npm under @overtone-art; powers the Overtone.art design tools.',
        tools:
          'TypeScript, Fabric.js, React, tsup, AWS S3 adapter, Turbo, Vitest',
      },
      {
        name: 'printify-sdk',
        repo: 'printify-sdk',
        description: 'TypeScript SDK for the Printify API.',
        tools: 'TypeScript, Vitest, ESLint',
      },
      {
        name: 'prodigi-print-api',
        repo: 'prodigi-print-api',
        description:
          'TypeScript client library for the Prodigi Print API v4.0.',
        tools: 'TypeScript, tsup, Vitest, ESLint/Prettier',
      },
      {
        name: 'zustand-sagas',
        repo: 'zustand-sagas',
        description:
          'Redux-saga-style generator-based side effect management for Zustand.',
        tools: 'TypeScript, Zustand, tsup, Vitest',
      },
      {
        name: 'vue-sagas',
        repo: 'vue-sagas',
        description:
          'Saga-style side effect management for Vue/Pinia. (Just a fun experiment, not sure if it has real-world use.)',
        tools: 'TypeScript, Vue, Pinia, Nx, Vite, Vitest',
      },
      {
        name: 'store-ai',
        repo: 'store-ai',
        description:
          'Framework-agnostic, store-agnostic AI stream state management for TypeScript.',
        tools: 'TypeScript monorepo (Turbo)',
      },
      {
        name: 'stream-schema',
        repo: 'stream-schema',
        description: 'Streaming schema library.',
        tools: 'TypeScript, tsup, Vitest',
      },
      {
        name: 'ripple-text',
        repo: 'ripple-text',
        description:
          'Physics-driven text animation engine — characters react to mouse/touch via ripple waves and field effects (water caustics).',
        tools: 'TypeScript, Vite',
      },
    ],
  },
  {
    title: 'Learning & Courses',
    projects: [
      {
        name: 'learn-ai',
        repo: 'learn-ai',
        description:
          'A hands-on, project-based curriculum that goes from LLM fundamentals to production RAG and agents — in both TypeScript and Python. 24 numbered modules plus deep-dive companions, each runnable code you build, break, and extend across three depth lanes: use the ecosystem, hand-implement one core piece, or build the machinery from scratch (BPE tokenizer, attention head, vector index, ReAct loop).',
        tools:
          'TypeScript + Python monorepo (pnpm, uv), Jest, Anthropic / OpenAI / NVIDIA NIM providers, Chroma/Qdrant, LangGraph, MCP',
      },
      {
        name: 'learn-fullstack',
        repo: 'learn-fullstack',
        description:
          'A hands-on, project-based course from TypeScript basics to two production capstones — a Trello-lite Kanban board and a Slack-lite realtime chat. End-to-end TypeScript: React, Next.js, Node/NestJS, REST + GraphQL, Postgres raw and via Prisma, auth, realtime, Docker, testing, CI/CD. 30 numbered modules plus 20 lettered deep-dives across three depth lanes, with tutor/exam/progress slash commands.',
        tools:
          'TypeScript monorepo (Turbo, pnpm), React 19, Next.js, NestJS, GraphQL, Prisma, PostgreSQL, Docker, Vitest, Storybook',
      },
    ],
  },
];

export default function ProjectsPage() {
  return (
    <main
      className={homeFontVars}
      style={{
        minHeight: '100dvh',
        background: palette.bg,
        color: palette.text,
        fontFamily: 'var(--font-instrument), system-ui, sans-serif',
      }}
    >
      <div
        style={{ maxWidth: 880, margin: '0 auto', padding: '104px 24px 80px' }}
      >
        <div
          style={{
            fontFamily: serif,
            fontStyle: 'italic',
            fontSize: 18,
            color: palette.amber,
            marginBottom: 12,
          }}
        >
          ilia.to
        </div>
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

        {sections.map((section) => (
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
            color: 'rgba(236,231,221,.35)',
          }}
        >
          © 2026 Ilia Dzhiubanskii · Charlotte, NC
        </p>
      </div>
    </main>
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
  color: 'rgba(236,231,221,.5)',
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
