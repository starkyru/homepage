/** Text normalisation shared by wiki retrieval. Pure, no corpus knowledge. */

/**
 * Lowercases, turns separators and punctuation into spaces, and collapses
 * whitespace. `.`, `+` and `#` survive: they are part of Next.js, C++ and C#.
 */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.+#]+/gu, ' ')
    .trim();
}

/**
 * The forms a name can take once normalised. `Next.js` has to match a question
 * saying "next.js", "nextjs" or "next js", and none of the three can be derived
 * from the others by a single rewrite.
 */
function variants(value: string): string[] {
  const base = normalize(value);
  if (!base.includes('.')) return [base];
  return [
    ...new Set([
      base,
      base.replace(/\./g, ''),
      normalize(base.replace(/\./g, ' ')),
    ]),
  ].filter(Boolean);
}

/** True when `needle` appears in `haystack` on word boundaries. */
function contains(haystack: string, needle: string): boolean {
  if (!needle) return false;
  for (
    let at = haystack.indexOf(needle);
    at !== -1;
    at = haystack.indexOf(needle, at + 1)
  ) {
    const before = haystack[at - 1];
    const after = haystack[at + needle.length];
    if (!isWordChar(before) && !isWordChar(after)) return true;
  }
  return false;
}

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[\p{L}\p{N}]/u.test(char);
}

/** True when any spelling of `name` is mentioned in the normalised `text`. */
export function mentions(text: string, name: string): boolean {
  return variants(name).some((variant) => contains(text, variant));
}

const STOPWORDS = new Set([
  'about',
  'and',
  'any',
  'are',
  'been',
  'build',
  'built',
  'code',
  'did',
  'does',
  'experience',
  'for',
  'from',
  'has',
  'have',
  'him',
  'his',
  'how',
  'ilia',
  'many',
  'much',
  'project',
  'projects',
  'tell',
  'that',
  'the',
  'their',
  'them',
  'they',
  'this',
  'used',
  'uses',
  'using',
  'was',
  'were',
  'what',
  'when',
  'where',
  'which',
  'with',
  'work',
  'worked',
  'you',
  'your',
]);

/**
 * Content words of length 4+, deduplicated, for weak body-overlap scoring.
 * Sentence punctuation is trimmed from the edges but kept inside a name, so
 * "uses Next.js." yields `next.js` rather than `next.js.`.
 */
export function contentTokens(text: string): string[] {
  const tokens = normalize(text)
    .split(' ')
    .map((token) => token.replace(/^[.+#]+|[.+#]+$/g, ''))
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token));
  return [...new Set(tokens)];
}

/** Compares tokens ignoring a regular plural, so "libraries" reaches "library". */
export function sameStem(a: string, b: string): boolean {
  return stem(a) === stem(b);
}

function stem(token: string): string {
  return token.replace(/ies$/, 'y').replace(/(?<![su])s$/, '');
}
