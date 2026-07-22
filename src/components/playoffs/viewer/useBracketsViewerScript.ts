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
 * Hook that loads the brackets-viewer library and CSS.
 * Returns { isReady, error } indicating when the viewer library is available.
 */
export const useBracketsViewerScript = () => {
  const [isReady, setIsReady] = useState(!!window.bracketsViewer);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady) return;

    let cancelled = false;

    const load = async () => {
      try {
        await Promise.all([loadBracketsViewerScript(), loadBracketStyles()]);

        if (cancelled) return;

        if (!window.bracketsViewer) {
          setError('brackets-viewer library not loaded');
          errorLog('brackets-viewer is not available on window object');
          return;
        }

        setIsReady(true);
      } catch (err) {
        if (cancelled) return;
        errorLog('Failed to load brackets-viewer resources:', err);
        setError('Failed to load bracket viewer library');
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isReady]);

  return { isReady, error };
};
