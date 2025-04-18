
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
      
      // Get the current records for both teams
      const { data: winnerData, error: winnerError } = await supabase
        .from('teams')
        .select('wins, losses, name')
        .eq('id', winnerId)
        .single();
      
      if (winnerError) {
        console.error("Error fetching winner data:", winnerError);
        throw winnerError;
      }
      
      const { data: loserData, error: loserError } = await supabase
        .from('teams')
        .select('wins, losses, name')
        .eq('id', loserId)
        .single();
      
      if (loserError) {
        console.error("Error fetching loser data:", loserError);
        throw loserError;
      }

      if (!winnerData || !loserData) {
        console.error("CRITICAL ERROR: Could not find team data for winner or loser");
        throw new Error("Could not find team data");
      }
      
      // Get current win/loss values, ensuring they are numbers
      const currentWinnerWins = typeof winnerData.wins === 'number' ? winnerData.wins : 0;
      const currentWinnerLosses = typeof winnerData.losses === 'number' ? winnerData.losses : 0;
      const currentLoserWins = typeof loserData.wins === 'number' ? loserData.wins : 0;
      const currentLoserLosses = typeof loserData.losses === 'number' ? loserData.losses : 0;
      
      console.log(`BEFORE UPDATE - Winner ${winnerData.name}: ${currentWinnerWins}W-${currentWinnerLosses}L, Loser ${loserData.name}: ${currentLoserWins}W-${currentLoserLosses}L`);
      
      // Update winner's record - increment wins by 1
      const newWinnerWins = currentWinnerWins + 1;
      console.log(`Updating winner ${winnerData.name} (${winnerId}) wins from ${currentWinnerWins} to ${newWinnerWins}`);
      
      const winnerUpdateResult = await supabase
        .from('teams')
        .update({ wins: newWinnerWins })
        .eq('id', winnerId);
      
      if (winnerUpdateResult.error) {
        console.error("CRITICAL ERROR updating winner record:", winnerUpdateResult.error);
        throw winnerUpdateResult.error;
      }
      
      console.log(`Winner update status: ${winnerUpdateResult.error ? 'FAILED' : 'SUCCESS'}`);
      console.log(`Winner update affected rows: ${winnerUpdateResult.count || 0}`);
      
      // Update loser's record - increment losses by 1
      const newLoserLosses = currentLoserLosses + 1;
      console.log(`Updating loser ${loserData.name} (${loserId}) losses from ${currentLoserLosses} to ${newLoserLosses}`);
      
      const loserUpdateResult = await supabase
        .from('teams')
        .update({ losses: newLoserLosses })
        .eq('id', loserId);
      
      if (loserUpdateResult.error) {
        console.error("CRITICAL ERROR updating loser record:", loserUpdateResult.error);
        throw loserUpdateResult.error;
      }
      
      console.log(`Loser update status: ${loserUpdateResult.error ? 'FAILED' : 'SUCCESS'}`);
      console.log(`Loser update affected rows: ${loserUpdateResult.count || 0}`);
      
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
        console.log(`AFTER UPDATE - Winner ${updatedWinnerData.name}: ${updatedWinnerData.wins}W-${updatedWinnerData.losses}L, Loser ${updatedLoserData.name}: ${updatedLoserData.wins}W-${updatedLoserData.losses}L`);
      }
      
      const getTeamName = (teamId: string) => {
        const team = teams.find(t => t.id === teamId);
        return team ? team.name : "Unknown Team";
      };

      const winnerName = getTeamName(winnerId);
      const loserName = getTeamName(loserId);
      
      console.log(`Team record update COMPLETED for ${winnerName} and ${loserName}`);
      
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
