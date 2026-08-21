import {
  GoldenCase,
  RETRIEVAL_GOLDENS,
} from '@/lib/__fixtures__/retrieval-goldens';
import { selectProjects } from '@/lib/wiki/retrieval';

/**
 * Two layers over the same labeled set.
 *
 * Per-case assertions name a behaviour and fail loudly when it breaks. The
 * aggregates catch what they cannot: a wiki edit that degrades ten questions a
 * little without breaking any single named expectation.
 */

const slugsFor = (question: string) =>
  selectProjects(question).map((scored) => scored.project.slug);

/** Share of a case's expected pages that were actually returned. */
function recall(expected: string[], returned: string[]): number {
  const hits = expected.filter((slug) => returned.includes(slug)).length;
  return hits / expected.length;
}

/** Reciprocal rank of the first expected page, 0 when none was returned. */
function reciprocalRank(expected: string[], returned: string[]): number {
  const rank = returned.findIndex((slug) => expected.includes(slug));
  return rank === -1 ? 0 : 1 / (rank + 1);
}

const scored = RETRIEVAL_GOLDENS.filter((golden) => golden.mode !== 'empty');
const uncovered = RETRIEVAL_GOLDENS.filter((golden) => golden.mode === 'empty');

const mean = (values: number[]) =>
  values.reduce((total, value) => total + value, 0) / values.length;

function assertCase({ question, mode, expected }: GoldenCase) {
  const returned = slugsFor(question);

  if (mode === 'empty') return expect(returned).toEqual([]);
  if (mode === 'top1') return expect(returned[0]).toBe(expected[0]);
  if (mode === 'exactSet')
    return expect([...returned].sort()).toEqual([...expected].sort());

  return expect(returned).toEqual(expect.arrayContaining(expected));
}

describe('retrieval goldens', () => {
  for (const golden of RETRIEVAL_GOLDENS) {
    // A known gap runs under `it.failing`: it stays red-if-fixed, so closing
    // the cause forces the note in the fixture to be removed with it.
    const run = golden.knownGap ? it.failing : it;
    run(golden.question, () => {
      assertCase(golden);
    });
  }
});

describe('retrieval quality over the whole set', () => {
  const recalls = scored.map((golden) =>
    recall(golden.expected, slugsFor(golden.question)),
  );
  const ranks = scored.map((golden) =>
    reciprocalRank(golden.expected, slugsFor(golden.question)),
  );

  // Measured 2026-08-21 over 34 scored cases: recall@3 0.9265, MRR 0.9412.
  // Both are held down by the known gaps in the fixture. The floors sit about
  // one case below, so a real regression trips them and a reworded page does
  // not. Raise them when a gap is closed.
  it('keeps mean recall@3 above the floor', () => {
    expect(mean(recalls)).toBeGreaterThanOrEqual(0.9);
  });

  it('keeps mean reciprocal rank above the floor', () => {
    expect(mean(ranks)).toBeGreaterThanOrEqual(0.9);
  });

  // Precision, stated as a count: a page returned for an uncovered question is
  // a page the model may then cite.
  it('retrieves almost nothing for questions the wiki does not cover', () => {
    const stray = uncovered.flatMap((golden) => slugsFor(golden.question));
    expect(stray.length).toBeLessThanOrEqual(1);
  });
});
