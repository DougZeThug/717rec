import { useEffect } from 'react';
import { useBlocker } from 'react-router';

import { confirmDiscardUnsavedWork, findUnsavedWork } from '@/utils/unsavedChanges';

/**
 * Asks before the browser's Back or Forward button throws away unsaved work.
 *
 * Everything else that navigates is asked about where the click happens — a
 * header link, the logo, a menu item, a phone tab, the search palette, an admin
 * section switch. That is deliberate: a handler that runs during the click can
 * cancel it and leave the screen exactly as it was, menus still open.
 *
 * Back and Forward have no click to hang that on. The press reaches the router
 * first, so the router is where they have to be caught, and this is the only
 * thing that can catch them. It is mounted once, in the layout route, and so
 * covers every page.
 *
 * **Only POP.** Back and Forward are POP navigations; every click is a PUSH.
 * Limiting this to POP is what keeps the two guards from both asking about the
 * same click. See `utils/unsavedChanges.ts` for the other half.
 *
 * One press it cannot catch: Back onto a page from before the app loaded. The
 * router has no history entry of its own to undo, so the block quietly does
 * nothing — but that press leaves the document, which raises the browser's own
 * warning through the `beforeunload` listener in `useUnsavedChangesGuard`.
 */
export const UnsavedWorkBlocker = () => {
  const blocker = useBlocker(
    ({ historyAction, currentLocation, nextLocation }) =>
      historyAction === 'POP' &&
      currentLocation.pathname !== nextLocation.pathname &&
      findUnsavedWork() !== null
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    // The same question the rest of the app asks, so the wording and the answer
    // come from one place.
    if (confirmDiscardUnsavedWork()) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  return null;
};
