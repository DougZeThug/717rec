import { supabase } from '@/integrations/supabase/client';
import { dbLog } from '@/utils/logger';

/**
 * Service layer for fetching data used in selectors/dropdowns
 * Abstracts Supabase queries from presentation components
 */

export interface SelectorOption {
  id: string;
  name: string;
}

/**
 * Fetch all teams ordered by name for selector dropdowns
 */
export const fetchTeamsForSelector = async (): Promise<SelectorOption[]> => {
  const { data, error } = await supabase.from('teams').select('id, name').order('name');

  if (error) {
    dbLog('Error fetching teams for selector:', error);
    throw error;
  }

  return data || [];
};

/**
 * Fetch all divisions ordered by name for selector dropdowns
 */
export const fetchDivisionsForSelector = async (): Promise<SelectorOption[]> => {
  const { data, error } = await supabase.from('divisions').select('id, name').order('name');

  if (error) {
    dbLog('Error fetching divisions for selector:', error);
    throw error;
  }

  return data || [];
};

/**
 * Fetch all seasons ordered by start date (most recent first) for selector dropdowns
 */
export const fetchSeasonsForSelector = async (): Promise<SelectorOption[]> => {
  const { data, error } = await supabase
    .from('seasons')
    .select('id, name')
    .order('start_date', { ascending: false });

  if (error) {
    dbLog('Error fetching seasons for selector:', error);
    throw error;
  }

  return data || [];
};
