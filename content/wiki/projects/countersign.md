---
title: Countersign
aliases: [Countersign AI, hitl-console, human approval for agents]
category: open-source library and hosted product
status: published
public_url: https://countersign.cloud
card: Human approval for LangGraph agents. When an agent is about to do something consequential it pauses, a person sees a structured diff instead of a wall of JSON, and the graph resumes with approve, reject, edit, or a written answer. Typed Python SDK on one side, React inbox components on the other, one versioned JSON Schema between them. Open-source SDK plus a hosted console for teams.
tools: Python, LangGraph, JSON Schema, TypeScript, React, Storybook, Next.js, AWS CDK, pytest, Vitest, Playwright
source_scope: public SDK/component repository and hosted console repository
last_verified: 2026-08-13
---

# Countersign

Countersign provides human-approval primitives for LangGraph agents that need to pause a consequential action, display a structured review, and resume with an approve, reject, edit, or free-form response decision. I built a typed Python SDK around LangGraph interruption, a versioned JSON Schema wire contract, reusable React inbox and approval components, structured diffs, schema-driven edit forms, audit timelines, runnable examples, and a hosted team console. The open-source boundary allows applications to retain control of authentication and transport, while the hosted system adds a Next.js review experience and infrastructure automation. This project focuses on human-in-the-loop reliability, typed interoperability between Python and TypeScript, accessible review interfaces, and resumable agent state instead of ad hoc confirmation prompts.

## Technologies used

- **Agent runtime:** Python 3.11+, LangGraph, LangChain Core, typed decorators, pytest, mypy, uv.
- **Frontend packages:** TypeScript, React, AJV/JSON Schema, Storybook, Vite, tsup, accessibility add-ons.
- **Hosted console:** Next.js, React, Tailwind CSS.
- **Infrastructure:** AWS CDK, TypeScript, automated deployments and browser tests.
- **Quality:** Vitest, Playwright, pytest, schema validation, CodeQL, GitHub Actions.

## Engineering evidence

Countersign demonstrates cross-language protocol design, checkpoint-aware agent control flow, reusable component APIs, accessibility, packaging to npm and PyPI, and separation between an open integration layer and hosted operations.
