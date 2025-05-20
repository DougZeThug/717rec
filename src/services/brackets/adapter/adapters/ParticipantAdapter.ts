
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { BaseFilter } from '../interfaces/StorageAdapter';

/**
 * Record type representing a participant in the database
 */
export type ParticipantRecord = {
  id: string;
  name: string;
  tournament_id: string | null;
  position: number | null;
};

/**
 * Data needed to insert a participant into the database
 */
export type ParticipantInsertData = {
  bracket_id: string;
  team_id: string;
  position: number;
};

/**
 * Response from the get_participants RPC function
 */
interface GetParticipantsResponse {
  id: string;
  name: string;
  tournament_id: string;
  team_position: number;
}

/**
 * Interface for RPC function responses
 */
interface RpcResponse {
  data: any;
  error: any | null;
}

/**
 * Filter type for participant queries with specific properties to avoid recursive typing
 */
export interface ParticipantFilter extends BaseFilter {
  tournament_id?: string;
  bracket_id?: string;
  team_id?: string;
  position?: number;
  // Remove the [key: string]: any which causes excessive type instantiation
}

/**
 * Adapter to handle participants (teams) in the database
 * Provides methods to insert, select, update and delete participants
 */
export class ParticipantAdapter {
  /**
   * Insert participants into the database
   * @param participants Array of participant data to insert
   * @returns Number of participants successfully inserted
   */
  async insertParticipants(participants: ParticipantInsertData[]): Promise<number> {
    if (!participants || participants.length === 0) {
      console.log("No participants provided to insert");
      return 0;
    }
    
    try {
      // Filter out invalid participants
      const validParticipants = participants.filter(p => 
        p && p.team_id && typeof p.team_id === 'string' && p.team_id !== 'undefined'
      );
      
      if (validParticipants.length === 0) {
        console.warn("No valid participants to insert");
        return 0;
      }
      
      console.log(`Inserting ${validParticipants.length} participants`);
      
      // Try to insert participants using RPC function
      let insertCount = 0;
      
      for (const participant of validParticipants) {
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
    } catch (error) {
      console.error("Error inserting participants:", error);
      throw error;
    }
  }
  
  /**
   * Select participants from the database based on filter criteria
   * @param filter Filter criteria for selecting participants
   * @returns Array of participant records
   */
  async selectParticipants(filter?: ParticipantFilter): Promise<ParticipantRecord[]> {
    try {
      if (!filter) {
        console.log("No filter provided for selectParticipants");
        return [];
      }
      
      // Try to query from the participants table using RPC function
      try {
        if (filter.tournament_id) {
          // Use RPC call to get participants
          const response = await this.getParticipantsViaRPC(filter.tournament_id);
          
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
        }
      } catch (err) {
        console.warn("Failed to get participants via RPC:", err);
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
   * @param id ID of the participant to update
   * @param participant Updated participant data
   * @returns Number of participants updated (1 or 0)
   */
  async updateParticipant(id: string, participant: Partial<ParticipantRecord>): Promise<number> {
    try {
      if (!id || id === 'undefined' || !participant) {
        console.warn("Invalid ID or participant data for update");
        return 0;
      }
      
      if (participant.position !== undefined && typeof participant.position === 'number') {
        try {
          // Fix: Store result of updateTeamSeed as a boolean
          const success = await this.updateTeamSeed(id, participant.position);
          return success ? 1 : 0;
        } catch (error) {
          console.error("Error updating participant:", error);
          return 0;
        }
      }
      
      return 0;
    } catch (error) {
      console.error("Error updating participant:", error);
      throw error;
    }
  }
  
  /**
   * Delete participants from the database
   * @param filter Filter criteria for deleting participants
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
   * Helper method to call the insert_participant RPC function
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
   */
  private async getParticipantsViaRPC(tournamentId: string): Promise<RpcResponse> {
    return await supabase.rpc(
      'get_participants',
      { p_tournament_id: tournamentId }
    );
  }
  
  /**
   * Helper method to get participants from teams table as fallback
   */
  private async getParticipantsFromTeams(filter: ParticipantFilter): Promise<ParticipantRecord[]> {
    // Create a base query
    let query = supabase.from('teams').select('*');
    
    console.log("Falling back to teams table with filter:", filter);
    
    // Handle id array filter
    if (filter.id && Array.isArray(filter.id)) {
      const validIds = filter.id.filter((id: any) => 
        id && typeof id === 'string' && id.trim() !== '' && id !== 'undefined'
      );
      
      if (validIds.length === 0) {
        console.warn("No valid IDs in filter");
        return [];
      }
      
      query = query.in('id', validIds);
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
    return data.map(team => ({
      id: team.id,
      name: team.name,
      tournament_id: filter?.tournament_id || null,
      position: team.seed || null,
    }));
  }
}
