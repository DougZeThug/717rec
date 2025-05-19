
import { supabase } from "@/integrations/supabase/client";

/**
 * Adapter to manage participants/teams in the database
 */
export class ParticipantAdapter {
  /**
   * Insert participants into the database
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
    const query = supabase.from('teams').select();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query.eq(key, value);
      });
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
}
