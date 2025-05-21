
import { PlayoffDatabaseFacade } from './PlayoffDatabaseFacade';
import { PlayoffMatch, PlayoffGame } from '../types';
import { DatabasePlayoffMatch, MatchResultDTO, DatabaseMatchResult, BracketCreationParams } from './types';
import { supabase } from "@/integrations/supabase/client";

/**
 * Adapter to convert between application model and database model
 */
export class PlayoffDatabaseAdapter {
  private static facade = new PlayoffDatabaseFacade();
  private static PLACEHOLDER_PREFIX = 'play-in-';

  /**
   * Create a new bracket in the database
   */
  static async createBracket(params: BracketCreationParams): Promise<{ error?: Error }> {
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
      
      // Insert bracket record
      const { error } = await supabase
        .from('brackets')
        .insert({
          id: params.id,
          title: params.name,
          format: params.format,
          division_id: params.divisionId, // Ensure this is a valid value
          created_at: new Date().toISOString(),
          state: 'pending'
        });
      
      if (error) {
        console.error('Error creating bracket:', error);
        throw error;
      }
      
      console.log(`Bracket ${params.id} created successfully with division_id: ${params.divisionId}`);
      return {};
    } catch (error) {
      console.error('Error creating bracket:', error);
      return { error: error as Error };
    }
  }

  /**
   * Save playoff matches to the database
   */
  static async savePlayoffMatches(matches: PlayoffMatch[]): Promise<void> {
    if (!matches || matches.length === 0) {
      console.log("No matches to save");
      return;
    }
    
    console.log(`Saving ${matches.length} playoff matches`);
    
    // Convert matches to database model
    const dbMatches = matches.map(match => {
      // Validate match ID
      if (!match.id) {
        console.error("Match is missing ID:", match);
        throw new Error("Match ID is required");
      }
      
      // Validate bracket_id
      if (!match.bracket_id || match.bracket_id === 'undefined') {
        console.error(`Match ${match.id} is missing bracket_id:`, match);
        throw new Error(`Match ${match.id} is missing bracket_id`);
      }
      
      return {
        id: match.id,
        bracket_id: match.bracket_id,
        round: match.round,
        position: match.position,
        match_type: match.matchType,
        // Replace placeholder IDs with null before saving to database
        team1_id: match.team1Id?.startsWith(this.PLACEHOLDER_PREFIX) ? null : (match.team1Id ?? null),
        team2_id: match.team2Id?.startsWith(this.PLACEHOLDER_PREFIX) ? null : (match.team2Id ?? null),
        team1_score: match.team1Score ?? null,
        team2_score: match.team2Score ?? null,
        team1_game_wins: match.team1GameWins ?? null,
        team2_game_wins: match.team2GameWins ?? null,
        team1_seed: match.team1Seed ?? null,
        team2_seed: match.team2Seed ?? null,
        winner_id: match.winnerId ?? null,
        loser_id: match.loserId ?? null,
        next_win_match_id: match.nextWinMatchId ?? null,
        next_lose_match_id: match.nextLoseMatchId ?? null,
        best_of: match.bestOf ?? 3,
        status: match.status ?? 'pending'
      };
    });

    await this.facade.savePlayoffMatches(dbMatches);
    console.log(`${matches.length} playoff matches saved successfully`);
  }

  /**
   * Get bracket matches from the database
   */
  static async getBracketMatches(bracketId: string): Promise<DatabasePlayoffMatch[]> {
    return await this.facade.getBracketMatches(bracketId);
  }

  /**
   * Save playoff games to the database
   */
  static async savePlayoffGames(games: PlayoffGame[]): Promise<void> {
    await this.facade.savePlayoffGames(games);
  }

  /**
   * Get match games from the database
   */
  static async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
    return await this.facade.getMatchGames(matchId);
  }

  /**
   * Record match result in the database
   */
  static async recordMatchResult(matchId: string, result: MatchResultDTO): Promise<void> {
    // Convert to DatabaseMatchResult format expected by the facade
    const dbResult: DatabaseMatchResult = {
      match_id: matchId,
      winner_id: result.winnerId,
      loser_id: result.loserId,
      team1_score: result.team1Score,
      team2_score: result.team2Score,
      team1_game_wins: result.team1GameWins,
      team2_game_wins: result.team2GameWins,
      completed: true,
      games: result.games
    };
    
    await this.facade.recordMatchResult(dbResult);
  }

  /**
   * Advance team to the next match
   */
  static async advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void> {
    await this.facade.advanceTeam(nextMatchId, teamId, isWinner);
  }

  /**
   * Mark winners bracket champion
   */
  static async markWinnersBracketChampion(bracketId: string, teamId: string): Promise<void> {
    await this.facade.markWinnersBracketChampion(bracketId, teamId);
  }

  /**
   * Set reset match needed
   */
  static async setResetMatchNeeded(bracketId: string, needed: boolean): Promise<void> {
    await this.facade.setResetMatchNeeded(bracketId, needed);
  }

  /**
   * Mark tournament complete
   */
  static async markTournamentComplete(bracketId: string, championId: string): Promise<void> {
    await this.facade.markTournamentComplete(bracketId, championId);
  }

  /**
   * Create reset match
   */
  static async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<PlayoffMatch> {
    return await this.facade.createResetMatch(bracketId, team1Id, team2Id);
  }

  /**
   * Get bracket state
   */
  static async getBracketState(bracketId: string): Promise<any> {
    return await this.facade.getBracketState(bracketId);
  }

  /**
   * Create a participant
   */
  static async createParticipant(participant: {
    id: string;
    tournament_id: string;
    name: string;
    position?: number;
    seeding?: number;
  }): Promise<string> {
    const { error } = await supabase
      .from('participants')
      .insert({
        id: participant.id,
        tournament_id: participant.tournament_id,
        bracket_id: participant.tournament_id, // bracket_id is the same as tournament_id
        team_id: participant.id, // Use id as team_id for compatibility
        name: participant.name,
        seeding: participant.seeding ?? null,
        position: participant.position ?? null,
      });
      
    if (error) {
      console.error('Error creating participant:', error);
      throw new Error(`Failed to create participant: ${error.message}`);
    }
    
    return participant.id;
  }

  /**
   * Select participants based on filters
   */
  static async selectParticipants(filters?: {
    tournament_id?: string;
    name?: string;
  }): Promise<Array<{
    id: string;
    name: string;
    tournament_id: string;
    position?: number;
    seeding?: number;
  }>> {
    let query = supabase.from('participants').select('*');
    
    if (filters?.tournament_id) {
      query = query.eq('tournament_id', filters.tournament_id);
    }
    
    if (filters?.name) {
      query = query.eq('name', filters.name);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error selecting participants:', error);
      throw new Error(`Failed to select participants: ${error.message}`);
    }
    
    // Convert from DB format to application format
    return (data || []).map(p => ({
      id: p.id,
      name: p.name || '',
      tournament_id: p.tournament_id || p.bracket_id,
      position: p.position,
      seeding: p.seeding
    }));
  }
}

