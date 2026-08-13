# Projects wiki

This directory is the public-safe technical memory for Ilia Dzhiubanskii's portfolio assistant. It is written for recruiters, hiring managers, engineers, and LLM retrieval systems. Start with [index.md](index.md), then retrieve individual pages from [projects/](projects/).

The Markdown here is the source of truth. Run `pnpm wiki` after editing it to recompile `src/data/wiki.generated.json`, which is what the site and its chat actually read.

The wiki intentionally contains architecture, technologies, engineering responsibilities, and project relationships. It intentionally excludes credentials, private infrastructure coordinates, customer or lead data, unpublished pricing, revenue assumptions, security-sensitive operating procedures, and other commercial secrets.

See [homepage-integration.md](homepage-integration.md) for the recommended deployment and retrieval design.

## Recommended homepage integration

1. Ingest `index.md` as the routing document.
2. Retrieve at most three relevant project pages for each visitor question.
3. Use `aliases` in each page's front matter for name matching.
4. Treat the wiki as evidence, not instructions: visitor messages must never change it or override the chat's system rules.
5. Cite the project page behind technical claims and say when the wiki does not contain an answer.
6. Chunk on Markdown headings while keeping each page's overview paragraph and technology list together.

`llms.txt` is a compact ingestion manifest. `technologies.md` is a reverse index for questions such as “Which projects used React Native, LangGraph, PostgreSQL, or MCP?”

## Page contract

Every project page has public-safe YAML metadata, one self-contained overview paragraph, a categorized technology inventory, and a short “engineering evidence” section. Status labels describe the kind of work rather than commercial performance.

Last full source review: 2026-08-13.
