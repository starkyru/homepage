---
title: Agent Signals
aliases: [agent-signals]
category: internal agent infrastructure
status: active
card: Tells me when an agent is done. Producers publish a typed signal over MCP or plain HTTP, the broker fans it out over Server-Sent Events, and a SwiftUI menu-bar app on my Mac shows it. Deliberately small — one Zod schema as the cross-language contract, scoped tokens, SQLite. Not a messaging product; plumbing I use every day.
tools: TypeScript, Next.js, MCP, Server-Sent Events, Zod, SQLite, Swift/SwiftUI, Vitest
private: true
source_scope: local repository
last_verified: 2026-08-13
---

# Agent Signals

Agent Signals is a small notification system for AI-agent workflows: producers emit a typed signal when a long-running session finishes, needs attention, or finds something useful; a broker validates and fans it out; native clients display the result. I built the broker as a Next.js service with both MCP and ordinary HTTP publishing paths, Server-Sent Events for live subscribers, scoped per-client authentication, SQLite persistence for token metadata, Claude Code hook integration, and a SwiftUI macOS menu-bar consumer, with mobile push support represented as a separate adapter. A shared Zod schema defines the cross-language contract and treats titles, links, and bodies as untrusted content. The system is intentionally small infrastructure rather than a general messaging product.

## Technologies used

- **Broker:** TypeScript, Next.js, React, Node.js, Server-Sent Events.
- **Agent integration:** MCP handler/streamable HTTP and shell hook producers.
- **Contracts and data:** Zod, SQLite/better-sqlite3, scoped bearer-token model.
- **Authentication:** NextAuth-compatible server patterns and OAuth connector flow.
- **Native client:** Swift and SwiftUI macOS menu-bar application; APNs adapter boundary.
- **Delivery and quality:** PM2/Docker deployment options, nginx/Caddy, Vitest, GitHub Actions.

## Engineering evidence

Agent Signals demonstrates cross-language contracts, minimal event-broker design, realtime delivery, native integration, auth scoping, and pragmatic plumbing around agent lifecycle events.
