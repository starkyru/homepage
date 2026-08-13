import { NextRequest, NextResponse } from 'next/server';

import { referenceFor, systemPrompt } from './prompt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_MESSAGE_LENGTH = 6_000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 12;
// The key is caller-supplied (x-forwarded-for), so without a ceiling this map
// grows by one entry per distinct IP for the lifetime of the server process —
// and the limiter is the very thing meant to stop a client sending unbounded
// traffic. Expired entries are swept on write; live ones are capped.
const RATE_MAX_KEYS = 10_000;
const requestsByIp = new Map<string, { count: number; resetAt: number }>();

const INJECTION_PATTERN =
  /\b(ignore|disregard|override|reveal|show|print|repeat)\b.{0,80}\b(instruction|prompt|system message|developer message|policy|secret|api key)\b/i;

function rateLimited(ip: string) {
  const now = Date.now();
  const entry = requestsByIp.get(ip);

  if (!entry || now >= entry.resetAt) {
    if (requestsByIp.size >= RATE_MAX_KEYS) {
      for (const [key, seen] of requestsByIp)
        if (now >= seen.resetAt) requestsByIp.delete(key);
      // Still full → every window is live. Drop the oldest inserted (a Map
      // iterates in insertion order) rather than let the map grow unbounded.
      if (requestsByIp.size >= RATE_MAX_KEYS) {
        const oldest = requestsByIp.keys().next();
        if (!oldest.done) requestsByIp.delete(oldest.value);
      }
    }
    requestsByIp.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT;
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

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Chat is not configured.' },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a minute.' },
      { status: 429 },
    );
  }

  let body: { message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      {
        error: `Please send a question up to ${MAX_MESSAGE_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  if (INJECTION_PATTERN.test(message)) {
    return NextResponse.json(
      {
        error:
          'I can only answer questions about Ilia’s professional background.',
      },
      { status: 400 },
    );
  }

  // The question only selects which trusted pages are sent; it never joins them.
  const reference = referenceFor(message);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'system', content: reference.message },
          {
            role: 'user',
            content: `<untrusted_visitor_question>\n${message}\n</untrusted_visitor_question>`,
          },
        ],
        max_output_tokens: 700,
        // The endpoint is public and unauthenticated, and the Responses API
        // retains stored requests for 30 days — visitor text would sit in the
        // OpenAI project dashboard for no reason. Nothing here reads a response
        // back by id, so storing it buys nothing either.
        store: false,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'The assistant is temporarily unavailable. Please try again.',
        },
        { status: 502 },
      );
    }

    const answer = getResponseText(await response.json());
    if (!answer) throw new Error('OpenAI response did not contain text');

    return NextResponse.json({ answer, sources: reference.citations });
  } catch {
    return NextResponse.json(
      { error: 'The assistant is temporarily unavailable. Please try again.' },
      { status: 502 },
    );
  }
}
