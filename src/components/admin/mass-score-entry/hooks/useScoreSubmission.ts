
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MatchWithTeams } from "../types";
import { format } from "date-fns";
import { useTeamRecords } from "@/hooks/useTeamRecords";
import { useQueryClient } from "@tanstack/react-query";

export const useScoreSubmission = (
  matches: MatchWithTeams[], 
  fetchMatches: () => Promise<void>
) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const { updateTeamRecords } = useTeamRecords();
  const queryClient = useQueryClient();

  const handleSubmitAll = async () => {
    const editedMatches = matches.filter(match => match.isEdited);
    
    if (editedMatches.length === 0) return;

    const invalidMatches = editedMatches.filter(match => !match.isValid);
    if (invalidMatches.length > 0) {
      toast({
        title: "Validation Error",
        description: "Some matches have invalid scores. Please ensure all scores are valid numbers.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
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

          // Get previous match state to check if completion status changed
          const { data: prevMatchData } = await supabase
            .from('matches')
            .select('iscompleted, winner_id')
            .eq('id', match.id)
            .single();
          
          const wasCompleted = prevMatchData?.iscompleted;
          const prevWinnerId = prevMatchData?.winner_id;
          const statusChanged = match.iscompleted !== wasCompleted;
          const winnerChanged = winnerId !== prevWinnerId;
          
          // Update the match
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
          
          // Handle team records update when status changes to completed or winner changes
          if (match.iscompleted && (statusChanged || winnerChanged)) {
            if (winnerId && loserId && match.team1 && match.team2) {
              const teams = [match.team1, match.team2];
              await updateTeamRecords(winnerId, loserId, teams);
            }
          }
        }
      }

      // Invalidate all relevant queries to refresh data across the app
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      
      toast({
        title: "Success",
        description: `Updated ${editedMatches.length} match results and refreshed team statistics.`,
      });

      await fetchMatches();
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
    handleSubmitAll
  };
};
