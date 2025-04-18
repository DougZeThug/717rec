
import { useState, useEffect } from "react";
import { MatchWithTeams, FilterState } from "../types";
import { useMatchFilters } from "./useMatchFilters";
import { useMatchFetching } from "./useMatchFetching";
import { useMatchValidation } from "./useMatchValidation";
import { useScoreSubmission } from "./useScoreSubmission";

export const useScoreEntryData = () => {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const { filters, brackets, fetchBrackets, setFilterDate, setBracketFilter, clearFilters } = useMatchFilters();
  const { loading, fetchMatches } = useMatchFetching();
  const { handleScoreChange: validateScoreChange, handleMarkCompleted: validateMarkCompleted } = useMatchValidation();
  const { submitting, failedMatches, errorMessages, handleSubmitAll, clearErrors } = useScoreSubmission(matches, () => fetchMatches(filters));

  useEffect(() => {
    const loadData = async () => {
      await fetchBrackets();
      const fetchedMatches = await fetchMatches(filters);
      setMatches(fetchedMatches);
    };
    loadData();
  }, [filters.date, filters.bracketId]);

  const handleScoreChange = (index: number, team: 'team1' | 'team2', value: string) => {
    const updatedMatches = validateScoreChange(matches, index, team, value);
    setMatches(updatedMatches);
  };

  const handleMarkCompleted = (index: number, checked: boolean) => {
    const updatedMatches = validateMarkCompleted(matches, index, checked);
    setMatches(updatedMatches);
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
    handleMarkCompleted,
    handleSubmitAll,
    clearErrors,
    setFilterDate,
    setBracketFilter,
    clearFilters
  };
};
