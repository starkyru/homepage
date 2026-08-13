---
title: learn-ai
aliases: [AI curriculum, learn AI]
category: learning system
status: active curriculum
card: A hands-on, project-based curriculum that goes from LLM fundamentals to production RAG and agents — in both TypeScript and Python. 24 numbered modules plus deep-dive companions, each runnable code you build, break, and extend across three depth lanes: use the ecosystem, hand-implement one core piece, or build the machinery from scratch (BPE tokenizer, attention head, vector index, ReAct loop).
tools: TypeScript + Python monorepo (pnpm, uv), Jest, Anthropic / OpenAI / NVIDIA NIM providers, Chroma/Qdrant, LangGraph, MCP
repo: learn-ai
source_scope: homepage catalog and local course monorepo
last_verified: 2026-08-13
---

# learn-ai

learn-ai is a hands-on TypeScript and Python curriculum I built to study modern AI systems by implementing them at several depths: use the ecosystem, hand-build one important layer, and reconstruct core machinery from first principles. Its modules move from tokenization, probability, machine learning, neural networks, transformers, prompting, embeddings, and vector search through RAG, LangGraph agents, memory, classification, vision, image generation, document ingestion, text-to-SQL, fine-tuning, alignment, local inference, reasoning, context engineering, MCP, computer use, audio, security, governance, evaluation, operations, product UX, and a capstone. Runnable exercises include BPE tokenizers, attention heads, vector indexes, and ReAct loops, making the repository both a course and a large comparative test bed.

## Technologies used

- **Languages and tooling:** TypeScript, Python, pnpm, uv, tsx, NumPy, Pydantic, httpx.
- **LLM providers:** Anthropic, OpenAI and NVIDIA-compatible APIs; local inference paths.
- **Agents and protocols:** LangGraph, agent-framework comparisons, MCP, ReAct patterns and computer use.
- **Retrieval and data:** embeddings, Chroma, Qdrant, custom vector indexes, document pipelines and text-to-SQL.
- **Multimodal:** computer vision, image generation, audio and speech.
- **Quality:** Jest, SWC, Python tests, typed runnable modules and capstone validation.

## Engineering evidence

The curriculum demonstrates breadth across the AI stack and depth through from-scratch implementations, provider comparisons, production concerns, security, evaluation, and complete applied systems.
