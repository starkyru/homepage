import { wikiBundle } from '@/lib/wiki/llms';

/**
 * /llms-full.txt — the whole projects wiki in one plain-text response, for an
 * agent that would rather read the corpus than ask the site's chat about it.
 * /llms.txt stays the short routing document.
 *
 * Compiled from content/wiki, so it can never disagree with what the chat is
 * grounded in.
 */

export const dynamic = 'force-static';

export function GET() {
  return new Response(wikiBundle(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
