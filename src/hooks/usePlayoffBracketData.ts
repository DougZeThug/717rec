
import { useQuery } from "@tanstack/react-query";
import { PlayoffMatch } from "@/types";
import { fetchBracketById, groupBracketMatchesByType } from "@/BracketService";
import { BracketMatchesByType } from "@/services/brackets/types";
import { toRuntime as mapMatch } from "@/services/brackets/database/MatchMapper";

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
    queryFn: async () => {
      if (!bracketId) return null;
      
      // Fetch the bracket data
      const rawBracket = await fetchBracketById(bracketId);
      
      // Map the matches to the expected format
      if (rawBracket && rawBracket.matches) {
        rawBracket.matches = rawBracket.matches.map(mapMatch);
      }
      
      return rawBracket;
    },
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
