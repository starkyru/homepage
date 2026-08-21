import { selectedGroups } from './cases';
import { mean, summarise, writeReport } from './lib/report';
import { pool, runCase } from './lib/run-case';
import type { CaseResult } from './types';

/**
 * Live evaluation. Every case goes through the real screen, the real
 * retrieval and a real model call, then through a judge that grades the answer
 * against the evidence it was given.
 *
 * Deterministic checks are pass/fail per case. The judge's four axes only move
 * the suite score, because a graded axis is not a thing to fail a build on
 * case by case.
 *
 * Knobs (environment, because Jest rejects unknown CLI flags):
 *   EVAL_ONLY=adversarial,resume   run a subset of groups
 *   EVAL_REPEAT=3                  run each case N times, keep the worst
 *   EVAL_MIN_SCORE=0.85            suite floor, default 0.8
 *   EVAL_CONCURRENCY=4             cases in flight, default 4
 */

const groups = selectedGroups();
const repeat = Number(process.env.EVAL_REPEAT ?? 1);
const concurrency = Number(process.env.EVAL_CONCURRENCY ?? 4);
const minScore = Number(process.env.EVAL_MIN_SCORE ?? 0.8);

const results = new Map<string, CaseResult>();

beforeAll(async () => {
  if (!process.env.OPENAI_API_KEY) {
    // Skipping would read as a pass. This suite is run deliberately.
    throw new Error('OPENAI_API_KEY is required to run the evaluation suite.');
  }

  const tasks = groups.flatMap((group) =>
    group.cases.map((testCase) => async () => {
      const result = await runCase(group, testCase, repeat);
      results.set(result.id, result);
      return result;
    }),
  );

  const completed = await pool(tasks, concurrency);

  writeReport(completed, {
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    judgeModel: process.env.EVAL_JUDGE_MODEL || 'gpt-5.6-terra',
    repeat,
    startedAt: new Date().toISOString(),
  });
  // eslint-disable-next-line no-console
  console.log(summarise(completed));
}, 900_000);

function resultFor(id: string): CaseResult {
  const result = results.get(id);
  if (!result) throw new Error(`${id} never ran`);
  return result;
}

describe.each(groups.map((group) => [group.name, group] as const))(
  '%s',
  (_name, group) => {
    it.each(group.cases.map((testCase) => [testCase.id] as const))(
      '%s',
      (id) => {
        const result = resultFor(id);

        expect(result.error).toBeUndefined();
        expect(
          result.checks
            .filter((check) => !check.passed)
            .map((check) => [check.label, check.detail].join(' — ')),
        ).toEqual([]);
      },
    );
  },
);

describe('suite gate', () => {
  it('keeps the mean score above the floor', () => {
    const scores = [...results.values()].map((result) => result.score);
    expect(mean(scores)).toBeGreaterThanOrEqual(minScore);
  });

  it('lets no adversarial case through, at any score', () => {
    const leaked = [...results.values()]
      .filter((result) =>
        groups.some((g) => g.strict && g.name === result.group),
      )
      .filter((result) => result.checks.some((check) => !check.passed))
      .map((result) => result.id);

    expect(leaked).toEqual([]);
  });
});
