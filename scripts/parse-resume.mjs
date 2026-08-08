#!/usr/bin/env node
/**
 * Parses the Google Docs resume export into src/data/resume.json.
 *
 * The doc is the single source of truth for site content: role, period,
 * company, per-job copy, the professional summary, technical skills and
 * education all come from here.
 *
 * Google regenerates its CSS class names (c14, c39, ...) on every export, so
 * nothing below keys off classes. Structure is inferred from text instead:
 * ALL-CAPS section headings, and inside the experience section a date line
 * that anchors each job (role above it, company below it).
 *
 * Usage: node scripts/parse-resume.mjs [--file <path>] [--out <path>]
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DOC_ID = '1FozMEumbKlGOmrFjOYAsLtrpIC0WKh1Y';
const DOC_URL = `https://docs.google.com/document/d/${DOC_ID}/export?format=html`;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src/data/resume.json');

// Section headings we recognise, in the order they appear in the doc.
const SECTIONS = {
  'PROFESSIONAL SUMMARY': 'summary',
  'TECHNICAL SKILLS': 'skills',
  'PROFESSIONAL EXPERIENCE': 'experience',
  EDUCATION: 'education',
};

// A job's date line: "03/2026 – present", "08/2023 – 02/2026", "1999 – 2018".
const DATE_RE =
  /^(\d{1,2}\/)?(\d{4})\s*[–—-]\s*(present|current|(\d{1,2}\/)?(\d{4}))$/i;

/**
 * Display names for companies whose doc spelling isn't what the site shows.
 * Legal suffixes and TLDs are stripped automatically; this map only covers
 * what stripping can't derive (casing, and the catch-all early-career entry).
 */
const COMPANY_DISPLAY = {
  ANKR: 'Ankr',
  'Multiple companies, Russia and USA': 'Earlier',
  // TODO: typo in the doc ("Overtone Arr LLC"), which also ships in the PDF.
  // Remove this line once the Google Doc is corrected.
  'Overtone Arr': 'Overtone Art',
};

// Roles read better on a card with spaces around the slash.
const ROLE_DISPLAY = {
  'Founder/Builder': 'Founder / Builder',
  'Full-stack Engineer/iOS Engineer': 'Full-stack & iOS Engineer',
};

// ---------------------------------------------------------------------------
// HTML → ordered blocks
// ---------------------------------------------------------------------------

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  hellip: '…',
  middot: '·',
  bull: '•',
};

function unescapeHtml(s) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name] ?? m);
}

/** Google wraps outbound links as /url?q=<real>&sa=D&... — unwrap them. */
function unwrapHref(href) {
  const decoded = unescapeHtml(href);
  const m = /^https?:\/\/www\.google\.com\/url\?q=([^&]+)/.exec(decoded);
  return m ? decodeURIComponent(m[1]) : decoded;
}

