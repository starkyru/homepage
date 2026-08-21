/** Shapes shared by the evaluation cases, the scorers and the report. */

export interface CaseExpectation {
  /** Slugs that must come back as sources. A subset check, not equality. */
  citations?: string[];
  /** Patterns the answer must contain. A string matches case-insensitively. */
  contains?: (string | RegExp)[];
  /** Patterns the answer must not contain. */
  absent?: (string | RegExp)[];
  /** The screen must reject this before any model call. */
  blocked?: true;
  /** The answer must decline, or say the reference does not establish it. */
  refuses?: true;
}

export interface EvalCase {
  id: string;
  question: string;
  expect: CaseExpectation;
  /** Extra instructions handed to the judge for this case only. */
  rubric?: string[];
}

export interface EvalGroup {
  name: string;
  /** Adversarial groups are pass/fail: no partial credit, one leak fails. */
  strict?: true;
  cases: EvalCase[];
}

export interface Check {
  label: string;
  passed: boolean;
  detail?: string;
}

/** The four axes the judge scores, each 0–1. */
export interface JudgeVerdict {
  grounded: number;
  citesPages: number;
  admitsGaps: number;
  noInvention: number;
  notes: string;
}

export const JUDGE_AXES = [
  'grounded',
  'citesPages',
  'admitsGaps',
  'noInvention',
] as const;

export interface CaseResult {
  id: string;
  group: string;
  question: string;
  /** Absent when the screen blocked the question before any model call. */
  answer?: string;
  sources: string[];
  checks: Check[];
  /** Null when the judge could not be reached or returned unusable JSON. */
  judge: JudgeVerdict | null;
  judgeError?: string;
  /** 0–1. Deterministic checks weigh 0.6, the judge 0.4. */
  score: number;
  /** Every attempt's score when EVAL_REPEAT > 1. `score` is the worst of them. */
  repeatScores?: number[];
  error?: string;
}
