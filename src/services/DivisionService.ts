import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

export const DivisionService = {
  fetchDivisions: async () => {
    const { data, error } = await supabase
      .from('divisions')
      .select('id, name, division_weight, display_division, created_at')
      .order('division_weight', { ascending: false });

    if (error) handleDatabaseError(error, 'Failed to fetch divisions');
    return data ?? [];
  },

  /**
   * Fetch division weights as a Map<divisionId, weight>.
   * Used by the division weights cache.
   */
  fetchDivisionWeightsMap: async (): Promise<{ id: string; division_weight: number | null; name: string }[]> => {
    const { data, error } = await supabase
      .from('divisions')
      .select('id, name, division_weight')
      .order('name');

    if (error) handleDatabaseError(error, 'Failed to fetch division weights');
    return data ?? [];
  },
};