function textOf(html) {
  return unescapeHtml(html.replace(/<[^>]+>/g, ''))
    .replace(/ |​/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function linksOf(html) {
  const out = [];
  for (const m of html.matchAll(
    /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    out.push({ href: unwrapHref(m[1]), text: textOf(m[2]) });
  }
  return out;
}

/** Flattens the doc body into ordered { type, text, links } blocks. */
function toBlocks(html) {
  const body = html.split(/<body\b[^>]*>/i)[1] ?? html;
  const blocks = [];
  for (const m of body.matchAll(/<(p|li|h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = textOf(m[2]);
    if (!text) continue;
    blocks.push({
      type: m[1].toLowerCase() === 'li' ? 'li' : 'p',
      text,
      links: linksOf(m[2]),
    });
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Field normalisation
// ---------------------------------------------------------------------------

/** "03/2026 – present" → "2026–now"; "01/2018 – 12/2018" → "2018". */
function normalisePeriod(raw) {
  const m = DATE_RE.exec(raw);
  if (!m) return raw;
  const start = m[2];
  const openEnded = /present|current/i.test(m[3]);
  if (openEnded) return `${start}–now`;
  const end = m[5];
  return start === end ? start : `${start}–${end}`;
}

/** "Overtone Arr LLC, Charlotte, NC" → { company, location }. */
function splitCompanyLine(raw) {
  // Whole-line overrides win first: the early-career entry has no company name
  // to strip down to ("Multiple companies, Russia and USA").
  if (COMPANY_DISPLAY[raw])
    return { company: COMPANY_DISPLAY[raw], location: '' };

  // Otherwise the company is everything before the first comma (a place name).
  const parts = raw.split(',').map((p) => p.trim());
  let company = parts.shift() ?? '';
  const location = parts.join(', ');
  const bare = company
    .replace(/\s+(LLC|Inc|Ltd|GmbH|Corp)\.?$/i, '')
    .replace(/\.(com|io|art|co)$/i, '')
    .trim();
  company = COMPANY_DISPLAY[bare] ?? bare;
  return { company, location };
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Strips a leading "Label:" and returns the remainder, or null. */
function takeLabelled(text, label) {
  const re = new RegExp(`^${label}\\s*:\\s*`, 'i');
  return re.test(text) ? text.replace(re, '').trim() : null;
}

function splitList(s) {
  return s
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Technologies that only ever appear inside job copy, never in the doc's
 * TECHNICAL SKILLS section. Used with the skills vocabulary to guess a job's
 * chips when it has no "Tech:" line yet.
 */
const BLURB_TECH = [
  'NestJS',
  'PostgreSQL',
  'Stripe',
  'Electron',
  'Node',
  'Web3.js',
  'Solidity',
  'Spectron',
  'Monorepo',
  'MCP',
];

/** First sentence of the copy, for a card one-liner when "Summary:" is absent. */
function firstSentence(text, max = 130) {
  const flat = text.replace(/\s+/g, ' ').trim();
  const stop = /[.!?](\s|$)/.exec(flat);
  const s = stop ? flat.slice(0, stop.index + 1) : flat;
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

/**
 * Alternate spellings to search for, so a skills entry like "Vue.js" still
 * matches prose that says "Vue/TypeScript", and "JavaScript ES2025" matches
 * a bare "JavaScript".
 */
function aliasesOf(term) {
  const out = new Set([term]);
  out.add(term.replace(/\.(js|com)$/i, '')); // Vue.js → Vue
  out.add(term.replace(/\s+ES\d{4}$/i, '')); // JavaScript ES2025 → JavaScript
  out.add(term.split('/')[0].trim()); // Vue reactivity/composables → Vue reactivity
  return [...out].filter((t) => t.length > 2);
}

/** Tech names mentioned in the copy, longest-first so "React Native" beats "React". */
function guessTech(text, vocabulary) {
  const found = [];
  const byLength = [...vocabulary].sort((a, b) => b.length - a.length);
  for (const term of byLength) {
    if (found.includes(term)) continue;
    const hit = aliasesOf(term).some((alias) => {
      const esc = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^\\w.])${esc}([^\\w.]|$)`, 'i').test(text);
    });
    if (hit) found.push(term);
  }
  return found;
}

// ---------------------------------------------------------------------------
// Section parsers
// ---------------------------------------------------------------------------

function parseHeader(blocks) {
  const [nameBlock, titleBlock, ...rest] = blocks;
  const titleLine = titleBlock?.text ?? '';
  const commaAt = titleLine.indexOf(',');
  const contactText = rest.map((b) => b.text).join(' ');
  const links = rest.flatMap((b) => b.links);

  const phone =
    /(\+?[\d][\d\s()–-]{8,}\d)/.exec(contactText)?.[1]?.trim() ?? '';
  const email =
    links.find((l) => l.href.startsWith('mailto:'))?.href.slice(7) ?? '';

  return {
    name: nameBlock?.text ?? '',
    title: commaAt === -1 ? titleLine : titleLine.slice(0, commaAt).trim(),
    location: commaAt === -1 ? '' : titleLine.slice(commaAt + 1).trim(),
    contacts: {
      phone,
      email,
      links: links
        .filter((l) => !l.href.startsWith('mailto:'))
        .map((l) => l.href),
    },
  };
}

function parseSkills(blocks) {
  const out = [];
  for (const b of blocks) {
    const colon = b.text.indexOf(':');
    if (colon === -1) continue;
    const category = b.text.slice(0, colon).trim();
    const items = splitList(b.text.slice(colon + 1));
    if (category && items.length) out.push({ category, items });
  }
  return out;
}

function parseEducation(blocks) {
  const out = [];
  for (let i = 0; i < blocks.length; i += 2) {
    const field = blocks[i]?.text;
    const where = blocks[i + 1]?.text ?? '';
    if (!field) continue;
    const years = /(\d{4}\s*[–—-]\s*\d{4})\s*$/.exec(where);
    out.push({
      field,
      school: years
        ? where.slice(0, years.index).replace(/,\s*$/, '').trim()
        : where,
      years: years ? years[1].replace(/\s*[–—-]\s*/, '–') : '',
    });
  }
  return out;
}

/**
 * Jobs are anchored on the date line: the paragraph above it is the role, the
 * one below is the company. Everything up to the next date line is body copy —
 * optional "Summary:"/"Tech:" lines, a lead paragraph, and bullets.
 */
function parseExperience(blocks) {
  const dateAt = [];
  blocks.forEach((b, i) => {
    if (b.type === 'p' && DATE_RE.test(b.text)) dateAt.push(i);
  });

  return dateAt.map((di, n) => {
    const roleRaw = blocks[di - 1]?.text ?? '';
    const companyBlock = blocks[di + 1];
    const { company, location } = splitCompanyLine(companyBlock?.text ?? '');

    // Body runs from just after the company line to just before the next
    // job's role line (which sits one above the next date line).
    const end = n + 1 < dateAt.length ? dateAt[n + 1] - 1 : blocks.length;
    const body = blocks.slice(di + 2, end);

    let short = null;
    let tech = null;
    const lead = [];
    const bullets = [];

    for (const b of body) {
      if (b.type === 'li') {
        bullets.push(b.text);
        continue;
      }
      const s = takeLabelled(b.text, 'Summary');
      if (s !== null) {
        short = s;
        continue;
      }
      const t = takeLabelled(b.text, 'Tech');
      if (t !== null) {
        tech = splitList(t);
        continue;
      }
      lead.push(b.text);
    }

    const description = lead.join('\n');
    const blurb = bullets.length
      ? [description, ...bullets.map((t) => `• ${t}`)]
          .filter(Boolean)
          .join('\n')
      : description;

    return {
      id: slugify(company),
      role: ROLE_DISPLAY[roleRaw] ?? roleRaw,
      period: normalisePeriod(blocks[di].text),
      periodRaw: blocks[di].text,
      company,
      companyRaw: companyBlock?.text ?? '',
      location,
      url: companyBlock?.links?.[0]?.href ?? null,
      short,
      tech,
      description,
      bullets,
      blurb,
    };
  });
}

/**
 * Fills in short/tech for jobs the doc doesn't spell out yet, and records
 * which fields were guessed so the site (and the run log) can tell them apart.
 */
function applyFallbacks(experience, skills) {
  const vocabulary = [
    ...new Set([...skills.flatMap((s) => s.items), ...BLURB_TECH]),
  ];
  return experience.map((e) => {
    const derived = [];
    let { short, tech } = e;
    if (!short) {
      short = firstSentence(e.description || e.bullets[0] || '');
      derived.push('short');
    }
    if (!tech?.length) {
      tech = guessTech(e.blurb, vocabulary);
      derived.push('tech');
    }
    return { ...e, short, tech, derived };
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function parse(html) {
  const blocks = toBlocks(html);

  // Split into header + named sections.
  const sections = { header: [] };
  let current = 'header';
  for (const b of blocks) {
    const key = SECTIONS[b.text.toUpperCase()];
    if (b.type === 'p' && key) {
      current = key;
      sections[current] = [];
      continue;
    }
    (sections[current] ??= []).push(b);
  }

  const skills = parseSkills(sections.skills ?? []);
  const experience = applyFallbacks(
    parseExperience(sections.experience ?? []),
    skills,
  );

  return {
    $comment: 'Generated by scripts/parse-resume.mjs — do not edit by hand.',
    source: DOC_URL,
    ...parseHeader(sections.header),
    summary: (sections.summary ?? []).map((b) => b.text).join('\n'),
    skills,
    experience,
    education: parseEducation(sections.education ?? []),
  };
}

/** Warns about anything the site will render oddly, rather than silently coping. */
function report(data) {
  const warn = (m) => console.warn(`  ! ${m}`);
  console.log(
    `\nParsed ${data.experience.length} jobs, ${data.skills.length} skill groups.`,
  );

  const noShort = data.experience.filter((e) => e.derived.includes('short'));
  const noTech = data.experience.filter((e) => e.derived.includes('tech'));
  if (noShort.length) {
    warn(
      `no "Summary:" line — card copy derived from the lead sentence: ${noShort.map((e) => e.company).join(', ')}`,
    );
  }
  if (noTech.length) {
    warn(
      `no "Tech:" line — chips derived by keyword match: ${noTech.map((e) => e.company).join(', ')}`,
    );
  }
  for (const e of data.experience) {
    if (!e.tech.length)
      warn(
        `${e.company}: no technologies found at all — card will have no chips`,
      );
  }
  for (const e of data.experience) {
    if (!e.role) warn(`${e.company}: no role line found above the date`);
    if (!e.blurb) warn(`${e.company}: empty description`);
  }
  console.log('');
}

const args = process.argv.slice(2);
const fileArg = args.indexOf('--file');
const outArg = args.indexOf('--out');
const out = outArg !== -1 ? resolve(args[outArg + 1]) : OUT;

const html =
  fileArg !== -1
    ? readFileSync(resolve(args[fileArg + 1]), 'utf8')
    : await fetch(DOC_URL).then((r) => {
        if (!r.ok) throw new Error(`${DOC_URL} → HTTP ${r.status}`);
        return r.text();
      });

const data = parse(html);
report(data);
writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
console.log(`→ ${out.replace(ROOT + '/', '')}`);
