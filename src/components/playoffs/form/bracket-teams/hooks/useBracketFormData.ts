
import React from 'react';
import { useTeams } from "@/hooks/useTeams";
import { Division } from '@/types';
import { BracketFormDataResult, ProcessedTeam } from '../types';

/**
 * Hook for managing bracket form data including team rankings and division mapping
 * Enhanced version that handles both fetched teams and provided teams
 * @param divisions - Array of available divisions
 * @param providedTeams - Optional teams provided via props (bypasses fetch)
 * @returns Object containing processed teams, loading state, and error information
 */
export const useBracketFormData = (
  divisions: Division[] = [], 
  providedTeams?: any[]
): BracketFormDataResult => {
  
  // Short-circuit if teams are provided via props
  if (providedTeams && Array.isArray(providedTeams) && providedTeams.length > 0) {
    // Sort teams by ranking logic before assigning seeds
    const sortedProvidedTeams = [...providedTeams].sort((a, b) => {
      const aPowerScore = a.power_score;
      const bPowerScore = b.power_score;
      
      // Handle NULL power scores - put them at the end
      if (aPowerScore === null && bPowerScore === null) {
        // Both are NULL, sort by win percentage as secondary
        const aWinPct = a.win_percentage || 0;
        const bWinPct = b.win_percentage || 0;
        if (bWinPct !== aWinPct) {
          return bWinPct - aWinPct;
        }
        // Tertiary sort by name
        return (a.name || '').localeCompare(b.name || '');
      }
      if (aPowerScore === null) return 1;  // a goes to end
      if (bPowerScore === null) return -1; // b goes to end
      
      // Both have power scores, sort normally (descending)
      if (bPowerScore !== aPowerScore) {
        return bPowerScore - aPowerScore;
      }
      // Secondary sort by win percentage
      const aWinPct = a.win_percentage || 0;
      const bWinPct = b.win_percentage || 0;
      if (bWinPct !== aWinPct) {
        return bWinPct - aWinPct;
      }
      // Tertiary sort by name
      return (a.name || '').localeCompare(b.name || '');
    });

    const processedProvidedTeams: ProcessedTeam[] = sortedProvidedTeams.map((team, index) => ({
      id: team.id || `team-${index}`,
      name: team.name || 'Unnamed Team',
      wins: team.wins || 0,
      losses: team.losses || 0,
      game_wins: team.game_wins || 0,
      game_losses: team.game_losses || 0,
      divisionName: team.divisionName || 'Unknown Division',
      division_id: team.division_id || team.division || null,
      imageUrl: team.imageUrl || team.logoUrl || null,
      logoUrl: team.logoUrl || team.imageUrl || null,
      players: Array.isArray(team.players) ? team.players : [],
      seed: index + 1, // Now assigned based on ranking order
      power_score: team.power_score || 0,
      powerScore: team.power_score || 0,
      sos: team.sos || 0.5,
      win_percentage: team.win_percentage || 0,
      game_win_percentage: team.game_win_percentage || 0,
      created_at: team.created_at || new Date().toISOString(),
      close_match_losses: team.close_match_losses || 0
    }));
    
    return {
      teams: processedProvidedTeams,
      isLoading: false,
      isError: false,
      errorMessage: null,
      isDataReady: true
    };
  }
  
  // Fetch teams if no teams provided
  const { teams: fetchedTeams, isLoading } = useTeams();
  
  // Check if we have all required data before proceeding
  const isDataReady = !isLoading && fetchedTeams && Array.isArray(fetchedTeams) && divisions && Array.isArray(divisions);

  // Create division mapping
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
  
  // Process team data
  const { processedTeams, processingError } = React.useMemo(() => {
    if (!isDataReady || !Array.isArray(fetchedTeams) || fetchedTeams.length === 0) {
      return { processedTeams: [], processingError: null };
    }

    try {
      // Sort teams by ranking logic before assigning seeds
      const sortedFetchedTeams = [...fetchedTeams]
        .filter(team => team && typeof team.id === 'string')
        .sort((a, b) => {
          const aPowerScore = a.power_score;
          const bPowerScore = b.power_score;
          
          // Handle NULL power scores - put them at the end
          if (aPowerScore === null && bPowerScore === null) {
            // Both are NULL, sort by win percentage as secondary
            const aWinPct = a.win_percentage || 0;
            const bWinPct = b.win_percentage || 0;
            if (bWinPct !== aWinPct) {
              return bWinPct - aWinPct;
            }
            // Tertiary sort by name
            return (a.name || '').localeCompare(b.name || '');
          }
          if (aPowerScore === null) return 1;  // a goes to end
          if (bPowerScore === null) return -1; // b goes to end
          
          // Both have power scores, sort normally (descending)
          if (bPowerScore !== aPowerScore) {
            return bPowerScore - aPowerScore;
          }
          // Secondary sort by win percentage
          const aWinPct = a.win_percentage || 0;
          const bWinPct = b.win_percentage || 0;
          if (bWinPct !== aWinPct) {
            return bWinPct - aWinPct;
          }
          // Tertiary sort by name
          return (a.name || '').localeCompare(b.name || '');
        });

      const processed: ProcessedTeam[] = sortedFetchedTeams.map((team, index) => ({
        id: team.id,
        name: team.name || 'Unnamed Team',
        wins: team.wins || 0,
        losses: team.losses || 0,
        game_wins: team.game_wins || 0,
        game_losses: team.game_losses || 0,
        divisionName: team.divisionName || 'Unknown Division',
        division_id: team.division_id || null,
        imageUrl: team.imageUrl || team.logoUrl || null,
        logoUrl: team.logoUrl || team.imageUrl || null,
        players: Array.isArray(team.players) ? team.players : [],
        seed: index + 1, // Now assigned based on ranking order
        power_score: team.power_score || 0,
        powerScore: team.power_score || 0,
        sos: team.sos || 0,
        win_percentage: team.win_percentage || 0,
        game_win_percentage: team.game_win_percentage || 0,
        created_at: team.created_at || new Date().toISOString(),
        close_match_losses: team.close_match_losses || 0
      }));
      
      return { processedTeams: processed, processingError: null };
    } catch (error) {
      console.error('Error processing team data:', error);
      return { 
        processedTeams: [], 
        processingError: error instanceof Error ? error.message : 'Failed to process team data'
      };
    }
  }, [fetchedTeams, divisionMapping, isDataReady]);

  // Determine error state
  const hasError = !isLoading && (!fetchedTeams || fetchedTeams.length === 0);
  const errorMessage = processingError || (hasError ? "Failed to load teams. Please refresh and try again." : null);

  return {
    teams: processedTeams,
    isLoading,
    isError: hasError,
    errorMessage,
    isDataReady
  };
};
