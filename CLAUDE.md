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

## Fireworks

One tap arms a thing (a red halo, `.pop-armed`), the next sets it off. A tech
disc in the stack ball pops where it sits; a chip that has already been snapped
off its card flies up under thrust and airbursts at 80% of the screen height.
Any particle that reaches something else armed sets that off too, which is how a
chain goes.

- **`fireworks.ts` is DOM-imperative and drives its own rAF** for exactly as long
  as it has particles. Its coordinates are _stage_ pixels, and its host div is a
  sibling of the ball and the cards: both clip their content, and the sparks are
  meant to leave. 1 in 10 of a disc burst is caught by the ball and rattles
  around inside it — that minority is what sells the rest as having escaped.
- **Particles are time-stepped, the disc pile is frame-stepped.** A settling pile
  run at 120Hz just settles sooner; a spray run at 120Hz is over in half the time.
- **The watcher list belongs to the layer, not to the engine** (`useFireworks`).
  The engine cannot exist before its host is mounted, and effects run
  children-first — so the stack ball always subscribes before the stage has an
  engine. Registering on the engine silently costs the chain reaction.
- **Nothing here may animate `transform`.** The sims write the transform of every
  disc and chip once a frame, so the armed halo is `box-shadow` only, and its
  border colour is set inline (a class cannot outrank an inline declaration).
- A launched chip is deactivated, not destroyed, when it goes off: every point,
  stick and pose is addressed by index, and `reset()` has to bring it back.

Armed is a live state, not a colour. Anything that runs into an armed chip sets
it off where it lies; a chip already _in flight_ is the opposite case — hit
something on the way up and the thrust dies, so it comes down as the loose chip
it was, with no burst. Both use `struck()`, which ignores whatever the chip was
already touching when it was armed or launched (the pile it was lying in, the
panel it was resting on). A plain "has it moved far enough yet" clearance was
tried first and misses exactly the short-range hits worth catching.

## Solid Chrome

The accordion panel and the nav buttons take part in the physics: mark an
element `data-solid="box"` or `"circle"` and `hudSolids` gives it a body that
tracks where it is on screen, so a snapped-off chip lands on it instead of
falling past. Set the attribute to anything else while the element is parked
off-screen, or it is an invisible shelf lying across the floor.

- **Kinematic and driven by velocity, not static and teleported.** A teleported
  body carries nothing: the panel slides out from under a chip on every scroll,
  and rises straight through one when the accordion opens.
- **A box becomes a shelf across its top edge, at a fixed depth.** The fixture is
  built once and kept — rebuilding it as the accordion animates destroys the
  contact every frame, and a contact that never survives a step never pushes
  anything anywhere. Thin is safe: Box2D runs continuous collision for dynamic
  against non-dynamic.
- **Only chips that have been snapped off collide with it** — `CAT_LOOSE`, not
  `CAT_CHIP`, which the stack ball wears too. Opening the accordion is allowed to
  move what is lying on it and nothing else, so a resting chip does not lean on
  the ball either (a rocket still may; see `launch`). A card swinging into the
  panel, or a mobile strand shouldered aside on every scroll, is not what anyone
  asked for.
- The chains only sync it once something has been snapped off. Measuring an
  element costs a layout read, and with nothing loose nothing can be resting on
  it anyway.

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
