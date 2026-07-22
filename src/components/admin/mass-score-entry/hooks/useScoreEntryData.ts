import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { useMatchSubmission } from '@/hooks/matches/useMatchSubmission';
import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';
import { useToast } from '@/hooks/useToast';
import { errorLog, filterLog, scoreLog } from '@/utils/logger';

import { getMatchDisplayName, isSubmittableMatch } from '../utils/submissionEligibility';
import { useErrorHandling } from './error/useErrorHandling';
import { useMatchesFetching } from './fetching/useMatchesFetching';
import { useFiltersState } from './state/useFiltersState';
import { useMatchesState } from './state/useMatchesState';
import { useMatchEventListeners } from './useMatchEventListeners';
import { useMatchScores } from './useMatchScores';

export const useScoreEntryData = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [lastBatchSummary, setLastBatchSummary] = useState<{
    saved: number;
    failed: number;
  } | null>(null);

  const {
    matches,
    setMatches,
    originalMatches: _originalMatches,
    setOriginalMatches,
    loading,
    setLoading,
    submitting,
    setSubmitting,
  } = useMatchesState();

  const { handleSubmitScore } = useMatchSubmission();

  const {
    filters,
    brackets,
    setFilterDate,
    setBracketFilter,
    clearFilters,
    updateFiltersForMatchDate,
  } = useFiltersState();

  const { failedMatches, errorMessages, clearErrors, addError } = useErrorHandling();

  const { fetchMatches } = useMatchesFetching();

  useMatchEventListeners({ updateFiltersForMatchDate });

  const { handleScoreChange, handleGameWinsChange, handleMarkCompleted } = useMatchScores(
    matches,
    setMatches
  );

  const removeMatch = (matchId: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
  };

  // Track whether this is the initial mount (auto-set date only on first load)
  const isInitialLoad = useRef(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const fetchedMatches = await fetchMatches(filters);

      // Only auto-set the date filter on initial mount (not after user clears filters)
      if (isInitialLoad.current && fetchedMatches.length > 0 && !filters.date) {
        isInitialLoad.current = false;
        const latestMatch = [...fetchedMatches].sort((a, b) => {
          return new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime();
        })[0];
        if (latestMatch?.date) {
          filterLog('Auto-setting filter date to latest match date', latestMatch.date);
          updateFiltersForMatchDate(new Date(latestMatch.date));
        }
      } else {
        isInitialLoad.current = false;
      }

      setMatches(fetchedMatches);
      setLoading(false);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial mount fetch + filter sync; deps would cause refetch loop
  }, [filters.date, filters.bracketId]);

  const handleSubmitAll = async (matchIds?: string[]) => {
    scoreLog('Starting match submission process');

    const retryIds = Array.isArray(matchIds) ? new Set(matchIds) : null;
    const validMatches = matches.filter(
      (match) => isSubmittableMatch(match) && (!retryIds || retryIds.has(match.id))
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

    // Track per-match outcome so the finally block can do a smart merge.
    type SubmissionOutcome = { matchId: string; succeeded: boolean; message?: string };
    const submissionOutcomes: SubmissionOutcome[] = [];

    try {
      // Submit strictly one-at-a-time. Each RPC rewrites team season stats in a
      // transaction, so parallel submissions can fight over row locks and create
      // avoidable deadlocks when a large batch touches the same teams.
      for (const match of validMatches) {
        try {
          const submitParams = {
            matchId: match.id,
            team1Score: match.team1Score ?? 0,
            team2Score: match.team2Score ?? 0,
            team1GameWins: match.team1_game_wins ?? 0,
            team2GameWins: match.team2_game_wins ?? 0,
          };
          const success = await handleSubmitScore(submitParams, {
            suppressToast: true,
            suppressInvalidation: true,
          });

          if (success) {
            clearErrors(match.id);
            submissionOutcomes.push({ matchId: match.id, succeeded: true });
          } else {
            const message = `Couldn't save ${getMatchDisplayName(match)} — try again.`;
            addError(match.id, message);
            submissionOutcomes.push({ matchId: match.id, succeeded: false, message });
          }
        } catch (err) {
          errorLog(`Error submitting match ${match.id}:`, err);
          const rawMessage = err instanceof Error ? err.message : 'Unknown error';
          const message = `Couldn't save ${getMatchDisplayName(match)} — try again. ${rawMessage}`;
          addError(match.id, message);
          submissionOutcomes.push({ matchId: match.id, succeeded: false, message });
        }
      }

      // Determine which submissions succeeded/failed
      const failedIds = submissionOutcomes.filter((r) => !r.succeeded).map((r) => r.matchId);
      const succeededIds = submissionOutcomes.filter((r) => r.succeeded).map((r) => r.matchId);

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

      setLastBatchSummary({ saved: succeededIds.length, failed: failedIds.length });
      toast({
        title: failedIds.length > 0 && succeededIds.length === 0 ? 'Error' : '✅ Matches Submitted',
        description:
          failedIds.length > 0
            ? `${succeededIds.length} match(es) successfully submitted. ${failedIds.length} failed. (${succeededIds.length} saved, ${failedIds.length} failed.)`
            : `${succeededIds.length} match(es) successfully submitted. (${succeededIds.length} saved, ${failedIds.length} failed.)`,
        variant: failedIds.length > 0 ? 'destructive' : undefined,
      });
    } finally {
      // Invalidate cache so React Query re-fetches fresh data in the background.
      await invalidateMatchRelatedQueries(queryClient);
      const fetchedMatches = await fetchMatches(filters);

      // Only merge fetched data if the fetch returned results — an empty array
      // most likely signals a network error (fetchMatches returns [] on failure),
      // and we must not blank the entire list in that case.
      if (fetchedMatches.length > 0) {
        const fetchedById = new Map(fetchedMatches.map((m) => [m.id, m]));

        // Update originalMatches with fresh server state.
        setOriginalMatches((prev) => {
          const updated = new Map(prev);
          fetchedMatches.forEach((m) => {
            updated.set(m.id, { ...m });
          });
          return updated;
        });

        // Merge fresh server data with local UI state:
        //   • Succeeded matches → replace with server data (scores are now official).
        //   • Failed matches → keep local edits and error flags so the admin can retry.
        setMatches((prev) =>
          prev.map((m) => {
            const outcome = submissionOutcomes.find((r) => r.matchId === m.id);
            if (outcome?.succeeded) {
              return fetchedById.get(m.id) ?? m;
            }
            // Preserve local edit state for failed/unsubmitted matches
            return m;
          })
        );
      }

      setSubmitting(false);
    }
  };

  return {
    matches,
    submittableMatchesCount: matches.filter(isSubmittableMatch).length,
    loading,
    submitting,
    lastBatchSummary,
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
    removeMatch,
  };
};
