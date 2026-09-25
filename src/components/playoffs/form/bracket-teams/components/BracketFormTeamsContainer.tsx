import React from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MAX_BRACKET_TEAMS, MIN_BRACKET_TEAMS } from '@/constants/brackets';
import { useToast } from '@/hooks/useToast';
import { warnLog } from '@/utils/logger';
import { isDivisionArray, isDivisionIdValid, isTeamArray } from '@/utils/typeGuards';

import { useBracketFormData } from '../hooks/useBracketFormData';
import { useBracketFormValidation } from '../hooks/useBracketFormValidation';
import { useTeamSelectionState } from '../hooks/useTeamSelectionState';
import { BracketFormTeamsContainerProps, ProcessedTeam } from '../types';
import { teamsInDisplayDivision } from '../utils/divisionFilter';
import { TeamSelectionEmpty } from './TeamSelectionEmpty';
import { TeamSelectionError } from './TeamSelectionError';
import { TeamSelectionForm } from './TeamSelectionForm';
import { TeamSelectionLoading } from './TeamSelectionLoading';

const EMPTY_DIVISIONS: BracketFormTeamsContainerProps['divisions'] = [];

/**
 * The teams to list: only the picked division's — unless the admin asks for
 * every division, so a team that moved up can still be picked. A selected
 * team always stays listed, so a division change never hides a pick that
 * still counts.
 */
function visibleTeams(
  teams: ProcessedTeam[],
  divisionGroup: { teams: ProcessedTeam[] } | null,
  showAllDivisions: boolean,
  selected: Set<string>
): ProcessedTeam[] {
  if (!divisionGroup || showAllDivisions) return teams;
  const inDivision = new Set(divisionGroup.teams.map((team) => team.id));
  return teams.filter((team) => inDivision.has(team.id) || selected.has(team.id));
}

interface ShowAllDivisionsToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** The box that lists every league team again once a division narrows the list. */
const ShowAllDivisionsToggle: React.FC<ShowAllDivisionsToggleProps> = ({
  checked,
  onCheckedChange,
}) => (
  <div className="flex items-center gap-2">
    <Checkbox
      id="bracket-show-all-divisions"
      checked={checked}
      onCheckedChange={(value) => onCheckedChange(value === true)}
    />
    <Label htmlFor="bracket-show-all-divisions" className="cursor-pointer">
      Show teams from all divisions
    </Label>
  </div>
);

/**
 * Main container component for bracket team selection
 * Phase 4: Type-safe with runtime guards and no unchecked casts
 */
