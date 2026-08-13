---
title: vue-sagas
aliases: [Vue Sagas]
category: experiment
status: archived experiment
card: Saga-style side effect management for Vue/Pinia — framework-neutral core, then Vue and Pinia adapters. (Just a fun experiment, not sure if it has real-world use; the interesting bit was comparing Redux-derived orchestration against Vue reactivity.)
tools: TypeScript, Vue, Pinia, Nx, Vite, Vitest
repo: vue-sagas
source_scope: homepage catalog and local archived source
last_verified: 2026-08-13
---

# vue-sagas

vue-sagas is an experimental TypeScript monorepo that explores saga-style generator effects for Vue applications and Pinia stores. I separated a framework-neutral core from Vue and Pinia adapters so task execution, cancellation, watchers, and effect interpretation could be tested independently of component lifecycles, then exposed the runtime through APIs that fit Vue reactivity and store plugins. The project was a technical exploration rather than a claim that Vue requires saga architecture; its value is the comparison between React/Redux-derived orchestration patterns and Vue's own reactive model. It demonstrates package decomposition, generator runtimes, adapter design, declaration generation, and component/store-level tests.

## Technologies used

- **Language and runtime:** TypeScript, JavaScript generators.
- **Framework and state:** Vue 3, Pinia.
- **Monorepo and build:** Nx, Vite, vite-plugin-dts.
- **Quality:** Vitest, Vue Test Utils, happy-dom, ESLint, Prettier, Husky.

## Engineering evidence

The experiment demonstrates evaluating an architectural pattern by implementing its runtime and multiple adapters rather than discussing it only at a conceptual level.
