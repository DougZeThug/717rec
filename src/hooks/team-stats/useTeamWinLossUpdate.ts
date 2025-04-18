
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Team } from "@/types";

export const useTeamWinLossUpdate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateTeamRecords = async (winnerId: string, loserId: string, teams: Team[]) => {
    try {
      console.log(`---TEAM RECORD UPDATE STARTED---`);
      console.log(`Updating team records - Winner: ${winnerId}, Loser: ${loserId}`);
      
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
      
      console.log(`BEFORE UPDATE - Winner ${winnerTeam.name}: ${currentWinnerWins} wins (type: ${typeof winnerTeam.wins})`);
      console.log(`BEFORE UPDATE - Loser ${loserTeam.name}: ${currentLoserLosses} losses (type: ${typeof loserTeam.losses})`);
      
      if (isNaN(currentWinnerWins) || isNaN(currentLoserLosses)) {
        console.error("ERROR: Invalid win/loss values detected");
        console.error(`Winner wins: ${winnerTeam.wins} (parsed: ${currentWinnerWins})`);
        console.error(`Loser losses: ${loserTeam.losses} (parsed: ${currentLoserLosses})`);
        return false;
      }
      
      // Calculate new values - IMPORTANT: Only add 1 win/loss per match, not per game win
      const newWinnerWins = currentWinnerWins + 1;
      const newLoserLosses = currentLoserLosses + 1;
      
      console.log(`Updating winner ${winnerTeam.name} (${winnerId}) wins from ${currentWinnerWins} to ${newWinnerWins}`);
      
      // Update winner's wins - FIXED: Removed the second argument to select()
      const winnerUpdateResult = await supabase
        .from('teams')
        .update({ wins: newWinnerWins })
        .eq('id', winnerId)
        .select();
      
      console.log("WINNER UPDATE RESPONSE:", winnerUpdateResult);
      
      if (winnerUpdateResult.error) {
        console.error("CRITICAL ERROR updating winner record:", winnerUpdateResult.error);
        return false;
      }
      
      if (!winnerUpdateResult.data || winnerUpdateResult.data.length === 0) {
        console.error(`CRITICAL ERROR: Winner update affected 0 rows. Team might not exist with ID: ${winnerId}`);
        return false;
      }
      
      console.log(`Winner update status: ${winnerUpdateResult.error ? 'FAILED' : 'SUCCESS'}`);
      console.log(`Winner update affected rows: ${winnerUpdateResult.data?.length || 0}`);
      console.log(`Updated winner data:`, winnerUpdateResult.data);
      
      // Update loser's losses - FIXED: Removed the second argument to select()
      console.log(`Updating loser ${loserTeam.name} (${loserId}) losses from ${currentLoserLosses} to ${newLoserLosses}`);
      
      const loserUpdateResult = await supabase
        .from('teams')
        .update({ losses: newLoserLosses })
        .eq('id', loserId)
        .select();
      
      console.log("LOSER UPDATE RESPONSE:", loserUpdateResult);
      
      if (loserUpdateResult.error) {
        console.error("CRITICAL ERROR updating loser record:", loserUpdateResult.error);
        return false;
      }
      
      if (!loserUpdateResult.data || loserUpdateResult.data.length === 0) {
        console.error(`CRITICAL ERROR: Loser update affected 0 rows. Team might not exist with ID: ${loserId}`);
        return false;
      }
      
      console.log(`Loser update status: ${loserUpdateResult.error ? 'FAILED' : 'SUCCESS'}`);
      console.log(`Loser update affected rows: ${loserUpdateResult.data?.length || 0}`);
      console.log(`Updated loser data:`, loserUpdateResult.data);
      
      // Verify the updates by fetching the updated records
      const { data: updatedWinnerData } = await supabase
        .from('teams')
        .select('wins, losses, name')
        .eq('id', winnerId)
        .single();
        
      const { data: updatedLoserData } = await supabase
        .from('teams')
        .select('wins, losses, name')
        .eq('id', loserId)
        .single();
        
      if (updatedWinnerData && updatedLoserData) {
        console.log(`AFTER UPDATE - Winner ${updatedWinnerData.name}: ${updatedWinnerData.wins}W-${updatedWinnerData.losses}L`);
        console.log(`AFTER UPDATE - Loser ${updatedLoserData.name}: ${updatedLoserData.wins}W-${updatedLoserData.losses}L`);
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
