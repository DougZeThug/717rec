import { Match, Team } from '@/types';

import { getDefaultDivisionWeight } from './divisionWeightsCache';

/**
 * Calculate the strength of schedule (SOS) for a team
 * SOS is calculated as the average of opponent division weights
 *
 * @param team - The team to calculate SOS for
 * @param allTeams - All teams in the league
 * @param allMatches - All matches
 * @param divisionWeights - Pre-fetched division weights map (avoids redundant DB calls)
 */
export const calculateSOS = (
  team: Team,
  allTeams: Team[],
  allMatches: Match[] | undefined,
  divisionWeights: Map<string, number>
): number => {
  if (!team || !allTeams || allTeams.length === 0) return 0.5;

  const defaultWeight = getDefaultDivisionWeight();

  // Get matches involving this team
  const teamMatches =
    allMatches?.filter((match) => match.team1Id === team.id || match.team2Id === team.id) || [];

  if (teamMatches.length === 0) return 0.5;

  // Get list of opponents
  const opponentIds = teamMatches.map((match) =>
    match.team1Id === team.id ? match.team2Id : match.team1Id
  );

  // Find unique opponents
  const uniqueOpponentIds = [...new Set(opponentIds)];

  // Calculate average opponent weight
  let totalWeight = 0;
  let countedOpponents = 0;

  uniqueOpponentIds.forEach((opponentId) => {
    const opponent = allTeams.find((t) => t.id === opponentId);
    if (opponent && opponent.division_id) {
      const weight = divisionWeights.get(opponent.division_id) || defaultWeight;
      totalWeight += weight;
      countedOpponents++;
    }
  });

  return countedOpponents > 0 ? totalWeight / countedOpponents : 0.5;
};
