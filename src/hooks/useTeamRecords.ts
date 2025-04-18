
import { useTeamWinLossUpdate } from "./team-stats/useTeamWinLossUpdate";
import { updateTeamStatsRecord } from "@/services/TeamStatsService";
import { Team } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export const useTeamRecords = () => {
  const { updateTeamRecords: updateWinLoss } = useTeamWinLossUpdate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateTeamRecords = async (winnerId: string, loserId: string, teams: Team[]) => {
    console.log("===== TEAM RECORDS UPDATE PROCESS STARTING =====");
    console.log("Winner ID:", winnerId, "Loser ID:", loserId);
    console.log("Teams data:", teams.map(t => ({ id: t.id, name: t.name, wins: t.wins, losses: t.losses })));
    
    try {
      // First update the basic win/loss records in the teams table
      console.log("Step 1: Updating basic win/loss records in teams table");
      const success = await updateWinLoss(winnerId, loserId, teams);
      
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
