
import { supabase } from "@/integrations/supabase/client";
import { BaseFilter } from '../interfaces/StorageAdapter';

/**
 * Filter type for participant queries with specific properties
 */
export interface ParticipantFilter extends BaseFilter {
  tournament_id?: string;
  bracket_id?: string;
  team_id?: string;
  position?: number;
}

/**
 * Record type representing a participant in the database
 */
export interface ParticipantRecord {
  id: string;
  name: string;
  tournament_id: string | null;
  position: number | null;
}

/**
 * Data needed to insert a participant into the database
 */
export interface ParticipantInsertData {
  bracket_id: string;
  team_id: string;
  position: number;
}

/**
 * RPC function responses
 */
interface GetParticipantsResponse {
  id: string;
  name: string;
  tournament_id: string;
  team_position: number;
}

interface RpcResponse {
  data: any;
  error: any | null;
}

/**
 * Team database record
 */
interface TeamDbRecord {
  id: string;
  name: string;
  bracket_id?: string;
  seed?: number;
  logo_url?: string | null;
  image_url?: string | null;
  divisionName?: string | null;
}

/**
 * Adapter to handle participants (teams) in the database
 */
export class ParticipantAdapter {
  /**
   * Insert participants into the database
   * @returns Number of participants successfully inserted
   */
  async insertParticipants(participants: ParticipantInsertData[]): Promise<number> {
    if (!participants || participants.length === 0) {
      console.log("No participants provided to insert");
      return 0;
    }
    
    try {
      // Filter out invalid participants
      const validParticipants = this.filterValidParticipants(participants);
      
      if (validParticipants.length === 0) {
        console.warn("No valid participants to insert");
        return 0;
      }
      
      console.log(`Inserting ${validParticipants.length} participants`);
      return await this.processParticipantInsertions(validParticipants);
    } catch (error) {
      console.error("Error inserting participants:", error);
      throw error;
    }
  }

  /**
   * Select participants from the database based on filter criteria
   * @returns Array of participant records
   */
  async selectParticipants(filter?: ParticipantFilter): Promise<ParticipantRecord[]> {
    try {
      if (!filter) {
        console.log("No filter provided for selectParticipants");
        return [];
      }
      
      // Try to query from the participants table using RPC function
      if (filter.tournament_id) {
        const participants = await this.getParticipantsFromRpc(filter.tournament_id);
        if (participants.length > 0) return participants;
      }
      
      // Fall back to teams table
      return this.getParticipantsFromTeams(filter);
    } catch (error) {
      console.error("Error selecting participants:", error);
      throw error;
    }
  }

  /**
   * Update a participant in the database
   * @returns Number of participants updated (1 or 0)
   */
  async updateParticipant(id: string, participant: Partial<ParticipantRecord>): Promise<number> {
    if (!this.validateParticipantUpdate(id, participant)) {
      return 0;
    }
    
    try {
      if (participant.position !== undefined && typeof participant.position === 'number') {
        const success = await this.updateTeamSeed(id, participant.position);
        return success ? 1 : 0;
      }
      
      return 0;
    } catch (error) {
      console.error("Error updating participant:", error);
      throw error;
    }
  }

  /**
   * Delete participants from the database
   * @returns Number of participants deleted
   */
  async deleteParticipants(filter?: ParticipantFilter): Promise<number> {
    try {
      // We don't delete teams from bracket operations
      // Just log the attempt
      console.log(`Would delete participants with filter:`, filter);
      return 0;
    } catch (error) {
      console.error("Error deleting participants:", error);
      throw error;
    }
  }
  
  /**
   * Filter valid participants for insertion
   * @private
   */
  private filterValidParticipants(participants: ParticipantInsertData[]): ParticipantInsertData[] {
    return participants.filter(p => 
      p && p.team_id && typeof p.team_id === 'string' && p.team_id !== 'undefined'
    );
  }
  
  /**
   * Process participant insertions in batch
   * @private
   */
  private async processParticipantInsertions(participants: ParticipantInsertData[]): Promise<number> {
    let insertCount = 0;
    
    for (const participant of participants) {
      try {
        const { error } = await this.insertParticipantViaRPC(
          participant.bracket_id,
          participant.team_id,
          participant.position
        );
        
        if (error) {
          console.warn("Error inserting participant via RPC:", error);
          // Fall back to updating team seed
          const updateSuccess = await this.updateTeamSeed(
            participant.team_id, 
            participant.position
          );
          
          if (updateSuccess) insertCount++;
        } else {
          insertCount++;
        }
      } catch (err) {
        console.error("Error processing participant:", err);
      }
    }
    
    return insertCount;
  }
  
