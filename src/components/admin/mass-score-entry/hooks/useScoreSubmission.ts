
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
  const { updateMatchInDatabase } = useMatchUpdates(); 
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

    console.log(`[useScoreSubmission] Processing ${editedMatches.length} edited matches`);
    setSubmitting(true);
    clearErrors();
    let successCount = 0;

    try {
      for (const match of editedMatches) {
        try {
          console.log(`[useScoreSubmission] Processing match ${match.id}: Team1(${match.team1Id}): ${match.team1Score} - Team2(${match.team2Id}): ${match.team2Score}`);
          
          const validation = validateMatchSubmission(match);
          if (!validation.isValid) {
            addError(match.id, validation.errorMessage || "Invalid match data");
            continue;
          }

          const success = await updateMatchInDatabase(match);
          if (!success) {
            addError(match.id, "Failed to update match");
            continue;
          }

          // Determine winner and loser IDs
          let winnerId = null;
          let loserId = null;
          
          if (match.team1Score !== null && match.team2Score !== null) {
            if (match.team1Score > match.team2Score) {
              winnerId = match.team1Id;
              loserId = match.team2Id;
            } else if (match.team2Score > match.team1Score) {
              winnerId = match.team2Id;
              loserId = match.team1Id;
            }
          }

          console.log(`[useScoreSubmission] Match ${match.id} winner: ${winnerId}, loser: ${loserId}`);

          if (match.iscompleted && winnerId && loserId && match.team1 && match.team2) {
            console.log(`[useScoreSubmission] Updating team records for winner ${winnerId} (${match.team1.name}) and loser ${loserId} (${match.team2.name})`);
            
            const teams = [match.team1, match.team2];
            console.log(`[useScoreSubmission] Team data:`, 
              teams.map(team => ({ 
                id: team.id, 
                name: team.name, 
                wins: team.wins, 
                type: typeof team.wins,
                losses: team.losses 
              })));
              
            const updateSuccess = await updateTeamRecords(winnerId!, loserId!, teams);
            
            if (!updateSuccess) {
              toast({
                title: "Partial Success",
                description: `Match updated, but team records may not have been updated properly.`,
                variant: "default"
              });
            } else {
              console.log(`[useScoreSubmission] Team records updated successfully for match ${match.id}`);
            }
          }

          successCount++;
        } catch (error: any) {
          console.error(`[useScoreSubmission] Error updating match ${match.id}:`, error);
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

      // Invalidate ALL queries to ensure global consistency
      invalidateAllDataQueries();

      if (successCount > 0) {
        await fetchMatches();
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

  // Helper function to invalidate all related queries
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
