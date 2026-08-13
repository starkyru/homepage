import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { wiki } from '@/lib/wiki/corpus';
import { MAX_PAGES, selectProjects } from '@/lib/wiki/retrieval';

const slugsFor = (question: string) =>
  selectProjects(question).map((scored) => scored.project.slug);

describe('the compiled corpus', () => {
  it('gives every page the fields retrieval scores on', () => {
    for (const project of wiki.projects) {
      expect(project.slug).toMatch(/^[a-z0-9-]+$/);
      expect(project.title.length).toBeGreaterThan(0);
      expect(project.overview.length).toBeGreaterThan(0);
      expect(project.body).toContain('##');
      expect(project.technologies.length).toBeGreaterThan(0);
    }
  });

  // Catches a page added to content/wiki without `pnpm wiki` being run.
  it('holds exactly the pages in content/wiki/projects', () => {
    const files = readdirSync(resolve(process.cwd(), 'content/wiki/projects'))
      .filter((file) => file.endsWith('.md'))
      .sort();

    expect(wiki.projects.map((project) => `${project.slug}.md`).sort()).toEqual(
      files,
    );
  });
});

describe('selectProjects', () => {
  it('puts an exact title first', () => {
    expect(slugsFor('Tell me about Overtone.art')[0]).toBe('overtone');
  });

  it('resolves a front-matter alias to its page', () => {
    expect(slugsFor('what is my-gallery?')).toContain('overtone');
  });

  it('ranks the named project above one that merely shares a technology', () => {
    const slugs = slugsFor('Does Timerail use TypeScript?');
    expect(slugs[0]).toBe('timerail');
  });

  it('prefers the specific technology over the broader one it contains', () => {
    // overtone.md lists React Native; agent-signals.md lists only React, which
    // the question also contains — it may come along, but never first.
    const slugs = slugsFor('Where has he used React Native?');
    expect(slugs[0]).toBe('overtone');
    expect(slugs.indexOf('agent-signals')).toBeGreaterThan(
      slugs.indexOf('overtone'),
    );
  });

  it('finds the pages listing a technology', () => {
    // canvas-editor.md and overtone.md are the only pages naming Fabric.js.
    expect(slugsFor('Which projects use Fabric.js?').sort()).toEqual([
      'canvas-editor',
      'overtone',
    ]);
  });

  it('never returns more than the page budget', () => {
    const slugs = slugsFor(
      'React Native, TypeScript, PostgreSQL, Stripe, NestJS and Redis',
    );
    expect(slugs).toHaveLength(MAX_PAGES);
    expect(new Set(slugs).size).toBe(MAX_PAGES);
  });

  it('honours a smaller explicit limit', () => {
    expect(selectProjects('Which projects use React Native?', 1)).toHaveLength(
      1,
    );
  });

  it('returns nothing for a question the wiki does not cover', () => {
    expect(slugsFor('What is the weather in Berlin tomorrow?')).toEqual([]);
  });

  it('reports what matched, so an answer can be traced', () => {
    const [top] = selectProjects('Tell me about WallSnap');
    expect(top.project.slug).toBe('wallsnap');
    expect(top.matched).toContain('WallSnap');
  });
});
