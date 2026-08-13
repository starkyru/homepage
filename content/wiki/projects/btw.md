---
title: btw
aliases: [BTW agent]
category: internal developer tool
status: active internal system
card: Personal knowledge agent for code snippets, reusable skills, and project context — it works out what stack you are in and surfaces the relevant thing. One TypeScript core behind a terminal UI, a macOS app, an MCP server for coding tools, a Chrome extension, and a Telegram bot. Internal, but one domain layer serving that many clients without duplicating storage is the interesting part.
tools: TypeScript monorepo (Turbo), ESLint/Prettier
source_scope: local monorepo
last_verified: 2026-08-13
---

# btw

btw is a context-aware personal knowledge agent for storing, searching, and injecting code snippets, reusable skills, and project-specific context. I built one TypeScript core and exposed it through a multi-tab terminal interface, Electron/macOS application, MCP server for coding tools, ACP server for a browser extension, Telegram bot, and Chrome extension. The core detects the current project's technology, ranks relevant knowledge, stores local data and sessions, watches files, communicates over WebSockets, and can route conversations through local models or installed coding-agent CLIs. This is an internal productivity system rather than a public product, but its architecture demonstrates how one domain layer can serve terminal, desktop, browser, messaging, and agent-protocol clients without duplicating storage and retrieval behavior.

## Technologies used

- **Core:** TypeScript, Node.js, SQLite/better-sqlite3, Zod, Zustand, zustand-sagas, Chokidar, WebSockets.
- **Agent protocols and AI:** MCP SDK, ACP server, Anthropic SDK, local-model and coding-CLI adapters.
- **Interfaces:** terminal UI with Markdown/highlighting, Electron, React, Chrome extension, Telegram/grammY.
- **Build:** Turborepo, pnpm workspaces, tsup, Vite, Electron Builder.
- **Quality:** Vitest, TypeScript ESLint, Prettier, Husky.

## Engineering evidence

btw demonstrates shared-core architecture across five delivery channels, local-first storage, contextual retrieval, agent protocol integration, and practical developer-experience tooling.
