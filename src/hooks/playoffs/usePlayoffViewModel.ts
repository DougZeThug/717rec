
import { usePlayoffBracketData } from './usePlayoffBracketData';
import { usePlayoffMatches } from './usePlayoffMatches';
import { usePlayoffTeams } from './usePlayoffTeams';
import { usePlayoffActions } from './usePlayoffActions';
import { BracketMatchesByType } from "@/services/brackets/types";
import { getUIErrorMessage, logError, convertErrorToString } from "@/utils/errors";
import type { PlayoffViewModel } from "@/utils/playoffs/playoffTypes";

// Local helper to group bracket matches by type
const groupBracketMatchesByType = (matches: any[]): BracketMatchesByType => {
  if (!Array.isArray(matches)) {
    return { winners: [], losers: [], finals: [] };
  }
  
  const winners = matches.filter(match => match.matchType === 'winners');
  const losers = matches.filter(match => match.matchType === 'losers');
  const finals = matches.filter(match => match.matchType === 'finals');
  
  return { winners, losers, finals };
};

/**
 * Unified hook for playoff bracket data and management
 */
export function usePlayoffViewModel(bracketId: string | null): PlayoffViewModel {
  // Use the focused hooks
  const bracketQuery = usePlayoffBracketData(bracketId);
  const matchesQuery = usePlayoffMatches(bracketId);
  const teamsQuery = usePlayoffTeams();
  const actions = usePlayoffActions();
  
  // Combine bracket data with matches data
  const combinedBracket = bracketQuery.data ? {
    ...bracketQuery.data,
    matches: matchesQuery.data || []
  } : null;
  
  // Process bracket data to separate winners, losers and finals matches
  const bracketMatchesByType: BracketMatchesByType | null = matchesQuery.data
    ? groupBracketMatchesByType(matchesQuery.data)
    : null;
  
  // Refetch function that triggers all related queries
  const refetch = async () => {
    try {
      await Promise.all([
        bracketQuery.refetch(),
        matchesQuery.refetch(),
        teamsQuery.refetch()
      ]);
    } catch (err) {
      logError(err, "usePlayoffViewModel refetch");
      throw new Error(getUIErrorMessage(err, "Failed to refresh data"));
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
    
    // Teams data
    teams: teamsQuery.data || [],
    teamsLoading: teamsQuery.isLoading,
    
    // Actions
    refetch,
    deleteBracket: actions.deleteBracket,
    updateMatchResult: actions.updateMatchResult
  };
}

// Re-export the component hooks for direct use
export { usePlayoffBracketData } from './usePlayoffBracketData';
export { usePlayoffMatches } from './usePlayoffMatches';
export { usePlayoffTeams } from './usePlayoffTeams';
export * as playoffActions from './usePlayoffActions';

// Re-export the BracketMatchesByType type for convenience
export type { BracketMatchesByType } from "@/services/brackets/types";
