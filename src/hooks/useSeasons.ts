
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSeasons = () => {
  return useQuery({
    queryKey: ['seasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching seasons:', error);
        throw error;
      }

      return data;
    },
  });
};

export const useActiveSeason = () => {
  return useQuery({
    queryKey: ['seasons', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching active season:', error);
        throw error;
      }

      return data;
    },
  });
};
