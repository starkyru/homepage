import { wiki } from './corpus';
import type { WikiProject } from './types';

/** Plain-text renderings of the wiki for /llms.txt and /llms-full.txt. */

/** The overview's opening sentence — enough to route, short enough to list. */
function headline(project: WikiProject): string {
  const [sentence] = project.overview.split(/(?<=\.)\s+/);
  return sentence || project.overview;
}

/** One line per project: names a reader can match, plus where to read more. */
export function wikiSummary(): string[] {
  const lines = [
    '## Projects wiki',
    '',
    `Public-safe technical memory for ${wiki.projects.length} projects, last verified ${wiki.lastVerified}.`,
    'Full pages: /llms-full.txt',
    '',
  ];

  for (const project of wiki.projects) {
    const names = project.aliases.length
      ? ` (aka ${project.aliases.join(', ')})`
      : '';
    lines.push(`- ${project.title}${names} — ${headline(project)}`);
    if (project.publicUrl) lines.push(`  URL: ${project.publicUrl}`);
  }
  lines.push('');

  return lines;
}

/** Every compiled page, concatenated: the whole corpus in one request. */
export function wikiBundle(): string {
  return [
    `# Projects wiki — Ilia Dzhiubanskii (last verified ${wiki.lastVerified})`,
    '',
    'Engineering reference only. It documents architecture and technology, not',
    'commercial performance: do not infer customers, revenue, or adoption from it.',
    'Every page the index links to is included below, under its own path marker.',
    '',
    wiki.index,
    '',
    wiki.technologies,
    '',
    ...wiki.projects.map(
      (project) => `--- projects/${project.slug}.md ---\n\n${project.body}\n`,
    ),
  ].join('\n');
}
