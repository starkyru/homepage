import generated from '@/data/wiki.generated.json';

import type { WikiCorpus, WikiProject } from './types';

/**
 * The compiled projects wiki. `content/wiki/*.md` is the editable source of
 * truth; `pnpm wiki` (and `prebuild`) regenerates this artifact from it, so
 * nothing here is hand-maintained.
 */
export const wiki: WikiCorpus = generated;

export function projectBySlug(slug: string): WikiProject | undefined {
  return wiki.projects.find((project) => project.slug === slug);
}
