
import { supabase } from "@/integrations/supabase/client";
import { BracketState, DatabaseBracketState } from "../types";
import { DatabaseOperationError, IBracketRepository } from "./types";

/**
 * Repository for bracket-related operations
 */
export class BracketRepository implements IBracketRepository {
  /**
   * Mark a team as the winners bracket champion
   */
  async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('brackets')  // Changed from 'playoff_brackets' to 'brackets'
        .update({
          wb_champion_id: teamId  // Changed from 'winners_bracket_champion_id' to 'wb_champion_id'
        })
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
   * Set whether a reset match is needed for the bracket
   */
  async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('brackets')  // Changed from 'playoff_brackets' to 'brackets'
        .update({
          reset_match_needed: needed
        })
        .eq('id', bracketId);
      
      if (error) throw new DatabaseOperationError('setResetMatchNeeded', `Failed to set reset match needed for bracket ${bracketId}`, error);
    } catch (error) {
      console.error(`Error setting reset match needed for bracket ${bracketId}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('setResetMatchNeeded', `Failed to set reset match needed for bracket ${bracketId}`, error as Error);
    }
  }

  /**
   * Mark a tournament as complete with the specified champion
   */
  async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('brackets')  // Changed from 'playoff_brackets' to 'brackets'
        .update({
          wb_champion_id: championId,  // Changed from 'champion_id' to 'wb_champion_id'
          state: 'complete'
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
   * Get the current state of a bracket
   */
  async getBracketState(bracketId: string): Promise<DatabaseBracketState> {
    try {
      const { data, error } = await supabase
        .from('brackets')  // Changed from 'playoff_brackets' to 'brackets'
        .select('wb_champion_id, reset_match_needed, state')  // Changed from column names to match table schema
        .eq('id', bracketId)
        .single();
      
      if (error) throw new DatabaseOperationError('getBracketState', `Failed to get bracket state for bracket ${bracketId}`, error);
      
      // Convert the database representation to our application model
      const bracketState: DatabaseBracketState = {
        isWinnersBracketComplete: !!data.wb_champion_id,
        isLosersBracketComplete: false, // No column for this in the schema
        isResetMatchNeeded: !!data.reset_match_needed,
        isComplete: data.state === 'complete',
        winnersBracketChampionId: data.wb_champion_id,
        losersBracketChampionId: null, // No column for this in the schema
        championId: data.wb_champion_id // Using wb_champion_id as the champion
      };
      
      return bracketState;
    } catch (error) {
      console.error(`Error getting bracket state for bracket ${bracketId}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('getBracketState', `Failed to get bracket state for bracket ${bracketId}`, error as Error);
    }
  }
}
