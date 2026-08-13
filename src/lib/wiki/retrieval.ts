import { wiki } from './corpus';
import { contentTokens, mentions, normalize, sameStem } from './text';
import type { WikiProject } from './types';

/**
 * Deterministic page selection for the portfolio chat.
 *
 * With 23 pages, exact name and technology matching beats an embedding index:
 * it is auditable, costs nothing at request time, and cannot drift. A vector
 * store only becomes worth its complexity on a substantially larger corpus.
 */

const WEIGHT = {
  title: 100,
  slug: 60,
  alias: 50,
  technology: 14,
  /** Per extra word in a matched technology: "React Native" beats "React". */
  specificity: 6,
  category: 10,
  overlap: 1,
} as const;

/** Caps stop a page with a long inventory from crowding out an exact match. */
const TECHNOLOGY_CAP = 56;
const OVERLAP_CAP = 9;

/**
 * A page needs a name, technology or category hit to be retrieved. Body overlap
 * alone caps below this on purpose: it ranks candidates, it does not elect them.
 */
const MIN_SCORE = 10;

export const MAX_PAGES = 3;

export interface ScoredProject {
  project: WikiProject;
  score: number;
  /** Why the page was chosen, for logs and answer citations. */
  matched: string[];
}

/**
 * Normalising 31 whole pages is the only expensive part of a request, and the
 * corpus never changes, so each page is normalised once per server process.
 */
const normalizedBodies = new Map<string, string>();

function normalizedBody(project: WikiProject): string {
  const cached = normalizedBodies.get(project.slug);
  if (cached !== undefined) return cached;

  const body = normalize(project.body);
  normalizedBodies.set(project.slug, body);
  return body;
}

/**
 * A longer name is a narrower claim: a page listing "React Native" answers a
 * React Native question better than one that only lists "React", and without
 * this they score the same.
 */
function specificityBonus(technology: string): number {
  return (technology.trim().split(/\s+/).length - 1) * WEIGHT.specificity;
}

function scoreProject(
  project: WikiProject,
  question: string,
  tokens: string[],
): ScoredProject {
  const matched: string[] = [];
  let score = 0;

  if (mentions(question, project.title)) {
    score += WEIGHT.title;
    matched.push(project.title);
  }
  if (mentions(question, project.slug)) {
    score += WEIGHT.slug;
    matched.push(project.slug);
  }
  for (const alias of project.aliases) {
    if (!mentions(question, alias)) continue;
    score += WEIGHT.alias;
    matched.push(alias);
  }

  let technologyScore = 0;
  for (const technology of project.technologies) {
    if (technologyScore >= TECHNOLOGY_CAP) break;
    if (!mentions(question, technology)) continue;
    technologyScore += WEIGHT.technology + specificityBonus(technology);
    matched.push(technology);
  }
  score += technologyScore;

  const categoryWords = contentTokens(project.category);
  if (
    categoryWords.some((word) => tokens.some((token) => sameStem(token, word)))
  ) {
    score += WEIGHT.category;
  }

  const body = normalizedBody(project);
  let overlap = 0;
  for (const token of tokens) {
    if (overlap >= OVERLAP_CAP) break;
    if (mentions(body, token)) overlap += WEIGHT.overlap;
  }
  score += overlap;

  return { project, score, matched: [...new Set(matched)] };
}

/**
 * Ranks the wiki against a visitor question. The question only ever *selects*
 * trusted pages; it never becomes part of them.
 */
export function selectProjects(
  question: string,
  limit: number = MAX_PAGES,
): ScoredProject[] {
  const normalized = normalize(question);
  const tokens = contentTokens(question);

  return wiki.projects
    .map((project) => scoreProject(project, normalized, tokens))
    .filter((scored) => scored.score >= MIN_SCORE)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.project.indexRank - b.project.indexRank ||
        a.project.slug.localeCompare(b.project.slug),
    )
    .slice(0, Math.max(0, limit));
}
