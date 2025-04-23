
import { useQueryClient } from "@tanstack/react-query";
import { MatchWithTeams } from "../types";
import { useSubmissionState } from "./useSubmissionState";
import { useMatchUpdates } from "./useMatchUpdates";
import { useTeamRecords } from "@/hooks/useTeamRecords";
import { validateMatchSubmission } from "../utils/matchSubmissionUtils";

export const useScoreSubmission = (
  matches: MatchWithTeams[],
  fetchMatches: () => Promise<MatchWithTeams[]> // Updated to match the actual return type
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
    if (!matches || !Array.isArray(matches)) {
      toast({
        title: "Error",
        description: "No match data available",
        variant: "destructive"
      });
      return;
    }

    const editedMatches = matches.filter(match => match && match.isEdited);
    
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
          // Ensure game wins are properly parsed as integers
          const team1GameWins = parseInt(String(match.team1_game_wins)) || 0;
          const team2GameWins = parseInt(String(match.team2_game_wins)) || 0;
          
          console.log(`[useScoreSubmission] Processing match ${match.id}: Team1(${match.team1Id}): ${match.team1Score} - Team2(${match.team2Id}): ${match.team2Score}`);
          console.log(`[useScoreSubmission] Game wins: Team1: ${team1GameWins}, Team2: ${team2GameWins}`);
          
          // Update match object with parsed game wins to ensure integer values
          match.team1_game_wins = team1GameWins;
          match.team2_game_wins = team2GameWins;
          
          // Recalculate binary match scores based on game wins to ensure consistency
          if (team1GameWins > team2GameWins) {
            match.team1Score = 1;
            match.team2Score = 0;
          } else if (team1GameWins < team2GameWins) {
            match.team1Score = 0;
            match.team2Score = 1;
          } else {
            // Tied game wins should be caught by validation
            addError(match.id, "Game wins cannot be tied");
            continue;
          }
          
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

          // Determine winner and loser IDs from binary match scores
          let winnerId = null;
          let loserId = null;
          
          if (match.team1Score === 1) {
            winnerId = match.team1Id;
            loserId = match.team2Id;
          } else if (match.team2Score === 1) {
            winnerId = match.team2Id;
            loserId = match.team1Id;
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
              
            // Use the parsed game wins for winner and loser
            const winnerGameWins = parseInt(String(winnerId === match.team1Id ? team1GameWins : team2GameWins)) || 0;
            const loserGameWins = parseInt(String(loserId === match.team1Id ? team1GameWins : team2GameWins)) || 0;
              
            console.log(`[useScoreSubmission] Game wins - Winner: ${winnerGameWins}, Loser: ${loserGameWins}`);
              
            const updateSuccess = await updateTeamRecords(
              winnerId, 
              loserId, 
              teams,
              winnerGameWins,
              loserGameWins
            );
            
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
        try {
          // Use returned matches array and ignore it
          const updatedMatches = await fetchMatches();
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
