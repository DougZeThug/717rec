
import { supabase } from "@/integrations/supabase/client";
import { MatchWithTeams } from "../types";
import { determineWinner } from "../utils/matchSubmissionUtils";

export const useMatchUpdates = () => {
  const updateMatch = async (match: MatchWithTeams) => {
    const { winnerId, loserId } = determineWinner(match);
    
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
    
    return { winnerId, loserId };
  };

  return { updateMatch };
};
