---
title: Timerail
aliases: [TimeRail, resource scheduler]
category: library and product
status: release candidate under validation
public_url: https://timerail.dev
beta: true
card: Headless React calendar and resource scheduler. The hard parts — date math, recurrence, DST, drag and resize, collisions, screen-reader announcements — live in framework-neutral state machines, and the styles are optional and replaceable, so behavior and look can move independently. Day/week/month plus editors and recurrence in the free tier; virtualized resource timelines, capacity rules, export and undo/redo on top of it.
tools: TypeScript, React 19, state machines, Temporal-aware date math, virtualization, Node.js, PostgreSQL, Vitest, fast-check, Playwright, axe-core
source_scope: public packages and control-plane repository
last_verified: 2026-08-13
---

# Timerail

Timerail is a headless-first React calendar and resource scheduler designed so behavior, markup, and visual identity can evolve independently. I implemented framework-neutral date math, state machines, selection, navigation, drag/resize, recurrence, collision handling, accessibility announcements, and prop-getter contracts; React hooks and compound components expose those primitives, while optional styles and stable data attributes provide a polished but replaceable reference layer. The free workflow includes day, week, and month interactions, editors, recurring-event scopes, overlays, business hours, and date controls, while dense resource planning adds virtualized timelines, capacity validation, grouping, multi-event operations, export, and undo/redo. A separate control plane supports licensing and administration without coupling hosted behavior to the UI packages.

## Technologies used

- **Core and UI:** TypeScript, React 19, framework-neutral reducers/state machines, CSS custom properties and cascade layers.
- **Scheduling:** Temporal-aware date abstraction, recurrence, timezone/DST handling, layout and collision algorithms.
- **Pro planning:** virtualization, dense resource timelines, PNG/PDF export, offline Ed25519 license verification.
- **Hosted system:** Node.js, PostgreSQL, Vite-based admin applications.
- **Tooling:** pnpm workspaces, Vite, Vitest, fast-check, Playwright across browser/device profiles, axe-core, size-limit, Changesets.
- **Documentation:** generated API references, interactive examples, benchmarks, and a coding-agent skill validated against real exports.

## Engineering evidence

Timerail demonstrates headless component architecture, difficult temporal and interaction logic, accessibility, performance benchmarking, package-boundary testing, and theming that does not lock consumers into one DOM or CSS system.
