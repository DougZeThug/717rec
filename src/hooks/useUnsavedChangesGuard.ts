import { useCallback, useEffect, useRef } from 'react';

import { registerUnsavedWork } from '@/utils/unsavedChanges';

const DEFAULT_MESSAGE = 'You have unsaved changes. Leave and lose them?';

interface UnsavedChangesGuard {
  /**
   * Ask before throwing the work away, for a Cancel or Close button that the
   * component owns. True means carry on.
   */
  confirmDiscard: () => boolean;
}

/**
 * Warn before unsaved work is lost.
 *
 * Registering here is all a screen has to do. Three things then ask on its
 * behalf, each covering a way out the others cannot reach:
 *
 * - **A click** — a header link, the logo, a menu item, a phone tab, the search
 *   palette, an admin section switch. Asked about in the click handler, by
 *   `confirmLeavingClick` in `utils/unsavedChanges`, so a refusal can leave the
 *   screen and its menus exactly as they were.
 * - **Back and Forward** — no click to hang a handler on, so `UnsavedWorkBlocker`
 *   catches them at the router instead. See UX audit A-07.
 * - **Leaving the site**, by typing an address, reloading or closing the tab —
 *   the `beforeunload` listener below, which raises the browser's own warning.
 *
 * Call `confirmDiscard` for a fourth: a Cancel button the component owns.
 *
 * Takes a plain boolean rather than a form state, because none of the screens
 * that need it use react-hook-form.
 */
export const useUnsavedChangesGuard = (
  isDirty: boolean,
  message: string = DEFAULT_MESSAGE
): UnsavedChangesGuard => {
  // Registered once and read through a ref, so a keystroke does not churn the
  // registry and the answer is never a stale copy of `isDirty`.
  const latest = useRef({ isDirty, message });
  useEffect(() => {
    latest.current = { isDirty, message };
  }, [isDirty, message]);

  useEffect(
    () =>
      registerUnsavedWork({
        isDirty: () => latest.current.isDirty,
        get message() {
          return latest.current.message;
        },
      }),
    []
  );

  useEffect(() => {
    // Explicitly undefined rather than a bare return: every path out of this
    // callback returns a value, which is what marks it as a cleanup or not.
    if (!isDirty) return undefined;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Browsers show their own wording and ignore ours; this is what asks.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // Asks about this component's own work, not whatever else is registered, so
  // a Cancel button always shows the message that belongs to it.
  const confirmDiscard = useCallback(() => {
    if (!latest.current.isDirty) return true;
    // skipcq: JS-0052 -- a Cancel handler has to have its answer before it
    // returns, and confirm is the only thing that answers synchronously
    return window.confirm(latest.current.message);
  }, []);

  return { confirmDiscard };
};
