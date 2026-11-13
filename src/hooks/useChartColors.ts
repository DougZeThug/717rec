import { useIsDarkSurface } from '@/hooks/useIsDarkSurface';

export interface ChartColors {
  background: string;
  gridColor: string;
  textColor: string;
  mutedTextColor: string;
  powerScore: {
    bar: string;
    highlight: string;
    background: string;
  };
  winLoss: {
    win: string;
    loss: string;
    text: string;
  };
}

/**
 * Chart colours for a light or a dark page.
 *
 * Recharts takes colours as props, not as classes, so these cannot be CSS
 * tokens. Kept pure and separate from the hook so a test can check both
 * surfaces without a Router or a ThemeProvider — the same split
 * `fullRankingsStyles.ts` uses.
 */
export const getChartColors = (isDarkSurface: boolean): ChartColors => ({
  background: isDarkSurface ? '#1f2937' : '#ffffff',
  gridColor: isDarkSurface ? '#374151' : '#e5e7eb',
  textColor: isDarkSurface ? '#e5e7eb' : '#334155',
  mutedTextColor: isDarkSurface ? '#9ca3af' : '#64748b',
  powerScore: {
    bar: '#a288f5',
    highlight: '#805fff',
    background: isDarkSurface ? '#26282d' : '#f1f0fb',
  },
  winLoss: {
    win: '#10b981',
    loss: '#ef4444',
    text: isDarkSurface ? '#e5e7eb' : '#334155',
  },
});

/**
 * Hook to get theme-aware chart colors
 */
export const useChartColors = (): ChartColors => getChartColors(useIsDarkSurface());
