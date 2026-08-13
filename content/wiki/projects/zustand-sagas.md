---
title: zustand-sagas
aliases: [Zustand Sagas]
category: library
status: published
card: Redux-Saga-style generator orchestration for Zustand, no Redux required: watchers, cancellation, concurrency, task composition, all typed, with Zustand still owning the state. A separate app consumes the published package against a normal Vite build rather than a workspace link, which is where API problems actually show up.
tools: TypeScript, Zustand, tsup, Vitest
repo: zustand-sagas
source_scope: public library and compatibility-test repository
last_verified: 2026-08-13
---

# zustand-sagas

zustand-sagas brings Redux-Saga-style generator orchestration to Zustand applications without requiring Redux. I built a typed runtime for watchers, effects, cancellation, concurrency, task composition, and store interaction so complex asynchronous workflows can remain declarative and testable while Zustand continues to own state. A separate compatibility application exercises the published package with React, TanStack Query, Testing Library, and a normal Vite build rather than relying only on workspace links. The project demonstrates generator control flow, TypeScript inference, cancellation semantics, package API design, and consumer-level verification of a state-management extension.

## Technologies used

- **Runtime:** TypeScript, JavaScript generators and task/effect orchestration.
- **State:** Zustand.
- **Packaging:** tsup, npm exports and declarations.
- **Compatibility application:** React, Vite, TanStack Query, jsdom and React Testing Library.
- **Quality:** Vitest, TypeScript, ESLint, Prettier, Husky and lint-staged.

## Engineering evidence

zustand-sagas demonstrates adapting a proven concurrency model to a smaller state library while preserving cancellation, composability, type safety, and real-package compatibility.
