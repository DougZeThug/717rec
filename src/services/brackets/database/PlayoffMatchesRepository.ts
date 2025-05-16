
import { supabase } from "@/integrations/supabase/client";
import { PlayoffMatch, PlayoffMatchType } from "../types";
import { DatabaseOperationError, IPlayoffMatchesRepository, MatchResultDTO } from "./types";

/**
 * Repository implementation for playoff matches
 */
export class PlayoffMatchesRepository implements IPlayoffMatchesRepository {
  /**
   * Save multiple playoff matches to the database
   */
  async saveMatches(matches: PlayoffMatch[]): Promise<void> {
    try {
      if (!matches || matches.length === 0) return;

      // Convert to database format
      const dbMatches = matches.map(match => ({
        id: match.id,
        round: match.round,
        position: match.position,
        match_type: match.matchType,
        team1_id: match.team1Id,
        team2_id: match.team2Id,
        team1_seed: match.team1Seed,
        team2_seed: match.team2Seed,
        next_win_match_id: match.nextWinMatchId,
        next_lose_match_id: match.nextLoseMatchId,
        winner_id: match.winnerId,
        loser_id: match.loserId,
        bracket_id: match.bracket_id,
        best_of: match.bestOf || 3,
        status: match.status || 'pending'
      }));

      const { error } = await supabase
        .from('playoff_matches')
        .insert(dbMatches);
      
      if (error) throw new DatabaseOperationError('saveMatches', 'Failed to save matches', error);
    } catch (error) {
      console.error('Error saving playoff matches:', error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('saveMatches', 'Unexpected error', error as Error);
    }
  }

  /**
   * Update a match with result information
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
          status: 'completed'
        })
        .eq('id', matchId);
      
      if (error) throw new DatabaseOperationError('updateMatchResult', 'Failed to update match result', error);
    } catch (error) {
      console.error(`Error updating match result for match ${matchId}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('updateMatchResult', `Failed to update match ${matchId}`, error as Error);
    }
  }

  /**
   * Get all matches for a specific bracket
   */
  async getBracketMatches(bracketId: string): Promise<PlayoffMatch[]> {
    try {
      const { data, error } = await supabase
        .from('playoff_matches')
        .select('*')
        .eq('bracket_id', bracketId);
      
      if (error) throw new DatabaseOperationError('getBracketMatches', 'Failed to get bracket matches', error);
      
      // Map database format to application format
      return data.map(match => ({
        id: match.id,
        round: match.round,
        position: match.position,
        matchType: match.match_type as PlayoffMatchType,
        bracket_id: match.bracket_id,
        team1Id: match.team1_id,
        team2Id: match.team2_id,
        team1Seed: match.team1_seed,
        team2Seed: match.team2_seed, 
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        bestOf: match.best_of || 3,
        winnerId: match.winner_id,
        loserId: match.loser_id,
        nextWinMatchId: match.next_win_match_id,
        nextLoseMatchId: match.next_lose_match_id,
        status: match.status as "pending" | "in_progress" | "completed"
      }));
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
  async getMatchById(matchId: string): Promise<PlayoffMatch | null> {
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
      
      return {
        id: data.id,
        round: data.round,
        position: data.position,
        matchType: data.match_type as PlayoffMatchType,
        bracket_id: data.bracket_id,
        team1Id: data.team1_id,
        team2Id: data.team2_id,
        team1Seed: data.team1_seed,
        team2Seed: data.team2_seed, 
        team1Score: data.team1_score,
        team2Score: data.team2_score,
        bestOf: data.best_of || 3,
        winnerId: data.winner_id,
        loserId: data.loser_id,
        nextWinMatchId: data.next_win_match_id,
        nextLoseMatchId: data.next_lose_match_id,
        status: data.status as "pending" | "in_progress" | "completed"
      };
    } catch (error) {
      console.error(`Error getting match ${matchId}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('getMatchById', `Failed to get match ${matchId}`, error as Error);
    }
  }
}
