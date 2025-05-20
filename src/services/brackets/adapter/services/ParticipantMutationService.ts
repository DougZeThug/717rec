
/**
 * Service for inserting, updating and deleting participants
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  ParticipantFilter, 
  ParticipantInsertData, 
  ParticipantOperationError 
} from '../types/ParticipantTypes';

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
      // Filter out invalid participants
      const validParticipants = participants.filter(p => 
        p && p.team_id && typeof p.team_id === 'string' && p.team_id !== 'undefined'
      );
      
      if (validParticipants.length === 0) {
        console.warn("No valid participants to insert");
        return 0;
      }
      
      // Add name for each participant if not provided
      const participantsWithName = validParticipants.map(p => ({
        ...p,
        name: p.name || p.team_id // Default to team_id if name is not provided
      }));
      
      console.log(`Inserting ${participantsWithName.length} participants`);
      const { error } = await supabase.from('participants').insert(participantsWithName);
      
      if (error) {
        console.error("Error inserting participants:", error);
        throw new ParticipantOperationError(`Participant insert failed: ${error.message}`, error);
      }
      
      return participantsWithName.length;
    } catch (error) {
      console.error("Error inserting participants:", error);
      throw new ParticipantOperationError(`Failed to insert participants: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update a participant in the database
   * @returns Number of participants updated (1 or 0)
   */
  async updateParticipant(id: string, data: { position?: number; name?: string; tournament_id?: string; bracket_id?: string }): Promise<number> {
    try {
      const updateData: any = {};
      
      if (data.position !== undefined) {
        updateData.position = data.position;
      }
      
      if (data.name) {
        updateData.name = data.name;
      }
      
      if (Object.keys(updateData).length === 0) {
        console.warn("No data provided for participant update");
        return 0;
      }
      
      const { error } = await supabase
        .from('participants')
        .update(updateData)
        .eq('team_id', id)
        .eq('bracket_id', data.tournament_id || data.bracket_id);
      
      if (error) {
        console.error("Error updating participant:", error);
        throw new ParticipantOperationError(`Failed to update participant: ${error.message}`, error);
      }
      
      return 1; // Return 1 for successful update
    } catch (error) {
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
          query = query.eq('bracket_id', filter.tournament_id); // Map tournament_id to bracket_id
        }
        
        if (filter.team_id) {
          query = query.eq('team_id', filter.team_id);
        }
        
        if (filter.position !== undefined) {
          query = query.eq('position', filter.position);
        }
      }
      
      const { error, count } = await query.select('count');
      
      if (error) {
        console.error("Error deleting participants:", error);
        throw new ParticipantOperationError(`Failed to delete participants: ${error.message}`, error);
      }
      
      return count || 0;
    } catch (error) {
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
      team_id: teamId,
      position: i + 1,
      name: teamId // Use team_id as default name
    }));
    
    return service.insertParticipants(rows);
  },
};
