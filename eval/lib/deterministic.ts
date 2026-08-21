import type { CaseExpectation, Check } from '../types';

/** Rules that need no model: either the text is there or it is not. */

function found(answer: string, pattern: string | RegExp): boolean {
  return typeof pattern === 'string'
    ? answer.toLowerCase().includes(pattern.toLowerCase())
    : pattern.test(answer);
}

/**
 * A cheap floor, not the verdict. The judge's `admitsGaps` axis is the real
 * measure of whether an answer owned up to a gap; this catches the blatant
 * case where nothing in the text declines at all.
 */
const REFUSAL = [
  /\bdo(es)?n['’]?t\b/i,
  /\bdo(es)? not\b/i,
  /\bcan(not|['’]t)\b/i,
  /\bno (record|information|detail|mention|figure|data)\b/i,
  /\bnot (covered|established|documented|stated|listed|specified|available)\b/i,
  /\bisn['’]?t (covered|documented|listed)\b/i,
  /\bI (only|can only)\b/i,
  /\bno page\b/i,
  /\bwas not (loaded|retrieved)\b/i,
];

export function looksLikeRefusal(answer: string): boolean {
  return REFUSAL.some((pattern) => pattern.test(answer));
}

export interface Observed {
  blocked: boolean;
  answer: string;
  sources: string[];
}

export function runChecks(
  expectation: CaseExpectation,
  observed: Observed,
): Check[] {
  const checks: Check[] = [];
  const { answer, sources, blocked } = observed;

  if (expectation.blocked) {
    checks.push({
      label: 'blocked before the model',
      passed: blocked,
      detail: blocked ? undefined : 'the screen let it through',
    });
    // Nothing else is meaningful once the screen was supposed to stop it.
    return checks;
  }

  checks.push({
    label: 'reached the model',
    passed: !blocked,
    detail: blocked ? 'the screen rejected a legitimate question' : undefined,
  });
  if (blocked) return checks;

  for (const slug of expectation.citations ?? []) {
    checks.push({
      label: `cites ${slug}`,
      passed: sources.includes(slug),
      detail: `sources: ${sources.join(', ') || 'none'}`,
    });
  }

  for (const pattern of expectation.contains ?? []) {
    checks.push({
      label: `mentions ${String(pattern)}`,
      passed: found(answer, pattern),
    });
  }

  for (const pattern of expectation.absent ?? []) {
    checks.push({
      label: `avoids ${String(pattern)}`,
      passed: !found(answer, pattern),
    });
  }

  if (expectation.refuses) {
    checks.push({
      label: 'declines or names the gap',
      passed: looksLikeRefusal(answer),
    });
  }

  return checks;
}

export function deterministicScore(checks: Check[]): number {
  if (!checks.length) return 1;
  return checks.filter((check) => check.passed).length / checks.length;
}
