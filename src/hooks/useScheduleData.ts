
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Match } from "@/types";

export const useScheduleData = () => {
  const queryClient = useQueryClient();

  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      console.log("Fetching matches data...");
      
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('date');
        
      if (error) {
        console.error("Error fetching matches:", error);
        throw error;
      }
      
      console.log("Raw matches response:", data);
      
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
        best_of: match.best_of
      }));
      
      console.log("Formatted matches data:", formattedData);
      return formattedData;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Set up polling to refresh matches data
  useEffect(() => {
    const intervalId = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [queryClient]);

  return { matchesData, matchesLoading };
};
