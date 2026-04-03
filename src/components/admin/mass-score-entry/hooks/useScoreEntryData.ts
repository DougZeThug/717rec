import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { reverseTeamStats } from '@/hooks/matches/updates/utils/statReversalUtils';
import { useMatchSubmission } from '@/hooks/matches/useMatchSubmission';
import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';
import { useToast } from '@/hooks/useToast';
import { errorLog, filterLog, scoreLog } from '@/utils/logger';

import { useErrorHandling } from './error/useErrorHandling';
import { useMatchesFetching } from './fetching/useMatchesFetching';
import { useFiltersState } from './state/useFiltersState';
import { useMatchesState } from './state/useMatchesState';
import { useMatchEventListeners } from './useMatchEventListeners';
import { useMatchScores } from './useMatchScores';

export const useScoreEntryData = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    matches,
    setMatches,
    originalMatches,
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

  const { failedMatches, errorMessages, clearErrors } = useErrorHandling();

  const { fetchMatches } = useMatchesFetching();

  useMatchEventListeners({ updateFiltersForMatchDate });

  const { handleScoreChange, handleGameWinsChange, handleMarkCompleted } = useMatchScores(
    matches,
    setMatches
  );

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
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        })[0];
        if (latestMatch && latestMatch.date) {
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

    // Track per-match outcome so the finally block can do a smart merge.
    // Each inner lambda catches its own errors, so Promise.all never rejects.
    type SubmissionOutcome = { matchId: string; succeeded: boolean; reversalApplied: boolean };
    let submissionOutcomes: SubmissionOutcome[] = [];

    try {
      // Per-match reversal + submission (paired to prevent double-decrement).
      // Each lambda returns an outcome object instead of throwing, so we always
      // know whether the reversal ran before a submission failure.
      submissionOutcomes = await Promise.all(
        validMatches.map(async (match): Promise<SubmissionOutcome> => {
          let reversalApplied = false;
          try {
            const original = originalMatches.get(match.id);

            // Reverse old stats for this specific match before submitting new scores
            if (original?.iscompleted && original.winnerId && original.loserId) {
              const oldWinnerGameWins =
                original.winnerId === original.team1Id
                  ? original.team1_game_wins || 0
                  : original.team2_game_wins || 0;
              const oldLoserGameWins =
                original.loserId === original.team1Id
                  ? original.team1_game_wins || 0
                  : original.team2_game_wins || 0;

              scoreLog(`Reversing old stats for match ${match.id}`, {
                oldWinner: original.winnerId,
                oldLoser: original.loserId,
                oldWinnerGameWins,
                oldLoserGameWins,
              });

              await reverseTeamStats(
                original.winnerId,
                original.loserId,
                oldWinnerGameWins,
                oldLoserGameWins
              );
              reversalApplied = true;
            }

            // Immediately submit new scores for this match
            const success = await handleSubmitScore({
              matchId: match.id,
              team1Score: match.team1Score ?? 0,
              team2Score: match.team2Score ?? 0,
              team1GameWins: match.team1_game_wins ?? 0,
              team2GameWins: match.team2_game_wins ?? 0,
            });

            return { matchId: match.id, succeeded: !!success, reversalApplied };
          } catch (err) {
            errorLog(`Error submitting match ${match.id}:`, err);
            return { matchId: match.id, succeeded: false, reversalApplied };
          }
        })
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

      if (succeededIds.length > 0) {
        toast({
          title: '✅ Matches Submitted',
          description: `${succeededIds.length} match(es) successfully submitted.${failedIds.length > 0 ? ` ${failedIds.length} failed.` : ''}`,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to submit matches. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      // Invalidate cache so React Query re-fetches fresh data in the background.
      await invalidateMatchRelatedQueries(queryClient);
      const fetchedMatches = await fetchMatches(filters);

      // Only merge if the fetch returned data — an empty array most likely signals
      // a network error (fetchMatches returns [] on failure), and we must not blank
      // the entire list in that case.
      if (fetchedMatches.length > 0) {
        const fetchedById = new Map(fetchedMatches.map((m) => [m.id, m]));

        // Matches where the reversal ran but the score write failed.
        // Their DB stats are already decremented; a retry must NOT reverse again.
        const reversalAppliedButFailed = new Set(
          submissionOutcomes.filter((r) => !r.succeeded && r.reversalApplied).map((r) => r.matchId)
        );

        // Update originalMatches snapshot selectively:
        //   • Succeeded → use fresh server state (correct baseline for future edits).
        //   • Reversal-applied-but-failed → use fresh server state but clear the
        //     winner/loser fields so the next retry skips re-reversal.
        //   • All other matches → use fresh server state as-is.
        setOriginalMatches((prev) => {
          const updated = new Map(prev);
          fetchedMatches.forEach((m) => {
            if (reversalAppliedButFailed.has(m.id)) {
              updated.set(m.id, { ...m, winnerId: null, loserId: null, iscompleted: false });
            } else {
              updated.set(m.id, { ...m });
            }
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
