import { HeadToHeadService } from "@/services/HeadToHeadService";
import type { HeadToHeadRecord } from "@/types/headToHead";

export interface MatchHeadToHeadResult {
  team1Wins: number;
  team2Wins: number;
  totalMatches: number;
  team1GameWins: number;
  team2GameWins: number;
}

/**
 * Get head-to-head record between two specific teams
 * Uses existing HeadToHeadService to fetch data for team1, then filters for team2
 */
export const getMatchHeadToHead = async (
  team1Id: string | null | undefined,
  team2Id: string | null | undefined
): Promise<MatchHeadToHeadResult | null> => {
  // Guard against invalid inputs
  if (!team1Id || !team2Id || team1Id === team2Id) {
    return null;
  }

  try {
    // Use existing service to get all head-to-head records for team1
    const records = await HeadToHeadService.getTeamHeadToHead(team1Id);
    
    // Find the specific record for team2
    const opponentRecord = records.find((record: HeadToHeadRecord) => 
      record.opponent_id === team2Id
    );

    if (!opponentRecord) {
      // No prior matches between these teams
      return {
        team1Wins: 0,
        team2Wins: 0,
        totalMatches: 0,
        team1GameWins: 0,
        team2GameWins: 0,
      };
    }

    // Return formatted data from team1's perspective
    return {
      team1Wins: opponentRecord.wins,
      team2Wins: opponentRecord.losses,
      totalMatches: opponentRecord.matches_played,
      team1GameWins: opponentRecord.game_wins,
      team2GameWins: opponentRecord.game_losses,
    };
  } catch (error) {
    console.error('Error fetching head-to-head record:', error);
    return null;
  }
};
