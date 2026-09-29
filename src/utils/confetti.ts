const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const SEEN_KEY_PREFIX = 'confetti-seen:';

// Blue and amber match the app's championship colours.
const CONFETTI_COLORS = ['#f59e0b', '#fbbf24', '#3b82f6', '#60a5fa', '#ffffff'];

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(REDUCED_MOTION_QUERY).matches;

/**
 * Fires one confetti burst. Confetti is only decoration, so this never throws
 * and does nothing when the user asked their device to reduce motion.
 *
 * The library loads on demand: it is only downloaded when a burst really fires.
 */
export const fireChampionConfetti = async (): Promise<void> => {
  if (prefersReducedMotion()) return;

  try {
    const { default: confetti } = await import('canvas-confetti');
    confetti({
      particleCount: 140,
      spread: 90,
      startVelocity: 45,
      origin: { y: 0.6 },
      colors: CONFETTI_COLORS,
    });
  } catch {
    // Decoration only. A failed load must never break the page.
  }
};

/**
 * Fires confetti once per browser tab session for a given key, so a champion
 * banner does not throw confetti on every re-render or page revisit.
 */
export const fireChampionConfettiOnce = async (key: string): Promise<void> => {
  const storageKey = `${SEEN_KEY_PREFIX}${key}`;
  try {
    if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, '1');
  } catch {
    // Storage can be blocked (private mode). Fire anyway.
  }
  await fireChampionConfetti();
};
