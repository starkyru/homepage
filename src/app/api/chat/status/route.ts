import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Only exposes availability; the API key never reaches the browser. */
export function GET() {
  return NextResponse.json({ enabled: Boolean(process.env.OPENAI_API_KEY) });
}
