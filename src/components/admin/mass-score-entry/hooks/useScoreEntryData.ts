
import { useState, useEffect } from "react";
import { useMatchesState } from "./state/useMatchesState";
import { useFiltersState } from "./state/useFiltersState";
import { useMatchSubmission } from "./submission/useMatchSubmission";
import { useMatchesFetching } from "./fetching/useMatchesFetching";
import { MatchWithTeams } from "../types";

export const useScoreEntryData = () => {
  const {
    matches,
    setMatches,
    loading,
    setLoading,
    submitting,
    setSubmitting,
    handleScoreChange: handleIndividualTeamScoreChange,
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

  // Error handling state
  const [failedMatches, setFailedMatches] = useState<string[]>([]);
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});

  const { fetchMatches } = useMatchesFetching();
  const { handleSubmitAll } = useMatchSubmission();

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

  // Direct score change handler (new)
  const handleScoreChange = (index: number, team1Score: number, team2Score: number) => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    match.team1Score = Number(team1Score);
    match.team2Score = Number(team2Score);
    match.isEdited = true;
    match.isValid = true;
    
    setMatches(newMatches);
  };

  // Handle game wins changes and derive binary match scores
  const handleGameWinsChange = (index: number, team1GameWins: number, team2GameWins: number) => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    match.team1_game_wins = Number(team1GameWins);
    match.team2_game_wins = Number(team2GameWins);
    
    if (team1GameWins > team2GameWins) {
      match.team1Score = 1;
      match.team2Score = 0;
    } else if (team2GameWins > team1GameWins) {
      match.team1Score = 0;
      match.team2Score = 1;
    }
    
    match.isEdited = true;
    match.isValid = true;
    
    setMatches(newMatches);
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
    handleIndividualTeamScoreChange,
    handleGameWinsChange,
    handleMarkCompleted,
    handleSubmitAll,
    setFilterDate,
    setBracketFilter,
    clearFilters,
    clearErrors
  };
};
