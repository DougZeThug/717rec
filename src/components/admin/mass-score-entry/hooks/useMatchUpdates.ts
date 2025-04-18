
import { supabase } from "@/integrations/supabase/client";
import { MatchWithTeams } from "../types";
import { useToast } from "@/hooks/use-toast";

export const useMatchUpdates = () => {
  const { toast } = useToast();

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
          loser_id: loserId
        })
        .eq('id', match.id);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Error updating match:", error.message);
      return false;
    }
  };

  return { updateMatchInDatabase };
};
