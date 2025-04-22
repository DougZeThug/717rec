
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Match } from "@/types";

export const useTeamMatches = (teamId: string | undefined) => {
  const matchesQuery = useQuery({
    queryKey: ["team-matches", teamId],
    queryFn: async () => {
      if (!teamId) return { upcomingMatches: [], pastMatches: [] };

      // Log the query parameters for debugging
      console.log("Fetching matches for team ID:", teamId);

      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:v_team_details!team1_id(
            team_id,
            name,
            image_url,
            logo_url,
            divisionname
          ),
          team2:v_team_details!team2_id(
            team_id,
            name,
            image_url,
            logo_url,
            divisionname
          ),
          stats:v_team_match_stats(team_id, games_won)
        `)
        .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
        .order('date');

      if (error) {
        console.error("Error fetching team matches:", error);
        throw error;
      }

      console.log("Matches fetched:", data?.length || 0);
      
      const today = new Date();
      const matchData = data || [];
      
      // Map database rows to Match interface with camelCase properties
      const mappedMatches = matchData.map(row => {
        // Enhanced logging to debug specific match data
        // console.log("Processing match:", row.id, "stats:", row.stats);
        
        return {
          id: row.id,
          team1Id: row.team1_id,
          team2Id: row.team2_id,
          team1Score: row.team1_score,
          team2Score: row.team2_score,
          date: row.date,
          location: row.location,
          iscompleted: row.iscompleted,
          winnerId: row.winner_id,
          loserId: row.loser_id,
          round_number: row.round_number,
          position: row.position,
          bracket_id: row.bracket_id,
          match_type: row.match_type,
          next_match_id: row.next_match_id,
          next_loser_match_id: row.next_loser_match_id,
          best_of: row.best_of,
          created_at: row.created_at,
          team1_game_wins: row.team1_game_wins,
          team2_game_wins: row.team2_game_wins,
          team1Details: row.team1 ? (Array.isArray(row.team1) ? row.team1[0] : row.team1) : null,
          team2Details: row.team2 ? (Array.isArray(row.team2) ? row.team2[0] : row.team2) : null,
          stats: Array.isArray(row.stats) ? row.stats : [row.stats].filter(Boolean)
        };
      }) as Match[];
      
      console.log("Processed matches:", mappedMatches.length);
      
      return {
        upcomingMatches: mappedMatches.filter(m => m.date && new Date(m.date) > today),
        pastMatches: mappedMatches.filter(m => m.date && new Date(m.date) <= today),
      };
    },
    enabled: !!teamId,
  });

  return {
    upcomingMatches: matchesQuery.data?.upcomingMatches ?? [],
    pastMatches: matchesQuery.data?.pastMatches ?? [],
    isLoadingMatches: matchesQuery.isLoading,
    error: matchesQuery.error
  };
};
