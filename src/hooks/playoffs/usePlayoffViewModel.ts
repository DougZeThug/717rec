
import { useQueryClient } from "@tanstack/react-query";
import { usePlayoffBracketData } from './usePlayoffBracketData';
import { usePlayoffMatches } from './usePlayoffMatches';
import { usePlayoffTeams } from './usePlayoffTeams';
import { usePlayoffActions } from './usePlayoffActions';
import { BracketMatchesByType } from "@/services/brackets/types";
import { getUIErrorMessage, logError, convertErrorToString } from "@/utils/errors";
import type { PlayoffViewModel } from "@/utils/playoffs/playoffTypes";

// Local helper to group bracket matches by type
const groupBracketMatchesByType = (matches: any[]): BracketMatchesByType => {
  console.log('🔍 groupBracketMatchesByType: Input matches:', matches);
  
  if (!Array.isArray(matches)) {
    console.log('🔍 groupBracketMatchesByType: Not an array, returning empty structure');
    return { winners: [], losers: [], finals: [] };
  }
  
  const winners = matches.filter(match => match.matchType === 'winners');
  const losers = matches.filter(match => match.matchType === 'losers');
  const finals = matches.filter(match => match.matchType === 'finals');
  
  console.log('🔍 groupBracketMatchesByType: Grouped results:', {
    winners: winners.length,
    losers: losers.length,
    finals: finals.length
  });
  
  return { winners, losers, finals };
};

/**
 * Unified hook for playoff bracket data and management
 */
export function usePlayoffViewModel(bracketId: string | null): PlayoffViewModel {
  console.log('🔍 usePlayoffViewModel called with bracketId:', bracketId);
  console.log('🔍 usePlayoffViewModel: Timestamp:', new Date().toISOString());
  
  // Get QueryClient using the proper hook
  const queryClient = useQueryClient();
  
  // Use the focused hooks
  const bracketQuery = usePlayoffBracketData(bracketId);
  const matchesQuery = usePlayoffMatches(bracketId);
  const teamsQuery = usePlayoffTeams();
  const actions = usePlayoffActions();
  
  // Debug the raw data from each query
  console.log('🔍 usePlayoffViewModel - Raw bracket data:', bracketQuery.data);
  console.log('🔍 usePlayoffViewModel - Raw matches data:', matchesQuery.data);
  console.log('🔍 usePlayoffViewModel - Matches data length:', matchesQuery.data?.length);
  console.log('🔍 usePlayoffViewModel - Matches query loading:', matchesQuery.isLoading);
  console.log('🔍 usePlayoffViewModel - Matches query error:', matchesQuery.error);
  console.log('🔍 usePlayoffViewModel - Teams data:', teamsQuery.data);
  
  // CRITICAL FIX: Properly combine bracket data with matches data
  const combinedBracket = bracketQuery.data ? {
    ...bracketQuery.data,
    matches: matchesQuery.data || [] // This ensures matches are attached to the bracket
  } : null;
  
  console.log('🔍 usePlayoffViewModel - Combined bracket BEFORE matches attachment:', bracketQuery.data);
  console.log('🔍 usePlayoffViewModel - Matches to attach:', matchesQuery.data);
  console.log('🔍 usePlayoffViewModel - Combined bracket AFTER matches attachment:', combinedBracket);
  console.log('🔍 usePlayoffViewModel - Combined bracket matches length:', combinedBracket?.matches?.length);
  
  // Process bracket data to separate winners, losers and finals matches
  const bracketMatchesByType: BracketMatchesByType | null = matchesQuery.data
    ? groupBracketMatchesByType(matchesQuery.data)
    : null;
  
  console.log('🔍 usePlayoffViewModel - Bracket matches by type:', bracketMatchesByType);
  
  // Simplified refetch function - no aggressive cache operations
  const refetch = async () => {
    try {
      console.log('🔍 usePlayoffViewModel - Starting simple refetch...');
      
      // Simple parallel refetch without cache manipulation
      await Promise.all([
        bracketQuery.refetch(),
        matchesQuery.refetch(),
        teamsQuery.refetch()
      ]);
      console.log('🔍 usePlayoffViewModel - Simple refetch completed successfully');
    } catch (err) {
      console.error('🔍 usePlayoffViewModel - Refetch error:', err);
      logError(err, "usePlayoffViewModel refetch");
      throw new Error(getUIErrorMessage(err, "Failed to refresh data"));
    }
  };
  
  // Safely convert error to string for consistent interface
  const processedError = convertErrorToString(bracketQuery.error || matchesQuery.error);
  
  const result = {
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
  
  console.log('🔍 usePlayoffViewModel - Final result:', result);
  console.log('🔍 usePlayoffViewModel - Final result bracket matches:', result.bracket?.matches?.length);
  console.log('🔍 usePlayoffViewModel - Final result isLoading:', result.isLoading);
  
  return result;
}

// Re-export the component hooks for direct use
export { usePlayoffBracketData } from './usePlayoffBracketData';
export { usePlayoffMatches } from './usePlayoffMatches';
export { usePlayoffTeams } from './usePlayoffTeams';
export * as playoffActions from './usePlayoffActions';

// Re-export the BracketMatchesByType type for convenience
export type { BracketMatchesByType } from "@/services/brackets/types";
