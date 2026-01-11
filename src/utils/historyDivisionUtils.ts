// Utility functions for handling division display in history pages

/**
 * Maps database division names to their proper display names for history pages
 */
export function getHistoryDivisionDisplayName(divisionName: string | null): string {
  if (!divisionName) return 'No Division';

  const normalized = divisionName.toLowerCase().trim();

  // Handle specific mappings for history display
  if (normalized === 'intermediate 2' || normalized === 'intermediate low') {
    return 'Intermediate 2';
  }

  if (normalized === 'intermediate high') {
    return 'Intermediate 1';
  }

  // For recreational divisions, just return "Recreational" to avoid split
  if (normalized.includes('recreational')) {
    return 'Recreational';
  }

  // Return the original name for other divisions (like "Competitive", "Intermediate High")
  return divisionName;
}

/**
 * Orders divisions for display in history pages
 * Higher skill divisions should appear first (left to right)
 */
export function getHistoryDivisionOrder(divisionName: string): number {
  const normalized = divisionName.toLowerCase();

  if (normalized.includes('competitive')) return 1;
  if (normalized.includes('intermediate high')) return 2;
  if (normalized.includes('intermediate low') || normalized.includes('intermediate 2')) return 3;
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
