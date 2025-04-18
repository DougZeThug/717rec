
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Team } from "@/types";

export const useTeamWinLossUpdate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateTeamRecords = async (winnerId: string, loserId: string, teams: Team[]) => {
    try {
      console.log(`Updating team records - Winner: ${winnerId}, Loser: ${loserId}`);
      
      // Get the current records for both teams
      const { data: winnerData, error: winnerError } = await supabase
        .from('teams')
        .select('wins, losses, name')
        .eq('id', winnerId)
        .maybeSingle();
      
      if (winnerError) {
        console.error("Error fetching winner data:", winnerError);
        throw winnerError;
      }
      
      const { data: loserData, error: loserError } = await supabase
        .from('teams')
        .select('wins, losses, name')
        .eq('id', loserId)
        .maybeSingle();
      
      if (loserError) {
        console.error("Error fetching loser data:", loserError);
        throw loserError;
      }

      if (!winnerData || !loserData) {
        throw new Error("Could not find team data");
      }
      
      // Get current win/loss values, ensuring they are numbers
      const currentWinnerWins = typeof winnerData.wins === 'number' ? winnerData.wins : 0;
      const currentWinnerLosses = typeof winnerData.losses === 'number' ? winnerData.losses : 0;
      const currentLoserWins = typeof loserData.wins === 'number' ? loserData.wins : 0;
      const currentLoserLosses = typeof loserData.losses === 'number' ? loserData.losses : 0;
      
      console.log(`Current records - Winner ${winnerData.name}: ${currentWinnerWins}W-${currentWinnerLosses}L, Loser ${loserData.name}: ${currentLoserWins}W-${currentLoserLosses}L`);
      
      // Update winner's record - increment wins by 1
      const newWinnerWins = currentWinnerWins + 1;
      const { error: updateWinnerError } = await supabase
        .from('teams')
        .update({ wins: newWinnerWins })
        .eq('id', winnerId);
      
      if (updateWinnerError) {
        console.error("Error updating winner record:", updateWinnerError);
        throw updateWinnerError;
      }
      
      console.log(`Updated winner ${winnerData.name} (${winnerId}) wins from ${currentWinnerWins} to ${newWinnerWins}`);
      
      // Update loser's record - increment losses by 1
      const newLoserLosses = currentLoserLosses + 1;
      const { error: updateLoserError } = await supabase
        .from('teams')
        .update({ losses: newLoserLosses })
        .eq('id', loserId);
      
      if (updateLoserError) {
        console.error("Error updating loser record:", updateLoserError);
        throw updateLoserError;
      }
      
      console.log(`Updated loser ${loserData.name} (${loserId}) losses from ${currentLoserLosses} to ${newLoserLosses}`);
      
      const getTeamName = (teamId: string) => {
        const team = teams.find(t => t.id === teamId);
        return team ? team.name : "Unknown Team";
      };

      const winnerName = getTeamName(winnerId);
      const loserName = getTeamName(loserId);
      
      console.log(`Successfully updated team records: ${winnerName} (${newWinnerWins}W-${currentWinnerLosses}L) and ${loserName} (${currentLoserWins}W-${newLoserLosses}L)`);
      
      // Immediately invalidate caches so UI updates
      const queriesToInvalidate = [
        'rankings', 'teams', 'matches', 'teamStats', 'team', 'team-matches'
      ];
      
      for (const queryKey of queriesToInvalidate) {
        await queryClient.invalidateQueries({ queryKey: [queryKey] });
        console.log(`Invalidated query cache for ${queryKey}`);
      }
      
      return true;
    } catch (error) {
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
