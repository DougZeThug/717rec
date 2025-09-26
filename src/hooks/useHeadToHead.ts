import { useQuery } from "@tanstack/react-query";
import { HeadToHeadService } from "@/services/HeadToHeadService";

export const useHeadToHead = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['head-to-head', teamId, Date.now()], // Force fresh requests with timestamp
    queryFn: () => teamId ? HeadToHeadService.getTeamHeadToHead(teamId) : Promise.resolve([]),
    enabled: !!teamId,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache results (formerly cacheTime)
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false, // Don't retry to avoid cached responses
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
    staleTime: 0,
    gcTime: 0, // Don't cache results (formerly cacheTime)
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};