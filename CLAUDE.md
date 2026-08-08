# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Ilia Dzhiubanskii (ilia.to). Built with Next.js 16 App Router, React 19, TypeScript 5, and Tailwind CSS.

## Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Production build (runs next-sitemap postbuild)
pnpm lint             # ESLint check
pnpm lint:strict      # ESLint with zero warnings allowed (used in CI)
pnpm lint:fix         # ESLint autofix + Prettier format
pnpm typecheck        # TypeScript check (tsc --noEmit)
pnpm test             # Run all Jest tests
pnpm test:watch       # Jest in watch mode
pnpm format           # Prettier format all files
pnpm format:check     # Prettier check (used in CI)
```

Run a single test: `pnpm jest src/__tests__/path/to/test.tsx`

## Architecture

- **`src/app/`** — Next.js App Router: pages, layouts, API routes. `/` and `/projects` are structured data only; their view is `SiteShell`, mounted once in the root layout (see below).
- **`src/components/`** — Reusable UI components. `home/` holds the hanging-chain homepage (physics, scene assembly, and the content model). `physics.ts` wraps Planck (Box2D); `model.ts` builds the desktop and mobile scenes from it. `projects/` holds the projects list and its column.
- **`src/data/`** — Generated content. `resume.json` is written by `scripts/parse-resume.mjs`; `tech-logos.json` maps technology labels to Simple Icons slugs.
- **`src/lib/`** — Utilities: `cn()` (clsx + tailwind-merge), `logger()` (dev-only), `og()` (Open Graph URLs).
- **`src/constant/`** — Site config (`siteConfig` with title, description, url) and environment flags.
- **`src/styles/`** — `globals.css` (base styles, typography) and `colors.css` (CSS custom properties for color palette).

## Resume Content

The Google Doc is the single source of truth for homepage content. `pnpm update:resume` fetches its HTML export, parses it to `src/data/resume.json`, and downloads any missing tech logos. **Never hand-edit `resume.json`** — it is overwritten on every run.

`src/components/home/model.ts` derives `SKILLS`, `EXPERIENCE`, `CHIPS`, `SOCIALS`, and `INTRO` from that JSON. Google regenerates its CSS class names on every export, so the parser keys off structure and text (ALL-CAPS section headings; within experience, a date line anchors each job, with the role above it and the company below).

Two optional per-job lines in the doc are read when present, and derived when absent (the script warns which jobs fell back):

- `Summary: <one-liner>` → the hanging card's `short`. Falls back to the first sentence of the job description.
- `Tech: <comma-separated>` → the card's chips. Falls back to keyword-matching the job copy.

A technology with no entry in `tech-logos.json` still renders — as a text disc in the stack ball, and as a text chip on cards. To give it a logo, add a Simple Icons slug there and run `pnpm logos`.

## The Shell (`/` ↔ `/projects`)

`SiteShell` is mounted in the **root layout**, not in either page, so it survives
the navigation between them. That is the whole point: the identity panel is the
same DOM node before and after (it never moves or blinks), and the chain is the
same simulation, so it can slide off to the right, wait there, and come back
without being rebuilt. Both pages are reduced to their JSON-LD; the shell renders
the view for whichever route `usePathname()` reports. Any other route (404) passes
straight through.

Things to know before touching it:

- **The route transition is picked up during render**, not in an effect (React's
  "adjust state when props change" pattern). An effect would commit one frame in
  which the incoming column is up and no phase is set, and the chain would blink
  out instead of sliding.
- **`ROUTE_MS` must outlast the longest animation in its direction**, exactly like
  `TRANSITION_MS` for boring mode — the phase is the only thing holding the
  outgoing view in the DOM and the incoming view's class on it.
- **Parked, not unmounted.** On `/projects` the chain keeps its DOM (hidden via
  `visibility`, so it also leaves the tab order) while `useHangingChain` is torn
  down. The scroller keeps its `scrollLeft` and the world keeps its pose, so
  coming back lands where the visitor left off, and nothing runs meanwhile.
- **A visit that lands on `/projects` builds no scene** until the first idle
  callback — a scene costs a ~300ms synchronous warm-start, and paying it on
  arrival is what made that page feel slow. Warmed but never shown, the chain
  stays unmounted: mounting it parked would spend its drop-in entrance off-stage.
- Links between the two pages must be `next/link`. A bare `<a>` is a document
  navigation, which throws the shell away and rebuilds everything.

## Homepage Physics

The hanging chain runs on Planck (Box2D). `physics.ts` is the only file that
touches the engine: the page thinks in pixels, Planck simulates in metres, and
`PPM` is the single conversion point. Screen y grows downward, so gravity is +y
and a body's angle maps straight onto a CSS `rotate()` with no sign flip.

`Point` is a **read-only view** of a named spot on a body, in stage pixels.
Renderers address the scene by point index and must not write to `.x`/`.y` —
move bodies through `grab`/`dragTo`/`nudge` instead.

Things that will bite you:

- **Rope links must be centre-to-centre `DistanceJoint`s.** Rope nodes have
  `fixedRotation`, so a joint anchored at an _offset_ on one can never turn —
  that silently welds the whole rope into a rigid bar. It still hangs correctly,
  so it looks fine at rest and only shows up as a rope that cannot bend or be
  pulled. The last link is the exception: the rope ends _on_ the attach point and
  the card hinges off it with a zero-length limited `RevoluteJoint`.
- **`ropeHz` has a stability ceiling.** A soft constraint needs a frequency well
  under half the step rate (60 Hz). 24 is already 40% of it; 48 never settles at
  all. More rope segments need a _softer_ rope, which sags more — doubling them
  is not free, it was measured.
- **Desktop ropes are soft (24 Hz + a 2.2× stretch cap), mobile ropes are
  rigid.** Mobile is one serial strand where each rope also carries every box
  below it, so any give compounds down the chain and pushes the last box out of
  the scroller.
- **Sleeping is the performance model.** A settled scene costs ~0.02 ms/frame; an
  unsettled one costs ~20×. Box2D only sleeps an island whose position solver
  converged, so _lowering_ `POS_ITERS` makes the page slower overall, not faster.
- **Creating a joint does not wake a body.** `grab()` wakes explicitly; without
  that, dragging a settled scene does nothing at all.
- Masses are relative and unitless, but a rope node has to stay within about an
  order of magnitude of what it carries or a serial chain visibly sags.
- Scene building warm-starts the simulation synchronously (~250–300 ms) and
  re-runs on every 40px viewport bucket change.

Snapping a chip off destroys its weld joint — the card then tilts because its
balance genuinely changed. A cut-loose body drops to `FALL_DAMPING` so it falls
properly instead of drifting, and is exempt from mobile's anti-tangle speed cap.

## Path Aliases

- `@/*` → `./src/*`
- `~/*` → `./public/*`

## Code Conventions

- **Import order** is enforced by `simple-import-sort` with specific groups: external libs → CSS → `@/lib` & `@/hooks` → `@/data` → `@/components` & `@/container` → `@/store` → other `@/` → relative paths → `@/types`.
- **Commit messages** follow Conventional Commits (`feat`, `fix`, `docs`, `chore`, `style`, `refactor`, `ci`, `test`, `perf`, `revert`, `vercel`). Enforced by commitlint via Husky.
- **Pre-commit hook** runs lint-staged: ESLint (zero warnings) + Prettier on staged files.
- **SVGs** are imported as React components via `@svgr/webpack`. Use `?url` suffix for URL imports.
- Unused variables prefixed with `_` are allowed. Unused imports are auto-removed.
- Prettier: single quotes, 2-space indent, semicolons, always arrow parens.

## Testing

Jest 29 with `@testing-library/react`. Tests live in `src/__tests__/`. Next.js router is mocked via `next-router-mock`. SVGs are mocked in `src/__mocks__/svg.tsx`.

## CI

GitHub Actions (`lint.yml`) runs on push to main and all PRs: `lint:strict` → `typecheck` → `format:check` → `test`.

## Environment

Node 20 (`.nvmrc`; `package.json` requires >=20.9.0). `NEXT_PUBLIC_SHOW_LOGGER` controls dev logger visibility.
