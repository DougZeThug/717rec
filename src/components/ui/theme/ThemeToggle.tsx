
import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  variant = "ghost",
  size = "icon",
}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Once mounted, we can safely show the toggle
  useEffect(() => {
    setMounted(true);
    
    // On component mount, check if we need to ensure light mode is the default
    if (typeof window !== 'undefined') {
      // If no theme is set explicitly in localStorage, use light mode
      if (!localStorage.getItem('theme')) {
        document.documentElement.classList.remove('dark');
        setTheme('light');
      }
    }
  }, [setTheme]);

  // Handle toggle
  const toggleTheme = () => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    // Store the explicit user preference
    localStorage.setItem('theme', newTheme);
  };

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={cn(
        "rounded-full transition-colors", 
        resolvedTheme === "dark" 
          ? "text-white hover:bg-gray-700" 
          : "text-gray-700 hover:bg-gray-200",
        className
      )}
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
};

export default ThemeToggle;
