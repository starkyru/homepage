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
 * ALL-CAPS section headings, and inside the experience section a
 * "<company>, <location> | <dates>" line that anchors each job, with the role
 * on the line above it.
 *
 * Usage: node scripts/parse-resume.mjs [--file <path>] [--out <path>]
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DOC_ID = '1oxn2bRkMuQwXhhtCsQjGh1nOx8IgZ9ME9H8p7iNnJrM';
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

// A span of dates: "03/2026 – Present", "08/2023 – 02/2026", "1999 – 2018".
const PERIOD = String.raw`(?:\d{1,2}\/)?\d{4}\s*[–—-]\s*(?:present|current|(?:\d{1,2}\/)?\d{4})`;
const PERIOD_RE =
  /^(?:\d{1,2}\/)?(\d{4})\s*[–—-]\s*(present|current|(?:\d{1,2}\/)?(\d{4}))$/i;

// A job's anchor line: "CrossCountry Mortgage, Charlotte, NC | 08/2023 – 02/2026".
const JOB_RE = new RegExp(`^(.+?)\\s*\\|\\s*(${PERIOD})$`, 'i');

// Header contact fields, each recognised by shape rather than by position, so
// the doc can reorder them or drop one without breaking the rest.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?\d[\d\s()–-]{8,}\d$/;
// A link the doc writes as bare text: "github.com/starkyru", "ilia.to".
const URL_RE = /^(?:https?:\/\/)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?$/i;

/**
 * Display names for companies whose doc spelling isn't what the site shows.
 * Legal suffixes and TLDs are stripped automatically; this map only covers
 * what stripping can't derive.
 */
const COMPANY_DISPLAY = {
  // The doc names the studio by its domain; the site spells it out.
  'Overtone.art': 'Overtone Art',
  // No company name to strip down to — a synthetic bucket for two decades of
  // work. `lib/structured-data.ts` keys off the id this produces ("earlier") to
  // keep the bucket out of the JSON-LD employment history, so renaming it here
  // silently invents an employer there.
  'Multiple companies, USA and Russia': 'Earlier',
};

/**
 * Employer sites. The doc used to carry these as hyperlinks on the company
 * line and no longer does, so they are kept here rather than dropped from the
 * cards. A hyperlink in the doc still wins over this map, and a company in
 * neither is reported by `report()` rather than guessed at from its name — a
 * derived domain lands on whoever owns it today, not on the former employer.
 */
const COMPANY_URL = {
  'Overtone Art': 'https://overtone.art',
  'CrossCountry Mortgage': 'https://crosscountrymortgage.com/',
  TrueCar: 'http://truecar.com/',
  Ankr: 'http://ankr.com',
};

/**
 * Display names for technologies whose doc spelling isn't what the site shows.
 * The doc writes a pinned version and a protocol's full name; a stack-ball disc
 * and a card chip have room for neither, and "React 19" alongside "React" is
 * the same technology listed twice. Renaming here rather than in the view keeps
 * the JSON, the static resume and `/llms.txt` saying one thing.
 */
const SKILL_DISPLAY = {
  'React 19': 'React',
  'Model Context Protocol (MCP)': 'MCP',
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

/** "03/2026 – Present" → "2026–now"; "01/2018 – 12/2018" → "2018". */
function normalisePeriod(raw) {
  const m = PERIOD_RE.exec(raw);
  if (!m) return raw;
  const start = m[1];
  const openEnded = /present|current/i.test(m[2]);
  if (openEnded) return `${start}–now`;
  const end = m[3];
  return start === end ? start : `${start}–${end}`;
}

/** "TrueCar Inc, San Francisco, CA" → { company, location }. */
function splitCompanyLine(raw) {
  // Whole-line overrides win first: the early-career entry has no company name
  // to strip down to ("Multiple companies, USA and Russia").
  if (COMPANY_DISPLAY[raw])
    return { company: COMPANY_DISPLAY[raw], location: '' };

  // Otherwise the company is everything before the first comma (a place name).
  const parts = raw.split(',').map((p) => p.trim());
  const named = parts.shift() ?? '';
  const location = parts.join(', ');
  const bare = named
    .replace(/\s+(LLC|Inc|Ltd|GmbH|Corp)\.?$/i, '')
    .replace(/\.(com|io|art|co)$/i, '')
    .trim();
  // Looked up both before and after stripping, so an entry can be written the
  // way the doc spells it ("Overtone.art") or the way stripping leaves it.
  const company = COMPANY_DISPLAY[named] ?? COMPANY_DISPLAY[bare] ?? bare;
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

/**
 * Splits a comma/semicolon list, ignoring separators nested in parentheses so
 * "AI-assisted development workflows (Claude Code, Codex, GitHub Copilot)"
 * stays one entry instead of three fragments with unbalanced brackets.
 */
function splitList(s) {
  const out = [];
  let depth = 0;
  let buf = '';
  for (const ch of s) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === ',' || ch === ';')) {
      out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  out.push(buf.trim());
  return out.filter(Boolean);
}

/** A technology list, renamed to the site's spelling and de-duplicated. */
function skillList(s) {
  const named = splitList(s).map((t) => SKILL_DISPLAY[t] ?? t);
  return named.filter((t, i) => named.indexOf(t) === i);
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
  const bare = term.replace(/\s*\([^)]*\)\s*$/, '').trim(); // JavaScript (ES2025) → JavaScript
  out.add(bare);
  out.add(bare.replace(/\.(js|com)$/i, '')); // Vue.js → Vue
  out.add(bare.replace(/\s+ES\d{4}$/i, '')); // JavaScript ES2025 → JavaScript
  out.add(bare.split('/')[0].trim()); // Vue reactivity/composables → Vue reactivity
  // "Model Context Protocol (MCP)" should also match a bare "MCP" in job copy.
  const paren = /\(([^)]+)\)\s*$/.exec(term)?.[1]?.trim();
  if (paren && !/\s/.test(paren)) out.add(paren);
  return [...out].filter((t) => t.length > 2);
}

