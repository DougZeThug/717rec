/**
 * Knowing whether anything on screen has unsaved work.
 *
 * The admin console is one page: choosing another section unmounts the one on
 * screen and everything it held. The shell has to ask "is there unsaved work?"
 * from inside a click handler, before it navigates, and the answer has to come
 * from a component several levels below it that is about to disappear.
 *
 * This registry is that channel, in the same spirit as `utils/adminTabs`.
 * Components register through `useUnsavedChangesGuard`; the shell asks here.
 *
 * `window.confirm` rather than a styled dialog on purpose: it is the only thing
 * that can answer while the click is still being handled. Everything goes
 * through one function, so it can be replaced later without touching callers.
 */

export interface UnsavedWorkSource {
  /** Read at the moment of asking, never cached. */
  isDirty: () => boolean;
  /** What the admin is asked before their work is thrown away. */
  message: string;
}

const sources = new Set<UnsavedWorkSource>();

/** Register a source of unsaved work. Returns a function that removes it. */
export const registerUnsavedWork = (source: UnsavedWorkSource): (() => void) => {
  sources.add(source);
  return () => {
    sources.delete(source);
  };
};

/** The first source with unsaved work, or null when nothing is waiting. */
export const findUnsavedWork = (): UnsavedWorkSource | null => {
  for (const source of sources) {
    if (source.isDirty()) return source;
  }
  return null;
};

/**
 * True when it is safe to carry on: either nothing is unsaved, or the admin
 * said to discard it. False means they chose to stay.
 */
export const confirmDiscardUnsavedWork = (): boolean => {
  const unsaved = findUnsavedWork();
  if (!unsaved) return true;
  return window.confirm(unsaved.message);
};

/** Test helper: the registry is module state and outlives a single render. */
export const clearUnsavedWork = (): void => {
  sources.clear();
};
