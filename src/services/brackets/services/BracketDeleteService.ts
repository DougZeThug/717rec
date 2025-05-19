
import { supabase } from "@/integrations/supabase/client";

/**
 * Service for bracket deletion operations
 */
export class BracketDeleteService {
  /**
   * Delete a bracket and its matches
   */
  static async deleteBracket(bracketId: string): Promise<void> {
    try {
      // Delete the matches first (due to foreign key constraint)
      const { error: matchesError } = await supabase
        .from('matches')
        .delete()
        .eq('bracket_id', bracketId);
      
      if (matchesError) throw matchesError;
      
      // Then delete the bracket
      const { error: bracketError } = await supabase
        .from('brackets')
        .delete()
        .eq('id', bracketId);
      
      if (bracketError) throw bracketError;
    } catch (error) {
      console.error("Error deleting bracket:", error);
      throw error;
    }
  }
}
