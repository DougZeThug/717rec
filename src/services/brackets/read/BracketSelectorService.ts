import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import { dbLog } from '@/utils/logger';

export interface BracketOption {
  id: string;
  title: string;
}

/**
 * Fetch all brackets ordered by title for selector dropdowns
 */
export const fetchBracketsForSelector = async (): Promise<BracketOption[]> => {
  const { data, error } = await supabase.from('brackets').select('id, title').order('title');

  if (error) {
    dbLog('Error fetching brackets for selector:', error);
    handleDatabaseError(error, 'Failed to fetch brackets for selector');
  }

  return data || [];
};
