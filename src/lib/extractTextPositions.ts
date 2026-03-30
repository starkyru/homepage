export interface ExtractedLetter {
  char: string;
  x: number;
  y: number;
  font: string;
}

const MAX_CHARS = 4000;

/**
 * Walk the DOM under `root`, extract every visible character with its
 * screen position and computed font. Uses Range.getBoundingClientRect()
 * for pixel-accurate placement that matches the rendered HTML layout.
 */
export function extractTextFromDOM(root: HTMLElement): ExtractedLetter[] {
  const letters: ExtractedLetter[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();

  let node: Node | null = walker.nextNode();
  while (node && letters.length < MAX_CHARS) {
    const text = node.textContent ?? '';
    if (!text.trim()) {
      node = walker.nextNode();
      continue;
    }

    const parent = node.parentElement;
    if (!parent) {
      node = walker.nextNode();
      continue;
    }

    // Skip hidden elements
    const style = getComputedStyle(parent);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0'
    ) {
      node = walker.nextNode();
      continue;
    }

    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

    for (let i = 0; i < text.length && letters.length < MAX_CHARS; i++) {
      const ch = text[i];
      // Skip whitespace (spaces, tabs, newlines)
      if (/\s/.test(ch)) continue;

      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rect = range.getBoundingClientRect();

      // Skip zero-size or off-screen characters
      if (rect.width === 0 || rect.height === 0) continue;

      letters.push({
        char: ch,
        x: rect.left,
        y: rect.top + rect.height * 0.75, // approximate baseline
        font,
      });
    }

    node = walker.nextNode();
  }

  range.detach();
  return letters;
}
