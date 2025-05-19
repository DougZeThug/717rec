
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
    if (!participants || participants.length === 0) {
      console.log("No participants provided to insert");
      return 0;
    }
    
    try {
      // Filter out invalid participants
      const validParticipants = participants.filter(p => 
        p && p.id && typeof p.id === 'string' && p.id !== 'undefined'
      );
      
      if (validParticipants.length === 0) {
        console.warn("No valid participants to insert");
        return 0;
      }
      
      // Map bracket participants to our team IDs
      // Since we use teams as participants, we don't need to insert new records
      // But we should verify the teams exist
      const teamIds = validParticipants.map(p => p.id);
      
      console.log(`Verifying ${teamIds.length} team IDs in database`);
      
      const { data, error } = await supabase
        .from('teams')
        .select('id')
        .in('id', teamIds);
      
      if (error) {
        console.error("Error querying teams:", error);
        throw error;
      }
      
      const validTeamIds = data.map(team => team.id);
      const missingTeams = validParticipants.filter(p => !validTeamIds.includes(p.id));
      
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
      if (!filter) {
        console.log("No filter provided for selectParticipants");
        return [];
      }
      
      // Create a base query without chaining methods that cause deep type instantiation
      const baseQuery = supabase.from('teams');
      
      // First get the raw data with minimal filtering
      let { data, error } = await this.applyFilters(baseQuery, filter);
      
      if (error) {
        console.error("Error selecting participants:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log("No participants found with filter:", filter);
        return [];
      }
      
      console.log(`Found ${data.length} participants`);
      
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
   * Apply filters to query without causing deep type instantiation
   * Helper method to simplify the query building process
   */
  private async applyFilters(baseQuery: any, filter?: Record<string, any>) {
    // Start with a simple select
    let query = baseQuery.select('*');
    
    // Apply filters in a way that doesn't nest type instantiation
    if (filter) {
      // Debug the filter being applied
      console.log("Applying filter to participants query:", filter);
      
      // Handle id array filter separately
      if (filter.id && Array.isArray(filter.id)) {
        // Filter out any invalid IDs
        const validIds = filter.id.filter((id: any) => 
          id && typeof id === 'string' && id.trim() !== '' && id !== 'undefined'
        );
        
        if (validIds.length === 0) {
          console.warn("No valid IDs in filter");
          return { data: [], error: null };
        }
        
        return await query.in('id', validIds);
      }
      
      // Handle simple equality filters
      const simpleFilters: Record<string, any> = {};
      
      // Build filter object first, avoiding nested method chaining
      Object.entries(filter).forEach(([key, value]) => {
        if (key !== 'tournament_id' && value !== undefined && value !== 'undefined') {
          simpleFilters[key] = value;
        }
      });
      
      // Apply all filters at once to reduce nesting
      if (Object.keys(simpleFilters).length > 0) {
        return await query.match(simpleFilters);
      }
    }
    
    // If no filters applied, return the base query result
    return await query;
  }
  
  /**
   * Update a participant in the database
   * @returns Number of participants updated (1 or 0)
   */
  async updateParticipant(id: string, participant: any): Promise<number> {
    try {
      if (!id || id === 'undefined' || !participant) {
        console.warn("Invalid ID or participant data for update");
        return 0;
      }
      
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
