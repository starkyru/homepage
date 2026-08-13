---
title: mcpmake
aliases: [MCP Make, mcpmake CLI, mcpmake.dev]
category: developer tool and hosted product
status: published
public_url: https://mcpmake.dev
card: Turn any API into an MCP server an AI agent can use, in one command — from an OpenAPI spec, Postman collection, HAR capture, or live URL. Generates a clean, typed, editable server you own. Published on npm as mcpmake + @mcpmake/core.
tools: TypeScript monorepo, Anthropic SDK, swagger-parser, citty, Handlebars, json-schema-to-zod, Vitest
private: true
source_scope: CLI/library and hosted repositories
last_verified: 2026-08-13
---

# mcpmake

mcpmake turns an existing API description into an editable Model Context Protocol server that an AI agent can use. I built a published CLI and core generation library that ingest OpenAPI documents, Postman collections, HAR captures, Stainless-style configuration, live URLs, and experimental browser or natural-language inputs; parsers normalize those sources before templates emit typed standalone servers. Generated code has no runtime dependency on mcpmake and can target TypeScript, Python, or Cloudflare Worker environments. A related hosted system covers deployment-oriented concerns and keeps the generation engine shared with the CLI. The project combines protocol design, schema transformation, code generation, command-line ergonomics, multiple ingestion formats, extensive fixtures, and end-to-end validation of generated artifacts.

## Technologies used

- **Core:** TypeScript, Node.js, npm workspaces, OpenAPI types, JSON Schema, YAML.
- **Parsing and generation:** Swagger Parser, Postman/HAR transforms, Handlebars, json-schema-to-zod, Prettier.
- **CLI:** citty, consola, tsx.
- **AI-assisted paths:** Anthropic SDK and OpenAI SDK.
- **Hosted and documentation:** Markdown processing, browser tests, generated-server deployment workflows.
- **Quality:** Vitest, Playwright, TypeScript, npm audit, GitHub Actions, publish preflights.

## Engineering evidence

mcpmake demonstrates compiler-like pipelines, schema normalization, deterministic code generation, CLI/API package boundaries, cross-runtime output, and unusually broad automated testing of generated software.
