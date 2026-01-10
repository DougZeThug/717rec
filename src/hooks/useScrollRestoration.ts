import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

const SCROLL_POSITIONS_KEY = 'scroll_positions';

/**
 * Hook to save and restore scroll position for a route.
 * Call this in components where you want to preserve scroll position
 * when navigating back from a child route.
 */
export const useScrollRestoration = (routeKey?: string) => {
  const location = useLocation();
  const key = routeKey || location.pathname;
  const isRestoring = useRef(false);

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

    // Throttle scroll saves
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
  useEffect(() => {
    // Check if this is a back/forward navigation
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const isBackNavigation = navEntries.length > 0 && navEntries[0].type === 'back_forward';

    // Only restore on back/forward navigation
    if (!isBackNavigation) return;

    try {
      const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITIONS_KEY) || '{}');
      const savedPosition = positions[key];

      if (savedPosition !== undefined && savedPosition > 0) {
        isRestoring.current = true;
        // Wait for content to render before restoring scroll
        // Use multiple frames to ensure layout is complete
        const restoreScroll = () => {
          // Only scroll if document height can accommodate the position
          if (document.documentElement.scrollHeight >= savedPosition) {
            window.scrollTo(0, savedPosition);
            setTimeout(() => {
              isRestoring.current = false;
            }, 100);
          } else {
            // Content not ready yet, try again
            requestAnimationFrame(restoreScroll);
          }
        };

        // Start after a short delay to allow initial render
        setTimeout(() => {
          requestAnimationFrame(restoreScroll);
        }, 50);
      }
    } catch (e) {
      // Ignore storage errors
    }
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
