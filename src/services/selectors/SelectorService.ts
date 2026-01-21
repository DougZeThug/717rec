import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

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
 * @throws {DatabaseError} When database operations fail
 */
export const fetchTeamsForSelector = async (): Promise<SelectorOption[]> => {
  const { data, error } = await supabase.from('teams').select('id, name').order('name');

  if (error) {
    handleDatabaseError(error, 'Failed to fetch teams for selector');
  }

  return data || [];
};

/**
 * Fetch all divisions ordered by name for selector dropdowns
 * @throws {DatabaseError} When database operations fail
 */
export const fetchDivisionsForSelector = async (): Promise<SelectorOption[]> => {
  const { data, error } = await supabase.from('divisions').select('id, name').order('name');

  if (error) {
    handleDatabaseError(error, 'Failed to fetch divisions for selector');
  }

  return data || [];
};

/**
 * Fetch all seasons ordered by name for selector dropdowns
 * @throws {DatabaseError} When database operations fail
 */
export const fetchSeasonsForSelector = async (): Promise<SelectorOption[]> => {
  const { data, error } = await supabase
    .from('seasons')
    .select('id, name')
    .order('start_date', { ascending: false });

  if (error) {
    handleDatabaseError(error, 'Failed to fetch seasons for selector');
  }

  return data || [];
};
