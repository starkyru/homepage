---
title: Store AI
aliases: [store-ai]
category: library family
status: published
card: One state machine for consuming AI streams, with adapters for React, Vue, Angular, Svelte, Solid, Preact, Lit, Redux Toolkit, Zustand, Jotai, Valtio, Nanostores, and TanStack Store. The same stream lifecycle — partial, complete, cancelled, failed — mapped into whatever reactivity the host framework already has. Transport stays outside the package.
tools: TypeScript monorepo (Turbo)
repo: store-ai
source_scope: public monorepo
last_verified: 2026-08-13
---

# Store AI

Store AI is a framework- and state-store-neutral TypeScript layer for consuming streamed AI output without tying application logic to one frontend ecosystem. I built a small core state machine and adapter packages for React, Vue, Angular, Svelte, Solid, Preact, Lit, Redux Toolkit, Zustand, Jotai, Valtio, Nanostores, and TanStack Store, plus documentation and runnable examples. Each adapter maps the same stream lifecycle—partial data, completion, cancellation, and error state—into the host framework's native reactive model while keeping provider transport outside the package boundary. The family demonstrates portable API design across very different reactivity systems, monorepo packaging, peer-dependency discipline, and a broad compatibility test matrix.

## Technologies used

- **Core:** TypeScript, framework-neutral stream/state contracts.
- **Framework adapters:** React, Vue, Angular, Svelte, SolidJS, Preact and Lit ReactiveElement.
- **Store adapters:** Redux Toolkit, Zustand, Jotai, Valtio, Nanostores and TanStack Store.
- **Examples and docs:** Vite, VitePress, representative framework applications.
- **Packaging and quality:** Turborepo, pnpm, tsup, Vitest, TypeScript, Prettier, Husky.

## Engineering evidence

Store AI demonstrates designing one behavioral contract that feels native across fourteen ecosystems instead of hiding framework differences behind a lowest-common-denominator wrapper.
