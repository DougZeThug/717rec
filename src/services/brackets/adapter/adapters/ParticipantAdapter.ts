
import { supabase } from "@/integrations/supabase/client";

/**
 * Adapter to manage participants/teams in the database
 */
export class ParticipantAdapter {
  /**
   * Insert participants into the database
   * @returns Number of participants inserted
   */
  async insertParticipants(participants: any[]): Promise<number> {
    // Map participants to our team format if needed
    const { error } = await supabase.from('teams').insert(participants);
    if (error) throw error;
    return participants.length;
  }
  
  /**
   * Select participants from the database
   */
  async selectParticipants(filter?: Record<string, any>): Promise<any[]> {
    try {
      // Create base query
      const query = supabase.from('teams');
      
      // Apply filters if provided
      let finalQuery = query;
      if (filter) {
        // Explicitly type as any to break the deep instantiation chain
        const queryBuilder = query as any;
        
        // Apply each filter with proper typing
        Object.keys(filter).forEach((key) => {
          const value = filter[key];
          if (key && value !== undefined) {
            queryBuilder.eq(key, value);
          }
        });
        
        finalQuery = queryBuilder;
      }
      
      // Execute the query
      const { data, error } = await finalQuery.select();
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error selecting participants:", error);
      throw error;
    }
  }
}
