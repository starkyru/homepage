/**
 * Hand-labeled retrieval cases.
 *
 * Every expectation here was read off `content/wiki`, not produced by running
 * `selectProjects` — a golden derived from the code under test passes by
 * construction and catches nothing.
 *
 * Questions deliberately avoid category words ("product", "library", "tool",
 * "experiment"): a category hit is worth enough to elect a page on its own, so
 * one in a technology question would be testing the wrong thing.
 */

export type GoldenMode =
  /** `expected[0]` must be the highest-ranked page. */
  | 'top1'
  /** Every slug in `expected` must appear in the returned pages. */
  | 'contains'
  /** The returned pages must be exactly `expected`, in any order. */
  | 'exactSet'
  /** Nothing may be retrieved. */
  | 'empty';

export interface GoldenCase {
  question: string;
  mode: GoldenMode;
  expected: string[];
  /**
   * Set when retrieval is known to get this wrong today. The case still states
   * the correct answer and still counts against the aggregate scores; it is run
   * with `it.failing`, so fixing the cause turns the suite red and the gap has
   * to be closed here too. See KNOWN GAPS at the foot of this file.
   */
  knownGap?: string;
}

/** A question naming one project must put that project first. */
const NAMED: GoldenCase[] = [
  { question: 'What is AngleForge?', mode: 'top1', expected: ['angleforge'] },
  {
    question: 'How does Countersign pause a run for a human?',
    mode: 'top1',
    expected: ['countersign'],
  },
  {
    question: 'What does Spendgate do?',
    mode: 'top1',
    expected: ['spendgate'],
  },
  { question: 'Explain the BTW agent', mode: 'top1', expected: ['btw'] },
  {
    question: 'How is WallSnap put together?',
    mode: 'top1',
    expected: ['wallsnap'],
  },
  { question: 'What is mcpmake?', mode: 'top1', expected: ['mcpmake'] },
  { question: 'Tell me about Timerail', mode: 'top1', expected: ['timerail'] },
  {
    question: 'What is stream-schema?',
    mode: 'top1',
    expected: ['stream-schema'],
  },
  { question: 'What is Store AI?', mode: 'top1', expected: ['store-ai'] },
  {
    question: 'How does zustand-sagas work?',
    mode: 'top1',
    expected: ['zustand-sagas'],
  },
  {
    question: 'What is the Frontend Debugger?',
    mode: 'top1',
    expected: ['frontend-debugger'],
  },
  {
    question: 'What is Agent Signals?',
    mode: 'top1',
    expected: ['agent-signals'],
  },
  { question: 'What is vue-sagas?', mode: 'top1', expected: ['vue-sagas'] },
  { question: 'What is ripple-text?', mode: 'top1', expected: ['ripple-text'] },
  {
    question: 'What is printify-sdk?',
    mode: 'top1',
    expected: ['printify-sdk'],
  },
  { question: 'What is learn-ai?', mode: 'top1', expected: ['learn-ai'] },
];

/** A name reached by an alias rather than by the title in the front matter. */
const ALIASED: GoldenCase[] = [
  {
    question: 'How does the Prodigi SDK work?',
    mode: 'top1',
    expected: ['prodigi-print-api'],
  },
  {
    question: 'What is the Overtone canvas editor?',
    mode: 'top1',
    expected: ['canvas-editor'],
  },
  {
    question: 'Tell me about ilia.to',
    mode: 'top1',
    expected: ['homepage'],
  },
  // "Gallery" is an alias of both pages. The one whose title is spelled out wins.
  {
    question: 'Tell me about the Gallery SaaS',
    mode: 'top1',
    expected: ['gallery-saas'],
  },
];

/** A technology carried by one or two pages must return those and no others. */
const TECHNOLOGY: GoldenCase[] = [
  {
    question: 'Where is Planck.js used?',
    mode: 'exactSet',
    expected: ['homepage'],
  },
  {
    question: 'Which one uses Pinia?',
    mode: 'exactSet',
    expected: ['vue-sagas'],
  },
  {
    question: 'Anything built on rrweb?',
    mode: 'exactSet',
    expected: ['frontend-debugger'],
  },
  { question: 'Anything using Chokidar?', mode: 'exactSet', expected: ['btw'] },
  {
    question: 'Which codebases use Drizzle ORM?',
    mode: 'exactSet',
    expected: ['angleforge'],
    knownGap: 'compound entry — angleforge lists "Drizzle ORM/Kit"',
  },
  {
    question: 'Where is Better Auth used?',
    mode: 'exactSet',
    expected: ['angleforge'],
  },
  {
    question: 'Where is OpenTelemetry used?',
    mode: 'exactSet',
    expected: ['spendgate'],
    knownGap:
      'compound entry — spendgate lists "OpenTelemetry metrics and spans"',
  },
  {
    question: 'Which one renders with PDFKit?',
    mode: 'exactSet',
    expected: ['canvas-editor'],
  },
  {
    question: 'Where is SolidJS used?',
    mode: 'exactSet',
    expected: ['store-ai'],
  },
  {
    question: 'Which ones use Preact?',
    mode: 'exactSet',
    expected: ['store-ai', 'wallsnap'],
    knownGap:
      'compound entry — store-ai lists "Preact and Lit ReactiveElement"',
  },
  {
    question: 'Where has Ilia used Handlebars?',
    mode: 'exactSet',
    expected: ['mcpmake'],
  },
  // Three pages list LangGraph and the page budget is three.
  {
    question: 'Where is LangGraph used?',
    mode: 'contains',
    expected: ['countersign', 'spendgate', 'learn-ai'],
  },
  {
    question: 'Which ones run pytest?',
    mode: 'contains',
    expected: ['countersign', 'spendgate'],
  },
  {
    question: 'Which ones ship an Electron app?',
    mode: 'contains',
    expected: ['btw', 'frontend-debugger'],
  },
];

/** Nothing in the corpus answers these, and a guess would be worse than a gap. */
const UNCOVERED: GoldenCase[] = [
  { question: 'What is the capital of Norway?', mode: 'empty', expected: [] },
  { question: 'Write me a poem about autumn', mode: 'empty', expected: [] },
  {
    question: 'What time does the London office open?',
    mode: 'empty',
    expected: [],
    knownGap: 'a bare category word elects a page — "open" is in Countersign’s',
  },
];

export const RETRIEVAL_GOLDENS: GoldenCase[] = [
  ...NAMED,
  ...ALIASED,
  ...TECHNOLOGY,
  ...UNCOVERED,
];

/**
 * KNOWN GAPS — two causes, both in the corpus-to-retrieval seam.
 *
 * 1. **Compound technology entries.** `mentions()` matches a technology as a
 *    whole phrase, so a page listing "Drizzle ORM/Kit", "Preact and Lit
 *    ReactiveElement" or "OpenTelemetry metrics and spans" is unreachable by
 *    the technology a visitor would actually name. The bullets in
 *    `content/wiki` are written as prose; the fix belongs either in
 *    `scripts/build-wiki.mjs` (split an entry on `/` and ` and `) or in those
 *    bullets. Every page with a prose-shaped bullet has this hole.
 *
 * 2. **A category hit elects a page on its own.** `WEIGHT.category` is 10 and
 *    `MIN_SCORE` is 10, so one ordinary English word inside a category string
 *    is enough: "open" reaches Countersign's "open-source library and hosted
 *    product". Body overlap is capped below MIN_SCORE precisely so it can only
 *    rank, never elect — category was not given the same treatment.
 */
