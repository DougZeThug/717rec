
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { log } from "@/utils/logger";

/**
 * Custom hook to ensure theme consistency across the application
 * Helps prevent theme flickering and maintains user's preference
 */
export const useThemeConsistency = () => {
  const { setTheme, theme, resolvedTheme } = useTheme();
  
  // Run on mount - one-time migration to winter theme for existing users
  useEffect(() => {
    const winterMigrationKey = "winter-theme-migration-2024";
    const hasBeenMigrated = localStorage.getItem(winterMigrationKey);
    
    if (!hasBeenMigrated) {
      // One-time migration to winter theme for all users (new and existing)
      setTheme("winter-frozen");
      localStorage.setItem(winterMigrationKey, "true");
      log("Migrated user to winter-frozen theme");
    }
  }, [setTheme]);
  
  /**
   * Ensures theme consistency across the application
   * Useful for enforcing theme after auth state changes
   */
  const ensureThemeConsistency = () => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      log(`Applying stored theme preference: ${storedTheme}`);
      setTheme(storedTheme);
    } else {
      // Default to winter-frozen theme
      const defaultTheme = "winter-frozen";
      log(`Applying default theme: ${defaultTheme}`);
      setTheme(defaultTheme);
    }
  };
  
  // Return current theme state and utility function for components that need it
  return { 
    currentTheme: resolvedTheme || theme,
    isDark: resolvedTheme === "dark",
    ensureThemeConsistency
  };
};

export default useThemeConsistency;
