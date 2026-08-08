#!/usr/bin/env node
/**
 * Downloads any Simple Icons SVG referenced by src/data/tech-logos.json that
 * isn't already in public/logos, recoloured to the site's amber.
 *
 * Simple Icons is CC0, so the SVGs are vendored rather than fetched at runtime.
 *
 * Usage: node scripts/fetch-logos.mjs [--force]
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAP = resolve(ROOT, 'src/data/tech-logos.json');
const DEST = resolve(ROOT, 'public/logos');
const CDN = 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons';

const AMBER = '#e0a458'; // palette.amber — matches the logos already vendored

const force = process.argv.includes('--force');
const map = JSON.parse(readFileSync(MAP, 'utf8'));
const slugs = [
  ...new Set(
    Object.entries(map)
      .filter(([k]) => !k.startsWith('$'))
      .map(([, v]) => v),
  ),
];

let fetched = 0;
let skipped = 0;
const failed = [];

for (const slug of slugs.sort()) {
  const file = resolve(DEST, `${slug}.svg`);
  if (existsSync(file) && !force) {
    skipped++;
    continue;
  }
  const res = await fetch(`${CDN}/${slug}.svg`);
  if (!res.ok) {
    failed.push(`${slug} (HTTP ${res.status})`);
    continue;
  }
  const svg = (await res.text()).replace(/<svg\b/, `<svg fill="${AMBER}"`);
  writeFileSync(file, svg);
  console.log(`  + ${slug}.svg`);
  fetched++;
}

console.log(`\n${fetched} fetched, ${skipped} already present.`);
if (failed.length) {
  console.error(`\n! no Simple Icons entry for: ${failed.join(', ')}`);
  console.error(
    '  Fix the slug in src/data/tech-logos.json, or drop the entry',
  );
  console.error('  and let the label render as a text disc instead.');
  process.exit(1);
}
