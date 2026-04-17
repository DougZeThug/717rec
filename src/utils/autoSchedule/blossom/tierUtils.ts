import { Team } from '@/types';

/**
 * Extract tier number from division name
 */
export function getTierFromDivision(divisionName: string | undefined): number {
  if (!divisionName) return 2; // Default to intermediate

  const lowerName = divisionName.toLowerCase();

  if (lowerName.includes('competitive') || lowerName.includes('comp')) {
    return 1; // Competitive
  } else if (lowerName.includes('recreational') || lowerName.includes('rec')) {
    return 3; // Recreational
  } else {
    return 2; // Intermediate (default)
  }
}

/**
 * Check if teams are from extreme different tiers (T1 vs T3)
 */
export function isExtremeTierDifference(team1: Team, team2: Team): boolean {
  const tier1 = getTierFromDivision(team1.divisionName);
  const tier2 = getTierFromDivision(team2.divisionName);

  const tierDistance = Math.abs(tier1 - tier2);
  return tierDistance >= 2; // Block T1 vs T3 (distance = 2)
}

/**
 * Check if both teams are recreational (T3)
 */
export function isBothRecreational(team1: Team, team2: Team): boolean {
  const tier1 = getTierFromDivision(team1.divisionName);
  const tier2 = getTierFromDivision(team2.divisionName);

  return tier1 === 3 && tier2 === 3; // Both recreational
}

/**
 * Check if teams are from same tier
 */
export function _isSameTier(team1: Team, team2: Team): boolean {
  const tier1 = getTierFromDivision(team1.divisionName);
  const tier2 = getTierFromDivision(team2.divisionName);

  return tier1 === tier2;
}
