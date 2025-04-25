import { useEffect, useState } from "react";
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
    
    // Normalize game wins to numbers
    const t1Wins = Number(team1GameWins);
    const t2Wins = Number(team2GameWins);
    
    match.team1_game_wins = t1Wins;
    match.team2_game_wins = t2Wins;
    
    console.log(`useScoreEntryData handleGameWinsChange for match ${match.id}:`, {
      team1GameWins: t1Wins,
      team2GameWins: t2Wins
    });
    
    // Set binary match score based on game wins
    if (t1Wins > t2Wins) {
      match.team1Score = 1;
      match.team2Score = 0;
    } else if (t1Wins < t2Wins) {
      match.team1Score = 0;
      match.team2Score = 1;
    } else {
      console.warn("Game wins cannot be tied:", t1Wins, t2Wins);
      // Don't update scores if tied
      return;
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

  const submitScores = async () => {
    const editedMatches = matches.filter(match => match.isEdited && match.isValid);
    setSubmitting(true);
    clearErrors();
    
    try {
      const success = await handleSubmitAll(editedMatches);
      if (success) {
        const updatedMatches = await fetchMatches(filters);
        setMatches(updatedMatches);
      }
    } catch (error) {
      console.error("Error submitting scores:", error);
      // Add to failed matches list if there was an error
      setFailedMatches(prevFailed => [
        ...prevFailed,
        ...editedMatches.map(m => m.id)
      ]);
      // Set a generic error message for all failed matches
      const errorMsg = "Failed to submit scores";
      const newErrorMessages: Record<string, string> = {};
      editedMatches.forEach(m => {
        newErrorMessages[m.id] = errorMsg;
      });
      setErrorMessages(prev => ({...prev, ...newErrorMessages}));
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
    failedMatches,
    errorMessages,
    handleScoreChange,
    handleIndividualTeamScoreChange,
    handleGameWinsChange,
    handleMarkCompleted,
    handleSubmitAll: submitScores,
    setFilterDate,
    setBracketFilter,
    clearFilters,
    clearErrors
  };
};
