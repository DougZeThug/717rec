import type { MutableRefObject } from 'react';
import { useRef } from 'react';

// Unique sentinel so the initializer runs exactly once, even when it
// legitimately returns null or undefined.
const UNINITIALIZED = Symbol('useLazyRef.uninitialized');

/**
 * Like 'useRef', but the initial value is produced by a factory that runs
 * exactly once (on first render) instead of being rebuilt and discarded on
 * every render. Use it for expensive initial values such as 'new Map()',
 * 'new Set()', or reading from storage.
 *
 * @param init - factory called once to produce the initial value
 * @returns a writable ref whose '.current' starts as 'init()'
 */
export function useLazyRef<T>(init: () => T): MutableRefObject<T> {
  const ref = useRef<T | typeof UNINITIALIZED>(UNINITIALIZED);
  // Reading and writing '.current' during render is the lazy-init pattern
  // endorsed by the React docs: it runs exactly once and the ref is never used
  // for rendering, so it is safe here. This is the single place that pattern
  // lives, which is why the rule is disabled only for this block.
  /* eslint-disable react-hooks/refs */
  if (ref.current === UNINITIALIZED) {
    ref.current = init();
  }
  /* eslint-enable react-hooks/refs */
  return ref as MutableRefObject<T>;
}
