import { BracketFormat } from '@/constants/brackets';
import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

/**
 * Service for bracket update operations
 */
export class BracketUpdateService {
  /**
   * Update a bracket's basic information
   */
  static async updateBracket(
    bracketId: string,
    updates: {
      name?: string;
      format?: BracketFormat;
      divisionId?: string;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('brackets')
      .update({
        title: updates.name,
        format: updates.format,
        division_id: updates.divisionId,
      })
      .eq('id', bracketId);

    if (error) handleDatabaseError(error, 'Failed to update bracket');
  }
}
