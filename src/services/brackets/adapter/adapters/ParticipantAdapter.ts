
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

type ParticipantRecord = {
  id: string;
  name: string;
  tournament_id: string | null;
  position: number | null;
};

// Define a custom type for participant insertion
type ParticipantInsertData = {
  bracket_id: string;
  team_id: string;
  position: number;
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
      
      // Try to insert into participants table using raw query to avoid TypeScript errors
      let insertCount = 0;
      try {
        for (const participant of validParticipants) {
          // Skip participants with missing tournament_id
          if (!participant.tournament_id) {
            console.warn("Skipping participant with missing tournament_id:", participant.id);
            continue;
          }
          
          // Use custom RPC call for inserting participant
          const { error: insertError } = await supabase.rpc(
            'insert_participant',
            {
              p_bracket_id: participant.tournament_id,
              p_team_id: participant.id,
              p_team_position: participant.position || 0
            }
          );
              
          if (insertError) {
            // Fall back to raw SQL if RPC doesn't exist yet
            console.warn("Error inserting participant:", insertError);
            const { error: rawError } = await supabase.from('teams')
              .update({ seed: participant.position || 0 })
              .eq('id', participant.id);
              
            if (rawError) {
              console.warn("Error updating team seed:", rawError);
            } else {
              console.log(`Updated seed for team ${participant.id} to ${participant.position || 0}`);
              insertCount++;
            }
          } else {
            insertCount++;
          }
        }
      } catch (participantError) {
        // If the participants table doesn't exist yet, just log and continue
        console.warn("Could not insert into participants table - it may not exist yet:", participantError);
        // Fall back to updating team seeds
        for (const participant of validParticipants) {
          if (participant.id && participant.position) {
            const { error: seedError } = await supabase.from('teams')
              .update({ seed: participant.position })
              .eq('id', participant.id);
              
            if (seedError) {
              console.warn(`Error updating seed for team ${participant.id}:`, seedError);
            } else {
              insertCount++;
            }
          }
        }
      }
      
      // Return number of valid participants inserted
      return insertCount;
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
      
      // Try to query from the new participants table first using raw SQL
      try {
        // Use RPC call to get participants
        const { data, error } = await supabase.rpc(
          'get_participants',
          { p_tournament_id: filter.tournament_id }
        );
        
        if (!error && data) {
          console.log(`Found ${data.length} participants from participants table`);
          return data as ParticipantRecord[];
        }
      } catch (err) {
        console.warn("Participants table or function may not exist yet, falling back to teams:", err);
      }
      
      // Fall back to teams table
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
      
      console.log(`Found ${data.length} teams as participants`);
      
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
      
      // Handle tournament_id filter by looking up teams in that bracket
      if (filter.tournament_id) {
        // Try to match by bracket_id
        query = query.eq('bracket_id', filter.tournament_id);
        
        // Remove tournament_id from simple filters since we handled it
        const { tournament_id, ...otherFilters } = filter;
        filter = otherFilters;
      }
      
      // Handle simple equality filters
      const simpleFilters: Record<string, any> = {};
      
      // Build filter object first, avoiding nested method chaining
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== 'undefined') {
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
