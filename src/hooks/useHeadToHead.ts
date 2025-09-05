import { useQuery } from "@tanstack/react-query";
import { HeadToHeadService } from "@/services/HeadToHeadService";

export const useHeadToHead = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['head-to-head', teamId],
    queryFn: () => teamId ? HeadToHeadService.getTeamHeadToHead(teamId) : Promise.resolve([]),
    enabled: !!teamId,
    staleTime: 30000, // 30 seconds
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
    staleTime: 30000,
  });
};