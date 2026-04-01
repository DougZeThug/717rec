import { format } from 'date-fns';

import { TimeslotQueryService } from '@/services/timeslots/TimeslotQueryService';
import { Team } from '@/types';
import { errorLog } from '@/utils/logger';

/**
 * Structure to represent a team pairing with compatibility score
 */
export interface TeamPair {
  team1: Team;
  team2: Team;
  compatibilityScore: number;
}

/**
 * Time block structure with exact timeslots
 */
export interface TimeBlock {
  main: string; // First match timeslot (e.g., "6:30 PM")
  secondary: string; // Second match timeslot (e.g., "7:00 PM")
}

/**
 * Map of time blocks with their corresponding timeslot pairs
 */
export const TIME_BLOCKS: Record<string, TimeBlock> = {
  '6:30': { main: '6:30 PM', secondary: '7:00 PM' },
  '7:30': { main: '7:30 PM', secondary: '8:00 PM' },
  '8:30': { main: '8:30 PM', secondary: '9:00 PM' },
};

/**
 * Fetches teams assigned to a specific time block for a given date
 */
export async function getTeamsByTimeBlock(date: Date, timeBlock: string): Promise<Team[]> {
  // Format date for database query
  const formattedDate = format(date, 'yyyy-MM-dd');

  const timeslotData = await TimeslotQueryService.fetchTeamsByTimeslot(
    formattedDate,
    TIME_BLOCKS[timeBlock].main
  );

  // Extract team data and format it according to our Team type
  const teams: Team[] =
    timeslotData?.map((item) => {
      const teamData = item.teams as any;
      return {
        id: teamData.id,
        name: teamData.name,
        logoUrl: teamData.image_url || teamData.logo_url,
        imageUrl: teamData.image_url || teamData.logo_url,
        division: teamData.division_id,
        divisionName: teamData.divisionName?.name,
        wins: teamData.wins || 0,
        losses: teamData.losses || 0,
        game_wins: teamData.game_wins || 0,
        game_losses: teamData.game_losses || 0,
        sos: typeof teamData.sos === 'number' ? teamData.sos : 0.5,
        power_score: typeof teamData.power_score === 'number' ? teamData.power_score : 0,
        win_percentage: 0, // Will be calculated later if needed
        game_win_percentage: 0, // Will be calculated later if needed
      };
    }) || [];

  return teams;
}

/**
 * Check if two teams have played each other before
 */
export async function haveTeamsPlayed(team1Id: string, team2Id: string): Promise<boolean> {
  try {
    const { haveTeamsPlayedBefore } = await import('@/services/matches/MatchReadService');
    return await haveTeamsPlayedBefore(team1Id, team2Id);
  } catch (error) {
    errorLog('Error in haveTeamsPlayed:', error);
    // Return false as a fallback to avoid blocking match generation
    return false;
  }
}

/**
 * Calculate compatibility score between two teams based on their stats
 * Higher score means teams are more evenly matched
 */
export function calculateTeamCompatibility(team1: Team, team2: Team): number {
  // Compare power scores - closer power scores are better matches
  const powerScoreDiff = Math.abs((team1.power_score || 0) - (team2.power_score || 0));

  // Compare strength of schedule - closer SOS values are better matches
  const sosDiff = Math.abs((team1.sos || 0.5) - (team2.sos || 0.5));

  // Calculate record similarity - teams with similar records are better matches
  const team1WinPct = team1.wins / (team1.wins + team1.losses || 1);
  const team2WinPct = team2.wins / (team2.wins + team2.losses || 1);
  const recordDiff = Math.abs(team1WinPct - team2WinPct);

  // Calculate game record similarity
  const team1GameWinPct = team1.game_wins / (team1.game_wins + team1.game_losses || 1);
  const team2GameWinPct = team2.game_wins / (team2.game_wins + team2.game_losses || 1);
  const gameRecordDiff = Math.abs(team1GameWinPct - team2GameWinPct);

  // Calculate weighted compatibility score (lower differences = higher compatibility)
  // Adjust weights based on importance of each factor
  // Normalize each factor to a 0-1 scale before weighting
  const normalizedPowerScoreDiff = Math.min(1, powerScoreDiff / 100);
  const normalizedSosDiff = Math.min(1, sosDiff);
  const normalizedRecordDiff = Math.min(1, recordDiff);
  const normalizedGameRecordDiff = Math.min(1, gameRecordDiff);

  // Apply weights to each factor (total should be 10)
  const weightedScore =
    10 -
    (normalizedPowerScoreDiff * 4 +
      normalizedSosDiff * 2 +
      normalizedRecordDiff * 2.5 +
      normalizedGameRecordDiff * 1.5);

  // Ensure the score is within a reasonable range (0-10)
  return Math.max(0, Math.min(10, weightedScore));
}

/**
 * Generate all possible team pairings and sort by compatibility
 */
export function generateTeamPairings(teams: Team[]): TeamPair[] {
  const pairs: TeamPair[] = [];

  // Generate all possible team pairings
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const team1 = teams[i];
      const team2 = teams[j];

      // Calculate compatibility score between the teams
      const compatibilityScore = calculateTeamCompatibility(team1, team2);

      pairs.push({ team1, team2, compatibilityScore });
    }
  }

  // Sort pairs by compatibility score (highest first)
  return pairs.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

/**
 * Filter pairs to remove any that have played before
 */
export async function filterPairsWithPreviousMatches(pairs: TeamPair[]): Promise<TeamPair[]> {
  const filteredPairs: TeamPair[] = [];

  // Process each pair sequentially to check match history
  for (const pair of pairs) {
    const havePlayed = await haveTeamsPlayed(pair.team1.id, pair.team2.id);
    if (!havePlayed) {
      filteredPairs.push(pair);
    }
  }

  return filteredPairs;
}

/**
 * Algorithm to find optimal pairings for a set of teams
 */
export async function findOptimalPairings(teams: Team[]): Promise<TeamPair[]> {
  // Generate all possible pairs with compatibility scores
  const allPairs = generateTeamPairings(teams);

  // Filter pairs that have played before
  // In a real implementation, we might not want to strictly enforce this
  // to allow rematches when necessary
  const availablePairs = await filterPairsWithPreviousMatches(allPairs);

  // Initialize pairings and used teams
  const pairings: TeamPair[] = [];
  const usedTeamIds = new Set<string>();

  // Find best pairings greedily
  for (const pair of availablePairs) {
    // Skip if either team is already used
    if (usedTeamIds.has(pair.team1.id) || usedTeamIds.has(pair.team2.id)) {
      continue;
    }

    // Add this pairing
    pairings.push(pair);
    usedTeamIds.add(pair.team1.id);
    usedTeamIds.add(pair.team2.id);

    // Stop if all teams are paired
    if (usedTeamIds.size === teams.length) {
      break;
    }
  }

  return pairings;
}

/**
 * Find remaining unpaired teams
 */
export function findUnpairedTeams(teams: Team[], pairings: TeamPair[]): Team[] {
  // Create a set of paired team IDs
  const pairedTeamIds = new Set<string>();

  pairings.forEach((pair) => {
    pairedTeamIds.add(pair.team1.id);
    pairedTeamIds.add(pair.team2.id);
  });

  // Find teams that aren't in any pairing
  return teams.filter((team) => !pairedTeamIds.has(team.id));
}
