---
title: WallSnap
aliases: [wallsnap, Wall Snap]
category: product and library
status: preparing store submission
public_url: https://wallsnap.app
beta: true
card: Preview a print on your actual wall, at the right size. It started as one feature inside Overtone; I pulled the geometry out into a framework-neutral core so the browser preview and the server-rendered image agree pixel for pixel. Ships as a library, an embeddable widget, an API, and a Shopify app. Refreshing the room catalog before I submit it to the Shopify App Store.
tools: TypeScript, React, Preact, Vite, Sharp, Hono, Zod, Shopify App Bridge, Prisma, Turborepo, Vitest, Playwright
source_scope: public library and hosted service repositories
last_verified: 2026-08-13
---

# WallSnap

WallSnap lets a shopper preview artwork at accurate scale inside curated or user-supplied room photography. I extracted the geometry from a gallery feature into a framework-neutral TypeScript core, React components, a typed scene library, browser demo, deterministic server compositor, embeddable widget, API, administration surface, and Shopify application. One geometry model drives browser placement and server-rendered output so dragging, frames, occlusion, and export remain consistent; room scenes carry their own real-world measurements, and custom room photos can be calibrated without sending the image through a share URL. The product combines reusable package design with responsive interaction, accessibility, image compositing, cloud storage, and commerce-platform integration. The room catalog is being refreshed before the Shopify App Store submission.

## Technologies used

- **Libraries and UI:** TypeScript, React, Preact, Vite, Tailwind CSS, framework-neutral geometry, responsive pointer/touch/keyboard interactions.
- **Rendering and media:** Sharp, SVG frame generation, PNG export, server-side compositing, typed room-scene manifests.
- **Hosted system:** Hono, Node.js, Zod, AWS S3-compatible storage, concurrency limiting.
- **Shopify:** Shopify CLI, App Bridge, React Router, Prisma session storage, GraphQL code generation.
- **Tooling and quality:** Turborepo, pnpm, Vitest, React Testing Library, jsdom, Playwright, Changesets, GitHub Actions.

## Engineering evidence

WallSnap demonstrates extracting a product-quality subsystem from a larger application, preserving one mathematical model across renderers, and delivering it through libraries, widgets, APIs, administration, and Shopify.