export const BracketFormTeamsContainer: React.FC<BracketFormTeamsContainerProps> = ({
  divisionId,
  teams: teamsProp,
  maxTeams,
  minTeams = MIN_BRACKET_TEAMS,
  divisions = EMPTY_DIVISIONS,
  onChange,
  onSeedChange,
}) => {
  const { toast } = useToast();
  const hasToastedInvalidDivision = React.useRef(false);
  const [showAllDivisions, setShowAllDivisions] = React.useState(false);

  // Runtime validation of props using type guards
  const validDivisions = React.useMemo(() => {
    if (!isDivisionArray(divisions)) {
      warnLog('BracketFormTeamsContainer: Invalid divisions prop, using empty array');
      return [];
    }
    return divisions;
  }, [divisions]);

  const validTeamsProp = React.useMemo(() => {
    if (teamsProp !== undefined && !isTeamArray(teamsProp)) {
      warnLog('BracketFormTeamsContainer: Invalid teams prop, ignoring');
      return undefined;
    }
    return teamsProp;
  }, [teamsProp]);

  const validDivisionId = React.useMemo(() => {
    if (!divisionId) return null;
    if (!isDivisionIdValid(validDivisions, divisionId)) return null;
    return divisionId;
  }, [divisionId, validDivisions]);

  const isInvalidDivisionSelection = !!divisionId && validDivisionId === null;

  // Toast error once per invalid selection (side effect runs outside render)
  React.useEffect(() => {
    if (isInvalidDivisionSelection && !hasToastedInvalidDivision.current) {
      toast({
        variant: 'destructive',
        title: 'Invalid Division',
        description: 'The selected division is not valid. Showing all teams.',
      });
      hasToastedInvalidDivision.current = true;
    }
  }, [isInvalidDivisionSelection, toast]);

  // Always call useBracketFormData - pass validTeamsProp to short-circuit if provided
  const {
    teams: fetchedTeams,
    isLoading: fetchLoading,
    isError: fetchError,
    errorMessage,
    isDataReady: _isDataReady,
    seedValidation,
  } = useBracketFormData(
    validDivisions,
    validTeamsProp as Parameters<typeof useBracketFormData>[1],
    validDivisionId ?? undefined
  );

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
      close_match_losses: team.close_match_losses || 0,
    }));
  }, [allTeams]);

  // The picked division's display division ("Competitive" covers every
  // Competitive division), so the admin is not handed every league team.
  const divisionGroup = React.useMemo(
    () =>
      validDivisionId
        ? teamsInDisplayDivision(processedTeams, validDivisions, validDivisionId)
        : null,
    [processedTeams, validDivisions, validDivisionId]
  );

  // Resolve the bounds once so selection state and validation agree — passing
  // the raw props to one and the fallbacks to the other let the picker cap
  // selection at a different number than the message told the user.
  const resolvedMaxTeams =
    typeof maxTeams === 'number' && maxTeams > 0 ? maxTeams : MAX_BRACKET_TEAMS;
  const resolvedMinTeams =
    typeof minTeams === 'number' && minTeams > 0 ? minTeams : MIN_BRACKET_TEAMS;

  // Manage form state - no onChange parameter passed to hook
  const formState = useTeamSelectionState(
    resolvedMaxTeams,
    new Set(), // initialSelected
    processedTeams.length,
    resolvedMinTeams
  );

  const filteredTeams = React.useMemo(
    () => visibleTeams(processedTeams, divisionGroup, showAllDivisions, formState.selected),
    [processedTeams, divisionGroup, showAllDivisions, formState.selected]
  );

  // Unified validation
  const validation = useBracketFormValidation(
    formState.count,
    filteredTeams.length,
    resolvedMinTeams,
    resolvedMaxTeams
  );

  // Single-path parent notification via useEffect - ONLY updates parent state
  React.useEffect(() => {
    const ids = Array.from(formState.selected);

    onChange({
      ids,
      isValid: validation.isValid,
    });
  }, [formState.selected, validation.isValid, onChange]);

  // Don't clear selection when the division changes: selected teams stay listed
  React.useEffect(() => {
    // Reset toast flag when division changes
    hasToastedInvalidDivision.current = false;
  }, [validDivisionId]);

  // Seed change handler - hoisted above all early returns to comply with Rules of Hooks.
  const handleSeedChange = React.useCallback(
    (teamId: string, seed: number | null) => {
      if (onSeedChange) {
        onSeedChange(teamId, seed);
      }
    },
    [onSeedChange]
  );

  // Loading state
  if (isLoading) {
    return <TeamSelectionLoading />;
  }

  // Error state
  if (isError) {
    return (
      <TeamSelectionError
        message={errorMessage || 'An error occurred loading teams'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Empty state (no teams in the league at all)
  if (processedTeams.length === 0) {
    return <TeamSelectionEmpty />;
  }

  // Main form with teams available
  return (
    <div className="space-y-2">
      {divisionGroup && (
        <ShowAllDivisionsToggle checked={showAllDivisions} onCheckedChange={setShowAllDivisions} />
      )}
      {filteredTeams.length > 0 ? (
        <TeamSelectionForm
          teams={filteredTeams}
          formState={formState}
          maxTeams={resolvedMaxTeams}
          minTeams={resolvedMinTeams}
          divisionId={validDivisionId ?? undefined}
          seedValidation={seedValidation}
          onSeedChange={handleSeedChange}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No {divisionGroup?.label} teams. Tick &quot;Show teams from all divisions&quot; to pick
          from other divisions.
        </p>
      )}

      {/* Display validation message */}
      {validation.message && <div className="text-sm text-destructive">{validation.message}</div>}
    </div>
  );
};
