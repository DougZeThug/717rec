
import { useTeamWinLossUpdate } from "./team-stats/useTeamWinLossUpdate";
import { updateTeamStatsRecord } from "@/services/TeamStatsService";
import { Team } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export const useTeamRecords = () => {
  const { updateTeamRecords: updateWinLoss } = useTeamWinLossUpdate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /**
   * Updates team records for a completed match
   * @param winnerId The ID of the winning team
   * @param loserId The ID of the losing team
   * @param teams Array of team data
   * @param winnerGameWins Number of games won by winner (default: 0)
   * @param loserGameWins Number of games won by loser (default: 0)
   */
  const updateTeamRecords = async (
    winnerId: string, 
    loserId: string, 
    teams: Team[], 
    winnerGameWins: number = 0, 
    loserGameWins: number = 0
  ) => {
    console.log("===== TEAM RECORDS UPDATE PROCESS STARTING =====");
    console.log("Winner ID:", winnerId, "Loser ID:", loserId);
    console.log("Game wins - Winner:", winnerGameWins, "Loser:", loserGameWins);
    
    // Log types and values of team data
    if (teams && teams.length > 0) {
      teams.forEach(team => {
        console.log(`Team ${team.name} (${team.id}) current data:`, {
          wins: team.wins,
          winsType: typeof team.wins,
          losses: team.losses,
          lossesType: typeof team.losses,
          gameWins: team.game_wins,
          gameWinsType: typeof team.game_wins,
          gameLosses: team.game_losses,
          gameLossesType: typeof team.game_losses
        });
      });
    }
    
    try {
      // First update the basic win/loss records in the teams table
      console.log("Step 1: Updating basic win/loss and game records in teams table");
      const success = await updateWinLoss(winnerId, loserId, teams, winnerGameWins, loserGameWins);
      
      if (!success) {
        console.error("CRITICAL ERROR: Failed to update basic win/loss records in teams table");
        toast({
          title: "Error",
          description: "Failed to update team records. Please try again.",
          variant: "destructive"
        });
        return false;
      }
      
      console.log("Step 1 SUCCESSFUL: Teams table win/loss records updated");
      console.log("Step 2: Updating detailed team statistics");
  
      // Then update the detailed team stats
      const statsSuccess = await updateTeamStatsRecord(winnerId, loserId);
      if (!statsSuccess) {
        console.error("WARNING: Failed to update detailed team stats (power scores, etc.)");
        toast({
          title: "Warning",
          description: "Team win/loss records updated, but detailed stats failed to update.",
          variant: "destructive"
        });
      } else {
        console.log("Step 2 SUCCESSFUL: Team detailed statistics updated");
      }
      
      console.log("Step 3: Invalidating all relevant queries to ensure data freshness");
      
      // Force invalidate all relevant queries to ensure data freshness across the app
      const queriesToInvalidate = [
        'rankings', 'teams', 'matches', 'teamStats', 'team', 'team-matches'
      ];
      
      for (const queryKey of queriesToInvalidate) {
        await queryClient.invalidateQueries({ queryKey: [queryKey] });
        console.log(`Query cache invalidated for ${queryKey}`);
      }
      
      toast({
        title: "Success",
        description: "Team records and statistics have been updated successfully.",
      });
      
      console.log("===== TEAM RECORDS UPDATE PROCESS COMPLETED SUCCESSFULLY =====");
      return true;
    } catch (error) {
      console.error("===== TEAM RECORDS UPDATE PROCESS FAILED =====");
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating team records.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    updateTeamRecords
  };
};
