
import { supabase } from "@/integrations/supabase/client";
import { PlayoffGame, PlayoffMatchType } from "../types";
import { DatabaseOperationError, DatabasePlayoffMatch, IPlayoffMatchesRepository, MatchResultDTO } from "./types";

/**
 * Repository implementation for playoff matches
 */
export class PlayoffMatchesRepository implements IPlayoffMatchesRepository {
  /**
   * Convert match type for database compatibility
   */
  private convertMatchTypeForDB(matchType: PlayoffMatchType): "winners" | "losers" | "finals" {
    if (matchType === "play-in" || matchType === "play-in-2") {
      return "winners";
    }
    return matchType as "winners" | "losers" | "finals";
  }

  /**
   * Save multiple playoff matches to the database
   */
  async saveMatches(matches: DatabasePlayoffMatch[]): Promise<void> {
    try {
      if (!matches || matches.length === 0) return;

      // We need to make sure match_type is a valid enum value for the database
      // and map needed fields to the database schema
      const preparedMatches = matches.map(match => ({
        id: match.id,
        round_number: match.round,
        position: match.position,
        match_type: this.convertMatchTypeForDB(match.match_type),
        team1_id: match.team1_id,
        team2_id: match.team2_id,
        next_match_id: match.next_win_match_id,
        next_loser_match_id: match.next_lose_match_id,
        winner_id: match.winner_id,
        loser_id: match.loser_id,
        bracket_id: match.bracket_id,
        team1_score: match.team1_score,
        team2_score: match.team2_score,
        team1_game_wins: match.team1_game_wins,
        team2_game_wins: match.team2_game_wins,
        best_of: match.best_of,
        iscompleted: match.status === 'completed',
        // Store team seeds in the matches metadata
        metadata: {
          team1_seed: match.team1_seed,
          team2_seed: match.team2_seed
        }
      }));

      const { error } = await supabase
        .from('matches')
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
        .from('matches')
        .update({
          winner_id: result.winnerId,
          loser_id: result.loserId,
          team1_score: result.team1Score,
          team2_score: result.team2Score,
          team1_game_wins: result.team1GameWins,
          team2_game_wins: result.team2GameWins,
          iscompleted: true,
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
        .from('matches')
        .select('*')
        .eq('bracket_id', bracketId);
      
      if (error) throw new DatabaseOperationError('getBracketMatches', 'Failed to get bracket matches', error);
      
      // Map database columns to expected DatabasePlayoffMatch format
      return data.map(match => {
        // Extract team seeds from metadata or use defaults
        const metadata = match.metadata || {};
        
        return {
          id: match.id,
          bracket_id: match.bracket_id,
          round: match.round_number,
          position: match.position,
          match_type: match.match_type,
          team1_id: match.team1_id,
          team2_id: match.team2_id,
          team1_score: match.team1_score,
          team2_score: match.team2_score,
          team1_game_wins: match.team1_game_wins,
          team2_game_wins: match.team2_game_wins,
          // Get team seeds from metadata or default to null
          team1_seed: metadata.team1_seed || null,
          team2_seed: metadata.team2_seed || null,
          winner_id: match.winner_id,
          loser_id: match.loser_id,
          next_win_match_id: match.next_match_id,
          next_lose_match_id: match.next_loser_match_id,
          best_of: match.best_of || 3,
          status: match.iscompleted ? 'completed' : 'pending'
        };
      }) as DatabasePlayoffMatch[];
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
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        throw new DatabaseOperationError('getMatchById', `Failed to get match ${matchId}`, error);
      }
      
      // Extract team seeds from metadata or use defaults
      const metadata = data.metadata || {};
      
      // Map database columns to expected DatabasePlayoffMatch format
      return {
        id: data.id,
        bracket_id: data.bracket_id,
        round: data.round_number,
        position: data.position,
        match_type: data.match_type,
        team1_id: data.team1_id,
        team2_id: data.team2_id,
        team1_score: data.team1_score,
        team2_score: data.team2_score,
        team1_game_wins: data.team1_game_wins,
        team2_game_wins: data.team2_game_wins,
        // Get team seeds from metadata or default to null
        team1_seed: metadata.team1_seed || null,
        team2_seed: metadata.team2_seed || null,
        winner_id: data.winner_id,
        loser_id: data.loser_id,
        next_win_match_id: data.next_match_id,
        next_lose_match_id: data.next_loser_match_id,
        best_of: data.best_of || 3,
        status: data.iscompleted ? 'completed' : 'pending'
      } as DatabasePlayoffMatch;
    } catch (error) {
      console.error(`Error getting match ${matchId}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('getMatchById', `Failed to get match ${matchId}`, error as Error);
    }
  }
}
