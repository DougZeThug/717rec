
import { useQuery } from "@tanstack/react-query";
import { PlayoffBracket, Team } from "@/types";
import { useTeamData } from "./useTeamData";
import { fetchBracketById } from "@/services/bracketDataService";

export const useBracketData = (bracketId?: string) => {
  // Use the shared team data hook to get teams
  const { data: teams, isLoading: teamsLoading } = useTeamData();
  
  // Query for bracket data if we have a bracketId
  const bracketQuery = useQuery({
    queryKey: ['bracket', bracketId],
    queryFn: async () => {
      if (!bracketId) throw new Error("No bracket ID provided");
      return fetchBracketById(bracketId);
    },
    enabled: !!bracketId
  });

  return {
    teams: teams || [],
    bracket: bracketQuery.data,
    isLoading: teamsLoading || (bracketId ? bracketQuery.isLoading : false),
    error: bracketQuery.error
  };
};
