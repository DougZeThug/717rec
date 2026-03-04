import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

export const DivisionService = {
  fetchDivisions: async () => {
    const { data, error } = await supabase
      .from('divisions')
      .select('id, name, division_weight, display_division, created_at')
      .order('division_weight', { ascending: false }); // Order by weight (highest first)

    if (error) handleDatabaseError(error, 'Failed to fetch divisions');
    return data ?? [];
  },
};