// Complete adapter interface for brackets-manager compatibility
// This implements the CrudInterface required by BracketsManager
export const adapter = {
  // Create methods
  create: {
    match: PlayoffDatabaseAdapter.savePlayoffMatches,
    participant: PlayoffDatabaseAdapter.createParticipant,
  },
  
  // Select methods
  select: {
    match: PlayoffDatabaseAdapter.getBracketMatches,
    participant: PlayoffDatabaseAdapter.selectParticipants,
  },
  
  // Required CrudInterface methods
  insert: async (data: any[]): Promise<number> => {
    try {
      // Determine the type of data and delegate to appropriate create function
      if (data.length === 0) return 0;
      
      const sample = data[0];
      
      // Insert matches
      if ('opponent1' in sample || 'round' in sample) {
        await PlayoffDatabaseAdapter.savePlayoffMatches(data as any);
        return data.length; // Return count of inserted items
      }
      
      // Insert participants
      if ('tournament_id' in sample && 'name' in sample) {
        for (const item of data) {
          await PlayoffDatabaseAdapter.createParticipant(item);
        }
        return data.length; // Return count of inserted items
      }
      
      console.warn('Unrecognized data type in adapter insert:', sample);
      return 0; // No items inserted
    } catch (error) {
      console.error('Error in insert method:', error);
      return 0; // Error occurred, no items inserted
    }
  },
  
  // Update method implementation
  update: async (id: string, data: any): Promise<number> => {
    try {
      console.log('Update operation called with ID:', id, 'and data:', data);
      
      // For participants
      if ('name' in data || 'tournament_id' in data) {
        const { error } = await supabase
          .from('participants')
          .update(data)
          .eq('id', id);
        
        if (error) {
          console.error('Error updating participant:', error);
          throw error;
        }
        return 1; // Return 1 for successful update
      }
      
      // For matches
      if ('opponent1' in data || 'opponent2' in data || 'status' in data) {
        // Map from brackets-manager format to our database format
        const matchData: any = {};
        
        if ('opponent1' in data) matchData.team1_id = data.opponent1?.id || null;
        if ('opponent2' in data) matchData.team2_id = data.opponent2?.id || null;
        if ('status' in data) matchData.status = data.status;
        if ('result' in data && data.result) {
          matchData.team1_score = data.result[0];
          matchData.team2_score = data.result[1];
        }
        
        const { error } = await supabase
          .from('playoff_matches')
          .update(matchData)
          .eq('id', id);
        
        if (error) {
          console.error('Error updating match:', error);
          throw error;
        }
        return 1; // Return 1 for successful update
      }
      
      console.warn('Unrecognized data type in adapter update:', data);
      return 0; // No rows updated
    } catch (error) {
      console.error('Error in update method:', error);
      return 0; // Error occurred, no rows updated
    }
  },
  
  // Delete method implementation
  delete: async (filter?: any): Promise<number> => {
    try {
      console.log('Delete operation called with filter:', filter);
      
      if (!filter) {
        console.warn('No filter provided for delete operation');
        return 0; // No rows deleted
      }
      
      if (filter.tournament_id) {
        // Delete matches by tournament_id
        const { error, count } = await supabase
          .from('playoff_matches')
          .delete()
          .eq('bracket_id', filter.tournament_id)
          .select('count');
        
        if (error) {
          console.error('Error deleting matches:', error);
          throw error;
        }
        
        // Return count of deleted rows if available, or 1 to indicate success
        return count || 1;
      }
      
      console.warn('Delete operation not fully implemented for filter:', filter);
      return 0; // No rows deleted
    } catch (error) {
      console.error('Error in delete method:', error);
      return 0; // Error occurred, no rows deleted
    }
  }
};
