import { useTheme } from "next-themes";
import { useLocation } from "react-router-dom";

/**
 * Hook to detect if winter theme is active and if we're on the homepage
 */
export function useSeasonalTheme() {
  const { theme, resolvedTheme } = useTheme();
  const location = useLocation();
  
  const isWinterTheme = theme === "winter-frozen";
  const isHomepage = location.pathname === "/";
  
  // For winter theme, we want dark-style colors
  const isDark = isWinterTheme || resolvedTheme === "dark";
  
  return {
    isWinterTheme,
    isHomepage,
    isDark,
    // Only apply winter styling when on homepage with winter theme
    shouldApplyWinter: isWinterTheme && isHomepage,
    // Class to add to containers for winter styling
    winterClass: isWinterTheme ? "winter-frozen" : "",
  };
}

export default useSeasonalTheme;
