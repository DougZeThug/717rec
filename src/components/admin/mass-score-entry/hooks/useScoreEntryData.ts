import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { useMatchSubmission } from '@/hooks/matches/useMatchSubmission';
import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';
import { useToast } from '@/hooks/useToast';
import { errorLog, filterLog, scoreLog } from '@/utils/logger';

import { MatchWithTeams } from '../types';
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
    submitting,
    setSubmitting,
  } = useMatchesState();

  const { handleSubmitScore } = useMatchSubmission();

  const {
    filters,
    brackets,
    bracketsError,
    bracketsLoading,
    refetchBrackets,
    setFilterDate,
    setBracketFilter,
    clearFilters,
    updateFiltersForMatchDate,
  } = useFiltersState();

  const { failedMatches, errorMessages, clearErrors, addError } = useErrorHandling();

  const { fetchMatches, fetchMatchesOrThrow } = useMatchesFetching();

  useMatchEventListeners({ updateFiltersForMatchDate });

  const { handleScoreChange, handleGameWinsChange, handleMarkCompleted } = useMatchScores(
    matches,
    setMatches
  );

  // Date objects aren't stable query-key material — serialize them.
  const filterDateKey = filters.date ? filters.date.toISOString() : null;
  const bracketKey = filters.bracketId ?? null;
  const matchesQueryKey = ['mass-score-matches', filterDateKey, bracketKey];

  const matchesQuery = useQuery({
    queryKey: matchesQueryKey,
    queryFn: () => fetchMatchesOrThrow(filters),
    // The table holds unsaved local edits; background refetches would clobber
    // them. Refetch only on filter change, explicit refetch(), or invalidation.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const removeMatch = (matchId: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
    // Keep the query cache in step so the removed row can't reappear when the
    // sync effect below re-runs; the merge there preserves other rows' edits.
    queryClient.setQueryData<MatchWithTeams[]>(matchesQueryKey, (old) =>
      old?.filter((m) => m.id !== matchId)
    );
  };

  // Track whether this is the initial mount (auto-set date only on first load)
  const isInitialLoad = useRef(true);

  // Sync fetched server data into the editable local state. TanStack Query only
  // exposes data for the *current* filter key (raced or stale responses are
  // discarded by the library), and structural sharing keeps `data` referentially
  // stable when a refetch returns identical rows, so this runs on real changes only.
  useEffect(() => {
    const fetchedMatches = matchesQuery.data;
    if (!fetchedMatches) return;

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

    // Merge instead of replace: rows with unsaved edits keep their local state
    // so a background refresh can't wipe an admin's in-progress score entry.
    setMatches((prev) => {
      const prevById = new Map(prev.map((m) => [m.id, m]));
      return fetchedMatches.map((fetched) => {
        const local = prevById.get(fetched.id);
        return local?.isEdited ? local : fetched;
      });
    });
    // Originals always snapshot pure server state (used for stats reversal).
    setOriginalMatches(new Map(fetchedMatches.map((m) => [m.id, { ...m }])));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync runs only when the query result changes
  }, [matchesQuery.data]);

  const handleSubmitAll = async (matchIds?: string[]) => {
    scoreLog('Starting match submission process');

    if (submitting) {
      return;
    }

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
    const validMatchIds = new Set(validMatches.map((m) => m.id));
    setMatches((prev) =>
      prev.map((m) =>
        validMatchIds.has(m.id) ? { ...m, isSubmitting: true, submitError: false } : m
      )
    );

    // Track per-match outcome so the finally block can do a smart merge.
    type SubmissionOutcome = { matchId: string; succeeded: boolean; message?: string };
    const submissionOutcomes: SubmissionOutcome[] = [];

    try {
      const submitMatch = async (match: (typeof validMatches)[number]) => {
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
      };

      // Submit strictly one-at-a-time. Each RPC rewrites team season stats in a
      // transaction, so parallel submissions can fight over row locks and create
      // avoidable deadlocks when a large batch touches the same teams. This
      // promise chain is intentionally serial without using await inside a loop.
      await validMatches.reduce(
        (previousSubmission, match) => previousSubmission.then(() => submitMatch(match)),
        Promise.resolve()
      );

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

        // Keep the query cache in step with the fresh server state so a later
        // cache sync can't resurrect pre-submission scores.
        queryClient.setQueryData<MatchWithTeams[]>(matchesQueryKey, fetchedMatches);
      }

      setSubmitting(false);
    }
  };

  return {
    matches,
    submittableMatchesCount: matches.filter(isSubmittableMatch).length,
    loading: matchesQuery.isLoading,
    loadError: matchesQuery.error ?? null,
    refetchMatches: matchesQuery.refetch,
    submitting,
    lastBatchSummary,
    failedMatches,
    errorMessages,
    brackets,
    bracketsError,
    bracketsLoading,
    refetchBrackets,
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
