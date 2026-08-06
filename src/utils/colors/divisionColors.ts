/**
 * Division color utilities for styling division-specific UI elements
 */

// Division badge color classes (for small badges/chips)
export const getDivisionBadgeColor = (division: string): string => {
  const divisionNameLower = division.toLowerCase();

  if (divisionNameLower.includes('competitive') || divisionNameLower.includes('hidden')) {
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  }

  if (divisionNameLower.includes('intermediate')) {
    return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  }

  if (divisionNameLower.includes('recreational')) {
    return 'bg-green-500/20 text-green-400 border-green-500/30';
  }

  return 'bg-muted text-muted-foreground';
};
