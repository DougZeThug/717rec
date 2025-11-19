import { useQuery } from "@tanstack/react-query";
import { getMatchHeadToHead, type MatchHeadToHeadResult } from "@/utils/matchUtils/getMatchHeadToHead";

interface UseMatchHeadToHeadResult {
  data: MatchHeadToHeadResult | null;
  isLoading: boolean;
  isFirstMeeting: boolean;
}

/**
 * Hook to fetch and format head-to-head data for a specific match
 * Returns data from team1's perspective (team1Wins vs team2Wins)
 */
export const useMatchHeadToHead = (
  team1Id: string | null | undefined,
  team2Id: string | null | undefined
): UseMatchHeadToHeadResult => {
  const { data, isLoading } = useQuery({
    queryKey: ['match-head-to-head', team1Id, team2Id],
    queryFn: () => getMatchHeadToHead(team1Id, team2Id),
    enabled: !!(team1Id && team2Id && team1Id !== team2Id),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const isFirstMeeting = data?.totalMatches === 0;

  return {
    data,
    isLoading,
    isFirstMeeting,
  };
};
