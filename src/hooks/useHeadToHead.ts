import { useQuery } from '@tanstack/react-query';

import { HeadToHeadService } from '@/services/HeadToHeadService';

export const useHeadToHead = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['head-to-head', teamId],
    queryFn: () => (teamId ? HeadToHeadService.getTeamHeadToHead(teamId) : Promise.resolve([])),
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes - head-to-head data rarely changes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

export const useOpponentHistory = (teamId: string | undefined, opponentId: string | undefined) => {
  return useQuery({
    queryKey: ['opponent-history', teamId, opponentId],
    queryFn: () =>
      teamId && opponentId
        ? HeadToHeadService.getOpponentHistory(teamId, opponentId)
        : Promise.resolve(null),
    enabled: !!(teamId && opponentId),
    staleTime: 5 * 60 * 1000, // 5 minutes - opponent history rarely changes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
