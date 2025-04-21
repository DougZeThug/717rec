
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
import { useScoreSubmission } from "./useScoreSubmission";

export const useScoreEntryData = () => {
  const {
    matches,
    setMatches,
    handleScoreChange,
    handleGameWinsChange,
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
  
  // Fixed: Now correctly passing the same function signature for fetchMatches
  const { handleSubmitAll } = useScoreSubmission(matches, () => fetchMatches(filters));

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
    handleGameWinsChange,
    handleMarkCompleted,
    handleSubmitAll,
    clearErrors,
    setFilterDate,
    setBracketFilter,
    clearFilters
  };
};
