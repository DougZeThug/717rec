import { Match, Ranking, Team } from '@/types';
import { calculateGameStats } from '@/utils/teamDetailsUtils/gameStatsUtils';

import { calculateHeadToHead } from './calculateHeadToHead';
import { calculateSOS } from './calculateSOS';
import { calculateStreak } from './calculateStreak';
import { calculateWinPercentage } from './calculateWinPercentage';

/**
 * Create a ranking object for a team
 * Now uses the display_division from v_team_details for consistent grouping
 *
 * @param team - Team to create ranking for
 * @param allTeams - All teams in the league
 * @param allMatches - All matches
 * @param previousRankings - Previous rankings map for calculating rank changes
 * @param divisionWeights - Pre-fetched division weights map
 */
export const createRankingObject = (
  team: Team,
  allTeams: Team[],
  allMatches: Match[] | undefined,
  previousRankings: Record<string, number>,
  divisionWeights: Map<string, number>
): Ranking => {
  // Parse and ensure we're working with numbers
  const wins = parseInt(String(team.wins)) || 0;
  const losses = parseInt(String(team.losses)) || 0;

  // Calculate win percentage using wins and losses
  const winPercentage = calculateWinPercentage(wins, losses);

  const sos = calculateSOS(team, allTeams, allMatches, divisionWeights);
  const streak = calculateStreak(team.id, allMatches);
  const headToHead = calculateHeadToHead(team.id, allTeams, allMatches);
  const previousRank = previousRankings[team.id];

  // Calculate game-level statistics
  const { gamesWon, gamesLost, gameWinPercentage, closeMatchLosses } = calculateGameStats(
    team.id,
    allMatches
  );

  // Use power_score directly from the database view (v_team_details)
  // which now includes the weighted calculation with division weights
  const powerScore = team.power_score || 0;

  return {
    teamId: team.id,
    teamName: team.name || 'Unknown Team',
    logoUrl: team.logoUrl,
    imageUrl: team.imageUrl,
    wins: wins,
    losses: losses,
    winPercentage,
    // Use divisionName which now contains the display_division from the database
    divisionName: team.divisionName,
    sos,
    streak,
    headToHead,
    previousRank,
    rankChange: previousRank !== undefined ? 0 : undefined, // Will be updated after sorting
    gamesWon,
    gamesLost,
    gameWinPercentage,
    powerScore,
    closeMatchLosses,
  };
};
