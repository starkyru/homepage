---
title: Frontend Debugger
aliases: [Frontend Debugger MCP, frontend-debugger]
category: developer tool
status: published core with hosted extensions
card: Gives a coding agent eyes on a running interface: component trees and state for React, Vue, Svelte and Angular, visual diffs attributed to the subtree that caused them, accessibility, and replayable failures — not just screenshots. Built on the Chrome DevTools Protocol, with no instrumentation added to the app under test, and shipped as an MCP server, a CLI, an Electron app, and a CI package. Tools load progressively so the agent context stays small until there is something to look at.
tools: Chrome DevTools Protocol, TypeScript, MCP SDK, Electron, rrweb, axe-core, pixelmatch, Next.js, Prisma, Stripe, Vitest
source_scope: core, cloud, and GitHub Action repositories
last_verified: 2026-08-13
---

# Frontend Debugger

Frontend Debugger gives AI coding agents structured visibility into a running interface: framework component trees and state, visual differences, accessibility, browser events, performance, design-token drift, and replayable failure context rather than screenshots alone. I built an MCP server, core inspection library, CLI, Electron application, report system, CI package, hosted dashboard components, and GitHub integration boundary around Chrome DevTools Protocol. It inspects React, Vue, Svelte, and Angular without adding instrumentation to the target application, attributes visual changes to component subtrees where framework internals allow it, and can package visual, component-tree, and accessibility deltas into one verification artifact. Progressive tool loading keeps agent context small until a browser and framework are detected.

## Technologies used

- **Inspection:** Chrome DevTools Protocol, React Fiber/Vue/Svelte/Angular runtime inspection, rrweb.
- **Protocol and apps:** TypeScript, MCP SDK, Electron, Node.js, Zod.
- **Visual and accessibility:** axe-core, pixelmatch, PNGJS, responsive/dark-mode/reduced-motion checks.
- **AI:** Anthropic SDK for optional explanations.
- **Hosted system:** Next.js, React, NextAuth, Prisma, Stripe, AWS S3, GitHub Apps/Octokit, email.
- **Quality and docs:** Vitest, VitePress, TypeScript, GitHub Actions.

## Engineering evidence

The project demonstrates browser internals, multi-framework introspection, visual-regression algorithms, accessibility automation, context-efficient MCP design, desktop delivery, and extension into CI and hosted collaboration.
