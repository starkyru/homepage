export interface Project {
  name: string;
  description: string;
  tools: string;
  repo?: string;
  url?: string;
  private?: boolean;
}

export interface Section {
  title: string;
  projects: Project[];
}

/**
 * Hand-written, unlike the resume — there is no Google Doc behind this one.
 *
 * Lives outside the component so `/projects/page.tsx` (a server component) can
 * build its JSON-LD from the same list the client shell renders.
 */
export const PROJECT_SECTIONS: Section[] = [
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
