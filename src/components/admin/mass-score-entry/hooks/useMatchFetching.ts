
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MatchWithTeams, FilterState } from "../types";
import { buildMatchQuery } from "../services/matchQueryService";
import { transformDatabaseMatchToMatchWithTeams } from "../utils/matchTransformUtils";

export const useMatchFetching = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const fetchMatches = async (filters: FilterState) => {
    setLoading(true);
    try {
      const query = buildMatchQuery(filters);
      const { data, error } = await query;

      if (error) throw error;

      // Log raw data type information
      console.log("🔍 Raw matches fetched:", {
        count: data?.length || 0,
        sampleDate: data?.[0]?.date,
        sampleDateType: data?.[0]?.date ? typeof data[0].date : 'undefined',
        bracketId: filters.bracketId,
        date: filters.date
      });

      const formattedMatches: MatchWithTeams[] = (data || []).map((match, index) => {
        // Raw data inspection
        console.log(`🔍 Raw match data from database [${index}]:`, {
          matchId: match.id, 
          date: match.date,
          dateType: typeof match.date,
          team1_game_wins: match.team1_game_wins,
          team1_game_wins_type: typeof match.team1_game_wins,
          team2_game_wins: match.team2_game_wins,
          team2_game_wins_type: typeof match.team2_game_wins
        });
        
        const transformed = transformDatabaseMatchToMatchWithTeams(match);
        
        // Verify date normalization
        console.log(`🔍 Match date verification [${match.id}]:`, {
          originalDate: match.date,
          originalType: typeof match.date,
          transformedDate: transformed.date,
          transformedType: typeof transformed.date,
          isISOString: typeof transformed.date === 'string' && !isNaN(Date.parse(transformed.date)),
          team1_game_wins: transformed.team1_game_wins,
          team1_game_wins_type: typeof transformed.team1_game_wins,
          team2_game_wins: transformed.team2_game_wins, 
          team2_game_wins_type: typeof transformed.team2_game_wins
        });
        
        return transformed;
      });
      
      // Log the final formatted matches
      if (formattedMatches.length > 0) {
        console.log("🔍 Sample transformed match:", {
          match: formattedMatches[0],
          matchDate: formattedMatches[0].date,
          matchDateType: typeof formattedMatches[0].date
        });
      }

      setLoading(false);
      return formattedMatches;
    } catch (error: any) {
      console.error("Error fetching matches:", error.message);
      toast({
        title: "Error",
        description: `Failed to fetch matches: ${error.message}`,
        variant: "destructive"
      });
      setLoading(false);
      return [];
    }
  };

  return {
    loading,
    fetchMatches
  };
};
