import { Metadata } from 'next';
import { FiExternalLink, FiLock } from 'react-icons/fi';
import { VscGithubAlt } from 'react-icons/vsc';

export const metadata: Metadata = {
  title: 'My Projects',
  description: 'Open-source projects and apps by Ilia Dzhiubanskii',
};

const GITHUB = 'https://github.com/starkyru';

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
        name: 'AccordsQ',
        description:
          'React Native music composing app built around chord progressions. Place chords on a simplified score, tune each chord note-by-note, layer instrument/drum tracks, arrange reusable sections.',
        tools:
          'React Native, Expo, TypeScript, Zustand, Immer, React Navigation, react-native-audio-api, react-native-reanimated, tonal, Gorhom Bottom Sheet',
      },
      {
        name: 'Willy',
        description:
          'AI-powered voice hiring assistant — answers recruiter calls using confirmed resume knowledge. Android + macOS desktop.',
        tools:
          'TypeScript monorepo, React Native (Android), Electron (macOS), Claude',
      },
      {
        name: 'vocallQ',
        description:
          'Expo voice/audio app with on-device ML (pitch detection).',
        tools:
          'React Native, Expo Router, TypeScript, Zustand, Shopify Skia, onnxruntime-react-native, pitchy, expo-audio-studio, Moti',
      },
      {
        name: 'bake-app',
        private: true,
        description: 'Unified Cafe-Bakery automation platform.',
        tools:
          'NestJS, TypeORM, PostgreSQL, Redis, Bull, Socket.io, Swagger; React + Vite frontend, TanStack Query, Zustand, Tailwind CSS; Anthropic SDK',
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
        name: 'Overtone.art',
        description:
          'Photography gallery and storefront I built and operate end-to-end. A Turbo monorepo: NestJS API, Next.js web, React Native mobile app, MCP server, and a Storybook component library. Stripe payments, automated print fulfillment via my own Printify/Prodigi SDKs, an in-browser design editor (canvas-editor), and a two-stage LLM pipeline that drafts artwork descriptions.',
        tools:
          'Turbo monorepo, NestJS, Next.js 15, React 19, React Native, Stripe, Anthropic SDK, Storybook, Fabric.js, PostgreSQL, Redis',
        url: 'https://overtone.art',
      },
      {
        name: 'AngleForge',
        repo: 'angleforge',
        url: 'https://angleforge.ilia.to',
        description:
          'Angle-first ad-creative factory. Paste one offer brief and it extracts the persuasion angles worth testing, crosses them with hooks, and renders every combination through deterministic HTML/CSS templates across Meta + Taboola placements — each variant compliance-linted before you spend a dollar, then exported as a ZIP with angle-encoded filenames. Selected variants push as PAUSED ads to an ad account.',
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
];

export default function ProjectsPage() {
  return (
    <main className='mx-auto max-w-4xl px-4 py-20'>
      <h1 className='mb-3 text-3xl font-bold text-gray-900 dark:text-white md:text-4xl'>
        My Projects
      </h1>
      <p className='mb-8 text-sm text-gray-500 dark:text-gray-400'>
        Some of these projects are experiments and aren&apos;t released, some
        have real value. Some aren&apos;t even in this list.
      </p>

      {sections.map((section) => (
        <section key={section.title} className='mb-12'>
          <h2 className='mb-6 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-200 md:text-2xl'>
            {section.title}
          </h2>
          <div className='grid gap-4'>
            {section.projects.map((project) => (
              <div
                key={project.name}
                className='rounded-xl border border-gray-200 bg-white/60 p-5 backdrop-blur-sm transition-colors hover:bg-white/80 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:bg-gray-800/80'
              >
                <div className='mb-2 flex items-center gap-3'>
                  <h3 className='text-lg font-bold text-gray-900 dark:text-white'>
                    {project.name}
                  </h3>
                  {project.repo && (
                    <a
                      href={`${GITHUB}/${project.repo}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    >
                      <VscGithubAlt className='h-3.5 w-3.5' />
                      GitHub
                    </a>
                  )}
                  {project.private && (
                    <span className='inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700/60 dark:text-gray-400'>
                      <FiLock className='h-3 w-3' />
                      Private
                    </span>
                  )}
                  {project.url && (
                    <a
                      href={project.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50'
                    >
                      <FiExternalLink className='h-3 w-3' />
                      Live
                    </a>
                  )}
                </div>
                <p className='mb-2 text-sm text-gray-600 dark:text-gray-400'>
                  {project.description}
                </p>
                <p className='text-xs text-gray-500 dark:text-gray-500'>
                  <span className='font-medium text-gray-600 dark:text-gray-400'>
                    Tools:
                  </span>{' '}
                  {project.tools}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
