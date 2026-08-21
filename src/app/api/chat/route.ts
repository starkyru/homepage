import { NextRequest, NextResponse } from 'next/server';

import { answerQuestion, screen } from './answer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 12;
// The key is caller-supplied (x-forwarded-for), so without a ceiling this map
// grows by one entry per distinct IP for the lifetime of the server process —
// and the limiter is the very thing meant to stop a client sending unbounded
// traffic. Expired entries are swept on write; live ones are capped.
const RATE_MAX_KEYS = 10_000;
const requestsByIp = new Map<string, { count: number; resetAt: number }>();

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

  const screened = screen(body.message);
  if (!screened.ok) {
    return NextResponse.json(
      { error: screened.error },
      { status: screened.status },
    );
  }

  try {
    const { answer, sources } = await answerQuestion(screened.message);
    return NextResponse.json({ answer, sources });
  } catch {
    return NextResponse.json(
      { error: 'The assistant is temporarily unavailable. Please try again.' },
      { status: 502 },
    );
  }
}
