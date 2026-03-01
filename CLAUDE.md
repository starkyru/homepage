# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Ilia Dzhiubanskii (dzhiubanskii.com). Built with Next.js 15 App Router, React 19, TypeScript 5, and Tailwind CSS.

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

- **`src/app/`** — Next.js App Router: pages, layouts, API routes. Home page (`page.tsx`) is a client component.
- **`src/components/`** — Reusable UI components (buttons with variants, link components). Button supports variants: primary, outline, ghost, light, dark.
- **`src/lib/`** — Utilities: `cn()` (clsx + tailwind-merge), `logger()` (dev-only), `og()` (Open Graph URLs).
- **`src/constant/`** — Site config (`siteConfig` with title, description, url) and environment flags.
- **`src/styles/`** — `globals.css` (base styles, typography) and `colors.css` (CSS custom properties for color palette).

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

Node 18 (`.nvmrc`). `NEXT_PUBLIC_SHOW_LOGGER` controls dev logger visibility.
