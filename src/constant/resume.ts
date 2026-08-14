import resume from '@/data/resume.json';

/**
 * The resume as a PDF.
 *
 * Derived from the Google Doc the content itself is parsed from — the parser
 * records that doc's export URL as `source` (see `scripts/parse-resume.mjs`) —
 * so the download and the page it sits on can never point at two different
 * documents. Moving to a new doc is a one-line change in the parser.
 */
export const resumePdfUrl = resume.source.replace('format=html', 'format=pdf');
