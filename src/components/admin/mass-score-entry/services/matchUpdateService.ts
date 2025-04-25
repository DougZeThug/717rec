
import { MatchWithTeams } from "../types";
import { updateMatchInDatabase } from "./matchUpdateCore";
import { useTeamRecordUpdate } from "./teamRecordUpdate";
import { useToast } from "@/hooks/use-toast";

export const useMatchUpdateService = () => {
  const { updateTeamRecordsForMatch } = useTeamRecordUpdate();
  const { toast } = useToast();

  const updateMatch = async (match: MatchWithTeams): Promise<boolean> => {
    try {
      const success = await updateMatchInDatabase(match);
      if (!success) {
        return false;
      }

      let winnerId = null;
      let loserId = null;
      
      if (match.team1Score === 1) {
        winnerId = match.team1Id;
        loserId = match.team2Id;
      } else if (match.team2Score === 1) {
        winnerId = match.team2Id;
        loserId = match.team1Id;
      }

      if (match.iscompleted && winnerId && loserId && match.team1 && match.team2) {
        const teams = [match.team1, match.team2];
        
        const winnerGameWins = parseInt(String(winnerId === match.team1Id ? match.team1_game_wins : match.team2_game_wins)) || 0;
        const loserGameWins = parseInt(String(loserId === match.team1Id ? match.team1_game_wins : match.team2_game_wins)) || 0;
              
        await updateTeamRecordsForMatch(
          winnerId,
          loserId,
          teams,
          winnerGameWins,
          loserGameWins
        );
      }

      return true;
    } catch (error: any) {
      console.error(`Error updating match ${match.id}:`, error);
      return false;
    }
  };

  return { updateMatch };
};
