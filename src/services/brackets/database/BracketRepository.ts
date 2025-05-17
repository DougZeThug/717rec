
import { supabase } from "@/integrations/supabase/client";
import { BracketState } from "../types";
import { DatabaseOperationError, IBracketRepository } from "./types";

/**
 * Repository for bracket operations
 */
export class BracketRepository implements IBracketRepository {
  /**
   * Mark a team as the winners bracket champion
   */
  async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('brackets')
        .update({ wb_champion_id: teamId })
        .eq('id', bracketId);
      
      if (error) throw new DatabaseOperationError('markWinnersBracketChampion', `Failed to mark winners bracket champion for bracket ${bracketId}`, error);
    } catch (error) {
      console.error(`Error marking winners bracket champion for bracket ${bracketId}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('markWinnersBracketChampion', `Failed to mark winners bracket champion for bracket ${bracketId}`, error as Error);
    }
  }

  /**
   * Set whether a reset match is needed
   */
  async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('brackets')
        .update({ reset_match_needed: needed })
        .eq('id', bracketId);
      
      if (error) throw new DatabaseOperationError('setResetMatchNeeded', `Failed to update reset_match_needed for bracket ${bracketId}`, error);
    } catch (error) {
      console.error(`Error updating reset_match_needed for bracket ${bracketId}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('setResetMatchNeeded', `Failed to update reset_match_needed for bracket ${bracketId}`, error as Error);
    }
  }

  /**
   * Mark the tournament as complete with a champion
   */
  async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('brackets')
        .update({
          state: 'complete',
          champion_id: championId
        })
        .eq('id', bracketId);
      
      if (error) throw new DatabaseOperationError('markTournamentComplete', `Failed to mark tournament complete for bracket ${bracketId}`, error);
    } catch (error) {
      console.error(`Error marking tournament complete for bracket ${bracketId}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('markTournamentComplete', `Failed to mark tournament complete for bracket ${bracketId}`, error as Error);
    }
  }

  /**
   * Get bracket state information
   */
  async getBracketState(bracketId: string): Promise<BracketState> {
    try {
      // Get the bracket data
      const { data: bracket, error: bracketError } = await supabase
        .from('brackets')
        .select('wb_champion_id, reset_match_needed, state')
        .eq('id', bracketId)
        .single();
      
      if (bracketError) throw new DatabaseOperationError('getBracketState', `Failed to get bracket state for bracket ${bracketId}`, bracketError);
      
      // Get the losers bracket champion (the winner of the last losers bracket match)
      const { data: loserFinalMatch, error: loserMatchError } = await supabase
        .from('playoff_matches')
        .select('winner_id')
        .eq('bracket_id', bracketId)
        .eq('match_type', 'losers')
        .order('round', { ascending: false })
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (loserMatchError) throw new DatabaseOperationError('getBracketState', `Failed to get losers bracket final match for bracket ${bracketId}`, loserMatchError);
      
      const isWinnersBracketComplete = !!bracket.wb_champion_id;
      const isLosersBracketComplete = !!loserFinalMatch?.winner_id;
      
      return {
        isWinnersBracketComplete,
        isLosersBracketComplete,
        isResetMatchNeeded: bracket.reset_match_needed || false,
        isComplete: bracket.state === 'complete',
        winnersBracketChampionId: bracket.wb_champion_id,
        losersBracketChampionId: loserFinalMatch?.winner_id || null,
        championId: null // We don't store this directly, would need another query
      };
    } catch (error) {
      console.error(`Error getting bracket state for bracket ${bracketId}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('getBracketState', `Failed to get bracket state for bracket ${bracketId}`, error as Error);
    }
  }
}
