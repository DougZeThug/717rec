/**
 * Dynamic bracket CSS loader
 * Loads bracket-related CSS only when needed (on Playoffs page)
 * This reduces unused CSS on initial page load by ~20-30KB
 */

import { errorLog } from '@/utils/logger';

let stylesLoaded = false;

export const loadBracketStyles = async (): Promise<void> => {
  if (stylesLoaded) return;

  try {
    // Dynamically import bracket-related stylesheets
    // Order matters: base library CSS first, then custom overrides
    await Promise.all([
      import('brackets-viewer/dist/brackets-viewer.min.css'),
      import('./brackets.css'),
      import('./brackets-viewer-717rec-theme.css'),
    ]);
    stylesLoaded = true;
  } catch (error) {
    errorLog('Failed to load bracket styles:', error);
  }
};
