#!/usr/bin/env node
/**
 * Compiles content/wiki/*.md into two artifacts:
 *
 * - src/data/wiki.generated.json — the whole corpus, for chat retrieval and the
 *   llms.txt routes.
 * - src/data/projects.generated.json — the slim list /projects renders. Bodies
 *   are ~100 KB of prose the browser has no use for, and the showcase is a
 *   client component, so the page gets its own artifact rather than importing
 *   the corpus and shipping it.
 *
 * The Markdown under content/wiki is the editable source of truth; both JSON
 * files are deployment artifacts. A serverless route cannot be trusted to find
 * loose Markdown in its bundle, and parsing 26 pages per request would be
 * wasteful anyway — so the pages are parsed once, at build time, into modules
 * the bundler can see.
 *
 * Only index.md, technologies.md and projects/*.md are compiled. README.md and
 * homepage-integration.md are owner documentation and stay out of the corpus.
 *
 * Usage: node scripts/build-wiki.mjs
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WIKI = resolve(ROOT, 'content/wiki');
const OUT = resolve(ROOT, 'src/data/wiki.generated.json');
const OUT_PROJECTS = resolve(ROOT, 'src/data/projects.generated.json');

/**
 * index.md heading → the heading /projects shows. The page has always grouped
 * tools and libraries together and the wiki separates them; mapping two
 * headings onto one group is how both keep the shape they want. A heading with
 * no entry here is passed through under its own name, so adding a group to the
 * index shows up on the page instead of vanishing.
 */
const SECTION_TITLES = {
  'apps and products': 'Apps & Products',
  'developer tools and internal systems': 'Developer Tools & Libraries',
  libraries: 'Developer Tools & Libraries',
  'learning systems': 'Learning & Courses',
};

/** How many technologies a card falls back to when `tools:` is not set. */
const TOOLS_FALLBACK_MAX = 12;

/** Splits `---\n...\n---\n` front matter from the Markdown body. */
function splitFrontMatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { meta: {}, body: raw.trim() };
  return {
    meta: parseFrontMatter(match[1]),
    body: raw.slice(match[0].length).trim(),
  };
}

/**
 * Parses the YAML subset the wiki actually uses: `key: value` and
 * `key: [a, b, c]`. Anything else is kept as a raw string.
 */
function parseFrontMatter(source) {
  const meta = {};
  for (const line of source.split(/\r?\n/)) {
    const match = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line.trim());
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = value
        .slice(1, -1)
        .split(',')
        .map((item) => unquote(item.trim()))
        .filter(Boolean);
    } else {
      meta[key] = unquote(value);
    }
  }
  return meta;
}

