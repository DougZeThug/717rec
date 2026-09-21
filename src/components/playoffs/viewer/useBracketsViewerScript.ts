import { useEffect, useState } from 'react';

import { loadBracketStyles } from '@/styles/bracket-styles';
import { errorLog } from '@/utils/logger';

import { importViewerBundle } from './viewerBundleLoader';

let viewerLoadPromise: Promise<void> | null = null;

/**
 * Load the brackets-viewer library from the npm dependency (bundled by Vite
 * into its own lazy chunk — no runtime CDN fetch). Importing the bundle
 * executes its IIFE, which registers `window.bracketsViewer`. The version now
 * always matches the CSS, which was already bundled from the same package.
 */
const loadBracketsViewerScript = (): Promise<void> => {
  if (viewerLoadPromise) return viewerLoadPromise;

  if (window.bracketsViewer) {
    return Promise.resolve();
  }

  viewerLoadPromise = importViewerBundle()
    .then(() => undefined)
    .catch((error: unknown) => {
      // Clear the cached promise so the next mount retries the (chunk) load
      // instead of reusing this rejection forever. (Browsers do not cache
      // failed dynamic-import fetches, so the retry re-requests the chunk.)
      viewerLoadPromise = null;
      throw error instanceof Error ? error : new Error('Failed to load brackets-viewer');
    });

  return viewerLoadPromise;
};

/**
 * Backoff before each automatic retry of a failed load. The length of this list
 * is the retry budget: once it is spent the hook stops using timers and waits
 * for the browser to report it is back online, which is what an outage longer
 * than the backoff actually needs.
 */
const RETRY_DELAYS_MS = [2000, 4000, 8000];

/**
 * Hook that loads the brackets-viewer library and CSS.
 * Returns { isReady, error } indicating when the viewer library is available.
 */
export const useBracketsViewerScript = () => {
  const [isReady, setIsReady] = useState(Boolean(window.bracketsViewer));
  const [error, setError] = useState<string | null>(null);
  // Bumping this re-runs the load effect below. A failed load leaves `isReady`
  // false and changes nothing else, so without this the effect's dependencies
  // never changed, it never ran again, and the reader was stuck on the error
  // until they reloaded the page. Both retry triggers work by bumping it.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (isReady) return undefined;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    /** Leave the message up, but line up another go at it. */
    const failAndRetry = (message: string) => {
      setError(message);
      const delay = RETRY_DELAYS_MS[attempt];
      // undefined once the budget is spent: stop the timers and leave it to the
      // 'online' listener below.
      if (delay === undefined) return;
      retryTimer = setTimeout(() => setAttempt((n) => n + 1), delay);
    };

    const load = async () => {
      try {
        await Promise.all([loadBracketsViewerScript(), loadBracketStyles()]);

        if (cancelled) return;

        if (!window.bracketsViewer) {
          errorLog('brackets-viewer is not available on window object');
          failAndRetry('brackets-viewer library not loaded');
          return;
        }

        setIsReady(true);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        errorLog('Failed to load brackets-viewer resources:', err);
        failAndRetry('Failed to load bracket viewer library');
      }
    };

    load();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [isReady, attempt]);

  // A dropped connection is the usual reason the chunk never arrived, and an
  // outage easily outlasts the backoff above. Try again the moment the browser
  // says it is back, however much of the budget is already spent.
  useEffect(() => {
    if (isReady) return undefined;

    const retryNow = () => setAttempt((n) => n + 1);
    window.addEventListener('online', retryNow);
    return () => window.removeEventListener('online', retryNow);
  }, [isReady]);

  return { isReady, error };
};
