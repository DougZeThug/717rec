/**
 * Runs `work` after `delayMs`, then at the first idle moment — or within
 * `idleDeadlineMs` of that if the page never goes quiet.
 *
 * `requestIdleCallback`'s own `timeout` option is a *deadline*, not a delay: on
 * its own it runs the work at the next idle gap, which on a normal load is
 * moments after the first paint rather than the several seconds a large timeout
 * suggests. Waiting first is what actually keeps heavy, non-critical work out
 * of the way; the idle request afterwards only avoids landing it in the middle
 * of something else.
 */
export const runAfterDelayWhenIdle = (
  work: () => void,
  delayMs: number,
  idleDeadlineMs = 3000
): void => {
  setTimeout(() => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => work(), { timeout: idleDeadlineMs });
    } else {
      work();
    }
  }, delayMs);
};
