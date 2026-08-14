/**
 * Whether the chain's bottom accordion is currently up and expanded.
 *
 * The chat launcher shares that corner of the screen and shrinks to its icon
 * while the accordion is open, but the two live in different subtrees — the
 * launcher is mounted in the root layout, the accordion sits deep inside the
 * chain — so the flag is held here rather than threaded through `SiteShell`.
 * Nothing in the chain re-renders when it changes; only the launcher subscribes.
 *
 * Keyed by source because the desktop and mobile chains each own an accordion.
 * A single boolean would let whichever unmounts last clear a flag the other
 * still holds, which is exactly what resizing across the breakpoint does.
 */
const openSources = new Set<string>();
const listeners = new Set<() => void>();

export function setAccordionOpen(source: string, open: boolean): void {
  const was = openSources.size > 0;
  if (open) openSources.add(source);
  else openSources.delete(source);
  const now = openSources.size > 0;
  if (was === now) return; // no subscriber can tell the difference
  for (const notify of listeners) notify();
}

export function subscribeAccordion(notify: () => void): () => void {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

export function accordionIsOpen(): boolean {
  return openSources.size > 0;
}

/** No chain has mounted during SSR, so the launcher renders at full width. */
export function accordionIsOpenOnServer(): boolean {
  return false;
}
