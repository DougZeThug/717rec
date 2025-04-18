
import { supabase } from "@/integrations/supabase/client";
import { useTeamRecords } from "@/hooks/useTeamRecords";
import { MatchWithTeams } from "../types";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export const useMatchUpdates = () => {
  const { toast } = useToast();
  const { updateTeamRecords } = useTeamRecords();
  const queryClient = useQueryClient();

  const updateMatchInDatabase = async (match: MatchWithTeams) => {
    try {
      let winnerId = null;
      let loserId = null;
      
      if (match.team1Score !== null && match.team2Score !== null) {
        if (match.team1Score > match.team2Score) {
          winnerId = match.team1Id;
          loserId = match.team2Id;
        } else if (match.team2Score > match.team1Score) {
          winnerId = match.team2Id;
          loserId = match.team1Id;
        }
      }

      const { error } = await supabase
        .from('matches')
        .update({
          team1_score: match.team1Score,
          team2_score: match.team2Score,
          iscompleted: match.iscompleted,
          winner_id: winnerId,
          loser_id: loserId,
          team1_game_wins: match.team1_game_wins || 0,
          team2_game_wins: match.team2_game_wins || 0
        })
        .eq('id', match.id);

      if (error) throw error;

      // Update team records if match is completed and we have winner/loser
      if (match.iscompleted && winnerId && loserId && match.team1 && match.team2) {
        const teams = [match.team1, match.team2]; 
        await updateTeamRecords(winnerId, loserId, teams);
      }

      // Invalidate queries to ensure fresh data throughout the app
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
      queryClient.invalidateQueries({ queryKey: ['teamStats'] });
      
      return true;
    } catch (error: any) {
      console.error("Error updating match:", error.message);
      return false;
    }
  };

  return { updateMatchInDatabase };
};
