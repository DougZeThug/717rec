
/**
 * Service for inserting, updating and deleting participants
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  ParticipantFilter, 
  ParticipantInsertData, 
  ParticipantOperationError,
  ParticipantOperationResult
} from '../types/ParticipantTypes';
import { validateParticipantBatch } from '../utils/ParticipantValidationUtils';

/**
 * Service for modifying participants in the database
 */
export class ParticipantMutationService {
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
      // Validate all participants
      const validParticipants = validateParticipantBatch(participants);
      
      if (validParticipants.length === 0) {
        console.warn("No valid participants to insert");
        return 0;
      }
      
      // Add name and tournament_id for each participant if not provided
      const enrichedParticipants = validParticipants.map(p => ({
        ...p,
        name: p.name || p.team_id, // Default to team_id if name is not provided
        tournament_id: p.tournament_id || p.bracket_id // Use bracket_id as tournament_id if not provided
      }));
      
      console.log(`Inserting ${enrichedParticipants.length} participants`);
      const { error, data } = await supabase.from('participants').insert(enrichedParticipants)
        .select('id'); // Select IDs to count inserted rows
      
      if (error) {
        console.error("Error inserting participants:", error);
        throw new ParticipantOperationError(`Participant insert failed: ${error.message}`, error);
      }
      
      return data?.length || enrichedParticipants.length;
    } catch (error) {
      if (error instanceof ParticipantOperationError) {
        throw error; // Re-throw our own error types
      }
      console.error("Error inserting participants:", error);
      throw new ParticipantOperationError(`Failed to insert participants: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update a participant in the database
   * @returns Number of participants updated (1 or 0)
   */
  async updateParticipant(id: string, data: { position?: number; name?: string; tournament_id?: string; bracket_id?: string; seeding?: number }): Promise<number> {
    try {
      if (!id) {
        throw new ParticipantOperationError('Team ID is required for update');
      }
      
      const updateData: any = {};
      
      if (data.position !== undefined) {
        if (isNaN(data.position) || data.position < 0) {
          throw new ParticipantOperationError('Position must be a non-negative number');
        }
        updateData.position = data.position;
      }
      
      if (data.name) {
        updateData.name = data.name;
      }
      
      if (data.seeding !== undefined) {
        updateData.seeding = data.seeding;
      }
      
      if (Object.keys(updateData).length === 0) {
        console.warn("No data provided for participant update");
        return 0;
      }
      
      // Use tournament_id if provided, otherwise use bracket_id
      const tournamentId = data.tournament_id;
      const bracketId = data.bracket_id;
      
      if (!tournamentId && !bracketId) {
        throw new ParticipantOperationError('Tournament or bracket ID is required for update');
      }
      
      let query = supabase.from('participants').update(updateData).eq('team_id', id);
      
      if (tournamentId) {
        query = query.eq('tournament_id', tournamentId);
      } else if (bracketId) {
        query = query.eq('bracket_id', bracketId);
      }
      
      const { error, count } = await query.select('count');
      
      if (error) {
        console.error("Error updating participant:", error);
        throw new ParticipantOperationError(`Failed to update participant: ${error.message}`, error);
      }
      
      return count || 0;
    } catch (error) {
      if (error instanceof ParticipantOperationError) {
        throw error;
      }
      console.error("Error updating participant:", error);
      throw new ParticipantOperationError(`Failed to update participant: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Delete participants from the database
   * @returns Number of participants deleted
   */
  async deleteParticipants(filter?: ParticipantFilter): Promise<number> {
    try {
      let query = supabase.from('participants').delete();
      
      if (filter) {
        // Apply filters if provided
        if (filter.id) {
          if (Array.isArray(filter.id)) {
            query = query.in('team_id', filter.id); // Map id to team_id
          } else {
            query = query.eq('team_id', filter.id); // Map id to team_id
          }
        }
        
        if (filter.bracket_id) {
          query = query.eq('bracket_id', filter.bracket_id);
        }
        
        if (filter.tournament_id) {
          query = query.eq('tournament_id', filter.tournament_id);
        }
        
        if (filter.team_id) {
          query = query.eq('team_id', filter.team_id);
        }
        
        if (filter.position !== undefined) {
          query = query.eq('position', filter.position);
        }
        
        if (filter.seeding !== undefined) {
          query = query.eq('seeding', filter.seeding);
        }
      }
      
      const { error, count } = await query.select('count');
      
      if (error) {
        console.error("Error deleting participants:", error);
        throw new ParticipantOperationError(`Failed to delete participants: ${error.message}`, error);
      }
      
      return count || 0;
    } catch (error) {
      if (error instanceof ParticipantOperationError) {
        throw error;
      }
      console.error("Error deleting participants:", error);
      throw new ParticipantOperationError(`Failed to delete participants: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Simplified static service for quick use
 */
export const ParticipantMutationServiceStatic = {
  async insert(bracketId: string, teamIds: string[]): Promise<number> {
    if (!bracketId || !teamIds || teamIds.length === 0) {
      return 0;
    }
    
    const service = new ParticipantMutationService();
    
    const rows = teamIds.map((teamId, i) => ({
      bracket_id: bracketId,
      tournament_id: bracketId, // Set tournament_id to bracket_id for compatibility with brackets-manager
      team_id: teamId,
      position: i + 1,
      name: teamId, // Use team_id as default name
      seeding: i + 1 // Set default seeding based on position
    }));
    
    return service.insertParticipants(rows);
  },
};
