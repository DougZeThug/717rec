import { useEffect, useState } from 'react';

import { loadBracketStyles } from '@/styles/bracket-styles';
import { errorLog } from '@/utils/logger';

const BRACKETS_VIEWER_URL =
  'https://cdn.jsdelivr.net/npm/brackets-viewer@1.8.1/dist/brackets-viewer.min.js';
let scriptLoadPromise: Promise<void> | null = null;

const loadBracketsViewerScript = (): Promise<void> => {
  if (scriptLoadPromise) return scriptLoadPromise;

  if (window.bracketsViewer) {
    return Promise.resolve();
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = BRACKETS_VIEWER_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load brackets-viewer script'));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
};

/**
 * Hook that loads the brackets-viewer script and CSS.
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
