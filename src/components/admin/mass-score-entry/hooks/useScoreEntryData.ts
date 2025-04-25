
import { useState, useEffect } from "react";
import { useMatchesState } from "./state/useMatchesState";
import { useFiltersState } from "./state/useFiltersState";
import { useMatchSubmission } from "./submission/useMatchSubmission";
import { useMatchesFetching } from "./fetching/useMatchesFetching";
import { useMatchScores } from "./useMatchScores";
import { useErrorHandling } from "./error/useErrorHandling";
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
    clearFilters
  } = useFiltersState();

  const {
    failedMatches,
    errorMessages,
    clearErrors
  } = useErrorHandling();

  const { fetchMatches } = useMatchesFetching();
  const { handleSubmitAll } = useMatchSubmission();
  const { 
    handleScoreChange,
    handleGameWinsChange,
    handleMarkCompleted,
    validationErrors 
  } = useMatchScores();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchBrackets();
      const fetchedMatches = await fetchMatches(filters);
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
    clearErrors
  };
};
