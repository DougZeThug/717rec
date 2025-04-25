
import { useEffect } from "react";
import { useMatchesState } from "./state/useMatchesState";
import { useFiltersState } from "./state/useFiltersState";
import { useMatchSubmission } from "./submission/useMatchSubmission";
import { useMatchesFetching } from "./fetching/useMatchesFetching";

export const useScoreEntryData = () => {
  const {
    matches,
    setMatches,
    loading,
    setLoading,
    submitting,
    setSubmitting,
    handleScoreChange,
    handleMarkCompleted
  } = useMatchesState();

  const {
    filters,
    brackets,
    fetchBrackets,
    setFilterDate,
    setBracketFilter,
    clearFilters
  } = useFiltersState();

  const { fetchMatches } = useMatchesFetching();
  const { handleSubmitAll } = useMatchSubmission();

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

  const handleSubmit = async () => {
    const editedMatches = matches.filter(match => match.isEdited && match.isValid);
    setSubmitting(true);
    
    try {
      const success = await handleSubmitAll(editedMatches);
      if (success) {
        const updatedMatches = await fetchMatches(filters);
        setMatches(updatedMatches);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return {
    matches,
    loading,
    submitting,
    brackets,
    filters,
    handleScoreChange,
    handleMarkCompleted,
    handleSubmitAll: handleSubmit,
    setFilterDate,
    setBracketFilter,
    clearFilters
  };
};
