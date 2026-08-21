# Scoring and verifying chat answers

**Date:** 2026-08-21
**Status:** Approved, not yet implemented

## Problem

The portfolio chat (`src/app/api/chat/`) has no test coverage above the
retrieval layer. `src/lib/__tests__/wiki-retrieval.test.ts` proves that
`selectProjects` picks the right pages, and nothing proves that the route sends
them correctly, that the guards hold, or that the answers are grounded in what
was sent.

`route.ts` also has no seam: the OpenAI call is inline in the request handler,
so nothing can exercise the answer path without an HTTP request.

## Scope

Two tiers, decided together:

- **Deterministic tier** — Jest tests, run in CI, no API key, no cost.
- **Live-eval tier** — a live eval suite (`pnpm eval`) run by hand against the real
  model, scored by deterministic assertions plus an LLM judge.

Deliberately excluded:

- **Recorded answer fixtures.** A committed answer goes stale the moment the
  prompt or the corpus changes, and a stale fixture that still passes is a false
  green — worse than no test.
- **Promptfoo / hosted eval platforms.** Would replace the live-eval tier with less code,
  at the cost of a devDep, a second config language, and an abstraction between
  the eval and `referenceFor`. Reconsider if the case set outgrows hand-rolling.

## 1. Seam extraction

New file `src/app/api/chat/answer.ts` with two exports:

```ts
type Screened =
  | { ok: true; message: string }
  | { ok: false; status: number; error: string };

export function screen(message: unknown): Screened;
export function answerQuestion(message: string): Promise<{
  answer: string;
  sources: Reference['citations'];
}>;
```

- `screen` holds the trim, the `MAX_MESSAGE_LENGTH` bound and the
  `INJECTION_PATTERN` check. Pure, no network, no env.
- `answerQuestion` holds `referenceFor`, the `fetch` to the Responses API and
  `getResponseText`. Throws a typed error on a non-ok response or a response
  carrying no text.

`route.ts` keeps HTTP concerns only, in the existing order: env check → rate
limit → body parse → `screen` → `answerQuestion` → status mapping. It drops from
152 to roughly 90 lines. Rate limiting stays in the route: the key is an IP
header, which is an HTTP concern.

This is a **behaviour-preserving move**. Same checks, same order, same status
codes, same request body to OpenAI, same `store: false`, same 25s timeout.

Why the split matters: the eval composes `screen` + `answerQuestion`, so
adversarial cases hit the real injection guard instead of bypassing it, and no
test reimplements logic it claims to verify.

## 2. Deterministic tier

### Retrieval goldens

`src/lib/__tests__/fixtures/retrieval-goldens.ts` — roughly 30 hand-labeled
cases:

```ts
interface GoldenCase {
  question: string;
  mode: 'top1' | 'contains' | 'exactSet' | 'empty';
  expected: string[]; // slugs
}
```

`src/lib/__tests__/retrieval-goldens.test.ts` asserts each case in its mode, and
asserts two aggregates over the whole set:

- **recall@3** — the share of cases whose expected slugs appear in the returned
  three. Threshold set from the measured value at implementation time, rounded
  down to a round number, so the test fails on regression rather than on noise.
- **MRR** — mean reciprocal rank of the first expected slug. Same threshold
  rule.

Aggregates catch what per-case assertions miss: a wiki edit that quietly
degrades ten questions without breaking any single named expectation.

Every expectation is written by hand. None is produced by calling
`selectProjects` — a golden derived from the code under test passes by
construction.

### Route and guard tests

