
import { useEffect } from "react";
import { MatchWithTeams } from "../types";
import { useMatchFilters } from "./useMatchFilters";
import { useMatchFetching } from "./useMatchFetching";
import { useMatchValidation } from "./useMatchValidation";
import { useMatchUpdates } from "./useMatchUpdates";
import { useSubmissionState } from "./useSubmissionState";
import { useMatchScores } from "./useMatchScores";
import { useQueryClient } from "@tanstack/react-query";
import { useTeamRecords } from "@/hooks/useTeamRecords";

export const useScoreEntryData = () => {
  const {
    matches,
    setMatches,
    handleScoreChange,
    handleMarkCompleted
  } = useMatchScores();

  const { filters, brackets, fetchBrackets, setFilterDate, setBracketFilter, clearFilters } = useMatchFilters();
  const { loading, fetchMatches } = useMatchFetching();
  const { updateMatchInDatabase } = useMatchUpdates();
  const { updateTeamRecords } = useTeamRecords();
  const queryClient = useQueryClient();
  
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
          const success = await updateMatchInDatabase(match);
          
          if (!success) {
            addError(match.id, "Failed to update match");
            continue;
          }

          if (match.iscompleted && match.team1 && match.team2) {
            // Determine winner and loser
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
            
            if (winnerId && loserId) {
              const teams = [match.team1, match.team2];
              
              // Get the game wins for winner and loser
              const winnerGameWins = winnerId === match.team1Id ? (match.team1_game_wins || 0) : (match.team2_game_wins || 0);
              const loserGameWins = loserId === match.team1Id ? (match.team1_game_wins || 0) : (match.team2_game_wins || 0);
              
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
              }
            }
          }

          successCount++;
        } catch (error: any) {
          console.error(`Error updating match ${match.id}:`, error);
          addError(match.id, error.message || "Failed to update match");
        }
      }

      if (failedMatches.length === 0) {
        toast({
          title: "Success",
          description: `Updated ${successCount} match results successfully.`,
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

      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
      queryClient.invalidateQueries({ queryKey: ['teamStats'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['team-matches'] });

      if (successCount > 0) {
        await fetchMatches(filters);
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

  useEffect(() => {
    const loadData = async () => {
      await fetchBrackets();
      const fetchedMatches = await fetchMatches(filters);
      setMatches(fetchedMatches);
    };
    loadData();
  }, [filters.date, filters.bracketId]);

  return {
    matches,
    loading,
    submitting,
    failedMatches,
    errorMessages,
    brackets,
    filters,
    handleScoreChange,
    handleMarkCompleted,
    handleSubmitAll,
    clearErrors,
    setFilterDate,
    setBracketFilter,
    clearFilters
  };
};
