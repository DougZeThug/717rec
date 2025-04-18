
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
      
      console.log(`Current records - Winner ${winnerData.name}: ${winnerData.wins}W-${winnerData.losses}L, Loser ${loserData.name}: ${loserData.wins}W-${loserData.losses}L`);
      
      // Update winner's record
      const newWinnerWins = (winnerData.wins || 0) + 1;
      const { error: updateWinnerError } = await supabase
        .from('teams')
        .update({ wins: newWinnerWins })
        .eq('id', winnerId);
      
      if (updateWinnerError) {
        console.error("Error updating winner record:", updateWinnerError);
        throw updateWinnerError;
      }
      
      // Update loser's record
      const newLoserLosses = (loserData.losses || 0) + 1;
      const { error: updateLoserError } = await supabase
        .from('teams')
        .update({ losses: newLoserLosses })
        .eq('id', loserId);
      
      if (updateLoserError) {
        console.error("Error updating loser record:", updateLoserError);
        throw updateLoserError;
      }
      
      const getTeamName = (teamId: string) => {
        const team = teams.find(t => t.id === teamId);
        return team ? team.name : "Unknown Team";
      };

      const winnerName = getTeamName(winnerId);
      const loserName = getTeamName(loserId);
      
      console.log(`Successfully updated team records: ${winnerName} (${newWinnerWins}W-${winnerData.losses}L) and ${loserName} (${loserData.wins}W-${newLoserLosses}L)`);
      
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
