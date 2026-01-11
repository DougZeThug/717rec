import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * React hook to determine if the current viewport is mobile-sized
 * Uses matchMedia API to avoid forced reflow from reading window dimensions
 * @returns {boolean} True if the viewport is considered mobile-sized
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    // SSR-safe: check if matchMedia exists and get initial value
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
    }
    return false;
  });

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.matchMedia) return;

    // Use matchMedia to avoid forced reflow from reading innerWidth
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    // Handler for media query changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Modern browsers use addEventListener, older use addListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Clean up
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return isMobile;
}

export { useIsMobile as useMobile };
