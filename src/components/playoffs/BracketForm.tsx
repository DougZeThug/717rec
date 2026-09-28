import { zodResolver } from '@hookform/resolvers/zod';
import { Users } from 'lucide-react';
import React from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MAX_BRACKET_TEAMS, MIN_BRACKET_TEAMS } from '@/constants/brackets';
import { Division, Team } from '@/types';
import { errorLog } from '@/utils/logger';

import { BracketFormTeamsContainer } from './form/bracket-teams/components/BracketFormTeamsContainer';
import { BracketFormDivision } from './form/BracketFormDivision';
import { BracketFormFormat } from './form/BracketFormFormat';
import { BracketFormGrandFinal } from './form/BracketFormGrandFinal';
import { bracketFormSchema, BracketFormValues } from './form/BracketFormSchema';
import { BracketFormTitle } from './form/BracketFormTitle';

const isPowerOf2 = (n: number) => n > 0 && (n & (n - 1)) === 0;

/**
 * Why the typed seeds cannot be used, or null when they can. Seeds may leave
 * gaps (not every team needs one), but each must be a whole number from 1 to
 * the team count, and no two teams may share one.
 */
const findSeedProblem = (seeds: number[], teamCount: number): string | null => {
  if (seeds.some((seed) => !Number.isInteger(seed) || seed < 1 || seed > teamCount)) {
    return `Seeds must be whole numbers from 1 to ${teamCount}.`;
  }
  if (new Set(seeds).size !== seeds.length) {
    return 'Two teams have the same seed. Give each team its own seed.';
  }
  return null;
};

interface BracketFormProps {
  divisions?: Division[];
  teams?: Team[];
  isSubmitting?: boolean;
  teamsValid?: boolean;
  onTeamsValidityChange?: (isValid: boolean) => void;
  onSubmit: (data: BracketFormValues) => void;
  onCancel: () => void;
}

