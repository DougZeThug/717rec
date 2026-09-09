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
 * Covers two ways out: choosing another admin section, which the console shell
 * asks about before it navigates, and leaving the site, which the browser asks
 * about. Call `confirmDiscard` for a third — a Cancel button the component owns.
 *
 * It does **not** cover the browser's Back and Forward buttons. Blocking those
 * needs a react-router data router, and this app builds its routes the
 * declarative way; converting it would touch every route in the app. Back has
 * always lost this work, so nothing is worse than before, but it is worth
 * knowing. See UX audit A-07.
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
    if (!isDirty) return;

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
  // skipcq: JS-0052 -- a Cancel handler has to have its answer before it
  // returns, and confirm is the only thing that answers synchronously
  const confirmDiscard = useCallback(
    () => !latest.current.isDirty || window.confirm(latest.current.message),
    []
  );

  return { confirmDiscard };
};
