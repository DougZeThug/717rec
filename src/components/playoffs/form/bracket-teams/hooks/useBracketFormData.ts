
import { useTeamRankings } from "@/hooks/useTeamRankings";
import { Division } from '@/types';
import { BracketFormDataResult } from '../types';
import { useDivisionMapping } from './useDivisionMapping';
import { useTeamDataProcessor } from './useTeamDataProcessor';

/**
 * Hook for managing bracket form data including team rankings and division mapping
 * @param divisions - Array of available divisions
 * @returns Object containing processed teams, loading state, and error information
 */
export const useBracketFormData = (divisions: Division[] = []): BracketFormDataResult => {
  // Fetch team rankings
  const { rankings, isLoading: rankingsLoading } = useTeamRankings();
  
  // Check if we have all required data before proceeding
  const isDataReady = !rankingsLoading && rankings && Array.isArray(rankings) && divisions && Array.isArray(divisions);

  // Create division mapping
  const divisionMapping = useDivisionMapping(divisions, isDataReady);
  
  // Process team data
  const { processedTeams, processingError } = useTeamDataProcessor(rankings, divisionMapping, isDataReady);

  // Determine error state
  const hasError = !rankingsLoading && (!rankings || rankings.length === 0);
  const errorMessage = processingError || (hasError ? "Failed to load teams. Please refresh and try again." : null);

  return {
    teams: processedTeams,
    isLoading: rankingsLoading,
    isError: hasError,
    errorMessage,
    isDataReady
  };
};
