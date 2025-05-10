
export const divisionColors: Record<string, string> = {
  Competitive: "#d97706",     // amber-600
  Intermediate: "#3b82f6",    // blue-500
  Recreational: "#10b981",    // emerald-500
  Default: "#6b7280",         // gray-500
};

/**
 * Get the appropriate color for a division
 * @param divisionName The name of the division
 * @returns A color hex code from the divisionColors object
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
