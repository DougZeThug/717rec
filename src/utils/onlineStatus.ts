import { onlineManager } from '@tanstack/react-query';

/**
 * Tells TanStack Query's `onlineManager` what the browser says, at startup.
 *
 * **Why this is needed.** The manager hardcodes its state to `true` and its
 * default setup only registers `online`/`offline` listeners — it never reads
 * `navigator.onLine`. So an app opened or restored while already offline
 * believes it has a connection: no transition ever fires, so nothing corrects
 * it. That would leave the offline banner hidden (UX audit X-12) and send a
 * live-scoring round down the ordinary save path, where it fails, instead of
 * parking it (LS-03) — the two things this is all here to prevent, in exactly
 * the case they matter most: a phone opened at a venue with no signal.
 *
 * `setEventListener` is the library's own extension point for this. It installs
 * the setup and runs it at once, and the manager re-runs it if every subscriber
 * ever goes away and one comes back, so the seed is not a one-off.
 */
export const initOnlineStatus = (): void => {
  onlineManager.setEventListener((setOnline) => {
    const update = () => setOnline(navigator.onLine !== false);

    // Seed from the browser now, rather than waiting for a change that may
    // never come.
    update();

    window.addEventListener('online', update, false);
    window.addEventListener('offline', update, false);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  });
};
