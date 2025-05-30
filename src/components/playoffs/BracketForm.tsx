
import React from "react";
import { Form } from "@/components/ui/form";
import { Team } from "@/types";
import { useBracketForm } from "./form/useBracketForm";
import { BracketFormValues } from "./form/BracketFormSchema";
import { BracketFormTitle } from "./form/BracketFormTitle";
import { BracketFormDivision } from "./form/BracketFormDivision";
import { BracketFormFormat } from "./form/BracketFormFormat";
import { BracketFormTeams } from "./form/BracketFormTeams";
import { BracketFormActions } from "./form/BracketFormActions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

interface BracketFormProps {
  divisions: { id: string; name: string }[] | undefined;
  teams: Team[] | undefined;
  isSubmitting: boolean;
  onSubmit: (data: BracketFormValues) => Promise<void> | void;
  onCancel: () => void;
}

const BracketForm: React.FC<BracketFormProps> = ({
  divisions,
  teams,
  isSubmitting,
  onSubmit,
  onCancel,
}) => {
  console.log("BracketForm: Rendering with", { 
    divisionsCount: divisions?.length, 
    teamsCount: teams?.length, 
    isSubmitting 
  });

  // Add validation for divisions and teams with loading states
  const validDivisions = Array.isArray(divisions) ? divisions : [];
  const validTeams = Array.isArray(teams) ? teams : [];
  
  // Show loading state if divisions or teams are undefined (still loading)
  if (divisions === undefined || teams === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading form data...</span>
        </div>
      </div>
    );
  }
  
  const {
    form,
    filteredTeams,
    handleDivisionChange,
    handleSubmit
  } = useBracketForm({ teams: validTeams, onSubmit });
  
  // Show warning if no divisions are available
  if (validDivisions.length === 0) {
    return (
      <Alert variant="warning" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Divisions Available</AlertTitle>
        <AlertDescription>
          You need to create at least one division before creating a bracket. 
          Divisions will be created automatically if none exist in the database.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Show warning if no teams are available  
  if (validTeams.length === 0) {
    return (
      <Alert variant="warning" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Teams Available</AlertTitle>
        <AlertDescription>
          You need to have teams in your divisions before creating a bracket.
          Please add teams to your divisions first.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <BracketFormTitle form={form} />
        <BracketFormDivision 
          form={form} 
          divisions={validDivisions} 
          onDivisionChange={handleDivisionChange} 
        />
        <BracketFormFormat form={form} />
        <BracketFormTeams
          divisionId={form.watch("divisionId") ?? null}
          maxTeams={form.watch("format") === "Double Elimination" ? 16 : 32}
          onChange={(ids) => form.setValue("teams", ids)}
        />
        <BracketFormActions 
          isSubmitting={isSubmitting} 
          onCancel={onCancel} 
          form={form}
        />
      </form>
    </Form>
  );
};

// Change from `export { BracketFormValues }` to `export type { BracketFormValues }`
export type { BracketFormValues };
export default BracketForm;
