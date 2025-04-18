
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Team } from "@/types";
import { fetchTeamData } from "@/utils/teamStatsUtils/fetchTeamData";
import { updateTeamRecord } from "@/utils/teamStatsUtils/updateTeamRecord";
import { parseTeamStats } from "@/utils/teamStatsUtils/parseTeamStats";

export const useTeamWinLossUpdate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateTeamRecords = async (
    winnerId: string, 
    loserId: string, 
    teams: Team[], 
    winnerGameWins: number = 0, 
    loserGameWins: number = 0
  ) => {
    try {
      console.log(`---TEAM RECORD UPDATE STARTED---`);
      console.log(`Match result: Winner: ${winnerId}, Loser: ${loserId}`);
      console.log(`Games - Winner won: ${winnerGameWins}, Loser won: ${loserGameWins}`);
      
      // Fetch current team records
      const winnerTeam = await fetchTeamData(winnerId);
      const loserTeam = await fetchTeamData(loserId);
      
      if (!winnerTeam || !loserTeam) {
        return false;
      }
      
      // Parse team stats
      const winnerStats = parseTeamStats(winnerTeam);
      const loserStats = parseTeamStats(loserTeam);
      
      // Update winner's record
      const winnerSuccess = await updateTeamRecord({
        teamId: winnerId,
        isWinner: true,
        gameWins: winnerGameWins,
        gameLosses: loserGameWins,
        currentWins: winnerStats.wins,
        currentLosses: winnerStats.losses,
        currentGameWins: winnerStats.gameWins,
        currentGameLosses: winnerStats.gameLosses
      });
      
      // Update loser's record
      const loserSuccess = await updateTeamRecord({
        teamId: loserId,
        isWinner: false,
        gameWins: loserGameWins,
        gameLosses: winnerGameWins,
        currentWins: loserStats.wins,
        currentLosses: loserStats.losses,
        currentGameWins: loserStats.gameWins,
        currentGameLosses: loserStats.gameLosses
      });
      
      if (!winnerSuccess || !loserSuccess) {
        return false;
      }
      
      // Invalidate queries to update UI
      console.log("Invalidating query caches to ensure UI updates...");
      const queriesToInvalidate = [
        'rankings', 'teams', 'matches', 'teamStats', 'team', 'team-matches'
      ];
      
      for (const queryKey of queriesToInvalidate) {
        await queryClient.invalidateQueries({ queryKey: [queryKey] });
        console.log(`Invalidated query cache for ${queryKey}`);
      }
      
      console.log(`---TEAM RECORD UPDATE COMPLETED SUCCESSFULLY---`);
      return true;
    } catch (error) {
      console.error("---TEAM RECORD UPDATE FAILED---");
      console.error("Error updating team records:", error);
      toast({
        title: "Error",
        description: "Failed to update team records. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  return { updateTeamRecords };
};
