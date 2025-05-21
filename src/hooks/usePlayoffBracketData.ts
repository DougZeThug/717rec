
import { useQuery } from "@tanstack/react-query";
import { PlayoffMatch } from "@/types";
import { fetchBracketById, groupBracketMatchesByType } from "@/services/brackets";
import { BracketMatchesByType } from "@/services/brackets/types";

/**
 * Hook to fetch and organize bracket data by match type and round
 * Returns matches grouped by type (winners/losers/finals) for double elimination brackets
 */
export const usePlayoffBracketData = (bracketId: string | null) => {
  const {
    data: bracket,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["bracket", bracketId],
    queryFn: () => bracketId ? fetchBracketById(bracketId) : null,
    enabled: !!bracketId
  });
  
  // Process bracket data to separate winners, losers and finals matches
  // This is mainly useful for double elimination brackets
  const bracketMatchesByType: BracketMatchesByType | null = bracket
    ? groupBracketMatchesByType(bracket)
    : null;
    
  return {
    bracket,
    bracketMatchesByType,
    isLoading,
    error,
    refetch
  };
};

export type { BracketMatchesByType };
