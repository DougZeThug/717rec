import { useQuery } from '@tanstack/react-query';

import { fetchPlayoffMatches } from '@/services/brackets/BracketReadService';
import { errorLog, playoffLog } from '@/utils/logger';
import { PlayoffMatchWithTeams } from '@/utils/matchTransformers';

export const usePlayoffMatches = (bracketId: string | null) => {
  return useQuery({
    queryKey: ['playoff-matches', bracketId],
    queryFn: async (): Promise<PlayoffMatchWithTeams[]> => {
      playoffLog('Fetching matches for bracketId:', bracketId);

      if (!bracketId) {
        playoffLog('No bracketId provided, returning empty array');
        return [];
      }

      try {
        const matches = await fetchPlayoffMatches(bracketId);
        playoffLog('Returning', matches.length, 'matches with team data');
        return matches;
      } catch (error) {
        errorLog('usePlayoffMatches: Database error:', error);
        throw error;
      }
    },
    enabled: !!bracketId,
    staleTime: 0, // Always fresh - instant updates
    retry: 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
