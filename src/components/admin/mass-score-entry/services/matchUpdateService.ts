
import { MatchWithTeams } from "../types";
import { useMatchUpdates } from "../hooks/useMatchUpdates";
import { useTeamRecords } from "@/hooks/useTeamRecords";
import { useToast } from "@/hooks/use-toast";

export const useMatchUpdateService = () => {
  const { updateMatchInDatabase } = useMatchUpdates();
  const { updateTeamRecords } = useTeamRecords();
  const { toast } = useToast();

  const updateMatch = async (match: MatchWithTeams): Promise<boolean> => {
    try {
      console.log("🚀 Submitting match to updateMatchInDatabase:", {
        matchId: match.id,
        team1Score: match.team1Score,
        team2Score: match.team2Score,
        team1GameWins: match.team1_game_wins,
        team2GameWins: match.team2_game_wins,
        winnerId: match.team1Score === 1 ? match.team1Id : match.team2Id,
        loserId: match.team1Score === 1 ? match.team2Id : match.team1Id
      });

      const success = await updateMatchInDatabase(match);
      if (!success) {
        return false;
      }

      // Determine winner and loser IDs from binary match scores
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
              
        const updateSuccess = await updateTeamRecords(
          winnerId, 
          loserId, 
          teams,
          winnerGameWins,
          loserGameWins
        );
        
        if (!updateSuccess) {
          toast({
            title: "Partial Success",
            description: `Match updated, but team records may not have been updated properly.`,
            variant: "default"
          });
        }
      }

      return true;
    } catch (error: any) {
      console.error(`Error updating match ${match.id}:`, error);
      return false;
    }
  };

  return { updateMatch };
};
