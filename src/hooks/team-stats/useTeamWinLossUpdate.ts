
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
        .select('wins, losses')
        .eq('id', winnerId)
        .single();
      
      if (winnerError) {
        console.error("Error fetching winner data:", winnerError);
        throw winnerError;
      }
      
      const { data: loserData, error: loserError } = await supabase
        .from('teams')
        .select('wins, losses')
        .eq('id', loserId)
        .single();
      
      if (loserError) {
        console.error("Error fetching loser data:", loserError);
        throw loserError;
      }
      
      console.log(`Current records - Winner: ${winnerData.wins}W-${winnerData.losses}L, Loser: ${loserData.wins}W-${loserData.losses}L`);
      
      // Update winner's record
      const { error: updateWinnerError } = await supabase
        .from('teams')
        .update({ wins: (winnerData.wins || 0) + 1 })
        .eq('id', winnerId);
      
      if (updateWinnerError) {
        console.error("Error updating winner record:", updateWinnerError);
        throw updateWinnerError;
      }
      
      // Update loser's record
      const { error: updateLoserError } = await supabase
        .from('teams')
        .update({ losses: (loserData.losses || 0) + 1 })
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
      
      console.log(`Successfully updated team records: ${winnerName} (W) and ${loserName} (L)`);
      
      toast({
        title: "Team Records Updated",
        description: `${winnerName} (W) and ${loserName} (L) records have been updated.`,
      });
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
      queryClient.invalidateQueries({ queryKey: ['teamStats'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['team-matches'] });
      
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
