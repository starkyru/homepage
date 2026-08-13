---
title: Portfolio Homepage
aliases: [homepage, ilia.to, portfolio]
category: public website
status: live
card: This site — and the part I am building right now is the chat. Ask whether I have done something and it answers out of this project wiki rather than out of thin air: pages are picked by exact name and technology matching, with no embedding index and no vector store; they reach the model as reference material the visitor's question never joins; and the ones it used are listed under the answer, so a claim can be checked against the page behind it. Around that: Next.js App Router, a hanging chain of cards on a real Box2D solver, and a resume parsed straight out of a Google Doc. The chain survives the trip to this page — same simulation, it just slides out of the way.
tools: Next.js, React 19, TypeScript, Anthropic SDK, Planck.js, Tailwind CSS, next-sitemap, Jest
source_scope: local repository
last_verified: 2026-08-13
---

# Portfolio Homepage

The homepage is my public engineering portfolio and an interactive demonstration of frontend craft. I built it with the Next.js App Router around structured resume and project data, accessible server-rendered pages, JSON-LD, sitemap/SEO support, a physics-driven hanging-chain identity, responsive desktop/mobile scene models, and a grounded LLM chat for recruiter and technical questions. The animation system uses a Box2D-style physics model while preserving reduced-motion and non-animated fallbacks; the projects page reuses the same persistent shell so transitions do not discard the visual state. The assistant treats resume data and this public-safe project wiki as trusted reference material while visitor text remains untrusted, allowing job-fit and technology questions without inventing experience.

## Technologies used

- **Application:** TypeScript, Next.js, React, App Router.
- **Design:** Tailwind CSS, custom CSS, SVG, responsive layouts, accessible reduced-motion paths.
- **Physics and animation:** Planck.js, custom constraint/scene code, ripple-text.
- **Content and discovery:** structured JSON data, JSON-LD, Open Graph images, next-sitemap, `llms.txt`.
- **Assistant:** server-side LLM API route with grounded portfolio context.
- **Quality:** Jest, React Testing Library, jsdom, ESLint, Prettier, GitHub Actions.

## Engineering evidence

The site demonstrates performance-conscious interactive frontend work, custom physics, accessibility, SEO/structured data, trustworthy LLM grounding, and a content model designed for both humans and machines.
