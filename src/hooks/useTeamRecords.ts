
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

export const useTeamRecords = () => {
  const { toast } = useToast();

  const getTeamName = (teams: Team[], teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : "Unknown Team";
  };

  const updateTeamRecords = async (winnerId: string, loserId: string, teams: Team[]) => {
    try {
      // Get the current records for both teams
      const { data: winnerData, error: winnerError } = await supabase
        .from('teams')
        .select('wins')
        .eq('id', winnerId)
        .single();
      
      if (winnerError) throw winnerError;
      
      const { data: loserData, error: loserError } = await supabase
        .from('teams')
        .select('losses')
        .eq('id', loserId)
        .single();
      
      if (loserError) throw loserError;
      
      // Update winner's record
      const { error: updateWinnerError } = await supabase
        .from('teams')
        .update({ wins: (winnerData.wins || 0) + 1 })
        .eq('id', winnerId);
      
      if (updateWinnerError) throw updateWinnerError;
      
      // Update loser's record
      const { error: updateLoserError } = await supabase
        .from('teams')
        .update({ losses: (loserData.losses || 0) + 1 })
        .eq('id', loserId);
      
      if (updateLoserError) throw updateLoserError;
      
      const winnerName = getTeamName(teams, winnerId);
      const loserName = getTeamName(teams, loserId);
      
      toast({
        title: "Team Records Updated",
        description: `${winnerName} (W) and ${loserName} (L) records have been updated.`,
      });
      
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

  return {
    updateTeamRecords
  };
};
