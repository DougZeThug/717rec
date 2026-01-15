// Utility functions for handling division display in history pages

/**
 * Maps database division names to their proper display names for history pages
 * Note: For "Intermediate" division, use getHistoryDivisionDisplayNameWithRank() 
 * to split into Intermediate 1/2 based on playoff_rank
 */
export function getHistoryDivisionDisplayName(divisionName: string | null): string {
  if (!divisionName) return 'No Division';

  const normalized = divisionName.toLowerCase().trim();

  // Handle specific mappings for history display
  if (normalized === 'intermediate 2' || normalized === 'intermediate low') {
    return 'Intermediate 2';
  }

  if (normalized === 'intermediate high' || normalized === 'intermediate 1') {
    return 'Intermediate 1';
  }

  // For recreational divisions, just return "Recreational" to avoid split
  if (normalized.includes('recreational')) {
    return 'Recreational';
  }

  // Return the original name for other divisions (like "Competitive", "Intermediate")
  return divisionName;
}

/**
 * Determines the display division based on division_name AND playoff_rank
 * Splits "Intermediate" into "Intermediate 1" (top ranks) and "Intermediate 2" (bottom ranks)
 * 
 * @param divisionName - The stored division name from database
 * @param playoffRank - The team's playoff rank within the division
 * @param intermediateRankCutoff - Ranks <= this value go to "Intermediate 1" (default: 8)
 */
export function getHistoryDivisionDisplayNameWithRank(
  divisionName: string | null, 
  playoffRank: number | null,
  intermediateRankCutoff: number = 8
): string {
  if (!divisionName) return 'No Division';
  
  const normalized = divisionName.toLowerCase().trim();
  
  // Split plain "Intermediate" based on playoff rank
  if (normalized === 'intermediate') {
    if (playoffRank !== null && playoffRank <= intermediateRankCutoff) {
      return 'Intermediate 1';
    }
    return 'Intermediate 2';
  }
  
  // Use existing logic for other divisions
  return getHistoryDivisionDisplayName(divisionName);
}

/**
 * Orders divisions for display in history pages
 * Higher skill divisions should appear first (left to right)
 */
export function getHistoryDivisionOrder(divisionName: string): number {
  const normalized = divisionName.toLowerCase();

  if (normalized.includes('competitive')) return 1;
  if (normalized === 'intermediate 1' || normalized.includes('intermediate high')) return 2;
  if (normalized === 'intermediate 2' || normalized.includes('intermediate low')) return 3;
  // Plain "Intermediate" comes after Int 1/2
  if (normalized === 'intermediate') return 2.5;
  if (normalized.includes('recreational')) return 4;

  // Default order for unknown divisions
  return 999;
}

/**
 * Sorts division entries for proper display order in history
 */
export function sortHistoryDivisions(divisions: [string, any[]][]): [string, any[]][] {
  return divisions.sort(([a], [b]) => {
    const orderA = getHistoryDivisionOrder(a);
    const orderB = getHistoryDivisionOrder(b);
    return orderA - orderB;
  });
}
