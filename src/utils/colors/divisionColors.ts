
import { cva } from "class-variance-authority";

/**
 * Division colors defined as a record to maintain consistency
 * These should match the CSS variables in theme.css
 */
export const divisionColors: Record<string, string> = {
  Competitive: "hsl(var(--competitive))",
  Intermediate: "hsl(var(--intermediate))",
  Recreational: "hsl(var(--recreational))",
  Default: "#6b7280",  // gray-500
};

/**
 * Get the appropriate color for a division
 * @param divisionName The name of the division
 * @returns A color hex code from the divisionColors object or HSL variable
 */
export const getDivisionColor = (divisionName: string | null | undefined): string => {
  if (!divisionName) return divisionColors.Default;
  
  const lowerDivName = divisionName.toLowerCase();
  if (lowerDivName.includes('competitive')) return divisionColors.Competitive;
  if (lowerDivName.includes('intermediate')) return divisionColors.Intermediate;
  if (lowerDivName.includes('recreational')) return divisionColors.Recreational;
  
  return divisionColors.Default;
};

/**
 * Division badge variants using class-variance-authority for consistency
 */
export const divisionBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        competitive: "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/40",
        intermediate: "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/40",
        recreational: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/40",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      }
    },
    defaultVariants: {
      variant: "outline",
    },
  }
);

/**
 * Get a badge variant name based on division name
 * @param divisionName The name of the division
 * @returns A badge variant name
 */
export const getDivisionBadgeVariant = (divisionName: string | null | undefined): string => {
  if (!divisionName) return 'outline';
  
  const lowerDivName = divisionName.toLowerCase();
  if (lowerDivName.includes('competitive')) return 'competitive';
  if (lowerDivName.includes('intermediate')) return 'intermediate';
  if (lowerDivName.includes('recreational')) return 'recreational';
  
  return 'outline';
};
