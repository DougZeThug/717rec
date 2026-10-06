import { useEffect } from 'react';

/**
 * Raise the browser's own leave warning while `active` is true.
 *
 * Covers leaving the site only: typing an address, reloading or closing the
 * tab. It does not ask about in-app links or Back; `useUnsavedChangesGuard`
 * does that, and calls this hook for the part that leaves the site.
 */
export const useBeforeUnloadWarning = (active: boolean): void => {
  useEffect(() => {
    // Explicitly undefined rather than a bare return: every path out of this
    // callback returns a value, which is what marks it as a cleanup or not.
    if (!active) return undefined;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Browsers show their own wording and ignore ours; this is what asks.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [active]);
};
