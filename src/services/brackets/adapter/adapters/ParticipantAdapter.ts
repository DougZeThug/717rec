
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
      const validParticipants = participants.filter(p => 
        p && p.team_id && typeof p.team_id === 'string' && p.team_id !== 'undefined'
      );
      
      if (validParticipants.length === 0) {
        console.warn("No valid participants to insert");
        return 0;
      }
      
      console.log(`Inserting ${validParticipants.length} participants`);
      const { error } = await supabase.from('participants').insert(validParticipants);
      
      if (error) {
        console.error("Error inserting participants:", error);
        throw new Error(`Participant insert failed: ${error.message}`);
      }
      
      return validParticipants.length;
    } catch (error) {
      console.error("Error inserting participants:", error);
      throw error;
    }
  }
  
  /**
   * Select participants from the database
   * @returns Array of participant records
   */
  async selectParticipants(filter?: ParticipantFilter): Promise<any[]> {
    try {
      // Build query with proper filter handling
      let query = supabase.from('participants').select(`
        id,
        team_id,
        bracket_id,
        position,
        teams:team_id (name)
      `);
      
      if (filter) {
        // Apply filters if provided
        if (filter.id) {
          if (Array.isArray(filter.id)) {
            query = query.in('id', filter.id);
          } else {
            query = query.eq('id', filter.id);
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
      
      // Execute query and handle response
      const { data, error } = await query;
      
      if (error) {
        console.error("Error selecting participants:", error);
        throw error;
      }
      
      // Transform the result to match expected format
      return data ? data.map(p => ({
        id: p.team_id,
        name: p.teams?.name || `Team ${p.position}`,
        tournament_id: p.bracket_id,
        position: p.position
      })) : [];
    } catch (error) {
      console.error("Error selecting participants:", error);
      throw error;
    }
  }
  
  /**
   * Update a participant in the database
   * @returns Number of participants updated (1 or 0)
   */
  async updateParticipant(id: string, data: any): Promise<number> {
    try {
      const { error } = await supabase
        .from('participants')
        .update({
          position: data.position
        })
        .eq('team_id', id)
        .eq('bracket_id', data.tournament_id || data.bracket_id);
      
      if (error) {
        console.error("Error updating participant:", error);
        throw error;
      }
      
      return 1; // Return 1 for successful update
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
        throw error;
      }
      
      return count || 0;
    } catch (error) {
      console.error("Error deleting participants:", error);
      throw error;
    }
  }
}

/**
 * Simplified static version of the adapter for quick use
 */
export const ParticipantAdapterStatic = {
  async insert(bracketId: string, teamIds: string[]): Promise<number> {
    if (!bracketId || !teamIds || teamIds.length === 0) {
      return 0;
    }
    
    const rows = teamIds.map((teamId, i) => ({
      bracket_id: bracketId,
      team_id: teamId,
      position: i + 1,
    }));
    
    const { error } = await supabase.from('participants').insert(rows);
    if (error) throw new Error(`Participant insert failed: ${error.message}`);
    return rows.length;
  },
};
