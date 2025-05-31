
import React from 'react';
import { Division, Team } from '@/types';
import { BracketFormTeamsContainerProps, ProcessedTeam } from '../types';
import { useBracketFormData } from '../hooks/useBracketFormData';
import { useTeamSelectionState } from '../hooks/useTeamSelectionState';
import { useBracketFormValidation } from '../hooks/useBracketFormValidation';
import { TeamSelectionLoading } from './TeamSelectionLoading';
import { TeamSelectionError } from './TeamSelectionError';
import { TeamSelectionEmpty } from './TeamSelectionEmpty';
import { TeamSelectionForm } from './TeamSelectionForm';

/**
 * Main container component for bracket team selection
 * Manages data fetching, state, validation, and renders appropriate child components
 * Phase 3: Added unified validation, error handling, and improved UX
 */
export const BracketFormTeamsContainer: React.FC<BracketFormTeamsContainerProps> = ({
  divisionId,
  teams: teamsProp,
  maxTeams,
  minTeams = 2,
  divisions = [],
  onChange
}) => {
  // Always call useBracketFormData - pass teamsProp to short-circuit if provided
  const { 
    teams: fetchedTeams, 
    isLoading: fetchLoading, 
    isError: fetchError, 
    errorMessage, 
    isDataReady 
  } = useBracketFormData(divisions as Division[], teamsProp);

  // Determine which teams to use and loading states
  const allTeams = teamsProp ?? fetchedTeams;
  const isLoading = teamsProp ? false : fetchLoading;
  const isError = teamsProp ? false : fetchError;

  // Convert teams to ProcessedTeam format if needed
  const processedTeams = React.useMemo((): ProcessedTeam[] => {
    if (!Array.isArray(allTeams)) return [];
    
    return allTeams.map((team, index) => ({
      id: team.id,
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
      seed: team.seed || index + 1,
      power_score: team.power_score || 0,
      powerScore: team.power_score || 0,
      sos: team.sos || 0.5,
      win_percentage: team.win_percentage || 0,
      game_win_percentage: team.game_win_percentage || 0,
      created_at: team.created_at || new Date().toISOString(),
      close_match_losses: team.close_match_losses || 0
    }));
  }, [allTeams]);

  // Filter teams by division
  const filteredTeams = React.useMemo(() => {
    if (!divisionId || !Array.isArray(processedTeams)) return processedTeams;
    
    return processedTeams.filter(team => 
      team.division_id === divisionId || team.division_id === divisionId
    );
  }, [processedTeams, divisionId]);

  // Manage form state with enhanced onChange callback
  const formState = useTeamSelectionState(
    typeof maxTeams === 'number' && maxTeams > 0 ? maxTeams : 16,
    (ids) => {
      // Enhanced onChange callback that includes validation
      onChange({
        ids,
        isValid: ids.length >= minTeams && ids.length <= maxTeams
      });
    },
    Array.isArray(filteredTeams) ? filteredTeams.length : 0,
    typeof minTeams === 'number' && minTeams > 0 ? minTeams : 2
  );

  // Unified validation
  const validation = useBracketFormValidation(
    formState.count,
    filteredTeams.length,
    minTeams,
    maxTeams
  );

  // Reset selection when division changes
  React.useEffect(() => {
    if (formState.clearSelection) {
      formState.clearSelection();
    }
  }, [divisionId, formState.clearSelection]);

  // Loading state
  if (isLoading) {
    return <TeamSelectionLoading />;
  }

  // Error state
  if (isError) {
    return (
      <TeamSelectionError 
        message={errorMessage || "An error occurred loading teams"} 
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Empty state (no teams available)
  if (!Array.isArray(filteredTeams) || filteredTeams.length === 0) {
    return <TeamSelectionEmpty />;
  }

  // Main form with teams available
  return (
    <div className="space-y-2">
      <TeamSelectionForm
        teams={filteredTeams}
        formState={formState}
        maxTeams={maxTeams}
        minTeams={minTeams}
      />
      
      {/* Display validation message */}
      {validation.message && (
        <div className="text-sm text-destructive">
          {validation.message}
        </div>
      )}
    </div>
  );
};
