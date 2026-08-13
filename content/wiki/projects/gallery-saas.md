---
title: Gallery SaaS
aliases: [Gallery, gallery-saas]
category: product platform
status: pre-launch
card: Overtone's architecture, generalized: a multi-tenant gallery and print storefront another photographer could run. NestJS API, tenant storefront, customer account app, operator panel, marketing site, and shared packages for catalog, money, and identity. Payment and fulfillment providers sit behind plug-in boundaries — drawing that line properly is most of why it was worth rebuilding.
tools: NestJS, TypeORM, PostgreSQL, Next.js 15, React 19, Tailwind CSS, Stripe, Prodigi, EasyPost, AWS S3, Sharp, Three.js, Turborepo
private: true
source_scope: local monorepo
last_verified: 2026-08-13
---

# Gallery SaaS

Gallery SaaS generalizes the architecture behind Overtone into a multi-tenant photography gallery and storefront platform. I built a NestJS API, tenant storefront, customer account application, operator control panel, marketing site, Storybook system, and shared TypeScript packages for catalog, money, identity, and presentation. The backend supports authenticated administration, image/media processing, object storage, configurable payment and print-fulfillment providers, shipping, notifications, limited-edition inventory, and secure service configuration; the frontend provides tenant theming, gallery browsing, commerce, account workflows, and animated media-rich presentation. The project demonstrates turning a bespoke production application into a configurable platform while preserving clean provider boundaries and separating tenant, customer, and operator concerns.

## Technologies used

- **Architecture:** TypeScript, Turborepo, pnpm workspaces, shared domain/UI packages.
- **Backend:** NestJS, Express, TypeORM, PostgreSQL, Passport/JWT, RxJS, scheduling, throttling.
- **Frontend:** Next.js 15, React 19, Tailwind CSS, Zustand, DnD Kit, GSAP, Three.js, Lenis, Embla, Storybook.
- **Storage, media, commerce:** AWS S3 SDK, Sharp, Canvas, BlurHash, EXIF parsing, Stripe, EasyPost, Prodigi, Twilio, Nodemailer.
- **Quality:** Jest, ts-jest, Playwright, React/DOM testing, ESLint, Prettier, GitHub Actions.

## Engineering evidence

Gallery SaaS shows multi-application monorepo architecture, tenant-aware product design, provider plugins, complex media commerce, shared-component systems, and separation of public storefront, account, marketing, and operator surfaces.
