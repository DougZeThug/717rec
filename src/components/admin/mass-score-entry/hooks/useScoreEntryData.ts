
import { useState, useEffect } from "react";
import { useMatchesState } from "./state/useMatchesState";
import { useFiltersState } from "./state/useFiltersState";
import { useMatchSubmission } from "./submission/useMatchSubmission";
import { useMatchesFetching } from "./fetching/useMatchesFetching";
import { useMatchScores } from "./useMatchScores";
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

  // Error handling state
  const [failedMatches, setFailedMatches] = useState<string[]>([]);
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});

  const { fetchMatches } = useMatchesFetching();
  const { handleSubmitAll } = useMatchSubmission();
  const { 
    handleScoreChange,
    handleGameWinsChange,
    handleMarkCompleted,
    validationErrors 
  } = useMatchScores();

  // Clear error messages
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
