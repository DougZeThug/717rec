
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
      // Use separate query builder to avoid deep instantiation
      let query = supabase.from('teams');
      
      // Apply each filter individually to avoid deep instantiation
      if (filter) {
        Object.keys(filter).forEach((key) => {
          const value = filter[key];
          if (key && value !== undefined) {
            // Use type assertion to break the chain
            query = query.eq(key, value) as any;
          }
        });
      }
      
      // Execute the query
      const { data, error } = await query.select();
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error selecting participants:", error);
      throw error;
    }
  }
}
