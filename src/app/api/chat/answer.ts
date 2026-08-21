import type { WikiCitation } from '@/lib/wiki/types';

import { referenceFor, systemPrompt } from './prompt';

/**
 * The chat's screening rules and its one call to the model.
 *
 * These live apart from `route.ts` so the evaluation suite can drive the exact
 * path a visitor takes — the real screen, the real reference, the real request —
 * rather than a copy of it. The route above keeps only what is about HTTP.
 */

export const MAX_MESSAGE_LENGTH = 6_000;
const MAX_OUTPUT_TOKENS = 700;
const REQUEST_TIMEOUT_MS = 25_000;
const DEFAULT_MODEL = 'gpt-4.1-mini';

const INJECTION_PATTERN =
  /\b(ignore|disregard|override|reveal|show|print|repeat)\b.{0,80}\b(instruction|prompt|system message|developer message|policy|secret|api key)\b/i;

export type Screened =
  | { ok: true; message: string }
  | { ok: false; status: number; error: string };

/**
 * Decides whether a visitor message reaches the model at all. Pure: no network,
 * no environment, no clock — the same message always screens the same way.
 */
export function screen(input: unknown): Screened {
  const message = typeof input === 'string' ? input.trim() : '';

  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `Please send a question up to ${MAX_MESSAGE_LENGTH} characters.`,
    };
  }

  if (INJECTION_PATTERN.test(message)) {
    return {
      ok: false,
      status: 400,
      error:
        'I can only answer questions about Ilia’s professional background.',
    };
  }

  return { ok: true, message };
}

/** A model call that produced no usable answer. The route reports it as a 502. */
export class AnswerError extends Error {
  readonly status = 502;

  constructor(message: string) {
    super(message);
    this.name = 'AnswerError';
  }
}

function getResponseText(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;
  const response = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ text?: unknown }> }>;
  };

  if (typeof response.output_text === 'string') return response.output_text;

  return response.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .find((text): text is string => typeof text === 'string');
}

export interface Answer {
  answer: string;
  sources: WikiCitation[];
  /**
   * The trusted pages this answer was given, verbatim. The route drops it; the
   * eval grades an answer against the evidence actually sent, not against a
   * second retrieval that only ought to match.
   */
  reference: string;
}

/**
 * Answers one screened question. Throws `AnswerError` rather than returning a
 * partial result: an answer with no text is not an answer.
 */
export async function answerQuestion(message: string): Promise<Answer> {
  // The question only selects which trusted pages are sent; it never joins them.
  const reference = referenceFor(message);

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: reference.message },
        {
          role: 'user',
          content: `<untrusted_visitor_question>\n${message}\n</untrusted_visitor_question>`,
        },
      ],
      max_output_tokens: MAX_OUTPUT_TOKENS,
      // The endpoint is public and unauthenticated, and the Responses API
      // retains stored requests for 30 days — visitor text would sit in the
      // OpenAI project dashboard for no reason. Nothing here reads a response
      // back by id, so storing it buys nothing either.
      store: false,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new AnswerError(`OpenAI responded ${response.status}`);
  }

  const answer = getResponseText(await response.json());
  if (!answer) throw new AnswerError('OpenAI response did not contain text');

  return { answer, sources: reference.citations, reference: reference.message };
}
