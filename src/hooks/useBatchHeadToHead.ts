import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchBatchHeadToHead, type HeadToHeadData } from '@/services/TeamStatsService';

// Re-export the type for any consumers that import from here
export type { HeadToHeadData };

interface TeamPair {
  team1Id: string | null | undefined;
  team2Id: string | null | undefined;
}

interface BatchHeadToHeadResult {
  getHeadToHead: (
    team1Id: string | null | undefined,
    team2Id: string | null | undefined
  ) => HeadToHeadData | null;
  isLoading: boolean;
}

/**
 * Hook to batch fetch head-to-head data for multiple team pairs
 * Eliminates N+1 queries by fetching all H2H data in a single RPC call
 */
export const useBatchHeadToHead = (teamPairs: TeamPair[]): BatchHeadToHeadResult => {
  // Filter and dedupe valid team pairs
  const validPairs = useMemo(() => {
    const seen = new Set<string>();
    return teamPairs.filter((pair) => {
      if (!pair.team1Id || !pair.team2Id || pair.team1Id === pair.team2Id) {
        return false;
      }
      // Create a normalized key (sorted to avoid duplicates like A-B and B-A)
      const sortedKey = [pair.team1Id, pair.team2Id].sort().join('-');
      if (seen.has(sortedKey)) {
        return false;
      }
      seen.add(sortedKey);
      return true;
    });
  }, [teamPairs]);

  const { data, isLoading } = useQuery({
    queryKey: ['batch-head-to-head', validPairs.map((p) => `${p.team1Id}-${p.team2Id}`).join(',')],
    queryFn: async () => {
      if (validPairs.length === 0) {
        return new Map<string, HeadToHeadData>();
      }

      const pairsJson = validPairs.map((pair) => ({
        team1: pair.team1Id,
        team2: pair.team2Id,
      }));

      return fetchBatchHeadToHead(pairsJson);
    },
    enabled: validPairs.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const getHeadToHead = useMemo(() => {
    return (
      team1Id: string | null | undefined,
      team2Id: string | null | undefined
    ): HeadToHeadData | null => {
      if (!team1Id || !team2Id || team1Id === team2Id) {
        return null;
      }

      const key = `${team1Id}-${team2Id}`;
      const result = data?.get(key);

      // If not found in results, return default "first meeting" data
      if (!result && data) {
        return {
          team1Wins: 0,
          team2Wins: 0,
          totalMatches: 0,
          team1GameWins: 0,
          team2GameWins: 0,
          isFirstMeeting: true,
        };
      }

      return result || null;
    };
  }, [data]);

  return {
    getHeadToHead,
    isLoading: validPairs.length > 0 && isLoading,
  };
};
