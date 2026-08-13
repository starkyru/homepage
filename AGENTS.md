# AGENTS.md

Entry point for coding agents working in this repository.

- [MEMORY.md](MEMORY.md) — decisions and constraints: what was deliberately left
  out of the published projects wiki, which files are generated and must never be
  hand-edited, and the chat's trust boundary. **Read this first.**
- [CLAUDE.md](CLAUDE.md) — how the code works: commands, architecture, the
  homepage physics, the projects wiki pipeline, conventions, CI.

Both files apply whichever agent you are; neither is Claude-specific in content.

Checks before calling work done: `pnpm lint:strict`, `pnpm typecheck`,
`pnpm format:check`, `pnpm test`.
