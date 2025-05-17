
import { supabase } from "@/integrations/supabase/client";
import { PlayoffGame, PlayoffMatchType } from "../types";
import { DatabaseOperationError, DatabasePlayoffMatch, IPlayoffMatchesRepository, MatchResultDTO } from "./types";

/**
 * Repository implementation for playoff matches
 */
export class PlayoffMatchesRepository implements IPlayoffMatchesRepository {
  /**
   * Save multiple playoff matches to the database
   */
  async saveMatches(matches: DatabasePlayoffMatch[]): Promise<void> {
    try {
      if (!matches || matches.length === 0) return;

      // We need to make sure match_type is a valid enum value for the database
      const preparedMatches = matches.map(match => ({
        ...match,
        match_type: match.match_type as PlayoffMatchType
      }));

      const { error } = await supabase
        .from('playoff_matches')
        .insert(preparedMatches);
      
      if (error) throw new DatabaseOperationError('saveMatches', 'Failed to save matches', error);
    } catch (error) {
      console.error('Error saving playoff matches:', error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('saveMatches', 'Unexpected error', error as Error);
    }
  }

  /**
   * Update a match with the result and mark it as completed
   */
  async updateMatchResult(matchId: string, result: MatchResultDTO): Promise<void> {
    try {
      const { error } = await supabase
        .from('playoff_matches')
        .update({
          winner_id: result.winnerId,
          loser_id: result.loserId,
          team1_score: result.team1Score,
          team2_score: result.team2Score,
          team1_game_wins: result.team1GameWins,
          team2_game_wins: result.team2GameWins,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId);
      
      if (error) {
        throw new DatabaseOperationError('updateMatchResult', `Failed to update match ${matchId} with result`, error);
      }
    } catch (error) {
      console.error('Error updating match result:', error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('updateMatchResult', `Failed to update match ${matchId} with result`, error as Error);
    }
  }

  /**
   * Get all matches for a specific bracket
   */
  async getBracketMatches(bracketId: string): Promise<DatabasePlayoffMatch[]> {
    try {
      const { data, error } = await supabase
        .from('playoff_matches')
        .select('*')
        .eq('bracket_id', bracketId);
      
      if (error) throw new DatabaseOperationError('getBracketMatches', 'Failed to get bracket matches', error);
      
      return data as DatabasePlayoffMatch[];
    } catch (error) {
      console.error('Error getting bracket matches:', error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('getBracketMatches', `Failed to get matches for bracket ${bracketId}`, error as Error);
    }
  }

  /**
   * Get a single match by ID
   */
  async getMatchById(matchId: string): Promise<DatabasePlayoffMatch | null> {
    try {
      const { data, error } = await supabase
        .from('playoff_matches')
        .select('*')
        .eq('id', matchId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        throw new DatabaseOperationError('getMatchById', `Failed to get match ${matchId}`, error);
      }
      
      return data as DatabasePlayoffMatch;
    } catch (error) {
      console.error(`Error getting match ${matchId}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('getMatchById', `Failed to get match ${matchId}`, error as Error);
    }
  }
}
