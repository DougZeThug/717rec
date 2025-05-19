
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
      let query = supabase.from('teams').select();
      
      // Apply filters if provided
      if (filter) {
        // Apply each filter separately to avoid deep type instantiation
        Object.entries(filter).forEach(([key, value]) => {
          if (key && value !== undefined) {
            // Explicit type assertion to break the chain
            (query as any) = query.eq(key, value);
          }
        });
      }
      
      // Execute query with explicit typing to break the chain
      const result = await query;
      const { data, error } = result;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error selecting participants:", error);
      throw error;
    }
  }
}
