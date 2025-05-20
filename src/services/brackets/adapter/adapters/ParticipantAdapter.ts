
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