const BracketForm: React.FC<BracketFormProps> = ({
  divisions,
  teams,
  isSubmitting = false,
  teamsValid: _teamsValid = false,
  onTeamsValidityChange,
  onSubmit,
  onCancel,
}) => {
  const [selectedTeams, setSelectedTeams] = React.useState<string[]>([]);
  const [teamsValidationState, setTeamsValidationState] = React.useState(false);
  const isExplicitSubmissionRef = React.useRef(false);
  const [teamSeeds, setTeamSeeds] = React.useState<Record<string, number>>({});

  const form = useForm({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      title: '',
      divisionId: '',
      format: 'Double Elimination' as const,
      teams: [] as string[],
      grandFinalType: 'double' as const,
    },
    mode: 'onBlur',
  });

  const { setValue, trigger } = form;
  const watchedDivisionId = useWatch({ control: form.control, name: 'divisionId' });
  const watchedTitle = useWatch({ control: form.control, name: 'title' });

  // Update teams field when selection changes and trigger validation
  React.useEffect(() => {
    setValue('teams', selectedTeams, { shouldValidate: true });
    // Manually trigger validation to ensure form state is updated
    trigger('teams');
  }, [selectedTeams, setValue, trigger]);

  // Handle team selection changes - ONLY updates state, NEVER submits
  const handleTeamSelectionChange = React.useCallback(
    ({ ids, isValid }: { ids: string[]; isValid: boolean }) => {
      setSelectedTeams(ids);
      setTeamsValidationState(isValid);

      // Notify parent of validity change - DOES NOT TRIGGER SUBMISSION
      if (onTeamsValidityChange) {
        onTeamsValidityChange(isValid);
      }
    },
    [onTeamsValidityChange]
  );

  // Handle division change - keep the team selection. The team list narrows to
  // the division's teams, but selected teams stay listed, and "Show teams from
  // all divisions" still allows a cross-division bracket.
  const handleDivisionChange = React.useCallback((_divisionId: string) => undefined, []);

  // Handle seed change - track manual seed overrides
  const handleSeedChange = React.useCallback((teamId: string, seed: number | null) => {
    setTeamSeeds((prev) => {
      const updated = { ...prev };
      if (seed === null) {
        delete updated[teamId];
      } else {
        updated[teamId] = seed;
      }
      return updated;
    });
  }, []);

  // Only the selected teams' seeds count: a seed typed for a team that was
  // then removed is not sent, and must not block the form.
  const selectedTeamSeeds = React.useMemo(
    () =>
      Object.fromEntries(
        selectedTeams
          .filter((teamId) => teamSeeds[teamId] !== undefined)
          .map((teamId) => [teamId, teamSeeds[teamId]])
      ),
    [selectedTeams, teamSeeds]
  );
  const seedProblem = findSeedProblem(Object.values(selectedTeamSeeds), selectedTeams.length);

  // EXPLICIT form submission handler - ONLY triggered by submit button
  const onFormSubmit = (data: BracketFormValues) => {
    // Guard: Only proceed if this is an explicit submission
    if (!isExplicitSubmissionRef.current) {
      return;
    }

    // Reset the explicit submission flag
    isExplicitSubmissionRef.current = false;

    // Additional validation before submission
    if (!data.teams || data.teams.length < MIN_BRACKET_TEAMS) {
      errorLog('BracketForm: Insufficient teams selected - blocking submission');
      return;
    }

    if (seedProblem) {
      errorLog('BracketForm: Invalid manual seeds - blocking submission');
      return;
    }

    // Find division name for the selected division
    const selectedDivision = divisions?.find((d) => d.id === data.divisionId);
    const formDataWithDivision = {
      ...data,
      divisionName: selectedDivision?.name || 'Unknown Division',
      teamSeeds: selectedTeamSeeds, // Include manual seed overrides
    };

    onSubmit(formDataWithDivision);
  };

  // Handle explicit submit button click
  const handleSubmitButtonClick = () => {
    isExplicitSubmissionRef.current = true;
    // Trigger form validation and submission
    form.trigger().then((isValid) => {
      if (isValid && teamsValidationState) {
        form.handleSubmit(onFormSubmit)();
      } else {
        isExplicitSubmissionRef.current = false;
      }
    });
  };

  const selectedTeamCount = selectedTeams.length;
  const minTeams = MIN_BRACKET_TEAMS;
  const maxTeams = MAX_BRACKET_TEAMS;

  // Simplified button state logic - check individual field requirements
  const isButtonEnabled = !!(
    watchedTitle &&
    watchedDivisionId &&
    teamsValidationState &&
    selectedTeamCount >= minTeams &&
    selectedTeamCount <= maxTeams &&
    !seedProblem &&
    !isSubmitting
  );

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Form Title */}
        <BracketFormTitle form={form} />

        {/* Division Selection */}
        <BracketFormDivision
          form={form}
          divisions={divisions || []}
          onDivisionChange={handleDivisionChange}
        />

        {/* Format Selection */}
        <BracketFormFormat form={form} />

        {/* Grand Final Type (only for Double Elimination) */}
        <BracketFormGrandFinal form={form} />

        {/* Team Selection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="size-4" />
            <label className="text-sm font-medium leading-none">
              Select Teams ({selectedTeamCount}/{maxTeams})
            </label>
          </div>

          <BracketFormTeamsContainer
            divisionId={watchedDivisionId}
            teams={teams}
            maxTeams={maxTeams}
            minTeams={minTeams}
            divisions={divisions}
            onChange={handleTeamSelectionChange}
            onSeedChange={handleSeedChange}
          />
        </div>

        {/* Validation Messages */}
        {selectedTeamCount > 0 &&
          selectedTeamCount >= minTeams &&
          selectedTeamCount <= maxTeams && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <Users className="size-4" />
              <span>
                Ready to create bracket with {selectedTeamCount} teams
                {!isPowerOf2(selectedTeamCount) ? ' (BYEs will be added)' : ''}
              </span>
            </div>
          )}

        {seedProblem && (
          <p role="alert" className="text-sm text-destructive">
            {seedProblem}
          </p>
        )}

        {/* Form Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmitButtonClick}
            disabled={!isButtonEnabled}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating Bracket...
              </>
            ) : (
              `Create Bracket (${selectedTeamCount} teams)`
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default BracketForm;
