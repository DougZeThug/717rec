
import { MatchWithTeams } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { matchLog, errorLog } from "@/utils/logger";

export const updateMatchInDatabase = async (match: MatchWithTeams): Promise<boolean> => {
  try {
    matchLog("Submitting match to database:", {
      matchId: match.id,
      team1Score: match.team1Score,
      team2Score: match.team2Score,
      team1GameWins: match.team1_game_wins,
      team2GameWins: match.team2_game_wins,
      winnerId: match.team1Score === 1 ? match.team1Id : match.team2Id,
      loserId: match.team1Score === 1 ? match.team2Id : match.team1Id
    });

    const { error } = await supabase
      .from('matches')
      .update({
        team1_score: match.team1Score,
        team2_score: match.team2Score,
        team1_game_wins: match.team1_game_wins,
        team2_game_wins: match.team2_game_wins,
        iscompleted: match.iscompleted,
        winner_id: match.team1Score === 1 ? match.team1Id : match.team2Id,
        loser_id: match.team1Score === 1 ? match.team2Id : match.team1Id
      })
      .eq('id', match.id);

    if (error) {
      errorLog(`Error updating match ${match.id}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    errorLog(`Error in updateMatchInDatabase for match ${match.id}:`, error);
    return false;
  }
};
