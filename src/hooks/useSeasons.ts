
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { errorLog } from "@/utils/logger";

export const useSeasons = () => {
  return useQuery({
    queryKey: ['seasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        errorLog('Error fetching seasons:', error);
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
      // Fetch all active seasons to detect data integrity issues
      const { data: activeSeasons, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true);

      if (error) {
        errorLog('Error fetching active season:', error);
        throw error;
      }

      // Validate we have at most one active season
      if (activeSeasons && activeSeasons.length > 1) {
        const errorMsg = `Data integrity violation: ${activeSeasons.length} active seasons found. Only one season can be active at a time.`;
        errorLog(errorMsg, { seasonIds: activeSeasons.map(s => s.id) });
        throw new Error(errorMsg);
      }

      // Return the single active season or null if none exists
      return activeSeasons?.[0] ?? null;
    },
  });
};