function unquote(value) {
  return value.replace(/^['"]|['"]$/g, '').trim();
}

/** The first non-heading, non-empty paragraph after the page's H1. */
function firstParagraph(body) {
  for (const block of body.split(/\r?\n\s*\r?\n/)) {
    const text = block.trim();
    if (!text || text.startsWith('#') || text.startsWith('-')) continue;
    return text;
  }
  return '';
}

/** The blocks under a `## <heading>` section, up to the next `##`. */
function section(body, heading) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex(
    (line) => line.trim().toLowerCase() === `## ${heading.toLowerCase()}`,
  );
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.trim().startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
}

/**
 * Flattens the categorised technology bullets into one list of names, so a
 * question mentioning "NestJS" can be matched without re-parsing Markdown.
 *
 * A trailing version is dropped ("Next.js 15" → "Next.js"): visitors ask about
 * the technology, and matching is substring-with-boundaries, so the versioned
 * spelling still finds the shorter name. The page body keeps the version.
 */
function technologyList(body) {
  const names = new Set();
  for (const line of section(body, 'Technologies used').split(/\r?\n/)) {
    const bullet = /^[-*]\s+(.*)$/.exec(line.trim());
    if (!bullet) continue;
    const items = bullet[1].replace(/^\*\*.*?:\*\*\s*/, '');
    for (const item of items.split(/,|\/(?=\s)/)) {
      const name = item
        .replace(/\*\*/g, '')
        .replace(/[.;]+$/, '')
        .replace(/\s+v?\d+(\.\d+|\.x)*\+?$/, '')
        .trim();
      if (name) names.add(name);
    }
  }
  return [...names];
}

/**
 * What index.md says about each page: where it appears (the owner's own
 * ordering, products first), which group it sits under, and the one-line
 * summary after the em dash.
 *
 * The rank breaks score ties in retrieval, so a tie lands on the more
 * substantial project rather than on whichever slug sorts first. The group and
 * the summary are what /projects is built from — the index is already the
 * owner's grouped, ordered list of every project, so the page follows it rather
 * than keeping a second copy that can drift.
 */
function indexEntries(indexBody) {
  const entries = new Map();
  let heading = '';
  for (const line of indexBody.split(/\r?\n/)) {
    const groupMatch = /^##\s+(.*)$/.exec(line.trim());
    if (groupMatch) {
      heading = groupMatch[1].trim();
      continue;
    }
    const link = /\(projects\/([a-z0-9-]+)\.md\)(?:\s*—\s*(.*))?$/.exec(
      line.trim(),
    );
    if (!link || entries.has(link[1])) continue;
    entries.set(link[1], {
      rank: entries.size,
      section: SECTION_TITLES[heading.toLowerCase()] || heading,
      summary: (link[2] || '').replace(/[.\s]+$/, '').trim(),
    });
  }
  return entries;
}

function readPage(path) {
  const { meta, body } = splitFrontMatter(readFileSync(path, 'utf8'));
  return { meta, body };
}

/** "an ad-creative factory" → "An ad-creative factory." */
function sentence(text) {
  if (!text) return '';
  return `${text[0].toUpperCase()}${text.slice(1)}.`;
}

/**
 * One page, split in two: the corpus record the chat reasons over, and the card
 * /projects renders. They are built together because they come from one file,
 * and kept apart because the card is presentation — the chat has no use for a
 * GitHub slug, and the browser has no use for the body.
 */
function buildProject(file, entries) {
  const slug = file.replace(/\.md$/, '');
  const { meta, body } = readPage(resolve(WIKI, 'projects', file));
  const heading = /^#\s+(.*)$/m.exec(body);
  const entry = entries.get(slug);
  const technologies = technologyList(body);

  const page = {
    slug,
    title: meta.title || heading?.[1] || slug,
    aliases: Array.isArray(meta.aliases) ? meta.aliases : [],
    category: meta.category || '',
    status: meta.status || '',
    publicUrl: meta.public_url || '',
    indexRank: entry ? entry.rank : entries.size,
    overview: firstParagraph(body),
    technologies,
    evidence: section(body, 'Engineering evidence'),
    body,
  };

  // `card:` and `tools:` fall back rather than block a build, the same way the
  // resume parser derives a missing Summary/Tech line — a page that has neither
  // still gets a card, it just reads like the index entry.
  const card = {
    slug,
    section: entry ? entry.section : '',
    name: page.title,
    description: meta.card || sentence(entry?.summary) || page.overview,
    tools: meta.tools || technologies.slice(0, TOOLS_FALLBACK_MAX).join(', '),
    repo: meta.repo || '',
    url: page.publicUrl,
    private: meta.private === 'true',
    beta: meta.beta === 'true',
    fellBackCard: !meta.card,
    fellBackTools: !meta.tools,
  };

  return { page, card };
}

/**
 * The grouped list /projects renders, in index.md's order. Groups appear in the
 * order the index introduces them; a project the index does not link cannot be
 * placed, so it is left out and named in a warning.
 */
function projectSections(cards) {
  const sections = new Map();
  for (const card of cards) {
    if (!card.section) continue;
    if (!sections.has(card.section)) sections.set(card.section, []);
    sections.get(card.section).push({
      name: card.name,
      description: card.description,
      tools: card.tools,
      repo: card.repo,
      url: card.url,
      private: card.private,
      beta: card.beta,
    });
  }
  return [...sections].map(([title, projects]) => ({ title, projects }));
}

function warnSlugs(message, projects) {
  if (!projects.length) return;
  console.warn(`warn: ${message}: ${projects.map((p) => p.slug).join(', ')}`);
}

function build() {
  const index = readPage(resolve(WIKI, 'index.md'));
  const technologies = readPage(resolve(WIKI, 'technologies.md'));
  const entries = indexEntries(index.body);
  const pages = readdirSync(resolve(WIKI, 'projects'))
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => buildProject(file, entries));

  // The corpus stays in slug order; the page follows index.md, which is the
  // owner's own ordering, products first.
  const cards = [...pages]
    .sort((a, b) => a.page.indexRank - b.page.indexRank)
    .map((entry) => entry.card);
  warnSlugs(
    'no overview paragraph in',
    pages.map((e) => e.page).filter((p) => !p.overview.length),
  );
  warnSlugs(
    'not linked from index.md, so left off /projects',
    cards.filter((card) => !card.section),
  );
  warnSlugs(
    'no card: line, using the index summary',
    cards.filter((card) => card.fellBackCard),
  );
  warnSlugs(
    'no tools: line, using the technology list',
    cards.filter((card) => card.fellBackTools),
  );

  return {
    sections: projectSections(cards),
    wiki: {
      lastVerified: index.meta.last_verified || '',
      index: index.body,
      technologies: technologies.body,
      projects: pages.map((entry) => entry.page),
    },
  };
}

const { sections, wiki } = build();
writeFileSync(OUT, `${JSON.stringify(wiki, null, 2)}\n`);
writeFileSync(OUT_PROJECTS, `${JSON.stringify({ sections }, null, 2)}\n`);
const listed = sections.reduce((n, s) => n + s.projects.length, 0);
console.log(
  `wiki: ${wiki.projects.length} project pages → ${OUT.replace(`${ROOT}/`, '')}`,
);
console.log(
  `projects: ${listed} in ${sections.length} sections → ${OUT_PROJECTS.replace(`${ROOT}/`, '')}`,
);
