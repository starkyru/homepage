---
title: Spendgate
aliases: [agent-cost-governor, Agent Cost Governor]
category: developer library
status: pre-alpha
card: Token and dollar budgets enforced inside LangGraph rather than at a proxy, so spend can be attributed at node, subgraph, run, session, and user scope. A breach interrupts the graph at a checkpoint instead of throwing the run away — raise the cap and resume, or abandon it cleanly. Pre-alpha: the accounting works, the hardening does not yet.
tools: Python, LangGraph, LangChain Core, OpenTelemetry, PostgreSQL/DynamoDB stores, pytest, mypy, Ruff, uv
private: true
source_scope: local Python repository
last_verified: 2026-08-13
---

# Spendgate

Spendgate is a Python library for enforcing token and monetary budgets inside LangGraph rather than only at an API proxy. I built typed decorators and a governor that can attribute and cap spend at node, subgraph, run, session, and user scopes, with idempotent counters and a checkpoint-aware breach path that interrupts the graph instead of discarding state. The design allows a reviewer to resume, change a cap, or abandon work cleanly and leaves room for pre-run forecasts, warning thresholds, model degradation policies, and telemetry export. The project is deliberately pre-alpha and should be described as implemented cost-governance infrastructure under hardening, not as a finished hosted service.

## Technologies used

- **Language and runtime:** Python 3.11+, uv packaging and environments.
- **Agent framework:** LangGraph 1.x, LangChain Core, interrupt/resume and checkpointer primitives.
- **Configuration and policy:** typed Python, YAML policy files.
- **Storage design:** in-memory counters with PostgreSQL and DynamoDB-compatible atomic-store abstractions.
- **Observability design:** OpenTelemetry metrics and spans.
- **Quality:** pytest, mypy strict typing, Ruff, deterministic integration tests, GitHub Actions.

## Engineering evidence

Spendgate demonstrates stateful-agent middleware, hierarchical accounting, durable idempotency, graceful control flow, Python packaging, and a design informed by FinOps and observability boundaries.
