
import { useTeamRankings } from "@/hooks/useTeamRankings";
import { BracketFormDataResult, Division } from '../types';
import { useDivisionMapping } from './useDivisionMapping';
import { useTeamDataProcessor } from './useTeamDataProcessor';

export const useBracketFormData = (divisions: Division[] = []): BracketFormDataResult => {
  // Fetch team rankings
  const { rankings, isLoading: rankingsLoading } = useTeamRankings();
  
  // Check if we have all required data before proceeding
  const isDataReady = !rankingsLoading && rankings && Array.isArray(rankings) && divisions && Array.isArray(divisions);
  
  console.log("useBracketFormData: Data readiness check", {
    rankingsLoading,
    hasRankings: !!rankings,
    rankingsLength: rankings?.length || 0,
    hasDivisions: !!divisions,
    divisionsLength: divisions?.length || 0,
    isDataReady
  });

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
