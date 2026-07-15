import { useTheme } from 'next-themes';

/**
 * Hook to get theme-aware chart colors
 */
export const useChartColors = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return {
    background: isDark ? '#1f2937' : '#ffffff',
    gridColor: isDark ? '#374151' : '#e5e7eb',
    textColor: isDark ? '#e5e7eb' : '#334155',
    mutedTextColor: isDark ? '#9ca3af' : '#64748b',
    powerScore: {
      bar: '#a288f5',
      highlight: '#805fff',
      background: isDark ? '#26282d' : '#f1f0fb',
    },
    winLoss: {
      win: '#10b981',
      loss: '#ef4444',
      text: isDark ? '#e5e7eb' : '#334155',
    },
  };
};
