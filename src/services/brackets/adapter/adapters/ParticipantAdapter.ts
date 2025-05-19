
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

type ParticipantRecord = {
  id: string;
  name: string;
  tournament_id: string | null;
  position: number | null;
};

/**
 * Adapter to handle participants (teams) in the database
 */
export class ParticipantAdapter {
  /**
   * Insert participants into the database
   * @returns Number of participants inserted
   */
  async insertParticipants(participants: any[]): Promise<number> {
    if (!participants || participants.length === 0) return 0;
    
    try {
      // Map bracket participants to our team IDs
      // Since we use teams as participants, we don't need to insert new records
      // But we should verify the teams exist
      const teamIds = participants.map(p => p.id);
      
      const { data, error } = await supabase
        .from('teams')
        .select('id')
        .in('id', teamIds);
      
      if (error) throw error;
      
      const validTeamIds = data.map(team => team.id);
      const missingTeams = participants.filter(p => !validTeamIds.includes(p.id));
      
      if (missingTeams.length > 0) {
        console.warn(`Some participant teams don't exist in the database: ${missingTeams.map(t => t.id).join(', ')}`);
      }
      
      // Return number of valid participants
      return validTeamIds.length;
    } catch (error) {
      console.error("Error inserting participants:", error);
      throw error;
    }
  }
  
  /**
   * Select participants from the database
   */
  async selectParticipants(filter?: Record<string, any>): Promise<ParticipantRecord[]> {
    try {
      // Define an explicit query type to avoid deep type instantiation
      let query = supabase.from('teams').select('*');
      
      // Apply filters if provided
      if (filter) {
        if (filter.id && Array.isArray(filter.id)) {
          query = query.in('id', filter.id);
        } else {
          // Apply simple equality filters
          Object.entries(filter).forEach(([key, value]) => {
            if (key !== 'tournament_id') { // Skip tournament_id as it needs special handling
              query = query.eq(key, value);
            }
          });
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Convert teams to bracket participant format with explicit typing
      return data.map(team => ({
        id: team.id,
        name: team.name,
        tournament_id: filter?.tournament_id || null,
        position: team.seed || null,
      }));
    } catch (error) {
      console.error("Error selecting participants:", error);
      throw error;
    }
  }
  
  /**
   * Update a participant in the database
   * @returns Number of participants updated (1 or 0)
   */
  async updateParticipant(id: string, participant: any): Promise<number> {
    try {
      // We don't actually update teams from bracket operations
      // This is a minimal implementation
      console.log(`Would update participant ${id} with:`, participant);
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
  async deleteParticipants(filter?: Record<string, any>): Promise<number> {
    try {
      // We don't delete teams from bracket operations
      // This is a minimal implementation
      console.log(`Would delete participants with filter:`, filter);
      return 0;
    } catch (error) {
      console.error("Error deleting participants:", error);
      throw error;
    }
  }
}
