import { useTheme } from "next-themes";
import { useLocation } from "react-router-dom";

/**
 * Base hook for seasonal theme - NO location dependency
 * Use this in components that don't need homepage detection (Navbar, NavItem, etc.)
 */
export function useSeasonalThemeBase() {
  const { theme, resolvedTheme } = useTheme();
  
  const isWinterTheme = theme === "winter-frozen";
  
  // For winter theme, we want dark-style colors
  const isDark = isWinterTheme || resolvedTheme === "dark";
  
  return {
    isWinterTheme,
    isDark,
    // Light winter effects (background, cards, ice pattern) - all pages when winter theme active
    shouldApplyWinterBase: isWinterTheme,
    // Class to add to containers for winter styling
    winterClass: isWinterTheme ? "winter-frozen" : "",
  };
}

/**
 * Full hook with location awareness - causes re-renders on route changes
 * Use this only in components that need homepage detection
 */
export function useSeasonalTheme() {
  const baseTheme = useSeasonalThemeBase();
  const location = useLocation();
  
  const isHomepage = location.pathname === "/";
  
  return {
    ...baseTheme,
    isHomepage,
    // Full winter effects (snowfall, heavy icicles) - homepage only
    shouldApplyWinter: baseTheme.isWinterTheme && isHomepage,
  };
}

export default useSeasonalTheme;
