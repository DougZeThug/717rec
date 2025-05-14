
/**
 * Division color utilities for styling division-specific UI elements
 */

import { cn } from "@/lib/utils";

// Division gradients for cards and UI elements
export const getDivisionGradientClass = (division: string): string => {
  const divisionNameLower = division.toLowerCase();

  if (divisionNameLower.includes('competitive')) {
    return "bg-gradient-to-br from-white via-amber-50/30 to-amber-100/20 dark:from-gray-800 dark:via-amber-950/10 dark:to-gray-900";
  }

  if (divisionNameLower.includes('intermediate')) {
    return "bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 dark:from-gray-800 dark:via-blue-950/10 dark:to-gray-900";
  }

  if (divisionNameLower.includes('recreational')) {
    return "bg-gradient-to-br from-white via-emerald-50/20 to-emerald-100/10 dark:from-gray-800 dark:via-emerald-950/10 dark:to-gray-900";
  }

  // Default gradient
  return "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900";
};

// Division header gradients 
export const getDivisionHeaderClass = (division: string): string => {
  const divisionNameLower = division.toLowerCase();

  if (divisionNameLower.includes('competitive')) {
    return cn(
      "bg-gradient-to-br from-amber-100/70 to-amber-50/20 dark:from-amber-900/20 dark:to-gray-800/50",
      "border-b-2 border-amber-200 dark:border-amber-800/30"
    );
  }

  if (divisionNameLower.includes('intermediate')) {
    return cn(
      "bg-gradient-to-br from-blue-100/70 to-blue-50/20 dark:from-blue-900/20 dark:to-gray-800/50", 
      "border-b-2 border-blue-200 dark:border-blue-800/30"
    );
  }

  if (divisionNameLower.includes('recreational')) {
    return cn(
      "bg-gradient-to-br from-emerald-100/70 to-emerald-50/20 dark:from-emerald-900/20 dark:to-gray-800/50",
      "border-b-2 border-emerald-200 dark:border-emerald-800/30"
    );
  }

  // Default header gradient
  return cn(
    "bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900",
    "border-b-2 border-gray-200 dark:border-gray-700"
  );
};

// Division text color classes
export const getDivisionTextClass = (division: string): string => {
  const divisionNameLower = division.toLowerCase();

  if (divisionNameLower.includes('competitive')) {
    return "text-amber-700 dark:text-amber-400";
  }

  if (divisionNameLower.includes('intermediate')) {
    return "text-blue-700 dark:text-blue-400";
  }

  if (divisionNameLower.includes('recreational')) {
    return "text-emerald-700 dark:text-emerald-400";
  }

  return "text-gray-700 dark:text-gray-400";
};
