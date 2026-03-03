import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { errorLog, teamLog } from '@/utils/logger';

interface Division {
  id: string;
  name: string;
  division_weight: number;
  display_division: string;
  created_at: string;
}

export const useDivisions = () => {
  const query = useQuery<Division[], Error>({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divisions')
        .select('id, name, division_weight, display_division, created_at')
        .order('division_weight', { ascending: false }); // Order by weight (highest first)

      if (error) {
        errorLog('Error fetching divisions:', error);
        throw error;
      }

      teamLog(
        'Divisions loaded with new divisions:',
        data?.map((d) => ({
          name: d.name,
          weight: d.division_weight,
          display: d.display_division,
        }))
      );

      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    divisions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
