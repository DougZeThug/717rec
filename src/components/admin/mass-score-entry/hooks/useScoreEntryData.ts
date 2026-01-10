import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useMatchSubmission } from '@/hooks/matches/useMatchSubmission';
import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';
import { useToast } from '@/hooks/use-toast';
import { errorLog, filterLog, scoreLog } from '@/utils/logger';

import { MatchWithTeams } from '../types';
import { useErrorHandling } from './error/useErrorHandling';
import { useMatchesFetching } from './fetching/useMatchesFetching';
import { useFiltersState } from './state/useFiltersState';
import { useMatchesState } from './state/useMatchesState';
import { useMatchEventListeners } from './useMatchEventListeners';
import { useMatchScores } from './useMatchScores';

export const useScoreEntryData = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { matches, setMatches, loading, setLoading, submitting, setSubmitting } = useMatchesState();

  const { handleSubmitScore } = useMatchSubmission();

  const {
    filters,
    brackets,
    fetchBrackets,
    setFilterDate,
    setBracketFilter,
    clearFilters,
    updateFiltersForMatchDate,
  } = useFiltersState();

  const { failedMatches, errorMessages, clearErrors } = useErrorHandling();

  const { fetchMatches } = useMatchesFetching();

  useMatchEventListeners({ updateFiltersForMatchDate });

  const { handleScoreChange, handleGameWinsChange, handleMarkCompleted, validationErrors } =
    useMatchScores(matches, setMatches);

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
          filterLog('Auto-setting filter date to latest match date', latestMatch.date);
          updateFiltersForMatchDate(new Date(latestMatch.date));
        }
      }

      setMatches(fetchedMatches);
      setLoading(false);
    };
    loadData();
  }, [filters.date, filters.bracketId]);

  const handleSubmitAll = async () => {
    scoreLog('Starting match submission process');

    const validMatches = matches.filter(
      (match) => match.isEdited && match.isValid && match.iscompleted
    );

    if (validMatches.length === 0) {
      toast({
        title: 'No Changes',
        description: 'There are no valid matches to submit.',
      });
      return;
    }

    scoreLog(`Found ${validMatches.length} valid matches to submit`);
    setSubmitting(true);

    // Optimistic update: mark matches as submitting
    const validMatchIds = validMatches.map((m) => m.id);
    setMatches((prev) =>
      prev.map((m) =>
        validMatchIds.includes(m.id) ? { ...m, isSubmitting: true, submitError: false } : m
      )
    );

    try {
      // Submit all matches in parallel and track results
      const results = await Promise.allSettled(
        validMatches.map((match) =>
          handleSubmitScore({
            matchId: match.id,
            team1Score: match.team1Score ?? 0,
            team2Score: match.team2Score ?? 0,
            team1GameWins: match.team1_game_wins ?? 0,
            team2GameWins: match.team2_game_wins ?? 0,
          })
        )
      );

      // Determine which submissions succeeded/failed
      const failedIds: string[] = [];
      const succeededIds: string[] = [];

      results.forEach((result, index) => {
        const matchId = validMatches[index].id;
        if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value)) {
          failedIds.push(matchId);
        } else {
          succeededIds.push(matchId);
        }
      });

      // Update UI state based on results
      setMatches((prev) =>
        prev.map((m) => {
          if (succeededIds.includes(m.id)) {
            return { ...m, isSubmitting: false, isEdited: false, submitError: false };
          }
          if (failedIds.includes(m.id)) {
            return { ...m, isSubmitting: false, isEdited: true, submitError: true };
          }
          return m;
        })
      );

      if (succeededIds.length > 0) {
        toast({
          title: '✅ Matches Submitted',
          description: `${succeededIds.length} match(es) successfully submitted.${failedIds.length > 0 ? ` ${failedIds.length} failed.` : ''}`,
        });

        await invalidateMatchRelatedQueries(queryClient);
        const fetchedMatches = await fetchMatches(filters);
        setMatches(fetchedMatches);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to submit matches. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errorLog('Error submitting matches:', error);

      // Rollback all on catastrophic error
      setMatches((prev) =>
        prev.map((m) =>
          validMatchIds.includes(m.id)
            ? { ...m, isSubmitting: false, isEdited: true, submitError: true }
            : m
        )
      );

      toast({
        title: 'Error',
        description: `Failed to submit matches: ${errorMessage}`,
        variant: 'destructive',
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
    updateFiltersForMatchDate,
  };
};
