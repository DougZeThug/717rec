
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { BracketFormTitle } from "./form/BracketFormTitle";
import { BracketFormDivision } from "./form/BracketFormDivision";
import { BracketFormFormat } from "./form/BracketFormFormat";
import { BracketFormTeamsContainer } from "./form/bracket-teams/components/BracketFormTeamsContainer";
import { bracketFormSchema, BracketFormValues } from "./form/BracketFormSchema";
import { Team, Division } from "@/types";
import { AlertCircle, Users } from "lucide-react";

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
  teamsValid = false,
  onTeamsValidityChange,
  onSubmit,
  onCancel,
}) => {
  const [selectedTeams, setSelectedTeams] = React.useState<string[]>([]);
  const [teamsValidationState, setTeamsValidationState] = React.useState(false);
  const [isExplicitSubmission, setIsExplicitSubmission] = React.useState(false);

  const form = useForm<BracketFormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      title: "",
      divisionId: "",
      format: "Single Elimination",
      teams: [],
    },
    mode: "onBlur",
  });

  const { watch, setValue, handleSubmit, formState, trigger } = form;
  const watchedDivisionId = watch("divisionId");
  const watchedTitle = watch("title");

  // Update teams field when selection changes and trigger validation
  React.useEffect(() => {
    setValue("teams", selectedTeams, { shouldValidate: true });
    // Manually trigger validation to ensure form state is updated
    trigger("teams");
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

  // Handle division change - clears team selection
  const handleDivisionChange = React.useCallback((divisionId: string) => {
    // Clear selected teams when division changes
    setSelectedTeams([]);
    setTeamsValidationState(false);
    if (onTeamsValidityChange) {
      onTeamsValidityChange(false);
    }
  }, [onTeamsValidityChange]);

  // EXPLICIT form submission handler - ONLY triggered by submit button
  const onFormSubmit = (data: BracketFormValues) => {
    // Guard: Only proceed if this is an explicit submission
    if (!isExplicitSubmission) {
      return;
    }
    
    // Reset the explicit submission flag
    setIsExplicitSubmission(false);
    
    // Additional validation before submission
    if (!data.teams || data.teams.length < 2) {
      console.error("BracketForm: Insufficient teams selected - blocking submission");
      return;
    }

    // Find division name for the selected division
    const selectedDivision = divisions?.find(d => d.id === data.divisionId);
    const formDataWithDivision = {
      ...data,
      divisionName: selectedDivision?.name || "Unknown Division"
    };

    onSubmit(formDataWithDivision);
  };

  // Handle explicit submit button click
  const handleSubmitButtonClick = () => {
    setIsExplicitSubmission(true);
    // Trigger form validation and submission
    form.trigger().then((isValid) => {
      if (isValid && teamsValidationState) {
        form.handleSubmit(onFormSubmit)();
      } else {
        setIsExplicitSubmission(false);
      }
    });
  };

  // Simplified button state logic - check individual field requirements
  const isButtonEnabled = !!(
    watchedTitle && 
    watchedDivisionId && 
    teamsValidationState && 
    [2, 4, 8, 16].includes(selectedTeams.length) && 
    !isSubmitting
  );

  const selectedTeamCount = selectedTeams.length;
  const minTeams = 2;
  const maxTeams = 16;
  const validTeamCounts = [2, 4, 8, 16];
  const isValidTeamCount = validTeamCounts.includes(selectedTeamCount);

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

        {/* Team Selection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
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
          />
        </div>

        {/* Validation Messages */}
        {selectedTeamCount > 0 && !isValidTeamCount && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-4 h-4" />
            <span>
              Tournament system requires exactly 2, 4, 8, or 16 teams. 
              Currently selected: {selectedTeamCount} team{selectedTeamCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {isValidTeamCount && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <Users className="w-4 h-4" />
            <span>
              Ready to create bracket with {selectedTeamCount} teams
            </span>
          </div>
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
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
