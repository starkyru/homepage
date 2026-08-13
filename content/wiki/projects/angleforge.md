---
title: AngleForge
aliases: [Angle Forge]
category: product
status: invite-only
public_url: https://angleforge.ilia.to
beta: true
card: Angle-first ad-creative factory. Paste one offer brief and it extracts the persuasion angles worth testing, crosses them with hooks, and renders every combination through deterministic HTML/CSS templates in five style tiers — direct-response, native editorial, lo-fi notes-app, iMessage thread, and As-Seen-On-TV — at exact Meta + Taboola placement sizes. Each variant is linted against per-vertical banned-claims rules before you spend a dollar, then exported as a ZIP whose filenames encode offer_angle_hook_style_size so results roll up by angle. Selected variants push as PAUSED ads to an ad account, and it runs end-to-end with no API keys via a deterministic fixture matrix.
tools: Next.js, Anthropic Claude, NVIDIA NIM, OpenAI, fal.ai, Playwright, @stream-schema, sharp, Zod
source_scope: local monorepo
last_verified: 2026-08-13
---

# AngleForge

AngleForge is an angle-first ad-creative production system: one offer brief becomes a structured matrix of persuasion angles, hooks, visual styles, and exact placement sizes, then deterministic HTML/CSS templates render the selected combinations into reviewable assets. I built claim linting and per-vertical policy rules into the generation path, plus fixture-based operation that exercises the full workflow without external AI credentials. The monorepo separates domain logic, authentication, data access, model integrations, ingestion, media handling, remix logic, job orchestration, rendering, storage, observability, web, administration, workers, and a dedicated Playwright render service. Export naming preserves experimental dimensions so downstream results can be analyzed by angle rather than treated as an undifferentiated set of ads.

## Technologies used

- **Application:** TypeScript, Next.js, React, Zod, Better Auth, Turborepo.
- **Data and jobs:** PostgreSQL, Drizzle ORM/Kit, PGlite, pg-boss.
- **AI:** Anthropic SDK, OpenAI SDK, NVIDIA-compatible providers, fal.ai integrations, stream-schema.
- **Rendering and media:** Playwright, HTML/CSS templates, Sharp, ZIP/fflate pipelines.
- **Storage and infrastructure:** AWS S3 APIs, presigned URLs, worker and render-service processes.
- **Quality:** Vitest, Playwright Test, deterministic fixture matrices, ESLint, Prettier, GitHub Actions.

## Engineering evidence

The project demonstrates decomposition of a complex AI workflow into deterministic domain stages, policy-aware generation, reproducible rendering, background jobs, and export formats designed for measurement.
