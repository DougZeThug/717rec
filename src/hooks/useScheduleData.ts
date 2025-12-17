
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Match } from "@/types";
import { scheduleLog, errorLog } from "@/utils/logger";

export const useScheduleData = () => {
  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      scheduleLog("Fetching matches data");
      
      // Join with v_team_details to get team information using LEFT JOIN instead of INNER JOIN
      // Also fix column name to use divisionname (lowercase) instead of divisionName
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
          )
        `)
        .order('date');
        
      if (error) {
        errorLog("Error fetching matches:", error);
        throw error;
      }
      
      scheduleLog(`Fetched ${data.length} matches (${data.filter(m => m.iscompleted).length} completed)`);
      
      const formattedData = data.map((match): Match => {
        // Properly handle team details based on what Supabase returns
        // This handles both cases where team details might be an array or a direct object
        const team1Details = match.team1 ? (
          Array.isArray(match.team1) ? match.team1[0] : match.team1
        ) : null;

        const team2Details = match.team2 ? (
          Array.isArray(match.team2) ? match.team2[0] : match.team2
        ) : null;
        
        return {
          id: match.id,
          team1Id: match.team1_id,
          team2Id: match.team2_id,
          team1Score: match.team1_score,
          team2Score: match.team2_score,
          date: match.date,
          location: match.location || '',
          iscompleted: match.iscompleted,
          winnerId: match.winner_id,
          loserId: match.loser_id,
          round_number: match.round_number,
          position: match.position,
          bracket_id: match.bracket_id,
          match_type: match.match_type,
          next_match_id: match.next_match_id,
          next_loser_match_id: match.next_loser_match_id,
          best_of: match.best_of,
          team1_game_wins: match.team1_game_wins,
          team2_game_wins: match.team2_game_wins,
          team1Details: team1Details,
          team2Details: team2Details
        };
      });
      
      return formattedData;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: false, // Don't double-fetch if cache is fresh
    staleTime: 1000 * 60 * 2, // 2 minutes - schedule rarely changes
  });

  // Process and separate upcoming vs completed matches
  const upcomingMatches = matchesData?.filter(match => !match.iscompleted) || [];
  const completedMatches = matchesData?.filter(match => match.iscompleted) || [];

  // Sort upcoming matches by date (closest first)
  upcomingMatches.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : Infinity;
    const dateB = b.date ? new Date(b.date).getTime() : Infinity;
    return dateA - dateB;
  });
  
  // Sort completed matches by date (most recent first)
  completedMatches.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  return { 
    matchesData, 
    matchesLoading,
    upcomingMatches,
    completedMatches
  };
};
