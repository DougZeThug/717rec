import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router';

const SCROLL_POSITIONS_KEY = 'scroll_positions';

// Configuration constants for scroll restoration
/** Maximum number of retry attempts before giving up on scroll restoration */
const SCROLL_RESTORE_MAX_RETRIES = 20;
/** Base delay between retries (uses exponential backoff: 16ms, 32ms, 64ms...) */
const SCROLL_RESTORE_BASE_DELAY_MS = 16;
/** Delay before resetting the isRestoring flag after successful restoration */
const IS_RESTORING_RESET_DELAY_MS = 100;

/**
 * Hook to save and restore scroll position for a route.
 * Call this in components where you want to preserve scroll position
 * when navigating back from a child route.
 *
 * Uses exponential backoff for robust scroll restoration after DOM renders.
 */
export const useScrollRestoration = (routeKey?: string) => {
  const location = useLocation();
  const key = routeKey || location.pathname;
  const isRestoring = useRef(false);
  const pendingTimeoutRef = useRef<number | null>(null);

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isRestoring.current) return;

      try {
        const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITIONS_KEY) || '{}');
        positions[key] = window.scrollY;
        sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
      } catch (e) {
        // Ignore storage errors
      }
    };

    // Throttle scroll saves using requestAnimationFrame
    let ticking = false;
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
  }, [key]);

  // Restore scroll position on mount (only when navigating back)
  // Using useLayoutEffect to run synchronously after DOM mutations but before paint
  useLayoutEffect(() => {
    // Check if this is a back/forward navigation
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const isBackNavigation = navEntries.length > 0 && navEntries[0].type === 'back_forward';

    // Only restore on back/forward navigation
    if (!isBackNavigation) return;

    let retryCount = 0;

    try {
      const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITIONS_KEY) || '{}');
      const savedPosition = positions[key];

      if (savedPosition !== undefined && savedPosition > 0) {
        isRestoring.current = true;

        const restoreScroll = () => {
          // Clean up if we've exceeded max retries
          if (retryCount >= SCROLL_RESTORE_MAX_RETRIES) {
            isRestoring.current = false;
            return;
          }

          // Only scroll if document height can accommodate the position
          if (document.documentElement.scrollHeight >= savedPosition) {
            window.scrollTo(0, savedPosition);
            pendingTimeoutRef.current = window.setTimeout(() => {
              isRestoring.current = false;
              pendingTimeoutRef.current = null;
            }, IS_RESTORING_RESET_DELAY_MS);
          } else {
            // Content not ready yet, retry with exponential backoff
            retryCount++;
            const delay = SCROLL_RESTORE_BASE_DELAY_MS * Math.pow(2, Math.min(retryCount - 1, 6));
            pendingTimeoutRef.current = window.setTimeout(restoreScroll, delay);
          }
        };

        // Start restoration on next frame to allow initial render
        requestAnimationFrame(restoreScroll);
      }
    } catch (e) {
      // Ignore storage errors
    }

    // Cleanup pending timeouts on unmount
    return () => {
      if (pendingTimeoutRef.current !== null) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
      isRestoring.current = false;
    };
  }, [key]);

  // Clear this route's position when navigating away to a different parent route
  const clearPosition = () => {
    try {
      const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITIONS_KEY) || '{}');
      delete positions[key];
      sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
    } catch (e) {
      // Ignore storage errors
    }
  };

  return { clearPosition };
};

export default useScrollRestoration;
