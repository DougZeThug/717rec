import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { BRACKET_FORMATS, BRACKET_STATES } from '@/constants/brackets';
import type { SimpleBracketData } from '@/hooks/brackets/useBracketData';
import { useBracketData } from '@/hooks/brackets/useBracketData';
import { usePlayoffTeams } from '@/hooks/playoffs/usePlayoffTeams';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useDivisions } from '@/hooks/useDivisions';
import { usePlayoffData } from '@/hooks/usePlayoffViewModel.compat';
import { useActiveSeason, usePlayoffActiveSeason } from '@/hooks/useSeasons';
import { deleteBracket as deleteBracketService } from '@/services/brackets/BracketWriteService';
import { convertErrorToString, getUIErrorMessage, logError } from '@/utils/errorHandler';
import { bracketLog, cacheLog, errorLog, playoffLog } from '@/utils/logger';
import { BracketFormat, BracketState, PlayoffBracket, Team } from '@/utils/playoffs/playoffTypes';

type Division = ReturnType<typeof useDivisions>['divisions'][number];
type TeamsByDivision = Record<string, Team[]>;

export interface PlayoffPageData {
  profile: null;
  isAdmin: boolean;
  selectedBracketId: string | null;
  setSelectedBracketId: (id: string | null) => void;
  ready: boolean;
  error: string | null;
  divisionsError: string | null;
  bracketsError: string | null;
  /** Non-null when the selected bracket failed to load; `ready` stays false. */
  selectedBracketError: string | null;
  retrySelectedBracket: () => void;
  divisions: Division[];
  divisionsLoading: boolean;
  availableDivisions: string[];
  allBrackets: PlayoffBracket[];
  bracketsLoading: boolean;
  teamsByDivision: TeamsByDivision;
  bracketsByDivision: Record<string, PlayoffBracket[]>;
  typesafeBracketsByDivision: Record<string, PlayoffBracket[]>;
  allBracketsData: PlayoffBracket[];
  handleBracketCreated: () => void;
  handleTeamDivisionChange: (teamId: string, divisionName: string) => Promise<void>;
  refetchBrackets: () => Promise<void>;
  bracket: SimpleBracketData | null | undefined;
  teams: Team[];
  teamsLoading: boolean;
  deleteBracket: (bracketId: string, bracketName: string) => Promise<void>;
  isLoading: boolean;
  selectedSeasonId: string | null;
  setSelectedSeasonId: (id: string) => void;
}

