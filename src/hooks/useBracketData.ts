
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PlayoffBracket, PlayoffMatch, Player } from "@/types";
import { useTeamData } from "./useTeamData";

export const useBracketData = (bracketId?: string) => {
  // Use the shared team data hook to get teams
  const { data: teams, isLoading: teamsLoading } = useTeamData();
  
  // Query for bracket data if we have a bracketId
  const bracketQuery = useQuery({
    queryKey: ['bracket', bracketId],
    queryFn: async () => {
      if (!bracketId) throw new Error("No bracket ID provided");
      
      // Get the bracket
      const { data: bracketData, error: bracketError } = await supabase
        .from('brackets')
        .select('*, divisions(name)')
        .eq('id', bracketId)
        .single();
        
      if (bracketError) throw bracketError;
      
      // Get all matches for this bracket
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*, games(*)')
        .eq('bracket_id', bracketId)
        .order('round_number', { ascending: true })
        .order('position', { ascending: true });
        
      if (matchesError) throw matchesError;
      
      // Find champion if exists (winner of the finals match)
      let champion = null;
      if (matchesData) {
        const finalMatch = matchesData.find(m => 
          m.match_type === 'finals' && 
          m.winner_id !== null
        );
        if (finalMatch) {
          champion = finalMatch.winner_id;
        }
      }
      
      // Transform to our application PlayoffMatch type
      const matches = matchesData.map((match): PlayoffMatch => ({
        id: match.id,
        round: match.round_number,
        position: match.position || 0, // Default to 0 if position is not present
        team1Id: match.team1_id,
        team2Id: match.team2_id,
        winnerId: match.winner_id,
        team1Score: match.games?.filter(g => g.team1_score > g.team2_score).length || 0,
        team2Score: match.games?.filter(g => g.team2_score > g.team1_score).length || 0,
        matchType: match.match_type as "Winners" | "Losers" | "Finals" || "Winners",
        bestOf: match.best_of || 3,
        games: match.games?.map(game => ({
          id: game.id,
          team1Score: game.team1_score || 0,
          team2Score: game.team2_score || 0,
          winner: game.team1_score > game.team2_score ? match.team1_id : match.team2_id
        })) || []
      }));
      
      // Transform to our application PlayoffBracket type
      const bracket: PlayoffBracket = {
        id: bracketData.id,
        name: bracketData.title,
        division: bracketData.divisions?.name || "Unknown",
        matches: matches,
        format: bracketData.format as "Single Elimination" | "Double Elimination" || "Single Elimination",
        champion: champion
      };
      
      return bracket;
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
