import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

/**
 * Service for bracket deletion operations
 */
export class BracketDeleteService {
  /**
   * Delete a bracket and its matches
   */
  static async deleteBracket(bracketId: string): Promise<void> {
    // Delete the matches first (due to foreign key constraint)
    const { error: matchesError } = await supabase
      .from('matches')
      .delete()
      .eq('bracket_id', bracketId);

    if (matchesError) handleDatabaseError(matchesError, 'Failed to delete bracket matches');

    // Then delete the bracket
    const { error: bracketError } = await supabase.from('brackets').delete().eq('id', bracketId);

    if (bracketError) handleDatabaseError(bracketError, 'Failed to delete bracket');
  }
}
