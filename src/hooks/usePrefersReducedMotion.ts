import { useEffect, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * React hook that reports whether the user has asked their operating system to
 * reduce motion.
 *
 * Most of the app honours the setting through the global CSS block in
 * `src/index.css`, and framer-motion honours it through `MotionConfig` in
 * `App.tsx`. Use this hook only where neither can reach: animation drawn on a
 * canvas, or a scroll call that passes `behavior: 'smooth'`.
 *
 * @returns {boolean} True if the user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    // SSR-safe: check if matchMedia exists and get initial value
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia(REDUCED_MOTION_QUERY).matches;
    }
    return false;
  });

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    // Handler for media query changes
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
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

  return prefersReducedMotion;
}

/**
 * Returns the scroll behaviour to pass to `window.scrollTo` and friends:
 * `'auto'` when the user has asked for reduced motion, `'smooth'` otherwise.
 */
export function useScrollBehavior(): ScrollBehavior {
  return usePrefersReducedMotion() ? 'auto' : 'smooth';
}
