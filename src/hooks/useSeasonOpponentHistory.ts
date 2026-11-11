import { useQuery } from '@tanstack/react-query';

import { fetchSeasonOpponentHistory } from '@/services/matches/MatchReadService';
import type { SeasonOpponentData } from '@/types/seasonOpponentHistory';

export const useSeasonOpponentHistory = () => {
  return useQuery({
    queryKey: ['season-opponent-history'],
    queryFn: (): Promise<SeasonOpponentData | null> => fetchSeasonOpponentHistory(),
    staleTime: 1000 * 60 * 5, // 5 minutes - opponent history only changes when new matches are added
  });
};
