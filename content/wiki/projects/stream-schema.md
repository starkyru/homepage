---
title: stream-schema
aliases: [stream schema, @stream-schema/core]
category: library family
status: published core integrations
card: Renders structured model output while it is still arriving: reconstructs partial JSON as it streams, then validates the finished value properly. Core plus React, Vue, and Zod integrations. Built because waiting for one final JSON object makes an AI interface feel broken. AngleForge runs on it.
tools: TypeScript, tsup, Vitest
repo: stream-schema
source_scope: public monorepo
last_verified: 2026-08-13
---

# stream-schema

stream-schema is a small TypeScript library for reconstructing and validating structured values while JSON-like model output arrives incrementally. I built a framework-neutral core and integration packages for React, Vue, and Zod so an application can render useful partial state during generation and still apply explicit schema validation to the completed value. The library is used by AI interfaces where waiting for one final JSON object would produce a poor user experience, including progressively rendered audits and creative-generation workflows. Its package boundaries keep stream parsing independent of UI lifecycles and validation libraries, which makes the core reusable and the adapters thin.

## Technologies used

- **Core:** TypeScript, incremental structured-data parsing and typed partial values.
- **Integrations:** React, Vue and Zod.
- **Packaging:** pnpm workspaces, tsup, package exports and type declarations.
- **Quality:** Vitest, TypeScript, ESLint, Prettier, Husky and lint-staged.

## Engineering evidence

The project demonstrates turning nondeterministic token streams into predictable application state while preserving framework separation and final schema guarantees.
