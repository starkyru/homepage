---
title: canvas-editor
aliases: [Overtone Canvas Editor, canvas editor]
category: internal library platform
status: technically mature; redesign required before public product launch
card: Pluggable canvas editor built on Fabric.js: layers, undo/redo, crop, snapping, pattern tiling, product-mockup preview, and PNG/SVG/JSON export. Framework-agnostic core plus a React binding. Published on npm under @overtone-art; powers the Overtone.art design tools.
tools: TypeScript, Fabric.js, React, tsup, AWS S3 adapter, Turbo, Vitest
private: true
source_scope: local monorepo
last_verified: 2026-08-13
---

# canvas-editor

canvas-editor is a pluggable, framework-neutral graphics engine extracted from Overtone's design tooling. I built a Fabric.js core for layers, selection, snapping, crop, pattern tiling, undo/redo, product-mockup previews, typography, shape editing, and JSON/SVG/PNG/PDF workflows; separate packages provide React bindings, shapes, templates, PSD/archive formats, S3 and Unsplash adapters, background removal, and a Next.js demonstration application. The package architecture keeps document behavior independent of React and makes optional integrations installable without bloating the core. It is currently an internal tool whose utilitarian interface was appropriate for production support; its engineering foundation is reusable, but a deliberate UX and visual redesign is required before presenting it as a public standalone product.

## Technologies used

- **Core graphics:** TypeScript, Fabric.js, Nano ID, JSDOM.
- **Documents and fonts:** Sharp, fontkit, opentype.js, PDFKit, pdf-lib, svg-to-pdfkit, ag-psd, fflate.
- **Framework and applications:** React, Next.js, Vite.
- **Adapters:** AWS S3 SDK, Unsplash integration boundary.
- **Local image ML:** Hugging Face Transformers and WebGPU background removal.
- **Packaging and quality:** Turborepo, tsup, Vitest, React Testing Library, Playwright, axe-core, ESLint, Prettier.

## Engineering evidence

canvas-editor demonstrates plugin boundaries, nontrivial graphical state, document conversion, local image processing, browser/server compatibility, and reuse inside production commerce workflows.
