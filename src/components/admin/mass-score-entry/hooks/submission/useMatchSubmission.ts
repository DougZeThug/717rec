
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MatchWithTeams } from "../../types";

export const useMatchSubmission = () => {
  const { toast } = useToast();

  const handleSubmitAll = async (editedMatches: MatchWithTeams[]) => {
    try {
      // Process matches one by one to handle winner_id and loser_id
      for (const match of editedMatches) {
        if (match.team1Score !== null && match.team2Score !== null) {
          let winnerId = null;
          let loserId = null;
          
          // Determine winner and loser
          if (match.team1Score > match.team2Score) {
            winnerId = match.team1Id;
            loserId = match.team2Id;
          } else if (match.team2Score > match.team1Score) {
            winnerId = match.team2Id;
            loserId = match.team1Id;
          }

          // Update match in database
          const { error } = await supabase
            .from('matches')
            .update({
              team1_score: match.team1Score,
              team2_score: match.team2Score,
              iscompleted: match.iscompleted,
              winner_id: winnerId,
              loser_id: loserId
            })
            .eq('id', match.id);

          if (error) throw error;
        }
      }

      toast({
        title: "Success",
        description: `Updated ${editedMatches.length} match results successfully.`,
      });

      return true;
    } catch (error: any) {
      console.error("Error updating matches:", error.message);
      toast({
        title: "Error",
        description: `Failed to update matches: ${error.message}`,
        variant: "destructive"
      });
      return false;
    }
  };

  return { handleSubmitAll };
};
