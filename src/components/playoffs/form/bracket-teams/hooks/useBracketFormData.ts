import React from 'react';

import { usePlayoffTeams } from '@/hooks/playoffs/usePlayoffTeams';
import { useSeedValidation } from '@/hooks/playoffs/useSeedValidation';
import { Division } from '@/types';
import { errorLog } from '@/utils/logger';

import { BracketFormDataResult, ProcessedTeam, SeedValidationState } from '../types';
import { assignMixedSeeds } from '../utils/seedAssignment';

/**
 * Hook for managing bracket form data including team rankings and division mapping
 * Enhanced version that handles both fetched teams and provided teams
 * @param divisions - Array of available divisions
 * @param providedTeams - Optional teams provided via props (bypasses fetch)
 * @returns Object containing processed teams, loading state, and error information
 */
export const useBracketFormData = (
  divisions: Division[] = [],
  providedTeams?: any[],
  divisionId?: string
): BracketFormDataResult => {
  // ALWAYS call hooks first (before any conditional logic) to comply with React Rules of Hooks
  const { data: fetchedTeams, isLoading } = usePlayoffTeams();
  const {
    data: seedValidation,
    isLoading: seedValidationLoading,
    error: seedValidationError,
  } = useSeedValidation(divisionId);

  // Determine which teams to use
  const shouldUseProvidedTeams =
    providedTeams && Array.isArray(providedTeams) && providedTeams.length > 0;
  const teamsToProcess = shouldUseProvidedTeams ? providedTeams : fetchedTeams || [];
  const isLoadingTeams = shouldUseProvidedTeams ? false : isLoading;

  // Check if we have all required data before proceeding
  const isDataReady =
    !isLoadingTeams &&
    teamsToProcess &&
    Array.isArray(teamsToProcess) &&
    divisions &&
    Array.isArray(divisions);

  // Create division mapping
  const divisionMapping = React.useMemo(() => {
    if (!isDataReady || !Array.isArray(divisions)) {
      return new Map<string, string>();
    }

    const mapping = new Map<string, string>();
    divisions.forEach((division) => {
      if (division && typeof division.id === 'string' && typeof division.name === 'string') {
        mapping.set(division.id, division.name);
      }
    });
    return mapping;
  }, [divisions, isDataReady]);

  // Process team data - works for both provided and fetched teams
  const { processedTeams, processingError } = React.useMemo(() => {
    if (!isDataReady || !Array.isArray(teamsToProcess) || teamsToProcess.length === 0) {
      return { processedTeams: [], processingError: null };
    }

    try {
      // Sort teams by ranking logic before assigning seeds
      const sortedTeams = [...teamsToProcess]
        .filter((team) => team && typeof team.id === 'string')
        .sort((a, b) => {
          const aPowerScore = (a as any).power_score;
          const bPowerScore = (b as any).power_score;

          // Handle NULL power scores - put them at the end
          if (aPowerScore === null && bPowerScore === null) {
            // Both are NULL, sort by win percentage as secondary
            const aWinPct = (a as any).win_percentage || 0;
            const bWinPct = (b as any).win_percentage || 0;
            if (bWinPct !== aWinPct) {
              return bWinPct - aWinPct;
            }
            // Tertiary sort by name
            return (a.name || '').localeCompare(b.name || '');
          }
          if (aPowerScore === null) return 1; // a goes to end
          if (bPowerScore === null) return -1; // b goes to end

          // Both have power scores, sort normally (descending)
          if (bPowerScore !== aPowerScore) {
            return bPowerScore - aPowerScore;
          }
          // Secondary sort by win percentage
          const aWinPct = (a as any).win_percentage || 0;
          const bWinPct = (b as any).win_percentage || 0;
          if (bWinPct !== aWinPct) {
            return bWinPct - aWinPct;
          }
          // Tertiary sort by name
          return (a.name || '').localeCompare(b.name || '');
        });

      // Handle mixed seed assignment: manual seeds + auto-assigned seeds
      const teamsWithMixedSeeds = assignMixedSeeds(sortedTeams);
      const processed: ProcessedTeam[] = teamsWithMixedSeeds.map((team) => ({
        id: team.id,
        name: team.name || 'Unnamed Team',
        wins: team.wins || 0,
        losses: team.losses || 0,
        game_wins: team.game_wins || 0,
        game_losses: team.game_losses || 0,
        divisionName:
          (team as any).divisionName || (team as any).divisionname || 'Unknown Division',
        division_id: team.division_id || team.division || null,
        imageUrl: team.imageUrl || team.image_url || team.logoUrl || team.logo_url || null,
        logoUrl: team.logoUrl || team.logo_url || team.imageUrl || team.image_url || null,
        players: Array.isArray(team.players) ? team.players : [],
        seed: team.finalSeed, // Use the calculated seed
        power_score: (team as any).power_score || 0,
        powerScore: (team as any).power_score || 0,
        sos: (team as any).sos || 0.5,
        win_percentage: (team as any).win_percentage || 0,
        game_win_percentage: (team as any).game_win_percentage || 0,
        created_at: team.created_at || new Date().toISOString(),
        close_match_losses: (team as any).close_match_losses || 0,
      }));

      return { processedTeams: processed, processingError: null };
    } catch (error) {
      errorLog('Error processing team data:', error);
      return {
        processedTeams: [],
        processingError: error instanceof Error ? error.message : 'Failed to process team data',
      };
    }
  }, [teamsToProcess, divisionMapping, isDataReady]);

  // Prepare seed validation state
  const seedValidationState: SeedValidationState = React.useMemo(
    () => ({
      isLoading: seedValidationLoading,
      conflicts: seedValidation?.filter((result) => result.conflict_count > 1) || [],
      hasConflicts:
        (seedValidation?.filter((result) => result.conflict_count > 1) || []).length > 0,
      errorMessage: seedValidationError?.message || null,
    }),
    [seedValidation, seedValidationLoading, seedValidationError]
  );

  // Determine error state
  const hasError = !isLoadingTeams && (!teamsToProcess || teamsToProcess.length === 0);
  const errorMessage =
    processingError || (hasError ? 'Failed to load teams. Please refresh and try again.' : null);

  return {
    teams: processedTeams,
    isLoading: isLoadingTeams,
    isError: hasError,
    errorMessage,
    isDataReady,
    seedValidation: seedValidationState,
  };
};
