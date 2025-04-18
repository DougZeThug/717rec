
import { useState, useEffect } from "react";
import { MatchWithTeams } from "../types";
import { useMatchFilters } from "./useMatchFilters";
import { useMatchFetching } from "./useMatchFetching";
import { useMatchValidation } from "./useMatchValidation";
import { useScoreSubmission } from "./useScoreSubmission";
import { useMatchScores } from "./useMatchScores";

export const useScoreEntryData = () => {
  const {
    matches,
    setMatches,
    handleScoreChange,
    handleMarkCompleted
  } = useMatchScores();

  const { filters, brackets, fetchBrackets, setFilterDate, setBracketFilter, clearFilters } = useMatchFilters();
  const { loading, fetchMatches } = useMatchFetching();
  
  // Create a wrapper function that returns void as expected by useScoreSubmission
  const refreshMatches = async () => {
    const fetchedMatches = await fetchMatches(filters);
    setMatches(fetchedMatches);
  };
  
  const { submitting, failedMatches, errorMessages, handleSubmitAll, clearErrors } = useScoreSubmission(matches, refreshMatches);

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
