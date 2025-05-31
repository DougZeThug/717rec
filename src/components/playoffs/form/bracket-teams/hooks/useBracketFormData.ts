
import React from 'react';
import { useTeamRankings } from "@/hooks/useTeamRankings";
import { Division } from '@/types';
import { BracketFormDataResult, ProcessedTeam } from '../types';

/**
 * Hook for managing bracket form data including team rankings and division mapping
 * Simplified version with inlined division mapping and team processing
 * @param divisions - Array of available divisions
 * @returns Object containing processed teams, loading state, and error information
 */
export const useBracketFormData = (divisions: Division[] = []): BracketFormDataResult => {
  // Fetch team rankings
  const { rankings, isLoading: rankingsLoading } = useTeamRankings();
  
  // Check if we have all required data before proceeding
  const isDataReady = !rankingsLoading && rankings && Array.isArray(rankings) && divisions && Array.isArray(divisions);

  // Create division mapping (inlined from useDivisionMapping)
  const divisionMapping = React.useMemo(() => {
    if (!isDataReady || !Array.isArray(divisions)) {
      return new Map<string, string>();
    }
    
    const mapping = new Map<string, string>();
    divisions.forEach(division => {
      if (division && typeof division.id === 'string' && typeof division.name === 'string') {
        mapping.set(division.id, division.name);
      }
    });
    return mapping;
  }, [divisions, isDataReady]);
  
  // Process team data (inlined from useTeamDataProcessor)
  const { processedTeams, processingError } = React.useMemo(() => {
    if (!isDataReady || !Array.isArray(rankings) || rankings.length === 0) {
      return { processedTeams: [], processingError: null };
    }

    try {
      const processed: ProcessedTeam[] = rankings
        .filter(ranking => ranking && typeof ranking.teamId === 'string')
        .map((ranking, index) => ({
          id: ranking.teamId,
          name: ranking.teamName || 'Unnamed Team',
          wins: ranking.wins || 0,
          losses: ranking.losses || 0,
          game_wins: ranking.gamesWon || 0,
          game_losses: ranking.gamesLost || 0,
          divisionName: ranking.divisionName || 'Unknown Division',
          division_id: ranking.divisionName ? divisionMapping.get(ranking.divisionName) || null : null,
          imageUrl: ranking.imageUrl || null,
          logoUrl: ranking.imageUrl || null,
          players: [],
          seed: index + 1,
          power_score: ranking.powerScore || 0,
          powerScore: ranking.powerScore || 0,
          sos: ranking.sos || 0,
          win_percentage: ranking.winPercentage || 0,
          game_win_percentage: ranking.gameWinPercentage || 0,
          created_at: new Date().toISOString(),
          close_match_losses: ranking.closeMatchLosses || 0
        }));
      
      return { processedTeams: processed, processingError: null };
    } catch (error) {
      console.error('Error processing team data:', error);
      return { 
        processedTeams: [], 
        processingError: error instanceof Error ? error.message : 'Failed to process team data'
      };
    }
  }, [rankings, divisionMapping, isDataReady]);

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
