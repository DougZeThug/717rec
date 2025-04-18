
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Team } from "@/types";

export const useTeamWinLossUpdate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateTeamRecords = async (winnerId: string, loserId: string, teams: Team[], winnerGameWins: number, loserGameWins: number) => {
    try {
      console.log(`---TEAM RECORD UPDATE STARTED---`);
      console.log(`Updating team records - Winner: ${winnerId}, Loser: ${loserId}`);
      console.log(`Game wins - Winner: ${winnerGameWins}, Loser: ${loserGameWins}`);
      
      // First, let's verify the teams exist and get their current records
      const { data: winnerTeam, error: winnerFetchError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', winnerId)
        .maybeSingle();
      
      if (winnerFetchError || !winnerTeam) {
        console.error("ERROR FETCHING WINNER:", winnerFetchError || "No winner found with ID: " + winnerId);
        return false;
      }
      
      const { data: loserTeam, error: loserFetchError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', loserId)
        .maybeSingle();
      
      if (loserFetchError || !loserTeam) {
        console.error("ERROR FETCHING LOSER:", loserFetchError || "No loser found with ID: " + loserId);
        return false;
      }
      
      console.log("Winner team data:", winnerTeam);
      console.log("Loser team data:", loserTeam);
      
      // Parse and validate the win/loss values
      const currentWinnerWins = parseInt(String(winnerTeam.wins ?? 0));
      const currentLoserLosses = parseInt(String(loserTeam.losses ?? 0));
      const currentWinnerGameWins = parseInt(String(winnerTeam.game_wins ?? 0));
      const currentLoserGameWins = parseInt(String(loserTeam.game_wins ?? 0));
      
      console.log(`BEFORE UPDATE - Winner ${winnerTeam.name}:`);
      console.log(`Match record: ${currentWinnerWins} wins`);
      console.log(`Game wins: ${currentWinnerGameWins}`);
      
      console.log(`BEFORE UPDATE - Loser ${loserTeam.name}:`);
      console.log(`Match record: ${currentLoserLosses} losses`);
      console.log(`Game wins: ${currentLoserGameWins}`);
      
      if (isNaN(currentWinnerWins) || isNaN(currentLoserLosses) || 
          isNaN(currentWinnerGameWins) || isNaN(currentLoserGameWins)) {
        console.error("ERROR: Invalid win/loss/game values detected");
        return false;
      }
      
      // Calculate new values - Add 1 win/loss for match result, add game wins separately
      const newWinnerWins = currentWinnerWins + 1; // One match win
      const newLoserLosses = currentLoserLosses + 1; // One match loss
      const newWinnerGameWins = currentWinnerGameWins + winnerGameWins;
      const newLoserGameWins = currentLoserGameWins + loserGameWins;
      
      console.log(`Updating winner ${winnerTeam.name} (${winnerId})`);
      console.log(`Match wins: ${currentWinnerWins} -> ${newWinnerWins}`);
      console.log(`Game wins: ${currentWinnerGameWins} -> ${newWinnerGameWins}`);
      
      // Update winner's records
      const winnerUpdateResult = await supabase
        .from('teams')
        .update({ 
          wins: newWinnerWins,
          game_wins: newWinnerGameWins
        })
        .eq('id', winnerId)
        .select();
      
      if (winnerUpdateResult.error || !winnerUpdateResult.data?.length) {
        console.error("CRITICAL ERROR updating winner record:", winnerUpdateResult.error);
        return false;
      }
      
      console.log(`Winner ${winnerTeam.name} updated successfully`);
      
      // Update loser's records
      console.log(`Updating loser ${loserTeam.name} (${loserId})`);
      console.log(`Match losses: ${currentLoserLosses} -> ${newLoserLosses}`);
      console.log(`Game wins: ${currentLoserGameWins} -> ${newLoserGameWins}`);
      
      const loserUpdateResult = await supabase
        .from('teams')
        .update({ 
          losses: newLoserLosses,
          game_wins: newLoserGameWins
        })
        .eq('id', loserId)
        .select();
      
      if (loserUpdateResult.error || !loserUpdateResult.data?.length) {
        console.error("CRITICAL ERROR updating loser record:", loserUpdateResult.error);
        return false;
      }
      
      console.log(`Loser ${loserTeam.name} updated successfully`);
      
      // Verify the updates by fetching the updated records
      const { data: updatedWinnerData } = await supabase
        .from('teams')
        .select('wins, losses, game_wins, name')
        .eq('id', winnerId)
        .single();
        
      const { data: updatedLoserData } = await supabase
        .from('teams')
        .select('wins, losses, game_wins, name')
        .eq('id', loserId)
        .single();
        
      if (updatedWinnerData && updatedLoserData) {
        console.log(`AFTER UPDATE - Winner ${updatedWinnerData.name}:`);
        console.log(`Match record: ${updatedWinnerData.wins}W-${updatedWinnerData.losses}L`);
        console.log(`Game wins: ${updatedWinnerData.game_wins}`);
        
        console.log(`AFTER UPDATE - Loser ${updatedLoserData.name}:`);
        console.log(`Match record: ${updatedLoserData.wins}W-${updatedLoserData.losses}L`);
        console.log(`Game wins: ${updatedLoserData.game_wins}`);
      }
      
      // Immediately invalidate caches to update UI
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
