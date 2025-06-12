
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Division {
  id: string;
  name: string;
  division_weight: number;
  created_at: string;
}

export const useDivisions = () => {
  const query = useQuery<Division[], Error>({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching divisions:', error);
        throw error;
      }
      
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
