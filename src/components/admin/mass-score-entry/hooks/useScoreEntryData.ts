import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useMatchesState } from "./state/useMatchesState";
import { useFiltersState } from "./state/useFiltersState";
import { useMatchSubmission } from "@/hooks/matches/useMatchSubmission";
import { useMatchesFetching } from "./fetching/useMatchesFetching";
import { useMatchScores } from "./useMatchScores";
import { useErrorHandling } from "./error/useErrorHandling";
import { useMatchEventListeners } from "./useMatchEventListeners";
import { invalidateMatchRelatedQueries } from "@/hooks/matches/utils/queryCacheUtils";
import { MatchWithTeams } from "../types";

export const useScoreEntryData = () => {
  const {
    matches,
    setMatches,
    loading,
    setLoading,
    submitting,
    setSubmitting,
  } = useMatchesState();

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { handleSubmitScore } = useMatchSubmission();

  const {
    filters,
    brackets,
    fetchBrackets,
    setFilterDate,
    setBracketFilter,
    clearFilters,
    updateFiltersForMatchDate
  } = useFiltersState();

  const {
    failedMatches,
    errorMessages,
    clearErrors
  } = useErrorHandling();

  const { fetchMatches } = useMatchesFetching();
  
  // Set up event listeners for match creation events
  useMatchEventListeners({ updateFiltersForMatchDate });
  
  // Pass matches and setMatches to useMatchScores to ensure single source of truth
  const { 
    handleScoreChange,
    handleGameWinsChange,
    handleMarkCompleted,
    validationErrors 
  } = useMatchScores(matches, setMatches);

  // Modified to handle match date detection and filter updating
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchBrackets();
      const fetchedMatches = await fetchMatches(filters);
      
      // If we have matches but no filter date set, auto-set it to the first match date
      if (fetchedMatches.length > 0 && !filters.date) {
        const latestMatch = [...fetchedMatches].sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        })[0];
        if (latestMatch && latestMatch.date) {
          console.log("Auto-setting filter date to latest match date:", latestMatch.date);
          updateFiltersForMatchDate(new Date(latestMatch.date));
        }
      }
      
      setMatches(fetchedMatches);
      setLoading(false);
    };
    loadData();
  }, [filters.date, filters.bracketId]);

  const handleSubmitAll = async () => {
    console.log("Starting match submission process");

    // Filter for valid matches
    const validMatches = matches.filter(match => 
      match.isEdited && match.isValid && match.iscompleted
    );

    if (validMatches.length === 0) {
      toast({
        title: "No Changes",
        description: "There are no valid matches to submit.",
      });
      return;
    }

    console.log(`Found ${validMatches.length} valid matches to submit`);
    setSubmitting(true);

    try {
      let successCount = 0;

      for (const match of validMatches) {
        const success = await handleSubmitScore({
          matchId: match.id,
          team1Score: match.team1Score ?? 0,
          team2Score: match.team2Score ?? 0,
          team1GameWins: match.team1_game_wins ?? 0,
          team2GameWins: match.team2_game_wins ?? 0
        });

        if (success) successCount++;
      }

      // Show submission results
      if (successCount > 0) {
        toast({
          title: "✅ Matches Submitted",
          description: `${successCount} match(es) successfully submitted.`
        });

        // Invalidate queries to refresh data
        await invalidateMatchRelatedQueries(queryClient);

        // Refresh matches list
        await fetchMatches();
      } else {
        toast({
          title: "Error",
          description: "Failed to submit matches. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error submitting matches:", error);
      toast({
        title: "Error",
        description: `Failed to submit matches: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    matches,
    loading,
    submitting,
    failedMatches,
    errorMessages,
    brackets,
    filters,
    handleScoreChange,
    handleGameWinsChange,
    handleMarkCompleted,
    handleSubmitAll,
    clearErrors,
    setFilterDate,
    setBracketFilter,
    clearFilters,
    updateFiltersForMatchDate
  };
};
