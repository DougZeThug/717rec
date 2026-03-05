import { useQuery } from '@tanstack/react-query';

import { fetchPlayoffBracketData } from '@/services/brackets/BracketReadService';
import { bracketLog } from '@/utils/logger';
import type { PlayoffBracket } from '@/utils/playoffs/playoffTypes';

export const usePlayoffBracketData = (bracketId: string | null) => {
  return useQuery({
    queryKey: ['bracket', bracketId],
    queryFn: async (): Promise<PlayoffBracket | null> => {
      bracketLog('usePlayoffBracketData: Starting query for bracketId:', bracketId);

      if (!bracketId) {
        bracketLog('usePlayoffBracketData: No bracketId provided, returning null');
        return null;
      }

      bracketLog('usePlayoffBracketData: Fetching bracket data from database...');
      const bracket = await fetchPlayoffBracketData(bracketId);

      if (!bracket) {
        bracketLog('usePlayoffBracketData: No bracket found with id:', bracketId);
        return null;
      }

      bracketLog('usePlayoffBracketData: Final bracket result:', bracket);
      return bracket;
    },
    enabled: true,
  });
};