export function usePlayoffPageData(): PlayoffPageData {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBracketId, setSelectedBracketIdState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { isAdminAccessGranted: isAdmin, isLoading: adminLoading } = useAdminAccess();

  // Season selection - prefer the season whose playoffs are still in progress
  // (partially-archived season), fall back to the regular active season.
  const { data: playoffSeason } = usePlayoffActiveSeason();
  const { data: activeSeason } = useActiveSeason();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  /**
   * Where the season on screen came from. A season the reader asked for
   * (`chosen`) or one read off the bracket in the link (`bracket`) is settled.
   * A `fallback` is only standing in until the bracket says which season it
   * belongs to, so it must never behave like a decision.
   */
  const [seasonSource, setSeasonSource] = useState<'chosen' | 'bracket' | 'fallback' | null>(null);

  // Season selection is resolved below, once the selected bracket is known.

  // Sync bracket selection from URL params
  const bracketParam = searchParams.get('bracket') || null;
  const seasonParam = searchParams.get('season') || null;
  useEffect(() => {
    if (bracketParam !== selectedBracketId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state from incoming props/derived values
      setSelectedBracketIdState(bracketParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracketParam]);

  /**
   * The address is the source of truth for the season once it names one. Back
   * and Forward change the params without remounting this page, so a resolver
   * that only ran while the season was unset would keep the season the reader
   * had just navigated away from — and the mirror below would then write it
   * straight back over the restored URL.
   */
  useEffect(() => {
    if (seasonParam && seasonParam !== selectedSeasonId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state from incoming props/derived values
      setSelectedSeasonId(seasonParam);
      setSeasonSource('chosen');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonParam]);

  const setSelectedBracketId = useCallback(
    (id: string | null) => {
      bracketLog('setSelectedBracketId called:', { newId: id, currentId: selectedBracketId });

      setSelectedBracketIdState(id);

      if (id) {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('bracket', id);
        setSearchParams(newSearchParams);

        queryClient.prefetchQuery({
          queryKey: ['bracket-data', id],
          staleTime: 1000 * 60 * 2,
        });

        bracketLog('Updated URL and preloaded data for bracket:', id);
      } else {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('bracket');
        setSearchParams(newSearchParams);

        bracketLog('Removed bracket from URL');
      }
    },
    [searchParams, setSearchParams, queryClient, selectedBracketId]
  );

  const {
    data: selectedBracket,
    isLoading: selectedBracketLoading,
    error: selectedBracketError,
    refetch: refetchSelectedBracket,
  } = useBracketData(selectedBracketId);

  /**
   * Which season the page is showing, in order of what the reader asked for:
   *
   * 1. `?season=` — an explicit choice, in a link or after a reload.
   * 2. The season of the bracket in `?bracket=`. A link to a past bracket used
   *    to leave the picker saying "Summer 2 2026 (Current)" over a Summer 1
   *    bracket. It waits for the bracket query to settle rather than for a
   *    season to appear on it, because a legacy bracket resolves to no data at
   *    all and waiting for one would wait for ever.
   * 3. The season whose playoffs are still in progress, then the active season.
   *    Both are checked for `undefined` first: `activeSeason` can arrive from
   *    the cache before `playoffSeason` and win a race it should lose.
   *
   * Step 3 only stands in. If the bracket in the link failed to load, the page
   * still has to show something, but the season it settled on is a guess. So
   * the resolver keeps running while the season is only a fallback: when the
   * bracket arrives — on a retry, or a slow first load — its own season wins.
   */
  useEffect(() => {
    if (selectedSeasonId && seasonSource !== 'fallback') return;

    // Named in the address: the effect above adopts it, including on a Back.
    if (seasonParam) return;

    if (bracketParam && !selectedBracketError) {
      if (selectedBracketLoading) return;
      if (selectedBracket?.seasonId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state from incoming props/derived values
        setSelectedSeasonId(selectedBracket.seasonId);
        setSeasonSource('bracket');
        return;
      }
      // Settled with no season on it. Fall through to the usual default.
    }

    // The fallback already stands. Nothing better has arrived yet.
    if (selectedSeasonId) return;

    if (playoffSeason === undefined || activeSeason === undefined) return;
    if (playoffSeason) {
      setSelectedSeasonId(playoffSeason.id);
      setSeasonSource('fallback');
    } else if (activeSeason) {
      setSelectedSeasonId(activeSeason.id);
      setSeasonSource('fallback');
    }
  }, [
    playoffSeason,
    activeSeason,
    selectedSeasonId,
    seasonSource,
    seasonParam,
    bracketParam,
    selectedBracket,
    selectedBracketLoading,
    selectedBracketError,
  ]);

  /**
   * Keeps the season in the address, so a copied link opens the same view.
   * Written on every render that needs it rather than once: `setSelectedBracketId`
   * builds its URL from the params it captured on an earlier render, so a push
   * can drop the season, and this puts it straight back.
   */
  useEffect(() => {
    if (!selectedSeasonId) return;
    // A stand-in season, while the link names a bracket, is not the reader's
    // season: the bracket decides, as soon as it can be read. Written to the
    // address the stand-in would outlive the retry and every reload after it,
    // and the bracket would sit under the wrong season for good.
    if (seasonSource === 'fallback' && bracketParam) return;
    const inUrl = searchParams.get('season');
    if (inUrl === selectedSeasonId) return;
    // A different season in the address is a Back, a Forward, or a pasted link.
    // The effect above adopts it; writing state over it here would undo the
    // reader's own navigation.
    if (inUrl) return;
    const next = new URLSearchParams(searchParams);
    next.set('season', selectedSeasonId);
    setSearchParams(next, { replace: true });
  }, [selectedSeasonId, seasonSource, bracketParam, searchParams, setSearchParams]);

  /**
   * Choosing a season from the picker. The open bracket belongs to the season
   * being left, so it is closed: leaving it on screen is the disagreement this
   * fixes, in the other direction.
   */
  const selectSeason = useCallback(
    (id: string) => {
      setSelectedSeasonId(id);
      setSeasonSource('chosen');
      setSelectedBracketIdState(null);
      const next = new URLSearchParams(searchParams);
      next.set('season', id);
      next.delete('bracket');
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const { data: teamsData, isLoading: teamsLoading } = usePlayoffTeams();

  const { divisions, isLoading: divisionsLoading, error: divisionsError } = useDivisions();

  const {
    brackets: allBrackets,
    bracketsLoading,
    teamsByDivision,
    bracketsByDivision,
    handleBracketCreated: originalHandleBracketCreated,
    handleTeamDivisionChange,
    refetchBrackets: originalRefetchBrackets,
    error: bracketsDataError,
  } = usePlayoffData(isAdmin, selectedSeasonId);

  // Memoize derived data transformations to prevent recalculation on every render.
  // Capture any processing error in the memo's return value and surface it via
  // an effect rather than calling setState during render.
  const { typesafeBracketsByDivision, processingError } = useMemo<{
    typesafeBracketsByDivision: Record<string, PlayoffBracket[]>;
    processingError: { message: string; cause: unknown } | null;
  }>(() => {
    const result: Record<string, PlayoffBracket[]> = {};
    try {
      if (bracketsByDivision) {
        Object.keys(bracketsByDivision).forEach((div) => {
          const divisionBrackets = bracketsByDivision[div];
          if (Array.isArray(divisionBrackets)) {
            result[div] = divisionBrackets.map((b) => ({
              ...b,
              matches: Array.isArray(b.matches) ? b.matches : [],
              id: b.id || crypto.randomUUID(),
              state: (b.state || BRACKET_STATES.PENDING) as BracketState,
              format: (b.format || BRACKET_FORMATS.DOUBLE) as BracketFormat,
            }));
          } else {
            result[div] = [];
          }
        });
      }
      return { typesafeBracketsByDivision: result, processingError: null };
    } catch (err) {
      return {
        typesafeBracketsByDivision: result,
        processingError: {
          message: getUIErrorMessage(err, 'Failed to process bracket data'),
          cause: err,
        },
      };
    }
  }, [bracketsByDivision]);

  useEffect(() => {
    if (processingError) {
      logError(processingError.cause, 'typesafeBracketsByDivision processing');
    }
  }, [processingError]);

  const combinedError = error ?? processingError?.message ?? null;

  const isLoading = bracketsLoading || divisionsLoading || adminLoading;

  const allBracketsData = useMemo<PlayoffBracket[]>(() => {
    try {
      if (!Array.isArray(allBrackets)) {
        return [];
      }
      return allBrackets.map((b) => ({
        ...b,
        matches: Array.isArray(b.matches) ? b.matches : [],
        id: b.id || crypto.randomUUID(),
        state: (b.state || BRACKET_STATES.PENDING) as BracketState,
        format: (b.format || BRACKET_FORMATS.DOUBLE) as BracketFormat,
      }));
    } catch (err) {
      logError(err, 'allBracketsData processing');
      return [];
    }
  }, [allBrackets]);

  const availableDivisions = useMemo<string[]>(() => {
    try {
      if (!Array.isArray(divisions)) {
        return [];
      }
      const uniqueDisplayDivisions = new Set<string>();
      divisions.forEach((div) => {
        if (div.display_division && div.display_division !== 'Hidden') {
          uniqueDisplayDivisions.add(div.display_division);
        }
      });
      return Array.from(uniqueDisplayDivisions);
    } catch (err) {
      logError(err, 'availableDivisions processing');
      return [];
    }
  }, [divisions]);

  const deleteBracket = useCallback(
    async (bracketId: string, bracketName: string) => {
      playoffLog('Deleting bracket:', { bracketId, bracketName });

      try {
        await deleteBracketService(bracketId);

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['brackets'] }),
          queryClient.invalidateQueries({ queryKey: ['bracket-data', bracketId] }),
          queryClient.invalidateQueries({ queryKey: ['playoff-matches', bracketId] }),
          queryClient.removeQueries({ queryKey: ['bracket-data', bracketId] }),
        ]);

        if (selectedBracketId === bracketId) {
          setSelectedBracketId(null);
        }

        playoffLog('Successfully deleted bracket and cleared cache');
      } catch (error) {
        errorLog('Error deleting bracket:', error);
        const errorMessage = getUIErrorMessage(error, 'Failed to delete bracket');
        logError(error, 'deleteBracket');
        throw new Error(errorMessage, { cause: error });
      }
    },
    [queryClient, selectedBracketId, setSelectedBracketId]
  );

  const handleBracketCreated = useCallback(async () => {
    playoffLog('Handling bracket creation');

    // Start every attempt from a clean slate. Nothing else clears this state,
    // so without it a single past failure leaves a banner the user cannot
    // dismiss — still on screen above data that refreshed successfully.
    setError(null);

    try {
      await originalHandleBracketCreated();

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['brackets'] }),
        queryClient.invalidateQueries({ queryKey: ['playoff-data'] }),
        queryClient.invalidateQueries({ queryKey: ['divisions'] }),
        originalRefetchBrackets(),
      ]);

      playoffLog('Successfully handled bracket creation and cache refresh');
    } catch (error) {
      errorLog('Error in handleBracketCreated:', error);
      const errorMessage = getUIErrorMessage(error, 'Failed to create bracket');
      logError(error, 'handleBracketCreated');
      setError(errorMessage);
    }
  }, [originalHandleBracketCreated, originalRefetchBrackets, queryClient]);

  const refetchBrackets = useCallback(async () => {
    cacheLog('Refetching all brackets data');

    // See handleBracketCreated: clear the previous failure so a successful
    // retry actually removes the banner instead of leaving it stuck forever.
    setError(null);

    try {
      const cacheInvalidationPromises = [
        originalRefetchBrackets(),
        queryClient.invalidateQueries({ queryKey: ['brackets'] }),
        queryClient.invalidateQueries({ queryKey: ['playoff-data'] }),
      ];

      if (selectedBracketId) {
        await Promise.all([
          ...cacheInvalidationPromises,
          queryClient.invalidateQueries({ queryKey: ['bracket-data', selectedBracketId] }),
        ]);

        await refetchSelectedBracket();
        cacheLog('Refetched brackets and selected bracket data');
      } else {
        await Promise.all(cacheInvalidationPromises);
        cacheLog('Refetched brackets data (no selected bracket)');
      }

      return;
    } catch (error) {
      errorLog('Error in refetchBrackets:', error);
      const errorMessage = getUIErrorMessage(error, 'Failed to refresh data');
      logError(error, 'refetchBrackets');
      setError(errorMessage);
      throw error;
    }
  }, [originalRefetchBrackets, queryClient, selectedBracketId, refetchSelectedBracket]);

  const finalDivisionsError = convertErrorToString(divisionsError);
  const finalBracketsError = convertErrorToString(bracketsDataError);
  const finalSelectedBracketError = convertErrorToString(selectedBracketError);

  const retrySelectedBracket = useCallback(() => {
    // Fire and forget: the query records its own failure in `selectedBracketError`,
    // so swallow here rather than leaving an unhandled rejection.
    refetchSelectedBracket().catch(() => undefined);
  }, [refetchSelectedBracket]);

  return {
    profile: null,
    isAdmin,
    selectedBracketId,
    setSelectedBracketId,
    ready: Boolean(selectedBracketId) && Boolean(selectedBracket) && !selectedBracketLoading,
    error: combinedError,
    divisionsError: finalDivisionsError,
    bracketsError: finalBracketsError,
    selectedBracketError: finalSelectedBracketError,
    retrySelectedBracket,
    divisions: Array.isArray(divisions) ? divisions : [],
    divisionsLoading,
    availableDivisions,
    allBrackets: Array.isArray(allBrackets) ? allBrackets : [],
    bracketsLoading,
    teamsByDivision: (teamsByDivision || {}) as TeamsByDivision,
    bracketsByDivision: bracketsByDivision || {},
    typesafeBracketsByDivision,
    allBracketsData,
    handleBracketCreated,
    handleTeamDivisionChange,
    refetchBrackets,
    bracket: selectedBracket,
    teams: teamsData || [],
    teamsLoading,
    deleteBracket,
    isLoading,
    selectedSeasonId,
    setSelectedSeasonId: selectSeason,
  };
}
