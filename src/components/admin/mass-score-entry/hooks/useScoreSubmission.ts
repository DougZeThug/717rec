
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MatchWithTeams } from "../types";
import { format } from "date-fns";
import { useTeamRecords } from "@/hooks/useTeamRecords";
import { useQueryClient } from "@tanstack/react-query";
import { validateMatch } from "../utils/matchValidation";

export const useScoreSubmission = (
  matches: MatchWithTeams[], 
  fetchMatches: () => Promise<void>
) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [failedMatches, setFailedMatches] = useState<string[]>([]);
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});
  const { updateTeamRecords } = useTeamRecords();
  const queryClient = useQueryClient();

  // Reset errors for a specific match or all matches
  const clearErrors = (matchId?: string) => {
    if (matchId) {
      setErrorMessages(prev => {
        const newErrors = {...prev};
        delete newErrors[matchId];
        return newErrors;
      });
      setFailedMatches(prev => prev.filter(id => id !== matchId));
    } else {
      setErrorMessages({});
      setFailedMatches([]);
    }
  };

  // Validate all matches before submission
  const validateAllMatches = () => {
    const newErrorMessages: Record<string, string> = {};
    let hasErrors = false;

    // Check each edited match for validation
    const editedMatches = matches.filter(match => match.isEdited);
    
    editedMatches.forEach(match => {
      const validationResult = validateMatch(match);
      if (!validationResult.isValid) {
        newErrorMessages[match.id] = validationResult.errorMessage || 'Invalid match data';
        hasErrors = true;
      }
    });

    setErrorMessages(newErrorMessages);
    return !hasErrors;
  };

  // Determine winner based on scores
  const determineWinner = (match: MatchWithTeams) => {
    if (!match.team1Score && !match.team2Score) {
      return { winnerId: null, loserId: null };
    }

    if (match.team1Score === match.team2Score) {
      // This shouldn't happen for valid matches but handle it
      return { winnerId: null, loserId: null };
    }

    if (match.team1Score! > match.team2Score!) {
      return { winnerId: match.team1Id, loserId: match.team2Id };
    } else {
      return { winnerId: match.team2Id, loserId: match.team1Id };
    }
  };

  const handleSubmitAll = async () => {
    const editedMatches = matches.filter(match => match.isEdited);
    
    if (editedMatches.length === 0) {
      toast({
        title: "No Changes",
        description: "There are no changes to submit.",
      });
      return;
    }

    // Validate all matches first
    if (!validateAllMatches()) {
      toast({
        title: "Validation Error",
        description: "Some matches have invalid data. Please correct the errors before submitting.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    setFailedMatches([]);
    const newFailedMatches: string[] = [];
    const newErrorMessages: Record<string, string> = {};
    
    try {
      for (const match of editedMatches) {
        try {
          if (!match.isValid || !match.team1Score || !match.team2Score) {
            newFailedMatches.push(match.id);
            newErrorMessages[match.id] = "Invalid scores. Please enter valid numbers.";
            continue;
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
          const winnerChanged = match.winnerId !== prevWinnerId;
          
          // Automatically determine winner and loser
          const { winnerId, loserId } = determineWinner(match);
          
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

          if (error) {
            throw error;
          }
          
          // Handle team records update when status changes to completed or winner changes
          if (match.iscompleted && (statusChanged || winnerChanged)) {
            if (winnerId && loserId && match.team1 && match.team2) {
              const teams = [match.team1, match.team2];
              const updateSuccess = await updateTeamRecords(winnerId, loserId, teams);
              
              if (!updateSuccess) {
                toast({
                  title: "Warning",
                  description: `Match updated, but team records may not have been updated properly.`,
                  variant: "warning"
                });
              }
            }
          }
        } catch (error: any) {
          console.error(`Error updating match ${match.id}:`, error);
          newFailedMatches.push(match.id);
          newErrorMessages[match.id] = error.message || "Failed to update match";
        }
      }

      // Set any failed matches
      setFailedMatches(newFailedMatches);
      setErrorMessages(newErrorMessages);
      
      // Only show success if all or some matches were updated successfully
      if (newFailedMatches.length === 0) {
        toast({
          title: "Success",
          description: `Updated ${editedMatches.length} match results and refreshed team statistics.`,
        });
      } else if (newFailedMatches.length < editedMatches.length) {
        const successCount = editedMatches.length - newFailedMatches.length;
        toast({
          title: "Partial Success",
          description: `Updated ${successCount} matches. ${newFailedMatches.length} matches failed to update.`,
          variant: "warning"
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to update any matches. Please check the error messages and try again.`,
          variant: "destructive"
        });
      }

      // Invalidate all relevant queries to refresh data across the app
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });

      // Only refresh matches if there were any successful updates
      if (newFailedMatches.length < editedMatches.length) {
        await fetchMatches();
      }
    } catch (error: any) {
      console.error("Error in batch update:", error.message);
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
    failedMatches,
    errorMessages,
    handleSubmitAll,
    clearErrors
  };
};
