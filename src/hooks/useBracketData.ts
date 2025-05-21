
import { useQuery } from "@tanstack/react-query";
import { PlayoffBracket, Team } from "@/types";
import { useTeamData } from "./useTeamData";
import { fetchBracketById } from "@/BracketService";
import { toRuntime as mapMatch } from "@/services/brackets/database/MatchMapper";

export const useBracketData = (bracketId?: string) => {
  // Use the shared team data hook to get teams
  const { data: teams, isLoading: teamsLoading } = useTeamData();
  
  // Query for bracket data if we have a bracketId
  const bracketQuery = useQuery({
    queryKey: ['bracket', bracketId],
    queryFn: async () => {
      if (!bracketId) throw new Error("No bracket ID provided");
      
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

  const bracket = bracketQuery.data;
  const isLoading = teamsLoading || bracketQuery.isLoading;

  return {
    teams: teams || [],
    bracket,
    isLoading,
    error: bracketQuery.error
  };
};
