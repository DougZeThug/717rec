
import { useState, useEffect } from "react";
import { useMatchesState } from "./state/useMatchesState";
import { useFiltersState } from "./state/useFiltersState";
import { useMatchSubmission } from "./submission/useMatchSubmission";
import { useMatchesFetching } from "./fetching/useMatchesFetching";
import { useMatchScores } from "./useMatchScores";
import { useErrorHandling } from "./error/useErrorHandling";
import { useMatchEventListeners } from "./useMatchEventListeners";
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
  const { handleSubmitAll } = useMatchSubmission();
  
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

  return {
    matches,
    loading,
    submitting,
    brackets,
    filters,
    failedMatches,
    errorMessages,
    handleScoreChange,
    handleGameWinsChange,
    handleMarkCompleted,
    handleSubmitAll,
    setFilterDate,
    setBracketFilter,
    clearFilters,
    clearErrors,
    updateFiltersForMatchDate
  };
};
