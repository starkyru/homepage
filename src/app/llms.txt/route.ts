import { wikiSummary } from '@/lib/wiki/llms';

import resume from '@/data/resume.json';

import { siteConfig } from '@/constant/config';

/**
 * /llms.txt — the llmstxt.org convention: one plain-text file an LLM agent can
 * read instead of scraping the rendered page.
 *
 * The homepage already serves the full resume in its server HTML, so this is
 * not the only machine-readable copy — but it is the cheapest one, it needs no
 * HTML parsing, and it is immune to the interactive view hiding the static
 * block once JS runs. Generated from resume.json, so `pnpm update:resume`
 * refreshes it along with everything else.
 */

export const dynamic = 'force-static';

function build(): string {
  const l: string[] = [];
  l.push(`# ${resume.name} — ${resume.title}`);
  l.push('');
  l.push(`> ${siteConfig.description}`);
  l.push('');
  l.push(`Site: ${siteConfig.url}`);
  l.push(`Location: ${resume.location}`);
  l.push(`Email: ${resume.contacts.email}`);
  for (const link of resume.contacts.links) l.push(`Link: ${link}`);
  l.push('');
  l.push('## Summary');
  l.push('');
  l.push(resume.summary);
  l.push('');
  l.push('## Technical skills');
  l.push('');
  for (const group of resume.skills) {
    l.push(`- ${group.category}: ${group.items.join(', ')}`);
  }
  l.push('');
  l.push('## Experience');
  l.push('');
  for (const job of resume.experience) {
    l.push(`### ${job.role} — ${job.company} (${job.periodRaw})`);
    if (job.location) l.push(`Location: ${job.location}`);
    if (job.url) l.push(`Company: ${job.url}`);
    if (job.tech.length) l.push(`Tech: ${job.tech.join(', ')}`);
    l.push('');
    l.push(job.description);
    for (const b of job.bullets) l.push(`- ${b}`);
    l.push('');
  }
  l.push('## Education');
  l.push('');
  for (const ed of resume.education) {
    l.push(`- ${ed.field} — ${ed.school} (${ed.years})`);
  }
  l.push('');
  l.push(...wikiSummary());
  l.push('## Pages');
  l.push('');
  l.push(`- [Home](${siteConfig.url}/): this resume, as an interactive page.`);
  l.push(
    `- [Projects](${siteConfig.url}/projects): apps and open-source work.`,
  );
  l.push(
    `- [Projects wiki](${siteConfig.url}/llms-full.txt): full project pages.`,
  );
  l.push('');
  return l.join('\n');
}

export function GET() {
  return new Response(build(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
