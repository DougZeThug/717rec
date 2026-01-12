import { supabase } from '@/integrations/supabase/client';
import { dbLog } from '@/utils/logger';

/**
 * Service layer for bracket write operations
 * Abstracts Supabase mutations from presentation components
 */

/**
 * Delete a bracket by ID
 */
export const deleteBracket = async (bracketId: string): Promise<void> => {
  const { error } = await supabase.from('brackets').delete().eq('id', bracketId);

  if (error) {
    dbLog('Error deleting bracket:', error);
    throw error;
  }
};
