
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

  const form = useForm<BracketFormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      title: "",
      divisionId: "",
      format: "Single Elimination",
      teams: [],
    },
    mode: "onChange",
  });

  const { watch, setValue, handleSubmit, formState } = form;
  const watchedDivisionId = watch("divisionId");

  // Update teams field when selection changes - NO SUBMISSION
  React.useEffect(() => {
    console.log("BracketForm: Updating teams field:", selectedTeams.length, "teams - NO submission");
    setValue("teams", selectedTeams, { shouldValidate: true });
  }, [selectedTeams, setValue]);

  // Handle team selection changes - ONLY updates state, NEVER submits
  const handleTeamSelectionChange = React.useCallback(
    ({ ids, isValid }: { ids: string[]; isValid: boolean }) => {
      console.log("BracketForm: Team selection changed:", {
        count: ids.length,
        isValid,
        teams: ids,
        action: "STATE_UPDATE_ONLY"
      });
      
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
    console.log("BracketForm: Division changed to:", divisionId, "- clearing team selection");
    // Clear selected teams when division changes
    setSelectedTeams([]);
    setTeamsValidationState(false);
    if (onTeamsValidityChange) {
      onTeamsValidityChange(false);
    }
  }, [onTeamsValidityChange]);

  // EXPLICIT form submission handler - ONLY triggered by submit button
  const onFormSubmit = (data: BracketFormValues) => {
    console.log("BracketForm: EXPLICIT submit button clicked - form submission triggered", {
      data,
      teamsCount: data.teams.length,
      isValid: formState.isValid && teamsValidationState
    });
    
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

    console.log("BracketForm: Calling parent onSubmit with data:", formDataWithDivision);
    onSubmit(formDataWithDivision);
  };

  // Calculate form state
  const isFormValid = formState.isValid && teamsValidationState;
  const selectedTeamCount = selectedTeams.length;
  const minTeams = 2;
  const maxTeams = 16;

  console.log("BracketForm render:", {
    selectedTeamCount,
    teamsValidationState,
    formValid: formState.isValid,
    canSubmit: isFormValid,
    isSubmitting
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
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
        {selectedTeamCount > 0 && selectedTeamCount < minTeams && (
          <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="w-4 h-4" />
            <span>Select at least {minTeams} teams to create a bracket</span>
          </div>
        )}

        {selectedTeamCount >= minTeams && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <Users className="w-4 h-4" />
            <span>
              Ready to create bracket with {selectedTeamCount} teams
              {selectedTeamCount < maxTeams ? ` • You can add up to ${maxTeams - selectedTeamCount} more teams` : ""}
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
            type="submit"
            disabled={!isFormValid || isSubmitting}
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

        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 border-t pt-2">
            Form Valid: {String(formState.isValid)} | Teams Valid: {String(teamsValidationState)} | 
            Selected: {selectedTeamCount} | Can Submit: {String(isFormValid)} | Submitting: {String(isSubmitting)}
          </div>
        )}
      </form>
    </Form>
  );
};

export default BracketForm;
