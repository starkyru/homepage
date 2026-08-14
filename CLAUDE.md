# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Read [MEMORY.md](MEMORY.md) too. This file documents **how** the code works; that one records **what was decided and why** — including what was deliberately left out of the published wiki, and which files must never be hand-edited. It is written for any agent, not just Claude Code.

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
pnpm wiki             # Recompile content/wiki → src/data/wiki.generated.json
```

Run a single test: `pnpm jest src/__tests__/path/to/test.tsx`

## Architecture

- **`src/app/`** — Next.js App Router: pages, layouts, API routes. `/` and `/projects` are structured data only; their view is `SiteShell`, mounted once in the root layout (see below).
- **`src/components/`** — Reusable UI components. `home/` holds the hanging-chain homepage (physics, scene assembly, and the content model). `physics.ts` wraps Planck (Box2D); `model.ts` builds the desktop and mobile scenes from it. `projects/` holds the projects list and its column.
- **`src/data/`** — Generated content. `resume.json` is written by `scripts/parse-resume.mjs`; `wiki.generated.json` and `projects.generated.json` by `scripts/build-wiki.mjs`; `tech-logos.json` maps technology labels to Simple Icons slugs.
- **`content/wiki/`** — The projects wiki, in Markdown. The editable source of truth for everything the chat knows about personal projects (see below).
- **`src/lib/`** — Utilities: `cn()` (clsx + tailwind-merge), `logger()` (dev-only), `og()` (Open Graph URLs). `wiki/` holds the compiled corpus and its retrieval.
- **`src/constant/`** — Site config (`siteConfig` with title, description, url) and environment flags.
- **`src/styles/`** — `globals.css` (base styles, typography) and `colors.css` (CSS custom properties for color palette).

## Resume Content

The Google Doc is the single source of truth for homepage content. `pnpm update:resume` fetches its HTML export, parses it to `src/data/resume.json`, and downloads any missing tech logos. **Never hand-edit `resume.json`** — it is overwritten on every run.

`src/components/home/model.ts` derives `SKILLS`, `EXPERIENCE`, `CHIPS`, `SOCIALS`, and `INTRO` from that JSON. Google regenerates its CSS class names on every export, so the parser keys off structure and text (ALL-CAPS section headings; within experience, a `<company>, <location> | <dates>` line anchors each job, with the role on the line above it). The header's contact details are pipe-separated fields classified by shape — email, phone, bare domain, otherwise the location — because the doc writes them as plain text rather than as hyperlinks.

The doc names no employer sites, so `COMPANY_URL` in the parser holds the links the cards show; a hyperlink in the doc still wins over it. A run reports every company with neither, rather than deriving a domain from the company name — that lands on whoever owns it today, not on the former employer. A run also fails outright if a section parses to nothing, since the output is committed and a silent empty parse would ship.

The PDF download link is not written out anywhere: `src/constant/resume.ts` derives it from the `source` URL the parser recorded, so the download and the page always come from the same doc. Moving to a new doc is a one-line change to `DOC_ID`.

Two optional per-job lines in the doc are read when present, and derived when absent (the script warns which jobs fell back):

- `Summary: <one-liner>` → the hanging card's `short`. Falls back to the first sentence of the job description.
- `Tech: <comma-separated>` → the card's chips. Falls back to keyword-matching the job copy.

A technology with no entry in `tech-logos.json` still renders — as a text disc in the stack ball, and as a text chip on cards. To give it a logo, add a Simple Icons slug there and run `pnpm logos`.

## Projects Wiki

`content/wiki/` is the public-safe technical memory the chat answers from: one
Markdown page per project under `projects/`, an `index.md` that routes between
them, and `technologies.md` as a reverse index. The Markdown is the source of
truth. `scripts/build-wiki.mjs` (run by `pnpm wiki` and by `prebuild`) parses the
front matter and sections into `src/data/wiki.generated.json` — a deployment
artifact, never hand-edited. `README.md` and `homepage-integration.md` are owner
documentation and are deliberately left out of the compiled corpus.

The compiled record carries what retrieval scores on: `title`, `aliases`,
`category`, `status`, a flattened `technologies` list, and the whole `body`.

- **A trailing version is stripped from a technology name** ("Next.js 15" →
  "Next.js"). Matching is substring-with-boundaries, so the shorter name still
  matches a visitor who spells out the version — the reverse is not true, and
  "Vue" missing "Vue 3" is the bug this prevents.
- **`indexRank` is the position in `index.md`** — the owner's own ordering,
  products first. It breaks score ties, so a tie lands on the more substantial
  project rather than on whichever slug happens to sort first.
- Ranking is exact name/technology matching over the 23 pages, in
  `lib/wiki/retrieval.ts`. It is auditable and costs nothing per request; an
  embedding index is not worth its complexity until the corpus is much larger.

### The wiki also generates `/projects`

The same build writes `src/data/projects.generated.json` — the grouped card list
`src/components/projects/sections.ts` re-exports. That list was hand-kept and
fell nine projects behind the corpus the chat answers from, which is the drift
one source removes. **Edit the Markdown, then run `pnpm wiki`.**

- Cards come from five optional front-matter fields — `card:` (the blurb, in the
  page's own voice rather than the wiki's formal register), `tools:` (the curated
  line under it), `repo:` (a slug under `github.com/starkyru`), `private: true`,
  `beta: true` — plus the existing `public_url:`. `beta` sits _next to_ Live
  rather than replacing it, and is dashed: public and usable, not finished.
  `card:` falls back to the page's one-liner in
  `index.md` and `tools:` to the first 12 entries of its technology list; the
  script warns which pages fell back, exactly as the resume parser does.
- **Grouping and order come from `index.md`**, so the page cannot hold an
  ordering the index disagrees with. `SECTION_TITLES` in the build script maps
  its headings onto the page's — two of them (tools, libraries) deliberately land
  on one. A page the index does not link cannot be placed and is left off the
  page with a warning.
- Two artifacts, not one: `projects.generated.json` reaches the browser (the
  showcase is a client component) and carries no page bodies. The corpus is
  ~100 KB of prose the column has no use for. Presentation fields stay out of
  `wiki.generated.json` for the same reason in reverse.

`lib/wiki/context.ts` assembles the prompt: `wikiOverview` (index + technology
index + a roster of every page) is constant and sits in the static system
prompt where a provider prefix cache can reuse it, and only the retrieved pages
vary per question.

**The question selects trusted pages; it never becomes one.** Visitor text is
scored against the corpus and nothing else — it cannot add, alter, or reach past
the pages, and the retrieved pages are sent as a separate trusted message. Which
pages were used comes back to the browser as `sources` and is shown under the
answer, so a claim can be checked against the page behind it.

`/llms.txt` summarises the wiki (one line per project) and `/llms-full.txt`
serves the whole corpus, both compiled from the same artifact, so neither can
disagree with what the chat is grounded in.

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

Armed is a live state, not a colour. Anything that runs into a lit chip sets it
off — on the ground or in the air. A rocket never comes back down: it either
reaches its apex or goes off against the first thing it meets. Hits use
`struck()`, which ignores whatever the chip was
already touching when it was armed or launched (the pile it was lying in, the
panel it was resting on). A plain "has it moved far enough yet" clearance was
tried first and misses exactly the short-range hits worth catching.

**Lit chips are phantoms** (`LIVE_MASK`): armed or under thrust, a chip goes
through the cards and through the stack ball, and only lies on the floor, the
chrome and other loose chips. A dark one (`LOOSE_MASK`) bumps into everything.
So what a rocket hits is not a contact at all — `chipRockets` tests the geometry
against every ball on the stage, welded ones included (a welded chip is a
phantom to the solver regardless), and a hit does to that ball exactly what a tap
would have: knocks it off its card, arms it, or sets off one already lit — while
the rocket itself explodes on the spot. Balls it launched from inside are not
hits, or it would strike the pile it was sitting in.

**The layer object handed to `useDiscSwarm` must be stable.** The swarm keys its
effect on it, so a fresh object per render tears the swarm down and respawns
every disc at a new random spot — the pile visibly jumps on any state change in
the chain, opening the accordion included.

**The chains own their nodes' `transform`, but React writes it too.** Each card
and chip carries a JSX transform (translate only) that is recomputed from live
physics on every render, so re-rendering the chain — opening the accordion, say
— writes it straight over the pose the loop had put there, rotation and all. The
loop therefore compares against the element's own inline style rather than a
remembered string: an untouched node still costs no write, and a clobbered one
is repaired on the very next frame.

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

## Design Context

### Users

Recruiters, hiring managers, and technical peers evaluating Ilia Dzhiubanskii for senior frontend and full-stack engineering roles. They need quick, credible answers about relevant experience, projects, and technology depth.

### Brand Personality

Direct, pragmatic, and technically credible. The experience should communicate confidence and clarity without marketing fluff.

### Aesthetic Direction

Retain the portfolio's dark, amber-accented hanging-chain visual language. Supporting interfaces should be focused and restrained, prioritizing readable information and clear state over decorative effects.

### Design Principles

1. Make recruiter-relevant evidence easy to scan and verify.
2. Use concise, plain language over promotional claims.
3. Preserve the site's dark amber visual identity without competing with the portfolio content.
4. Keep interactions keyboard-accessible, responsive, and respectful of reduced-motion preferences.
5. Surface feature availability and errors honestly and clearly.
