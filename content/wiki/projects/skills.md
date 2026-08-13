---
title: Coding Agent Skills
aliases: [skills repository, agent skills]
category: internal developer infrastructure
status: active
card: My own coding-agent skills, versioned like code. Each one packages a repeated workflow — scope, what to read first, tool preferences, safety limits, how to verify — so it can be loaded on demand instead of re-pasted into a prompt. Templates and validation scripts keep them structurally consistent. Internal infrastructure, not a product.
tools: Markdown, YAML front matter, shell validation scripts, GitHub Actions
private: true
source_scope: local repository
last_verified: 2026-08-13
---

# Coding Agent Skills

The Skills repository contains reusable instruction packages for coding agents, along with templates, documentation, validation scripts, and continuous checks that keep those packages structurally consistent. I use it to turn repeated engineering activities into explicit, versioned workflows that can be loaded on demand instead of copied into prompts or rediscovered in every project. A skill can encode scope, prerequisite reading, tool preferences, safety boundaries, verification requirements, and links to supporting assets while remaining small enough for targeted context injection. This is internal developer infrastructure, not a user-facing software product, but it demonstrates prompt/system design, repository conventions, automated validation, and the operational discipline required to make agent-assisted engineering reproducible.

## Technologies used

- **Content:** Markdown, YAML-style metadata, reusable instruction and reference files.
- **Automation:** shell and repository validation scripts.
- **Delivery:** Git, GitHub Actions, directory-based skill discovery.
- **Engineering concepts:** progressive context loading, tool routing, safety constraints, verification gates.

## Engineering evidence

The repository demonstrates treating agent instructions as maintained software artifacts with reviewable contracts, tests, documentation, and controlled context boundaries.
