
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useMatchesState } from "./state/useMatchesState";
import { useFiltersState } from "./state/useFiltersState";
import { useMatchSubmission } from "./submission/useMatchSubmission";
import { useMatchesFetching } from "./fetching/useMatchesFetching";
import { useMatchScores } from "./useMatchScores";
import { useErrorHandling } from "./error/useErrorHandling";
import { useMatchEventListeners } from "./useMatchEventListeners";
import { invalidateMatchRelatedQueries } from "@/hooks/matches/utils/queryCacheUtils";
import { MatchWithTeams } from "../types";

export const useScoreEntryData = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    matches,
    setMatches,
    loading,
    setLoading,
    submitting,
    setSubmitting,
  } = useMatchesState();

  const { handleSubmitScore } = useMatchSubmission();

  const {
    filters,
    brackets,
    fetchBrackets,
    setFilterDate,
    setBracketFilter,
    clearFilters,
    updateFiltersForMatchDate
  } = useFiltersState();

  const {
    failedMatches,
    errorMessages,
    clearErrors
  } = useErrorHandling();

  const { fetchMatches } = useMatchesFetching();
  
  useMatchEventListeners({ updateFiltersForMatchDate });
  
  const { 
    handleScoreChange,
    handleGameWinsChange,
    handleMarkCompleted,
    validationErrors 
  } = useMatchScores(matches, setMatches);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchBrackets();
      const fetchedMatches = await fetchMatches(filters);
      
      if (fetchedMatches.length > 0 && !filters.date) {
        const latestMatch = [...fetchedMatches].sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        })[0];
        if (latestMatch && latestMatch.date) {
          console.log("Auto-setting filter date to latest match date:", latestMatch.date);
          updateFiltersForMatchDate(new Date(latestMatch.date));
        }
      }
      
      setMatches(fetchedMatches);
      setLoading(false);
    };
    loadData();
  }, [filters.date, filters.bracketId]);

  const handleSubmitAll = async () => {
    console.log("🚀 Starting match submission process");
    clearErrors(); // Clear any existing errors

    // Enhanced validation with detailed logging
    const validMatches = matches.filter(match => {
      const isEdited = match.isEdited;
      const isValid = match.isValid;
      const isCompleted = match.iscompleted;
      
      console.log(`📊 Match ${match.id} validation:`, {
        isEdited,
        isValid,
        isCompleted,
        team1Score: match.team1Score,
        team2Score: match.team2Score,
        team1GameWins: match.team1_game_wins,
        team2GameWins: match.team2_game_wins,
        team1Name: match.team1?.name,
        team2Name: match.team2?.name
      });

      return isEdited && isValid && isCompleted;
    });

    console.log(`✅ Found ${validMatches.length} valid matches out of ${matches.length} total`);

    if (validMatches.length === 0) {
      console.log("❌ No valid matches to submit");
      toast({
        title: "No Changes",
        description: "Please edit and complete at least one match before submitting.",
      });
      return;
    }

    setSubmitting(true);

    try {
      let successCount = 0;
      let failureCount = 0;

      for (const match of validMatches) {
        console.log(`🎯 Processing match: ${match.team1?.name} vs ${match.team2?.name}`);
        
        try {
          const success = await handleSubmitScore({
            matchId: match.id,
            team1Score: match.team1Score ?? 0,
            team2Score: match.team2Score ?? 0,
            team1GameWins: match.team1_game_wins ?? 0,
            team2GameWins: match.team2_game_wins ?? 0
          });

          if (success) {
            successCount++;
            console.log(`✅ Successfully submitted match ${match.id}`);
          } else {
            failureCount++;
            console.log(`❌ Failed to submit match ${match.id}`);
          }
        } catch (error: any) {
          failureCount++;
          console.error(`💥 Error submitting match ${match.id}:`, error);
        }
      }

      if (successCount > 0) {
        toast({
          title: "✅ Matches Submitted",
          description: `${successCount} match(es) successfully submitted${failureCount > 0 ? `. ${failureCount} failed.` : '.'}`,
        });

        await invalidateMatchRelatedQueries(queryClient);
        const refreshedMatches = await fetchMatches(filters);
        setMatches(refreshedMatches);
      } else {
        toast({
          title: "Error",
          description: "Failed to submit any matches. Please check the console for details.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("💥 Error in batch update:", error);
      toast({
        title: "Error",
        description: `Failed to submit matches: ${error.message}`,
        variant: "destructive"
      });
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
    clearFilters,
    updateFiltersForMatchDate
  };
};
