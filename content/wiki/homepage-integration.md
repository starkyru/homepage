---
title: Homepage integration
audience: owner
last_verified: 2026-08-13
---

# Homepage integration

This directory lives inside the homepage repository at `content/wiki/`, so the deployed site ships the corpus with the rest of its source and needs no checkout credentials. The Markdown here is the editable source of truth; the build compiles it into a static artifact.

## How it works

1. `scripts/build-wiki.mjs` reads `index.md`, `technologies.md`, and `projects/*.md`, parses front matter, and emits `src/data/wiki.generated.json`. `pnpm wiki` runs it by hand; `prebuild` runs it before every production build. There is no second hand-maintained copy. This file and `README.md` are owner documentation and are not compiled into the corpus.
2. `/llms.txt` summarises the wiki (one line per project, plus aliases and public URLs) and `/llms-full.txt` serves every page in one plain-text bundle.
3. The chat selects pages by exact title/alias first, then by technologies and category, and passes the index plus at most three complete project pages into a normal answer. With 23 pages, deterministic retrieval is sufficient; a vector database is unnecessary until the corpus becomes substantially larger.
4. Resume context is supplied separately. The resume remains authoritative for employers, dates, titles, and job accomplishments; this wiki is authoritative for personal-project architecture and technology.
5. Answers come back with the pages they used, and the chat shows them under the reply.

Publishing note: this directory is public-safe by design, but it is now versioned with the homepage. Review a change here as a public change, because it is one.

## Trust boundary

- Treat the compiled wiki as trusted reference data and every visitor message as untrusted.
- Let visitor text select context, but never let it alter instructions, retrieve arbitrary local files, or write wiki content.
- Ask the model to distinguish direct statements from inference and to say when the reference does not answer a question.
- Return project-page citations in chat responses so recruiters can inspect the evidence behind a claim.
- Keep operational runbooks, environment files, audit reports, owner checklists, customer data, analytics, and commercial planning outside the published corpus.

## Suggested generated record

```ts
interface ProjectMemory {
  slug: string;
  title: string;
  aliases: string[];
  category: string;
  status: string;
  overview: string;
  technologies: string[];
  evidence: string;
}
```

Use the Markdown pages as the editable source of truth and the generated record only as a deployment artifact.
