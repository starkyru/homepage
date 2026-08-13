import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PROJECT_SECTIONS } from '@/components/projects/sections';

const PROJECTS_DIR = resolve(process.cwd(), 'content/wiki/projects');
const all = PROJECT_SECTIONS.flatMap((section) => section.projects);
const byName = (name: string) => all.find((project) => project.name === name);

describe('the compiled projects list', () => {
  it('keeps the three headings the page is designed around', () => {
    expect(PROJECT_SECTIONS.map((section) => section.title)).toEqual([
      'Apps & Products',
      'Developer Tools & Libraries',
      'Learning & Courses',
    ]);
  });

  // The drift this list was generated to stop: the page fell nine projects
  // behind the wiki while it was hand-kept.
  it('lists every page in content/wiki/projects', () => {
    const pages = readdirSync(PROJECTS_DIR).filter((file) =>
      file.endsWith('.md'),
    );
    expect(all).toHaveLength(pages.length);
  });

  it('gives every card the copy it renders', () => {
    for (const project of all) {
      expect(project.name.length).toBeGreaterThan(0);
      expect(project.description.length).toBeGreaterThan(20);
      expect(project.tools.trim()).toBe(project.tools);
      expect(project.tools.length).toBeGreaterThan(0);
    }
  });

  it('follows index.md rather than the directory, products first', () => {
    expect(PROJECT_SECTIONS[0].projects[0].name).toBe('Overtone.art');
    expect(PROJECT_SECTIONS[2].projects.map((p) => p.name)).toEqual([
      'learn-ai',
      'learn-fullstack',
    ]);
  });

  it('carries the badge fields through from front matter', () => {
    expect(byName('printify-sdk')?.repo).toBe('printify-sdk');
    expect(byName('Overtone.art')?.url).toBe('https://overtone.art');
    expect(byName('Gallery SaaS')?.private).toBe(true);
    expect(byName('Overtone.art')?.private).toBe(false);
    expect(byName('Overtone.art')?.repo).toBe('');
  });

  // Beta sits next to Live, not instead of it: all three are public and unfinished.
  it('marks the three beta projects and nothing else', () => {
    expect(all.filter((p) => p.beta).map((p) => p.name)).toEqual([
      'WallSnap',
      'AngleForge',
      'Timerail',
    ]);
    for (const name of ['WallSnap', 'AngleForge', 'Timerail']) {
      expect(byName(name)?.url).toMatch(/^https:\/\//);
    }
  });

  it('drops a project when its wiki page goes', () => {
    for (const gone of ['ASO Audit Agent', 'AccordsQ', 'vocallQ']) {
      expect(byName(gone)).toBeUndefined();
    }
  });

  it('takes the card copy from the page, not the wiki prose', () => {
    const overtone = readFileSync(resolve(PROJECTS_DIR, 'overtone.md'), 'utf8');
    const card = byName('Overtone.art')?.description ?? '';
    expect(overtone).toContain(`card: ${card}`);
    // The body's own opening paragraph is the fallback, not the card.
    expect(card).not.toBe(
      overtone.split('\n# Overtone')[1]?.trim().split('\n\n')[1],
    );
  });
});
