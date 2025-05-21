
import { supabase } from "@/integrations/supabase/client";
import { BaseRepository } from "./BaseRepository";
import { BracketCreationParams, DatabaseBracketState, DatabaseOperationError, IBracketRepository } from "../types/DatabaseTypes";

/**
 * Repository for bracket-related operations
 */
export class BracketRepository extends BaseRepository implements IBracketRepository {
  /**
   * Create a new bracket in the database
   * @param params Bracket creation parameters
   * @returns Success object or error
   */
  async createBracket(params: BracketCreationParams): Promise<{ error?: Error }> {
    try {
      console.log(`Creating bracket in database: id=${params.id}, name=${params.name}, format=${params.format}, divisionId=${params.divisionId || 'none'}`);
      
      // Validate required parameters
      if (!params.id || params.id === 'undefined') {
        throw new Error('Invalid bracket ID');
      }
      
      if (!params.name || params.name.trim() === '') {
        throw new Error('Bracket name is required');
      }
      
      // Validate division ID
      if (!params.divisionId || params.divisionId === 'undefined') {
        throw new Error('Division ID is required');
      }
      
      await this.executeOperation('createBracket', () =>
        supabase
          .from('brackets')
          .insert({
            id: params.id,
            title: params.name,
            format: params.format,
            division_id: params.divisionId,
            created_at: new Date().toISOString(),
            state: 'pending'
          })
      );
      
      console.log(`Bracket ${params.id} created successfully with division_id: ${params.divisionId}`);
      return {};
    } catch (error) {
      console.error('Error creating bracket:', error);
      return { error: error as Error };
    }
  }
  
  /**
   * Mark a team as the winners bracket champion
   * @param bracketId Bracket ID
   * @param teamId Team ID
   */
  async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    await this.executeOperation('markWinnersBracketChampion', () =>
      supabase
        .from('brackets')
        .update({ wb_champion_id: teamId })
        .eq('id', bracketId)
    );
  }

  /**
   * Set whether a reset match is needed for the bracket
   * @param bracketId Bracket ID
   * @param needed Whether a reset match is needed
   */
  async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    await this.executeOperation('setResetMatchNeeded', () =>
      supabase
        .from('brackets')
        .update({ reset_match_needed: needed })
        .eq('id', bracketId)
    );
  }

  /**
   * Mark a tournament as complete with the specified champion
   * @param bracketId Bracket ID
   * @param championId Champion team ID
   */
  async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    await this.executeOperation('markTournamentComplete', () =>
      supabase
        .from('brackets')
        .update({
          wb_champion_id: championId,
          state: 'complete'
        })
        .eq('id', bracketId)
    );
  }
  
  /**
   * Get the current state of a bracket
   * @param bracketId Bracket ID
   * @returns Bracket state
   */
  async getBracketState(bracketId: string): Promise<DatabaseBracketState> {
    try {
      const data = await this.executeQuery('getBracketState', () =>
        supabase
          .from('brackets')
          .select('wb_champion_id, reset_match_needed, state')
          .eq('id', bracketId)
          .single()
      );
      
      // Convert the database representation to our application model
      return {
        isWinnersBracketComplete: !!data.wb_champion_id,
        isLosersBracketComplete: false, // No column for this in the schema
        isResetMatchNeeded: !!data.reset_match_needed,
        isComplete: data.state === 'complete',
        winnersBracketChampionId: data.wb_champion_id,
        losersBracketChampionId: null, // No column for this in the schema
        championId: data.wb_champion_id // Using wb_champion_id as the champion
      };
    } catch (error) {
      console.error(`Error getting bracket state for bracket ${bracketId}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('getBracketState', `Failed to get bracket state for bracket ${bracketId}`, error as Error);
    }
  }
}
