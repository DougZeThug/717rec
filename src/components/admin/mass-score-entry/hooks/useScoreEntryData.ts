
import { useEffect } from "react";
import { useMatchScores } from "./useMatchScores";
import { useMatchFilters } from "./useMatchFilters";
import { useMatchSubmission } from "./useMatchSubmission";
import { useMatchFetching } from "./useMatchFetching";
import { useSubmissionState } from "./useSubmissionState";

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
  
  const { 
    submitting, 
    failedMatches,
    errorMessages,
    clearErrors,
    setSubmitting,
    addError
  } = useSubmissionState();
  
  const { handleSubmitMatches } = useMatchSubmission();

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
    const editedMatches = matches.filter(match => match.isEdited && match.isValid);
    
    // Reset any previous errors
    clearErrors();
    
    // Process the edited matches
    setSubmitting(true);
    
    try {
      await handleSubmitMatches(editedMatches);
      // Refresh matches after submission
      const updatedMatches = await fetchMatches(filters);
      if (Array.isArray(updatedMatches)) {
        setMatches(updatedMatches);
      }
    } catch (error: any) {
      console.error("Error in handleSubmitAll:", error);
      // If there was a general error, add it to the first match
      if (editedMatches.length > 0) {
        addError(editedMatches[0].id, error.message || "Unknown error occurred");
      }
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
    clearFilters
  };
};
