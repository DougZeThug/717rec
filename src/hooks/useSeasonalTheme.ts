import { useTheme } from "next-themes";
import { useLocation } from "react-router-dom";

/**
 * Hook to detect if winter theme is active and provide graduated styling options
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
    // Full winter effects (snowfall, heavy icicles) - homepage only
    shouldApplyWinter: isWinterTheme && isHomepage,
    // Light winter effects (background, cards, ice pattern) - all pages when winter theme active
    shouldApplyWinterBase: isWinterTheme,
    // Class to add to containers for winter styling
    winterClass: isWinterTheme ? "winter-frozen" : "",
  };
}

export default useSeasonalTheme;
