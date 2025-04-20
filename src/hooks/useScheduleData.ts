import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Match } from "@/types";

export const useScheduleData = () => {
  const queryClient = useQueryClient();

  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      console.log("Fetching matches data with team details...");
      
      // Join with v_team_details to get team information
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:v_team_details!team1_id(
            team_id,
            name,
            image_url,
            logo_url,
            divisionName
          ),
          team2:v_team_details!team2_id(
            team_id,
            name,
            image_url,
            logo_url,
            divisionName
          )
        `)
        .order('date');
        
      if (error) {
        console.error("Error fetching matches:", error);
        throw error;
      }
      
      const formattedData = data.map((match): Match => ({
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
        // Add team details from v_team_details
        team1Details: match.team1?.[0] || null,
        team2Details: match.team2?.[0] || null
      }));
      
      return formattedData;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 15000
  });

  // Set up polling to refresh matches data
  useEffect(() => {
    const intervalId = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [queryClient]);

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
