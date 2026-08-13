---
title: Overtone.art
aliases: [Overtone, my-gallery, Gallery, Mood, Overtone Mood, Mood by Overtone]
category: product
status: operated
public_url: https://overtone.art
card: Photography gallery and storefront I built and operate end-to-end. A Turbo monorepo: NestJS API, Next.js web, React Native mobile app, MCP server, and a Storybook component library. Stripe payments, automated print fulfillment via my own Printify/Prodigi SDKs, an in-browser design editor (canvas-editor), and a two-stage LLM pipeline that drafts artwork descriptions.
tools: Turbo monorepo, NestJS, Next.js 15, React 19, React Native, Stripe, Anthropic SDK, Storybook, Fabric.js, PostgreSQL, Redis
source_scope: local monorepo
last_verified: 2026-08-13
---

# Overtone.art

Overtone.art is a photography gallery and commerce platform that I designed, built, and operate end to end. Its TypeScript monorepo contains a NestJS REST API, Next.js storefront and account surfaces, React Native mobile client, Storybook component system, MCP server, and shared domain types. The platform handles catalog administration, original and print sales, authentication, media upload and transformation, shipping estimates, transactional communication, payments, and automated print-on-demand fulfillment through reusable provider integrations. A second product surface, Mood, runs on the same API and commerce types: it browses mood- and category-based designs, generates personalized artwork through asynchronous jobs, applies variants to physical products, and checks out from its own Next.js storefront and React Native client, with credits, in-app purchases, saved designs, deep links, and image-safety controls; it is being finished before Overtone advertising begins, so its scope here implies no public adoption. Browser design tools use the separate canvas-editor packages, while image metadata, descriptions, and presentation are supported by AI and media-processing pipelines. This project demonstrates full-stack ownership across frontend architecture, backend services, data modeling, security boundaries, third-party APIs, native mobile development, deployment, and production operations.

## Technologies used

- **Languages and architecture:** TypeScript, Node.js, Turborepo, pnpm workspaces, shared packages, REST, MCP.
- **Web and mobile:** Next.js 15, React 19, React Native, React Navigation, Tailwind CSS, Storybook, Zustand, DnD Kit, GSAP, Three.js, Lenis, Embla.
- **Backend and data:** NestJS, Express, TypeORM, PostgreSQL, Redis, RxJS, Passport/JWT, scheduled jobs and throttling.
- **Commerce and communication:** Stripe, EasyPost, Printify, Prodigi, Twilio, Nodemailer.
- **Media and AI:** Fabric.js, Sharp, Canvas, BlurHash, EXIF parsing, Anthropic SDK, Zod, image-generation provider adapters, image moderation, watermarks, print-resolution outputs.
- **Mood surface:** Redux Toolkit, React Redux, Redux Saga, redux-api-middleware, Redux Persist, AsyncStorage, Keychain, Reanimated, native IAP, image picker, permissions, in-app browser and deep links, Sonner, HEIC conversion.
- **Quality:** Jest, ts-jest, jsdom, ESLint, Prettier, GitHub Actions.

## Engineering evidence

The system joins several user-facing applications to one typed commerce domain and includes custom SDKs, reusable UI/editor packages, mobile clients, operational automation, and production-safe provider configuration. Mood shows product reuse without duplicating the platform: two further clients share typed commerce, identity, fulfillment, and AI workflows while keeping their own state and purchase behavior.
