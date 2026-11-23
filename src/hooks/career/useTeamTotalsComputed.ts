import { useQuery } from '@tanstack/react-query';

import { fetchCareerData } from '@/services/career/CareerService';
import { computeTotalsFromCareerData } from '@/services/career/computeAllTeamsTotals';
import { TeamTotals } from '@/utils/career/types';

/**
 * Computes team career totals from raw career data.
 * Uses a database fetch + the shared calculation core (the same one the career
 * rankings use, see computeTotalsFromCareerData).
 */
const computeTeamTotals = async (teamId: string): Promise<TeamTotals | null> => {
  const careerData = await fetchCareerData(teamId);

  if (!careerData) {
    return null;
  }

  // No prefetched rows on purpose: calculateCareerPowerScore reads the season
  // rows and the current-team row itself. Do not pass `null` here: it would be
  // read as "no rows" and drop the season history.
  return computeTotalsFromCareerData(teamId, careerData);
};

/**
 * Hook for fetching and computing team career totals.
 * Uses modular calculation utilities for testability.
 */
export const useTeamTotalsComputed = (teamId: string) => {
  const query = useQuery({
    queryKey: ['team-totals', teamId],
    queryFn: () => (teamId ? computeTeamTotals(teamId) : Promise.resolve(null)),
    enabled: Boolean(teamId),
    staleTime: 5 * 60 * 1000, // 5 minutes - career stats change rarely
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: false, // Trust the cache
    refetchOnWindowFocus: false,
  });

  return {
    totals: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
