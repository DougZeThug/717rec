import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  transformDatabasePlayoffMatchesWithTeams, 
  PlayoffMatchWithTeams 
} from "@/utils/matchTransformers";
import { playoffLog, errorLog } from "@/utils/logger";

export const usePlayoffMatches = (bracketId: string | null) => {
  return useQuery({
    queryKey: ['playoff-matches', bracketId],
    queryFn: async (): Promise<PlayoffMatchWithTeams[]> => {
      playoffLog('Fetching matches for bracketId:', bracketId);
      
      if (!bracketId) {
        playoffLog('No bracketId provided, returning empty array');
        return [];
      }
      
      // Use the new foreign key constraints for proper team data fetching
      const { data, error } = await supabase
        .from('playoff_matches')
        .select(`
          *,
          team1:teams!fk_playoff_matches_team1(id, name, logo_url, image_url),
          team2:teams!fk_playoff_matches_team2(id, name, logo_url, image_url),
          playoff_games(*)
        `)
        .eq('bracket_id', bracketId)
        .order('round')
        .order('position');
        
      if (error) {
        errorLog('usePlayoffMatches: Database error:', error);
        throw error;
      }
      
      playoffLog('Found', data?.length || 0, 'matches');
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Transform with centralized transformer
      const transformedMatches = transformDatabasePlayoffMatchesWithTeams(data);
      
      playoffLog('Returning', transformedMatches.length, 'matches with team data');
      return transformedMatches;
    },
    enabled: !!bracketId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });
};