/** Tech names mentioned in the copy, longest-first so "React Native" beats "React". */
function guessTech(text, vocabulary) {
  const found = [];
  // Spellings already spoken for by a longer term, so the same technology does
  // not come back a second time under a shorter name — "Model Context Protocol
  // (MCP)" and "MCP" are one chip on the card, not two.
  const claimed = new Set();
  const byLength = [...vocabulary].sort((a, b) => b.length - a.length);
  for (const term of byLength) {
    const aliases = aliasesOf(term);
    if (aliases.some((a) => claimed.has(a.toLowerCase()))) continue;
    const hit = aliases.some((alias) => {
      const esc = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^\\w.])${esc}([^\\w.]|$)`, 'i').test(text);
    });
    if (!hit) continue;
    found.push(term);
    for (const a of aliases) claimed.add(a.toLowerCase());
  }
  return found;
}

// ---------------------------------------------------------------------------
// Section parsers
// ---------------------------------------------------------------------------

/**
 * Name, then title, then pipe-separated contact lines. The doc writes its
 * contact details as plain text rather than as hyperlinks, so each field is
 * classified by shape and the bare domains are given a scheme.
 */
function parseHeader(blocks) {
  const [nameBlock, titleBlock, ...rest] = blocks;
  const anchors = rest.flatMap((b) => b.links);

  let email =
    anchors.find((l) => l.href.startsWith('mailto:'))?.href.slice(7) ?? '';
  const links = anchors
    .filter((l) => !l.href.startsWith('mailto:'))
    .map((l) => l.href);
  let phone = '';
  let location = '';

  for (const b of rest) {
    for (const field of b.text.split('|').map((f) => f.trim())) {
      if (!field) continue;
      if (EMAIL_RE.test(field)) email ||= field;
      else if (PHONE_RE.test(field)) phone ||= field;
      else if (URL_RE.test(field)) {
        const href = /^https?:\/\//i.test(field) ? field : `https://${field}`;
        if (!links.includes(href)) links.push(href);
      } else location ||= field;
    }
  }

  return {
    name: nameBlock?.text ?? '',
    title: titleBlock?.text ?? '',
    location,
    contacts: { phone, email, links },
  };
}

function parseSkills(blocks) {
  const out = [];
  for (const b of blocks) {
    const colon = b.text.indexOf(':');
    if (colon === -1) continue;
    const category = b.text.slice(0, colon).trim();
    const items = skillList(b.text.slice(colon + 1));
    if (category && items.length) out.push({ category, items });
  }
  return out;
}

/**
 * One line per entry: "<field> — <school>", with optional trailing years.
 * A line with no dash is all field and no school, rather than the reverse —
 * "Applied Mathematics" alone still says something; a bare university does not.
 */
function parseEducation(blocks) {
  const out = [];
  for (const b of blocks) {
    const split = /^(.+?)\s+[—–]\s+(.+)$/.exec(b.text);
    const field = (split ? split[1] : b.text).trim();
    const where = split ? split[2].trim() : '';
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
 * Jobs are anchored on the "<company>, <location> | <dates>" line, with the
 * role on the paragraph above it. Everything up to the next anchor is body
 * copy — optional "Summary:"/"Tech:" lines, a lead paragraph, and bullets.
 */
function parseExperience(blocks) {
  const jobAt = [];
  blocks.forEach((b, i) => {
    if (b.type === 'p' && JOB_RE.test(b.text)) jobAt.push(i);
  });

  return jobAt.map((ji, n) => {
    const anchor = blocks[ji];
    const [, companyLine, periodRaw] = JOB_RE.exec(anchor.text);
    const roleRaw = blocks[ji - 1]?.text ?? '';
    const { company, location } = splitCompanyLine(companyLine);

    // Body runs from just after the anchor to just before the next job's role
    // line (which sits one above the next anchor).
    const end = n + 1 < jobAt.length ? jobAt[n + 1] - 1 : blocks.length;
    const body = blocks.slice(ji + 1, end);

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
        tech = skillList(t);
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
      role: roleRaw,
      period: normalisePeriod(periodRaw),
      periodRaw,
      company,
      companyRaw: companyLine,
      location,
      url: anchor.links[0]?.href ?? COMPANY_URL[company] ?? null,
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
    if (!e.role) warn(`${e.company}: no role line found above the anchor`);
    if (!e.blurb) warn(`${e.company}: empty description`);
    if (!e.url)
      warn(
        `${e.company}: no employer link — hyperlink the company in the doc, or add it to COMPANY_URL`,
      );
  }
  console.log('');
}

/**
 * A doc whose shape has drifted parses to a plausible-looking but empty
 * record, and the site renders it without complaint. Fail the run instead:
 * the output is committed, so a silent empty parse ships.
 */
function assertParsed(data) {
  const missing = [];
  if (!data.name) missing.push('name');
  if (!data.summary) missing.push('summary');
  if (!data.skills.length) missing.push('skills');
  if (!data.experience.length) missing.push('experience');
  if (!data.education.length) missing.push('education');
  if (missing.length) {
    throw new Error(
      `parsed nothing for: ${missing.join(', ')} — the doc's structure has changed, ` +
        `see the section parsers in this file`,
    );
  }
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
assertParsed(data);
report(data);
writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
console.log(`→ ${out.replace(ROOT + '/', '')}`);