  /**
   * Get participants from RPC function
   * @private
   */
  private async getParticipantsFromRpc(tournamentId: string): Promise<ParticipantRecord[]> {
    try {
      const response = await this.getParticipantsViaRPC(tournamentId);
      
      if (response.data && response.data.length > 0) {
        console.log(`Found ${response.data.length} participants from RPC call`);
        
        // Convert from RPC response format to ParticipantRecord format
        return response.data.map((p: GetParticipantsResponse) => ({
          id: p.id,
          name: p.name,
          tournament_id: p.tournament_id,
          position: p.team_position
        }));
      }
      
      return [];
    } catch (err) {
      console.warn("Failed to get participants via RPC:", err);
      return [];
    }
  }
  
  /**
   * Validate participant update parameters
   * @private
   */
  private validateParticipantUpdate(id: string, participant: Partial<ParticipantRecord>): boolean {
    if (!id || id === 'undefined' || !participant) {
      console.warn("Invalid ID or participant data for update");
      return false;
    }
    return true;
  }

  /**
   * Helper method to call the insert_participant RPC function
   * @private
   */
  private async insertParticipantViaRPC(
    bracketId: string, 
    teamId: string, 
    position: number
  ): Promise<{error: any | null}> {
    return await supabase.rpc(
      'insert_participant',
      {
        p_bracket_id: bracketId,
        p_team_id: teamId,
        p_team_position: position
      }
    );
  }
  
  /**
   * Helper method to update team seed as fallback
   * @private
   */
  private async updateTeamSeed(teamId: string, position: number): Promise<boolean> {
    const { error } = await supabase.from('teams')
      .update({ seed: position })
      .eq('id', teamId);
      
    if (error) {
      console.warn(`Error updating seed for team ${teamId}:`, error);
      return false;
    } else {
      console.log(`Updated seed for team ${teamId} to ${position}`);
      return true;
    }
  }
  
  /**
   * Helper method to call the get_participants RPC function
   * @private
   */
  private async getParticipantsViaRPC(tournamentId: string): Promise<RpcResponse> {
    return await supabase.rpc(
      'get_participants',
      { p_tournament_id: tournamentId }
    );
  }
  
  /**
   * Helper method to get participants from teams table as fallback
   * @private
   */
  private async getParticipantsFromTeams(filter: ParticipantFilter): Promise<ParticipantRecord[]> {
    console.log("Falling back to teams table with filter:", filter);
    
    // Create a base query
    let query = supabase.from('teams').select('*');
    
    // Apply filters
    query = this.applyTeamsFilter(query, filter);
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error("Error selecting participants from teams:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log("No participants found with filter:", filter);
      return [];
    }
    
    console.log(`Found ${data.length} teams as participants`);
    
    // Convert teams to bracket participant format
    return this.convertTeamsToParticipants(data, filter.tournament_id);
  }
  
  /**
   * Apply filters to teams query
   * @private
   */
  private applyTeamsFilter(query: any, filter: ParticipantFilter): any {
    // Handle id array filter
    if (filter.id && Array.isArray(filter.id)) {
      const validIds = filter.id.filter((id: string) => 
        id && typeof id === 'string' && id.trim() !== '' && id !== 'undefined'
      );
      
      if (validIds.length > 0) {
        query = query.in('id', validIds);
      }
    } else if (filter.id && typeof filter.id === 'string') {
      // Handle single id filter
      query = query.eq('id', filter.id);
    }
    
    // Handle tournament_id filter by looking up teams in that bracket
    if (filter.tournament_id) {
      // Try to match by bracket_id
      query = query.eq('bracket_id', filter.tournament_id);
    }
    
    // Handle team_id filter
    if (filter.team_id) {
      query = query.eq('id', filter.team_id);
    }
    
    // Handle position/seed filter
    if (filter.position !== undefined) {
      query = query.eq('seed', filter.position);
    }
    
    return query;
  }
  
  /**
   * Convert teams data to participant records
   * @private
   */
  private convertTeamsToParticipants(
    teams: TeamDbRecord[],
    tournamentId?: string
  ): ParticipantRecord[] {
    return teams.map(team => ({
      id: team.id,
      name: team.name,
      tournament_id: tournamentId || null,
      position: team.seed || null,
    }));
  }
}
