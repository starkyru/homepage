import projects from '@/data/projects.generated.json';

export interface Project {
  name: string;
  description: string;
  tools: string;
  repo?: string;
  url?: string;
  private?: boolean;
  beta?: boolean;
}

export interface Section {
  title: string;
  projects: Project[];
}

/**
 * Compiled from `content/wiki/`, not written here.
 *
 * The wiki already carries every project, grouped and ordered by `index.md`, so
 * a second hand-kept list could only drift from it — and it had: the page was
 * nine projects behind the corpus the chat answers from. `scripts/build-wiki.mjs`
 * writes `projects.generated.json` from the pages' `card:`, `tools:`, `repo:`,
 * `private:` and `public_url:` front matter; edit those, then run `pnpm wiki`.
 *
 * It is a separate artifact from `wiki.generated.json` on purpose: this file
 * reaches the browser, and the corpus is ~100 KB of page bodies the projects
 * column has no use for.
 *
 * Lives outside the component so `/projects/page.tsx` (a server component) can
 * build its JSON-LD from the same list the client shell renders.
 */
export const PROJECT_SECTIONS: Section[] = projects.sections;
