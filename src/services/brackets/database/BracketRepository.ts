import { supabase } from "@/integrations/supabase/client";
import { BracketState } from "../types";
import { DatabaseOperationError, IBracketRepository } from "./types";

/**
 * Repository implementation for bracket state management
 */
export class BracketRepository implements IBracketRepository {
  /**
   * Mark a team as the winners bracket champion
   */
  async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('brackets')
        .update({ 
          wb_champion_id: teamId 
        })
        .eq('id', bracketId);
      
      if (error) throw new DatabaseOperationError('markWinnersBracketChampion', `Failed to mark WB champion for bracket ${bracketId}`, error);
    } catch (error) {
      console.error(`Error marking winners bracket champion for bracket ${bracketId}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('markWinnersBracketChampion', `Failed to mark WB champion for bracket ${bracketId}`, error as Error);
    }
  }

  /**
   * Set whether a reset match is needed
   */
  async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('brackets')
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
   * Mark the tournament as complete with a champion
   */
  async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('brackets')
        .update({ 
          state: 'completed',
          wb_champion_id: championId,
          reset_match_needed: false
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
      const { data, error } = await supabase
        .from('brackets')
        .select('wb_champion_id, reset_match_needed, state')
        .eq('id', bracketId)
        .single();
        
      if (error) throw new DatabaseOperationError('getBracketState', `Failed to get bracket state for bracket ${bracketId}`, error);
      
      // Get the finals matches to determine champions
      const { data: finalsMatches } = await supabase
        .from('playoff_matches')
        .select('winner_id, team1_id, team2_id')
        .eq('bracket_id', bracketId)
        .eq('match_type', 'finals');
        
      // Find losers bracket champion (team that's not the WB champion in the finals)
      let losersBracketChampionId: string | null = null;
      
      if (finalsMatches && finalsMatches.length > 0 && data.wb_champion_id) {
        const finalsMatch = finalsMatches[0];
        if (finalsMatch.team1_id && finalsMatch.team1_id !== data.wb_champion_id) {
          losersBracketChampionId = finalsMatch.team1_id;
        } else if (finalsMatch.team2_id && finalsMatch.team2_id !== data.wb_champion_id) {
          losersBracketChampionId = finalsMatch.team2_id;
        }
      }
      
      // Determine overall champion based on matches and bracket state
      let championId = null;
      if (data.state === 'completed') {
        // If there was a reset match, the winner of that is the champion
        if (finalsMatches.length > 1) {
          championId = finalsMatches[1].winner_id;
        } 
        // Otherwise if WB champion won the finals, they're the champion
        else if (finalsMatches.length > 0 && finalsMatches[0].winner_id === data.wb_champion_id) {
          championId = data.wb_champion_id;
        }
      }
      
      return {
        isWinnersBracketComplete: !!data.wb_champion_id,
        isLosersBracketComplete: !!losersBracketChampionId,
        isResetMatchNeeded: !!data.reset_match_needed,
        isComplete: data.state === 'completed',
        winnersBracketChampionId: data.wb_champion_id,
        losersBracketChampionId: losersBracketChampionId,
        championId: championId
      };
    } catch (error) {
      console.error(`Error getting bracket state for bracket ${bracketId}:`, error);
      if (error instanceof DatabaseOperationError) throw error;
      
      return {
        isWinnersBracketComplete: false,
        isLosersBracketComplete: false,
        isResetMatchNeeded: false,
        isComplete: false,
        winnersBracketChampionId: null,
        losersBracketChampionId: null,
        championId: null
      };
    }
  }
}
