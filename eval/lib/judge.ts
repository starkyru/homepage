import { JUDGE_AXES, type JudgeVerdict } from '../types';

/**
 * The judge scores entailment against the evidence the answer was actually
 * given — never against its own knowledge. That constraint is what makes a
 * same-vendor judge usable: it is asked whether a claim appears in supplied
 * text, not whether the claim sounds right.
 */

const DEFAULT_JUDGE_MODEL = 'gpt-5.6-terra';
const JUDGE_TIMEOUT_MS = 60_000;

const INSTRUCTIONS = `You are grading one answer from a portfolio chat assistant.

You are given the visitor's QUESTION, the REFERENCE the assistant was given,
and its ANSWER. The reference is the whole of what it was allowed to use.

Score four axes from 0 to 1 (0.5 for partial):
- grounded: every factual claim in the answer is supported by the reference.
- citesPages: technical claims name the project pages they came from. Score 1
  when the answer had nothing project-specific to cite.
- admitsGaps: where the reference does not establish something, the answer says
  so instead of filling it in. Score 1 when there was no gap to admit.
- noInvention: no employer, date, metric, technology, customer or capability
  appears that is absent from the reference.

Judge only against the reference. If you know something the reference does not
state, that counts against the answer, not for it.

Reply with JSON only, no prose and no code fence:
{"grounded":0-1,"citesPages":0-1,"admitsGaps":0-1,"noInvention":0-1,"notes":"one sentence"}`;

function judgeModel() {
  return process.env.EVAL_JUDGE_MODEL || DEFAULT_JUDGE_MODEL;
}

/**
 * Pulls the JSON object out of a reply that may be fenced or prefaced.
 * Exported because it parses untrusted model output: a lenient parser that
 * quietly accepts a malformed verdict would inflate every score.
 */
export function parseVerdict(text: string): JudgeVerdict | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const record = parsed as Record<string, unknown>;

  const verdict: Partial<JudgeVerdict> = {
    notes: typeof record.notes === 'string' ? record.notes : '',
  };
  for (const axis of JUDGE_AXES) {
    const value = record[axis];
    if (typeof value !== 'number' || Number.isNaN(value)) return null;
    verdict[axis] = Math.min(1, Math.max(0, value));
  }

  return verdict as JudgeVerdict;
}

function payload(prompt: string, withTemperature: boolean) {
  return JSON.stringify({
    model: judgeModel(),
    input: [
      { role: 'system', content: INSTRUCTIONS },
      { role: 'user', content: prompt },
    ],
    max_output_tokens: 400,
    store: false,
    // The judge is a measuring instrument, not the system under test: pinning
    // its sampling is what makes one run's score comparable to the next.
    ...(withTemperature ? { temperature: 0 } : {}),
  });
}

async function callJudge(prompt: string, withTemperature: boolean) {
  return fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: payload(prompt, withTemperature),
    signal: AbortSignal.timeout(JUDGE_TIMEOUT_MS),
  });
}

function textOf(response: {
  output_text?: unknown;
  output?: Array<{ content?: Array<{ text?: unknown }> }>;
}) {
  if (typeof response.output_text === 'string') return response.output_text;
  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .find((text): text is string => typeof text === 'string') ?? ''
  );
}

export interface JudgeInput {
  question: string;
  reference: string;
  answer: string;
  rubric?: string[];
}

export interface JudgeResult {
  verdict: JudgeVerdict | null;
  error?: string;
}

export async function judge(input: JudgeInput): Promise<JudgeResult> {
  const prompt = [
    `QUESTION:\n${input.question}`,
    `REFERENCE:\n${input.reference}`,
    `ANSWER:\n${input.answer}`,
    input.rubric?.length ? `CASE NOTES:\n${input.rubric.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n---\n\n');

  try {
    let response = await callJudge(prompt, true);
    // Some models reject `temperature` outright. Dropping it beats falling
    // back to a weaker judge; the strict reply shape bounds the variance.
    if (response.status === 400) response = await callJudge(prompt, false);

    if (!response.ok) {
      return { verdict: null, error: `judge HTTP ${response.status}` };
    }

    const verdict = parseVerdict(textOf(await response.json()));
    return verdict
      ? { verdict }
      : { verdict: null, error: 'judge returned unusable JSON' };
  } catch (cause) {
    return { verdict: null, error: `judge call failed: ${String(cause)}` };
  }
}

export function judgeScore(verdict: JudgeVerdict): number {
  return JUDGE_AXES.reduce((total, axis) => total + verdict[axis], 0) / 4;
}
