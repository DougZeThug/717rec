
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MatchWithTeams } from "../types";
import { useTeamRecords } from "@/hooks/useTeamRecords";
import { useQueryClient } from "@tanstack/react-query";

export const useMatchSubmission = () => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const { updateTeamRecords } = useTeamRecords();
  const { toast } = useToast();

  const handleSubmitMatches = async (editedMatches: MatchWithTeams[]) => {
    if (editedMatches.length === 0) {
      toast({
        title: "No Changes",
        description: "There are no changes to submit.",
      });
      return;
    }

    setSubmitting(true);
    let successCount = 0;

    try {
      for (const match of editedMatches) {
        if (match.team1Score !== null && match.team2Score !== null) {
          let winnerId = null;
          let loserId = null;
          
          if (match.team1Score > match.team2Score) {
            winnerId = match.team1Id;
            loserId = match.team2Id;
          } else if (match.team2Score > match.team1Score) {
            winnerId = match.team2Id;
            loserId = match.team1Id;
          }

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
          successCount++;
        }
      }

      toast({
        title: "Success",
        description: `Updated ${successCount} match results successfully.`,
      });

      // Refresh all relevant data
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
    } catch (error: any) {
      console.error("Error updating matches:", error.message);
      toast({
        title: "Error",
        description: `Failed to update matches: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    submitting,
    handleSubmitMatches
  };
};
