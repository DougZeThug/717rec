
import { useQueryClient } from "@tanstack/react-query";
import { MatchWithTeams } from "../types";
import { useSubmissionState } from "./useSubmissionState";
import { useMatchUpdates } from "./useMatchUpdates";
import { useTeamRecords } from "@/hooks/useTeamRecords";
import { validateMatchSubmission } from "../utils/matchSubmissionUtils";

export const useScoreSubmission = (
  matches: MatchWithTeams[],
  fetchMatches: () => Promise<void>
) => {
  const queryClient = useQueryClient();
  const { updateTeamRecords } = useTeamRecords();
  const { updateMatch } = useMatchUpdates();
  const {
    submitting,
    setSubmitting,
    failedMatches,
    errorMessages,
    clearErrors,
    addError,
    toast
  } = useSubmissionState();

  const handleSubmitAll = async () => {
    const editedMatches = matches.filter(match => match.isEdited);
    
    if (editedMatches.length === 0) {
      toast({
        title: "No Changes",
        description: "There are no changes to submit.",
      });
      return;
    }

    setSubmitting(true);
    clearErrors();
    let successCount = 0;

    try {
      for (const match of editedMatches) {
        try {
          const validation = validateMatchSubmission(match);
          if (!validation.isValid) {
            addError(match.id, validation.errorMessage || "Invalid match data");
            continue;
          }

          const { winnerId, loserId } = await updateMatch(match);

          if (match.iscompleted && match.team1 && match.team2) {
            const teams = [match.team1, match.team2];
            const updateSuccess = await updateTeamRecords(winnerId!, loserId!, teams);
            
            if (!updateSuccess) {
              toast({
                title: "Partial Success",
                description: `Match updated, but team records may not have been updated properly.`,
                variant: "default"
              });
            }
          }

          successCount++;
        } catch (error: any) {
          console.error(`Error updating match ${match.id}:`, error);
          addError(match.id, error.message || "Failed to update match");
        }
      }

      // Show appropriate toast message based on results
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

      // Invalidate queries and refresh data
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });

      if (successCount > 0) {
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
