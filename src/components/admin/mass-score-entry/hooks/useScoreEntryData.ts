
import { useEffect } from "react";
import { useMatchScores } from "./useMatchScores";
import { useMatchFilters } from "./useMatchFilters";
import { useMatchSubmission } from "./useMatchSubmission";
import { useMatchFetching } from "./useMatchFetching";

export const useScoreEntryData = () => {
  const {
    matches,
    setMatches,
    handleScoreChange,
    handleGameWinsChange,
    handleMarkCompleted
  } = useMatchScores();

  const { 
    filters,
    brackets,
    fetchBrackets,
    setFilterDate,
    setBracketFilter,
    clearFilters
  } = useMatchFilters();

  const { loading, fetchMatches } = useMatchFetching();
  const { submitting, handleSubmitMatches } = useMatchSubmission();

  useEffect(() => {
    const loadData = async () => {
      await fetchBrackets();
      const fetchedMatches = await fetchMatches(filters);
      if (Array.isArray(fetchedMatches)) {
        setMatches(fetchedMatches);
      }
    };
    loadData();
  }, [filters.date, filters.bracketId]);

  const handleSubmitAll = async () => {
    const editedMatches = matches.filter(match => match.isEdited);
    await handleSubmitMatches(editedMatches);
    // Refresh matches after submission
    const updatedMatches = await fetchMatches(filters);
    if (Array.isArray(updatedMatches)) {
      setMatches(updatedMatches);
    }
  };

  return {
    matches,
    loading,
    submitting,
    brackets,
    filters,
    handleScoreChange,
    handleGameWinsChange,
    handleMarkCompleted,
    handleSubmitAll,
    setFilterDate,
    setBracketFilter,
    clearFilters
  };
};
