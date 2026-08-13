import { wiki } from './corpus';
import { MAX_PAGES, selectProjects } from './retrieval';
import type { WikiCitation, WikiProject } from './types';

/**
 * Renders the trusted reference the chat sends to the model.
 *
 * The corpus-wide part is built once at module load and never varies, so it can
 * sit at the head of the prompt where a provider's prefix cache can reuse it.
 * Only the retrieved pages change per question.
 */

function rosterLine(project: WikiProject): string {
  const parts = [project.slug, project.title];
  if (project.aliases.length) parts.push(`aka ${project.aliases.join(', ')}`);
  if (project.category) parts.push(project.category);
  if (project.status) parts.push(`status: ${project.status}`);
  if (project.publicUrl) parts.push(project.publicUrl);
  return `- ${parts.join(' — ')}`;
}

/** index.md, technologies.md and a one-line roster carrying aliases and status. */
export const wikiOverview = [
  `# Projects wiki (last verified ${wiki.lastVerified})`,
  '',
  wiki.index,
  '',
  wiki.technologies,
  '',
  '## Page roster',
  '',
  ...wiki.projects.map(rosterLine),
].join('\n');

function renderPage(project: WikiProject): string {
  return [`<project slug="${project.slug}">`, project.body, '</project>'].join(
    '\n',
  );
}

export interface WikiContext {
  /** Full pages retrieved for this question, already wrapped for the prompt. */
  pages: string;
  citations: WikiCitation[];
}

/**
 * Retrieves at most `MAX_PAGES` project pages for a visitor question. Returns
 * an empty context when nothing matches — the overview and resume still let the
 * model answer or say the wiki does not cover it.
 */
export function retrieveWikiContext(
  question: string,
  limit: number = MAX_PAGES,
): WikiContext {
  const selected = selectProjects(question, limit);

  return {
    pages: selected.map((scored) => renderPage(scored.project)).join('\n\n'),
    citations: selected.map(({ project }) => ({
      slug: project.slug,
      title: project.title,
      publicUrl: project.publicUrl,
    })),
  };
}
