
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
import { isTeamArray, isDivisionArray, isDivisionIdValid } from '@/utils/typeGuards';
import { useToast } from '@/hooks/use-toast';

/**
 * Main container component for bracket team selection
 * Phase 4: Type-safe with runtime guards and zero `as any` casts
 */
export const BracketFormTeamsContainer: React.FC<BracketFormTeamsContainerProps> = ({
  divisionId,
  teams: teamsProp,
  maxTeams,
  minTeams = 2,
  divisions = [],
  onChange
}) => {
  const { toast } = useToast();
  const hasToastedInvalidDivision = React.useRef(false);

  // Runtime validation of props using type guards
  const validDivisions = React.useMemo(() => {
    if (!isDivisionArray(divisions)) {
      console.warn('BracketFormTeamsContainer: Invalid divisions prop, using empty array');
      return [];
    }
    return divisions;
  }, [divisions]);

  const validTeamsProp = React.useMemo(() => {
    if (teamsProp !== undefined && !isTeamArray(teamsProp)) {
      console.warn('BracketFormTeamsContainer: Invalid teams prop, ignoring');
      return undefined;
    }
    return teamsProp;
  }, [teamsProp]);

  const validDivisionId = React.useMemo(() => {
    if (!divisionId) return null;
    
    if (!isDivisionIdValid(validDivisions, divisionId)) {
      // Toast error once per component instance
      if (!hasToastedInvalidDivision.current) {
        toast({
          variant: "destructive",
          title: "Invalid Division",
          description: "The selected division is not valid. Showing all teams."
        });
        hasToastedInvalidDivision.current = true;
      }
      return null;
    }
    
    return divisionId;
  }, [divisionId, validDivisions, toast]);

  // Always call useBracketFormData - pass validTeamsProp to short-circuit if provided
  const { 
    teams: fetchedTeams, 
    isLoading: fetchLoading, 
    isError: fetchError, 
    errorMessage, 
    isDataReady,
    seedValidation
  } = useBracketFormData(validDivisions, validTeamsProp, validDivisionId);

  // Determine which teams to use and loading states
  const allTeams = validTeamsProp ?? fetchedTeams;
  const isLoading = validTeamsProp ? false : fetchLoading;
  const isError = validTeamsProp ? false : fetchError;

  // Convert teams to ProcessedTeam format with type safety
  const processedTeams = React.useMemo((): ProcessedTeam[] => {
    if (!isTeamArray(allTeams)) return [];
    
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

  // Filter teams by display division with type safety
  const filteredTeams = React.useMemo(() => {
    if (!validDivisionId || !Array.isArray(processedTeams)) return processedTeams;
    
    return processedTeams.filter(team => 
      team.divisionName === validDivisionId
    );
  }, [processedTeams, validDivisionId]);

  // Manage form state - no onChange parameter passed to hook
  const formState = useTeamSelectionState(
    typeof maxTeams === 'number' && maxTeams > 0 ? maxTeams : 16,
    new Set(), // initialSelected
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

  // Single-path parent notification via useEffect - ONLY updates parent state
  React.useEffect(() => {
    const ids = Array.from(formState.selected);
    
    onChange({
      ids,
      isValid: validation.isValid
    });
  }, [formState.selected, validation.isValid, onChange]);

  // Reset selection when division changes
  React.useEffect(() => {
    if (formState.clearSelection) {
      formState.clearSelection();
    }
    // Reset toast flag when division changes
    hasToastedInvalidDivision.current = false;
  }, [validDivisionId, formState.clearSelection]);

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

  // Seed change handler
  const handleSeedChange = React.useCallback((teamId: string, seed: number | null) => {
    // This could be expanded to handle seed changes at the container level
    console.log('Seed change:', { teamId, seed });
  }, []);

  // Main form with teams available
  return (
    <div className="space-y-2">
      <TeamSelectionForm
        teams={filteredTeams}
        formState={formState}
        maxTeams={maxTeams}
        minTeams={minTeams}
        divisionId={validDivisionId}
        seedValidation={seedValidation}
        onSeedChange={handleSeedChange}
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