| File                                        | Covers                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/chat/__tests__/screen.test.ts` | Length bounds (at, over), trimming, each injection pattern branch, and benign lookalikes that must **not** trip it                                                                                                                                                                                                                              |
| `src/app/api/chat/__tests__/answer.test.ts` | `fetch` mocked at the boundary: model read from `OPENAI_MODEL` with the documented default, three input messages in order, question wrapped in `<untrusted_visitor_question>`, `store: false`, `max_output_tokens: 700`, an abort signal present; both `output_text` and `output[].content[].text` parsed; non-ok and text-less responses throw |
| `src/app/api/chat/__tests__/route.test.ts`  | 503 with no key · 429 past `RATE_LIMIT` and recovery after the window (fake timers) · 400 on unparseable JSON, oversize message, injection · 200 body carries `answer` and `sources`                                                                                                                                                            |

The false-positive cases in `screen.test.ts` matter as much as the true
positives: `INJECTION_PATTERN` is broad, and a visitor asking "which projects
override the default config?" must not be turned away.

`fetch` is the only thing mocked — it is a true external boundary. Nothing mocks
`referenceFor`, `selectProjects` or `screen`.

## 3. Live-eval tier — `pnpm eval`

### Harness

A second Jest config rather than a new runner: `jest.eval.config.js` with
`testEnvironment: 'node'` and `testMatch: ['<rootDir>/eval/**/*.eval.ts']`. The
default config adds `eval/` to `testPathIgnorePatterns`, so `pnpm test` never
picks it up. `pnpm eval` runs `jest -c jest.eval.config.js`.

`next/jest` supplies TypeScript, the `@/` aliases and `.env` loading. No new
dependency.

### Cases

`eval/cases/*.ts`, one file per group, roughly 40 cases total: resume (8),
projects (10), technologies (6), job-fit (4), adversarial (8), out-of-scope (4).

```ts
interface EvalCase {
  id: string;
  question: string;
  expect: {
    citations?: string[]; // slugs that must be cited
    contains?: (string | RegExp)[];
    absent?: (string | RegExp)[];
    blocked?: true; // screen must reject before any model call
    refuses?: true; // answer must decline or state the gap
  };
  rubric?: string[]; // extra judge instructions for this case
}
```

Adversarial cases cover: injection phrased around the regex, role-change
jailbreaks, prompt extraction, hallucination bait naming a technology the wiki
does not carry, and questions inviting commercial claims the wiki explicitly
does not support (revenue, users, adoption).

### Scoring

Per case, two signals:

- **Deterministic — weight 0.6.** Expected citations are a subset of those
  returned; `contains` / `absent` patterns; `blocked` cases must be rejected by
  `screen` before any model call; `refuses` cases must decline or name the gap.
- **Judge — weight 0.4.** One OpenAI call per case, returning strict JSON on
  four axes: `grounded`, `citesPages`, `admitsGaps`, `noInvention`. The model is
  `EVAL_JUDGE_MODEL`, defaulting to `gpt-5.6-terra` — a far stronger model than
  the `gpt-4.1-mini` that answers, on the same `OPENAI_API_KEY` and the same
  Responses API endpoint. No second client, no second key.
  - The judge runs at `temperature: 0` where the model accepts it: unlike the
    answerer, it is a measuring instrument, not the system under test, so
    pinning its sampling is what makes a score comparable between runs. If
    `gpt-5.6-terra` rejects the parameter, drop it rather than fall back to a
    weaker judge — the strict JSON schema and `--repeat` already bound the
    variance, and a first implementation step should confirm which it is.

The judge is handed the question, **the retrieved page text that was actually
sent**, and the answer. It scores entailment against that evidence, not against
its own knowledge. This is what keeps a same-vendor judge honest: it is asked
whether a claim appears in supplied text, not whether the claim sounds right. A
judge invited to answer from memory would reward phrasing it recognises and
share its blind spots.

Suite gate: mean score at or above threshold **and** zero adversarial failures.
Adversarial is pass/fail — no partial credit, one leak is a failing suite.

### Output and cost

- `eval/reports/latest.md` (gitignored) plus a stdout summary table: per-case
  score, per-group mean, suite mean, list of failures.
- Knobs are environment variables, not flags — Jest rejects unknown CLI
  options: `EVAL_ONLY` (comma-separated groups), `EVAL_REPEAT` (run each case N
  times and keep the worst), `EVAL_MIN_SCORE`, `EVAL_CONCURRENCY`,
  `EVAL_JUDGE_MODEL`.
- Concurrency capped at 4 to stay inside the rate limit.
- Full run is roughly 80 API calls — 40 answers on `gpt-4.1-mini` plus 40
  judgements on `gpt-5.6-terra`. The judge is the expensive half; `--only`
  exists so a targeted change costs a fraction of a full sweep.

`answerQuestion` is called with production parameters untouched. No
`temperature: 0` override: an eval that pins sampling grades a system that is
not the one being shipped. Variance is handled by `--repeat`, not by changing
the subject under test.

## 4. CI and documentation

- The deterministic tier joins the existing `pnpm test` step in `.github/workflows/lint.yml`
  automatically. No workflow change needed.
- The live-eval tier stays out of CI: it needs a key CI does not hold, and it costs money
  per run. It is run by hand before shipping a change to `prompt.ts`,
  `retrieval.ts`, or the wiki corpus.
- `README.md` gains a `pnpm eval` section covering the key, the flags and how to
  read the report.
- `MEMORY.md` records the two decisions worth carrying forward: why the judge is
  same-family and constrained to entailment, and why the eval is deliberately
  outside CI.

## File budgets

Every new file stays under 250 lines. The case set is split by group for that
reason, and the retrieval goldens sit in a fixture file separate from the test
that scores them.
