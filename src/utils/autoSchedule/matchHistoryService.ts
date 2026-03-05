import {
  countTeamMatchesInSeason,
  fetchActiveSeasonIdStrict,
  fetchMatchPairsInSeason,
} from '@/services/matches/MatchReadService';
import { dbLog, errorLog, scheduleLog } from '@/utils/logger';

/**
 * Check if two teams have played against each other in the current season
 *
 * @param team1Id ID of the first team
 * @param team2Id ID of the second team
 * @returns Promise that resolves to true if teams have played this season, false otherwise
 */
export async function haveTeamsPlayedBefore(team1Id: string, team2Id: string): Promise<boolean> {
  try {
    dbLog(`Checking match history between teams: ${team1Id} and ${team2Id}`);

    // Get active season
    let seasonId: string;
    try {
      seasonId = await fetchActiveSeasonIdStrict();
    } catch (seasonError) {
      errorLog('Error fetching active season:', seasonError);
      return false; // If no active season, can't determine history
    }

    // Check if these two teams have played each other THIS SEASON
    // Either team1_id=A AND team2_id=B OR team1_id=B AND team2_id=A
    const count = await countTeamMatchesInSeason(team1Id, team2Id, seasonId);

    const hasPlayed = count > 0;
    dbLog(
      `Teams ${team1Id} vs ${team2Id}: ${hasPlayed ? 'HAVE' : 'HAVE NOT'} played in current season (${count} matches)`
    );

    return hasPlayed;
  } catch (error) {
    errorLog('Unexpected error checking if teams played before:', error);
    return false;
  }
}

/**
 * Fetch all season history pairs for a list of teams
 * Returns array of team ID pairs that have played each other this season
 */
export async function fetchSeasonHistoryForTeams(
  teamIds: string[]
): Promise<Array<[string, string]>> {
  try {
    if (teamIds.length === 0) return [];

    scheduleLog(`Fetching season history for ${teamIds.length} teams`);

    // Get active season
    let seasonId: string;
    try {
      seasonId = await fetchActiveSeasonIdStrict();
    } catch (seasonError) {
      errorLog('Error fetching active season:', seasonError);
      return [];
    }

    // Fetch all completed matches where both teams are in our list
    const matches = await fetchMatchPairsInSeason(teamIds, seasonId);

    const pairs: Array<[string, string]> = [];

    for (const match of matches) {
      if (match.team1_id && match.team2_id) {
        pairs.push([match.team1_id, match.team2_id]);
      }
    }

    scheduleLog(`Found ${pairs.length} historical match pairs for current season`);
    return pairs;
  } catch (error) {
    errorLog('Unexpected error fetching season history:', error);
    return [];
  }
}
