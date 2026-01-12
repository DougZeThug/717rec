import { supabase } from '@/integrations/supabase/client';
import { dbLog } from '@/utils/logger';

/**
 * Service layer for bracket read operations
 * Abstracts Supabase queries from presentation components
 */

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
    throw error;
  }

  return data || [];
};
