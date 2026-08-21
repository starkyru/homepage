import { answerQuestion, screen } from '@/app/api/chat/answer';

import { deterministicScore, runChecks } from './deterministic';
import { judge, judgeScore } from './judge';
import type { CaseResult, EvalCase, EvalGroup } from '../types';

/**
 * One case, end to end, through the code the browser uses: the real screen,
 * the real retrieval, the real request. Nothing here re-implements the chat.
 */

const DETERMINISTIC_WEIGHT = 0.6;
const JUDGE_WEIGHT = 0.4;

async function runOnce(
  group: EvalGroup,
  testCase: EvalCase,
): Promise<CaseResult> {
  const base = {
    id: testCase.id,
    group: group.name,
    question: testCase.question,
    sources: [] as string[],
    judge: null,
  };

  const screened = screen(testCase.question);
  if (!screened.ok) {
    const checks = runChecks(testCase.expect, {
      blocked: true,
      answer: '',
      sources: [],
    });
    return { ...base, checks, score: deterministicScore(checks) };
  }

  let answer: string;
  let reference: string;
  let sources: string[];
  try {
    const result = await answerQuestion(screened.message);
    answer = result.answer;
    reference = result.reference;
    sources = result.sources.map((source) => source.slug);
  } catch (cause) {
    return { ...base, checks: [], score: 0, error: String(cause) };
  }

  const checks = runChecks(testCase.expect, {
    blocked: false,
    answer,
    sources,
  });
  const deterministic = deterministicScore(checks);

  const { verdict, error } = await judge({
    question: testCase.question,
    reference,
    answer,
    rubric: testCase.rubric,
  });

  // With no verdict the deterministic checks carry the whole score rather than
  // a missing judge silently capping every case at 0.6.
  const score = verdict
    ? deterministic * DETERMINISTIC_WEIGHT + judgeScore(verdict) * JUDGE_WEIGHT
    : deterministic;

  return {
    ...base,
    answer,
    sources,
    checks,
    judge: verdict,
    judgeError: error,
    score,
  };
}

/** Repeats a case and keeps the worst attempt: flakiness is a failure mode. */
export async function runCase(
  group: EvalGroup,
  testCase: EvalCase,
  repeat: number,
): Promise<CaseResult> {
  const attempts: CaseResult[] = [];
  for (let attempt = 0; attempt < Math.max(1, repeat); attempt += 1) {
    attempts.push(await runOnce(group, testCase));
  }

  const worst = attempts.reduce((low, next) =>
    next.score < low.score ? next : low,
  );
  return attempts.length > 1
    ? { ...worst, repeatScores: attempts.map((attempt) => attempt.score) }
    : worst;
}

/** Runs `tasks` with at most `limit` in flight, preserving input order. */
export async function pool<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;

  const worker = async () => {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      results[index] = await tasks[index]();
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, worker),
  );
  return results;
}
