import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router';

const SCROLL_POSITIONS_KEY = 'scroll_positions';

// Configuration constants for scroll restoration
/** Maximum number of retry attempts before giving up on scroll restoration */
const SCROLL_RESTORE_MAX_RETRIES = 20;
/** Base delay between retries (uses exponential backoff: 16ms, 32ms, 64ms...) */
const SCROLL_RESTORE_BASE_DELAY_MS = 16;
/** Delay before resetting the isRestoring flag after successful restoration */
const IS_RESTORING_RESET_DELAY_MS = 100;
/** How often to check that the page has not drifted away from the saved spot, once it was reached */
const SETTLE_CHECK_INTERVAL_MS = 50;
/** The restore ends when no correction was needed for this long */
const SETTLE_QUIET_MS = 1000;
/** Hard limit: the restore ends this long after the saved spot was first reached */
const SETTLE_MAX_MS = 3000;
/** Reader input that means the reader has taken over the scroll, so a restore must give way */
const USER_INPUT_EVENTS = ['wheel', 'pointerdown', 'keydown', 'touchstart'] as const;

/**
 * Scrolls to `top` at once, with no glide (the site CSS sets smooth scrolling).
 * The browser stops at the end of the page, so `window.scrollY` may land short.
 * Falls back to the plain two-number call if a browser rejects the options.
 */
const jumpTo = (top: number) => {
  try {
    window.scrollTo({ top, left: 0, behavior: 'instant' });
  } catch (_e) {
    window.scrollTo(0, top);
  }
};

/**
 * Hook to save and restore scroll position for a route.
 * Call this in components where you want to preserve scroll position
 * when navigating back from a child route.
 *
 * Uses exponential backoff for robust scroll restoration after DOM renders.
 * The restore keeps trying until the page is long enough to reach the saved
 * position. It then keeps watching for a short while, because late content can
 * move the page again. It stops as soon as the reader scrolls on their own.
 */
const useScrollRestoration = (routeKey?: string) => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const key = routeKey || location.pathname;
  const isRestoring = useRef(false);

  // Save scroll position on scroll
  useEffect(() => {
    // The address this page lives at. A link click changes the address before the page is
    // swapped, and the shorter new page then pushes scrollY down (or ScrollToTop sends it to 0).
    // Those scroll events belong to the page being left, so they must not overwrite the saved spot.
    const startPath = window.location.pathname;

    /** Save the current scrollY for this route to sessionStorage (skipped during restore). */
    const handleScroll = () => {
      if (isRestoring.current) return;
      if (window.location.pathname !== startPath) return;

      try {
        const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITIONS_KEY) || '{}');
        positions[key] = window.scrollY;
        sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
      } catch (_e) {
        // Ignore storage errors
      }
    };

    // Throttle scroll saves using requestAnimationFrame
    let ticking = false;
    /** requestAnimationFrame throttle so scroll saves run at most once per frame. */
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledScroll);
  }, [key, location.pathname]);

  // Restore scroll position on mount (only when navigating back)
  // Using useLayoutEffect to run synchronously after DOM mutations but before paint
  useLayoutEffect(() => {
    // Only restore on back/forward (POP) navigation within the SPA
    const isBackNavigation = navigationType === 'POP';
    if (!isBackNavigation) return undefined;

    // The address this page lives at. If it changes, the page is being left and must not be scrolled.
    const startPath = window.location.pathname;
    let retryCount = 0;
    let cancelled = false;
    let frameId = 0;
    let timeoutId: number | null = null;

    /** Remove the reader-input listeners (safe to call more than once). */
    const removeInputListeners = () => {
      for (const type of USER_INPUT_EVENTS) window.removeEventListener(type, onUserInput);
    };

    /** Stop for good: no more attempts, no timers, no listeners, and saving is allowed again. */
    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      if (timeoutId !== null) clearTimeout(timeoutId);
      timeoutId = null;
      removeInputListeners();
      isRestoring.current = false;
    };

    /** The reader took over the scroll, so the restore must not pull them back. */
    function onUserInput(event: Event) {
      // A key that is still held down repeats. That is not a new choice by the reader.
      if (event instanceof KeyboardEvent && event.repeat) return;
      stop();
    }

    try {
      const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITIONS_KEY) || '{}');
      const savedPosition = positions[key];

      if (savedPosition !== undefined && savedPosition > 0) {
        isRestoring.current = true;
        for (const type of USER_INPUT_EVENTS) {
          window.addEventListener(type, onUserInput, { passive: true });
        }

        /** The restore is over: stop listening, then allow saving again after a moment. */
        const finish = () => {
          removeInputListeners();
          timeoutId = window.setTimeout(() => {
            isRestoring.current = false;
            timeoutId = null;
          }, IS_RESTORING_RESET_DELAY_MS);
        };

        /**
         * The saved spot was reached, but late content can still move the page: Chrome shifts
         * scrollY when content above the view changes size. Keep watching for a short while and
         * jump back whenever the page drifts. Ends after a quiet second, or at a hard limit.
         */
        const settle = () => {
          const reachedAt = Date.now();
          let lastCorrectionAt = reachedAt;

          const check = () => {
            if (cancelled) return;
            if (window.location.pathname !== startPath) {
              stop();
              return;
            }

            const now = Date.now();
            if (Math.abs(window.scrollY - savedPosition) > 1) {
              jumpTo(savedPosition);
              lastCorrectionAt = now;
            }

            if (now - lastCorrectionAt >= SETTLE_QUIET_MS || now - reachedAt >= SETTLE_MAX_MS) {
              finish();
              return;
            }
            timeoutId = window.setTimeout(check, SETTLE_CHECK_INTERVAL_MS);
          };

          timeoutId = window.setTimeout(check, SETTLE_CHECK_INTERVAL_MS);
        };

        /** Jump to the saved offset, and retry with backoff until the page is long enough to reach it. */
        const restoreScroll = () => {
          if (cancelled) return;
          if (window.location.pathname !== startPath) {
            stop();
            return;
          }

          // Give up if we've exceeded max retries
          if (retryCount >= SCROLL_RESTORE_MAX_RETRIES) {
            stop();
            return;
          }

          // The browser clamps the jump to the end of the page, so read back where it really landed.
          // A page that is still short goes as far as it can now and moves on when more content arrives.
          jumpTo(savedPosition);
          if (window.scrollY >= savedPosition - 1) {
            settle();
          } else {
            retryCount++;
            const delay = SCROLL_RESTORE_BASE_DELAY_MS * Math.pow(2, Math.min(retryCount - 1, 6));
            timeoutId = window.setTimeout(restoreScroll, delay);
          }
        };

        // Start restoration on next frame to allow initial render
        frameId = requestAnimationFrame(restoreScroll);
      }
    } catch (_e) {
      // Ignore storage errors
    }

    // Cancel everything on unmount so a later page is never scrolled by this one
    return stop;
  }, [key, navigationType]);
};

export default useScrollRestoration;
