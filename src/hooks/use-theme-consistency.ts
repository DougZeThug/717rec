
import { useTheme } from "next-themes";
import { useEffect } from "react";

export const useThemeConsistency = () => {
  const { setTheme, theme } = useTheme();
  
  // Run on mount to prevent flicker
  useEffect(() => {
    // Check for theme preference at component mount
    const storedTheme = localStorage.getItem("theme");
    
    if (!storedTheme) {
      // If no theme preference stored, default to light mode and prevent flicker
      document.documentElement.classList.remove("dark");
      setTheme("light");
    }
  }, [setTheme]);
  
  // Ensure theme consistency after login
  const ensureThemeConsistency = () => {
    // Check if user has explicitly set a theme preference
    const storedTheme = localStorage.getItem("theme");
    
    // If no explicit theme preference is stored, ensure we default to light mode
    if (!storedTheme) {
      // Remove dark class if it was applied automatically
      document.documentElement.classList.remove("dark");
      // Set theme to light explicitly
      setTheme("light");
      console.log("No theme preference found, defaulting to light mode");
    } else {
      console.log(`Using stored theme preference: ${storedTheme}`);
      // Apply the stored theme preference
      setTheme(storedTheme);
    }
  };

  return { ensureThemeConsistency };
};
