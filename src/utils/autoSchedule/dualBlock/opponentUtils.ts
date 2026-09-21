/**
 * Utility functions for checking opponent assignments across dual blocks
 */

import { TeamPairing } from '@/types/autoSchedule';

/**
 * Find teams that have the same opponent across blocks
 *
 * @param primaryBlockPairings - Pairings from the first block
 * @param secondaryBlockPairings - Pairings from the second block
 * @returns Array of team IDs that have the same opponent in both blocks
 */
export const findTeamsWithSameOpponent = (
  primaryBlockPairings: TeamPairing[],
  secondaryBlockPairings: TeamPairing[]
): string[] => {
  const teamOpponents: Record<string, string[]> = {};
  const duplicateTeams: string[] = [];

  // Process primary block
  primaryBlockPairings.forEach((pairing) => {
    const team1Id = pairing.team1.id;
    const team2Id = pairing.team2.id;

    if (!teamOpponents[team1Id]) teamOpponents[team1Id] = [];
    if (!teamOpponents[team2Id]) teamOpponents[team2Id] = [];

    teamOpponents[team1Id].push(team2Id);
    teamOpponents[team2Id].push(team1Id);
  });

  // Process secondary block and check for duplicates
  secondaryBlockPairings.forEach((pairing) => {
    const team1Id = pairing.team1.id;
    const team2Id = pairing.team2.id;

    // Check if team1 already played against team2
    if (teamOpponents[team1Id]?.includes(team2Id)) {
      if (!duplicateTeams.includes(team1Id)) duplicateTeams.push(team1Id);
      if (!duplicateTeams.includes(team2Id)) duplicateTeams.push(team2Id);
    }

    // Add the opponents to track for future checks
    if (!teamOpponents[team1Id]) teamOpponents[team1Id] = [];
    if (!teamOpponents[team2Id]) teamOpponents[team2Id] = [];

    teamOpponents[team1Id].push(team2Id);
    teamOpponents[team2Id].push(team1Id);
  });

  return duplicateTeams;
};
