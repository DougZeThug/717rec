import { convertErrorToString, getUIErrorMessage, logError } from '@/utils/errorHandler';
import { playoffLog, warnLog } from '@/utils/logger';
import type { PlayoffMatch, PlayoffViewModel } from '@/utils/playoffs/playoffTypes';

import { usePlayoffActions } from './usePlayoffActions';
import { usePlayoffBracketData } from './usePlayoffBracketData';
import { usePlayoffMatches } from './usePlayoffMatches';
import { usePlayoffTeams } from './usePlayoffTeams';

// Flat groups returned by the local grouper before the cast to the nested viewer type
type FlatMatchGroups = {
  winners: PlayoffMatch[];
  losers: PlayoffMatch[];
  finals: PlayoffMatch[];
};

// Local helper to group bracket matches by type
// Note: returns flat arrays per group. The cast to PlayoffViewModel['bracketMatchesByType']
// (which expects [][], round-organised) happens at the usage site below — contained there.
const groupBracketMatchesByType = (matches: PlayoffMatch[]): FlatMatchGroups => {
  if (!Array.isArray(matches)) {
    return { winners: [], losers: [], finals: [] };
  }

  const winners = matches.filter((match) => match.matchType === 'winners');
  const losers = matches.filter((match) => match.matchType === 'losers');
  const finals = matches.filter((match) => match.matchType === 'finals');

  return { winners, losers, finals };
};

/**
 * Unified hook for playoff bracket data and management
 */
export function usePlayoffViewModel(bracketId: string | null): PlayoffViewModel {
  playoffLog('usePlayoffViewModel called with bracketId:', bracketId);

  // Defensive: return safe defaults immediately if bracketId is invalid
  if (!bracketId || (typeof bracketId === 'string' && bracketId.trim() === '')) {
    if (import.meta.env.DEV) {
      warnLog('usePlayoffViewModel: Returning safe defaults for invalid bracketId');
    }
    return {
      bracket: null,
      isLoading: false,
      error: null,
      bracketMatchesByType: null,
      teams: [],
      teamsLoading: false,
      refetch: async () => {
        warnLog('Cannot refetch with invalid bracketId');
      },
      deleteBracket: async () => {
        throw new Error('Cannot delete bracket: invalid bracketId');
      },
      updateMatchResult: async () => {
        throw new Error('Cannot update match: invalid bracketId');
      },
    };
  }

  // Use the focused hooks
  const bracketQuery = usePlayoffBracketData(bracketId);
  const matchesQuery = usePlayoffMatches(bracketId);
  const teamsQuery = usePlayoffTeams();
  const actions = usePlayoffActions();

  // CRITICAL: Normalize to stable defaults - never return undefined
  const safeMatches = Array.isArray(matchesQuery.data) ? matchesQuery.data : [];
  const safeTeams = Array.isArray(teamsQuery.data) ? teamsQuery.data : [];
  const combinedBracket = bracketQuery.data
    ? {
        ...bracketQuery.data,
        matches: safeMatches,
      }
    : null;

  // Process bracket data to separate winners, losers and finals matches
  const bracketMatchesByType: PlayoffViewModel['bracketMatchesByType'] =
    safeMatches.length > 0
      ? (groupBracketMatchesByType(safeMatches) as PlayoffViewModel['bracketMatchesByType'])
      : null;

  // Simplified refetch function - no aggressive cache operations
  const refetch = async () => {
    try {
      playoffLog('Starting refetch...');

      // Simple parallel refetch without cache manipulation
      await Promise.all([bracketQuery.refetch(), matchesQuery.refetch(), teamsQuery.refetch()]);
      playoffLog('Refetch completed successfully');
    } catch (err) {
      logError(err, 'usePlayoffViewModel refetch');
      throw new Error(getUIErrorMessage(err, 'Failed to refresh data'), { cause: err });
    }
  };

  // Safely convert error to string for consistent interface
  const processedError = convertErrorToString(bracketQuery.error || matchesQuery.error);

  return {
    // Bracket data with matches combined
    bracket: combinedBracket,
    isLoading: bracketQuery.isLoading || matchesQuery.isLoading,
    error: processedError,
    bracketMatchesByType,

    // Teams data - always array, never undefined
    teams: safeTeams,
    teamsLoading: teamsQuery.isLoading,

    // Actions
    refetch,
    deleteBracket: actions.deleteBracket,
    updateMatchResult: actions.updateMatchResult,
  };
}

// Re-export the component hooks for direct use
export * as playoffActions from './usePlayoffActions';
export { usePlayoffBracketData } from './usePlayoffBracketData';
export { usePlayoffMatches } from './usePlayoffMatches';
export { usePlayoffTeams } from './usePlayoffTeams';

// Re-export the canonical BracketMatchesByType for convenience
export type { BracketMatchesByType } from '@/utils/playoffs/playoffTypes';
