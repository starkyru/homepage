---
title: ripple-text
aliases: [Ripple Text]
category: library
status: published
card: Physics-driven text animation engine — characters react to mouse/touch via ripple waves and field effects (water caustics). Plain TypeScript rather than a component, so the page keeps its own layout and styling. It is what the headline on this site runs on.
tools: TypeScript, Vite
repo: ripple-text
source_scope: public repository
last_verified: 2026-08-13
---

# ripple-text

ripple-text is a lightweight physics-driven text animation engine in which individual characters respond to pointer or touch input through propagating ripples and field effects such as water-like caustics. I built the animation as reusable TypeScript rather than coupling it to a component framework, allowing the portfolio homepage and other interfaces to apply the effect to ordinary text while retaining control over layout and styling. The implementation focuses on per-character transforms, input normalization, animation timing, configurable field behavior, and browser performance. It is a small visual library and design experiment rather than an application, but it demonstrates custom interaction work below the level of common animation-component abstractions.

## Technologies used

- **Core:** TypeScript, browser DOM, pointer/touch events, requestAnimationFrame and CSS transforms.
- **Build and demo:** Vite.
- **Quality and formatting:** TypeScript, ESLint, Prettier, Husky and lint-staged.

## Engineering evidence

The library demonstrates custom motion behavior, framework-independent browser code, reusable effect APIs, and attention to interaction performance.
