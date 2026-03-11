import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { BRACKET_FORMATS, BRACKET_STATES } from '@/constants/brackets';
import { useAuth } from '@/contexts/AuthContext';
import { useBracketData } from '@/hooks/brackets/useBracketData';
import { usePlayoffTeams } from '@/hooks/playoffs/usePlayoffTeams';
import { useDivisions } from '@/hooks/useDivisions';
import { usePlayoffData } from '@/hooks/usePlayoffViewModel.compat';
import { useActiveSeason } from '@/hooks/useSeasons';
import { deleteBracket as deleteBracketService } from '@/services/brackets/BracketWriteService';
import { convertErrorToString, getUIErrorMessage, logError } from '@/utils/errorHandler';
import { bracketLog, cacheLog, errorLog, playoffLog } from '@/utils/logger';
import { BracketFormat, BracketState, PlayoffBracket } from '@/utils/playoffs/playoffTypes';

export interface PlayoffPageData {
  profile: any;
  isAdmin: boolean;
  selectedBracketId: string | null;
  setSelectedBracketId: (id: string | null) => void;
  ready: boolean;
  error: string | null;
  divisionsError: string | null;
  bracketsError: string | null;
  divisions: any[];
  divisionsLoading: boolean;
  availableDivisions: string[];
  allBrackets: any[];
  bracketsLoading: boolean;
  teamsByDivision: Record<string, any>;
  bracketsByDivision: Record<string, any>;
  typesafeBracketsByDivision: Record<string, PlayoffBracket[]>;
  allBracketsData: PlayoffBracket[];
  handleBracketCreated: () => void;
  handleTeamDivisionChange: (teamId: string, divisionName: string) => Promise<void>;
  refetchBrackets: () => Promise<any>;
  bracket: any;
  teams: any[];
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

  const { profile } = useAuth();
  const isAdmin = profile?.is_admin || false;

  // Season selection - defaults to active season
  const { data: activeSeason } = useActiveSeason();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  // Initialize selectedSeasonId to active season when it loads
  useEffect(() => {
    if (activeSeason && !selectedSeasonId) {
      setSelectedSeasonId(activeSeason.id);
    }
  }, [activeSeason, selectedSeasonId]);

  useEffect(() => {
    const bracketParam = searchParams.get('bracket');

    if (bracketParam && bracketParam !== selectedBracketId) {
      bracketLog('Setting bracket ID from URL:', bracketParam);
      setSelectedBracketIdState(bracketParam);
    } else if (!bracketParam && selectedBracketId) {
      bracketLog('Clearing bracket ID');
      setSelectedBracketIdState(null);
    }
  }, [searchParams, selectedBracketId]);

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
    error: _selectedBracketError,
    refetch: refetchSelectedBracket,
  } = useBracketData(selectedBracketId);

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

  // Memoize derived data transformations to prevent recalculation on every render
  const typesafeBracketsByDivision = useMemo<Record<string, PlayoffBracket[]>>(() => {
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
    } catch (err) {
      const errorMessage = getUIErrorMessage(err, 'Failed to process bracket data');
      logError(err, 'typesafeBracketsByDivision processing');
      setError(errorMessage);
    }
    return result;
  }, [bracketsByDivision]);

  const isLoading = bracketsLoading || divisionsLoading;

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

      return true;
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

  return {
    profile,
    isAdmin,
    selectedBracketId,
    setSelectedBracketId,
    ready: !!selectedBracketId && !!selectedBracket && !selectedBracketLoading,
    error,
    divisionsError: finalDivisionsError,
    bracketsError: finalBracketsError,
    divisions: Array.isArray(divisions) ? divisions : [],
    divisionsLoading,
    availableDivisions,
    allBrackets: Array.isArray(allBrackets) ? allBrackets : [],
    bracketsLoading,
    teamsByDivision: teamsByDivision || {},
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
    setSelectedSeasonId,
  };
}
