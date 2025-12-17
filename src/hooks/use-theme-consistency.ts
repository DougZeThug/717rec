
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { log } from "@/utils/logger";

/**
 * Custom hook to ensure theme consistency across the application
 * Helps prevent theme flickering and maintains user's preference
 */
export const useThemeConsistency = () => {
  const { setTheme, theme, resolvedTheme } = useTheme();
  
  // Run on mount to prevent flicker
  useEffect(() => {
    // Check for theme preference at component mount
    const storedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (!storedTheme) {
      // If no theme preference stored, default to system preference
      const defaultTheme = prefersDark ? "dark" : "light";
      setTheme(defaultTheme);
      log(`Applying stored theme preference: ${defaultTheme}`);
    } else {
      log(`Applying stored theme preference: ${storedTheme}`);
      setTheme(storedTheme);
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
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const defaultTheme = prefersDark ? "dark" : "light";
      log(`Applying stored theme preference: ${defaultTheme}`);
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
