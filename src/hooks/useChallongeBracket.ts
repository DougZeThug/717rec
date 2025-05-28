
import { useQuery } from "@tanstack/react-query";
import { ChallongeService } from "@/services/ChallongeService";
import { ChallongeMatch } from "@/services/challonge/types";

interface UseChallongeBracketReturn {
  matches: ChallongeMatch[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch and poll Challonge tournament matches
 * @param bracketId - The Challonge tournament ID to fetch matches for
 * @returns Object containing matches, loading state, error, and refetch function
 */
export const useChallongeBracket = (bracketId: number): UseChallongeBracketReturn => {
  const {
    data: matches,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["challonge-bracket", bracketId],
    queryFn: () => ChallongeService.getMatches(bracketId.toString()),
    enabled: !!bracketId,
    refetchInterval: 15000, // Poll every 15 seconds
    refetchIntervalInBackground: true,
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  return {
    matches,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};
