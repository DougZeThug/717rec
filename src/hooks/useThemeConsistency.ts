import { useTheme } from 'next-themes';

import { log } from '@/utils/logger';

/**
 * Custom hook to ensure theme consistency across the application
 * Helps prevent theme flickering and maintains user's preference
 */
export const useThemeConsistency = () => {
  const { setTheme, theme, resolvedTheme } = useTheme();

  /**
   * Ensures theme consistency across the application
   * Useful for enforcing theme after auth state changes
   */
  const ensureThemeConsistency = () => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      log(`Applying stored theme preference: ${storedTheme}`);
      setTheme(storedTheme);
    } else {
      const defaultTheme = 'dark';
      log(`Applying default theme: ${defaultTheme}`);
      setTheme(defaultTheme);
    }
  };

  return {
    currentTheme: resolvedTheme || theme,
    isDark: resolvedTheme === 'dark',
    ensureThemeConsistency,
  };
};

export default useThemeConsistency;
