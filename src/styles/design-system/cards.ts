
import { cn } from "@/lib/utils";
import { getDivisionGradient } from "./divisions";

/**
 * Card style utility function that combines various design system elements
 */
export function getCardStyle({
  gradient = 'default',
  elevationType = 'default',
  isInteractive = true,
  division = null,
  className = ""
}: {
  gradient?: 'default' | 'subtle' | 'highlight',
  elevationType?: 'default' | 'active' | 'highlighted',
  isInteractive?: boolean,
  division?: string | null,
  className?: string
} = {}) {
  // Get division-specific gradient if division is provided
  const cardGradient = division 
    ? getDivisionGradient(division) 
    : getCardGradient(gradient);
  
  return cn(
    "rounded-lg border border-gray-200 dark:border-gray-700", 
    cardGradient,
    getCardElevation(elevationType),
    isInteractive ? "hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200" : "",
    className
  );
}

function getCardGradient(variant: 'default' | 'subtle' | 'highlight'): string {
  switch (variant) {
    case 'subtle':
      return "bg-gradient-to-br from-white to-gray-100 dark:from-gray-800/80 dark:to-gray-900/80";
    case 'highlight':
      return "bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900/90";
    default:
      return "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900";
  }
}

function getCardElevation(type: 'default' | 'active' | 'highlighted'): string {
  switch (type) {
    case 'active':
      return "shadow-md hover:shadow-lg transition-all duration-300";
    case 'highlighted':
      return "shadow-lg hover:shadow-xl transition-all duration-300";
    default:
      return "shadow-sm hover:shadow-md transition-all duration-300";
  }
}
