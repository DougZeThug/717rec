
import { useQueryClient } from "@tanstack/react-query";
import { MatchWithTeams } from "../types";
import { useSubmissionState } from "./useSubmissionState";
import { useMatchValidation } from "./submission/useMatchValidation";
import { useMatchUpdateService } from "../services/matchUpdateService";

export const useScoreSubmission = (
  matches: MatchWithTeams[],
  fetchMatches: () => Promise<MatchWithTeams[]>
) => {
  const queryClient = useQueryClient();
  const { validateMatch } = useMatchValidation();
  const { updateMatch } = useMatchUpdateService();
  const {
    submitting,
    setSubmitting,
    failedMatches,
    errorMessages,
    clearErrors,
    toast
  } = useSubmissionState();

  const handleSubmitAll = async () => {
    if (!matches || !Array.isArray(matches)) {
      toast({
        title: "Error",
        description: "No match data available",
        variant: "destructive"
      });
      return;
    }

    const editedMatches = matches.filter(match => 
      match && match.isEdited && match.isValid && match.iscompleted
    );
    
    console.log(`[useScoreSubmission] Found ${editedMatches.length} edited, valid, and completed matches out of ${matches.length} total matches`);
    
    if (editedMatches.length === 0) {
      toast({
        title: "No Changes",
        description: "There are no valid, completed changes to submit.",
      });
      return;
    }

    console.log(`[useScoreSubmission] Processing ${editedMatches.length} edited matches`);
    setSubmitting(true);
    clearErrors();
    let successCount = 0;

    try {
      for (const match of editedMatches) {
        if (!validateMatch({
          ...match,
          team1Score: match.team1Score ?? 0,
          team2Score: match.team2Score ?? 0,
          team1_game_wins: match.team1_game_wins ?? 0,
          team2_game_wins: match.team2_game_wins ?? 0,
        })) {
          console.log(`[useScoreSubmission] Match ${match.id} failed validation`);
          continue;
        }

        const success = await updateMatch(match);
        if (success) {
          successCount++;
        }
      }

      if (failedMatches.length === 0) {
        toast({
          title: "Success",
          description: `Updated ${successCount} match results and refreshed team statistics.`,
        });
      } else if (successCount > 0) {
        toast({
          title: "Partial Success",
          description: `Updated ${successCount} matches. ${failedMatches.length} matches failed to update.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to update any matches. Please check the error messages and try again.`,
          variant: "destructive"
        });
      }

      invalidateAllDataQueries();

      if (successCount > 0) {
        try {
          await fetchMatches();
        } catch (error) {
          console.error("Error refreshing matches:", error);
        }
      }
    } catch (error: any) {
      console.error("[useScoreSubmission] Error in batch update:", error.message);
      toast({
        title: "Error",
        description: `Failed to update matches: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const invalidateAllDataQueries = () => {
    console.log("[useScoreSubmission] Invalidating all data queries for fresh data");
    queryClient.invalidateQueries({ queryKey: ['matches'] });
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    queryClient.invalidateQueries({ queryKey: ['rankings'] });
    queryClient.invalidateQueries({ queryKey: ['teamStats'] });
    queryClient.invalidateQueries({ queryKey: ['team'] });
    queryClient.invalidateQueries({ queryKey: ['team-matches'] });
  };

  return {
    submitting,
    failedMatches,
    errorMessages,
    handleSubmitAll,
    clearErrors
  };
};
